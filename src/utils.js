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
