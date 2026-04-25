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
// best-effort extracted fields (fbNumber, tonnage). The extraction layer is
// pure-regex on the OCR text — it errs on the side of returning null rather
// than guessing wrong.
export const extractFromImage = async (dataUrl, { kind: _kind = "scale_ticket" } = {}) => {
  const worker = await getWorker();
  const { data } = await worker.recognize(dataUrl);
  const text = data?.text || "";
  const fields = parseFields(text);
  return { text, fields };
};

// Best-effort field extraction from OCR text. Patterns are tuned for typical
// California scale tickets (Vulcan, Graniterock, Cemex) — most have:
//   "TICKET NO 12345" or "Ticket # 12345"  → fbNumber
//   "NET 25.4" or "Net Wt 25.40 TONS" or "25.40 TON" → tonnage
const parseFields = (text) => {
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
  const netNearby = /NET[^.\n]{0,30}?(\d{1,3}(?:\.\d{1,3})?)\s*(?:T|TON|TONS|TN)?\b/;
  const m2 = upper.match(netNearby);
  if (m2) {
    const v = Number(m2[1]);
    if (v > 0 && v < 200) out.tonnage = v; // sanity bound (a dump truck is 10-30T typical)
  }
  // Fallback: standalone "NN.NN TON" without NET keyword
  if (out.tonnage == null) {
    const tonRx = /(\d{1,3}(?:\.\d{1,3})?)\s*(?:TON|TONS|TN)\b/;
    const m3 = upper.match(tonRx);
    if (m3) {
      const v = Number(m3[1]);
      if (v > 0 && v < 200) out.tonnage = v;
    }
  }
  return out;
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
