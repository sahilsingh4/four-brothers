// Pure helpers extracted from App.jsx for testability and reuse.
// No DOM, no React, no Supabase — safe for unit tests in node env.

export const fmt$ = (n) =>
  `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
};

export const fmtDateTime = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
  catch { return iso; }
};

export const formatTime12h = (hhmm) => {
  if (!hhmm || typeof hhmm !== "string") return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m || 0).padStart(2, "0");
  return `${h12}:${mm} ${period}`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const randomCode = (len = 6) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

// Password rules: 12+ chars, mixed case + digit + symbol, no common patterns.
// Returns null on success or a human-readable error message.
export const validatePassword = (pw) => {
  if (pw.length < 12) return "Password must be at least 12 characters";
  if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one number";
  if (!/[^a-zA-Z0-9]/.test(pw)) return "Password must contain at least one special character (e.g. ! @ # $ %)";
  const lower = pw.toLowerCase();
  if (/(.)\1{2,}/.test(pw)) return "Password cannot contain 3+ repeated characters in a row";
  if (/012345|123456|234567|345678|456789|567890|abcdef|qwerty|asdfgh/.test(lower)) {
    return "Password cannot contain common sequences (123456, qwerty, etc.)";
  }
  if (/password|admin|letmein|welcome|trucking|brothers|4brothers|dispatch|freight/.test(lower)) {
    return "Password cannot contain common words (including company-related terms)";
  }
  return null;
};

export const validateEmail = (e) => {
  if (!e || !e.includes("@") || !e.includes(".")) return "Please enter a valid email";
  return null;
};

// Public-portal customer token: deterministic 8-char hash from a company name.
// Used to build shareable URLs that don't expose internal IDs.
export const clientToken = (name) => {
  if (!name) return null;
  const normalized = String(name).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!normalized) return null;
  let h = 0;
  for (let i = 0; i < normalized.length; i++) { h = ((h << 5) - h + normalized.charCodeAt(i)) | 0; }
  const abs = Math.abs(h).toString(36).toUpperCase().padStart(6, "0").slice(0, 8);
  return "C" + abs;
};

export const matchesClientToken = (dispatch, token) => {
  if (!token) return false;
  return clientToken(dispatch.clientName) === token || clientToken(dispatch.subContractor) === token;
};

// Generate a roughly-unique numeric id for client-side billing lines, etc.
// Lives at module scope so callers in render bodies don't trip
// react-hooks/purity (Date.now/Math.random called during render).
export const nextLineId = () => Date.now() + Math.floor(Math.random() * 1000);

// Soft expiry check for soft-deleted records (30-day window).
export const isPastRecoveryWindow = (deletedAt, days = 30) => {
  if (!deletedAt) return false;
  return Date.now() - new Date(deletedAt).getTime() > days * 24 * 60 * 60 * 1000;
};

// Days remaining before a soft-deleted record purges. Negative when past.
export const daysUntilPurge = (deletedAt, days = 30) => {
  if (!deletedAt) return null;
  const ageMs = Date.now() - new Date(deletedAt).getTime();
  return days - Math.floor(ageMs / (24 * 60 * 60 * 1000));
};

// Days since an ISO timestamp; null when missing.
export const daysSince = (iso) => {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
};

// Minutes since an ISO timestamp; null when missing.
export const minutesSince = (iso) => {
  if (!iso) return null;
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
};

// Hours since an ISO timestamp; null when missing.
export const hoursSince = (iso) => {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
};

// Days until an ISO timestamp. Negative = past.
// Lives here (rather than next to BidDeadlineChip) so the component file
// can satisfy the react-refresh "only export components" rule.
export const bidDaysUntil = (iso) => {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
};

// Bid lifecycle stages used by BidModal, BidsTab, and CustomerPortal.
// Order matters — the array order is the natural progression.
export const BID_STATUSES = [
  { value: "discovered", label: "DISCOVERED", color: "#64748B", bg: "#F1F5F9", description: "Found the opportunity, not yet evaluated" },
  { value: "researching", label: "RESEARCHING", color: "#0369A1", bg: "#E0F2FE", description: "Reading specs, evaluating fit" },
  { value: "preparing", label: "PREPARING", color: "#B45309", bg: "#FEF3C7", description: "Building the bid package" },
  { value: "submitted", label: "SUBMITTED", color: "#7C3AED", bg: "#EDE9FE", description: "Bid in, awaiting decision" },
  { value: "awarded", label: "AWARDED ★", color: "#166534", bg: "#DCFCE7", description: "We won" },
  { value: "rejected", label: "REJECTED", color: "#991B1B", bg: "#FEE2E2", description: "Lost, competitor won" },
  { value: "abandoned", label: "ABANDONED", color: "#57534E", bg: "#F5F5F4", description: "We chose not to bid" },
];
export const BID_STATUS_MAP = Object.fromEntries(BID_STATUSES.map((s) => [s.value, s]));

// Thin wrapper over the host-provided `window.storage` API (Claude harness).
// Safely no-ops when the API isn't present. Used for small per-user prefs
// that we deliberately don't want on the Supabase server.
export const storageSet = async (key, value, shared = false) => {
  try { await window.storage?.set(key, JSON.stringify(value), shared); }
  catch (e) { console.warn("storage set failed", key, e); }
};

export const storageGet = async (key, shared = false) => {
  try {
    const r = await window.storage?.get(key, shared);
    return r?.value ? JSON.parse(r.value) : null;
  } catch { return null; }
};

// Build a phone-number SMS link. Returns null for empty / non-digit input.
// iOS uses & as separator, Android uses ?, but most platforms now accept ? with encoded body.
export const buildSMSLink = (phone, message) => {
  if (!phone) return null;
  const clean = String(phone).replace(/[^\d+]/g, "");
  if (!clean) return null;
  return `sms:${clean}?body=${encodeURIComponent(message)}`;
};

// Build a mailto: link with optional subject + body. Returns null for empty email.
export const buildEmailLink = (email, subject, body) => {
  if (!email) return null;
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${email}${params.length ? "?" + params.join("&") : ""}`;
};

// Common bid portals for the BidModal source dropdown.
export const BID_PORTALS = [
  { value: "publicpurchase", label: "Public Purchase" },
  { value: "planetbids", label: "PlanetBids" },
  { value: "ebmud", label: "EBMUD" },
  { value: "bidnet", label: "BidNet" },
  { value: "direct", label: "Direct (email/mail)" },
  { value: "other", label: "Other" },
];

// Build a goqr.me URL for a given data string. Used by both the in-app QR
// renderer and the printable driver sheet.
export const qrServiceUrl = (data, size = 300) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=10&color=1C1917&bgcolor=FAFAF9`;

// Pure status/total computation for a dispatch + its freight bills.
// Used by DispatchTrackingCard and exposed here so it's unit-testable
// without rendering.
export const computeDispatchSummary = (d, bills) => {
  const totalTons = bills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
  const totalLoads = bills.reduce((s, fb) => s + (Number(fb.loadCount) || 0), 0);
  const pct = d.trucksExpected ? Math.min(100, (bills.length / d.trucksExpected) * 100) : 0;
  const statusLabel = d.status === "closed"
    ? "COMPLETE"
    : (bills.length === 0
      ? "OPEN · AWAITING TRUCKS"
      : (bills.length >= d.trucksExpected ? "COMPLETE" : "IN PROGRESS"));
  const statusColor = statusLabel === "COMPLETE"
    ? "var(--good)"
    : statusLabel.startsWith("OPEN") ? "var(--concrete)" : "var(--hazard-deep)";
  return { totalTons, totalLoads, pct, statusLabel, statusColor };
};

// Compress an image File to a JPEG dataURL, scaled to fit `maxDim` on the
// longer edge. Used wherever the app accepts photo uploads (driver freight
// bills, company logos, etc.) — small enough payloads to fit in localStorage
// queues and Supabase rows. DOM-only (FileReader, canvas, Image).
export const compressImage = (file, maxDim = 1600, quality = 0.7) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FFF"; ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
