// OCR layer — pluggable. Today: Tesseract.js (free, browser-only, no API key).
// Later: drop in a server-side Claude vision call by replacing extractFromImage's
// implementation. The UI stays the same.
//
// Tesseract is heavy (~3MB WASM), so we lazy-load it on first call and reuse
// the worker across calls in the same session.

let _workerPromise = null;

const getWorker = () => {
  if (_workerPromise) return _workerPromise;
  _workerPromise = (async () => {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    return worker;
  })();
  return _workerPromise;
};

// Run OCR on a base64/data-URL image. Returns the raw recognized text plus
// best-effort extracted fields. The extraction layer is pure-regex on the
// OCR text — it errs on the side of returning null rather than guessing wrong.
//
// `kind` controls which extractors run:
//   - "scale_ticket" (default): fbNumber + tonnage
//   - "freight_bill": same as scale_ticket
//   - "cdl" / "medical_card": extracts the latest expiration-style date
export const extractFromImage = async (dataUrl, { kind = "scale_ticket" } = {}) => {
  const worker = await getWorker();
  const { data } = await worker.recognize(dataUrl);
  const text = data?.text || "";
  const fields = parseFields(text, kind);
  return { text, fields };
};

// Best-effort field extraction from OCR text. Patterns are tuned for typical
// California scale tickets (Vulcan, Graniterock, Cemex) — most have:
//   "TICKET NO 12345" or "Ticket # 12345"  → fbNumber
//   "NET 25.4" or "Net Wt 25.40 TONS" or "25.40 TON" → tonnage
const parseFields = (text, kind = "scale_ticket") => {
  if (kind === "cdl" || kind === "medical_card") {
    return { expiryDate: parseExpiryDate(text, kind) };
  }
  const out = { fbNumber: null, tonnage: null };
  if (!text) return out;
  const upper = text.toUpperCase();

  // FB / Ticket number — match TICKET / TKT / FB / FREIGHT BILL prefixes
  const ticketRx = /\b(?:TICKET|TKT|FB|FREIGHT\s*BILL|LOAD\s*TICKET)\s*(?:NO\.?|NUMBER|#|:)?\s*([A-Z]?\d{3,8})\b/;
  const m1 = upper.match(ticketRx);
  if (m1) out.fbNumber = m1[1];

  // Tonnage — prefer "NET" weight if present (gross - tare). Look for:
  //   "NET ... 25.40 TONS"  or  "NET WT 25.40"  or  "25.40 TON" near "NET"
  // Tesseract often misreads decimals; we accept 1-3 decimal places.
  // Sanity range tightened from 0..200 to 5..50 — a dump-truck load is
  // 10-30T typical and Tesseract sometimes drops the decimal (reads
  // "21.5T" as "215T") which would silently overwrite a correct entry.
  const SANE_MIN = 5;
  const SANE_MAX = 50;
  const netNearby = /NET[^.\n]{0,30}?(\d{1,3}(?:\.\d{1,3})?)\s*(?:T|TON|TONS|TN)?\b/;
  const m2 = upper.match(netNearby);
  if (m2) {
    const v = Number(m2[1]);
    if (v >= SANE_MIN && v <= SANE_MAX) out.tonnage = v;
  }
  // Fallback: standalone "NN.NN TON" without NET keyword
  if (out.tonnage == null) {
    const tonRx = /(\d{1,3}(?:\.\d{1,3})?)\s*(?:TON|TONS|TN)\b/;
    const m3 = upper.match(tonRx);
    if (m3) {
      const v = Number(m3[1]);
      if (v >= SANE_MIN && v <= SANE_MAX) out.tonnage = v;
    }
  }
  return out;
};

// Pull the most likely "expiration" date from CDL / medical card OCR text.
// Strategy:
//   1. Find every plausible date (MM/DD/YYYY, MM-DD-YYYY, MM/DD/YY, etc.)
//      and dates with 2- or 4-digit years.
//   2. Prefer dates that are LABELED with "EXP", "EXPIRES", "EXP DATE", "VALID THRU"
//   3. If no labeled match, fall back to the LATEST date in the future
//      (CDLs and med cards always have an issue date + expiration date;
//      expiration is later than issue, so picking the latest future date
//      is usually right).
//   4. Return ISO format (YYYY-MM-DD) so it can drop into a <input type="date">.
const parseExpiryDate = (text, _kind) => {
  if (!text) return null;
  const upper = text.toUpperCase();

  // Match MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY (years 2-digit OK too)
  const dateRx = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/g;
  const candidates = [];
  let m;
  while ((m = dateRx.exec(upper)) !== null) {
    const [whole, mm, dd, yyRaw] = m;
    const month = parseInt(mm, 10);
    const day = parseInt(dd, 10);
    let year = parseInt(yyRaw, 10);
    if (year < 100) year += year > 50 ? 1900 : 2000; // 2-digit year heuristic
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2099) continue;
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    // Validate it's a real date (rejects 02/30 etc)
    const parsed = new Date(iso + "T12:00:00");
    if (Number.isNaN(parsed.getTime())) continue;
    if (parsed.getFullYear() !== year || parsed.getMonth() + 1 !== month || parsed.getDate() !== day) continue;
    // Was the date preceded by an EXP / EXPIRES / VALID label within ~25 chars?
    const start = Math.max(0, m.index - 25);
    const lead = upper.slice(start, m.index);
    const labeled = /\bEXP(?:IRES?)?\b|\bVALID\s*(?:THRU|UNTIL|TO)\b|\bEXPIRATION\b/.test(lead);
    candidates.push({ iso, labeled, year, month, day, raw: whole });
  }
  if (candidates.length === 0) return null;

  // Prefer LABELED candidates first
  const labeled = candidates.filter((c) => c.labeled);
  if (labeled.length > 0) {
    // Take the latest among labeled (in case of multiple expiration entries)
    labeled.sort((a, b) => b.iso.localeCompare(a.iso));
    return labeled[0].iso;
  }

  // Fallback: latest future date
  const todayIso = new Date().toISOString().slice(0, 10);
  const future = candidates.filter((c) => c.iso >= todayIso);
  if (future.length > 0) {
    future.sort((a, b) => b.iso.localeCompare(a.iso));
    return future[0].iso;
  }

  // Last resort: the latest date period (expired, but still informative)
  candidates.sort((a, b) => b.iso.localeCompare(a.iso));
  return candidates[0].iso;
};

// Best-effort cleanup hook for the Tesseract worker. Call at app shutdown if needed.
export const terminateOcrWorker = async () => {
  if (!_workerPromise) return;
  try {
    const w = await _workerPromise;
    await w.terminate();
  } catch { /* noop */ }
  _workerPromise = null;
};
