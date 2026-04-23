import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase";
import { fetchDispatches, insertDispatch, updateDispatch, deleteDispatch, fetchFreightBills, insertFreightBill, updateFreightBill, deleteFreightBill, subscribeToDispatches, subscribeToFreightBills, fetchContacts, insertContact, updateContact, deleteContact, fetchQuarries, insertQuarry, updateQuarry, deleteQuarry, fetchInvoices, insertInvoice, updateInvoice, deleteInvoice, subscribeToContacts, subscribeToQuarries, subscribeToInvoices, fetchProjects, insertProject, updateProject, deleteProject, subscribeToProjects, fetchCustomerByToken, fetchDeletedDispatches, fetchDeletedFreightBills, fetchDeletedInvoices, recoverDispatch, recoverFreightBill, recoverInvoice, hardDeleteDispatch, hardDeleteFreightBill, hardDeleteInvoice, autoPurgeDeleted, fetchQuotes, insertQuote, updateQuote, deleteQuote, subscribeToQuotes, fetchDeletedQuotes, recoverQuote, hardDeleteQuote } from "./db";
import {
  hoursFromTimes as mathHoursFromTimes,
  computeLineNet as mathComputeLineNet,
  recomputeLine as mathRecomputeLine,
  totalLines as mathTotalLines,
  seedHoursForFb as mathSeedHoursForFb,
  billableHoursForInvoice as mathBillableHoursForInvoice,
  contactBrokeragePct as mathContactBrokeragePct,
} from "./math";
import { Truck, ClipboardList, Receipt, Phone, Mail, MapPin, Fuel, Plus, Trash2, Download, CheckCircle2, AlertCircle, AlertTriangle, ArrowRight, Wrench, FileText, Search, Link2, Camera, Upload, X, Eye, Share2, Lock, LogOut, Settings, KeyRound, Building2, Printer, FileDown, Database, HardDrive, RefreshCw, Users, Star, MessageSquare, UserPlus, Edit2, ChevronDown, Bell, BellOff, Volume2, VolumeX, Activity, Package, Mountain, BarChart3, History, Calendar, DollarSign, Banknote, Award, Briefcase, ShieldCheck, Clock, Save, Send } from "lucide-react";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;500;700&family=Oswald:wght@400;500;600;700&display=swap');
    :root { --hazard:#F59E0B; --hazard-deep:#D97706; --steel:#1C1917; --concrete:#44403C; --cream:#FAFAF9; --rust:#9A3412; --safety:#EF4444; --good:#65A30D; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    .fbt-root { font-family: 'Oswald', sans-serif; color: var(--steel); background: var(--cream); min-height: 100vh; }
    .fbt-display { font-family: 'Archivo Black', sans-serif; letter-spacing: -0.02em; }
    .fbt-mono { font-family: 'JetBrains Mono', monospace; }
    .hazard-stripe { background: repeating-linear-gradient(-45deg, var(--hazard) 0 20px, var(--steel) 20px 40px); }
    .hazard-stripe-thin { background: repeating-linear-gradient(-45deg, var(--hazard) 0 8px, var(--steel) 8px 16px); }
    .texture-paper { background-color: var(--cream); background-image: radial-gradient(circle at 20% 50%, rgba(68,64,60,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,158,11,0.05) 0%, transparent 50%); }
    .grain::before { content:''; position:absolute; inset:0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); opacity:0.4; pointer-events:none; mix-blend-mode:multiply; }
    .btn-primary { background: var(--hazard); color: var(--steel); border: 3px solid var(--steel); padding: 14px 28px; font-family: 'Oswald', sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; font-size: 14px; cursor: pointer; box-shadow: 4px 4px 0 var(--steel); transition: all 0.12s ease; display: inline-flex; align-items: center; gap: 10px; }
    .btn-primary:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--steel); }
    .btn-primary:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 var(--steel); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: 4px 4px 0 var(--steel); }
    .btn-ghost { background: transparent; color: var(--steel); border: 2px solid var(--steel); padding: 10px 20px; font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 13px; cursor: pointer; transition: all 0.15s; }
    .btn-ghost:hover { background: var(--steel); color: var(--cream); }
    .btn-danger { background: transparent; color: var(--safety); border: 2px solid var(--safety); padding: 6px 12px; font-size: 11px; cursor: pointer; font-family: 'JetBrains Mono', monospace; font-weight: 500; text-transform: uppercase; transition: all 0.12s; }
    .btn-danger:hover { background: var(--safety); color: var(--cream); }
    .fbt-input, .fbt-select, .fbt-textarea { width: 100%; padding: 12px 14px; background: var(--cream); border: 2px solid var(--steel); font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--steel); outline: none; }
    .fbt-input:focus, .fbt-select:focus, .fbt-textarea:focus { background: #FFF; border-color: var(--hazard-deep); box-shadow: 3px 3px 0 var(--hazard); }
    .fbt-textarea { resize: vertical; min-height: 80px; }
    .fbt-label { display: block; font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; margin-bottom: 6px; color: var(--concrete); }
    .fbt-card { background: #FFF; border: 2px solid var(--steel); box-shadow: 6px 6px 0 var(--steel); }
    .nav-tab { padding: 10px 20px; font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; font-size: 13px; cursor: pointer; color: var(--cream); border: 2px solid transparent; display: flex; align-items: center; gap: 8px; transition: all 0.15s; }
    .nav-tab:hover { background: rgba(245,158,11,0.15); }
    .nav-tab.active { background: var(--hazard); color: var(--steel); }
    .fbt-table { width: 100%; border-collapse: collapse; }
    .fbt-table th { background: var(--steel); color: var(--hazard); text-align: left; padding: 10px 12px; font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; border-right: 1px solid var(--concrete); }
    .fbt-table td { padding: 10px 12px; border-bottom: 1px solid #E7E5E4; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--steel); }
    .fbt-table tr:hover td { background: #FEF3C7; }
    .stat-num { font-family: 'Archivo Black', sans-serif; font-size: 48px; line-height: 1; color: var(--steel); }
    .stat-label { font-family: 'Oswald', sans-serif; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; font-size: 11px; color: var(--concrete); margin-top: 6px; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .anim-up { animation: slideUp 0.5s ease-out both; }
    @keyframes truckRoll { 0%,100% { transform: translateX(-10px); } 50% { transform: translateX(10px); } }
    .anim-roll { animation: truckRoll 3s ease-in-out infinite; }
    .toast { position: fixed; bottom: 24px; right: 24px; background: var(--steel); color: var(--hazard); padding: 14px 20px; border: 2px solid var(--hazard); box-shadow: 6px 6px 0 var(--hazard); font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 13px; z-index: 200; animation: slideUp 0.3s ease-out; display: flex; align-items: center; gap: 10px; }
    .scroll-x { overflow-x: auto; }
    .corner-mark { position: absolute; width: 14px; height: 14px; border: 2px solid var(--steel); }
    .corner-mark.tl { top: -2px; left: -2px; border-right: none; border-bottom: none; }
    .corner-mark.tr { top: -2px; right: -2px; border-left: none; border-bottom: none; }
    .corner-mark.bl { bottom: -2px; left: -2px; border-right: none; border-top: none; }
    .corner-mark.br { bottom: -2px; right: -2px; border-left: none; border-top: none; }
    .modal-bg { position: fixed; inset: 0; background: rgba(28,25,23,0.85); z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px; overflow-y: auto; }
    .modal-body { background: var(--cream); border: 3px solid var(--hazard); box-shadow: 10px 10px 0 var(--steel); max-width: 720px; width: 100%; max-height: 90vh; overflow-y: auto; }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1.5px solid var(--steel); font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
    .thumb { width: 80px; height: 80px; object-fit: cover; border: 2px solid var(--steel); cursor: pointer; transition: transform 0.1s; }
    .thumb:hover { transform: scale(1.05); box-shadow: 3px 3px 0 var(--hazard); }
  `}</style>
);

const fmt$ = (n) => `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso) => { if (!iso) return "—"; try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return iso; } };
const fmtDateTime = (iso) => { if (!iso) return "—"; try { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch { return iso; } };
const formatTime12h = (hhmm) => {
  if (!hhmm || typeof hhmm !== "string") return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m || 0).padStart(2, "0");
  return `${h12}:${mm} ${period}`;
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const randomCode = (len = 6) => { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]; return s; };
const storageSet = async (key, value, shared = false) => { try { await window.storage?.set(key, JSON.stringify(value), shared); } catch (e) { console.warn("storage set failed", key, e); } };
const storageGet = async (key, shared = false) => { try { const r = await window.storage?.get(key, shared); return r?.value ? JSON.parse(r.value) : null; } catch { return null; } };

const compressImage = (file, maxDim = 1600, quality = 0.7) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) { const scale = maxDim / Math.max(width, height); width = Math.round(width * scale); height = Math.round(height * scale); }
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

const Logo = ({ size = "md" }) => {
  const scale = size === "lg" ? 1.4 : size === "sm" ? 0.75 : 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 * scale }}>
      <div style={{ width: 44 * scale, height: 44 * scale, background: "var(--hazard)", border: `${3 * scale}px solid var(--steel)`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-3deg)" }}>
        <Truck size={22 * scale} strokeWidth={2.5} />
      </div>
      <div style={{ lineHeight: 1 }}>
        <div className="fbt-display" style={{ fontSize: 18 * scale, letterSpacing: "-0.03em" }}>4 BROTHERS</div>
        <div className="fbt-mono" style={{ fontSize: 10 * scale, color: "var(--concrete)", marginTop: 2 }}>TRUCKING · LLC · EST. BAY POINT CA</div>
      </div>
    </div>
  );
};

const Toast = ({ msg, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 2800); return () => clearTimeout(t); }, [onClose]);
  return <div className="toast"><CheckCircle2 size={18} /> {msg}</div>;
};

const Lightbox = ({ src, onClose }) => (
  <div
    className="modal-bg"
    onClick={onClose}
    style={{ alignItems: "center", zIndex: 10000, background: "rgba(0,0,0,0.92)" }}
  >
    <div style={{ position: "relative", maxWidth: "95vw", maxHeight: "95vh" }} onClick={(e) => e.stopPropagation()}>
      <button onClick={onClose} style={{ position: "absolute", top: -40, right: 0, background: "var(--hazard)", border: "2px solid var(--steel)", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10001 }}>
        <X size={18} />
      </button>
      <img src={src} alt="Scale ticket" style={{ maxWidth: "95vw", maxHeight: "95vh", border: "3px solid var(--hazard)", display: "block" }} />
    </div>
  </div>
);

// ========== AUTH UTILITIES (SUPABASE) ==========
const validatePassword = (pw) => {
  if (pw.length < 6) return "Password must be at least 6 characters";
  if (!/[a-zA-Z]/.test(pw)) return "Password must contain at least one letter";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one number";
  return null;
};

const validateEmail = (e) => {
  if (!e || !e.includes("@") || !e.includes(".")) return "Please enter a valid email";
  return null;
};

// ========== LOGIN (Supabase email/password) ==========
const LoginScreen = ({ onSuccess, onCancel }) => {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr("");
    const ev = validateEmail(email);
    if (ev) { setErr(ev); return; }
    if (!pw) { setErr("Password is required"); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) {
        setErr(error.message || "Login failed");
        setLoading(false);
        return;
      }
      onSuccess(data.user);
    } catch (e) {
      setErr(e.message || "Login failed — check your internet");
      setLoading(false);
    }
  };

  return (
    <div className="fbt-root texture-paper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="fbt-card" style={{ maxWidth: 440, width: "100%", padding: 0, overflow: "hidden" }}>
        <div className="hazard-stripe" style={{ height: 10 }} />
        <div style={{ padding: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, background: "var(--hazard)", border: "3px solid var(--steel)", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-3deg)", boxShadow: "4px 4px 0 var(--steel)" }}>
              <Lock size={26} strokeWidth={2.5} color="var(--steel)" />
            </div>
            <div>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", letterSpacing: "0.15em" }}>▸ STAFF SIGN IN</div>
              <h2 className="fbt-display" style={{ fontSize: 24, margin: 0, lineHeight: 1 }}>SECURE LOGIN</h2>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label className="fbt-label">Email</label>
              <input className="fbt-input" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} autoFocus placeholder="you@example.com" />
            </div>
            <div>
              <label className="fbt-label">Password</label>
              <input className="fbt-input" type="password" autoComplete="current-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} />
            </div>

            {err && (
              <div style={{ padding: 10, background: "#FEE2E2", border: "2px solid var(--safety)", color: "var(--safety)", fontSize: 13, fontFamily: "JetBrains Mono, monospace", display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={14} /> {err}
              </div>
            )}

            <button onClick={submit} className="btn-primary" disabled={loading} style={{ justifyContent: "center", padding: "14px" }}>
              {loading ? "SIGNING IN…" : <>SIGN IN <ArrowRight size={14} style={{ marginLeft: 6 }} /></>}
            </button>

            <button onClick={onCancel} className="btn-ghost" style={{ justifyContent: "center", padding: "10px" }}>
              ← BACK TO PUBLIC SITE
            </button>

            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", textAlign: "center", letterSpacing: "0.1em", marginTop: 4 }}>
              ▸ CLOUD LOGIN · SECURED BY SUPABASE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== CHANGE PASSWORD (Supabase) ==========
const ChangePasswordModal = ({ onClose, onToast }) => {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr("");
    const v = validatePassword(pw);
    if (v) { setErr(v); return; }
    if (pw !== confirm) { setErr("Passwords don't match"); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) { setErr(error.message); setLoading(false); return; }
      onToast("PASSWORD CHANGED");
      onClose();
    } catch (e) {
      setErr(e.message || "Failed to change password");
      setLoading(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <KeyRound size={18} /> CHANGE PASSWORD
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div>
            <label className="fbt-label">New Password</label>
            <input className="fbt-input" type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} placeholder="6+ chars, letters + numbers" autoFocus />
          </div>
          <div>
            <label className="fbt-label">Confirm New Password</label>
            <input className="fbt-input" type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} />
          </div>

          {err && (
            <div style={{ padding: 10, background: "#FEE2E2", border: "2px solid var(--safety)", color: "var(--safety)", fontSize: 13, fontFamily: "JetBrains Mono, monospace", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} /> {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <button onClick={submit} className="btn-primary" disabled={loading}><CheckCircle2 size={16} /> {loading ? "UPDATING…" : "UPDATE PASSWORD"}</button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ========================================================================
// PUBLIC MARKETING SITE — redesigned v18 (clean corporate style)
// ========================================================================
// Inspired by Double D Transportation, Jass Boys, Channa Trucking:
// whites + steel greys, big hero with stock truck photo, services grid,
// fleet section, prominent quote CTA, contact block, minimal visual clutter.
//
// Quote requests now write to Supabase via the onQuoteSubmit handler, which
// calls insertQuote() so admin sees them in real time.
// ========================================================================

const PublicSite = ({ onQuoteSubmit, onStaffLogin }) => {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", service: "hauling", pickup: "", dropoff: "", material: "", quantity: "", needDate: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      await onQuoteSubmit({ ...form, submittedAt: new Date().toISOString(), status: "new" });
      setSubmitted(true);
      setForm({ name: "", company: "", email: "", phone: "", service: "hauling", pickup: "", dropoff: "", material: "", quantity: "", needDate: "", notes: "" });
      setTimeout(() => setSubmitted(false), 6000);
    } catch (e) {
      console.error("Quote submit failed:", e);
      setError("Couldn't send your quote. Please try again or call us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  // Stock dump-truck photos from Unsplash (free-use). Easy to swap later with your own.
  const HERO_IMG = "https://images.unsplash.com/photo-1586864387634-2f33030dab41?auto=format&fit=crop&w=1600&q=80"; // dump truck hauling
  const FLEET_IMG_1 = "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?auto=format&fit=crop&w=800&q=80";
  const FLEET_IMG_2 = "https://images.unsplash.com/photo-1558818498-28c3b9d9fa56?auto=format&fit=crop&w=800&q=80";
  const FLEET_IMG_3 = "https://images.unsplash.com/photo-1615715874851-fac0f3e76064?auto=format&fit=crop&w=800&q=80";
  const ABOUT_IMG = "https://images.unsplash.com/photo-1560413538-d7c91c7712b4?auto=format&fit=crop&w=1200&q=80";

  // Scroll-to helper for internal anchor links
  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ background: "#FFF", color: "#1C1917", fontFamily: "'Inter', -apple-system, Arial, sans-serif" }}>
      {/* ===== TOP NAV ===== */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "#FFF", borderBottom: "1px solid #E7E5E4", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <a href="#top" onClick={scrollTo("top")} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", width: 48, height: 48, background: "#1C1917", color: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontFamily: "Arial, sans-serif", fontSize: 20, letterSpacing: "-0.06em", borderRadius: 2, boxShadow: "0 2px 4px rgba(28,25,23,0.15)" }}>
              4B
              <div style={{ position: "absolute", bottom: -4, left: 6, right: 6, height: 3, background: "#F59E0B" }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#1C1917", lineHeight: 1, letterSpacing: "-0.01em" }}>4 BROTHERS</div>
              <div style={{ fontSize: 10, color: "#78716C", letterSpacing: "0.16em", marginTop: 3, fontWeight: 600 }}>TRUCKING, LLC</div>
            </div>
          </a>
          <div style={{ marginLeft: "auto", display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
            <a href="#services" onClick={scrollTo("services")} style={navLinkStyle}>Services</a>
            <a href="#fleet"    onClick={scrollTo("fleet")}    style={navLinkStyle}>Fleet</a>
            <a href="#about"    onClick={scrollTo("about")}    style={navLinkStyle}>About</a>
            <a href="#contact"  onClick={scrollTo("contact")}  style={navLinkStyle}>Contact</a>
            <a href="#quote"    onClick={scrollTo("quote")}    style={{ padding: "10px 20px", background: "#F59E0B", color: "#1C1917", fontWeight: 700, fontSize: 13, letterSpacing: "0.04em", textDecoration: "none", borderRadius: 2 }}>GET A QUOTE</a>
            <button onClick={onStaffLogin} style={{ background: "transparent", border: "none", color: "#78716C", fontSize: 12, fontWeight: 500, cursor: "pointer", padding: "6px 2px", display: "flex", alignItems: "center", gap: 4 }}>
              <Lock size={11} /> Staff
            </button>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section id="top" style={{ position: "relative", background: "#1C1917", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(28,25,23,0.55), rgba(28,25,23,0.75)), url(${HERO_IMG})`, backgroundSize: "cover", backgroundPosition: "center", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "120px 32px 140px", color: "#FFF" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#F59E0B", fontWeight: 700, marginBottom: 20 }}>▸ SAN FRANCISCO BAY AREA · CENTRAL VALLEY</div>
          <h1 style={{ fontSize: "clamp(44px, 7vw, 84px)", fontWeight: 900, lineHeight: 1.02, margin: "0 0 24px", letterSpacing: "-0.02em", maxWidth: 900 }}>
            Construction trucking you can count on.
          </h1>
          <p style={{ fontSize: 19, color: "#D6D3D1", maxWidth: 620, lineHeight: 1.55, margin: "0 0 40px" }}>
            Aggregate supply, site support, and on-demand hauling with a modern fleet and a professional crew. Serving the Bay Area since 2022.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a href="#quote" onClick={scrollTo("quote")} style={{ padding: "16px 32px", background: "#F59E0B", color: "#1C1917", fontWeight: 800, fontSize: 14, letterSpacing: "0.05em", textDecoration: "none", borderRadius: 2, display: "inline-flex", alignItems: "center", gap: 8 }}>
              REQUEST A QUOTE <ArrowRight size={16} />
            </a>
            <a href="tel:+16268145541" style={{ padding: "16px 32px", background: "transparent", color: "#FFF", border: "2px solid #FFF", fontWeight: 700, fontSize: 14, letterSpacing: "0.05em", textDecoration: "none", borderRadius: 2, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Phone size={14} /> CALL DISPATCH
            </a>
          </div>
        </div>
      </section>

      {/* ===== STATS STRIP ===== */}
      <section style={{ background: "#FAFAF9", borderBottom: "1px solid #E7E5E4" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32 }}>
          {[
            { n: "2022", l: "FOUNDED" },
            { n: "DBE · MBE", l: "CERTIFIED" },
            { n: "USDOT", l: "FULLY REGISTERED" },
            { n: "BAY AREA", l: "BASED IN BAY POINT, CA" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#1C1917", letterSpacing: "-0.02em" }}>{s.n}</div>
              <div style={{ fontSize: 11, color: "#78716C", letterSpacing: "0.1em", marginTop: 4, fontWeight: 600 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SERVICES ===== */}
      <section id="services" style={{ background: "#FFF", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#F59E0B", fontWeight: 700, marginBottom: 16 }}>▸ WHAT WE DO</div>
          <h2 style={{ fontSize: "clamp(32px, 4.5vw, 52px)", fontWeight: 900, margin: "0 0 20px", letterSpacing: "-0.02em", maxWidth: 900 }}>
            Full-service construction trucking.
          </h2>
          <p style={{ fontSize: 17, color: "#57534E", maxWidth: 720, lineHeight: 1.6, margin: "0 0 60px" }}>
            From aggregate delivery to public works subcontracting, we handle the hauling so your crews stay productive.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28 }}>
            {[
              { ico: <Truck size={28} />, t: "Aggregate Supply", d: "Basalt, rock, base material, sand and gravel — sourced, loaded, and delivered on schedule. Prime contractor capable on public agency bids." },
              { ico: <Wrench size={28} />, t: "Site Support", d: "On-call hauling for construction crews. Super trucks and end dumps, 8-hour minimums, demand-driven dispatch, no-show backup." },
              { ico: <ClipboardList size={28} />, t: "Subcontract Hauling", d: "Prime contractor, public works, or private subcontract. Clean paperwork, full DOT and EPA compliance, on-time delivery." },
              { ico: <Mountain size={28} />, t: "Dirt Import / Export", d: "Soil hauling, clean fill, demolition debris. We partner with Class 1, 2 & 3 landfills for proper disposal." },
              { ico: <Fuel size={28} />, t: "Fuel Surcharge Transparent", d: "Rates tied to the DOE/EIA California diesel index. You get a formal written fuel surcharge clause — no surprises." },
              { ico: <ShieldCheck size={28} />, t: "DBE / MBE / SB-PW Certified", d: "Minority-owned, Disadvantaged Business Enterprise, and Small Business Public Works certified. Helps you hit participation goals." },
            ].map((s, i) => (
              <div key={i} style={{ padding: 32, background: "#FAFAF9", border: "1px solid #E7E5E4", borderRadius: 2, transition: "transform 0.15s, box-shadow 0.15s" }}>
                <div style={{ color: "#F59E0B", marginBottom: 20 }}>{s.ico}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", color: "#1C1917" }}>{s.t}</h3>
                <p style={{ fontSize: 14, color: "#57534E", lineHeight: 1.6, margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FLEET ===== */}
      <section id="fleet" style={{ background: "#1C1917", color: "#FFF", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#F59E0B", fontWeight: 700, marginBottom: 16 }}>▸ OUR FLEET</div>
          <h2 style={{ fontSize: "clamp(32px, 4.5vw, 52px)", fontWeight: 900, margin: "0 0 20px", letterSpacing: "-0.02em", maxWidth: 900 }}>
            Modern trucks. Professional drivers.
          </h2>
          <p style={{ fontSize: 17, color: "#D6D3D1", maxWidth: 720, lineHeight: 1.6, margin: "0 0 60px" }}>
            Late-model equipment maintained to the highest standards. Every driver is licensed, insured, and trained for safety-first hauling.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {[
              { t: "Super Dumps & Super Tens", d: "High-capacity rigs for aggregate and dirt hauling. Maximum payload per trip.", img: FLEET_IMG_1 },
              { t: "Transfer / End Dumps", d: "Flexible configurations for job site delivery in tight access areas.", img: FLEET_IMG_2 },
              { t: "10-Wheelers", d: "Nimble trucks for residential projects, small loads, and spec material delivery.", img: FLEET_IMG_3 },
            ].map((item, i) => (
              <div key={i} style={{ background: "#292524", border: "1px solid #44403C", overflow: "hidden" }}>
                <div style={{ height: 200, backgroundImage: `url(${item.img})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                <div style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: "#FFF" }}>{item.t}</h3>
                  <p style={{ fontSize: 14, color: "#A8A29E", lineHeight: 1.5, margin: 0 }}>{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section id="about" style={{ background: "#FFF", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 60, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#F59E0B", fontWeight: 700, marginBottom: 16 }}>▸ ABOUT US</div>
            <h2 style={{ fontSize: "clamp(32px, 4.5vw, 46px)", fontWeight: 900, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
              Built by family. Run like a team.
            </h2>
            <p style={{ fontSize: 16, color: "#57534E", lineHeight: 1.7, margin: "0 0 16px" }}>
              4 Brothers Trucking, LLC is a family-run dump truck company based in Bay Point, California. We specialize in construction material hauling for public works, private contractors, and agency-led infrastructure projects across the Bay Area and Central Valley.
            </p>
            <p style={{ fontSize: 16, color: "#57534E", lineHeight: 1.7, margin: "0 0 24px" }}>
              What sets us apart: DBE, MBE, and SB-PW certified. Clean paperwork. On-time delivery. Fuel surcharge clauses spelled out in plain English. And a team that actually answers the phone when you call dispatch.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 32 }}>
              <div>
                <div style={{ fontSize: 11, color: "#78716C", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 4 }}>CERTIFICATIONS</div>
                <div style={{ fontSize: 14, color: "#1C1917", fontWeight: 600 }}>DBE · MBE · SB-PW</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#78716C", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 4 }}>AUTHORITY</div>
                <div style={{ fontSize: 14, color: "#1C1917", fontWeight: 600 }}>USDOT · CA MCP</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#78716C", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 4 }}>SERVICE AREA</div>
                <div style={{ fontSize: 14, color: "#1C1917", fontWeight: 600 }}>Bay Area · Central Valley</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#78716C", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 4 }}>INSURANCE</div>
                <div style={{ fontSize: 14, color: "#1C1917", fontWeight: 600 }}>Fully insured & bonded</div>
              </div>
            </div>
          </div>
          <div>
            <img src={ABOUT_IMG} alt="Construction site dump truck" style={{ width: "100%", height: 450, objectFit: "cover", borderRadius: 2 }} />
          </div>
        </div>
      </section>

      {/* ===== QUOTE FORM ===== */}
      <section id="quote" style={{ background: "#FAFAF9", padding: "100px 32px", borderTop: "1px solid #E7E5E4", borderBottom: "1px solid #E7E5E4" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#F59E0B", fontWeight: 700, marginBottom: 16 }}>▸ REQUEST A QUOTE</div>
            <h2 style={{ fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 900, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
              Tell us about your job.
            </h2>
            <p style={{ fontSize: 17, color: "#57534E", lineHeight: 1.6, margin: 0 }}>
              Fill out the form and we'll get back to you within 24 hours. Need it sooner? <a href="tel:+16268145541" style={{ color: "#F59E0B", fontWeight: 700 }}>Call dispatch.</a>
            </p>
          </div>
          {submitted ? (
            <div style={{ padding: "40px 32px", background: "#F0FDF4", border: "2px solid #16A34A", borderRadius: 2, textAlign: "center" }}>
              <CheckCircle2 size={44} style={{ color: "#16A34A", marginBottom: 16 }} />
              <h3 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", color: "#1C1917" }}>Quote request received.</h3>
              <p style={{ fontSize: 15, color: "#57534E", margin: 0 }}>We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <div style={{ background: "#FFF", padding: 40, border: "1px solid #E7E5E4", borderRadius: 2 }}>
              {error && (
                <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1.5px solid #DC2626", color: "#991B1B", marginBottom: 20, fontSize: 14, borderRadius: 2 }}>
                  ✗ {error}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {publicField("Name *", form.name, (v) => setForm({ ...form, name: v }), "John Smith")}
                {publicField("Company", form.company, (v) => setForm({ ...form, company: v }), "ACME Construction")}
                {publicField("Email *", form.email, (v) => setForm({ ...form, email: v }), "you@example.com", "email")}
                {publicField("Phone", form.phone, (v) => setForm({ ...form, phone: v }), "(555) 555-1234", "tel")}
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={publicLabelStyle}>Service needed</label>
                <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} style={publicInputStyle}>
                  <option value="hauling">Hauling / Site Support</option>
                  <option value="aggregate">Aggregate Supply</option>
                  <option value="dirt">Dirt Import / Export</option>
                  <option value="subcontract">Subcontract Hauling</option>
                  <option value="other">Other (specify below)</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                {publicField("Pickup location", form.pickup, (v) => setForm({ ...form, pickup: v }), "Quarry or address")}
                {publicField("Drop-off location", form.dropoff, (v) => setForm({ ...form, dropoff: v }), "Job site address")}
                {publicField("Material", form.material, (v) => setForm({ ...form, material: v }), "e.g. Basalt, Base Rock")}
                {publicField("Quantity", form.quantity, (v) => setForm({ ...form, quantity: v }), "e.g. 500 tons or 20 loads")}
                {publicField("Needed by", form.needDate, (v) => setForm({ ...form, needDate: v }), "", "date")}
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={publicLabelStyle}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything else we should know — special access, scheduling constraints, etc." style={{ ...publicInputStyle, minHeight: 100, resize: "vertical" }} />
              </div>
              <button onClick={handleSubmit} disabled={submitting} style={{ marginTop: 28, width: "100%", padding: "18px 32px", background: submitting ? "#A8A29E" : "#F59E0B", color: "#1C1917", fontWeight: 800, fontSize: 15, letterSpacing: "0.05em", border: "none", cursor: submitting ? "wait" : "pointer", borderRadius: 2 }}>
                {submitting ? "SENDING..." : "SUBMIT QUOTE REQUEST"} <ArrowRight size={16} style={{ marginLeft: 8, verticalAlign: "middle" }} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ===== CONTACT ===== */}
      <section id="contact" style={{ background: "#FFF", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 40 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#F59E0B", fontWeight: 700, marginBottom: 16 }}>▸ GET IN TOUCH</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, margin: "0 0 20px", letterSpacing: "-0.02em" }}>Contact us.</h2>
            <p style={{ fontSize: 16, color: "#57534E", lineHeight: 1.6, margin: 0 }}>
              Dispatch is available during business hours. For urgent bids or after-hours work, leave a message and we'll get back to you fast.
            </p>
          </div>
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "#78716C", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>PHONE</div>
              <a href="tel:+16268145541" style={{ fontSize: 22, fontWeight: 800, color: "#1C1917", textDecoration: "none" }}>(626) 814-5541</a>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "#78716C", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>EMAIL</div>
              <a href="mailto:office@4brotherstruck.com" style={{ fontSize: 16, fontWeight: 600, color: "#1C1917", textDecoration: "none" }}>office@4brotherstruck.com</a>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#78716C", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>ADDRESS</div>
              <div style={{ fontSize: 16, color: "#1C1917", fontWeight: 600, lineHeight: 1.5 }}>Bay Point, CA 94565</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#78716C", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 12 }}>HOURS</div>
            <div style={{ fontSize: 15, color: "#1C1917", lineHeight: 1.8 }}>
              <div><strong>Mon–Fri</strong> &nbsp;&nbsp; 6:00 AM – 6:00 PM</div>
              <div><strong>Sat</strong> &nbsp;&nbsp; By appointment</div>
              <div><strong>Sun</strong> &nbsp;&nbsp; Closed</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ background: "#1C1917", color: "#A8A29E", padding: "40px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: 36, height: 36, background: "#F59E0B", color: "#1C1917", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, letterSpacing: "-0.06em", fontFamily: "Arial, sans-serif", borderRadius: 2 }}>
              4B
            </div>
            <div style={{ fontSize: 12, color: "#D6D3D1", letterSpacing: "0.08em" }}>© 2026 · 4 BROTHERS TRUCKING, LLC</div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={onStaffLogin} style={{ background: "transparent", border: "none", color: "#78716C", fontSize: 11, letterSpacing: "0.1em", cursor: "pointer", textTransform: "uppercase", fontWeight: 600 }}>Staff Login</button>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#78716C" }}>USDOT · DBE · MBE · SB-PW CERTIFIED</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Styles reused across PublicSite form
const navLinkStyle = { fontSize: 14, color: "#57534E", textDecoration: "none", fontWeight: 500, padding: "6px 2px" };
const publicLabelStyle = { display: "block", fontSize: 11, letterSpacing: "0.08em", color: "#78716C", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" };
const publicInputStyle = { width: "100%", padding: "11px 14px", fontSize: 15, border: "1.5px solid #D6D3D1", borderRadius: 2, fontFamily: "inherit", color: "#1C1917", background: "#FFF" };
const publicField = (label, value, onChange, placeholder = "", type = "text") => (
  <div>
    <label style={publicLabelStyle}>{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={publicInputStyle} />
  </div>
);


// ========== CLIENT TOKEN HELPER ==========
// Deterministic token from client name — same name always → same link
const clientToken = (name) => {
  if (!name) return null;
  const normalized = String(name).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!normalized) return null;
  // Simple hash → base32-ish string, 8 chars
  let h = 0;
  for (let i = 0; i < normalized.length; i++) { h = ((h << 5) - h + normalized.charCodeAt(i)) | 0; }
  const abs = Math.abs(h).toString(36).toUpperCase().padStart(6, "0").slice(0, 8);
  return "C" + abs;
};
const matchesClientToken = (dispatch, token) => {
  if (!token) return false;
  return clientToken(dispatch.clientName) === token || clientToken(dispatch.subContractor) === token;
};

// ========== SHARED TRACKING UI ==========
const TrackingHeader = ({ company }) => (
  <div style={{ background: "var(--steel)", color: "var(--cream)", padding: "18px 24px", borderBottom: "3px solid var(--hazard)", position: "relative" }} className="grain">
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 1, flexWrap: "wrap" }}>
      {company?.logoDataUrl ? (
        <img src={company.logoDataUrl} alt="logo" style={{ width: 40, height: 40, objectFit: "contain", border: "2px solid var(--hazard)", background: "#FFF" }} />
      ) : (
        <div style={{ width: 40, height: 40, background: "var(--hazard)", border: "2px solid var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-3deg)" }}>
          <Truck size={20} strokeWidth={2.5} color="var(--steel)" />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div className="fbt-display" style={{ fontSize: 18, letterSpacing: "-0.02em" }}>{company?.name || "4 BROTHERS TRUCKING"}</div>
        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", letterSpacing: "0.15em" }}>▸ CLIENT TRACKING · LIVE</div>
      </div>
    </div>
  </div>
);

const computeDispatchSummary = (d, bills) => {
  const totalTons = bills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
  const totalLoads = bills.reduce((s, fb) => s + (Number(fb.loadCount) || 0), 0);
  const pct = d.trucksExpected ? Math.min(100, (bills.length / d.trucksExpected) * 100) : 0;
  let statusLabel = d.status === "closed" ? "COMPLETE" : (bills.length === 0 ? "OPEN · AWAITING TRUCKS" : (bills.length >= d.trucksExpected ? "COMPLETE" : "IN PROGRESS"));
  const statusColor = statusLabel === "COMPLETE" ? "var(--good)" : statusLabel.startsWith("OPEN") ? "var(--concrete)" : "var(--hazard-deep)";
  return { totalTons, totalLoads, pct, statusLabel, statusColor };
};

// Single dispatch tracking card (also used in client view)
const DispatchTrackingCard = ({ dispatch, bills, expanded, onPhotoClick }) => {
  const { totalTons, totalLoads, pct, statusLabel, statusColor } = computeDispatchSummary(dispatch, bills);
  return (
    <div className="fbt-card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="hazard-stripe-thin" style={{ height: 6 }} />
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <span className="chip" style={{ background: statusColor, color: "#FFF", borderColor: "var(--steel)" }}>● {statusLabel}</span>
              <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>{fmtDate(dispatch.date)}</span>
            </div>
            <h3 className="fbt-display" style={{ fontSize: 22, margin: "0 0 6px", lineHeight: 1.15 }}>{dispatch.jobName}</h3>
            <div className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)" }}>
              {dispatch.material && <>MATERIAL ▸ {dispatch.material}</>}
              {dispatch.pickup && <><br />PICKUP ▸ {dispatch.pickup}</>}
              {dispatch.dropoff && <><br />DROPOFF ▸ {dispatch.dropoff}</>}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "JetBrains Mono, monospace", marginBottom: 4, color: "var(--concrete)" }}>
            <span>▸ {bills.length} / {dispatch.trucksExpected} TRUCKS IN</span>
            <span>{pct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 10, background: "#E7E5E4", border: "1px solid var(--steel)" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "var(--good)" : "var(--hazard)", transition: "width 0.4s ease" }} />
          </div>
        </div>

        {/* Totals */}
        {bills.length > 0 && (
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            <div style={{ padding: 12, border: "1.5px solid var(--steel)", background: "#FFF" }}>
              <div className="fbt-display" style={{ fontSize: 22, lineHeight: 1 }}>{totalTons.toFixed(1)}</div>
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.1em", marginTop: 2 }}>TOTAL TONS</div>
            </div>
            <div style={{ padding: 12, border: "1.5px solid var(--steel)", background: "#FFF" }}>
              <div className="fbt-display" style={{ fontSize: 22, lineHeight: 1 }}>{totalLoads}</div>
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.1em", marginTop: 2 }}>LOADS</div>
            </div>
            <div style={{ padding: 12, border: "1.5px solid var(--steel)", background: "var(--hazard)" }}>
              <div className="fbt-display" style={{ fontSize: 22, lineHeight: 1 }}>{bills.length}</div>
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--steel)", letterSpacing: "0.1em", marginTop: 2, fontWeight: 700 }}>FREIGHT BILLS</div>
            </div>
          </div>
        )}

        {/* Freight bill list (when expanded or always if short) */}
        {expanded && bills.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ FREIGHT BILLS SUBMITTED</div>
            <div style={{ display: "grid", gap: 8 }}>
              {bills.map((fb) => (
                <div key={fb.id} style={{ border: "1.5px solid var(--steel)", background: "#FFF", padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div className="fbt-display" style={{ fontSize: 15 }}>FB #{fb.freightBillNumber}</div>
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
                        {fb.driverName} · TRUCK {fb.truckNumber}
                        {fb.tonnage && <> · {fb.tonnage} TONS</>}
                      </div>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2, opacity: 0.7 }}>
                        DELIVERED ▸ {fmtDateTime(fb.submittedAt)}
                      </div>
                    </div>
                    {fb.photos && fb.photos.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {fb.photos.slice(0, 3).map((p) => (
                          <img key={p.id} src={p.dataUrl} onClick={() => onPhotoClick?.(p.dataUrl)} style={{ width: 48, height: 48, objectFit: "cover", border: "1.5px solid var(--steel)", cursor: "pointer" }} alt="ticket" />
                        ))}
                        {fb.photos.length > 3 && (
                          <div style={{ width: 48, height: 48, border: "1.5px dashed var(--concrete)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)" }}>
                            +{fb.photos.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Single-dispatch tracking page
const DispatchTrackingPage = ({ dispatch, freightBills, company, onBack }) => {
  const [lightbox, setLightbox] = useState(null);

  if (!dispatch) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", maxWidth: 400 }}>
          <AlertCircle size={48} style={{ color: "var(--safety)", marginBottom: 16 }} />
          <h2 className="fbt-display" style={{ fontSize: 24, margin: "0 0 12px" }}>TRACKING LINK NOT FOUND</h2>
          <p style={{ color: "var(--concrete)", margin: "0 0 20px" }}>
            This tracking link may be invalid or the dispatch has been removed. Contact your dispatcher for a current link.
          </p>
          <button className="btn-ghost" onClick={onBack}>← BACK</button>
        </div>
      </div>
    );
  }

  const bills = freightBills.filter((fb) => fb.dispatchId === dispatch.id).sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }} className="texture-paper">
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      <TrackingHeader company={company} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", letterSpacing: "0.15em", marginBottom: 8 }}>
          ▸ DISPATCH #{dispatch.code}
        </div>
        <h1 className="fbt-display" style={{ fontSize: 36, margin: "0 0 8px", lineHeight: 1 }}>
          JOB TRACKING
        </h1>
        <p style={{ color: "var(--concrete)", margin: "0 0 24px", fontSize: 14 }}>
          Real-time status of your trucking job. Refresh the page to see new updates.
        </p>

        <DispatchTrackingCard dispatch={dispatch} bills={bills} expanded={true} onPhotoClick={setLightbox} />

        <div className="fbt-mono" style={{ marginTop: 32, fontSize: 10, color: "var(--concrete)", textAlign: "center", letterSpacing: "0.12em", lineHeight: 1.8 }}>
          ▸ QUESTIONS? CONTACT YOUR DISPATCHER<br />
          ▸ {company?.name || "4 BROTHERS TRUCKING"}{company?.phone && ` · ${company.phone}`}{company?.email && ` · ${company.email}`}
        </div>
      </div>
    </div>
  );
};

// Client-wide tracking page (all dispatches for a client)
const ClientTrackingPage = ({ token, dispatches, freightBills, company, onBack }) => {
  const [lightbox, setLightbox] = useState(null);
  const matched = useMemo(
    () => dispatches
      .filter((d) => matchesClientToken(d, token))
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [dispatches, token]
  );

  if (matched.length === 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", maxWidth: 400 }}>
          <AlertCircle size={48} style={{ color: "var(--safety)", marginBottom: 16 }} />
          <h2 className="fbt-display" style={{ fontSize: 24, margin: "0 0 12px" }}>NO JOBS FOUND</h2>
          <p style={{ color: "var(--concrete)", margin: "0 0 20px" }}>
            This client tracking link has no dispatches yet, or the link is invalid. Contact your dispatcher.
          </p>
          <button className="btn-ghost" onClick={onBack}>← BACK</button>
        </div>
      </div>
    );
  }

  // Derive display client name from first matched dispatch
  const clientName = matched[0].clientName || matched[0].subContractor || "Your Jobs";

  // Stats
  const allBills = matched.flatMap((d) => freightBills.filter((fb) => fb.dispatchId === d.id));
  const totalTons = allBills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
  const openCount = matched.filter((d) => {
    const b = freightBills.filter((fb) => fb.dispatchId === d.id);
    return d.status !== "closed" && b.length < d.trucksExpected;
  }).length;
  const completeCount = matched.filter((d) => {
    const b = freightBills.filter((fb) => fb.dispatchId === d.id);
    return d.status === "closed" || b.length >= d.trucksExpected;
  }).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }} className="texture-paper">
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      <TrackingHeader company={company} />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", letterSpacing: "0.15em", marginBottom: 8 }}>
          ▸ CLIENT PORTAL
        </div>
        <h1 className="fbt-display" style={{ fontSize: 36, margin: "0 0 8px", lineHeight: 1 }}>
          {clientName.toUpperCase()}
        </h1>
        <p style={{ color: "var(--concrete)", margin: "0 0 24px", fontSize: 14 }}>
          All your jobs with us, in one place. Refresh the page to see new freight bills as they come in.
        </p>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
          <div className="fbt-card" style={{ padding: 16 }}>
            <div className="stat-num" style={{ fontSize: 36 }}>{matched.length}</div>
            <div className="stat-label">Total Jobs</div>
          </div>
          <div className="fbt-card" style={{ padding: 16, background: openCount > 0 ? "#FEF3C7" : "#FFF" }}>
            <div className="stat-num" style={{ fontSize: 36 }}>{openCount}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="fbt-card" style={{ padding: 16 }}>
            <div className="stat-num" style={{ fontSize: 36 }}>{completeCount}</div>
            <div className="stat-label">Complete</div>
          </div>
          <div className="fbt-card" style={{ padding: 16, background: "var(--hazard)" }}>
            <div className="stat-num" style={{ fontSize: 36 }}>{totalTons.toFixed(0)}</div>
            <div className="stat-label">Total Tons</div>
          </div>
        </div>

        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.15em", marginBottom: 14 }}>
          ▸ JOBS ({matched.length})
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          {matched.map((d) => {
            const bills = freightBills.filter((fb) => fb.dispatchId === d.id).sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
            return <DispatchTrackingCard key={d.id} dispatch={d} bills={bills} expanded={true} onPhotoClick={setLightbox} />;
          })}
        </div>

        <div className="fbt-mono" style={{ marginTop: 40, fontSize: 10, color: "var(--concrete)", textAlign: "center", letterSpacing: "0.12em", lineHeight: 1.8 }}>
          ▸ QUESTIONS? CONTACT YOUR DISPATCHER<br />
          ▸ {company?.name || "4 BROTHERS TRUCKING"}{company?.phone && ` · ${company.phone}`}{company?.email && ` · ${company.email}`}
        </div>
      </div>
    </div>
  );
};

const DriverUploadPage = ({ dispatch, onSubmitTruck, onBack, availableDrivers = [], assignment = null, assignmentContact = null }) => {
  // For driver-kind assignments, driver name is locked in (but editable via override)
  const lockedDriverName = assignment?.kind === "driver" ? assignment.name : null;
  // Prefill truck number — prefer the truck assigned on the order (fleet-synced at assignment time),
  // fall back to the contact's default truck number
  const prefillTruck = assignment?.kind === "driver"
    ? (assignment?.truckNumber || assignmentContact?.defaultTruckNumber || "")
    : "";

  const [form, setForm] = useState({
    freightBillNumber: "",
    driverName: lockedDriverName || "",
    driverId: assignment?.kind === "driver" ? assignment.contactId : null,
    truckNumber: prefillTruck,
    material: dispatch?.material || "",
    tonnage: "", loadCount: "1",
    pickupTime: "", dropoffTime: "", notes: "",
    extras: [],
  });

  // Track which pre-filled fields the driver has unlocked for override
  const [unlockedFields, setUnlockedFields] = useState({});
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(""); // stage text
  const [submitted, setSubmitted] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [lastFB, setLastFB] = useState("");
  const [submissionSummary, setSubmissionSummary] = useState(null); // full details of what was submitted

  const handlePhotos = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const next = [...photos];
    let processed = 0;
    for (const f of Array.from(files)) {
      try {
        const dataUrl = await compressImage(f);
        next.push({ id: Date.now() + Math.random(), dataUrl, name: f.name });
      } catch (e) { console.warn(e); }
      processed++;
    }
    setPhotos(next);
    setUploading(false);
  };

  const removePhoto = (id) => setPhotos(photos.filter((p) => p.id !== id));

  const submit = async () => {
    if (!form.freightBillNumber || !form.driverName || !form.truckNumber) {
      alert("Freight bill #, driver name, and truck # are required.");
      return;
    }
    setSubmitting(true);
    try {
      setSubmitProgress("COMPRESSING PHOTOS…");
      await new Promise((r) => setTimeout(r, 100)); // UI tick

      setSubmitProgress("UPLOADING TO DISPATCH…");
      const cleanExtras = (form.extras || []).filter((x) => Number(x.amount) > 0);
      const submittedAt = new Date().toISOString();
      await onSubmitTruck({
        ...form,
        extras: cleanExtras,
        id: "temp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        dispatchId: dispatch.id,
        photos,
        submittedAt,
      });

      setSubmitProgress("✓ SENT");
      await new Promise((r) => setTimeout(r, 400));

      // Save detailed submission summary for confirmation screen
      setSubmissionSummary({
        fbNumber: form.freightBillNumber,
        driverName: form.driverName,
        truckNumber: form.truckNumber,
        material: form.material,
        tonnage: form.tonnage,
        loadCount: form.loadCount,
        pickupTime: form.pickupTime,
        dropoffTime: form.dropoffTime,
        photoCount: photos.length,
        extras: cleanExtras,
        extrasTotal: cleanExtras.reduce((s, x) => s + (Number(x.amount) || 0), 0),
        submittedAt,
      });
      setLastFB(form.freightBillNumber);
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert("Upload failed. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
      setSubmitProgress("");
    }
  };

  if (!dispatch) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", maxWidth: 400 }}>
          <AlertCircle size={48} style={{ color: "var(--safety)", marginBottom: 16 }} />
          <h2 className="fbt-display" style={{ fontSize: 24, margin: "0 0 12px" }}>LINK NOT FOUND</h2>
          <p style={{ color: "var(--concrete)", margin: "0 0 20px" }}>This upload link is invalid or has been removed. Check with dispatch for a new link.</p>
          <button className="btn-ghost" onClick={onBack}>← BACK</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--cream)" }} className="texture-paper">
        <div className="fbt-card" style={{ padding: 32, textAlign: "center", maxWidth: 520, width: "100%" }}>
          <div style={{ width: 80, height: 80, background: "var(--good)", borderRadius: "50%", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={44} color="#FFF" />
          </div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--good)", letterSpacing: "0.15em", marginBottom: 4 }}>▸ SENT TO DISPATCHER</div>
          <h2 className="fbt-display" style={{ fontSize: 28, margin: "0 0 8px" }}>FB #{lastFB}</h2>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 20 }}>
            {submissionSummary?.submittedAt ? new Date(submissionSummary.submittedAt).toLocaleString() : "—"}
          </div>

          {/* Summary block */}
          {submissionSummary && (
            <div style={{ background: "#F0FDF4", border: "2px solid var(--good)", padding: 16, marginBottom: 20, textAlign: "left" }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ WHAT YOU SUBMITTED</div>
              <div style={{ display: "grid", gap: 6, fontSize: 13, fontFamily: "JetBrains Mono, monospace" }}>
                <div><strong>DRIVER:</strong> {submissionSummary.driverName}</div>
                <div><strong>TRUCK:</strong> {submissionSummary.truckNumber}</div>
                {submissionSummary.material && <div><strong>MATERIAL:</strong> {submissionSummary.material}</div>}
                {submissionSummary.tonnage && <div><strong>TONNAGE:</strong> {submissionSummary.tonnage} tons</div>}
                {submissionSummary.loadCount && submissionSummary.loadCount !== "1" && <div><strong>LOADS:</strong> {submissionSummary.loadCount}</div>}
                {(submissionSummary.pickupTime || submissionSummary.dropoffTime) && (
                  <div><strong>TIMES:</strong> {submissionSummary.pickupTime || "—"} → {submissionSummary.dropoffTime || "—"}</div>
                )}
                <div><strong>PHOTOS:</strong> {submissionSummary.photoCount} scale ticket{submissionSummary.photoCount !== 1 ? "s" : ""} attached</div>
                {submissionSummary.extras.length > 0 && (
                  <div><strong>EXTRAS:</strong> {submissionSummary.extras.length} item{submissionSummary.extras.length !== 1 ? "s" : ""} · ${submissionSummary.extrasTotal.toFixed(2)}</div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn-primary" onClick={() => {
              setSubmitted(false);
              setSubmissionSummary(null);
              setForm({ freightBillNumber: "", driverName: form.driverName, truckNumber: form.truckNumber, material: dispatch.material || "", tonnage: "", loadCount: "1", pickupTime: "", dropoffTime: "", notes: "", extras: [] });
              setPhotos([]);
              window.scrollTo(0, 0);
            }}><Plus size={16} /> LOG ANOTHER TRUCK</button>
            <button className="btn-ghost" onClick={onBack}>
              DONE — CLOSE
            </button>
          </div>
          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 16, letterSpacing: "0.1em" }}>
            ▸ ORDER #{dispatch.code} · {dispatch.jobName}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }} className="texture-paper">
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      <div style={{ background: "var(--steel)", color: "var(--cream)", padding: "20px 24px", borderBottom: "3px solid var(--hazard)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}><Logo size="sm" /></div>
      </div>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", letterSpacing: "0.15em", marginBottom: 8 }}>
          ▸ DRIVER / SUB UPLOAD · ORDER #{dispatch.code}
        </div>
        <h1 className="fbt-display" style={{ fontSize: 32, margin: "0 0 8px", lineHeight: 1.1 }}>UPLOAD YOUR FREIGHT BILL</h1>
        <p style={{ color: "var(--concrete)", margin: "0 0 24px", fontSize: 15 }}>One submission per truck. Fill out the freight bill info and attach the scale ticket photos.</p>

        {/* Assignment-specific banner when using a sublink */}
        {assignment && (
          <div className="fbt-card" style={{ padding: 18, marginBottom: 20, background: "var(--steel)", color: "var(--cream)", borderLeft: "6px solid var(--hazard)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", letterSpacing: "0.15em", marginBottom: 4 }}>
              ▸ {assignment.kind === "driver" ? "DRIVER LINK" : "SUB-CONTRACTOR LINK"}
            </div>
            <div className="fbt-display" style={{ fontSize: 18, marginBottom: 6 }}>{assignment.name}</div>
            <div className="fbt-mono" style={{ fontSize: 12, letterSpacing: "0.05em" }}>
              {dispatch.submittedCount} OF {dispatch.trucksExpected} TRUCK{dispatch.trucksExpected !== 1 ? "S" : ""} SUBMITTED
              {dispatch.submittedCount >= dispatch.trucksExpected && " · ✓ COMPLETE"}
            </div>
          </div>
        )}

        <div className="fbt-card" style={{ padding: 20, marginBottom: 24, background: "#FEF3C7" }}>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>JOB DETAILS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, fontSize: 13, fontFamily: "JetBrains Mono, monospace" }}>
            <div><strong>JOB:</strong> {dispatch.jobName}</div>
            <div><strong>DATE:</strong> {fmtDate(dispatch.date)}</div>
            {dispatch.pickup && <div><strong>PICKUP:</strong> {dispatch.pickup}</div>}
            {dispatch.dropoff && <div><strong>DROPOFF:</strong> {dispatch.dropoff}</div>}
            <div><strong>TRUCKS EXPECTED:</strong> {dispatch.trucksExpected}</div>
            <div><strong>SUBMITTED SO FAR:</strong> {dispatch.submittedCount}</div>
          </div>
          {dispatch.notes && <div style={{ marginTop: 10, fontSize: 13, color: "var(--concrete)" }}>{dispatch.notes}</div>}
        </div>
        <div className="fbt-card" style={{ padding: 24 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label className="fbt-label">Freight Bill # * <span style={{ color: "var(--concrete)", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(from the top of your paper bill)</span></label>
              <input className="fbt-input" value={form.freightBillNumber} onChange={(e) => setForm({ ...form, freightBillNumber: e.target.value })} placeholder="e.g. 45821" style={{ fontSize: 16 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
              <div>
                <label className="fbt-label">
                  Driver Name *
                  {lockedDriverName && unlockedFields.driverName && (
                    <span className="fbt-mono" style={{ fontSize: 9, color: "var(--safety)", marginLeft: 8, fontWeight: 700 }}>● OVERRIDDEN</span>
                  )}
                </label>
                {lockedDriverName && !unlockedFields.driverName ? (
                  <div>
                    <input
                      className="fbt-input"
                      value={form.driverName}
                      disabled
                      style={{ background: "#FEF3C7", fontWeight: 700 }}
                      title="This link is assigned to you"
                    />
                    <button
                      type="button"
                      onClick={() => setUnlockedFields({ ...unlockedFields, driverName: true })}
                      className="fbt-mono"
                      style={{ background: "transparent", border: "none", color: "var(--hazard-deep)", fontSize: 10, marginTop: 4, cursor: "pointer", padding: 0, textDecoration: "underline" }}
                    >
                      ▸ NOT YOU? TAP TO CHANGE
                    </button>
                  </div>
                ) : availableDrivers.length > 0 ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      className="fbt-select"
                      style={{ flex: 1, minWidth: 140 }}
                      value={form.driverId || ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) { setForm({ ...form, driverId: null, driverName: "" }); return; }
                        const d = availableDrivers.find((x) => String(x.id) === id);
                        if (d) setForm({ ...form, driverId: d.id, driverName: d.companyName || d.contactName });
                      }}
                    >
                      <option value="">— Select driver —</option>
                      {availableDrivers.map((d) => (
                        <option key={d.id} value={d.id}>{d.companyName || d.contactName}</option>
                      ))}
                      <option value="other">— Other (type below) —</option>
                    </select>
                    {(!form.driverId || form.driverId === "other") && (
                      <input
                        className="fbt-input"
                        style={{ flex: 1, minWidth: 140 }}
                        value={form.driverName}
                        onChange={(e) => setForm({ ...form, driverName: e.target.value, driverId: null })}
                        placeholder="Your full name"
                      />
                    )}
                  </div>
                ) : (
                  <input className="fbt-input" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="Your full name" />
                )}
              </div>
              <div>
                <label className="fbt-label">
                  Truck # *
                  {prefillTruck && !unlockedFields.truckNumber && form.truckNumber === prefillTruck && (
                    <span className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginLeft: 8 }}>● AUTOFILLED</span>
                  )}
                  {prefillTruck && unlockedFields.truckNumber && (
                    <span className="fbt-mono" style={{ fontSize: 9, color: "var(--safety)", marginLeft: 8, fontWeight: 700 }}>● CHANGED</span>
                  )}
                </label>
                <input
                  className="fbt-input"
                  value={form.truckNumber}
                  onChange={(e) => { setForm({ ...form, truckNumber: e.target.value }); if (prefillTruck && e.target.value !== prefillTruck) setUnlockedFields({ ...unlockedFields, truckNumber: true }); }}
                  placeholder="T-01 or plate"
                  style={prefillTruck && !unlockedFields.truckNumber ? { background: "#FEF3C7" } : {}}
                />
                {prefillTruck && !unlockedFields.truckNumber && (
                  <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginTop: 3 }}>
                    ▸ AUTOFILLED FROM YOUR CONTACT · TAP FIELD TO CHANGE
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
              <div><label className="fbt-label">Material</label><input className="fbt-input" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} /></div>
              <div><label className="fbt-label">Tonnage</label><input className="fbt-input" type="number" step="0.01" value={form.tonnage} onChange={(e) => setForm({ ...form, tonnage: e.target.value })} placeholder="e.g. 25.4" /></div>
              <div><label className="fbt-label">Load Count</label><input className="fbt-input" type="number" value={form.loadCount} onChange={(e) => setForm({ ...form, loadCount: e.target.value })} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
              <div><label className="fbt-label">Pickup Time</label><input className="fbt-input" type="time" value={form.pickupTime} onChange={(e) => setForm({ ...form, pickupTime: e.target.value })} /></div>
              <div><label className="fbt-label">Dropoff Time</label><input className="fbt-input" type="time" value={form.dropoffTime} onChange={(e) => setForm({ ...form, dropoffTime: e.target.value })} /></div>
            </div>
            <div><label className="fbt-label">Notes</label><textarea className="fbt-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything unusual about this load?" /></div>

            {/* Tolls / Dump Fees / Fuel / Other — per-FB extras */}
            <div style={{ padding: 12, background: "#FEF3C7", border: "2px solid var(--hazard)" }}>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 6, fontWeight: 700 }}>
                ▸ TOLLS · DUMP FEES · FUEL · OTHER {form.extras?.length > 0 ? `(${form.extras.length})` : "(OPTIONAL)"}
              </div>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8, lineHeight: 1.4 }}>
                Add any out-of-pocket costs you paid for this load. Keep receipts. You'll be reimbursed.
              </div>
              {(form.extras || []).length > 0 && (
                <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
                  {form.extras.map((x, idx) => {
                    const hasQtyRate = (Number(x.qty) > 0) && (Number(x.rate) > 0);
                    const computed = hasQtyRate ? (Number(x.qty) * Number(x.rate)).toFixed(2) : "";
                    return (
                      <div key={idx} style={{ border: "1px solid var(--concrete)", padding: 8, background: "#FFF" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", gap: 6, alignItems: "center", marginBottom: 6 }}>
                          <select
                            className="fbt-select"
                            style={{ padding: "6px 8px", fontSize: 11 }}
                            value={["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? x.label : "Other"}
                            onChange={(e) => {
                              const v = e.target.value;
                              const next = [...form.extras];
                              next[idx] = { ...next[idx], label: v === "Other" ? (next[idx].label || "") : v };
                              setForm({ ...form, extras: next });
                            }}
                          >
                            <option value="Tolls">Tolls</option>
                            <option value="Dump Fees">Dump Fees</option>
                            <option value="Fuel Surcharge">Fuel</option>
                            <option value="Other">Other</option>
                          </select>
                          <input
                            className="fbt-input"
                            style={{ padding: "6px 10px", fontSize: 12 }}
                            placeholder={["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? "Description (e.g. Bay Bridge)" : "Describe — specify type"}
                            value={x.label && !["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? x.label : (x.note || "")}
                            onChange={(e) => {
                              const next = [...form.extras];
                              const isOther = !["Tolls", "Dump Fees", "Fuel Surcharge"].includes(next[idx].label);
                              if (isOther) next[idx] = { ...next[idx], label: e.target.value };
                              else next[idx] = { ...next[idx], note: e.target.value };
                              setForm({ ...form, extras: next });
                            }}
                          />
                          <button
                            onClick={() => setForm({ ...form, extras: form.extras.filter((_, i) => i !== idx) })}
                            className="btn-danger"
                            style={{ padding: "6px 10px", fontSize: 11 }}
                            type="button"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, alignItems: "center" }}>
                          <div>
                            <label className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.08em" }}>QTY (OPTIONAL)</label>
                            <input
                              className="fbt-input"
                              type="number" step="0.01" min="0"
                              placeholder="e.g. 3"
                              style={{ padding: "5px 8px", fontSize: 11 }}
                              value={x.qty || ""}
                              onChange={(e) => {
                                const next = [...form.extras];
                                const newQty = e.target.value;
                                next[idx] = { ...next[idx], qty: newQty };
                                // Auto-compute amount if both qty + rate are set
                                if (newQty && next[idx].rate) {
                                  next[idx].amount = (Number(newQty) * Number(next[idx].rate)).toFixed(2);
                                }
                                setForm({ ...form, extras: next });
                              }}
                            />
                          </div>
                          <div>
                            <label className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.08em" }}>RATE $ (OPTIONAL)</label>
                            <input
                              className="fbt-input"
                              type="number" step="0.01" min="0"
                              placeholder="e.g. 8.50"
                              style={{ padding: "5px 8px", fontSize: 11 }}
                              value={x.rate || ""}
                              onChange={(e) => {
                                const next = [...form.extras];
                                const newRate = e.target.value;
                                next[idx] = { ...next[idx], rate: newRate };
                                // Auto-compute amount if both qty + rate are set
                                if (newRate && next[idx].qty) {
                                  next[idx].amount = (Number(next[idx].qty) * Number(newRate)).toFixed(2);
                                }
                                setForm({ ...form, extras: next });
                              }}
                            />
                          </div>
                          <div>
                            <label className="fbt-mono" style={{ fontSize: 9, color: hasQtyRate ? "var(--good)" : "var(--concrete)", letterSpacing: "0.08em", fontWeight: 700 }}>
                              AMOUNT $ {hasQtyRate ? "(AUTO)" : ""}
                            </label>
                            <input
                              className="fbt-input"
                              type="number" step="0.01" min="0"
                              placeholder="$0.00"
                              style={{ padding: "5px 8px", fontSize: 11, background: hasQtyRate ? "#F0FDF4" : "#FFF", fontWeight: 700 }}
                              value={x.amount || ""}
                              onChange={(e) => {
                                const next = [...form.extras];
                                next[idx] = { ...next[idx], amount: e.target.value };
                                setForm({ ...form, extras: next });
                              }}
                              title={hasQtyRate ? "Auto-calculated — edit to override" : "Enter amount directly or use qty + rate"}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => setForm({ ...form, extras: [...(form.extras || []), { label: "Tolls", amount: "", reimbursable: true }] })}>
                  <Plus size={11} style={{ marginRight: 3 }} /> TOLLS
                </button>
                <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => setForm({ ...form, extras: [...(form.extras || []), { label: "Dump Fees", amount: "", reimbursable: true }] })}>
                  <Plus size={11} style={{ marginRight: 3 }} /> DUMP
                </button>
                <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => setForm({ ...form, extras: [...(form.extras || []), { label: "Fuel Surcharge", amount: "", reimbursable: true }] })}>
                  <Plus size={11} style={{ marginRight: 3 }} /> FUEL
                </button>
                <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => setForm({ ...form, extras: [...(form.extras || []), { label: "", amount: "", reimbursable: true }] })}>
                  <Plus size={11} style={{ marginRight: 3 }} /> OTHER
                </button>
              </div>
            </div>
            <div>
              <label className="fbt-label" style={{ fontSize: 14, marginBottom: 10 }}>Scale Tickets / Freight Bill Photos *</label>

              {/* BIG camera button — dominant for mobile/field use */}
              <label
                htmlFor="big-camera-input"
                style={{
                  display: "block",
                  cursor: "pointer",
                  padding: "32px 20px",
                  background: photos.length > 0 ? "var(--good)" : "var(--hazard)",
                  color: photos.length > 0 ? "#FFF" : "var(--steel)",
                  border: "3px solid " + (photos.length > 0 ? "var(--good)" : "var(--hazard-deep)"),
                  textAlign: "center",
                  fontFamily: "JetBrains Mono, monospace",
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: "0.08em",
                  minHeight: 120,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transition: "transform 0.1s",
                  WebkitTapHighlightColor: "transparent",
                }}
                onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                onTouchEnd={(e) => { e.currentTarget.style.transform = ""; }}
              >
                <Camera size={48} />
                <div style={{ fontSize: 18 }}>
                  {uploading ? "PROCESSING…" : photos.length === 0 ? "📷 TAKE PHOTO OF TICKETS" : `+ ADD MORE PHOTOS`}
                </div>
                {photos.length === 0 && (
                  <div style={{ fontSize: 11, opacity: 0.9, letterSpacing: "0.08em" }}>
                    TAP TO USE YOUR CAMERA
                  </div>
                )}
                {photos.length > 0 && (
                  <div style={{ fontSize: 11, opacity: 0.95, letterSpacing: "0.08em" }}>
                    {photos.length} ATTACHED · TAP TO ADD MORE
                  </div>
                )}
                <input id="big-camera-input" type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={(e) => handlePhotos(e.target.files)} />
              </label>

              {/* Secondary gallery option */}
              <div style={{ marginTop: 8, textAlign: "center" }}>
                <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", padding: "6px 10px" }}>
                  <Upload size={12} /> OR PICK FROM GALLERY
                  <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handlePhotos(e.target.files)} />
                </label>
              </div>

              {photos.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {photos.map((p) => (
                    <div key={p.id} style={{ position: "relative" }}>
                      <img src={p.dataUrl} className="thumb" alt={p.name} onClick={() => setLightbox(p.dataUrl)} style={{ width: 100, height: 100, objectFit: "cover", border: "2px solid var(--steel)" }} />
                      <button onClick={() => removePhoto(p.id)} style={{ position: "absolute", top: -8, right: -8, background: "var(--safety)", color: "#FFF", border: "2px solid var(--steel)", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, borderRadius: "50%" }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit button with progress indicator */}
            {submitting ? (
              <div style={{ marginTop: 16, padding: 20, background: "var(--good)", color: "#FFF", textAlign: "center" }}>
                <div className="fbt-mono" style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>
                  {submitProgress || "SUBMITTING…"}
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#FFF", width: "50%", animation: "slide 1.2s linear infinite" }}></div>
                </div>
                <style>{`@keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
              </div>
            ) : (
              <button onClick={submit} className="btn-primary" style={{ marginTop: 16, padding: "16px 24px", fontSize: 15, letterSpacing: "0.08em" }} disabled={uploading}>
                <CheckCircle2 size={18} /> SUBMIT FREIGHT BILL
              </button>
            )}
          </div>
        </div>
        <div className="fbt-mono" style={{ marginTop: 20, fontSize: 11, color: "var(--concrete)", textAlign: "center", letterSpacing: "0.1em" }}>▸ PROBLEM WITH THIS FORM? CONTACT DISPATCH.</div>
      </div>
    </div>
  );
};

// ========== QR CODE DISPLAY BLOCK ==========
// Uses goqr.me's free public API — no key required, returns PNG
const qrServiceUrl = (data, size = 300) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=10&color=1C1917&bgcolor=FAFAF9`;

const QRCodeBlock = ({ url, size = 180, label, onToast }) => {
  const [failed, setFailed] = useState(false);
  const qrUrl = qrServiceUrl(url, size * 2);

  const downloadPNG = async () => {
    try {
      const bigUrl = qrServiceUrl(url, 1024);
      // Fetch and download as blob so the filename is preserved
      const resp = await fetch(bigUrl);
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `${(label || "dispatch-qr").replace(/[^a-z0-9-]/gi, "-")}.png`;
      a.click();
      URL.revokeObjectURL(objUrl);
      onToast?.("QR PNG DOWNLOADED");
    } catch (e) {
      console.warn("QR download failed", e);
      // Fallback: just open in new tab
      window.open(qrServiceUrl(url, 1024), "_blank");
      onToast?.("QR OPENED IN NEW TAB");
    }
  };

  if (failed) {
    return (
      <div style={{ width: size, height: size, background: "#F5F5F4", border: "2px dashed var(--concrete)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: 10, textAlign: "center", fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--concrete)" }}>
        <AlertCircle size={20} style={{ marginBottom: 6 }} />
        QR SERVICE OFFLINE — USE THE LINK
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ padding: 8, background: "#FFF", border: "2px solid var(--steel)", boxShadow: "4px 4px 0 var(--hazard)" }}>
        <img
          src={qrUrl}
          alt="QR code"
          style={{ width: size, height: size, display: "block" }}
          onError={() => setFailed(true)}
        />
      </div>
      <button className="btn-ghost" onClick={downloadPNG} style={{ padding: "6px 12px", fontSize: 11 }}>
        <Download size={12} style={{ marginRight: 4 }} /> SAVE PNG
      </button>
    </div>
  );
};

// ========== PRINTABLE DRIVER SHEET ==========
const printDriverSheet = async (dispatch, url, onToast) => {
  try {
    const qrUrl = qrServiceUrl(url, 800);

    const w = window.open("", "_blank", "width=850,height=1100");
    if (!w) { onToast?.("ALLOW POPUPS TO PRINT"); return; }

    const esc = (s) => String(s || "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
    const fmtDateLocal = (iso) => { try { return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); } catch { return iso || ""; } };

    const html = `<!DOCTYPE html>
<html><head><title>Dispatch ${esc(dispatch.code)} — Driver Sheet</title>
<style>
  @page { margin: 0.5in; size: letter; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, Arial, sans-serif; color: #1C1917; padding: 20px; }
  .bar { height: 14px; background: repeating-linear-gradient(-45deg, #F59E0B 0 14px, #1C1917 14px 28px); margin: -20px -20px 30px; }
  h1 { font-family: 'Archivo Black', Impact, sans-serif; font-size: 42px; letter-spacing: -0.02em; margin: 0 0 4px; line-height: 1; }
  .sub { font-family: Menlo, monospace; font-size: 12px; color: #D97706; letter-spacing: 0.15em; margin-bottom: 24px; }
  .card { border: 3px solid #1C1917; padding: 20px; margin-bottom: 20px; }
  .card-accent { border: 3px solid #F59E0B; background: #FEF3C7; padding: 20px; margin-bottom: 20px; }
  h2 { font-family: 'Archivo Black', Impact, sans-serif; font-size: 18px; margin: 0 0 10px; letter-spacing: -0.01em; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-family: Menlo, monospace; font-size: 13px; }
  .grid div strong { display: block; font-size: 10px; color: #44403C; letter-spacing: 0.1em; margin-bottom: 2px; }
  .qr-wrap { display: flex; gap: 30px; align-items: flex-start; }
  .qr-left { flex: 1; }
  .qr-right { text-align: center; }
  .qr-right img { border: 4px solid #1C1917; background: #FFF; padding: 8px; }
  ol { font-size: 14px; line-height: 1.7; padding-left: 22px; }
  ol li { margin-bottom: 6px; }
  .code-big { font-family: 'Archivo Black', Impact, sans-serif; font-size: 32px; color: #D97706; letter-spacing: 0.05em; }
  .url-box { font-family: Menlo, monospace; font-size: 11px; background: #1C1917; color: #F59E0B; padding: 8px 12px; word-break: break-all; margin-top: 8px; }
  .footer { font-family: Menlo, monospace; font-size: 10px; color: #44403C; letter-spacing: 0.15em; margin-top: 30px; padding-top: 14px; border-top: 2px solid #1C1917; display: flex; justify-content: space-between; }
  .btn-print { position: fixed; top: 10px; right: 10px; padding: 10px 20px; background: #F59E0B; border: 3px solid #1C1917; font-family: 'Archivo Black', sans-serif; cursor: pointer; font-size: 13px; letter-spacing: 0.1em; }
  @media print { .btn-print { display: none; } body { padding: 0; } }
</style></head>
<body>
<button class="btn-print" onclick="window.print()">🖨 PRINT</button>
<div class="bar"></div>
<h1>DRIVER / SUB INSTRUCTIONS</h1>
<div class="sub">▸ 4 BROTHERS TRUCKING · DISPATCH #${esc(dispatch.code)}</div>

<div class="card-accent">
  <h2>THE JOB</h2>
  <div class="grid">
    <div><strong>JOB</strong>${esc(dispatch.jobName)}</div>
    <div><strong>DATE</strong>${esc(fmtDateLocal(dispatch.date))}</div>
    <div><strong>PICKUP</strong>${esc(dispatch.pickup) || "—"}</div>
    <div><strong>DROPOFF</strong>${esc(dispatch.dropoff) || "—"}</div>
    <div><strong>MATERIAL</strong>${esc(dispatch.material) || "—"}</div>
    <div><strong>TRUCKS EXPECTED</strong>${esc(dispatch.trucksExpected)}</div>
  </div>
  ${dispatch.notes ? `<div style="margin-top:12px; padding-top:12px; border-top:1px solid #1C1917; font-size:13px; font-family:Menlo,monospace;">${esc(dispatch.notes)}</div>` : ""}
</div>

<div class="card">
  <div class="qr-wrap">
    <div class="qr-left">
      <h2>SCAN TO UPLOAD YOUR FREIGHT BILL</h2>
      <ol>
        <li>Open your phone camera and point it at the QR code →</li>
        <li>Tap the link that appears</li>
        <li>Fill in <strong>freight bill #</strong> (from the top of your paper bill), driver name, and truck #</li>
        <li>Take photos of the scale tickets and paper freight bill</li>
        <li>Tap <strong>SUBMIT FREIGHT BILL</strong> — done</li>
        <li>If you have more trucks for this dispatch, tap <strong>LOG ANOTHER TRUCK</strong> and repeat</li>
      </ol>
      <div class="code-big">${esc(dispatch.code)}</div>
      <div class="url-box">${esc(url)}</div>
    </div>
    <div class="qr-right">
      <img src="${qrUrl}" alt="QR code" style="width:240px; height:240px;" />
      <div style="font-family:Menlo,monospace; font-size:10px; color:#44403C; letter-spacing:0.15em; margin-top:6px;">▸ SCAN ME</div>
    </div>
  </div>
</div>

<div class="footer">
  <span>PROBLEMS? CONTACT DISPATCH.</span>
  <span>4 BROTHERS TRUCKING, LLC</span>
</div>
</body></html>`;

    w.document.write(html);
    w.document.close();
    onToast?.("DRIVER SHEET OPENED");
  } catch (e) {
    console.error(e);
    onToast?.("PRINT SHEET FAILED");
  }
};

const DispatchesTab = ({ dispatches, setDispatches, freightBills, setFreightBills, contacts = [], company = {}, unreadIds = [], markDispatchRead, pendingDispatch, clearPendingDispatch, quarries = [], projects = [], fleet = [], invoices = [], onToast }) => {
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingLock, setEditingLock] = useState({ level: 0, reason: "" });
  const [overriddenFields, setOverriddenFields] = useState({}); // { fieldName: "reason" }
  const [overrideTarget, setOverrideTarget] = useState(null); // { field, label } for modal

  // Check if a field is currently locked (not yet overridden)
  // field names: 'assignments', 'rate', 'material', 'job', 'all'
  const isFieldLocked = (field) => {
    if (!editingId || editingLock.level === 0) return false;
    if (overriddenFields[field]) return false;
    // Level 1: assignments only locked
    if (editingLock.level === 1) return field === "assignments";
    // Level 2: assignments + rate + material + job
    if (editingLock.level === 2) return ["assignments", "rate", "material", "job"].includes(field);
    // Level 3: everything
    if (editingLock.level === 3) return true;
    return false;
  };

  const openOverride = (field, label) => {
    setOverrideTarget({ field, label });
  };

  // Small lock badge component for form fields
  const LockChip = ({ field, label }) => {
    if (!isFieldLocked(field)) {
      if (overriddenFields[field]) {
        return <span className="fbt-mono" style={{ fontSize: 9, color: "var(--safety)", marginLeft: 6, fontWeight: 700 }}>🔓 OVERRIDE: {overriddenFields[field].slice(0, 30)}{overriddenFields[field].length > 30 ? "…" : ""}</span>;
      }
      return null;
    }
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); openOverride(field, label); }}
        className="btn-ghost"
        style={{ padding: "2px 8px", fontSize: 9, marginLeft: 6, background: "#FEF2F2", borderColor: "var(--safety)", color: "var(--safety)" }}
        title="Click to override with reason"
      >
        🔒 UNLOCK
      </button>
    );
  };
  const [activeDispatch, setActiveDispatch] = useState(null);
  const [textQueue, setTextQueue] = useState(null); // { list: [{name, smsLink}], sent: [bool] }
  const [sendLinksTarget, setSendLinksTarget] = useState(null); // Dispatch object to show Send Links modal for

  // Jump to dispatch when notification clicked
  useEffect(() => {
    if (pendingDispatch) {
      setActiveDispatch(pendingDispatch);
      clearPendingDispatch?.();
    }
  }, [pendingDispatch]);

  // Mark as read when dispatch opened
  useEffect(() => {
    if (activeDispatch && markDispatchRead) {
      const ids = freightBills.filter((fb) => fb.dispatchId === activeDispatch && unreadIds.includes(fb.id)).map((fb) => fb.id);
      if (ids.length > 0) markDispatchRead(activeDispatch);
    }
  }, [activeDispatch]);

  const unreadSet = useMemo(() => new Set(unreadIds), [unreadIds]);
  const [lightbox, setLightbox] = useState(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState({ date: todayISO(), jobName: "", clientName: "", clientId: "", projectId: null, subContractor: "", subContractorId: "", pickup: "", dropoff: "", material: "", trucksExpected: 1, ratePerHour: "", ratePerTon: "", ratePerLoad: "", notes: "", assignedDriverIds: [] });

  const resetDraft = () => setDraft({ date: todayISO(), jobName: "", clientName: "", clientId: "", projectId: null, subContractor: "", subContractorId: "", pickup: "", dropoff: "", material: "", trucksExpected: 1, ratePerHour: "", ratePerTon: "", ratePerLoad: "", notes: "", assignedDriverIds: [], assignments: [] });

  // Open the modal pre-filled with an existing order's data (edit mode)
  const openEditDispatch = (d) => {
    setEditingId(d.id);
    setEditingLock(lockStateFor(d)); // stash the lock state for the form to use
    setOverriddenFields({}); // reset override flags per edit session
    setDraft({
      date: d.date || todayISO(),
      jobName: d.jobName || "",
      clientName: d.clientName || "",
      clientId: d.clientId || "",
      projectId: d.projectId || null,
      subContractor: d.subContractor || "",
      subContractorId: d.subContractorId || "",
      pickup: d.pickup || "",
      dropoff: d.dropoff || "",
      material: d.material || "",
      trucksExpected: d.trucksExpected || 1,
      ratePerHour: d.ratePerHour || "",
      ratePerTon: d.ratePerTon || "",
      ratePerLoad: d.ratePerLoad || "",
      quarryId: d.quarryId || null,
      notes: d.notes || "",
      assignedDriverIds: d.assignedDriverIds || [],
      assignments: d.assignments || [],
      lockOverrides: d.lockOverrides || [],
    });
    setShowNew(true);
  };

  const createDispatch = async () => {
    if (!draft.jobName) { onToast("JOB NAME REQUIRED"); return; }

    const assignedIds = draft.assignedDriverIds || [];
    const assignedNames = assignedIds.map((id) => {
      const c = contacts.find((x) => x.id === id);
      return c ? (c.companyName || c.contactName) : "";
    }).filter(Boolean);

    // Compute expected trucks from assignments (if any) else use manual input
    const assignments = (draft.assignments || []).filter((a) => a.contactId).map((a, idx) => ({
      ...a,
      aid: a.aid || `a${Date.now().toString(36).slice(-4)}${idx}`, // stable short ID
    }));

    // DOUBLE-ASSIGNMENT CHECK — warn if any driver is on another non-closed order
    // Check both individual driver assignments AND drivers-under-sub assignments
    const driverAssignmentIds = assignments
      .filter((a) => a.kind === "driver" && a.contactId)
      .map((a) => a.contactId);

    const conflicts = [];
    for (const driverId of driverAssignmentIds) {
      const otherOrders = dispatches.filter((d) => {
        if (editingId && d.id === editingId) return false; // skip this order if editing
        if (d.status === "closed") return false;
        return (d.assignments || []).some((a) => a.kind === "driver" && a.contactId === driverId);
      });
      if (otherOrders.length > 0) {
        const contact = contacts.find((c) => c.id === driverId);
        const driverName = contact?.companyName || contact?.contactName || "Driver";
        conflicts.push({
          driverName,
          orders: otherOrders.map((o) => ({ code: o.code, date: o.date, status: o.status })),
        });
      }
    }

    if (conflicts.length > 0) {
      const msgLines = conflicts.map((c) =>
        `⚠ ${c.driverName} is already on: ${c.orders.map((o) => `#${o.code} (${o.date})`).join(", ")}`
      );
      const proceed = confirm(
        `DRIVER DOUBLE-ASSIGNMENT DETECTED:\n\n${msgLines.join("\n\n")}\n\nAssign anyway?`
      );
      if (!proceed) return;
    }

    const assignmentsTrucks = assignments.reduce((s, a) => s + (Number(a.trucks) || 0), 0);
    const finalTrucksExpected = assignmentsTrucks > 0
      ? assignmentsTrucks
      : (Number(draft.trucksExpected) || 1);

    if (editingId) {
      // EDIT MODE — update existing order (keep its original code, createdAt, status)
      const existing = dispatches.find((x) => x.id === editingId);
      if (!existing) { onToast("ORDER NOT FOUND"); return; }
      const updated = {
        ...existing,
        ...draft,
        trucksExpected: finalTrucksExpected,
        assignedDriverIds: assignedIds,
        assignedDriverNames: assignedNames,
        assignments,
        lockOverrides: draft.lockOverrides || existing.lockOverrides || [],
        updatedAt: new Date().toISOString(),
        // Preserve: id, code, createdAt, status
        id: existing.id,
        code: existing.code,
        createdAt: existing.createdAt,
        status: existing.status,
      };
      const next = dispatches.map((d) => d.id === editingId ? updated : d);
      await setDispatches(next);
      setShowNew(false);
      setEditingId(null);
      resetDraft();
      onToast("ORDER UPDATED");
      return;
    }

    // CREATE MODE — new order
    const code = randomCode(6);
    const d = {
      ...draft,
      id: "temp-" + Date.now(),
      code,
      trucksExpected: finalTrucksExpected,
      assignedDriverIds: assignedIds,
      assignedDriverNames: assignedNames,
      assignments,
      createdAt: new Date().toISOString(),
      status: "open",
    };
    const next = [d, ...dispatches];
    await setDispatches(next);
    setShowNew(false);
    setTimeout(() => {
      const fresh = dispatches.find((x) => x.code === code);
      if (fresh) setActiveDispatch(fresh.id);
    }, 100);
    resetDraft();
    onToast("ORDER CREATED");

    // If order has assignments with contacts — open Send Links modal so admin can text/email the team
    if (assignments && assignments.length > 0 && assignments.some((a) => a.contactId)) {
      setSendLinksTarget(d);
    }
  };

  const removeDispatch = async (id) => {
    const d = dispatches.find((x) => x.id === id);
    if (!d) return;
    const childFbs = freightBills.filter((fb) => fb.dispatchId === id);
    const submittedFbs = childFbs.filter((fb) => (fb.status || "pending") !== "rejected");

    // STRICT CASCADE: block if any non-rejected FBs exist. Admin must delete/reject them first.
    if (submittedFbs.length > 0) {
      const invoicedCount = childFbs.filter((fb) => fb.invoiceId).length;
      const paidCount = childFbs.filter((fb) => fb.paidAt).length;
      const custPaidCount = childFbs.filter((fb) => fb.customerPaidAt).length;

      const lines = [
        `✗ Cannot delete Order #${d.code} (${d.jobName || "—"}).`,
        ``,
        `This order has ${submittedFbs.length} freight bill${submittedFbs.length !== 1 ? "s" : ""} attached:`,
      ];
      if (invoicedCount > 0) lines.push(`  • ${invoicedCount} on invoice${invoicedCount !== 1 ? "s" : ""} — remove from invoice first`);
      if (paidCount > 0)     lines.push(`  • ${paidCount} paid to sub/driver — unmark paid first`);
      if (custPaidCount > 0) lines.push(`  • ${custPaidCount} customer-paid — unmark payment first`);
      const unblockedCount = submittedFbs.length - invoicedCount - paidCount - custPaidCount;
      if (unblockedCount > 0) lines.push(`  • ${unblockedCount} freight bill${unblockedCount !== 1 ? "s" : ""} pending/approved — delete those first`);
      lines.push(``, `Go to the Review tab (or the order's FB list) to handle them, then try again.`);
      alert(lines.join("\n"));
      return;
    }

    // No FBs — safe to delete. Prompt for optional reason.
    if (!confirm(`Delete Order #${d.code} (${d.jobName || "—"})?\n\nThis is a SOFT delete. The order stays recoverable for 30 days in the Recovery tab.`)) return;
    const reason = prompt('Reason for deletion (optional):') || "";

    try {
      await deleteDispatch(id, { deletedBy: "admin", reason });
      const nextD = dispatches.filter((x) => x.id !== id);
      await setDispatches(nextD);
      onToast("ORDER DELETED (RECOVERABLE 30 DAYS)");
    } catch (e) {
      console.error("Soft delete failed:", e);
      alert("Delete failed: " + (e?.message || String(e)));
    }
  };

  const removeFreightBill = async (id) => {
    const fb = freightBills.find((x) => x.id === id);
    if (!fb) return;

    // STRICT CASCADE: block if FB has any downstream records
    const blockers = [];
    if (fb.invoiceId) {
      const inv = invoices.find((i) => i.id === fb.invoiceId);
      blockers.push(`• On invoice ${inv?.invoiceNumber || fb.invoiceId} — remove from that invoice first`);
    }
    if (fb.paidAt) {
      const amt = fb.paidAmount ? ` ($${Number(fb.paidAmount).toFixed(2)})` : "";
      blockers.push(`• Paid to sub/driver${amt} on ${new Date(fb.paidAt).toLocaleDateString()} — unmark paid first`);
    }
    if (fb.customerPaidAt) {
      blockers.push(`• Customer has paid this FB — unmark customer payment first`);
    }

    if (blockers.length > 0) {
      alert([
        `✗ Cannot delete FB#${fb.freightBillNumber || "—"}.`,
        ``,
        `This freight bill has downstream records:`,
        ...blockers,
        ``,
        `Clear these first, then try again.`,
      ].join("\n"));
      return;
    }

    if (!confirm(`Delete FB#${fb.freightBillNumber || "—"}?\n\nThis is a SOFT delete. The FB stays recoverable for 30 days in the Recovery tab.`)) return;
    const reason = prompt('Reason for deletion (optional):') || "";

    try {
      await deleteFreightBill(id, { deletedBy: "admin", reason });
      const next = freightBills.filter((x) => x.id !== id);
      await setFreightBills(next);
      onToast("FREIGHT BILL DELETED (RECOVERABLE 30 DAYS)");
    } catch (e) {
      console.error("Soft delete failed:", e);
      alert("Delete failed: " + (e?.message || String(e)));
    }
  };

  const toggleStatus = async (id) => {
    const next = dispatches.map((d) => d.id === id ? { ...d, status: d.status === "open" ? "closed" : (d.status === "sent" ? "closed" : "open") } : d);
    await setDispatches(next);
  };

  // Mark order as dispatched (status → sent)
  const markDispatched = async (id) => {
    const next = dispatches.map((d) => {
      if (d.id !== id) return d;
      if (d.status === "sent" || d.status === "closed") return d;
      return { ...d, status: "sent" };
    });
    await setDispatches(next);
    onToast("✓ MARKED AS DISPATCHED");

    // Offer to send team links after marking dispatched
    const dispatch = next.find((d) => d.id === id);
    if (dispatch?.assignments?.length > 0 && dispatch.assignments.some((a) => a.contactId)) {
      setSendLinksTarget(dispatch);
    }
  };

  // Reconciliation helpers
  const adjustNoShow = async (id, delta) => {
    const next = dispatches.map((d) => {
      if (d.id !== id) return d;
      const cur = Number(d.noShowCount) || 0;
      const expected = Number(d.trucksExpected) || 1;
      const submittedCount = freightBills.filter((fb) => fb.dispatchId === id).length;
      const newCount = Math.max(0, Math.min(expected - submittedCount, cur + delta));
      // If they change noShow, auto-clear any prior reconciliation stamp
      return { ...d, noShowCount: newCount, reconciledAt: null, reconciledBy: null };
    });
    await setDispatches(next);
  };

  const markReconciled = async (id) => {
    const next = dispatches.map((d) => {
      if (d.id !== id) return d;
      return { ...d, reconciledAt: new Date().toISOString(), reconciledBy: "admin" };
    });
    await setDispatches(next);
    onToast("✓ ORDER RECONCILED");
  };

  const unmarkReconciled = async (id) => {
    const next = dispatches.map((d) => {
      if (d.id !== id) return d;
      return { ...d, reconciledAt: null, reconciledBy: null };
    });
    await setDispatches(next);
  };

  // Compute the lock state for a dispatch
  // Returns { level, reason, hasApprovedFbs, hasInvoicedFbs }
  //   level: 0=draft (none), 1=sent (assignments locked), 2=approved (rate/material/job locked), 3=invoiced (full lock)
  const lockStateFor = (d) => {
    const bills = freightBills.filter((fb) => fb.dispatchId === d.id);
    const hasApprovedFbs = bills.some((fb) => fb.status === "approved");
    const hasInvoicedFbs = bills.some((fb) => fb.invoiceId);
    let level = 0;
    let reason = "";
    if (hasInvoicedFbs) { level = 3; reason = "FBs invoiced"; }
    else if (hasApprovedFbs) { level = 2; reason = "FBs approved"; }
    else if (d.status === "sent") { level = 1; reason = "Dispatched"; }
    else if (d.status === "closed") { level = 3; reason = "Order closed"; }
    return { level, reason, hasApprovedFbs, hasInvoicedFbs };
  };

  const copyLink = (code) => {
    const url = `${window.location.origin}${window.location.pathname}#/submit/${code}`;
    try { navigator.clipboard.writeText(url); onToast("LINK COPIED"); }
    catch { prompt("Copy this link:", url); }
  };

  // Build SMS/Email text with order details
  // For drivers (kind=driver): NO rate shown. For subs: include rate + method.
  const buildDispatchText = (dispatch, assignment = null) => {
    const url = assignment?.aid
      ? `${window.location.origin}${window.location.pathname}#/submit/${dispatch.code}/a/${assignment.aid}`
      : `${window.location.origin}${window.location.pathname}#/submit/${dispatch.code}`;

    const project = projects.find((p) => p.id === dispatch.projectId);
    const customer = contacts.find((c) => c.id === dispatch.clientId);
    const customerName = customer?.companyName || dispatch.clientName || "";
    const primeName = project?.primeContractor || "";

    const lines = [];
    lines.push(`${company?.name || "4 BROTHERS TRUCKING"} — ORDER #${dispatch.code}`);
    lines.push(`Date: ${dispatch.date || "TBD"}`);
    if (customerName) lines.push(`Customer: ${customerName}`);
    if (primeName) lines.push(`Prime: ${primeName}`);
    if (dispatch.jobName) lines.push(`Job: ${dispatch.jobName}`);
    if (dispatch.pickup) lines.push(`PICKUP: ${dispatch.pickup}`);
    if (dispatch.dropoff) lines.push(`DROPOFF: ${dispatch.dropoff}`);
    if (dispatch.material) lines.push(`Material: ${dispatch.material}`);

    // Per-truck start times (if any are set on this assignment)
    if (assignment?.startTimes?.length > 0) {
      const validTimes = assignment.startTimes.filter((r) => r && (r.time || r.location));
      if (validTimes.length > 0) {
        lines.push("");
        lines.push(`START TIME${validTimes.length > 1 ? "S" : ""}:`);
        validTimes.forEach((r, i) => {
          const tNum = i + 1;
          const tStr = r.time ? formatTime12h(r.time) : "TBD";
          const locStr = r.location ? ` at ${r.location}` : "";
          const label = validTimes.length > 1 ? `Truck ${tNum}: ` : "";
          lines.push(`${label}${tStr}${locStr}`);
        });
      }
    }

    // Rate section — SUBS ONLY (not individual drivers)
    if (assignment && assignment.kind === "sub" && assignment.payRate) {
      const method = assignment.payMethod || "hour";
      const methodLabel = method === "hour" ? "/hr" : method === "ton" ? "/ton" : "/load";
      const minH = project?.minimumHours;
      lines.push(`Rate: $${assignment.payRate}${methodLabel}${method === "hour" && minH ? ` (${minH}hr min)` : ""}`);
      if (assignment.trucks > 1) lines.push(`Trucks: ${assignment.trucks}`);
    }

    if (dispatch.notes) lines.push(`Notes: ${dispatch.notes}`);

    lines.push("");
    lines.push("Submit scale tickets here:");
    lines.push(url);

    return lines.join("\n");
  };

  // Copy the full dispatch text (with details) for a specific assignment
  const copyDispatchText = (dispatch, assignment = null) => {
    const text = buildDispatchText(dispatch, assignment);
    try { navigator.clipboard.writeText(text); onToast("TEXT COPIED — PASTE INTO SMS/EMAIL"); }
    catch { prompt("Copy this text:", text); }
  };

  // SMS intent — opens the phone's messaging app
  const smsDispatch = (dispatch, assignment, phone) => {
    if (!phone) { onToast("NO PHONE NUMBER"); return; }
    const text = buildDispatchText(dispatch, assignment);
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    const url = `sms:${cleanPhone}?&body=${encodeURIComponent(text)}`;
    window.location.href = url;
  };

  const fbForDispatch = (id) => freightBills.filter((fb) => fb.dispatchId === id);

  const filteredDispatches = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return dispatches;
    return dispatches.filter((d) => {
      if (d.jobName.toLowerCase().includes(s)) return true;
      if ((d.subContractor || "").toLowerCase().includes(s)) return true;
      if (d.code.toLowerCase().includes(s)) return true;
      const fbs = freightBills.filter((fb) => fb.dispatchId === d.id);
      if (fbs.some((fb) => (fb.freightBillNumber || "").toLowerCase().includes(s) || (fb.driverName || "").toLowerCase().includes(s) || (fb.truckNumber || "").toLowerCase().includes(s))) return true;
      return false;
    });
  }, [dispatches, freightBills, search]);

  // v18: group dispatches by day — key = YYYY-MM-DD of the "order date"
  // (order date is `date` field if present, else createdAt, else submittedAt).
  // Within each day, sort newest first. Days themselves are sorted newest first.
  const groupedByDay = useMemo(() => {
    const dayKey = (d) => {
      const ts = d.date || d.createdAt || d.submittedAt || new Date().toISOString();
      return (ts || "").slice(0, 10); // YYYY-MM-DD
    };
    const groups = {};
    filteredDispatches.forEach((d) => {
      const k = dayKey(d);
      if (!groups[k]) groups[k] = [];
      groups[k].push(d);
    });
    // Sort each day's orders: most-recently-created first
    Object.values(groups).forEach((arr) => {
      arr.sort((a, b) => (b.createdAt || b.submittedAt || "").localeCompare(a.createdAt || a.submittedAt || ""));
    });
    // Return as array of { date, orders }, newest day first
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map((k) => ({ date: k, orders: groups[k] }));
  }, [filteredDispatches]);

  // Human-friendly date label: "Today", "Yesterday", or "Mon, Apr 22, 2026"
  const dayLabel = (iso) => {
    if (!iso) return "—";
    const today = todayISO();
    const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
    if (iso === today) return "Today";
    if (iso === yesterday) return "Yesterday";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}><div className="stat-num">{dispatches.length}</div><div className="stat-label">Dispatches</div></div>
        <div className="fbt-card" style={{ padding: 20 }}><div className="stat-num">{dispatches.filter(d => d.status === "open").length}</div><div className="stat-label">Open</div></div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--hazard)" }}><div className="stat-num">{freightBills.length}</div><div className="stat-label">Freight Bills</div></div>
        <div className="fbt-card" style={{ padding: 20 }}><div className="stat-num">{freightBills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0).toFixed(1)}</div><div className="stat-label">Total Tons</div></div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search freight bill #, driver, truck, job, sub…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setEditingId(null); resetDraft(); setShowNew(true); }} className="btn-primary"><Plus size={16} /> NEW ORDER</button>
      </div>

      {/* Send Links modal — offered after order create / mark-dispatched */}
      {sendLinksTarget && (() => {
        // Find the order fresh each render so we pick up state changes
        const dispatch = dispatches.find((x) => x.id === sendLinksTarget.id) || sendLinksTarget;
        const assignmentsToNotify = (dispatch.assignments || []).filter((a) => a.contactId);
        const project = projects.find((p) => p.id === dispatch.projectId);
        const customer = contacts.find((c) => c.id === dispatch.clientId);

        return (
          <div className="modal-bg" onClick={() => setSendLinksTarget(null)} style={{ zIndex: 108 }}>
            <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
              <div style={{ padding: "16px 22px", background: "var(--good)", color: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em" }}>SEND DISPATCH TO TEAM</div>
                  <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>Order #{dispatch.code}</h3>
                  <div className="fbt-mono" style={{ fontSize: 10, opacity: 0.9, marginTop: 2 }}>
                    {dispatch.jobName} · {dispatch.date}
                  </div>
                </div>
                <button onClick={() => setSendLinksTarget(null)} style={{ background: "transparent", border: "none", color: "#FFF", cursor: "pointer" }}><X size={20} /></button>
              </div>

              <div style={{ padding: 18 }}>
                <div style={{ padding: 10, background: "#FEF3C7", border: "1px solid var(--hazard)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", marginBottom: 14, color: "var(--hazard-deep)", letterSpacing: "0.05em" }}>
                  ▸ TAP TEXT OR EMAIL BELOW TO SEND EACH DRIVER/SUB THEIR DISPATCH INFO · MESSAGE IS PRE-FILLED · YOU STILL TAP SEND
                </div>

                {assignmentsToNotify.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--concrete)" }}>
                    <AlertCircle size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                    <div className="fbt-mono" style={{ fontSize: 12 }}>NO ASSIGNMENTS WITH LINKED CONTACTS · ADD SUBS/DRIVERS TO THIS ORDER FIRST</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {assignmentsToNotify.map((a) => {
                      const contact = contacts.find((c) => c.id === a.contactId);
                      const text = buildDispatchText(dispatch, a);
                      const phone = contact?.phone || "";
                      const email = contact?.email || "";
                      const cleanPhone = phone.replace(/[^0-9+]/g, "");
                      const smsHref = cleanPhone ? `sms:${cleanPhone}?&body=${encodeURIComponent(text)}` : null;
                      const subject = `Dispatch — Order #${dispatch.code} · ${dispatch.date || ""}`;
                      const mailHref = email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` : null;

                      return (
                        <div key={a.aid} style={{ border: "1.5px solid var(--steel)", background: "#FFF", padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                            <div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                <span className="chip" style={{ background: a.kind === "driver" ? "#FFF" : "var(--hazard)", fontSize: 9, padding: "2px 7px" }}>
                                  {a.kind === "driver" ? "DRIVER" : "SUB"}
                                </span>
                                <div className="fbt-display" style={{ fontSize: 14 }}>{a.name}</div>
                              </div>
                              {(phone || email) && (
                                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 3 }}>
                                  {phone && `☎ ${phone}`}
                                  {phone && email && " · "}
                                  {email && `✉ ${email}`}
                                </div>
                              )}
                              {a.kind === "sub" && a.payRate && (
                                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", marginTop: 2 }}>
                                  Rate in text: ${a.payRate}/{a.payMethod || "hour"}
                                </div>
                              )}
                              {a.kind === "driver" && (
                                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                                  (rate NOT sent to drivers)
                                </div>
                              )}
                            </div>
                          </div>

                          {!phone && !email ? (
                            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--safety)", padding: 8, background: "#FEF2F2", border: "1px solid var(--safety)" }}>
                              ⚠ NO PHONE OR EMAIL ON FILE · ADD CONTACT INFO TO SEND
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {smsHref && (
                                <a
                                  href={smsHref}
                                  className="btn-primary"
                                  style={{ padding: "8px 14px", fontSize: 11, background: "var(--hazard)", color: "var(--steel)", borderColor: "var(--hazard-deep)", textDecoration: "none" }}
                                >
                                  <Send size={12} style={{ marginRight: 4 }} /> TEXT
                                </a>
                              )}
                              {mailHref && (
                                <a
                                  href={mailHref}
                                  className="btn-ghost"
                                  style={{ padding: "8px 14px", fontSize: 11, textDecoration: "none" }}
                                >
                                  <Mail size={12} style={{ marginRight: 4 }} /> EMAIL
                                </a>
                              )}
                              <button
                                className="btn-ghost"
                                style={{ padding: "8px 14px", fontSize: 11 }}
                                onClick={() => copyDispatchText(dispatch, a)}
                                title="Copy the dispatch text to paste anywhere"
                              >
                                <FileText size={12} style={{ marginRight: 4 }} /> COPY
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", alignSelf: "center" }}>
                    ▸ CLOSE WHEN FINISHED · YOU CAN RE-SEND ANYTIME FROM THE ORDER DETAIL
                  </div>
                  <button onClick={() => setSendLinksTarget(null)} className="btn-ghost">DONE</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Override lock modal */}
      {overrideTarget && (
        <div className="modal-bg" onClick={() => setOverrideTarget(null)} style={{ zIndex: 110 }}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ padding: "16px 22px", background: "var(--safety)", color: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em" }}>OVERRIDE LOCK</div>
                <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>{overrideTarget.label}</h3>
              </div>
              <button onClick={() => setOverrideTarget(null)} style={{ background: "transparent", border: "none", color: "#FFF", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 22 }}>
              <p style={{ fontSize: 13, lineHeight: 1.5, margin: "0 0 14px" }}>
                ⚠ This field is locked because <strong>{editingLock.reason}</strong>.
                Editing it may have downstream consequences (invoices, payroll).
              </p>
              <label className="fbt-label">Reason for Override *</label>
              <textarea
                id="override-reason-input"
                className="fbt-textarea"
                style={{ minHeight: 70 }}
                placeholder="e.g. Customer changed terms mid-job — rate adjusted per email 4/22"
                autoFocus
              />
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  className="btn-primary"
                  style={{ background: "var(--safety)", color: "#FFF", borderColor: "var(--safety)" }}
                  onClick={() => {
                    const val = document.getElementById("override-reason-input")?.value?.trim() || "";
                    if (!val) { onToast("REASON REQUIRED"); return; }
                    const entry = {
                      field: overrideTarget.field,
                      reason: val,
                      by: "admin",
                      at: new Date().toISOString(),
                    };
                    setOverriddenFields({ ...overriddenFields, [overrideTarget.field]: val });
                    setDraft((prev) => ({
                      ...prev,
                      lockOverrides: [...(prev.lockOverrides || []), entry],
                    }));
                    onToast(`🔓 ${overrideTarget.label} UNLOCKED`);
                    setOverrideTarget(null);
                  }}
                >
                  🔓 UNLOCK THIS FIELD
                </button>
                <button className="btn-ghost" onClick={() => setOverrideTarget(null)}>CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="modal-bg" onClick={() => { setShowNew(false); setEditingId(null); resetDraft(); }}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>{editingId ? "EDIT ORDER" : "NEW ORDER"}</h3>
              <button onClick={() => { setShowNew(false); setEditingId(null); resetDraft(); }} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
            </div>

            {/* Lock banner (only shown when editing a locked order) */}
            {editingId && editingLock.level > 0 && (() => {
              const lockedFieldList = [];
              if (editingLock.level >= 1) lockedFieldList.push("assignments (sub/driver/rate)");
              if (editingLock.level >= 2) lockedFieldList.push("material", "rate", "job");
              if (editingLock.level >= 3) lockedFieldList.push("ALL FIELDS");
              const bg = editingLock.level === 3 ? "var(--safety)" : editingLock.level === 2 ? "var(--hazard)" : "var(--concrete)";
              return (
                <div style={{ padding: "12px 24px", background: "#FEF2F2", borderBottom: "3px solid " + bg }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Lock size={16} style={{ color: bg }} />
                    <span className="fbt-mono" style={{ fontSize: 11, fontWeight: 700 }}>
                      {editingLock.level === 1 && "ORDER DISPATCHED"}
                      {editingLock.level === 2 && "FBs APPROVED ON THIS ORDER"}
                      {editingLock.level === 3 && (editingLock.hasInvoicedFbs ? "FBs INVOICED" : "ORDER COMPLETE")}
                      {" — LOCKED FIELDS: "}{lockedFieldList.join(", ").toUpperCase()}
                    </span>
                  </div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 6 }}>
                    ▸ CLICK 🔓 UNLOCK NEXT TO ANY LOCKED FIELD TO OVERRIDE WITH A REASON (AUDIT STAMPED)
                  </div>
                </div>
              );
            })()}
            <div style={{ padding: 24, display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                <div><label className="fbt-label">Date</label><input className="fbt-input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>
                <div><label className="fbt-label">Trucks Expected</label><input className="fbt-input" type="number" min="1" value={draft.trucksExpected} onChange={(e) => setDraft({ ...draft, trucksExpected: e.target.value })} /></div>
              </div>
              <div><label className="fbt-label">Job Name *<LockChip field="job" label="Job Name" /></label><input className="fbt-input" value={draft.jobName} onChange={(e) => setDraft({ ...draft, jobName: e.target.value })} placeholder="MCI #91684 — Salinas Stormwater Phase 2A" disabled={isFieldLocked("job")} /></div>
              <div>
                <label className="fbt-label">Customer (for tracking link & billing)</label>
                {contacts.filter((c) => c.type === "customer").length > 0 ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      className="fbt-select"
                      style={{ flex: 1, minWidth: 180 }}
                      value={draft.clientId || ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) { setDraft({ ...draft, clientId: "", clientName: "" }); return; }
                        const c = contacts.find((x) => String(x.id) === id);
                        if (c) setDraft({ ...draft, clientId: c.id, clientName: c.companyName || c.contactName });
                      }}
                    >
                      <option value="">— Choose customer —</option>
                      {contacts
                        .filter((c) => c.type === "customer")
                        .sort((a, b) => (a.favorite !== b.favorite ? (a.favorite ? -1 : 1) : 0))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.favorite ? "★ " : ""}{c.companyName || c.contactName}
                          </option>
                        ))}
                    </select>
                    <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>OR</span>
                    <input
                      className="fbt-input"
                      style={{ flex: 1, minWidth: 120 }}
                      value={draft.clientId ? "" : (draft.clientName || "")}
                      onChange={(e) => setDraft({ ...draft, clientName: e.target.value, clientId: "" })}
                      placeholder="Type new name"
                      disabled={!!draft.clientId}
                    />
                  </div>
                ) : (
                  <input className="fbt-input" value={draft.clientName || ""} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} placeholder="e.g. Mountain Cascade, Inc. — add as Customer in Contacts for dropdown" />
                )}
              </div>

              {/* Project dropdown — filtered by selected customer */}
              {(() => {
                const availableProjects = projects.filter((p) => {
                  if (p.status === "cancelled") return false;
                  if (draft.clientId) return p.customerId === Number(draft.clientId) || p.customerId === draft.clientId;
                  return true;
                });
                return (
                  <div>
                    <label className="fbt-label">
                      Project {draft.clientId && ` · ${availableProjects.length} for this customer`}
                    </label>
                    {availableProjects.length > 0 ? (
                      <select
                        className="fbt-select"
                        value={draft.projectId || ""}
                        onChange={(e) => {
                          const pid = e.target.value ? Number(e.target.value) : null;
                          const p = availableProjects.find((x) => x.id === pid);
                          const patch = { projectId: pid };
                          // Inherit project's default rate if order rate is still the default "142"
                          if (p?.defaultRate != null && p.defaultRate !== "" && (draft.ratePerHour === "142" || !draft.ratePerHour)) {
                            patch.ratePerHour = String(p.defaultRate);
                          }
                          setDraft({ ...draft, ...patch });
                        }}
                      >
                        <option value="">— No project / One-off job —</option>
                        {availableProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.contractNumber ? ` (${p.contractNumber})` : ""}{p.defaultRate ? ` · $${p.defaultRate}/hr` : ""}{p.minimumHours ? ` · ${p.minimumHours}hr min` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", padding: "8px 10px", border: "1px dashed var(--concrete)", background: "#F5F5F4" }}>
                        {draft.clientId ? "NO PROJECTS FOR THIS CUSTOMER YET — ADD ONE IN PROJECTS TAB" : "NO PROJECTS YET"}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* SUB-CONTRACTORS & DRIVERS (unified) */}
              <div style={{ borderTop: "2px dashed var(--concrete)", paddingTop: 14, position: "relative" }}>
                <label className="fbt-label">
                  Sub-Contractors & Drivers{draft.assignments?.length > 0 && ` · ${draft.assignments.length} ROW${draft.assignments.length !== 1 ? "S" : ""}`}
                  <LockChip field="assignments" label="Assignments" />
                </label>
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8 }}>
                  ▸ ADD EACH SUB AND/OR DRIVER WORKING THIS ORDER · DRIVER = 1 TRUCK · SUB = TRUCK COUNT YOU ENTER · DRIVER PAY RATE + TRUCK # AUTO-FILL FROM CONTACT
                </div>
                {/* Dimmed overlay if locked */}
                {isFieldLocked("assignments") && (
                  <div style={{
                    position: "absolute", top: 28, left: 0, right: 0, bottom: 0,
                    background: "rgba(245, 245, 244, 0.75)", pointerEvents: "auto",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 10, cursor: "not-allowed",
                  }}
                  onClick={() => openOverride("assignments", "Assignments")}
                  >
                    <div style={{ padding: 14, background: "#FFF", border: "2px solid var(--safety)", fontFamily: "JetBrains Mono, monospace", fontSize: 12, textAlign: "center" }}>
                      <Lock size={20} style={{ color: "var(--safety)", marginBottom: 6 }} />
                      <div style={{ fontWeight: 700, color: "var(--safety)" }}>ASSIGNMENTS LOCKED</div>
                      <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>CLICK TO OVERRIDE WITH REASON</div>
                    </div>
                  </div>
                )}
                {(draft.assignments || []).length > 0 && (
                  <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
                    {draft.assignments.map((a, idx) => {
                      const isDriver = a.kind === "driver";
                      const contactsOfKind = contacts.filter((c) => c.type === (isDriver ? "driver" : "sub"));
                      const selectedContact = a.contactId ? contacts.find((c) => c.id === a.contactId) : null;
                      const hasBrokerage = selectedContact?.brokerageApplies;
                      const brokeragePct = selectedContact?.brokeragePercent ?? 8;
                      return (
                        <div key={idx} style={{ padding: 10, border: "1.5px solid var(--steel)", background: "#FFF" }}>
                          {/* Row 1: kind / contact / trucks / delete */}
                          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px auto", gap: 8, alignItems: "center", marginBottom: 8 }}>
                            <select
                              className="fbt-select"
                              style={{ padding: "6px 8px", fontSize: 11 }}
                              value={a.kind}
                              onChange={(e) => {
                                const next = [...draft.assignments];
                                next[idx] = { ...next[idx], kind: e.target.value, contactId: null, name: "", trucks: e.target.value === "driver" ? 1 : next[idx].trucks || 1 };
                                setDraft({ ...draft, assignments: next });
                              }}
                            >
                              <option value="sub">Sub</option>
                              <option value="driver">Driver</option>
                            </select>
                            <select
                              className="fbt-select"
                              style={{ padding: "6px 8px", fontSize: 12 }}
                              value={a.contactId || ""}
                              onChange={(e) => {
                                const id = e.target.value;
                                const c = contactsOfKind.find((x) => String(x.id) === id);
                                const next = [...draft.assignments];
                                // Look up fleet unit assigned to this driver (sync'd from Fleet tab)
                                const fleetUnit = isDriver && c ? fleet.find((f) => f.driverId === c.id) : null;
                                const resolvedTruck = fleetUnit?.unit || c?.defaultTruckNumber || "";
                                // Auto-fill pay rate/method from contact default (both drivers AND subs)
                                // Only fill if the assignment field is empty
                                const autoFill = c ? {
                                  payRate: (next[idx].payRate === "" || next[idx].payRate == null) && c.defaultPayRate != null
                                    ? String(c.defaultPayRate) : next[idx].payRate,
                                  payMethod: (!next[idx].payMethod || next[idx].payMethod === "hour") && c.defaultPayMethod
                                    ? c.defaultPayMethod : (next[idx].payMethod || "hour"),
                                  truckNumber: isDriver && (!next[idx].truckNumber) && resolvedTruck
                                    ? resolvedTruck : next[idx].truckNumber,
                                } : {};
                                next[idx] = {
                                  ...next[idx],
                                  contactId: c?.id || null,
                                  name: c ? (c.companyName || c.contactName) : "",
                                  ...autoFill,
                                };
                                setDraft({ ...draft, assignments: next });
                              }}
                            >
                              <option value="">— Choose {isDriver ? "driver" : "sub"} —</option>
                              {contactsOfKind.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.favorite ? "★ " : ""}{c.companyName || c.contactName}{c.brokerageApplies ? ` (${c.brokeragePercent ?? 8}% brok)` : ""}
                                </option>
                              ))}
                            </select>
                            <input
                              className="fbt-input"
                              style={{ padding: "6px 8px", fontSize: 12 }}
                              type="number" min="1"
                              disabled={isDriver}
                              value={a.trucks || 1}
                              onChange={(e) => {
                                const next = [...draft.assignments];
                                next[idx] = { ...next[idx], trucks: Number(e.target.value) || 1 };
                                setDraft({ ...draft, assignments: next });
                              }}
                              title={isDriver ? "Drivers always = 1 truck" : "Truck count for this sub"}
                            />
                            <button
                              onClick={() => setDraft({ ...draft, assignments: draft.assignments.filter((_, i) => i !== idx) })}
                              className="btn-danger"
                              style={{ padding: "6px 10px", fontSize: 11 }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Row 2: pay method + pay rate + brokerage indicator */}
                          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center" }}>
                            <select
                              className="fbt-select"
                              style={{ padding: "5px 8px", fontSize: 11 }}
                              value={a.payMethod || "hour"}
                              onChange={(e) => {
                                const next = [...draft.assignments];
                                next[idx] = { ...next[idx], payMethod: e.target.value };
                                setDraft({ ...draft, assignments: next });
                              }}
                              title="How you pay this sub/driver"
                            >
                              <option value="hour">PAY $/hr</option>
                              <option value="ton">PAY $/ton</option>
                              <option value="load">PAY $/load</option>
                            </select>
                            <input
                              className="fbt-input"
                              type="number"
                              step="0.01"
                              placeholder="Pay rate (e.g. 135)"
                              style={{ padding: "5px 8px", fontSize: 12 }}
                              value={a.payRate || ""}
                              onChange={(e) => {
                                const next = [...draft.assignments];
                                next[idx] = { ...next[idx], payRate: e.target.value };
                                setDraft({ ...draft, assignments: next });
                              }}
                            />
                            {hasBrokerage ? (
                              <span
                                className="chip"
                                style={{ background: "var(--hazard)", fontSize: 9, padding: "3px 8px", whiteSpace: "nowrap" }}
                                title="Brokerage will be deducted when paying"
                              >
                                − {brokeragePct}% BROK
                              </span>
                            ) : (
                              <span
                                className="fbt-mono"
                                style={{ fontSize: 9, color: "var(--concrete)", whiteSpace: "nowrap" }}
                              >
                                {selectedContact ? "NO BROK" : ""}
                              </span>
                            )}
                          </div>

                          {/* Row 3: Per-truck start times + locations */}
                          {(() => {
                            const truckCount = Math.max(1, Number(a.trucks) || 1);
                            const startTimes = Array.isArray(a.startTimes) ? a.startTimes : [];
                            // Ensure array matches trucks count (add blanks if more trucks)
                            const displayRows = Array.from({ length: truckCount }, (_, i) => startTimes[i] || { time: "", location: "" });
                            return (
                              <div style={{ marginTop: 8, padding: 8, background: "#FAFAF9", border: "1px dashed var(--concrete)" }}>
                                <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>
                                  ▸ START TIMES · {truckCount} TRUCK{truckCount !== 1 ? "S" : ""} (INCLUDED IN DISPATCH TEXT)
                                </div>
                                <div style={{ display: "grid", gap: 4 }}>
                                  {displayRows.map((row, tIdx) => (
                                    <div key={tIdx} style={{ display: "grid", gridTemplateColumns: "50px 100px 1fr", gap: 6, alignItems: "center" }}>
                                      <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
                                        TRUCK {tIdx + 1}
                                      </span>
                                      <input
                                        className="fbt-input"
                                        type="time"
                                        style={{ padding: "4px 6px", fontSize: 11 }}
                                        value={row.time || ""}
                                        onChange={(e) => {
                                          const next = [...draft.assignments];
                                          const newTimes = Array.from({ length: truckCount }, (_, i) => startTimes[i] || { time: "", location: "" });
                                          newTimes[tIdx] = { ...newTimes[tIdx], time: e.target.value };
                                          next[idx] = { ...next[idx], startTimes: newTimes };
                                          setDraft({ ...draft, assignments: next });
                                        }}
                                      />
                                      <input
                                        className="fbt-input"
                                        type="text"
                                        placeholder="Location / note (e.g. at Vulcan Napa)"
                                        style={{ padding: "4px 8px", fontSize: 11 }}
                                        value={row.location || ""}
                                        onChange={(e) => {
                                          const next = [...draft.assignments];
                                          const newTimes = Array.from({ length: truckCount }, (_, i) => startTimes[i] || { time: "", location: "" });
                                          newTimes[tIdx] = { ...newTimes[tIdx], location: e.target.value };
                                          next[idx] = { ...next[idx], startTimes: newTimes };
                                          setDraft({ ...draft, assignments: next });
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setDraft({ ...draft, assignments: [...(draft.assignments || []), { kind: "sub", contactId: null, name: "", trucks: 1, payMethod: "hour", payRate: "" }] })}
                  style={{ padding: "6px 12px", fontSize: 11 }}
                >
                  <Plus size={12} style={{ marginRight: 4 }} /> ADD SUB / DRIVER
                </button>

                {/* Total trucks calculation */}
                {(draft.assignments || []).length > 0 && (
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", marginTop: 8, fontWeight: 700 }}>
                    ▸ TOTAL EXPECTED TRUCKS/FBs FROM ASSIGNMENTS: {draft.assignments.reduce((s, a) => s + (Number(a.trucks) || 0), 0)}
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                <div><label className="fbt-label">Pickup</label><input className="fbt-input" value={draft.pickup} onChange={(e) => setDraft({ ...draft, pickup: e.target.value })} /></div>
                <div><label className="fbt-label">Dropoff</label><input className="fbt-input" value={draft.dropoff} onChange={(e) => setDraft({ ...draft, dropoff: e.target.value })} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
                <div>
                  <label className="fbt-label">Material<LockChip field="material" label="Material" /></label>
                  <input className="fbt-input" value={draft.material} onChange={(e) => setDraft({ ...draft, material: e.target.value })} disabled={isFieldLocked("material")} />
                </div>
              </div>

              {/* CUSTOMER BILL RATE — what we charge the customer. Sub/driver pay rate is set per-assignment below. */}
              <div style={{ padding: 10, background: "#F0F9FF", border: "2px solid #0EA5E9", marginTop: 4 }}>
                <div className="fbt-mono" style={{ fontSize: 10, color: "#0369A1", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>
                  ▸ CUSTOMER BILL RATE · FILL AT LEAST ONE {draft.projectId ? "(AUTO-FILLED FROM PROJECT DEFAULT WHERE APPLICABLE)" : ""}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  <div>
                    <label className="fbt-label">Bill $/hr<LockChip field="rate" label="Hourly Bill Rate" /></label>
                    <input className="fbt-input" type="number" step="0.01" value={draft.ratePerHour} onChange={(e) => setDraft({ ...draft, ratePerHour: e.target.value })} disabled={isFieldLocked("rate")} placeholder="e.g. 142.00" />
                  </div>
                  <div>
                    <label className="fbt-label">Bill $/ton<LockChip field="rate" label="Per-Ton Bill Rate" /></label>
                    <input className="fbt-input" type="number" step="0.01" value={draft.ratePerTon} onChange={(e) => setDraft({ ...draft, ratePerTon: e.target.value })} disabled={isFieldLocked("rate")} placeholder="e.g. 14.50" />
                  </div>
                  <div>
                    <label className="fbt-label">Bill $/load<LockChip field="rate" label="Per-Load Bill Rate" /></label>
                    <input className="fbt-input" type="number" step="0.01" value={draft.ratePerLoad} onChange={(e) => setDraft({ ...draft, ratePerLoad: e.target.value })} disabled={isFieldLocked("rate")} placeholder="e.g. 450.00" />
                  </div>
                </div>
                <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginTop: 6, letterSpacing: "0.05em" }}>
                  ▸ SUB/DRIVER PAY RATE IS SET PER-ASSIGNMENT BELOW (SEPARATE FROM WHAT WE BILL CUSTOMER)
                </div>
              </div>
              {quarries.length > 0 && (
                <div>
                  <label className="fbt-label">Sourced From (Quarry)</label>
                  <select
                    className="fbt-select"
                    value={draft.quarryId || ""}
                    onChange={(e) => setDraft({ ...draft, quarryId: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">— Not specified —</option>
                    {quarries.map((q) => (
                      <option key={q.id} value={q.id}>{q.name}{q.address ? ` · ${q.address}` : ""}</option>
                    ))}
                  </select>
                </div>
              )}
              <div><label className="fbt-label">Notes</label><textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button onClick={createDispatch} className="btn-primary"><CheckCircle2 size={16} /> {editingId ? "SAVE CHANGES" : "CREATE & GET LINK"}</button>
                <button onClick={() => { setShowNew(false); setEditingId(null); resetDraft(); }} className="btn-ghost">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text queue modal */}
      {textQueue && (
        <div className="modal-bg" onClick={() => setTextQueue(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)" }}>TEXT QUEUE</div>
                <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>SEND {textQueue.list.length} TEXT{textQueue.list.length !== 1 ? "S" : ""}</h3>
              </div>
              <button onClick={() => setTextQueue(null)} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 12, lineHeight: 1.5 }}>
                ▸ TAP EACH BUTTON BELOW TO OPEN THAT TEXT. YOUR PHONE WILL PRE-FILL THE MESSAGE — JUST HIT SEND AND COME BACK HERE.
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {textQueue.list.map((item, idx) => {
                  const isSent = textQueue.sent[idx];
                  return (
                    <a
                      key={idx}
                      href={item.smsLink}
                      onClick={() => {
                        setTextQueue((q) => {
                          if (!q) return q;
                          const newSent = [...q.sent];
                          newSent[idx] = true;
                          return { ...q, sent: newSent };
                        });
                      }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 14px",
                        background: isSent ? "#F0FDF4" : "var(--cream)",
                        border: "2px solid " + (isSent ? "var(--good)" : "var(--steel)"),
                        textDecoration: "none",
                        color: "var(--steel)",
                        fontSize: 13,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>
                          {isSent && <CheckCircle2 size={13} style={{ color: "var(--good)", marginRight: 6, verticalAlign: "middle" }} />}
                          {item.name}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>{item.phone}</div>
                      </div>
                      <div style={{ background: isSent ? "var(--good)" : "var(--hazard)", color: isSent ? "#FFF" : "var(--steel)", padding: "6px 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>
                        {isSent ? "SENT ✓" : <><MessageSquare size={11} style={{ marginRight: 4, verticalAlign: "middle" }} /> TAP TO SEND</>}
                      </div>
                    </a>
                  );
                })}
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "space-between" }}>
                <button
                  onClick={() => setTextQueue((q) => q ? { ...q, sent: q.sent.map(() => false) } : q)}
                  className="btn-ghost"
                  style={{ fontSize: 10, padding: "6px 12px" }}
                >
                  <RefreshCw size={11} style={{ marginRight: 3 }} /> RESET
                </button>
                <button onClick={() => setTextQueue(null)} className="btn-primary" style={{ fontSize: 11 }}>
                  DONE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeDispatch && (() => {
        const d = dispatches.find((x) => x.id === activeDispatch);
        if (!d) return null;
        const bills = fbForDispatch(d.id);
        const shareUrl = `${window.location.origin}${window.location.pathname}#/submit/${d.code}`;
        return (
          <div className="modal-bg" onClick={() => setActiveDispatch(null)}>
            <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
              <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.1em" }}>ORDER #{d.code}</div>
                  <h3 className="fbt-display" style={{ fontSize: 22, margin: "4px 0 0" }}>{d.jobName}</h3>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => { setActiveDispatch(null); openEditDispatch(d); }}
                    className="btn-ghost"
                    style={{ padding: "6px 12px", fontSize: 11, color: "var(--cream)", borderColor: "var(--cream)" }}
                  >
                    <Edit2 size={12} style={{ marginRight: 4 }} /> EDIT ORDER
                  </button>
                  <button onClick={() => setActiveDispatch(null)} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
                </div>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ background: "#FEF3C7", border: "2px solid var(--hazard)", padding: 16, marginBottom: 20 }}>
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ MASTER LINK (ANYONE CAN UPLOAD)</div>
                  <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <QRCodeBlock url={shareUrl} size={150} label={`order-${d.code}`} onToast={onToast} />
                    <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 4 }}>▸ LINK</div>
                        <code style={{ display: "block", padding: "8px 12px", background: "#FFF", border: "1px solid var(--steel)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all" }}>{shareUrl}</code>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn-primary" onClick={() => copyLink(d.code)} style={{ padding: "8px 16px", fontSize: 11 }}><Share2 size={12} /> COPY LINK</button>
                        <button
                          className="btn-primary"
                          onClick={() => copyDispatchText(d)}
                          style={{ padding: "8px 16px", fontSize: 11, background: "var(--good)", borderColor: "var(--good)", color: "#FFF" }}
                          title="Copy full dispatch text with job details"
                        >
                          <Mail size={12} /> COPY TEXT
                        </button>
                        <button className="btn-ghost" onClick={() => printDriverSheet(d, shareUrl, onToast)} style={{ padding: "8px 16px", fontSize: 11 }}><Printer size={12} style={{ marginRight: 4 }} /> PRINT SHEET</button>
                      </div>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", lineHeight: 1.5, marginTop: 4 }}>
                        ▸ MASTER LINK — SHARE WITH THE FIELD, OR USE PER-ASSIGNMENT SUBLINKS BELOW FOR INDIVIDUAL TRACKING.
                      </div>
                    </div>
                  </div>
                </div>

                {/* PER-ASSIGNMENT SUBLINKS */}
                {(d.assignments || []).length > 0 && (() => {
                  const origin = `${window.location.origin}${window.location.pathname}`;
                  // Build all assignment sublink details
                  const assignmentRows = (d.assignments || []).map((a) => {
                    const aFbs = bills.filter((fb) => fb.assignmentId === a.aid);
                    const expected = Number(a.trucks) || 1;
                    const submitted = aFbs.length;
                    const subUrl = `${origin}#/submit/${d.code}/a/${a.aid}`;
                    const contact = contacts.find((c) => c.id === a.contactId);
                    const statusKey = submitted === 0 ? "pending" : submitted >= expected ? "complete" : "in_progress";
                    const statusLabel = submitted === 0 ? "PENDING" : submitted >= expected ? "COMPLETE" : "IN PROGRESS";
                    const statusBg = { pending: "var(--concrete)", in_progress: "var(--hazard)", complete: "var(--good)" }[statusKey];
                    const msg = `Hi ${a.name} — upload your freight bill${expected > 1 ? "s" : ""} for job "${d.jobName}" (${fmtDate(d.date)}) here: ${subUrl}`;
                    const subject = `Order #${d.code} — ${d.jobName}`;
                    const smsLink = contact?.phone ? buildSMSLink(contact.phone, msg) : null;
                    const emailLink = contact?.email ? buildEmailLink(contact.email, subject, msg) : null;
                    return { a, contact, subUrl, expected, submitted, statusLabel, statusBg, smsLink, emailLink, msg };
                  });

                  return (
                    <div style={{ background: "#FFF", border: "2px solid var(--steel)", padding: 16, marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em" }}>
                          ▸ PER-ASSIGNMENT LINKS ({assignmentRows.length})
                        </div>
                        {/* Send to All button */}
                        <button
                          className="btn-ghost"
                          style={{ padding: "6px 12px", fontSize: 10 }}
                          onClick={() => {
                            const textable = assignmentRows.filter((r) => r.smsLink).map((r) => ({
                              name: r.a.name,
                              smsLink: r.smsLink,
                              phone: r.contact?.phone || "",
                            }));
                            if (textable.length === 0) { onToast("NO CONTACTS HAVE PHONE NUMBERS"); return; }
                            setTextQueue({ list: textable, sent: textable.map(() => false) });
                          }}
                          title="Open a queue to text each sublink one tap at a time"
                        >
                          <MessageSquare size={12} style={{ marginRight: 4 }} /> TEXT ALL
                        </button>
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        {assignmentRows.map(({ a, contact, subUrl, expected, submitted, statusLabel, statusBg, smsLink, emailLink }) => (
                          <div key={a.aid} style={{ padding: 12, border: "1.5px solid var(--steel)", background: "var(--cream)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                                  <span className="chip" style={{ background: a.kind === "driver" ? "#FFF" : "var(--hazard)", fontSize: 9, padding: "2px 8px" }}>
                                    {a.kind === "driver" ? "DRIVER" : "SUB"}
                                  </span>
                                  <span className="chip" style={{ background: statusBg, color: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                                    {statusLabel} · {submitted}/{expected}
                                  </span>
                                </div>
                                <div className="fbt-display" style={{ fontSize: 15, lineHeight: 1.15 }}>{a.name}</div>
                                {contact && (
                                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                                    {contact.phone && `☎ ${contact.phone}`}
                                    {contact.phone && contact.email && " · "}
                                    {contact.email && `✉ ${contact.email}`}
                                  </div>
                                )}
                                {/* Start times summary */}
                                {a.startTimes?.length > 0 && a.startTimes.some((r) => r && (r.time || r.location)) && (
                                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard-deep)", marginTop: 4, fontWeight: 700 }}>
                                    ▸ START: {a.startTimes
                                      .filter((r) => r && (r.time || r.location))
                                      .map((r, i) => {
                                        const t = r.time ? formatTime12h(r.time) : "TBD";
                                        const loc = r.location ? ` @ ${r.location}` : "";
                                        return `${t}${loc}`;
                                      })
                                      .join(" · ")}
                                  </div>
                                )}
                              </div>
                            </div>
                            <code style={{ display: "block", padding: "6px 10px", background: "#FFF", border: "1px solid var(--steel)", fontSize: 10, fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all", marginBottom: 8 }}>
                              {subUrl}
                            </code>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button
                                className="btn-ghost"
                                style={{ padding: "5px 10px", fontSize: 10 }}
                                onClick={async () => {
                                  try { await navigator.clipboard.writeText(subUrl); onToast("SUBLINK COPIED"); }
                                  catch { onToast("COPY FAILED"); }
                                }}
                              >
                                <Link2 size={11} style={{ marginRight: 3 }} /> COPY
                              </button>
                              <button
                                className="btn-ghost"
                                style={{ padding: "5px 10px", fontSize: 10, background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}
                                onClick={() => copyDispatchText(d, a)}
                                title="Copy the full dispatch text (customer, pickup, dropoff, material, rate) ready to paste into SMS/email"
                              >
                                <FileText size={11} style={{ marginRight: 3 }} /> COPY TEXT
                              </button>
                              {contact?.phone && (
                                <button
                                  className="btn-ghost"
                                  style={{ padding: "5px 10px", fontSize: 10, background: "var(--hazard)", color: "var(--steel)", borderColor: "var(--hazard-deep)" }}
                                  onClick={() => smsDispatch(d, a, contact.phone)}
                                  title="Open phone's messaging app pre-filled with dispatch details"
                                >
                                  <Send size={11} style={{ marginRight: 3 }} /> SMS w/ DETAILS
                                </button>
                              )}
                              {smsLink && (
                                <a href={smsLink} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10, textDecoration: "none" }}>
                                  <MessageSquare size={11} style={{ marginRight: 3 }} /> TEXT (LINK ONLY)
                                </a>
                              )}
                              {emailLink && (
                                <a href={emailLink} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10, textDecoration: "none" }}>
                                  <Mail size={11} style={{ marginRight: 3 }} /> EMAIL
                                </a>
                              )}
                              {!contact && (
                                <span className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", padding: "6px 4px" }}>
                                  (Add contact to enable TEXT/EMAIL)
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Client tracking links */}
                <div style={{ background: "#FFF", border: "2px solid var(--steel)", padding: 16, marginBottom: 20 }}>
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ CLIENT TRACKING LINKS (SEND TO CUSTOMER)</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {/* Per-dispatch tracking link */}
                    <div>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 4 }}>▸ THIS JOB ONLY</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <code style={{ flex: 1, padding: "6px 10px", background: "var(--cream)", border: "1px solid var(--steel)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all" }}>
                          {`${window.location.origin}${window.location.pathname}#/track/${d.code}`}
                        </code>
                        <button
                          className="btn-ghost"
                          style={{ padding: "6px 12px", fontSize: 10 }}
                          onClick={() => {
                            const url = `${window.location.origin}${window.location.pathname}#/track/${d.code}`;
                            try { navigator.clipboard.writeText(url); onToast("LINK COPIED"); } catch { prompt("Copy this link:", url); }
                          }}
                        >
                          <Link2 size={11} style={{ marginRight: 4 }} /> COPY
                        </button>
                      </div>
                    </div>
                    {/* Per-client tracking link */}
                    {(d.clientName || d.subContractor) && (() => {
                      const ct = clientToken(d.clientName || d.subContractor);
                      if (!ct) return null;
                      return (
                        <div>
                          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 4 }}>
                            ▸ ALL JOBS FOR {(d.clientName || d.subContractor).toUpperCase()}
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <code style={{ flex: 1, padding: "6px 10px", background: "var(--cream)", border: "1px solid var(--steel)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all" }}>
                              {`${window.location.origin}${window.location.pathname}#/client/${ct}`}
                            </code>
                            <button
                              className="btn-ghost"
                              style={{ padding: "6px 12px", fontSize: 10 }}
                              onClick={() => {
                                const url = `${window.location.origin}${window.location.pathname}#/client/${ct}`;
                                try { navigator.clipboard.writeText(url); onToast("CLIENT LINK COPIED"); } catch { prompt("Copy this link:", url); }
                              }}
                            >
                              <Link2 size={11} style={{ marginRight: 4 }} /> COPY
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", lineHeight: 1.5, marginTop: 10 }}>
                    ▸ CLIENT TRACKING PAGES SHOW JOB PROGRESS, TONNAGE, AND SCALE TICKETS · NO LOGIN REQUIRED
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, fontSize: 13, fontFamily: "JetBrains Mono, monospace", marginBottom: 20 }}>
                  <div><strong>DATE:</strong> {fmtDate(d.date)}</div>
                  <div><strong>CLIENT:</strong> {d.clientName || "—"}</div>
                  <div><strong>SUB:</strong> {d.subContractor || "internal"}</div>
                  <div><strong>PICKUP:</strong> {d.pickup || "—"}</div>
                  <div><strong>DROPOFF:</strong> {d.dropoff || "—"}</div>
                  <div><strong>TRUCKS:</strong> {bills.length} / {d.trucksExpected}</div>
                  <div>
                    <strong>STATUS:</strong>{" "}
                    {(() => {
                      const status = d.status === "closed" ? "complete" : d.status === "sent" ? "sent" : "draft";
                      const color = status === "complete" ? "var(--concrete)" : status === "sent" ? "var(--hazard)" : "var(--good)";
                      return <span style={{ color, fontWeight: 700 }}>● {status.toUpperCase()}</span>;
                    })()}
                  </div>
                </div>

                {/* Lock badge */}
                {(() => {
                  const lock = lockStateFor(d);
                  if (lock.level === 0) return null;
                  const bg = lock.level === 3 ? "var(--safety)" : lock.level === 2 ? "var(--hazard)" : "var(--concrete)";
                  return (
                    <div style={{ padding: 10, background: "#FEF2F2", border: "2px solid " + bg, marginBottom: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <Lock size={16} style={{ color: bg }} />
                      <span className="fbt-mono" style={{ fontSize: 11, fontWeight: 700 }}>
                        {lock.level === 1 && "DISPATCHED — ASSIGNMENTS LOCKED"}
                        {lock.level === 2 && "FBs APPROVED — RATE / MATERIAL / JOB LOCKED"}
                        {lock.level === 3 && (lock.hasInvoicedFbs ? "FBs INVOICED — FULLY LOCKED" : "ORDER CLOSED")}
                      </span>
                      <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginLeft: "auto" }}>
                        {lock.reason} · edit via override button below
                      </span>
                    </div>
                  );
                })()}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                  {/* Mark dispatched — only for draft/open */}
                  {(d.status === "open" || !d.status || d.status === "draft") && (
                    <button
                      className="btn-primary"
                      style={{ background: "var(--hazard)", color: "var(--steel)", borderColor: "var(--hazard-deep)" }}
                      onClick={async () => {
                        if (!confirm(`Mark Order #${d.code} as DISPATCHED?\n\nThis locks the driver/sub assignments. You can still override later if needed.`)) return;
                        await markDispatched(d.id);
                      }}
                    >
                      <Send size={14} /> MARK AS DISPATCHED
                    </button>
                  )}
                  <button className="btn-ghost" onClick={() => toggleStatus(d.id)}>
                    {d.status === "closed" ? "REOPEN" : "CLOSE / COMPLETE"}
                  </button>
                </div>

                {/* Reconciliation panel — shows when submitted < expected or when tracking no-shows */}
                {(() => {
                  const submittedCount = bills.length;
                  const expected = Number(d.trucksExpected) || 1;
                  const noShow = Number(d.noShowCount) || 0;
                  const resolved = submittedCount + noShow;
                  const unresolved = expected - resolved;
                  const mathBalances = unresolved === 0;
                  const isReconciled = !!d.reconciledAt;

                  // Don't show panel if nothing's outstanding and not reconciled
                  if (submittedCount >= expected && noShow === 0 && !isReconciled) return null;

                  return (
                    <div style={{
                      padding: 14,
                      background: isReconciled ? "#F0FDF4" : (mathBalances ? "#FEF3C7" : "#FEE2E2"),
                      border: "2px solid " + (isReconciled ? "var(--good)" : mathBalances ? "var(--hazard)" : "var(--safety)"),
                      marginBottom: 20,
                    }}>
                      <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700, color: isReconciled ? "var(--good)" : mathBalances ? "var(--hazard-deep)" : "var(--safety)" }}>
                        {isReconciled ? "✓ ORDER RECONCILED" : mathBalances ? "▸ READY TO RECONCILE" : "▸ TRUCKS NEED RESOLUTION"}
                      </div>
                      <div style={{ fontSize: 13, fontFamily: "JetBrains Mono, monospace", marginBottom: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
                        <div><strong>EXPECTED:</strong> {expected}</div>
                        <div><strong>SUBMITTED:</strong> {submittedCount}</div>
                        <div><strong>NO-SHOW:</strong> {noShow}</div>
                        <div style={{ color: mathBalances ? "var(--good)" : "var(--safety)", fontWeight: 700 }}>
                          <strong>UNRESOLVED:</strong> {unresolved}
                        </div>
                      </div>
                      {isReconciled ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
                            Reconciled by {d.reconciledBy} on {new Date(d.reconciledAt).toLocaleDateString()}
                          </div>
                          <button
                            onClick={() => { if (confirm("Un-reconcile this order? You'll be able to edit no-show count again.")) unmarkReconciled(d.id); }}
                            className="btn-ghost"
                            style={{ padding: "4px 10px", fontSize: 10, marginLeft: "auto" }}
                          >
                            UN-RECONCILE
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <button
                            onClick={() => adjustNoShow(d.id, 1)}
                            className="btn-ghost"
                            style={{ padding: "6px 12px", fontSize: 11, background: "#FFF" }}
                            disabled={unresolved <= 0}
                            title="Mark one expected truck as a no-show"
                          >
                            + NO-SHOW
                          </button>
                          <button
                            onClick={() => adjustNoShow(d.id, -1)}
                            className="btn-ghost"
                            style={{ padding: "6px 12px", fontSize: 11, background: "#FFF" }}
                            disabled={noShow <= 0}
                          >
                            − NO-SHOW
                          </button>
                          <button
                            onClick={() => markReconciled(d.id)}
                            className="btn-primary"
                            style={{ padding: "6px 14px", fontSize: 11, marginLeft: "auto", background: mathBalances ? "var(--good)" : "var(--concrete)", borderColor: mathBalances ? "var(--good)" : "var(--concrete)", color: "#FFF", opacity: mathBalances ? 1 : 0.5, cursor: mathBalances ? "pointer" : "not-allowed" }}
                            disabled={!mathBalances}
                            title={mathBalances ? "Confirm all trucks are accounted for — ready to invoice" : "Resolve all unresolved trucks first"}
                          >
                            ✓ MARK RECONCILED
                          </button>
                        </div>
                      )}
                      {!isReconciled && !mathBalances && (
                        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8 }}>
                          ▸ WAITING ON {unresolved} MORE FB{unresolved !== 1 ? "S" : ""} OR MARK THEM AS NO-SHOW
                        </div>
                      )}
                      {!isReconciled && mathBalances && (
                        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", marginTop: 8 }}>
                          ▸ ALL TRUCKS ACCOUNTED FOR · CLICK MARK RECONCILED TO ENABLE INVOICING
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ SUBMITTED FREIGHT BILLS ({bills.length})</div>
                {bills.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", border: "2px dashed var(--concrete)", color: "var(--concrete)" }}>
                    <FileText size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                    <div className="fbt-mono" style={{ fontSize: 12 }}>NO FREIGHT BILLS YET</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>Share the upload link with the driver/sub.</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {bills.map((fb) => (
                      <div key={fb.id} style={{ border: "2px solid var(--steel)", background: "#FFF" }}>
                        <div style={{ padding: "12px 16px", background: "#FEF3C7", borderBottom: "2px solid var(--steel)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div className="fbt-display" style={{ fontSize: 18 }}>FB #{fb.freightBillNumber}</div>
                            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{fmtDateTime(fb.submittedAt)}</div>
                          </div>
                          <button className="btn-danger" onClick={() => removeFreightBill(fb.id)}><Trash2 size={12} /></button>
                        </div>
                        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                          <div><strong>DRIVER:</strong> {fb.driverName}</div>
                          <div><strong>TRUCK:</strong> {fb.truckNumber}</div>
                          {fb.material && <div><strong>MAT:</strong> {fb.material}</div>}
                          {fb.tonnage && <div><strong>TONS:</strong> {fb.tonnage}</div>}
                          {fb.loadCount && <div><strong>LOADS:</strong> {fb.loadCount}</div>}
                          {fb.pickupTime && <div><strong>PU:</strong> {fb.pickupTime}</div>}
                          {fb.dropoffTime && <div><strong>DO:</strong> {fb.dropoffTime}</div>}
                        </div>
                        {fb.notes && <div style={{ margin: "0 16px 14px", padding: 10, background: "#F5F5F4", fontSize: 12, borderLeft: "3px solid var(--hazard)" }}>{fb.notes}</div>}
                        {fb.photos && fb.photos.length > 0 && (
                          <div style={{ padding: "0 16px 16px" }}>
                            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ {fb.photos.length} ATTACHMENT{fb.photos.length !== 1 ? "S" : ""}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {fb.photos.map((p) => <img key={p.id} src={p.dataUrl} className="thumb" alt={p.name || "ticket"} onClick={() => setLightbox(p.dataUrl)} />)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {filteredDispatches.length === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <ClipboardList size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>{search ? "NO MATCHES FOR THAT SEARCH" : "NO DISPATCHES YET — CREATE ONE ABOVE"}</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 28 }}>
          {groupedByDay.map((group) => (
            <div key={group.date}>
              {/* Day header */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10, paddingBottom: 8, borderBottom: "2px solid var(--steel)" }}>
                <Calendar size={16} style={{ color: "var(--hazard-deep)" }} />
                <h3 className="fbt-display" style={{ fontSize: 16, margin: 0, letterSpacing: "0.02em" }}>{dayLabel(group.date)}</h3>
                <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em" }}>
                  {group.date}
                </span>
                <span className="fbt-mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", fontWeight: 700 }}>
                  {group.orders.length} ORDER{group.orders.length !== 1 ? "S" : ""}
                </span>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {group.orders.map((d) => {
            const bills = fbForDispatch(d.id);
            const pct = d.trucksExpected ? Math.min(100, (bills.length / d.trucksExpected) * 100) : 0;
            const unreadOnThis = bills.filter((fb) => unreadSet.has(fb.id)).length;
            return (
              <div key={d.id} className="fbt-card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
                {unreadOnThis > 0 && (
                  <div style={{
                    position: "absolute", top: 14, right: 14, zIndex: 2,
                    background: "var(--safety)", color: "#FFF",
                    padding: "4px 10px", border: "2px solid var(--steel)",
                    fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4,
                    animation: "slideUp 0.3s ease-out",
                  }}>
                    <span style={{ width: 6, height: 6, background: "#FFF", borderRadius: "50%" }} />
                    {unreadOnThis} NEW
                  </div>
                )}
                <div className="hazard-stripe-thin" style={{ height: 6 }} />
                <div style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {(() => {
                          const status = d.status === "closed" ? "complete" : d.status === "sent" ? "sent" : "draft";
                          const bg = status === "complete" ? "var(--concrete)" : status === "sent" ? "var(--hazard)" : "var(--good)";
                          return <span className="chip" style={{ background: bg, color: status === "sent" ? "var(--steel)" : "#FFF", borderColor: "var(--steel)" }}>● {status.toUpperCase()}</span>;
                        })()}
                        <span className="chip" style={{ background: "var(--hazard)" }}>#{d.code}</span>
                        <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>{fmtDate(d.date)}</span>
                      </div>
                      <h3 className="fbt-display" style={{ fontSize: 20, margin: "8px 0 4px" }}>{d.jobName}</h3>
                      <div className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)" }}>
                        {d.subContractor ? `SUB: ${d.subContractor}` : "INTERNAL"}
                        {d.pickup && ` · ${d.pickup}`}{d.dropoff && ` → ${d.dropoff}`}
                      </div>
                      {/* Per-assignment progress chips */}
                      {(d.assignments || []).length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                          {d.assignments.map((a) => {
                            const aFbs = bills.filter((fb) => fb.assignmentId === a.aid);
                            const expected = Number(a.trucks) || 1;
                            const submitted = aFbs.length;
                            const bg = submitted === 0 ? "var(--concrete)"
                              : submitted >= expected ? "var(--good)"
                              : "var(--hazard)";
                            return (
                              <span
                                key={a.aid}
                                className="chip"
                                style={{
                                  background: bg, color: "#FFF", fontSize: 9, padding: "2px 8px",
                                  borderColor: "var(--steel)",
                                }}
                                title={`${a.name}: ${submitted} of ${expected} submitted`}
                              >
                                {a.name.slice(0, 18)}{a.name.length > 18 ? "…" : ""} · {submitted}/{expected}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 11 }} onClick={() => copyLink(d.code)}><Link2 size={12} style={{ marginRight: 4 }} /> COPY LINK</button>
                      <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 11 }} onClick={() => printDriverSheet(d, `${window.location.origin}${window.location.pathname}#/submit/${d.code}`, onToast)} title="Print driver sheet with QR"><Printer size={12} style={{ marginRight: 4 }} /> PRINT</button>
                      <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 11 }} onClick={() => openEditDispatch(d)} title="Edit this order"><Edit2 size={12} style={{ marginRight: 4 }} /> EDIT</button>
                      <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 11 }} onClick={() => setActiveDispatch(d.id)}><Eye size={12} style={{ marginRight: 4 }} /> OPEN</button>
                      <button className="btn-danger" onClick={() => removeDispatch(d.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "JetBrains Mono, monospace", marginBottom: 4, color: "var(--concrete)" }}>
                      <span>▸ {bills.length} / {d.trucksExpected} FREIGHT BILLS IN</span>
                      {bills.length >= d.trucksExpected && <span style={{ color: "var(--good)", fontWeight: 700 }}>✓ COMPLETE</span>}
                    </div>
                    <div style={{ height: 8, background: "#E7E5E4", border: "1px solid var(--steel)" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "var(--good)" : "var(--hazard)", transition: "width 0.3s" }} />
                    </div>
                  </div>
                  {bills.length > 0 && (
                    <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {bills.map((fb) => (
                        <span key={fb.id} className="chip" style={{ background: "#FEF3C7", cursor: "pointer" }} onClick={() => setActiveDispatch(d.id)}>
                          <FileText size={10} /> FB#{fb.freightBillNumber} · {fb.truckNumber}
                          {fb.photos?.length > 0 && <span style={{ color: "var(--good)" }}>· {fb.photos.length}📎</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const HoursTab = ({ logs, setLogs, onToast }) => {
  const [draft, setDraft] = useState({ date: todayISO(), truck: "", driver: "", job: "", startTime: "", endTime: "", hours: "", rate: "142", notes: "" });
  const computeHours = (s, e) => { if (!s || !e) return ""; const [sh, sm] = s.split(":").map(Number); const [eh, em] = e.split(":").map(Number); const diff = (eh * 60 + em - sh * 60 - sm) / 60; return diff > 0 ? diff.toFixed(2) : ""; };

  const addLog = async () => {
    if (!draft.truck || !draft.driver) { onToast("TRUCK + DRIVER REQUIRED"); return; }
    const hrs = draft.hours || computeHours(draft.startTime, draft.endTime) || "0";
    const billable = Math.max(8, Number(hrs));
    const entry = { id: Date.now(), ...draft, hours: hrs, billableHours: billable, amount: billable * Number(draft.rate || 0) };
    const next = [entry, ...logs];
    setLogs(next);
    await storageSet("fbt:logs", next);
    setDraft({ ...draft, truck: "", driver: "", job: "", startTime: "", endTime: "", hours: "", notes: "" });
    onToast("LOG ADDED");
  };

  const removeLog = async (id) => { const next = logs.filter((l) => l.id !== id); setLogs(next); await storageSet("fbt:logs", next); onToast("LOG REMOVED"); };

  const totalHours = logs.reduce((s, l) => s + Number(l.billableHours || 0), 0);
  const totalDollars = logs.reduce((s, l) => s + Number(l.amount || 0), 0);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}><div className="stat-num">{logs.length}</div><div className="stat-label">Total Logs</div></div>
        <div className="fbt-card" style={{ padding: 20 }}><div className="stat-num">{totalHours.toFixed(1)}</div><div className="stat-label">Billable Hours</div></div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--hazard)" }}><div className="stat-num">{fmt$(totalDollars)}</div><div className="stat-label">Gross Billing</div></div>
      </div>
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>NEW HOURS LOG</h3></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <div><label className="fbt-label">Date</label><input className="fbt-input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>
          <div><label className="fbt-label">Truck #</label><input className="fbt-input" value={draft.truck} onChange={(e) => setDraft({ ...draft, truck: e.target.value })} placeholder="T-01" /></div>
          <div><label className="fbt-label">Driver</label><input className="fbt-input" value={draft.driver} onChange={(e) => setDraft({ ...draft, driver: e.target.value })} /></div>
          <div><label className="fbt-label">Job / Client</label><input className="fbt-input" value={draft.job} onChange={(e) => setDraft({ ...draft, job: e.target.value })} placeholder="MCI #91684" /></div>
          <div><label className="fbt-label">Start</label><input className="fbt-input" type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} /></div>
          <div><label className="fbt-label">End</label><input className="fbt-input" type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} /></div>
          <div><label className="fbt-label">Hours (override)</label><input className="fbt-input" type="number" step="0.25" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} placeholder="auto" /></div>
          <div><label className="fbt-label">Rate $/hr</label><input className="fbt-input" type="number" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="fbt-label">Notes</label><input className="fbt-input" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
        </div>
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button onClick={addLog} className="btn-primary"><Plus size={16} /> ADD LOG</button>
          <span className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)" }}>▸ 8-HR MIN AUTO-APPLIED · DEFAULT RATE $142 (MCI)</span>
        </div>
      </div>
      <div className="fbt-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "2px solid var(--steel)", display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>LOG SHEET</h3></div>
        <div className="scroll-x">
          <table className="fbt-table">
            <thead><tr><th>Date</th><th>Truck</th><th>Driver</th><th>Job</th><th>Hrs</th><th>Billable</th><th>Rate</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {logs.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--concrete)" }}>No logs yet.</td></tr>}
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{fmtDate(l.date)}</td><td><strong>{l.truck}</strong></td><td>{l.driver}</td><td>{l.job || "—"}</td>
                  <td>{l.hours || "—"}</td><td><strong>{Number(l.billableHours).toFixed(2)}</strong></td>
                  <td>{fmt$(l.rate)}</td><td style={{ color: "var(--hazard-deep)", fontWeight: 700 }}>{fmt$(l.amount)}</td>
                  <td><button className="btn-danger" onClick={() => removeLog(l.id)}><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const BillingTab = ({ logs, onToast }) => {
  const [dieselPrice, setDieselPrice] = useState(6.25);
  const [threshold, setThreshold] = useState(6.75);
  const [gallonsPerHour, setGallonsPerHour] = useState(6);
  const [clientFilter, setClientFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => { (async () => { const s = await storageGet("fbt:billing"); if (s) { setDieselPrice(s.dieselPrice ?? 6.25); setThreshold(s.threshold ?? 6.75); setGallonsPerHour(s.gallonsPerHour ?? 6); } })(); }, []);
  useEffect(() => { storageSet("fbt:billing", { dieselPrice, threshold, gallonsPerHour }); }, [dieselPrice, threshold, gallonsPerHour]);

  const filtered = logs.filter((l) => {
    if (clientFilter && !(l.job || "").toLowerCase().includes(clientFilter.toLowerCase())) return false;
    if (fromDate && l.date < fromDate) return false;
    if (toDate && l.date > toDate) return false;
    return true;
  });

  const subtotal = filtered.reduce((s, l) => s + Number(l.amount || 0), 0);
  const totalBillableHours = filtered.reduce((s, l) => s + Number(l.billableHours || 0), 0);
  const surchargeActive = Number(dieselPrice) > Number(threshold);
  const extraPerGal = Math.max(0, Number(dieselPrice) - Number(threshold));
  const surchargePerHourClean = extraPerGal * Number(gallonsPerHour);
  const fuelSurcharge = surchargeActive ? totalBillableHours * surchargePerHourClean : 0;
  const total = subtotal + fuelSurcharge;

  const exportCSV = () => {
    const rows = [["Date", "Truck", "Driver", "Job", "Hours", "Billable Hrs", "Rate", "Amount", "Notes"], ...filtered.map((l) => [l.date, l.truck, l.driver, l.job, l.hours, l.billableHours, l.rate, l.amount, l.notes || ""])];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `4brothers-billing-${todayISO()}.csv`; a.click();
    URL.revokeObjectURL(url);
    onToast("CSV EXPORTED");
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Fuel size={22} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>FUEL SURCHARGE ENGINE</h3>
          <span className="fbt-mono" style={{ marginLeft: "auto", padding: "4px 10px", background: surchargeActive ? "var(--safety)" : "var(--good)", color: "var(--cream)", fontSize: 11, letterSpacing: "0.1em" }}>{surchargeActive ? "● ACTIVE" : "○ BELOW THRESHOLD"}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
          <div><label className="fbt-label">Current Diesel $/gal</label><input className="fbt-input" type="number" step="0.01" value={dieselPrice} onChange={(e) => setDieselPrice(e.target.value)} /></div>
          <div><label className="fbt-label">Threshold $/gal</label><input className="fbt-input" type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)} /></div>
          <div><label className="fbt-label">Gallons / Hour</label><input className="fbt-input" type="number" step="0.1" value={gallonsPerHour} onChange={(e) => setGallonsPerHour(e.target.value)} /></div>
          <div><label className="fbt-label">Extra $/gal Over</label><input className="fbt-input" value={extraPerGal.toFixed(3)} readOnly style={{ background: "#F5F5F4" }} /></div>
        </div>
        <div style={{ marginTop: 16, padding: 14, background: "var(--steel)", color: "var(--cream)", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
          ▸ FORMULA: ( DIESEL − THRESHOLD ) × GAL/HR × BILLABLE_HRS<br />
          ▸ PER HOUR SURCHARGE: {fmt$(surchargePerHourClean)} · TRIGGERS ABOVE {fmt$(threshold)}/GAL
        </div>
      </div>
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>INVOICE BUILDER</h3></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <div><label className="fbt-label">Client / Job Contains</label><input className="fbt-input" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} placeholder="e.g. MCI" /></div>
          <div><label className="fbt-label">From</label><input className="fbt-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
          <div><label className="fbt-label">To</label><input className="fbt-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 24, border: "2px solid var(--steel)" }}>
          <table className="fbt-table">
            <tbody>
              <tr><td style={{ fontWeight: 600 }}>LABOR · {filtered.length} LOGS · {totalBillableHours.toFixed(2)} HRS</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt$(subtotal)}</td></tr>
              <tr><td style={{ fontWeight: 600, color: surchargeActive ? "var(--rust)" : "var(--concrete)" }}>FUEL SURCHARGE {surchargeActive ? `· ${fmt$(surchargePerHourClean)}/HR` : "(inactive)"}</td><td style={{ textAlign: "right", fontWeight: 700, color: surchargeActive ? "var(--rust)" : "var(--concrete)" }}>{fmt$(fuelSurcharge)}</td></tr>
              <tr style={{ background: "var(--hazard)" }}><td style={{ fontWeight: 700, fontSize: 16, fontFamily: "Archivo Black, sans-serif" }}>TOTAL DUE</td><td style={{ textAlign: "right", fontWeight: 700, fontSize: 16, fontFamily: "Archivo Black, sans-serif" }}>{fmt$(total)}</td></tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 20 }}><button onClick={exportCSV} className="btn-primary"><Download size={16} /> EXPORT CSV</button></div>
      </div>
    </div>
  );
};

// ========== QUOTE DETAIL MODAL (revisions + convert) ==========
const QuoteDetailModal = ({ quote, dispatches, setQuotes, quotes, onConvertToOrder, onClose, onToast }) => {
  const [draft, setDraft] = useState({ ...quote });
  const [showRevisions, setShowRevisions] = useState(false);
  const [revReason, setRevReason] = useState("");
  const [dirty, setDirty] = useState(false);

  const linkedOrder = quote.convertedToOrderId ? dispatches.find((d) => d.id === quote.convertedToOrderId) : null;

  const updateField = (field, value) => {
    setDraft({ ...draft, [field]: value });
    setDirty(true);
  };

  const saveRevision = async () => {
    if (!dirty) { onToast("NO CHANGES TO SAVE"); return; }
    // Build revision snapshot from current quote (pre-edit state)
    const currentRev = quote.revisions?.length || 0;
    const newRevision = {
      revNumber: currentRev + 1,
      savedAt: new Date().toISOString(),
      savedBy: "admin",
      changeReason: revReason || "(no reason given)",
      snapshot: {
        name: quote.name, company: quote.company, email: quote.email, phone: quote.phone,
        pickup: quote.pickup, dropoff: quote.dropoff, material: quote.material,
        quantity: quote.quantity, needDate: quote.needDate, notes: quote.notes,
        status: quote.status, service: quote.service,
      },
    };
    const updated = {
      ...draft,
      revisions: [...(quote.revisions || []), newRevision],
      updatedAt: new Date().toISOString(),
    };
    const next = quotes.map((q) => q.id === quote.id ? updated : q);
    setQuotes(next);
    // v18: persist to Supabase (was localStorage-only)
    try { await updateQuote(quote.id, updated); } catch (e) { console.error("saveQuote:", e); }
    onToast(`✓ REVISION ${newRevision.revNumber + 1} SAVED`);
    setDirty(false);
    setRevReason("");
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", letterSpacing: "0.1em" }}>QUOTE</div>
            <h3 className="fbt-display" style={{ fontSize: 20, margin: "2px 0 0" }}>{quote.name}{quote.company ? ` · ${quote.company}` : ""}</h3>
            <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1", marginTop: 2 }}>
              {fmtDate(quote.submittedAt)} · {quote.service || "—"} · rev {(quote.revisions?.length || 0) + 1}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 14 }}>

          {/* Converted banner */}
          {linkedOrder && (
            <div style={{ padding: 12, background: "#F0FDF4", border: "2px solid var(--good)" }}>
              <div className="fbt-mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--good)" }}>
                ✓ CONVERTED TO ORDER #{linkedOrder.code}
              </div>
              <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
                {quote.convertedAt ? new Date(quote.convertedAt).toLocaleDateString() : "—"} · {linkedOrder.jobName}
              </div>
            </div>
          )}

          {/* Status */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <div>
              <label className="fbt-label">Status</label>
              <select className="fbt-select" value={draft.status || "new"} onChange={(e) => updateField("status", e.target.value)}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="won">Won / Accepted</option>
                <option value="lost">Lost</option>
                {quote.convertedToOrderId && <option value="converted">Converted</option>}
              </select>
            </div>
            <div>
              <label className="fbt-label">Need Date</label>
              <input className="fbt-input" type="date" value={draft.needDate || ""} onChange={(e) => updateField("needDate", e.target.value)} />
            </div>
          </div>

          {/* Contact + job details */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <div><label className="fbt-label">Name</label><input className="fbt-input" value={draft.name || ""} onChange={(e) => updateField("name", e.target.value)} /></div>
            <div><label className="fbt-label">Company</label><input className="fbt-input" value={draft.company || ""} onChange={(e) => updateField("company", e.target.value)} /></div>
            <div><label className="fbt-label">Email</label><input className="fbt-input" value={draft.email || ""} onChange={(e) => updateField("email", e.target.value)} /></div>
            <div><label className="fbt-label">Phone</label><input className="fbt-input" value={draft.phone || ""} onChange={(e) => updateField("phone", e.target.value)} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label className="fbt-label">Pickup</label><input className="fbt-input" value={draft.pickup || ""} onChange={(e) => updateField("pickup", e.target.value)} /></div>
            <div><label className="fbt-label">Dropoff</label><input className="fbt-input" value={draft.dropoff || ""} onChange={(e) => updateField("dropoff", e.target.value)} /></div>
            <div><label className="fbt-label">Material</label><input className="fbt-input" value={draft.material || ""} onChange={(e) => updateField("material", e.target.value)} /></div>
            <div><label className="fbt-label">Quantity / Loads</label><input className="fbt-input" value={draft.quantity || ""} onChange={(e) => updateField("quantity", e.target.value)} /></div>
          </div>
          <div>
            <label className="fbt-label">Notes</label>
            <textarea className="fbt-textarea" value={draft.notes || ""} onChange={(e) => updateField("notes", e.target.value)} />
          </div>

          {/* Revision reason (only visible if dirty) */}
          {dirty && (
            <div style={{ padding: 10, background: "#FEF3C7", border: "2px solid var(--hazard)" }}>
              <label className="fbt-label" style={{ color: "var(--hazard-deep)" }}>
                CHANGE REASON (why are you revising this quote?)
              </label>
              <input
                className="fbt-input"
                value={revReason}
                onChange={(e) => setRevReason(e.target.value)}
                placeholder="e.g. Customer requested rate adjustment · added tonnage"
              />
            </div>
          )}

          {/* Revision history */}
          {(quote.revisions?.length || 0) > 0 && (
            <div style={{ border: "1.5px solid var(--steel)", padding: 12 }}>
              <div
                style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onClick={() => setShowRevisions(!showRevisions)}
              >
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em" }}>
                  ▸ REVISION HISTORY ({quote.revisions.length} PRIOR VERSION{quote.revisions.length !== 1 ? "S" : ""})
                </div>
                <ChevronDown size={14} style={{ transform: showRevisions ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
              </div>
              {showRevisions && (
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  {[...quote.revisions].reverse().map((rev, idx) => (
                    <div key={idx} style={{ padding: 10, background: "#F5F5F4", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        REV {rev.revNumber} · {new Date(rev.savedAt).toLocaleString()}
                      </div>
                      <div style={{ color: "var(--concrete)", marginBottom: 4 }}>"{rev.changeReason || "(no reason)"}"</div>
                      <div style={{ fontSize: 10 }}>
                        {rev.snapshot.material ? `Material: ${rev.snapshot.material} · ` : ""}
                        {rev.snapshot.pickup ? `Pickup: ${rev.snapshot.pickup} · ` : ""}
                        {rev.snapshot.dropoff ? `Dropoff: ${rev.snapshot.dropoff} · ` : ""}
                        {rev.snapshot.quantity ? `Qty: ${rev.snapshot.quantity} · ` : ""}
                        Status: {rev.snapshot.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dirty && (
              <button onClick={saveRevision} className="btn-primary">
                <Save size={14} /> SAVE AS NEW REVISION
              </button>
            )}
            {/* Convert to Order — only on "won" status, not already converted */}
            {(draft.status === "won" || quote.status === "won") && !quote.convertedToOrderId && (
              <button
                onClick={() => onConvertToOrder(quote)}
                className="btn-primary"
                style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}
              >
                <ArrowRight size={14} /> CONVERT TO ORDER
              </button>
            )}
            {/* Show warning if trying to convert non-won quote */}
            {!quote.convertedToOrderId && draft.status !== "won" && quote.status !== "won" && (
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", alignSelf: "center" }}>
                ▸ MARK AS WON FIRST TO ENABLE CONVERT
              </div>
            )}
            <button onClick={onClose} className="btn-ghost">CLOSE</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuotesTab = ({ quotes, setQuotes, dispatches = [], setDispatches, contacts = [], projects = [], onJumpTab, onToast }) => {
  const [viewingQuote, setViewingQuote] = useState(null);
  const [pendingConversion, setPendingConversion] = useState(null); // quote being converted

  const updateStatus = async (id, status) => {
    const next = quotes.map((q) => q.id === id ? { ...q, status } : q);
    setQuotes(next);
    // v18: persist to Supabase (was localStorage-only)
    try { await updateQuote(id, { status }); } catch (e) { console.error("updateStatus:", e); }
    onToast(`QUOTE ${status.toUpperCase()}`);
  };
  const remove = async (id) => {
    if (!confirm("Delete this quote? Revision history will be lost.")) return;
    const next = quotes.filter((q) => q.id !== id);
    setQuotes(next);
    // v18: soft-delete to Supabase
    try { await deleteQuote(id, { deletedBy: "admin", reason: "" }); } catch (e) { console.error("removeQuote:", e); }
    onToast("QUOTE DELETED");
  };

  // Convert to Order — uses the pending-conversion state to trigger the order form pre-fill
  const handleConvert = (quote) => {
    // Try to match customer by email/phone/name against existing customer contacts
    const customer = contacts.find((c) =>
      c.type === "customer" && (
        (quote.email && c.email && c.email.toLowerCase() === quote.email.toLowerCase()) ||
        (quote.phone && c.phone && c.phone.replace(/[^0-9]/g, "") === String(quote.phone).replace(/[^0-9]/g, "")) ||
        (quote.company && c.companyName && c.companyName.toLowerCase() === quote.company.toLowerCase())
      )
    );

    // Pre-filled order draft — user still needs to add date + truck count
    const orderDraft = {
      date: quote.needDate || new Date().toISOString().slice(0, 10),
      jobName: quote.company ? `${quote.company} — ${quote.material || quote.service || "Hauling"}` : (quote.service || "Hauling Job"),
      clientId: customer?.id || "",
      clientName: customer?.companyName || quote.company || quote.name || "",
      pickup: quote.pickup || "",
      dropoff: quote.dropoff || "",
      material: quote.material || "",
      trucksExpected: 1,
      notes: `Converted from quote submitted ${quote.submittedAt ? new Date(quote.submittedAt).toLocaleDateString() : "—"}.${quote.notes ? "\n\nOriginal quote notes: " + quote.notes : ""}`,
      fromQuoteId: quote.id,
    };

    setPendingConversion({ quote, orderDraft });
    setViewingQuote(null);
    onToast("QUOTE LOADED — FILL IN DATE + TRUCK COUNT & SAVE");
  };

  // When user completes the conversion (clicks save in the embedded form)
  const finalizeConversion = async (newOrder) => {
    if (!pendingConversion) return;
    const { quote } = pendingConversion;
    // Stamp the quote as converted
    const updatedQuote = {
      ...quote,
      status: "converted",
      convertedToOrderId: newOrder.id,
      convertedAt: new Date().toISOString(),
    };
    const next = quotes.map((q) => q.id === quote.id ? updatedQuote : q);
    setQuotes(next);
    // v18: persist conversion to Supabase
    try { await updateQuote(quote.id, updatedQuote); } catch (e) { console.error("finalizeConversion:", e); }
    setPendingConversion(null);
    onToast(`✓ QUOTE CONVERTED → ORDER #${newOrder.code}`);
  };

  const byStatus = {
    new: quotes.filter((q) => q.status === "new"),
    contacted: quotes.filter((q) => q.status === "contacted"),
    won: quotes.filter((q) => q.status === "won"),
    converted: quotes.filter((q) => q.status === "converted"),
    lost: quotes.filter((q) => q.status === "lost"),
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {viewingQuote && (
        <QuoteDetailModal
          quote={viewingQuote}
          dispatches={dispatches}
          setQuotes={setQuotes}
          quotes={quotes}
          onConvertToOrder={handleConvert}
          onClose={() => setViewingQuote(null)}
          onToast={onToast}
        />
      )}

      {pendingConversion && (
        <QuoteConversionForm
          quote={pendingConversion.quote}
          draft={pendingConversion.orderDraft}
          dispatches={dispatches}
          setDispatches={setDispatches}
          projects={projects}
          contacts={contacts}
          onSave={finalizeConversion}
          onCancel={() => setPendingConversion(null)}
          onToast={onToast}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {[
          { l: "New", v: byStatus.new.length, c: "var(--hazard)", fg: "var(--steel)" },
          { l: "Contacted", v: byStatus.contacted.length, c: "#FFF", fg: "var(--steel)" },
          { l: "Won", v: byStatus.won.length, c: "var(--good)", fg: "#FFF" },
          { l: "Converted", v: byStatus.converted.length, c: "var(--steel)", fg: "var(--cream)" },
          { l: "Lost", v: byStatus.lost.length, c: "var(--concrete)", fg: "#FFF" },
        ].map((s, i) => (
          <div key={i} className="fbt-card" style={{ padding: 20, background: s.c, color: s.fg }}>
            <div className="stat-num" style={{ color: s.fg }}>{s.v}</div>
            <div className="stat-label" style={{ color: s.fg === "#FFF" || s.fg === "var(--cream)" ? "#E7E5E4" : "var(--concrete)" }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div className="fbt-card" style={{ padding: 0 }}>
        <div style={{ padding: "18px 24px", borderBottom: "2px solid var(--steel)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 24, background: "var(--hazard)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>INBOUND QUOTE REQUESTS</h3>
        </div>
        {quotes.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
            <AlertCircle size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div className="fbt-mono" style={{ fontSize: 13 }}>NO INBOUND REQUESTS YET</div>
          </div>
        ) : (
          <div style={{ padding: 24, display: "grid", gap: 16 }}>
            {quotes.map((q) => {
              const linkedOrder = q.convertedToOrderId ? dispatches.find((d) => d.id === q.convertedToOrderId) : null;
              const bg = q.status === "converted" ? "#F0FDF4" : q.status === "new" ? "#FEF3C7" : "#FFF";
              const revCount = q.revisions?.length || 0;
              return (
                <div key={q.id} style={{ border: "2px solid var(--steel)", padding: 20, background: bg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        <span className="fbt-display" style={{ fontSize: 18 }}>{q.name}</span>
                        {q.company && <span style={{ color: "var(--concrete)", fontSize: 14 }}>· {q.company}</span>}
                        {revCount > 0 && (
                          <span className="chip" style={{ background: "var(--steel)", color: "var(--cream)", fontSize: 9, padding: "2px 7px" }}>
                            REV {revCount + 1}
                          </span>
                        )}
                      </div>
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {fmtDate(q.submittedAt)} · {q.service} {q.needDate && `· needed ${fmtDate(q.needDate)}`}
                      </div>
                      {linkedOrder && (
                        <div
                          onClick={() => onJumpTab && onJumpTab("dispatches", linkedOrder.id)}
                          style={{ marginTop: 6, padding: "4px 8px", background: "var(--good)", color: "#FFF", display: "inline-block", fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", cursor: "pointer", fontWeight: 700 }}
                        >
                          ✓ CONVERTED → ORDER #{linkedOrder.code} ▸
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: "6px 10px", fontSize: 11 }}
                        onClick={() => setViewingQuote(q)}
                      >
                        <Eye size={11} style={{ marginRight: 4 }} /> VIEW / EDIT
                      </button>
                      {!q.convertedToOrderId && (
                        <select className="fbt-select" style={{ padding: "6px 10px", fontSize: 12, width: "auto" }} value={q.status} onChange={(e) => updateStatus(q.id, e.target.value)}>
                          <option value="new">● New</option>
                          <option value="contacted">◐ Contacted</option>
                          <option value="won">✓ Won</option>
                          <option value="lost">✕ Lost</option>
                        </select>
                      )}
                      {/* Quick Convert button on won quotes */}
                      {q.status === "won" && !q.convertedToOrderId && (
                        <button
                          className="btn-primary"
                          style={{ padding: "6px 10px", fontSize: 11, background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}
                          onClick={() => handleConvert(q)}
                        >
                          <ArrowRight size={11} style={{ marginRight: 4 }} /> CONVERT
                        </button>
                      )}
                      <button className="btn-danger" onClick={() => remove(q.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
                    {q.email && <div><span style={{ color: "var(--concrete)" }}>EMAIL ▸</span> {q.email}</div>}
                    {q.phone && <div><span style={{ color: "var(--concrete)" }}>PHONE ▸</span> {q.phone}</div>}
                    {q.pickup && <div><span style={{ color: "var(--concrete)" }}>PICKUP ▸</span> {q.pickup}</div>}
                    {q.dropoff && <div><span style={{ color: "var(--concrete)" }}>DROPOFF ▸</span> {q.dropoff}</div>}
                    {q.material && <div><span style={{ color: "var(--concrete)" }}>MATERIAL ▸</span> {q.material}</div>}
                    {q.quantity && <div><span style={{ color: "var(--concrete)" }}>QTY ▸</span> {q.quantity}</div>}
                  </div>
                  {q.notes && <div style={{ marginTop: 12, padding: 10, background: "#F5F5F4", fontSize: 13, borderLeft: "3px solid var(--hazard)" }}>{q.notes}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ========== QUOTE CONVERSION FORM ==========
// Simple modal form focused on the 2 required fields (date + truck count) + optional rate
const QuoteConversionForm = ({ quote, draft, dispatches, setDispatches, projects, contacts, onSave, onCancel, onToast }) => {
  const [form, setForm] = useState({
    ...draft,
    ratePerHour: "142",
    ratePerTon: "",
    projectId: null,
    subContractor: "",
    subContractorId: "",
    quarryId: null,
  });

  const customers = contacts.filter((c) => c.type === "customer");
  const availableProjects = form.clientId
    ? projects.filter((p) => String(p.customerId) === String(form.clientId))
    : projects;

  const save = async () => {
    if (!form.jobName) { onToast("JOB NAME REQUIRED"); return; }
    if (!form.date) { onToast("DATE REQUIRED"); return; }
    if (!Number(form.trucksExpected) || Number(form.trucksExpected) < 1) { onToast("ENTER # OF TRUCKS"); return; }

    // Generate a unique code
    const year = new Date().getFullYear();
    const existing = dispatches.filter((d) => d.code?.startsWith(`${year}-`));
    const maxN = existing.reduce((m, d) => {
      const n = parseInt(String(d.code).split("-")[1], 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    const code = `${year}-${String(maxN + 1).padStart(4, "0")}`;

    const newOrder = {
      id: "temp-" + Date.now(),
      code,
      ...form,
      trucksExpected: Number(form.trucksExpected),
      ratePerHour: form.ratePerHour ? Number(form.ratePerHour) : null,
      ratePerTon: form.ratePerTon ? Number(form.ratePerTon) : null,
      assignments: [],
      assignedDriverIds: [],
      assignedDriverNames: [],
      status: "open",
      createdAt: new Date().toISOString(),
    };

    const next = [newOrder, ...dispatches];
    try {
      await setDispatches(next);
      // Wait briefly so Supabase returns the real id, then finalize conversion
      setTimeout(async () => {
        // Find the actual saved order (code-matched)
        const saved = dispatches.find((d) => d.code === code) || newOrder;
        await onSave(saved);
      }, 600);
      onToast(`✓ ORDER #${code} CREATED`);
    } catch (e) {
      console.error(e);
      onToast("CONVERSION FAILED");
    }
  };

  return (
    <div className="modal-bg" onClick={onCancel} style={{ zIndex: 105 }}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div style={{ padding: "18px 22px", background: "var(--good)", color: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em" }}>CONVERT QUOTE → ORDER</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>{quote.name}{quote.company ? ` · ${quote.company}` : ""}</h3>
          </div>
          <button onClick={onCancel} style={{ background: "transparent", border: "none", color: "#FFF", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 12 }}>
          <div style={{ padding: 10, background: "#FEF3C7", border: "2px solid var(--hazard)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--hazard-deep)" }}>
            ⚠ FILL IN <strong>DATE</strong> AND <strong>TRUCKS EXPECTED</strong> TO CONTINUE · OTHER FIELDS PRE-FILLED FROM QUOTE
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label" style={{ color: "var(--hazard-deep)" }}>Date * (required)</label>
              <input className="fbt-input" type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ borderColor: "var(--hazard)" }} />
            </div>
            <div>
              <label className="fbt-label" style={{ color: "var(--hazard-deep)" }}>Trucks Expected * (required)</label>
              <input className="fbt-input" type="number" min="1" value={form.trucksExpected} onChange={(e) => setForm({ ...form, trucksExpected: e.target.value })} style={{ borderColor: "var(--hazard)" }} />
            </div>
          </div>

          <div>
            <label className="fbt-label">Job Name</label>
            <input className="fbt-input" value={form.jobName} onChange={(e) => setForm({ ...form, jobName: e.target.value })} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Customer</label>
              <select className="fbt-select" value={form.clientId || ""} onChange={(e) => {
                const id = e.target.value;
                const c = customers.find((x) => String(x.id) === id);
                setForm({ ...form, clientId: c?.id || "", clientName: c?.companyName || "" });
              }}>
                <option value="">— {form.clientName || "No customer link"} —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>)}
              </select>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>
                ▸ {form.clientId ? "LINKED TO CUSTOMER CONTACT" : "NO CUSTOMER CONTACT MATCHED — CREATE ONE IN CONTACTS FOR FUTURE USE"}
              </div>
            </div>
            <div>
              <label className="fbt-label">Project (optional)</label>
              <select className="fbt-select" value={form.projectId || ""} onChange={(e) => setForm({ ...form, projectId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— None —</option>
                {availableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.defaultRate ? ` · $${p.defaultRate}/hr` : ""}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Pickup</label>
              <input className="fbt-input" value={form.pickup || ""} onChange={(e) => setForm({ ...form, pickup: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Dropoff</label>
              <input className="fbt-input" value={form.dropoff || ""} onChange={(e) => setForm({ ...form, dropoff: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Material</label>
              <input className="fbt-input" value={form.material || ""} onChange={(e) => setForm({ ...form, material: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Rate $/hr</label>
              <input className="fbt-input" type="number" value={form.ratePerHour || ""} onChange={(e) => setForm({ ...form, ratePerHour: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Rate $/ton</label>
              <input className="fbt-input" type="number" step="0.01" value={form.ratePerTon || ""} onChange={(e) => setForm({ ...form, ratePerTon: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="fbt-label">Notes</label>
            <textarea className="fbt-textarea" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", padding: 10, background: "#F5F5F4" }}>
            ▸ AFTER SAVING: ADD SUBS / DRIVERS ON THE ORDERS TAB · SHARE DRIVER LINKS · MARK AS DISPATCHED WHEN READY
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} className="btn-primary" style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}>
              <CheckCircle2 size={16} /> CREATE ORDER FROM QUOTE
            </button>
            <button onClick={onCancel} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FleetTab = ({ fleet, setFleet, contacts = [], onToast }) => {
  const [draft, setDraft] = useState({ unit: "", type: "Super Dump", driver: "", driverId: null, status: "available", notes: "" });
  const driverContacts = contacts.filter((c) => c.type === "driver");

  const add = async () => {
    if (!draft.unit) { onToast("UNIT # REQUIRED"); return; }
    const next = [...fleet, { ...draft, id: Date.now() }];
    setFleet(next); await storageSet("fbt:fleet", next);
    setDraft({ unit: "", type: "Super Dump", driver: "", driverId: null, status: "available", notes: "" });
    onToast("UNIT ADDED");
  };
  const update = async (id, field, value) => { const next = fleet.map((f) => f.id === id ? { ...f, [field]: value } : f); setFleet(next); await storageSet("fbt:fleet", next); };
  const updateDriver = async (id, driverId) => {
    const contact = driverId ? contacts.find((c) => c.id === Number(driverId) || c.id === driverId) : null;
    const next = fleet.map((f) => f.id === id ? { ...f, driverId: driverId || null, driver: contact ? (contact.companyName || contact.contactName) : "" } : f);
    setFleet(next); await storageSet("fbt:fleet", next);
  };
  const remove = async (id) => { const next = fleet.filter((f) => f.id !== id); setFleet(next); await storageSet("fbt:fleet", next); onToast("UNIT REMOVED"); };
  const statusColor = (s) => ({ available: "var(--good)", dispatched: "var(--hazard-deep)", maintenance: "var(--safety)", offline: "var(--concrete)" }[s] || "var(--concrete)");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>ADD FLEET UNIT</h3></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <div><label className="fbt-label">Unit #</label><input className="fbt-input" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="T-01" /></div>
          <div><label className="fbt-label">Type</label><select className="fbt-select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}><option>Super Dump</option><option>Transfer End Dump</option><option>Truck & Trailer</option><option>End Dump</option><option>Other</option></select></div>
          <div>
            <label className="fbt-label">Driver</label>
            {driverContacts.length > 0 ? (
              <select
                className="fbt-select"
                value={draft.driverId || ""}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) { setDraft({ ...draft, driverId: null, driver: "" }); return; }
                  const c = contacts.find((x) => String(x.id) === id);
                  if (c) setDraft({ ...draft, driverId: c.id, driver: c.companyName || c.contactName });
                }}
              >
                <option value="">— Unassigned —</option>
                {driverContacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>
                ))}
              </select>
            ) : (
              <input className="fbt-input" value={draft.driver} onChange={(e) => setDraft({ ...draft, driver: e.target.value })} placeholder="Add driver contacts for a picker" />
            )}
          </div>
          <div><label className="fbt-label">Status</label><select className="fbt-select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="available">Available</option><option value="dispatched">Dispatched</option><option value="maintenance">Maintenance</option><option value="offline">Offline</option></select></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="fbt-label">Notes</label><input className="fbt-input" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
        </div>
        <button onClick={add} className="btn-primary" style={{ marginTop: 18 }}><Plus size={16} /> ADD UNIT</button>
      </div>
      <div className="fbt-card" style={{ padding: 0 }}>
        <div style={{ padding: "18px 24px", borderBottom: "2px solid var(--steel)", display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>FLEET ROSTER</h3></div>
        {fleet.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
            <Truck size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div className="fbt-mono" style={{ fontSize: 13 }}>NO UNITS ON ROSTER</div>
          </div>
        ) : (
          <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {fleet.map((f) => (
              <div key={f.id} style={{ border: "2px solid var(--steel)", background: "#FFF", position: "relative" }}>
                <div className="hazard-stripe-thin" style={{ height: 6 }} />
                <div style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div className="fbt-display" style={{ fontSize: 24 }}>{f.unit}</div>
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{f.type}</div>
                    </div>
                    <div style={{ padding: "4px 10px", background: statusColor(f.status), color: "#FFF", fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>● {f.status}</div>
                  </div>
                  <div style={{ marginTop: 14, fontSize: 13, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)" }}>DRIVER ▸ {f.driver || "unassigned"}{f.driverId ? " · LINKED" : ""}</div>
                  {driverContacts.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <select
                        className="fbt-select"
                        style={{ padding: "4px 8px", fontSize: 10 }}
                        value={f.driverId || ""}
                        onChange={(e) => updateDriver(f.id, e.target.value)}
                      >
                        <option value="">— Unassigned —</option>
                        {driverContacts.map((c) => (
                          <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {f.notes && <div style={{ marginTop: 8, fontSize: 12, color: "var(--concrete)" }}>{f.notes}</div>}
                  <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
                    <select className="fbt-select" style={{ padding: "6px 8px", fontSize: 11 }} value={f.status} onChange={(e) => update(f.id, "status", e.target.value)}>
                      <option value="available">Available</option><option value="dispatched">Dispatched</option><option value="maintenance">Maintenance</option><option value="offline">Offline</option>
                    </select>
                    <button className="btn-danger" onClick={() => remove(f.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ========== PRINT-BASED INVOICE GENERATION ==========
// Opens a styled print window — user hits Print and saves as PDF from browser dialog.
// Works on mobile (Safari/Chrome both support "Save as PDF" in print dialog).
const generateInvoicePDF = async (invoice, company, freightBills, pricing) => {
  const esc = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
  const rate = Number(pricing.rate) || 0;

  // v16: render per-FB line items. Each FB gets a header row + one row per billing line.
  // Legacy FBs (without billingLines) render a single row using the invoice-level rate.
  const rowsHtml = freightBills.map((fb, idx) => {
    const fbDate = fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
    const hasLines = Array.isArray(fb.billingLines) && fb.billingLines.length > 0;

    if (hasLines) {
      // Header row summarizing the FB
      const fbLineHtml = `
        <tr class="fb-header"${idx % 2 === 0 ? " data-alt='1'" : ""}>
          <td><strong>FB #${esc(fb.freightBillNumber || "—")}</strong></td>
          <td>${esc(fbDate)}</td>
          <td>${esc(fb.truckNumber || "")}</td>
          <td colspan="5">${esc(fb.driverName || "")}</td>
        </tr>
      `;
      // One row per billing line
      const lineRows = fb.billingLines.map((ln) => {
        const unit = ln.code === "H" ? "hrs" : ln.code === "T" ? "tons" : ln.code === "L" ? "loads" : "ea";
        const isBrok = ln.brokerable && Number(ln.brokeragePct) > 0;
        const adjBadge = ln.isAdjustment ? ' <span style="color:#B45309;font-size:8pt;">(adj)</span>' : '';
        const brokBadge = isBrok ? ` <span style="color:#B45309;font-size:8pt;">(Br ${ln.brokeragePct}%)</span>` : '';
        return `
          <tr class="fb-line">
            <td colspan="3"></td>
            <td style="padding-left:18px;">${esc(ln.item || ln.code || "")}${adjBadge}${brokBadge}</td>
            <td class="r">${(Number(ln.qty) || 0).toFixed(2)}</td>
            <td>${unit}</td>
            <td class="r">${money(Number(ln.rate) || 0)}</td>
            <td class="r"><strong>${money(Number(ln.net) || 0)}</strong></td>
          </tr>
        `;
      }).join("");
      // FB subtotal
      const fbSubtotal = fb.billingLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
      const fbSubtotalRow = fb.billingLines.length > 1 ? `
        <tr class="fb-subtotal">
          <td colspan="7" class="r" style="font-size:9pt;color:#44403C;">FB#${esc(fb.freightBillNumber || "—")} SUBTOTAL</td>
          <td class="r" style="font-weight:700;border-top:1px solid #1C1917;">${money(fbSubtotal)}</td>
        </tr>
      ` : "";
      return fbLineHtml + lineRows + fbSubtotalRow;
    }

    // LEGACY PATH — pre-v16 FB, render as single row using invoice rate/method
    let qty = 0, unitLabel = "";
    if (pricing.method === "ton") { qty = Number(fb.tonnage) || 0; unitLabel = "tons"; }
    else if (pricing.method === "load") { qty = Number(fb.loadCount) || 1; unitLabel = "loads"; }
    else if (pricing.method === "hour") { qty = Number(fb.hoursOverride || 0); unitLabel = "hrs"; }
    const amount = qty * rate;
    return `<tr${idx % 2 === 0 ? " class='alt'" : ""}>
      <td>${esc(fb.freightBillNumber || "—")}</td>
      <td>${esc(fbDate)}</td>
      <td>${esc(fb.truckNumber || "")}</td>
      <td>${esc(fb.driverName || "")}</td>
      <td class="r">${qty.toFixed(2)}</td>
      <td>${esc(unitLabel)}</td>
      <td class="r">${money(rate)}</td>
      <td class="r"><strong>${money(amount)}</strong></td>
    </tr>`;
  }).join("");

  const subtotal = freightBills.reduce((s, fb) => {
    // v16: sum from billingLines
    if (Array.isArray(fb.billingLines) && fb.billingLines.length > 0) {
      return s + fb.billingLines.reduce((ss, ln) => ss + (Number(ln.net) || 0), 0);
    }
    // LEGACY
    let qty = 0;
    if (pricing.method === "ton") qty = Number(fb.tonnage) || 0;
    else if (pricing.method === "load") qty = Number(fb.loadCount) || 1;
    else if (pricing.method === "hour") qty = Number(fb.hoursOverride || 0);
    return s + qty * rate;
  }, 0);
  // Legacy FB extras — only sum for FBs WITHOUT billingLines (new FBs include extras as lines)
  const fbExtrasSum = freightBills.reduce((s, fb) => {
    if (Array.isArray(fb.billingLines) && fb.billingLines.length > 0) return s; // already in lines
    return s + (fb.extras || [])
      .filter((x) => x.reimbursable !== false)
      .reduce((ss, x) => ss + (Number(x.amount) || 0), 0);
  }, 0);
  const extraFees = Number(invoice.extraFees) || 0;
  const invoiceExtrasSum = (invoice.extras || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const discount = Number(invoice.discount) || 0;
  const total = subtotal + fbExtrasSum + extraFees + invoiceExtrasSum - discount;

  const photos = invoice.includePhotos
    ? freightBills.flatMap((fb) => (fb.photos || []).map((p) => ({ ...p, fbNum: fb.freightBillNumber })))
    : [];
  const photosHtml = photos.length
    ? `<div class="photos">
        <h2>ATTACHED SCALE TICKETS / FREIGHT BILLS</h2>
        <div class="photo-grid">
          ${photos.map((p) => `<div class="photo-item">
            <img src="${p.dataUrl}" alt="scale ticket" />
            <div class="photo-label">FB #${esc(p.fbNum || "")}</div>
          </div>`).join("")}
        </div>
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(invoice.invoiceNumber)} — ${esc(invoice.billToName || "Invoice")}</title>
<style>
  @page { margin: 0.4in; size: letter; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px; font-family: -apple-system, Arial, sans-serif; color: #1C1917; font-size: 11pt; }
  .hazard-top { height: 8px; background: #F59E0B; margin: -20px -20px 0; }
  .steel-top { height: 2px; background: #1C1917; margin: 0 -20px 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 28px; }
  .company { display: flex; gap: 14px; align-items: flex-start; flex: 1; }
  .logo { width: 64px; height: 64px; object-fit: contain; border: 2px solid #1C1917; background: #FFF; }
  .company-info { flex: 1; }
  .company-name { font-size: 18pt; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 4px; }
  .company-meta { font-size: 9pt; color: #44403C; line-height: 1.5; }
  .invoice-box { background: #1C1917; color: #FFF; padding: 14px 18px; min-width: 180px; }
  .invoice-box h1 { color: #F59E0B; font-size: 22pt; letter-spacing: -0.02em; margin: 0 0 6px; font-weight: 900; }
  .invoice-box div { font-family: Menlo, Consolas, monospace; font-size: 10pt; line-height: 1.6; }
  .bill-to { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 14px 16px; border: 2px solid #1C1917; background: #FAFAF9; margin-bottom: 24px; }
  .bill-to h3 { font-size: 8pt; color: #44403C; letter-spacing: 0.12em; margin: 0 0 6px; font-weight: 700; }
  .bill-to .name { font-size: 12pt; font-weight: 700; margin-bottom: 4px; }
  .bill-to .info { font-size: 10pt; color: #44403C; line-height: 1.5; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  table.items thead th { background: #1C1917; color: #F59E0B; text-align: left; padding: 8px 10px; font-size: 8pt; letter-spacing: 0.08em; font-weight: 700; }
  table.items thead th.r, table.items td.r { text-align: right; }
  table.items td { padding: 8px 10px; font-size: 10pt; border-bottom: 1px solid #E7E5E4; }
  table.items tr.alt td { background: #FAFAF9; }
  table.items tr.fb-header td { background: #1C1917; color: #FAFAF9; padding-top: 10px; padding-bottom: 6px; border-bottom: none; }
  table.items tr.fb-header td strong { color: #F59E0B; font-size: 10pt; }
  table.items tr.fb-line td { padding: 5px 10px; font-size: 9.5pt; background: #FAFAF9; border-bottom: 1px dotted #D6D3D1; }
  table.items tr.fb-subtotal td { padding: 6px 10px; background: #F5F5F4; border-bottom: 2px solid #1C1917; }
  .totals { margin-left: auto; width: 50%; }
  .totals tr td { padding: 6px 10px; font-size: 10pt; }
  .totals tr td.label { text-align: right; color: #44403C; }
  .totals tr td.val { text-align: right; font-weight: 700; min-width: 110px; }
  .totals tr.total { background: #F59E0B; }
  .totals tr.total td { font-weight: 900; font-size: 13pt; padding: 10px; }
  .notes-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
  .notes-wrap h4 { font-size: 8pt; color: #44403C; letter-spacing: 0.12em; margin: 0 0 6px; font-weight: 700; }
  .notes-wrap p { font-size: 10pt; color: #1C1917; margin: 0; white-space: pre-wrap; line-height: 1.5; }
  .photos { margin-top: 28px; padding-top: 16px; border-top: 2px solid #1C1917; page-break-before: auto; }
  .photos h2 { font-size: 10pt; letter-spacing: 0.05em; margin: 0 0 12px; font-weight: 900; }
  .photo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .photo-item { }
  .photo-item img { width: 100%; aspect-ratio: 1; object-fit: cover; border: 1.5px solid #1C1917; }
  .photo-label { font-family: Menlo, monospace; font-size: 8pt; color: #44403C; margin-top: 4px; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 2px solid #1C1917; font-family: Menlo, monospace; font-size: 8pt; color: #44403C; display: flex; justify-content: space-between; letter-spacing: 0.1em; }
  .btn-print { position: fixed; top: 10px; right: 10px; padding: 12px 24px; background: #F59E0B; color: #1C1917; border: 3px solid #1C1917; font-weight: 900; cursor: pointer; font-size: 12pt; letter-spacing: 0.08em; box-shadow: 4px 4px 0 #1C1917; }
  .btn-print:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 #1C1917; }
  .instructions { background: #FEF3C7; border: 2px solid #F59E0B; padding: 10px 14px; margin-bottom: 20px; font-size: 10pt; color: #44403C; }
  .instructions strong { color: #1C1917; }
  @media print {
    .btn-print, .instructions { display: none; }
    body { padding: 0; }
  }
</style></head>
<body>
<button class="btn-print" onclick="window.print()">🖨 PRINT / SAVE AS PDF</button>
<div class="instructions">
  <strong>📋 How to save as PDF:</strong> Tap the PRINT button. In the print dialog, change the destination to <strong>"Save as PDF"</strong> (desktop) or <strong>"Save to Files"</strong> (mobile) — then save.
</div>
<div class="hazard-top"></div>
<div class="steel-top"></div>

<div class="header">
  <div class="company">
    ${company.logoDataUrl ? `<img src="${company.logoDataUrl}" class="logo" alt="logo" />` : ""}
    <div class="company-info">
      <div class="company-name">${esc(company.name || "4 Brothers Trucking, LLC")}</div>
      <div class="company-meta">
        ${company.address ? esc(company.address) + "<br>" : ""}
        ${[company.phone, company.email].filter(Boolean).map(esc).join(" · ")}
        ${company.usdot ? "<br>" + esc(company.usdot) : ""}
      </div>
    </div>
  </div>
  <div class="invoice-box">
    <h1>INVOICE</h1>
    <div># ${esc(invoice.invoiceNumber)}</div>
    <div>DATE: ${esc(invoice.invoiceDate)}</div>
    ${invoice.dueDate ? `<div>DUE: &nbsp;${esc(invoice.dueDate)}</div>` : ""}
    ${invoice.poNumber ? `<div>PO #: &nbsp;${esc(invoice.poNumber)}</div>` : ""}
  </div>
</div>

<div class="bill-to">
  <div>
    <h3>BILL TO</h3>
    <div class="name">${esc(invoice.billToName || "—")}</div>
    <div class="info">
      ${invoice.billToAddress ? esc(invoice.billToAddress) + "<br>" : ""}
      ${invoice.billToContact ? esc(invoice.billToContact) : ""}
    </div>
  </div>
  <div>
    <h3>JOB / REFERENCE</h3>
    <div class="info">${esc(invoice.jobReference || "—")}</div>
  </div>
</div>

<table class="items">
  <thead>
    <tr>
      <th>FB #</th><th>DATE</th><th>TRUCK</th><th>DRIVER</th>
      <th class="r">QTY</th><th>UNIT</th><th class="r">RATE</th><th class="r">AMOUNT</th>
    </tr>
  </thead>
  <tbody>${rowsHtml}</tbody>
</table>

<table class="totals">
  <tbody>
    <tr><td class="label">SUBTOTAL</td><td class="val">${money(subtotal)}</td></tr>
    ${fbExtrasSum > 0 ? `<tr><td class="label">FB EXTRAS (TOLLS · DUMP · FUEL · OTHER)</td><td class="val">${money(fbExtrasSum)}</td></tr>` : ""}
    ${(invoice.extras || []).filter((x) => Number(x.amount) !== 0).map((x) => `<tr><td class="label">${esc((x.label || "ADDITIONAL").toUpperCase())}</td><td class="val">${money(Number(x.amount) || 0)}</td></tr>`).join("")}
    ${extraFees !== 0 ? `<tr><td class="label">${esc(invoice.extraFeesLabel || "ADDITIONAL FEES")}</td><td class="val">${money(extraFees)}</td></tr>` : ""}
    ${discount !== 0 ? `<tr><td class="label">DISCOUNT</td><td class="val">-${money(discount)}</td></tr>` : ""}
    <tr class="total"><td class="label">TOTAL DUE</td><td class="val">${money(total)}</td></tr>
  </tbody>
</table>

${(invoice.terms || invoice.notes) ? `<div class="notes-wrap">
  ${invoice.terms ? `<div><h4>PAYMENT TERMS</h4><p>${esc(invoice.terms)}</p></div>` : "<div></div>"}
  ${invoice.notes ? `<div><h4>NOTES</h4><p>${esc(invoice.notes)}</p></div>` : "<div></div>"}
</div>` : ""}

${photosHtml}

<div class="footer">
  <span>${esc(company.name || "4 Brothers Trucking, LLC")}</span>
  <span>INVOICE ${esc(invoice.invoiceNumber)}</span>
</div>
</body></html>`;

  const w = window.open("", "_blank", "width=850,height=1100");
  if (!w) throw new Error("Popup blocked — please allow popups to generate invoices.");
  w.document.write(html);
  w.document.close();
  return { opened: true };
};

// ========== COMPANY PROFILE MODAL ==========
const CompanyProfileModal = ({ company, onSave, onClose, onToast }) => {
  const [draft, setDraft] = useState({ ...company });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogo = async (files) => {
    if (!files || files.length === 0) return;
    setUploadingLogo(true);
    try {
      const dataUrl = await compressImage(files[0], 400, 0.85);
      setDraft({ ...draft, logoDataUrl: dataUrl });
    } catch (e) { console.warn(e); }
    setUploadingLogo(false);
  };

  const save = async () => {
    await onSave(draft);
    onToast("COMPANY PROFILE SAVED");
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Building2 size={18} /> COMPANY PROFILE
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div>
            <label className="fbt-label">Company Name</label>
            <input className="fbt-input" value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="4 Brothers Trucking, LLC" />
          </div>
          <div>
            <label className="fbt-label">Address</label>
            <input className="fbt-input" value={draft.address || ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Bay Point, CA 94565" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Phone</label>
              <input className="fbt-input" value={draft.phone || ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className="fbt-label">Email</label>
              <input className="fbt-input" value={draft.email || ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="[email protected]" />
            </div>
          </div>
          <div>
            <label className="fbt-label">USDOT / MC # (optional)</label>
            <input className="fbt-input" value={draft.usdot || ""} onChange={(e) => setDraft({ ...draft, usdot: e.target.value })} placeholder="USDOT 1234567 · CA MCP" />
          </div>
          <div style={{ padding: 12, background: "#F0FDF4", border: "2px solid var(--good)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700 }}>
              ▸ TAX / PAYROLL IDENTIFIERS (SHOWN ON PAY STUBS & 1099s)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="fbt-label">Federal EIN</label>
                <input className="fbt-input" value={draft.ein || ""} onChange={(e) => setDraft({ ...draft, ein: e.target.value })} placeholder="XX-XXXXXXX" />
              </div>
              <div>
                <label className="fbt-label">CA Employer ID (EDD)</label>
                <input className="fbt-input" value={draft.caEmployerId || ""} onChange={(e) => setDraft({ ...draft, caEmployerId: e.target.value })} placeholder="123-4567-8" />
              </div>
            </div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8 }}>
              ▸ APPEARS ON PAY STUBS FOR 1099 MATCHING · STORED LOCALLY
            </div>
          </div>
          <div>
            <label className="fbt-label">Logo / Letterhead</label>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              {draft.logoDataUrl ? (
                <img src={draft.logoDataUrl} alt="logo" style={{ width: 80, height: 80, objectFit: "contain", border: "2px solid var(--steel)", background: "#FFF" }} />
              ) : (
                <div style={{ width: 80, height: 80, border: "2px dashed var(--concrete)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--concrete)" }}>
                  <Building2 size={24} />
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                <label className="btn-ghost" style={{ cursor: "pointer" }}>
                  <Upload size={14} style={{ marginRight: 6 }} /> {uploadingLogo ? "PROCESSING…" : draft.logoDataUrl ? "REPLACE LOGO" : "UPLOAD LOGO"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleLogo(e.target.files)} />
                </label>
                {draft.logoDataUrl && (
                  <button className="btn-danger" onClick={() => setDraft({ ...draft, logoDataUrl: null })}>REMOVE LOGO</button>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="fbt-label">Default Payment Terms</label>
            <textarea className="fbt-textarea" value={draft.defaultTerms || ""} onChange={(e) => setDraft({ ...draft, defaultTerms: e.target.value })} placeholder="Net 30. Remit by check or ACH. Late payments subject to 1.5% monthly finance charge." />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <button onClick={save} className="btn-primary"><CheckCircle2 size={16} /> SAVE PROFILE</button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== INVOICES TAB ==========
// ========== RECORD PAYMENT MODAL ==========
const RecordPaymentModal = ({ invoice, freightBills, editFreightBill, setInvoices, invoices, onClose, onToast }) => {
  const invFbs = (invoice.freightBillIds || []).map((id) => freightBills.find((fb) => fb.id === id)).filter(Boolean);
  const balance = (Number(invoice.total) || 0) - (Number(invoice.amountPaid) || 0);

  const [mode, setMode] = useState("full"); // 'full' | 'perfb'
  const [form, setForm] = useState({
    amount: balance.toFixed(2),
    date: new Date().toISOString().slice(0, 10),
    method: "check",
    reference: "",
    notes: "",
  });
  const [checkedFbs, setCheckedFbs] = useState(() => {
    const m = {};
    invFbs.forEach((fb) => { m[fb.id] = false; });
    return m;
  });
  const [saving, setSaving] = useState(false);

  // For per-FB mode, estimate the per-FB gross within this invoice
  // (uses the invoice's pricing method/rate since we don't have line-level totals stored)
  const fbEstimate = (fb) => {
    const method = invoice.pricingMethod || "ton";
    const rate = Number(invoice.rate) || 0;
    let qty = 0;
    if (method === "ton") qty = Number(fb.tonnage) || 0;
    else if (method === "load") qty = Number(fb.loadCount) || 1;
    else if (method === "hour") {
      if (fb.hoursBilled) qty = Number(fb.hoursBilled);
      else if (fb.pickupTime && fb.dropoffTime) {
        const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
        const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
        if (!isNaN(h1) && !isNaN(h2)) {
          const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (mins > 0) qty = mins / 60;
        }
      }
    }
    return qty * rate;
  };

  // Auto-calc amount from checked FBs in per-FB mode
  const perFbTotal = useMemo(() => {
    if (mode !== "perfb") return 0;
    return invFbs.filter((fb) => checkedFbs[fb.id]).reduce((s, fb) => s + fbEstimate(fb), 0);
  }, [checkedFbs, mode, invFbs]);

  useEffect(() => {
    if (mode === "perfb") {
      setForm((f) => ({ ...f, amount: perFbTotal.toFixed(2) }));
    } else {
      setForm((f) => ({ ...f, amount: balance.toFixed(2) }));
    }
  }, [mode, perFbTotal]);

  const proceed = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { onToast("ENTER AMOUNT"); return; }
    if (mode === "perfb" && Object.values(checkedFbs).every((v) => !v)) {
      onToast("SELECT AT LEAST ONE FB"); return;
    }

    setSaving(true);
    try {
      // 1. Stamp each selected FB (or all if full) with customer_paid_at + amount (prorated)
      const fbsToStamp = mode === "full"
        ? invFbs.filter((fb) => !fb.customerPaidAt) // skip already paid
        : invFbs.filter((fb) => checkedFbs[fb.id]);

      if (fbsToStamp.length > 0) {
        const baseSum = fbsToStamp.reduce((s, fb) => s + fbEstimate(fb), 0);
        for (const fb of fbsToStamp) {
          const share = baseSum > 0 ? (fbEstimate(fb) / baseSum) * amt : amt / fbsToStamp.length;
          await editFreightBill(fb.id, {
            ...fb,
            customerPaidAt: new Date(form.date).toISOString(),
            customerPaidAmount: Number(share.toFixed(2)),
          });
        }
      }

      // 2. Update invoice: append to payment_history + recompute amount_paid
      const newPayment = {
        date: new Date(form.date).toISOString(),
        amount: amt,
        method: form.method,
        reference: form.reference || "",
        notes: form.notes || "",
        fbIds: fbsToStamp.map((fb) => fb.id),
        mode,
      };
      const newHistory = [...(invoice.paymentHistory || []), newPayment];
      const newAmountPaid = newHistory.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const newTotal = Number(invoice.total) || 0;
      let newStatus = "outstanding";
      if (newTotal > 0 && newAmountPaid >= newTotal - 0.01) newStatus = "paid";
      else if (newAmountPaid > 0) newStatus = "partial";

      // Use direct updateInvoice since setInvoices diff-logic relies on object mutation
      try {
        const { updateInvoice } = await import("./db");
        await updateInvoice(invoice.id, {
          ...invoice,
          amountPaid: newAmountPaid,
          paymentHistory: newHistory,
          paymentStatus: newStatus,
        });
      } catch (e) {
        console.error("updateInvoice failed:", e);
      }

      onToast(`✓ PAYMENT RECORDED — ${fmt$(amt)}`);
      onClose();
    } catch (e) {
      console.error(e);
      onToast("RECORD PAYMENT FAILED");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)" }}>RECORD CUSTOMER PAYMENT</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>{invoice.invoiceNumber}</h3>
            <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1", marginTop: 2 }}>
              {invoice.billToName} · Total {fmt$(invoice.total)} · Balance {fmt$(balance)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 14 }}>
          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setMode("full")}
              className={mode === "full" ? "btn-primary" : "btn-ghost"}
              style={{ flex: 1, padding: "10px", fontSize: 11 }}
            >
              FULL INVOICE PAID
            </button>
            <button
              onClick={() => setMode("perfb")}
              className={mode === "perfb" ? "btn-primary" : "btn-ghost"}
              style={{ flex: 1, padding: "10px", fontSize: 11 }}
            >
              PARTIAL (PICK FBs)
            </button>
          </div>

          {/* Per-FB checklist */}
          {mode === "perfb" && (
            <div style={{ padding: 10, border: "1.5px solid var(--steel)", background: "#F5F5F4", maxHeight: 280, overflowY: "auto" }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8 }}>
                ▸ CHECK WHICH FBs THE CUSTOMER PAID FOR
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 10, padding: "4px 8px" }}
                  onClick={() => { const m = {}; invFbs.forEach((fb) => { m[fb.id] = !fb.customerPaidAt; }); setCheckedFbs(m); }}
                >
                  CHECK ALL UNPAID
                </button>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 10, padding: "4px 8px" }}
                  onClick={() => { const m = {}; invFbs.forEach((fb) => { m[fb.id] = false; }); setCheckedFbs(m); }}
                >
                  CLEAR
                </button>
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {invFbs.map((fb) => {
                  const alreadyPaid = !!fb.customerPaidAt;
                  const est = fbEstimate(fb);
                  return (
                    <label
                      key={fb.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                        background: alreadyPaid ? "#E5E7EB" : "#FFF", border: "1px solid var(--steel)",
                        opacity: alreadyPaid ? 0.6 : 1, cursor: alreadyPaid ? "not-allowed" : "pointer",
                        fontSize: 11, fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!checkedFbs[fb.id]}
                        disabled={alreadyPaid}
                        onChange={(e) => setCheckedFbs({ ...checkedFbs, [fb.id]: e.target.checked })}
                      />
                      <span style={{ flex: 1 }}>
                        <strong>FB#{fb.freightBillNumber || "—"}</strong> · {fb.driverName || "—"}
                        {alreadyPaid && <span style={{ color: "var(--good)", marginLeft: 6 }}>✓ ALREADY PAID</span>}
                      </span>
                      <span style={{ fontWeight: 700 }}>{fmt$(est)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Date Received</label>
              <input className="fbt-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Amount Received $</label>
              <input className="fbt-input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Method</label>
              <select className="fbt-select" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option value="check">Check</option>
                <option value="ach">ACH / Wire</option>
                <option value="cash">Cash</option>
                <option value="zelle">Zelle</option>
                <option value="venmo">Venmo</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="fbt-label">Reference / Check #</label>
              <input className="fbt-input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. 1024 or confirmation #" />
            </div>
          </div>

          <div>
            <label className="fbt-label">Notes</label>
            <textarea className="fbt-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Short-pay reason, dispute notes, etc." style={{ minHeight: 50 }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={proceed} disabled={saving} className="btn-primary" style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}>
              <CheckCircle2 size={16} /> RECORD PAYMENT
            </button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== INVOICE VIEW MODAL (payment history) ==========
const InvoiceViewModal = ({ invoice, freightBills, contacts = [], dispatches = [], onJumpToPayroll, onClose, onToast }) => {
  const invFbs = (invoice.freightBillIds || []).map((id) => freightBills.find((fb) => fb.id === id)).filter(Boolean);
  const history = invoice.paymentHistory || [];
  const balance = (Number(invoice.total) || 0) - (Number(invoice.amountPaid) || 0);

  // Compute payroll status for each FB — who got paid, what's still owed
  const payrollByFb = invFbs.map((fb) => {
    const dispatch = dispatches.find((d) => d.id === fb.dispatchId);
    const assignment = (dispatch?.assignments || []).find((a) => a.aid === fb.assignmentId);
    const contact = assignment?.contactId ? contacts.find((c) => c.id === assignment.contactId) : null;
    const subName = assignment?.name || "—";
    const isPaid = !!fb.paidAt;
    return {
      fb,
      assignment,
      contact,
      subName,
      subKind: assignment?.kind,
      isPaid,
      paidAmount: fb.paidAmount,
      paidMethod: fb.paidMethod,
      paidCheckNumber: fb.paidCheckNumber,
      paidAt: fb.paidAt,
    };
  });

  // Group by sub for summary
  const payrollBySub = new Map();
  payrollByFb.forEach((p) => {
    if (!p.assignment) return;
    const key = p.assignment.contactId || `anon_${p.assignment.aid}`;
    if (!payrollBySub.has(key)) {
      payrollBySub.set(key, { name: p.subName, kind: p.subKind, subId: p.assignment.contactId, fbs: [], paidCount: 0, unpaidCount: 0, paidTotal: 0 });
    }
    const e = payrollBySub.get(key);
    e.fbs.push(p);
    if (p.isPaid) { e.paidCount++; e.paidTotal += Number(p.paidAmount) || 0; }
    else e.unpaidCount++;
  });
  const payrollSummary = Array.from(payrollBySub.values());

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)" }}>INVOICE DETAILS</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>{invoice.invoiceNumber}</h3>
            <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1", marginTop: 2 }}>
              {invoice.billToName} · Total {fmt$(invoice.total)} · Paid {fmt$(invoice.amountPaid || 0)} · Balance {fmt$(balance)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 16 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ PAYMENT HISTORY</div>
            {history.length === 0 ? (
              <div style={{ padding: 18, textAlign: "center", background: "#F5F5F4", fontSize: 12, color: "var(--concrete)" }}>
                No payments recorded yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 4 }}>
                {history.map((p, idx) => (
                  <div key={idx} style={{ padding: 10, background: "#F0FDF4", border: "1.5px solid var(--good)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <strong>{fmt$(p.amount)}</strong> · {p.date ? new Date(p.date).toLocaleDateString() : "—"} · {p.method?.toUpperCase()}{p.reference ? ` #${p.reference}` : ""}
                      {p.mode === "perfb" && p.fbIds?.length > 0 && <span style={{ color: "var(--concrete)" }}> · {p.fbIds.length} FB{p.fbIds.length !== 1 ? "s" : ""}</span>}
                      {p.notes && <div style={{ color: "var(--concrete)", fontSize: 11, marginTop: 2, fontStyle: "italic" }}>"{p.notes}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ FREIGHT BILLS ON THIS INVOICE ({invFbs.length})</div>
            <div style={{ display: "grid", gap: 4, maxHeight: 300, overflowY: "auto" }}>
              {invFbs.map((fb) => {
                const paid = !!fb.customerPaidAt;
                return (
                  <div key={fb.id} style={{ padding: 8, background: paid ? "#F0FDF4" : "#FEF3C7", border: "1px solid var(--steel)", borderLeft: `3px solid ${paid ? "var(--good)" : "var(--hazard)"}`, fontSize: 11, fontFamily: "JetBrains Mono, monospace", display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <strong>FB#{fb.freightBillNumber || "—"}</strong> · {fb.driverName || "—"}{fb.truckNumber ? ` · T${fb.truckNumber}` : ""}
                      <div style={{ color: "var(--concrete)", fontSize: 10, marginTop: 2 }}>
                        {fb.tonnage ? `${fb.tonnage}T` : ""}
                        {fb.loadCount ? ` · ${fb.loadCount} loads` : ""}
                        {fb.hoursBilled ? ` · ${fb.hoursBilled} hrs` : ""}
                      </div>
                    </div>
                    {paid ? (
                      <div style={{ color: "var(--good)", fontWeight: 700, whiteSpace: "nowrap" }}>
                        ✓ {fb.customerPaidAt.slice(0, 10)}
                        {fb.customerPaidAmount != null && <div style={{ fontSize: 10 }}>{fmt$(fb.customerPaidAmount)}</div>}
                      </div>
                    ) : (
                      <span style={{ color: "var(--hazard-deep)", fontWeight: 700, fontSize: 10 }}>UNPAID</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PAYROLL STATUS — subs/drivers who worked this invoice */}
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ PAYROLL STATUS — SUBS/DRIVERS WHO WORKED THIS INVOICE ({payrollSummary.length})</div>
            {payrollSummary.length === 0 ? (
              <div style={{ padding: 12, background: "#F5F5F4", fontSize: 11, color: "var(--concrete)", fontStyle: "italic" }}>
                No assignments linked to these FBs.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {payrollSummary.map((p, idx) => {
                  const allPaid = p.unpaidCount === 0 && p.paidCount > 0;
                  const bg = allPaid ? "#F0FDF4" : p.paidCount > 0 ? "#FEF3C7" : "#FEE2E2";
                  const borderColor = allPaid ? "var(--good)" : p.paidCount > 0 ? "var(--hazard)" : "var(--safety)";
                  return (
                    <div
                      key={idx}
                      onClick={() => p.subId && onJumpToPayroll && onJumpToPayroll(p.subId)}
                      style={{
                        padding: 10, background: bg, border: "1.5px solid " + borderColor,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        flexWrap: "wrap", gap: 8, fontSize: 12, fontFamily: "JetBrains Mono, monospace",
                        cursor: p.subId && onJumpToPayroll ? "pointer" : "default",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <span className="chip" style={{ background: p.kind === "driver" ? "#FFF" : "var(--hazard)", fontSize: 9, padding: "2px 7px", marginRight: 6 }}>
                          {p.kind === "driver" ? "DRIVER" : "SUB"}
                        </span>
                        <strong>{p.name}</strong>
                        <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                          {p.paidCount > 0 && `${p.paidCount} paid · `}
                          {p.unpaidCount > 0 && `${p.unpaidCount} unpaid · `}
                          {p.fbs.length} FB{p.fbs.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {allPaid ? (
                          <div style={{ color: "var(--good)", fontWeight: 700, fontSize: 11 }}>✓ PAID {fmt$(p.paidTotal)}</div>
                        ) : p.paidCount > 0 ? (
                          <div>
                            <div style={{ color: "var(--hazard-deep)", fontWeight: 700, fontSize: 11 }}>PARTIAL</div>
                            <div style={{ fontSize: 10, color: "var(--concrete)" }}>{p.unpaidCount} still owed</div>
                          </div>
                        ) : (
                          <div style={{ color: "var(--safety)", fontWeight: 700, fontSize: 11 }}>UNPAID</div>
                        )}
                        {p.subId && onJumpToPayroll && (
                          <div style={{ fontSize: 9, color: "var(--concrete)", marginTop: 2, letterSpacing: "0.08em" }}>TAP TO VIEW ▸</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} className="btn-ghost">CLOSE</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== INVOICES TAB ==========
const InvoicesTab = ({ freightBills, dispatches, invoices, setInvoices, createInvoice, company, setCompany, contacts = [], projects = [], editFreightBill, pendingInvoice, clearPendingInvoice, onJumpToPayroll, onToast }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [pricingMethod, setPricingMethod] = useState("ton");
  const [rate, setRate] = useState("");
  const [billTo, setBillTo] = useState({ id: "", name: "", address: "", contact: "" });
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);

  // Auto-open invoice detail when jumping from home dashboard
  useEffect(() => {
    if (pendingInvoice) {
      const inv = invoices.find((i) => i.id === pendingInvoice || i.invoiceNumber === pendingInvoice);
      if (inv) setViewingInvoice(inv);
      if (clearPendingInvoice) clearPendingInvoice();
    }
  }, [pendingInvoice, invoices]);
  const [jobRef, setJobRef] = useState("");
  const [projectId, setProjectId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [terms, setTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [extraFees, setExtraFees] = useState("");
  const [extraFeesLabel, setExtraFeesLabel] = useState("");
  const [extras, setExtras] = useState([]); // [{label, amount}, ...]
  const [discount, setDiscount] = useState("");
  const [includePhotos, setIncludePhotos] = useState(true);
  const [hoursOverride, setHoursOverride] = useState({}); // fb.id -> hours for "per hour" pricing
  const [includeUnapproved, setIncludeUnapproved] = useState(false);
  const [showAlreadyInvoiced, setShowAlreadyInvoiced] = useState(false);

  useEffect(() => {
    if (company?.defaultTerms && !terms) setTerms(company.defaultTerms);
  }, [company]);

  // Helper: compute effective hours for an FB (admin-corrected takes priority)
  const effectiveHours = (fb) => {
    if (fb.hoursBilled !== null && fb.hoursBilled !== undefined && fb.hoursBilled !== "") return Number(fb.hoursBilled);
    // Fall back to pickup→dropoff
    if (fb.pickupTime && fb.dropoffTime) {
      const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
      const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
      if (!isNaN(h1) && !isNaN(h2)) {
        const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (mins > 0) return mins / 60;
      }
    }
    return 0;
  };

  // Billable hours for INVOICE — applies project minimum ONLY if admin has acknowledged
  // On the PAYROLL side we continue to use actual hours (effectiveHours).
  const billableHoursForInvoice = (fb) => {
    // v16 PREFERRED: if FB has billingLines with a HOURLY line, use that qty (admin-approved value)
    if (Array.isArray(fb.billingLines) && fb.billingLines.length > 0) {
      const hourLine = fb.billingLines.find((ln) => ln.code === "H");
      if (hourLine) return Number(hourLine.qty) || 0;
      return 0; // no hourly line on this FB — not an hour-billed FB
    }
    // LEGACY: derive from times
    const actual = effectiveHours(fb);
    if (!fb.minHoursApplied) return actual;
    const d = dispatches.find((x) => x.id === fb.dispatchId);
    const project = projects.find((p) => p.id === d?.projectId);
    const minH = Number(project?.minimumHours) || 0;
    if (minH > 0 && actual < minH) return minH;
    return actual;
  };

  // Filter freight bills by date + client (dispatch sub/job) + APPROVED status + invoice binding
  const matchedBills = useMemo(() => {
    return freightBills.filter((fb) => {
      // Only approved FBs unless explicitly opted in
      const status = fb.status || "pending";
      if (!includeUnapproved && status !== "approved") return false;
      // Always hide rejected
      if (status === "rejected") return false;

      // HARD BLOCK: Skip FBs already locked to another invoice (prevents double-billing)
      if (fb.invoiceId) return false;

      const fbDate = fb.submittedAt ? fb.submittedAt.slice(0, 10) : "";
      if (fromDate && fbDate < fromDate) return false;
      if (toDate && fbDate > toDate) return false;

      const disp = dispatches.find((d) => d.id === fb.dispatchId);

      // Customer filter — match by customer contact id on the dispatch
      if (clientFilter) {
        if (String(disp?.clientId) !== String(clientFilter)) return false;
      }

      // Project filter — match by project id on the dispatch
      if (projectId) {
        if (String(disp?.projectId) !== String(projectId)) return false;
      }

      return true;
    });
  }, [freightBills, dispatches, fromDate, toDate, clientFilter, projectId, includeUnapproved]);

  // When matchedBills change, auto-populate hoursOverride from fb.hoursBilled (if empty)
  useEffect(() => {
    setHoursOverride((prev) => {
      const next = { ...prev };
      let changed = false;
      matchedBills.forEach((fb) => {
        // Only auto-fill if user hasn't typed anything yet
        if (next[fb.id] === undefined || next[fb.id] === "") {
          const h = billableHoursForInvoice(fb);
          if (h > 0) {
            next[fb.id] = h.toFixed(2);
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [matchedBills]);

  const previewTotals = useMemo(() => {
    const r = Number(rate) || 0;
    let subtotal = 0;
    let fbExtrasSum = 0;
    let billingAdjSum = 0;

    matchedBills.forEach((fb) => {
      // v16 PREFERRED PATH: use billingLines[] sum(net) as authoritative FB billing total
      const hasLines = Array.isArray(fb.billingLines) && fb.billingLines.length > 0;

      if (hasLines) {
        // Sum the net of every billing line (already computed with brokerage if applicable)
        const linesTotal = fb.billingLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
        subtotal += linesTotal;
        // billingLines replaces extras + adjustments, so don't double-count
        return;
      }

      // LEGACY PATH: old snapshot + extras + adjustments (pre-v16 FBs)
      const hasSnapshot = fb.billedRate != null && fb.billedMethod;
      let qty = 0;
      let fbRate = r;
      const method = hasSnapshot ? fb.billedMethod : pricingMethod;

      if (hasSnapshot) {
        if (method === "ton") qty = Number(fb.billedTons) || 0;
        else if (method === "load") qty = Number(fb.billedLoads) || 0;
        else if (method === "hour") qty = Number(fb.billedHours) || 0;
        if (pricingMethod === "hour" && hoursOverride[fb.id] !== undefined && hoursOverride[fb.id] !== "") {
          qty = Number(hoursOverride[fb.id]) || 0;
        }
      } else {
        if (pricingMethod === "ton") qty = Number(fb.tonnage) || 0;
        else if (pricingMethod === "load") qty = Number(fb.loadCount) || 1;
        else if (pricingMethod === "hour") {
          const manual = hoursOverride[fb.id];
          if (manual !== undefined && manual !== "") qty = Number(manual) || 0;
          else qty = billableHoursForInvoice(fb);
        }
      }
      subtotal += qty * fbRate;

      // Legacy billing adjustments
      billingAdjSum += (fb.billingAdjustments || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);

      // Legacy reimbursable FB-level extras
      (fb.extras || []).forEach((x) => {
        if (x.reimbursable !== false) fbExtrasSum += Number(x.amount) || 0;
      });
    });

    const ef = Number(extraFees) || 0;
    const extrasSum = (extras || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const d = Number(discount) || 0;
    return {
      subtotal, extrasSum, fbExtrasSum, billingAdjSum,
      total: subtotal + ef + extrasSum + fbExtrasSum + billingAdjSum - d,
    };
  }, [matchedBills, rate, pricingMethod, hoursOverride, extraFees, discount, extras]);

  // Reconciliation check — any source order for these FBs that isn't reconciled?
  const reconcileIssues = useMemo(() => {
    const orderIds = [...new Set(matchedBills.map((fb) => fb.dispatchId))];
    return orderIds
      .map((id) => dispatches.find((d) => d.id === id))
      .filter(Boolean)
      .filter((d) => !d.reconciledAt) // only unreconciled
      .map((d) => {
        const submitted = matchedBills.filter((fb) => fb.dispatchId === d.id).length;
        const total = freightBills.filter((fb) => fb.dispatchId === d.id).length;
        const expected = Number(d.trucksExpected) || 1;
        const noShow = Number(d.noShowCount) || 0;
        const unresolved = expected - (total + noShow);
        return { dispatch: d, submitted, total, expected, noShow, unresolved };
      });
  }, [matchedBills, dispatches, freightBills]);

  // Auto-recall rate from source orders / project
  const suggestedRateInfo = useMemo(() => {
    // Collect rates in priority: FB.customerRate > project.defaultRate > order.ratePerHour/ratePerTon
    const perFbRates = matchedBills.map((fb) => {
      // 1. Per-FB snapshot (set after last invoice)
      if (fb.customerRate && fb.customerRateMethod === pricingMethod) {
        return { rate: Number(fb.customerRate), source: `Previous invoice snapshot`, fbNum: fb.freightBillNumber };
      }
      // 2. Project default
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      const project = projects.find((p) => p.id === d?.projectId);
      if (project?.defaultRate) {
        return { rate: Number(project.defaultRate), source: `Project "${project.name}"`, fbNum: fb.freightBillNumber };
      }
      // 3. Order rate
      const orderRate = pricingMethod === "hour" ? d?.ratePerHour : d?.ratePerTon;
      if (orderRate) {
        return { rate: Number(orderRate), source: `Order #${d.code}`, fbNum: fb.freightBillNumber };
      }
      return null;
    }).filter(Boolean);

    if (perFbRates.length === 0) return { rates: [], suggested: null, mixed: false };
    const uniqueRates = [...new Set(perFbRates.map((s) => s.rate))];
    return {
      rates: perFbRates,
      suggested: uniqueRates.length === 1 ? uniqueRates[0] : null,
      mixed: uniqueRates.length > 1,
      uniqueRates,
    };
  }, [matchedBills, dispatches, projects, pricingMethod]);

  // Auto-apply suggested rate when rate field is empty
  useEffect(() => {
    if (!rate && suggestedRateInfo.suggested) {
      setRate(String(suggestedRateInfo.suggested));
    }
  }, [suggestedRateInfo.suggested]);

  // Auto-detect pricing method from the matched FBs: if most have tonnage, default to ton; else hour
  useEffect(() => {
    if (matchedBills.length === 0) return;
    // Only auto-set once (while user hasn't changed it)
    const withTon = matchedBills.filter((fb) => Number(fb.tonnage) > 0).length;
    const withHours = matchedBills.filter((fb) => billableHoursForInvoice(fb) > 0).length;
    // Prefer the method used in most FBs' source orders
    const methodFromOrders = new Map();
    matchedBills.forEach((fb) => {
      if (fb.customerRateMethod) methodFromOrders.set(fb.customerRateMethod, (methodFromOrders.get(fb.customerRateMethod) || 0) + 1);
    });
    if (methodFromOrders.size === 1) {
      const [m] = methodFromOrders.keys();
      setPricingMethod(m);
    } else if (withHours > withTon) {
      setPricingMethod("hour");
    } else if (withTon > 0) {
      setPricingMethod("ton");
    }
  }, [matchedBills.length]);

  const makeInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const existing = invoices.filter((i) => i.invoiceNumber?.startsWith(`INV-${year}-`));
    const maxN = existing.reduce((m, i) => {
      const n = parseInt(i.invoiceNumber.split("-")[2], 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return `INV-${year}-${String(maxN + 1).padStart(4, "0")}`;
  };

  const generate = async () => {
    if (matchedBills.length === 0) { onToast("NO FREIGHT BILLS MATCH FILTERS"); return; }
    if (!rate || Number(rate) <= 0) { onToast("ENTER A RATE"); return; }
    if (!billTo.name) { onToast("PICK A CUSTOMER"); return; }

    // HARD GUARD: drop any FB that's already invoiced (belt-and-suspenders — filter should have excluded them)
    const billsToInvoice = matchedBills.filter((fb) => !fb.invoiceId);
    if (billsToInvoice.length === 0) {
      onToast("ALL MATCHED FBs ARE ALREADY INVOICED");
      return;
    }
    if (billsToInvoice.length !== matchedBills.length) {
      const skipped = matchedBills.length - billsToInvoice.length;
      const ok = confirm(`${skipped} FB${skipped !== 1 ? "s" : ""} already invoiced and will be SKIPPED. Proceed with the ${billsToInvoice.length} remaining?`);
      if (!ok) return;
    }

    const invoiceNumber = makeInvoiceNumber();
    const invoiceDate = todayISO();

    const billsWithHours = billsToInvoice.map((fb) => {
      const manual = hoursOverride[fb.id];
      const qty = (manual !== undefined && manual !== "") ? Number(manual) : billableHoursForInvoice(fb);
      return { ...fb, hoursOverride: qty };
    });

    const invoice = {
      invoiceNumber,
      invoiceDate,
      dueDate,
      billToName: billTo.name,
      billToAddress: billTo.address,
      billToContact: billTo.contact,
      billToId: billTo.id || null,
      projectId: projectId || null,
      poNumber: poNumber || null,
      jobReference: jobRef,
      terms,
      notes,
      extraFees,
      extraFeesLabel,
      extras: (extras || []).filter((x) => (x.label || x.amount) && Number(x.amount) !== 0),
      discount,
      includePhotos,
      pricingMethod,
      rate,
      freightBillIds: billsToInvoice.map((fb) => fb.id),
      subtotal: previewTotals.subtotal,
      total: previewTotals.total,
      createdAt: new Date().toISOString(),
    };

    try {
      await generateInvoicePDF(invoice, company, billsWithHours, { method: pricingMethod, rate });

      // SAVE INVOICE SYNCHRONOUSLY — get real id back immediately so we can lock FBs to it
      let savedInvoice;
      if (createInvoice) {
        savedInvoice = await createInvoice(invoice);
      } else {
        // Fallback (shouldn't happen, but safe): use setInvoices path
        await setInvoices([invoice, ...invoices]);
        savedInvoice = invoice;
      }

      const realId = savedInvoice?.id;
      if (!realId) {
        onToast("⚠ INVOICE SAVED BUT FB LOCK FAILED — PLEASE REFRESH AND CHECK");
        return;
      }

      // Flow-back: lock each FB to this invoice + save rate/hours snapshots
      let hoursChanged = 0;
      let rateChanged = 0;
      const newRate = Number(rate);
      const lockStamp = new Date().toISOString();
      for (const fb of billsToInvoice) {
        const patch = { ...fb, invoiceId: realId, billingLockedAt: lockStamp };

        // Per-FB customer rate snapshot (legacy — still useful for audit)
        if (newRate > 0 && (Number(fb.customerRate) !== newRate || fb.customerRateMethod !== pricingMethod)) {
          patch.customerRate = newRate;
          patch.customerRateMethod = pricingMethod;
          rateChanged++;
        }

        // Billing snapshot — stamp from current invoice values (if not already set at approval)
        // This ensures even FBs approved before snapshot model get their billing locked in
        if (!fb.billedRate) patch.billedRate = newRate;
        if (!fb.billedMethod) patch.billedMethod = pricingMethod;
        if (pricingMethod === "hour" && fb.billedHours == null) {
          const manual = hoursOverride[fb.id];
          patch.billedHours = (manual !== undefined && manual !== "") ? Number(manual) : (Number(fb.hoursBilled) || 0);
        }
        if (pricingMethod === "ton" && fb.billedTons == null) patch.billedTons = Number(fb.tonnage) || 0;
        if (pricingMethod === "load" && fb.billedLoads == null) patch.billedLoads = Number(fb.loadCount) || 1;

        // Flow edited hours back to fb.hoursBilled (affects payroll for hour-paid subs)
        if (pricingMethod === "hour") {
          const manual = hoursOverride[fb.id];
          if (manual !== undefined && manual !== "") {
            const newHours = Number(manual);
            const oldHours = Number(fb.hoursBilled) || 0;
            if (Math.abs(newHours - oldHours) > 0.001) {
              patch.hoursBilled = newHours;
              patch.billedHours = newHours; // keep snapshot consistent
              hoursChanged++;
            }
          }
        }

        try {
          await editFreightBill(fb.id, patch);
        } catch (e) {
          console.warn("Could not update FB", fb.id, e);
        }
      }

      const msgs = [`✓ ${invoiceNumber} SAVED · ${billsToInvoice.length} FB${billsToInvoice.length !== 1 ? "S" : ""} LOCKED`];
      if (rateChanged > 0) msgs.push(`${rateChanged} RATE${rateChanged !== 1 ? "S" : ""} UPDATED`);
      if (hoursChanged > 0) msgs.push(`${hoursChanged} HOURS → PAYROLL`);
      onToast(msgs.join(" · "));
    } catch (e) {
      console.error("Invoice generation failed:", e);
      onToast(e.message || "INVOICE FAILED — ALLOW POPUPS");
    }
  };

  const reDownload = async (inv) => {
    const bills = inv.freightBillIds.map((id) => freightBills.find((fb) => fb.id === id)).filter(Boolean);
    if (bills.length === 0) { onToast("ORIGINAL FREIGHT BILLS NOT FOUND"); return; }
    try {
      await generateInvoicePDF(inv, company, bills, { method: inv.pricingMethod, rate: inv.rate });
      onToast("INVOICE REOPENED");
    } catch (e) {
      console.error(e);
      onToast(e.message || "FAILED — ALLOW POPUPS");
    }
  };

  const removeInvoice = async (invNum) => {
    const inv = invoices.find((i) => i.invoiceNumber === invNum);
    if (!inv) return;
    const affectedFbs = freightBills.filter((fb) => fb.invoiceId === inv.id);

    // STRICT CASCADE: block if invoice has been paid OR if any FB is customer-paid
    const blockers = [];
    if (Number(inv.amountPaid) > 0) {
      blockers.push(`• Payment recorded on this invoice ($${Number(inv.amountPaid).toFixed(2)}) — reverse the payment first`);
    }
    const custPaidFbs = affectedFbs.filter((fb) => fb.customerPaidAt);
    if (custPaidFbs.length > 0) {
      blockers.push(`• ${custPaidFbs.length} FB${custPaidFbs.length !== 1 ? "s" : ""} on this invoice marked customer-paid — unmark them first`);
    }

    if (blockers.length > 0) {
      alert([
        `✗ Cannot delete invoice ${invNum}.`,
        ``,
        `This invoice has downstream records:`,
        ...blockers,
        ``,
        `Clear these first, then try again.`,
      ].join("\n"));
      return;
    }

    const unlockMsg = affectedFbs.length > 0
      ? `\n\nThis will UNLOCK ${affectedFbs.length} freight bill${affectedFbs.length !== 1 ? "s" : ""} so they can be invoiced again.`
      : "";
    if (!confirm(`Delete invoice ${invNum}?${unlockMsg}\n\nThis is a SOFT delete. The invoice stays recoverable for 30 days in the Recovery tab.`)) return;
    const reason = prompt('Reason for deletion (optional):') || "";

    try {
      // 1. Unlock affected FBs — clear invoiceId and billingLockedAt so they can be invoiced again
      const unlockFailures = [];
      for (const fb of affectedFbs) {
        try {
          await editFreightBill(fb.id, {
            ...fb,
            invoiceId: null,
            billingLockedAt: null,
          });
        } catch (e) {
          console.error("Could not unlock FB", fb.id, e);
          unlockFailures.push({ fbNum: fb.freightBillNumber || fb.id, err: e?.message || String(e) });
        }
      }

      if (unlockFailures.length > 0) {
        alert(
          `⚠ Unlocked ${affectedFbs.length - unlockFailures.length} of ${affectedFbs.length} FBs.\n\nThese failed and are still locked:\n` +
          unlockFailures.map((f) => `  • FB #${f.fbNum}: ${f.err}`).join("\n") +
          "\n\nTry re-opening those FBs to force unlock manually."
        );
      }

      // 2. Soft-delete the invoice
      await deleteInvoice(inv.id, { deletedBy: "admin", reason });

      // 3. Update local state
      const next = invoices.filter((i) => i.invoiceNumber !== invNum);
      setInvoices(next);

      const toastMsg = affectedFbs.length > 0
        ? `INVOICE DELETED · ${affectedFbs.length - unlockFailures.length} FB${(affectedFbs.length - unlockFailures.length) !== 1 ? "S" : ""} UNLOCKED (RECOVERABLE 30 DAYS)`
        : "INVOICE DELETED (RECOVERABLE 30 DAYS)";
      onToast(toastMsg);
    } catch (e) {
      console.error("Soft delete invoice failed:", e);
      alert("Delete failed: " + (e?.message || String(e)));
    }
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {payingInvoice && (
        <RecordPaymentModal
          invoice={payingInvoice}
          freightBills={freightBills}
          editFreightBill={editFreightBill}
          setInvoices={setInvoices}
          invoices={invoices}
          onClose={() => setPayingInvoice(null)}
          onToast={onToast}
        />
      )}
      {viewingInvoice && (
        <InvoiceViewModal
          invoice={viewingInvoice}
          freightBills={freightBills}
          contacts={contacts}
          dispatches={dispatches}
          onJumpToPayroll={(subId) => {
            setViewingInvoice(null);
            if (onJumpToPayroll) onJumpToPayroll(subId);
          }}
          onClose={() => setViewingInvoice(null)}
          onToast={onToast}
        />
      )}
      {showProfile && <CompanyProfileModal company={company} onSave={setCompany} onClose={() => setShowProfile(false)} onToast={onToast} />}

      {/* Company profile summary */}
      <div className="fbt-card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        {company.logoDataUrl ? (
          <img src={company.logoDataUrl} alt="logo" style={{ width: 54, height: 54, objectFit: "contain", border: "2px solid var(--steel)", background: "#FFF" }} />
        ) : (
          <div style={{ width: 54, height: 54, border: "2px dashed var(--concrete)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--concrete)" }}><Building2 size={20} /></div>
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="fbt-display" style={{ fontSize: 18 }}>{company.name || "SET COMPANY NAME"}</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
            {[company.address, company.phone, company.email].filter(Boolean).join("  ·  ") || "CLICK EDIT TO ADD YOUR BUSINESS INFO"}
          </div>
        </div>
        <button className="btn-ghost" onClick={() => setShowProfile(true)}>
          <Settings size={14} style={{ marginRight: 6 }} /> EDIT PROFILE
        </button>
      </div>

      {/* Builder */}
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 8, height: 24, background: "var(--hazard)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>NEW INVOICE</h3>
        </div>

        {/* Filters */}
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ 01 / SELECT FREIGHT BILLS — PICK CUSTOMER + DATE RANGE (ALL FB FIELDS AUTO-PULL)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
          <div><label className="fbt-label">From Date</label><input className="fbt-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
          <div><label className="fbt-label">To Date</label><input className="fbt-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
          <div>
            <label className="fbt-label">Customer</label>
            <select
              className="fbt-select"
              value={clientFilter || ""}
              onChange={(e) => {
                const id = e.target.value;
                setClientFilter(id);
                // Auto-fill Bill-To from selected customer
                if (id) {
                  const c = contacts.find((x) => String(x.id) === id);
                  if (c) {
                    setBillTo({
                      id: c.id,
                      name: c.companyName || c.contactName || "",
                      address: c.address || "",
                      contact: c.contactName || "",
                    });
                  }
                } else {
                  setBillTo({ id: "", name: "", address: "", contact: "" });
                }
                // Reset project when customer changes
                setProjectId("");
              }}
            >
              <option value="">— All customers —</option>
              {contacts.filter((c) => c.type === "customer").map((c) => (
                <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fbt-label">Project {clientFilter ? "(auto-fills PO# + Ref)" : "(pick customer first)"}</label>
            <select
              className="fbt-select"
              value={projectId || ""}
              onChange={(e) => {
                const id = e.target.value;
                setProjectId(id);
                if (id) {
                  const p = projects.find((x) => String(x.id) === id);
                  if (p) {
                    if (p.poNumber) setPoNumber(p.poNumber);
                    if (p.name) setJobRef(`${p.contractNumber ? p.contractNumber + " — " : ""}${p.name}`);
                  }
                }
              }}
              disabled={!clientFilter}
            >
              <option value="">— All projects —</option>
              {projects.filter((p) => !clientFilter || String(p.customerId) === String(clientFilter)).map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.poNumber ? ` · PO ${p.poNumber}` : ""}{p.defaultRate ? ` · $${p.defaultRate}/hr` : ""}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Approval filter */}
        <div style={{ padding: 10, background: includeUnapproved ? "#FEF2F2" : "#F0FDF4", border: "2px solid " + (includeUnapproved ? "var(--safety)" : "var(--good)"), marginBottom: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
            <input
              type="checkbox"
              checked={!includeUnapproved}
              onChange={(e) => setIncludeUnapproved(!e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <ShieldCheck size={14} style={{ color: includeUnapproved ? "var(--concrete)" : "var(--good)" }} />
            <strong>APPROVED FREIGHT BILLS ONLY</strong>
          </label>
          {includeUnapproved && (
            <span className="fbt-mono" style={{ fontSize: 10, color: "var(--safety)", letterSpacing: "0.1em", marginLeft: "auto" }}>
              ⚠ INCLUDING PENDING FBs
            </span>
          )}
        </div>

        {/* Locked FBs reference — already on another invoice (read-only view) */}
        {(() => {
          // Find FBs that would match filters EXCEPT they're already invoiced
          const lockedFbs = freightBills.filter((fb) => {
            if (!fb.invoiceId) return false;
            const status = fb.status || "pending";
            if (!includeUnapproved && status !== "approved") return false;
            if (status === "rejected") return false;
            const fbDate = fb.submittedAt ? fb.submittedAt.slice(0, 10) : "";
            if (fromDate && fbDate < fromDate) return false;
            if (toDate && fbDate > toDate) return false;
            const disp = dispatches.find((d) => d.id === fb.dispatchId);
            if (clientFilter && String(disp?.clientId) !== String(clientFilter)) return false;
            if (projectId && String(disp?.projectId) !== String(projectId)) return false;
            return true;
          });
          if (lockedFbs.length === 0) return null;
          return (
            <div style={{ padding: 10, background: "#F5F5F4", border: "2px dashed var(--concrete)", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em" }}
                onClick={() => setShowAlreadyInvoiced(!showAlreadyInvoiced)}>
                <Lock size={14} style={{ color: "var(--concrete)" }} />
                <strong>{lockedFbs.length} FB{lockedFbs.length !== 1 ? "S" : ""} ALREADY ON ANOTHER INVOICE (BLOCKED)</strong>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--concrete)" }}>{showAlreadyInvoiced ? "▲ HIDE" : "▼ SHOW"}</span>
              </div>
              {showAlreadyInvoiced && (
                <div style={{ display: "grid", gap: 4, marginTop: 8, maxHeight: 180, overflowY: "auto" }}>
                  {lockedFbs.map((fb) => {
                    const inv = invoices.find((i) => i.id === fb.invoiceId);
                    return (
                      <div key={fb.id} style={{
                        padding: 6,
                        background: "#FFF",
                        border: "1px solid var(--concrete)",
                        fontSize: 11,
                        fontFamily: "JetBrains Mono, monospace",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        opacity: 0.7,
                      }}>
                        <span>
                          <Lock size={10} style={{ color: "var(--concrete)", marginRight: 4 }} />
                          FB#{fb.freightBillNumber || "—"} · {fb.driverName || "—"}
                        </span>
                        <span className="chip" style={{ background: "var(--steel)", color: "var(--cream)", fontSize: 9, padding: "2px 6px" }}>
                          🔒 ON {inv?.invoiceNumber || "INVOICE"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        <div style={{ padding: 12, background: matchedBills.length > 0 ? "#FEF3C7" : "#F5F5F4", border: "2px solid var(--steel)", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {matchedBills.length === 0 ? "NO MATCHES" : `${matchedBills.length} FREIGHT BILL${matchedBills.length !== 1 ? "S" : ""} MATCHED`}
          </div>
          {matchedBills.length > 0 && (
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
              TOTAL TONS: {matchedBills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0).toFixed(1)}
              {" · "}TOTAL LOADS: {matchedBills.reduce((s, fb) => s + (Number(fb.loadCount) || 0), 0)}
              {" · "}TOTAL HRS: {matchedBills.reduce((s, fb) => s + effectiveHours(fb), 0).toFixed(2)}
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ 02 / PRICING</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 14 }}>
          <div>
            <label className="fbt-label">Method</label>
            <select className="fbt-select" value={pricingMethod} onChange={(e) => setPricingMethod(e.target.value)}>
              <option value="ton">Per Ton (tonnage × rate)</option>
              <option value="load">Per Load (count × rate)</option>
              <option value="hour">Per Hour (enter hours per truck)</option>
            </select>
          </div>
          <div>
            <label className="fbt-label">Rate {pricingMethod === "ton" ? "$/ton" : pricingMethod === "load" ? "$/load" : "$/hr"}</label>
            <input className="fbt-input" type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={pricingMethod === "hour" ? "142.00" : "0.00"} />
            {/* Auto-rate suggestion */}
            {matchedBills.length > 0 && suggestedRateInfo.rates.length > 0 && (
              <div className="fbt-mono" style={{ fontSize: 10, color: suggestedRateInfo.mixed ? "var(--hazard-deep)" : "var(--good)", marginTop: 4 }}>
                {suggestedRateInfo.mixed ? (
                  <>⚠ MIXED RATES DETECTED: ${suggestedRateInfo.uniqueRates.join(", $")} · PICK ONE OR SET MANUALLY</>
                ) : (
                  <>▸ RECALLED FROM {suggestedRateInfo.rates[0].source}: ${suggestedRateInfo.suggested}</>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reconciliation warning banner — lists any unreconciled orders */}
        {matchedBills.length > 0 && reconcileIssues.length > 0 && (
          <div style={{ padding: 14, background: "#FEF3C7", border: "2px solid var(--hazard)", marginBottom: 18 }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>
              ⚠ {reconcileIssues.length} UNRECONCILED ORDER{reconcileIssues.length !== 1 ? "S" : ""} — REVIEW BEFORE INVOICING
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {reconcileIssues.map((r) => (
                <div key={r.dispatch.id} style={{ padding: 8, background: "#FFF", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                  <strong>ORDER #{r.dispatch.code}</strong> · {r.dispatch.jobName}
                  <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 3 }}>
                    Expected: {r.expected} · Submitted: {r.total} · No-show: {r.noShow}
                    {r.unresolved > 0 && <span style={{ color: "var(--safety)", fontWeight: 700 }}> · {r.unresolved} UNRESOLVED</span>}
                    {r.unresolved === 0 && <span style={{ color: "var(--hazard-deep)", fontWeight: 700 }}> · NEEDS MARK RECONCILED CLICK</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8 }}>
              ▸ GO TO THE ORDER TAB TO RESOLVE NO-SHOWS AND CLICK MARK RECONCILED · YOU CAN STILL PROCEED BELOW
            </div>
          </div>
        )}

        {pricingMethod === "hour" && matchedBills.length > 0 && (
          <div style={{ marginBottom: 18, padding: 14, background: "#F5F5F4", border: "1px solid var(--steel)" }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 4 }}>▸ HOURS PER FREIGHT BILL</div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", marginBottom: 10 }}>▸ AUTO-FILLED FROM APPROVED FB HOURS — ADJUST BELOW IF NEEDED</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
              {matchedBills.map((fb) => {
                const autoH = effectiveHours(fb);
                const manual = hoursOverride[fb.id];
                const isManual = manual !== undefined && manual !== "" && Number(manual) !== autoH;
                return (
                  <div key={fb.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700 }}>
                        FB#{fb.freightBillNumber || "—"}
                      </div>
                      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--concrete)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {fb.driverName || "—"}{fb.truckNumber ? ` · T${fb.truckNumber}` : ""}
                      </div>
                    </div>
                    <input
                      className="fbt-input"
                      type="number"
                      step="0.25"
                      style={{ padding: "6px 10px", fontSize: 13, width: 80, background: isManual ? "#FEF3C7" : undefined }}
                      placeholder={autoH > 0 ? autoH.toFixed(2) : "hrs"}
                      value={manual ?? ""}
                      onChange={(e) => setHoursOverride({ ...hoursOverride, [fb.id]: e.target.value })}
                      title={isManual ? "Manually overridden" : "Auto-filled from approved FB"}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bill-to — read-only display of auto-pulled customer + PO/ref fields */}
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ 03 / BILL TO (AUTO-PULLED FROM CUSTOMER PICKED ABOVE)</div>
        <div style={{ display: "grid", gap: 14, marginBottom: 18 }}>
          {!billTo.name ? (
            <div style={{ padding: 14, background: "#F5F5F4", border: "2px dashed var(--concrete)", textAlign: "center", fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)" }}>
              PICK A CUSTOMER IN SECTION 01 TO AUTO-FILL BILL-TO
            </div>
          ) : (
            <div style={{ padding: 12, background: "#F0FDF4", border: "2px solid var(--good)", display: "grid", gap: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{billTo.name}</div>
              {billTo.contact && <div style={{ fontSize: 12, color: "var(--concrete)" }}>Attn: {billTo.contact}</div>}
              {billTo.address && <div style={{ fontSize: 12, color: "var(--concrete)" }}>{billTo.address}</div>}
              <div style={{ fontSize: 10, color: "var(--good)", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em", marginTop: 4 }}>
                ▸ AUTO-PULLED FROM CONTACT · EDIT IN CONTACTS TAB IF NEEDED
              </div>
            </div>
          )}
          {/* PO# and Job Reference — auto-populate from project but editable */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">PO # {projectId ? "(from project)" : ""}</label>
              <input className="fbt-input" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO-2026-0045" />
            </div>
            <div>
              <label className="fbt-label">Job Reference {projectId ? "(from project)" : ""}</label>
              <input className="fbt-input" value={jobRef} onChange={(e) => setJobRef(e.target.value)} placeholder="MCI #91684 — Salinas Stormwater 2A" />
            </div>
          </div>
        </div>

        {/* Terms / notes */}
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ 04 / DETAILS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 14 }}>
          <div><label className="fbt-label">Due Date</label><input className="fbt-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <div><label className="fbt-label">Discount $</label><input className="fbt-input" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
        </div>

        {/* Multi-row extras (tolls / dump fees / fuel surcharge / other) */}
        <div style={{ marginBottom: 14, padding: 12, background: "#FEF3C7", border: "2px solid var(--hazard)" }}>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700 }}>
            ▸ ADDITIONAL LINE ITEMS (TOLLS · DUMP FEES · FUEL · OTHER)
          </div>
          {(extras || []).length > 0 && (
            <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
              {extras.map((x, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "150px 1fr 110px auto", gap: 6, alignItems: "center" }}>
                  <select
                    className="fbt-select"
                    style={{ padding: "6px 8px", fontSize: 11 }}
                    value={["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? x.label : "Other"}
                    onChange={(e) => {
                      const v = e.target.value;
                      const next = [...extras];
                      next[idx] = { ...next[idx], label: v === "Other" ? (next[idx].label || "") : v };
                      setExtras(next);
                    }}
                  >
                    <option value="Tolls">Tolls</option>
                    <option value="Dump Fees">Dump Fees</option>
                    <option value="Fuel Surcharge">Fuel Surcharge</option>
                    <option value="Other">Other (custom)</option>
                  </select>
                  <input
                    className="fbt-input"
                    style={{ padding: "6px 10px", fontSize: 12 }}
                    placeholder={["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? `Description for ${x.label}` : "Custom label (shows on invoice)"}
                    value={x.label || ""}
                    onChange={(e) => {
                      const next = [...extras];
                      next[idx] = { ...next[idx], label: e.target.value };
                      setExtras(next);
                    }}
                  />
                  <input
                    className="fbt-input"
                    type="number" step="0.01"
                    placeholder="0.00"
                    style={{ padding: "6px 10px", fontSize: 12 }}
                    value={x.amount || ""}
                    onChange={(e) => {
                      const next = [...extras];
                      next[idx] = { ...next[idx], amount: e.target.value };
                      setExtras(next);
                    }}
                  />
                  <button
                    onClick={() => setExtras(extras.filter((_, i) => i !== idx))}
                    className="btn-danger"
                    style={{ padding: "6px 10px", fontSize: 11 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setExtras([...(extras || []), { label: "Tolls", amount: "" }])}
              style={{ padding: "5px 10px", fontSize: 10 }}
            >
              <Plus size={11} style={{ marginRight: 3 }} /> TOLLS
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setExtras([...(extras || []), { label: "Dump Fees", amount: "" }])}
              style={{ padding: "5px 10px", fontSize: 10 }}
            >
              <Plus size={11} style={{ marginRight: 3 }} /> DUMP FEES
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setExtras([...(extras || []), { label: "Fuel Surcharge", amount: "" }])}
              style={{ padding: "5px 10px", fontSize: 10 }}
            >
              <Plus size={11} style={{ marginRight: 3 }} /> FUEL SURCHARGE
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setExtras([...(extras || []), { label: "", amount: "" }])}
              style={{ padding: "5px 10px", fontSize: 10 }}
            >
              <Plus size={11} style={{ marginRight: 3 }} /> CUSTOM
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 14 }}>
          <div><label className="fbt-label">Payment Terms</label><textarea className="fbt-textarea" value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
          <div><label className="fbt-label">Notes / Memo</label><textarea className="fbt-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)", cursor: "pointer", marginBottom: 18 }}>
          <input type="checkbox" checked={includePhotos} onChange={(e) => setIncludePhotos(e.target.checked)} />
          INCLUDE SCALE TICKET THUMBNAILS ON INVOICE
        </label>

        {/* Preview totals */}
        <div style={{ marginTop: 10, border: "2px solid var(--steel)" }}>
          <table className="fbt-table">
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>SUBTOTAL · {matchedBills.length} FREIGHT BILLS</td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt$(previewTotals.subtotal)}</td>
              </tr>
              {previewTotals.fbExtrasSum > 0 && (
                <tr>
                  <td style={{ fontWeight: 600 }}>FB EXTRAS (TOLLS · DUMP · FUEL · OTHER)</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt$(previewTotals.fbExtrasSum)}</td>
                </tr>
              )}
              {(extras || []).filter((x) => Number(x.amount) !== 0).map((x, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{(x.label || "ADDITIONAL").toUpperCase()}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt$(x.amount)}</td>
                </tr>
              ))}
              {Number(discount) !== 0 && (
                <tr>
                  <td style={{ fontWeight: 600 }}>DISCOUNT</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>-{fmt$(discount)}</td>
                </tr>
              )}
              <tr style={{ background: "var(--hazard)" }}>
                <td style={{ fontWeight: 700, fontSize: 16, fontFamily: "Archivo Black, sans-serif" }}>TOTAL DUE</td>
                <td style={{ textAlign: "right", fontWeight: 700, fontSize: 16, fontFamily: "Archivo Black, sans-serif" }}>{fmt$(previewTotals.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
          {/* Visible hints if button can't be clicked */}
          {(matchedBills.length === 0 || !rate || !billTo.name) && (
            <div style={{ padding: 10, background: "#FEF2F2", border: "2px solid var(--safety)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--safety)" }}>
              <strong>⚠ FIX BEFORE GENERATING:</strong>
              <ul style={{ margin: "6px 0 0 20px", padding: 0 }}>
                {matchedBills.length === 0 && <li>No freight bills match your filters (date range / approved / invoice status)</li>}
                {!rate && <li>Enter a rate in section 02 / PRICING</li>}
                {!billTo.name && <li>Select a customer or enter bill-to name in section 03 / BILL TO</li>}
              </ul>
            </div>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                if (matchedBills.length === 0) { onToast("NO FBs MATCH — CHECK FILTERS"); return; }
                if (!rate || Number(rate) <= 0) { onToast("ENTER A RATE FIRST"); return; }
                if (!billTo.name) { onToast("SELECT CUSTOMER OR BILL-TO NAME"); return; }
                generate();
              }}
              className="btn-primary"
            >
              <FileDown size={16} /> OPEN INVOICE (PRINT / SAVE AS PDF)
            </button>
          </div>
        </div>
      </div>

      {/* Invoice payment stats */}
      {invoices.length > 0 && (() => {
        const getStatus = (inv) => {
          if (inv.statusOverride) return inv.statusOverride;
          const paid = Number(inv.amountPaid || 0);
          const total = Number(inv.total || 0);
          if (total === 0) return "outstanding";
          if (paid >= total - 0.01) return "paid";
          if (paid > 0) return "partial";
          // Check overdue
          if (inv.dueDate) {
            const due = new Date(inv.dueDate);
            if (!isNaN(due) && due < new Date()) return "overdue";
          }
          return "outstanding";
        };
        const outstanding = invoices.filter((i) => getStatus(i) === "outstanding");
        const partial = invoices.filter((i) => getStatus(i) === "partial");
        const overdue = invoices.filter((i) => getStatus(i) === "overdue");
        const paidThisMonth = invoices.filter((i) => {
          if (getStatus(i) !== "paid") return false;
          const lastPay = (i.paymentHistory || [])[i.paymentHistory?.length - 1];
          if (!lastPay?.date) return false;
          const d = new Date(lastPay.date);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const outstandingAmt = [...outstanding, ...partial, ...overdue].reduce((s, i) => s + (Number(i.total) || 0) - (Number(i.amountPaid) || 0), 0);
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
            <div className="fbt-card" style={{ padding: 16, background: "var(--hazard)", color: "var(--steel)" }}>
              <div className="stat-num" style={{ color: "var(--steel)" }}>{fmt$(outstandingAmt).slice(0, 10)}</div>
              <div className="stat-label">Total Outstanding</div>
            </div>
            <div className="fbt-card" style={{ padding: 16 }}>
              <div className="stat-num">{outstanding.length}</div>
              <div className="stat-label">Outstanding</div>
            </div>
            <div className="fbt-card" style={{ padding: 16, background: "#FEF3C7" }}>
              <div className="stat-num">{partial.length}</div>
              <div className="stat-label">Partial Pay</div>
            </div>
            <div className="fbt-card" style={{ padding: 16, background: overdue.length > 0 ? "var(--safety)" : undefined, color: overdue.length > 0 ? "#FFF" : undefined }}>
              <div className="stat-num" style={{ color: overdue.length > 0 ? "#FFF" : undefined }}>{overdue.length}</div>
              <div className="stat-label" style={{ color: overdue.length > 0 ? "#FFF" : undefined }}>Overdue</div>
            </div>
            <div className="fbt-card" style={{ padding: 16, background: "var(--good)", color: "#FFF" }}>
              <div className="stat-num" style={{ color: "#FFF" }}>{paidThisMonth.length}</div>
              <div className="stat-label" style={{ color: "#FFF" }}>Paid This Month</div>
            </div>
          </div>
        );
      })()}

      {/* Invoice history */}
      <div className="fbt-card" style={{ padding: 0 }}>
        <div style={{ padding: "18px 24px", borderBottom: "2px solid var(--steel)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 24, background: "var(--hazard)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>INVOICE HISTORY</h3>
        </div>
        {invoices.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
            <Receipt size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div className="fbt-mono" style={{ fontSize: 13 }}>NO INVOICES GENERATED YET</div>
          </div>
        ) : (
          <div className="scroll-x">
            <table className="fbt-table">
              <thead><tr><th>Invoice #</th><th>Date</th><th>Bill To</th><th>FBs</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {invoices.map((inv) => {
                  const getStatus = (i) => {
                    if (i.statusOverride) return i.statusOverride;
                    const paid = Number(i.amountPaid || 0);
                    const total = Number(i.total || 0);
                    if (total === 0) return "outstanding";
                    if (paid >= total - 0.01) return "paid";
                    if (paid > 0) return "partial";
                    if (i.dueDate) {
                      const due = new Date(i.dueDate);
                      if (!isNaN(due) && due < new Date()) return "overdue";
                    }
                    return "outstanding";
                  };
                  const status = getStatus(inv);
                  const paid = Number(inv.amountPaid || 0);
                  const balance = (Number(inv.total) || 0) - paid;
                  const statusBg = {
                    paid: "var(--good)", partial: "var(--hazard)",
                    overdue: "var(--safety)", outstanding: "var(--concrete)",
                  }[status];
                  return (
                    <tr key={inv.invoiceNumber}>
                      <td><strong>{inv.invoiceNumber}</strong></td>
                      <td>{inv.invoiceDate}</td>
                      <td>{inv.billToName}</td>
                      <td>{inv.freightBillIds?.length || 0}</td>
                      <td style={{ color: "var(--hazard-deep)", fontWeight: 700 }}>{fmt$(inv.total)}</td>
                      <td style={{ color: "var(--good)", fontWeight: 600 }}>{paid > 0 ? fmt$(paid) : "—"}</td>
                      <td style={{ color: balance > 0 ? "var(--safety)" : "var(--concrete)", fontWeight: 600 }}>{balance > 0 ? fmt$(balance) : "✓"}</td>
                      <td>
                        <span className="chip" style={{ background: statusBg, color: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                          {status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {status !== "paid" && (
                          <button
                            className="btn-primary"
                            style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)", padding: "4px 10px", fontSize: 11 }}
                            onClick={() => setPayingInvoice(inv)}
                          >
                            <DollarSign size={12} /> PAY
                          </button>
                        )}
                        <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setViewingInvoice(inv)}>
                          <Eye size={12} style={{ marginRight: 4 }} /> VIEW
                        </button>
                        <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => reDownload(inv)}>
                          <FileDown size={12} style={{ marginRight: 4 }} /> OPEN
                        </button>
                        <button className="btn-danger" onClick={() => removeInvoice(inv.invoiceNumber)}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== BACKUP / RESTORE ==========
const BACKUP_VERSION = 1;

const buildBackupPayload = (state, { includePhotos = true } = {}) => {
  let freightBills = state.freightBills || [];
  if (!includePhotos) {
    freightBills = freightBills.map((fb) => ({ ...fb, photos: (fb.photos || []).map((p) => ({ id: p.id, name: p.name, stripped: true })) }));
  }
  return {
    _format: "4brothers-backup",
    _version: BACKUP_VERSION,
    _exportedAt: new Date().toISOString(),
    _includesPhotos: includePhotos,
    logs: state.logs || [],
    quotes: state.quotes || [],
    fleet: state.fleet || [],
    dispatches: state.dispatches || [],
    freightBills,
    invoices: state.invoices || [],
    contacts: state.contacts || [],
    quarries: state.quarries || [],
    company: state.company || {},
  };
};

const downloadJSONBackup = (state, { includePhotos = true, filenameSuffix = "" } = {}) => {
  const payload = buildBackupPayload(state, { includePhotos });
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `4brothers-backup-${ts}${filenameSuffix}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return { size: blob.size, payload };
};

const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const rowsToCSV = (rows) => rows.map((r) => r.map(csvEscape).join(",")).join("\n");
const downloadCSV = (filename, rows) => {
  const csv = rowsToCSV(rows);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const exportAllCSVs = (state) => {
  const ts = new Date().toISOString().slice(0, 10);
  const { dispatches = [], freightBills = [], invoices = [], logs = [] } = state;
  const dispMap = {};
  dispatches.forEach((d) => { dispMap[d.id] = d; });

  // Dispatches
  downloadCSV(`4brothers-dispatches-${ts}.csv`, [
    ["Code", "Date", "Job", "Sub-Contractor", "Pickup", "Dropoff", "Material", "Trucks Expected", "Trucks Submitted", "Rate $/hr", "Rate $/ton", "Status", "Notes", "Created"],
    ...dispatches.map((d) => [
      d.code, d.date, d.jobName, d.subContractor || "", d.pickup || "", d.dropoff || "",
      d.material || "", d.trucksExpected, freightBills.filter((fb) => fb.dispatchId === d.id).length,
      d.ratePerHour || "", d.ratePerTon || "", d.status, d.notes || "", d.createdAt || "",
    ]),
  ]);

  // Freight bills
  downloadCSV(`4brothers-freightbills-${ts}.csv`, [
    ["Freight Bill #", "Submitted", "Dispatch Code", "Job", "Sub", "Driver", "Truck", "Material", "Tonnage", "Load Count", "Pickup Time", "Dropoff Time", "Photos", "Notes"],
    ...freightBills.map((fb) => {
      const d = dispMap[fb.dispatchId];
      return [
        fb.freightBillNumber || "", fb.submittedAt || "",
        d?.code || "", d?.jobName || "", d?.subContractor || "",
        fb.driverName || "", fb.truckNumber || "", fb.material || "",
        fb.tonnage || "", fb.loadCount || "", fb.pickupTime || "", fb.dropoffTime || "",
        (fb.photos || []).length, fb.notes || "",
      ];
    }),
  ]);

  // Invoices
  if (invoices.length > 0) {
    downloadCSV(`4brothers-invoices-${ts}.csv`, [
      ["Invoice #", "Date", "Due Date", "Bill To", "Job Reference", "Pricing Method", "Rate", "FB Count", "Subtotal", "Total"],
      ...invoices.map((inv) => [
        inv.invoiceNumber, inv.invoiceDate, inv.dueDate || "",
        inv.billToName || "", inv.jobReference || "",
        inv.pricingMethod || "", inv.rate || "",
        (inv.freightBillIds || []).length, inv.subtotal || 0, inv.total || 0,
      ]),
    ]);
  }

  // Hours logs
  if (logs.length > 0) {
    downloadCSV(`4brothers-hours-${ts}.csv`, [
      ["Date", "Truck", "Driver", "Job", "Start", "End", "Hours", "Billable Hours", "Rate", "Amount", "Notes"],
      ...logs.map((l) => [
        l.date, l.truck, l.driver, l.job || "", l.startTime || "", l.endTime || "",
        l.hours || "", l.billableHours || "", l.rate || "", l.amount || 0, l.notes || "",
      ]),
    ]);
  }
};

const validateBackup = (obj) => {
  if (!obj || typeof obj !== "object") return "Not a valid backup file (not JSON object)";
  if (obj._format !== "4brothers-backup") return "This doesn't look like a 4 Brothers backup file";
  if (typeof obj._version !== "number") return "Backup file is missing version info";
  if (obj._version > BACKUP_VERSION) return `Backup is from a newer app version (v${obj._version}) — update the app first`;
  const arrays = ["logs", "quotes", "fleet", "dispatches", "freightBills", "invoices", "contacts", "quarries"];
  for (const k of arrays) {
    if (obj[k] !== undefined && !Array.isArray(obj[k])) return `Backup field '${k}' is corrupted (not an array)`;
  }
  return null;
};

// ========== CONTACT HELPERS ==========
const buildSMSLink = (phone, message) => {
  if (!phone) return null;
  const clean = String(phone).replace(/[^\d+]/g, "");
  if (!clean) return null;
  // iOS uses & as separator, Android uses ?, but most platforms now accept ? with encoded body
  return `sms:${clean}?body=${encodeURIComponent(message)}`;
};
const buildEmailLink = (email, subject, body) => {
  if (!email) return null;
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${email}${params.length ? "?" + params.join("&") : ""}`;
};
const buildDispatchMessage = (dispatch, url, companyName) => {
  const lines = [
    `${companyName || "4 Brothers Trucking"} — Dispatch #${dispatch.code}`,
    "",
    `Job: ${dispatch.jobName}`,
    `Date: ${dispatch.date}`,
  ];
  if (dispatch.pickup) lines.push(`Pickup: ${dispatch.pickup}`);
  if (dispatch.dropoff) lines.push(`Dropoff: ${dispatch.dropoff}`);
  if (dispatch.material) lines.push(`Material: ${dispatch.material}`);
  lines.push(`Trucks needed: ${dispatch.trucksExpected}`);
  lines.push("");
  lines.push("Upload your freight bill + scale tickets here (one submission per truck):");
  lines.push(url);
  return lines.join("\n");
};

// ========== CONTACT MODAL ==========
const ContactModal = ({ contact, contacts = [], onSave, onClose, onToast }) => {
  const [draft, setDraft] = useState(contact || {
    type: "sub", companyName: "", contactName: "", phone: "", phone2: "",
    email: "", address: "", typicalTrucks: "", rateNotes: "",
    usdot: "", insurance: "", notes: "", favorite: false, drivesForId: null,
    brokerageApplies: false, brokeragePercent: 8,
    defaultPayRate: "", defaultPayMethod: "hour", defaultTruckNumber: "",
    taxId: "", taxIdType: "", legalName: "", is1099Eligible: false,
  });
  const [showTaxId, setShowTaxId] = useState(false); // masked by default

  const save = async () => {
    if (!draft.companyName && !draft.contactName) {
      alert("Add at least a company name or contact name.");
      return;
    }
    await onSave({
      ...draft,
      id: draft.id || ("temp-" + Date.now()),
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onToast(contact ? "CONTACT UPDATED" : "CONTACT ADDED");
    onClose();
  };

  const typeLabel = { sub: "Sub-Contractor", driver: "Driver", customer: "Customer", broker: "Broker" }[draft.type] || "Contact";
  const companyLabel = draft.type === "driver" ? "Full Name" : "Company Name";
  const companyPlaceholder = {
    sub: "ACME Trucking Inc.",
    driver: "John Smith",
    customer: "Mountain Cascade, Inc.",
    broker: "Regional Freight Brokers LLC",
  }[draft.type];

  const subContacts = contacts.filter((c) => c.type === "sub");

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={18} /> {contact ? `EDIT ${typeLabel.toUpperCase()}` : `NEW ${typeLabel.toUpperCase()}`}
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "end" }}>
            <div>
              <label className="fbt-label">Type</label>
              <select className="fbt-select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                <option value="sub">Sub-Contractor</option>
                <option value="driver">Driver</option>
                <option value="customer">Customer</option>
                <option value="broker">Broker</option>
              </select>
            </div>
            <div>
              <label className="fbt-label">{companyLabel}</label>
              <input className="fbt-input" value={draft.companyName} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} placeholder={companyPlaceholder} />
            </div>
            <button
              onClick={() => setDraft({ ...draft, favorite: !draft.favorite })}
              className="btn-ghost"
              style={{ padding: "10px 14px", background: draft.favorite ? "var(--hazard)" : "transparent" }}
              title={draft.favorite ? "Preferred contact" : "Mark as preferred"}
            >
              <Star size={16} fill={draft.favorite ? "var(--steel)" : "none"} />
            </button>
          </div>

          {(draft.type === "sub" || draft.type === "customer") && (
            <div>
              <label className="fbt-label">Primary Contact Person</label>
              <input className="fbt-input" value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} placeholder="Who to ask for" />
            </div>
          )}

          {draft.type === "driver" && subContacts.length > 0 && (
            <div>
              <label className="fbt-label">Drives For (Sub-Contractor, optional)</label>
              <select
                className="fbt-select"
                value={draft.drivesForId || ""}
                onChange={(e) => setDraft({ ...draft, drivesForId: e.target.value || null })}
              >
                <option value="">— Independent / Not linked —</option>
                {subContacts.map((s) => (
                  <option key={s.id} value={s.id}>{s.companyName || s.contactName}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Phone (Primary)</label>
              <input className="fbt-input" type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className="fbt-label">Phone (Alt)</label>
              <input className="fbt-input" type="tel" value={draft.phone2} onChange={(e) => setDraft({ ...draft, phone2: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="fbt-label">Email</label>
            <input className="fbt-input" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          </div>

          <div>
            <label className="fbt-label">{draft.type === "customer" ? "Billing Address" : "Address / Office Location"}</label>
            <input className="fbt-input" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Street, City, State ZIP" />
          </div>

          {draft.type === "sub" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
              <div>
                <label className="fbt-label">Typical Truck Count</label>
                <input className="fbt-input" type="number" min="0" value={draft.typicalTrucks} onChange={(e) => setDraft({ ...draft, typicalTrucks: e.target.value })} placeholder="e.g. 3" />
              </div>
              <div>
                <label className="fbt-label">Rate / Pricing Notes</label>
                <input className="fbt-input" value={draft.rateNotes} onChange={(e) => setDraft({ ...draft, rateNotes: e.target.value })} placeholder="$135/hr, 8-hr min" />
              </div>
            </div>
          )}

          {/* Driver defaults — auto-fill when assigned to orders */}
          {draft.type === "driver" && (
            <div style={{ padding: 12, background: "#F0FDF4", border: "2px solid var(--good)" }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>
                ▸ DRIVER DEFAULTS · AUTO-FILL WHEN ASSIGNED TO ORDER
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                <div>
                  <label className="fbt-label">Default Pay Rate $</label>
                  <input
                    className="fbt-input"
                    type="number"
                    step="0.01"
                    value={draft.defaultPayRate ?? ""}
                    onChange={(e) => setDraft({ ...draft, defaultPayRate: e.target.value })}
                    placeholder="e.g. 35.00"
                  />
                </div>
                <div>
                  <label className="fbt-label">Pay Method</label>
                  <select
                    className="fbt-select"
                    value={draft.defaultPayMethod || "hour"}
                    onChange={(e) => setDraft({ ...draft, defaultPayMethod: e.target.value })}
                  >
                    <option value="hour">Per Hour</option>
                    <option value="ton">Per Ton</option>
                    <option value="load">Per Load</option>
                  </select>
                </div>
                <div>
                  <label className="fbt-label">Default Truck #</label>
                  <input
                    className="fbt-input"
                    value={draft.defaultTruckNumber || ""}
                    onChange={(e) => setDraft({ ...draft, defaultTruckNumber: e.target.value })}
                    placeholder="e.g. 12"
                  />
                </div>
              </div>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8, lineHeight: 1.5 }}>
                ▸ THESE AUTO-FILL WHEN YOU ADD THIS DRIVER TO AN ORDER. EDITABLE PER-ORDER IF NEEDED.
              </div>
            </div>
          )}

          {/* Brokerage section — ONLY for subs (drivers are never brokered) */}
          {draft.type === "sub" && (
            <div style={{ padding: 12, background: draft.brokerageApplies ? "#FEF3C7" : "#F5F5F4", border: "2px solid " + (draft.brokerageApplies ? "var(--hazard)" : "var(--concrete)") }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!draft.brokerageApplies}
                  onChange={(e) => setDraft({ ...draft, brokerageApplies: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span className="fbt-mono" style={{ fontSize: 12, letterSpacing: "0.05em", fontWeight: 700 }}>
                  DEDUCT BROKERAGE WHEN PAYING
                </span>
              </label>
              {draft.brokerageApplies && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
                  <label className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>BROKERAGE %:</label>
                  <input
                    className="fbt-input"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={draft.brokeragePercent ?? 8}
                    onChange={(e) => setDraft({ ...draft, brokeragePercent: e.target.value })}
                    style={{ width: 90, padding: "6px 10px" }}
                  />
                  <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
                    (DEFAULT 8%)
                  </span>
                </div>
              )}
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8, lineHeight: 1.5 }}>
                ▸ WHEN WE PAY THIS SUB, WE'LL SUBTRACT THIS % FROM THEIR GROSS PAY (NOT FROM REIMBURSEMENTS). LEAVE OFF IF BROKERAGE ISN'T INVOLVED.
              </div>
            </div>
          )}

          {/* 1099 / Tax section — for subs and drivers */}
          {(draft.type === "sub" || draft.type === "driver") && (
            <div style={{ padding: 12, background: draft.is1099Eligible ? "#F0FDF4" : "#F5F5F4", border: "2px solid " + (draft.is1099Eligible ? "var(--good)" : "var(--concrete)") }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!draft.is1099Eligible}
                  onChange={(e) => setDraft({ ...draft, is1099Eligible: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span className="fbt-mono" style={{ fontSize: 12, letterSpacing: "0.05em", fontWeight: 700 }}>
                  1099 ELIGIBLE — ISSUE 1099-NEC AT YEAR-END
                </span>
              </label>
              {draft.is1099Eligible && (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <div>
                    <label className="fbt-label">Legal Name (on 1099)</label>
                    <input
                      className="fbt-input"
                      value={draft.legalName || ""}
                      onChange={(e) => setDraft({ ...draft, legalName: e.target.value })}
                      placeholder={draft.companyName || draft.contactName || "Full legal name"}
                    />
                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>
                      ▸ LEAVE BLANK TO USE CONTACT NAME · PUT DBA OR REGISTERED NAME IF DIFFERENT
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px", gap: 10, alignItems: "end" }}>
                    <div>
                      <label className="fbt-label">Tax ID Type</label>
                      <select
                        className="fbt-select"
                        value={draft.taxIdType || ""}
                        onChange={(e) => setDraft({ ...draft, taxIdType: e.target.value })}
                      >
                        <option value="">—</option>
                        <option value="ein">EIN</option>
                        <option value="ssn">SSN</option>
                      </select>
                    </div>
                    <div>
                      <label className="fbt-label">
                        Tax ID {draft.taxIdType === "ssn" ? "(SSN)" : draft.taxIdType === "ein" ? "(EIN)" : ""}
                      </label>
                      <input
                        className="fbt-input"
                        type={showTaxId ? "text" : "password"}
                        value={draft.taxId || ""}
                        onChange={(e) => setDraft({ ...draft, taxId: e.target.value })}
                        placeholder={draft.taxIdType === "ein" ? "XX-XXXXXXX" : draft.taxIdType === "ssn" ? "XXX-XX-XXXX" : "Select type first"}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTaxId(!showTaxId)}
                      className="btn-ghost"
                      style={{ padding: "8px 10px", fontSize: 10 }}
                    >
                      {showTaxId ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", padding: 8, background: "#FEF3C7", border: "1px solid var(--hazard)", lineHeight: 1.5 }}>
                    ⚠ SENSITIVE — STORED IN YOUR DATABASE, MASKED ON SCREEN BY DEFAULT · COLLECT VIA W-9 FROM THE CONTRACTOR · DO NOT SHARE THIS CONTACT EXPORT PUBLICLY
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Broker-specific fields */}
          {draft.type === "broker" && (
            <div style={{ padding: 12, background: "#F0FDF4", border: "2px solid var(--good)" }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700 }}>
                ▸ BROKER — PAYS US, NOT WE PAY THEM
              </div>
              <div style={{ fontSize: 12, color: "var(--steel)", lineHeight: 1.5 }}>
                Brokers bring you work and pay you directly. Track their contact info here. Future payroll module will show the brokerage income per broker.
              </div>
            </div>
          )}

          {(draft.type === "sub" || draft.type === "driver") && (
            <>
              <div>
                <label className="fbt-label">USDOT / MC # / CA MCP</label>
                <input className="fbt-input" value={draft.usdot} onChange={(e) => setDraft({ ...draft, usdot: e.target.value })} placeholder="USDOT 1234567 · MC 000000" />
              </div>
              <div>
                <label className="fbt-label">Insurance Info</label>
                <input className="fbt-input" value={draft.insurance} onChange={(e) => setDraft({ ...draft, insurance: e.target.value })} placeholder="Carrier · Policy # · Expires" />
              </div>
            </>
          )}

          <div>
            <label className="fbt-label">Internal Notes</label>
            <textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Reliability, strengths, quirks, preferences..." />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <button onClick={save} className="btn-primary"><CheckCircle2 size={16} /> SAVE</button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== CONTACT DETAIL MODAL ==========
const ContactDetailModal = ({ contact, dispatches, freightBills, company, onEdit, onDelete, onClose, onToast, onSaveContact }) => {
  const history = useMemo(() => {
    return dispatches.filter((d) => d.subContractorId === contact.id || (d.subContractor && contact.companyName && d.subContractor.toLowerCase() === contact.companyName.toLowerCase()));
  }, [dispatches, contact]);

  const totalFBs = history.reduce((s, d) => s + freightBills.filter((fb) => fb.dispatchId === d.id).length, 0);
  const totalTons = history.reduce((s, d) => {
    return s + freightBills.filter((fb) => fb.dispatchId === d.id).reduce((ss, fb) => ss + (Number(fb.tonnage) || 0), 0);
  }, 0);

  const copyPhoneText = () => {
    if (contact.phone) { navigator.clipboard?.writeText(contact.phone); onToast("PHONE COPIED"); }
  };

  // Portal link generation for customer contacts
  const generateToken = () => {
    // Browser-safe hex token (48 chars)
    const arr = new Uint8Array(24);
    (crypto && crypto.getRandomValues) ? crypto.getRandomValues(arr) : arr.forEach((_, i) => arr[i] = Math.floor(Math.random() * 256));
    return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const enablePortal = async () => {
    if (!onSaveContact) return;
    const token = contact.portalToken || generateToken();
    await onSaveContact({ ...contact, portalToken: token, portalEnabled: true });
    onToast("PORTAL ENABLED — LINK READY");
  };

  const disablePortal = async () => {
    if (!onSaveContact) return;
    if (!confirm("Disable customer portal access? Their link will stop working.")) return;
    await onSaveContact({ ...contact, portalEnabled: false });
    onToast("PORTAL DISABLED");
  };

  const regenerateToken = async () => {
    if (!onSaveContact) return;
    if (!confirm("Regenerate portal token? Their CURRENT link will stop working and you'll need to send the new one.")) return;
    await onSaveContact({ ...contact, portalToken: generateToken(), portalEnabled: true });
    onToast("NEW LINK GENERATED");
  };

  const portalUrl = contact.portalToken
    ? `${window.location.origin}${window.location.pathname}#/customer/${contact.portalToken}`
    : null;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.1em" }}>
              {contact.type === "sub" ? "SUB-CONTRACTOR"
                : contact.type === "customer" ? "CUSTOMER"
                : contact.type === "broker" ? "BROKER"
                : "DRIVER"}{contact.favorite && " · ★ PREFERRED"}
            </div>
            <h3 className="fbt-display" style={{ fontSize: 22, margin: "4px 0 0" }}>{contact.companyName || contact.contactName}</h3>
            {contact.contactName && contact.companyName && (
              <div className="fbt-mono" style={{ fontSize: 12, color: "#D6D3D1", marginTop: 4 }}>c/o {contact.contactName}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onEdit} className="btn-ghost" style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "6px 12px", fontSize: 11 }}><Edit2 size={12} /></button>
            <button onClick={onDelete} className="btn-danger" style={{ color: "var(--hazard)", borderColor: "var(--hazard)" }}><Trash2 size={12} /></button>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* Contact info */}
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ CONTACT INFO</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 20, fontSize: 13, fontFamily: "JetBrains Mono, monospace" }}>
            {contact.phone && (
              <div><strong>PHONE:</strong> <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} style={{ color: "var(--hazard-deep)" }}>{contact.phone}</a></div>
            )}
            {contact.phone2 && (
              <div><strong>ALT:</strong> <a href={`tel:${contact.phone2.replace(/[^\d+]/g, "")}`} style={{ color: "var(--hazard-deep)" }}>{contact.phone2}</a></div>
            )}
            {contact.email && (
              <div><strong>EMAIL:</strong> <a href={`mailto:${contact.email}`} style={{ color: "var(--hazard-deep)" }}>{contact.email}</a></div>
            )}
            {contact.address && <div style={{ gridColumn: "1 / -1" }}><strong>ADDRESS:</strong> {contact.address}</div>}
          </div>

          {(contact.typicalTrucks || contact.rateNotes || contact.usdot || contact.insurance) && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ OPERATIONAL</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 20, fontSize: 13, fontFamily: "JetBrains Mono, monospace" }}>
                {contact.typicalTrucks && <div><strong>TYPICAL TRUCKS:</strong> {contact.typicalTrucks}</div>}
                {contact.rateNotes && <div><strong>RATE:</strong> {contact.rateNotes}</div>}
                {contact.usdot && <div style={{ gridColumn: "1 / -1" }}><strong>USDOT/MC:</strong> {contact.usdot}</div>}
                {contact.insurance && <div style={{ gridColumn: "1 / -1" }}><strong>INSURANCE:</strong> {contact.insurance}</div>}
              </div>
            </>
          )}

          {contact.notes && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ NOTES</div>
              <div style={{ padding: 12, background: "#FEF3C7", borderLeft: "3px solid var(--hazard)", fontSize: 13, marginBottom: 20, whiteSpace: "pre-wrap" }}>
                {contact.notes}
              </div>
            </>
          )}

          {/* Customer Portal (only for type=customer) */}
          {contact.type === "customer" && onSaveContact && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ CUSTOMER PORTAL ACCESS</div>
              <div style={{ padding: 14, background: contact.portalEnabled ? "#F0FDF4" : "#F5F5F4", border: "2px solid " + (contact.portalEnabled ? "var(--good)" : "var(--concrete)"), marginBottom: 20 }}>
                {!contact.portalEnabled ? (
                  <>
                    <div className="fbt-mono" style={{ fontSize: 11, marginBottom: 10 }}>PORTAL DISABLED</div>
                    <p style={{ fontSize: 12, color: "var(--concrete)", margin: "0 0 10px" }}>
                      Enable a view-only portal link that lets this customer see their approved freight bills, scale tickets, and orders.
                    </p>
                    <button onClick={enablePortal} className="btn-primary" style={{ fontSize: 11 }}>
                      <ShieldCheck size={14} /> ENABLE PORTAL
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      <span className="chip" style={{ background: "var(--good)", color: "#FFF", fontSize: 9, padding: "2px 8px" }}>● ACTIVE</span>
                      <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>VIEW-ONLY · APPROVED FBs ONLY</span>
                    </div>
                    <code style={{ display: "block", padding: "8px 10px", background: "#FFF", border: "1px solid var(--steel)", fontSize: 10, fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all", marginBottom: 10 }}>
                      {portalUrl}
                    </code>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 10, padding: "6px 10px" }}
                        onClick={async () => {
                          try { await navigator.clipboard.writeText(portalUrl); onToast("PORTAL LINK COPIED"); }
                          catch { onToast("COPY FAILED"); }
                        }}
                      >
                        <Link2 size={11} style={{ marginRight: 3 }} /> COPY LINK
                      </button>
                      {contact.phone && (
                        <a
                          href={buildSMSLink(contact.phone, `Hi ${contact.contactName || contact.companyName} — here's your 4 Brothers Trucking portal link to view your freight bills and scale tickets: ${portalUrl}`) || "#"}
                          className="btn-ghost"
                          style={{ fontSize: 10, padding: "6px 10px", textDecoration: "none" }}
                        >
                          <MessageSquare size={11} style={{ marginRight: 3 }} /> TEXT
                        </a>
                      )}
                      {contact.email && (
                        <a
                          href={buildEmailLink(contact.email, `Your 4 Brothers Trucking Portal Access`, `Hi ${contact.contactName || contact.companyName},\n\nYou can now view your freight bills and scale tickets any time at this link:\n\n${portalUrl}\n\nThanks,\n4 Brothers Trucking, LLC`) || "#"}
                          className="btn-ghost"
                          style={{ fontSize: 10, padding: "6px 10px", textDecoration: "none" }}
                        >
                          <Mail size={11} style={{ marginRight: 3 }} /> EMAIL
                        </a>
                      )}
                      <button className="btn-ghost" style={{ fontSize: 10, padding: "6px 10px" }} onClick={regenerateToken}>
                        <RefreshCw size={11} style={{ marginRight: 3 }} /> NEW LINK
                      </button>
                      <button className="btn-danger" style={{ fontSize: 10, padding: "6px 10px" }} onClick={disablePortal}>
                        <Lock size={11} style={{ marginRight: 3 }} /> DISABLE
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Job history */}
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>
            ▸ JOB HISTORY ({history.length} DISPATCH{history.length !== 1 ? "ES" : ""} · {totalFBs} FREIGHT BILL{totalFBs !== 1 ? "S" : ""} · {totalTons.toFixed(1)} TONS)
          </div>
          {history.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", border: "2px dashed var(--concrete)", color: "var(--concrete)", fontSize: 13 }}>
              No dispatches with this contact yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {history.slice(0, 10).map((d) => {
                const bills = freightBills.filter((fb) => fb.dispatchId === d.id);
                return (
                  <div key={d.id} style={{ padding: 10, border: "1px solid var(--steel)", background: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                    <div>
                      <strong>#{d.code}</strong> · {d.jobName} · <span style={{ color: "var(--concrete)" }}>{fmtDate(d.date)}</span>
                    </div>
                    <div style={{ color: bills.length >= d.trucksExpected ? "var(--good)" : "var(--concrete)" }}>
                      {bills.length}/{d.trucksExpected} FBs
                    </div>
                  </div>
                );
              })}
              {history.length > 10 && (
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", textAlign: "center", padding: 6 }}>
                  + {history.length - 10} older dispatches
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ========== CONTACTS TAB ==========
const ContactsTab = ({ contacts, setContacts, dispatches, freightBills, company, onToast }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const save = async (contact) => {
    const exists = contacts.find((c) => c.id === contact.id);
    const next = exists ? contacts.map((c) => c.id === contact.id ? contact : c) : [contact, ...contacts];
    setContacts(next);

  };

  const remove = async (id) => {
    const c = contacts.find((x) => x.id === id);
    if (!c) return;
    if (!confirm(`Delete contact "${c.companyName || c.contactName}"? This won't affect past dispatches.`)) return;
    const next = contacts.filter((x) => x.id !== id);
    setContacts(next);

    onToast("CONTACT DELETED");
    setViewing(null);
  };

  const toggleFavorite = async (id) => {
    const next = contacts.map((c) => c.id === id ? { ...c, favorite: !c.favorite } : c);
    setContacts(next);

  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return contacts
      .filter((c) => typeFilter === "all" || c.type === typeFilter)
      .filter((c) => {
        if (!s) return true;
        return `${c.companyName || ""} ${c.contactName || ""} ${c.phone || ""} ${c.email || ""} ${c.notes || ""}`.toLowerCase().includes(s);
      })
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return (a.companyName || a.contactName || "").localeCompare(b.companyName || b.contactName || "");
      });
  }, [contacts, search, typeFilter]);

  const subsCount = contacts.filter((c) => c.type === "sub").length;
  const driversCount = contacts.filter((c) => c.type === "driver").length;
  const customersCount = contacts.filter((c) => c.type === "customer").length;
  const brokersCount = contacts.filter((c) => c.type === "broker").length;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {showModal && (
        <ContactModal
          contact={editing}
          contacts={contacts}
          onSave={save}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onToast={onToast}
        />
      )}
      {viewing && !showModal && (
        <ContactDetailModal
          contact={viewing}
          dispatches={dispatches}
          freightBills={freightBills}
          company={company}
          onEdit={() => { setEditing(viewing); setShowModal(true); }}
          onDelete={() => remove(viewing.id)}
          onClose={() => setViewing(null)}
          onToast={onToast}
          onSaveContact={async (updated) => {
            await save(updated);
            setViewing(updated);  // refresh the modal with updated data
          }}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{contacts.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{customersCount}</div>
          <div className="stat-label">Customers</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{subsCount}</div>
          <div className="stat-label">Sub-Contractors</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{driversCount}</div>
          <div className="stat-label">Drivers</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{brokersCount}</div>
          <div className="stat-label">Brokers</div>
        </div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--hazard)" }}>
          <div className="stat-num">{contacts.filter((c) => c.favorite).length}</div>
          <div className="stat-label">Preferred ★</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search name, phone, notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="fbt-select" style={{ width: "auto" }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="customer">Customers Only</option>
          <option value="sub">Subs Only</option>
          <option value="driver">Drivers Only</option>
          <option value="broker">Brokers Only</option>
        </select>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
          <UserPlus size={16} /> NEW CONTACT
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <Users size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {search || typeFilter !== "all" ? "NO MATCHES" : "NO CONTACTS YET — ADD YOUR FIRST SUB OR DRIVER"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map((c) => {
            const jobCount = dispatches.filter((d) => d.subContractorId === c.id || (d.subContractor && c.companyName && d.subContractor.toLowerCase() === c.companyName.toLowerCase())).length;
            return (
              <div key={c.id} className="fbt-card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => setViewing(c)}>
                <div className="hazard-stripe-thin" style={{ height: 6 }} />
                <div style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span className="chip" style={{
                          background: c.type === "sub" ? "var(--hazard)"
                            : c.type === "customer" ? "var(--good)"
                            : c.type === "broker" ? "var(--steel)"
                            : "#FFF",
                          color: (c.type === "customer" || c.type === "broker") ? "#FFF" : undefined,
                          fontSize: 9, padding: "2px 8px"
                        }}>
                          {c.type === "sub" ? "SUB"
                            : c.type === "customer" ? "CUSTOMER"
                            : c.type === "broker" ? "BROKER"
                            : "DRIVER"}
                        </span>
                        {jobCount > 0 && <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>{jobCount} job{jobCount !== 1 ? "s" : ""}</span>}
                      </div>
                      <div className="fbt-display" style={{ fontSize: 18, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.companyName || c.contactName}
                      </div>
                      {c.contactName && c.companyName && (
                        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>c/o {c.contactName}</div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(c.id); }}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: c.favorite ? "var(--hazard-deep)" : "var(--concrete)", padding: 4 }}
                      title="Toggle preferred"
                    >
                      <Star size={18} fill={c.favorite ? "var(--hazard-deep)" : "none"} />
                    </button>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)", lineHeight: 1.6 }}>
                    {c.phone && <div>▸ {c.phone}</div>}
                    {c.email && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>▸ {c.email}</div>}
                    {c.typicalTrucks && <div>▸ {c.typicalTrucks} typical trucks</div>}
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    {c.phone && (
                      <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                        <Phone size={11} style={{ marginRight: 4 }} /> CALL
                      </a>
                    )}
                    {c.phone && (
                      <a href={buildSMSLink(c.phone, `Hi ${c.contactName || ""}, this is ${company?.name || "4 Brothers Trucking"}.`)} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                        <MessageSquare size={11} style={{ marginRight: 4 }} /> TEXT
                      </a>
                    )}
                    {c.email && (
                      <a href={buildEmailLink(c.email, "4 Brothers Trucking", "")} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                        <Mail size={11} style={{ marginRight: 4 }} /> EMAIL
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ========== QUARRY / MATERIAL HELPERS ==========
const newQuarryDraft = () => ({
  id: null,
  name: "", address: "", contactName: "", phone: "", email: "",
  hours: "", deliveryTerms: "", scaleInfo: "", notes: "",
  materials: [], // [{ id, name, pricePerTon, updatedAt, history: [{price, date}] }]
});

const newMaterialRow = (name = "", price = "") => ({
  id: Date.now() + Math.random(),
  name,
  pricePerTon: price,
  updatedAt: new Date().toISOString(),
  history: [],
});

// ========== QUARRY MODAL ==========
const QuarryModal = ({ quarry, onSave, onClose, onToast }) => {
  const [draft, setDraft] = useState(quarry ? JSON.parse(JSON.stringify(quarry)) : newQuarryDraft());
  const [priceChanges, setPriceChanges] = useState([]); // [{ name, old, new }]

  const updateMaterial = (idx, field, value) => {
    const next = [...draft.materials];
    next[idx] = { ...next[idx], [field]: value };
    setDraft({ ...draft, materials: next });
  };

  const addMaterial = () => {
    setDraft({ ...draft, materials: [...draft.materials, newMaterialRow()] });
  };

  const removeMaterial = (idx) => {
    setDraft({ ...draft, materials: draft.materials.filter((_, i) => i !== idx) });
  };

  const save = async () => {
    if (!draft.name) { alert("Quarry name is required."); return; }

    // For existing quarry, detect price changes and log history
    const now = new Date().toISOString();
    const changes = [];
    let updatedMaterials = draft.materials.map((m) => ({ ...m }));

    if (quarry) {
      updatedMaterials = updatedMaterials.map((m) => {
        const prev = quarry.materials.find((pm) => pm.id === m.id);
        const newPrice = Number(m.pricePerTon);
        if (prev && Number(prev.pricePerTon) !== newPrice && !isNaN(newPrice)) {
          const entry = { price: Number(prev.pricePerTon), date: prev.updatedAt || now };
          changes.push({ name: m.name, old: Number(prev.pricePerTon), new: newPrice });
          return {
            ...m,
            history: [entry, ...(prev.history || [])].slice(0, 50),
            updatedAt: now,
          };
        }
        if (!prev && !isNaN(newPrice) && newPrice > 0) {
          return { ...m, updatedAt: now, history: [] };
        }
        return m;
      });
    } else {
      updatedMaterials = updatedMaterials.map((m) => ({
        ...m, updatedAt: now, history: m.history || [],
      }));
    }

    const saved = {
      ...draft,
      materials: updatedMaterials.filter((m) => m.name.trim()),
      id: draft.id || ("temp-" + Date.now()),
      createdAt: draft.createdAt || now,
      updatedAt: now,
    };

    await onSave(saved);

    // Toast for price changes
    if (changes.length > 0) {
      const first = changes[0];
      const diff = first.new - first.old;
      const dir = diff > 0 ? "↑" : "↓";
      const verb = diff > 0 ? "INCREASE" : "SAVINGS";
      onToast(`${dir} ${first.name.toUpperCase()}: $${Math.abs(diff).toFixed(2)} ${verb}${changes.length > 1 ? ` (+${changes.length - 1} more)` : ""}`);
    } else {
      onToast(quarry ? "QUARRY UPDATED" : "QUARRY ADDED");
    }
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Mountain size={18} /> {quarry ? "EDIT QUARRY" : "NEW QUARRY / SUPPLIER"}
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div>
            <label className="fbt-label">Quarry / Supplier Name *</label>
            <input className="fbt-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Vulcan Materials — Napa" />
          </div>
          <div>
            <label className="fbt-label">Address / Location</label>
            <input className="fbt-input" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Street, City, State ZIP" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Contact Person</label>
              <input className="fbt-input" value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Phone</label>
              <input className="fbt-input" type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Email</label>
              <input className="fbt-input" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="fbt-label">Hours of Operation / Loading Hours</label>
            <input className="fbt-input" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} placeholder="M-F 6am-5pm · Sat 7am-12pm · Loading until 4:30pm" />
          </div>
          <div>
            <label className="fbt-label">Delivery Terms</label>
            <input className="fbt-input" value={draft.deliveryTerms} onChange={(e) => setDraft({ ...draft, deliveryTerms: e.target.value })} placeholder="FOB yard · min 22 tons · delivery quoted separately" />
          </div>
          <div>
            <label className="fbt-label">Scale Info</label>
            <input className="fbt-input" value={draft.scaleInfo} onChange={(e) => setDraft({ ...draft, scaleInfo: e.target.value })} placeholder="Certified scales · tickets emailed + paper copy" />
          </div>
          <div>
            <label className="fbt-label">Internal Notes</label>
            <textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Quality, reliability, special deals, quirks…" />
          </div>

          {/* Materials section */}
          <div style={{ borderTop: "2px solid var(--steel)", paddingTop: 16, marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Package size={18} style={{ color: "var(--hazard-deep)" }} />
              <div className="fbt-display" style={{ fontSize: 16 }}>MATERIALS & PRICING</div>
            </div>
            {draft.materials.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", border: "2px dashed var(--concrete)", color: "var(--concrete)" }}>
                <Package size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div className="fbt-mono" style={{ fontSize: 11 }}>NO MATERIALS YET — ADD ONE BELOW</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {draft.materials.map((m, idx) => {
                  const originalPrice = quarry?.materials.find((pm) => pm.id === m.id)?.pricePerTon;
                  const hasChanged = originalPrice !== undefined && Number(originalPrice) !== Number(m.pricePerTon) && m.pricePerTon !== "";
                  const diff = hasChanged ? Number(m.pricePerTon) - Number(originalPrice) : 0;
                  return (
                    <div key={m.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10, alignItems: "end", padding: 10, border: "1.5px solid var(--steel)", background: hasChanged ? "#FEF3C7" : "#FFF" }}>
                      <div>
                        <label className="fbt-label" style={{ marginBottom: 4 }}>Material</label>
                        <input className="fbt-input" style={{ padding: "8px 10px", fontSize: 13 }} value={m.name} onChange={(e) => updateMaterial(idx, "name", e.target.value)} placeholder="Basalt 3/4 chip" />
                      </div>
                      <div>
                        <label className="fbt-label" style={{ marginBottom: 4 }}>$ / ton</label>
                        <input className="fbt-input" style={{ padding: "8px 10px", fontSize: 13 }} type="number" step="0.01" value={m.pricePerTon} onChange={(e) => updateMaterial(idx, "pricePerTon", e.target.value)} placeholder="28.50" />
                        {hasChanged && (
                          <div className="fbt-mono" style={{ fontSize: 9, marginTop: 3, color: diff > 0 ? "var(--safety)" : "var(--good)" }}>
                            {diff > 0 ? "↑" : "↓"} ${Math.abs(diff).toFixed(2)} from ${Number(originalPrice).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <button className="btn-danger" onClick={() => removeMaterial(idx)}><Trash2 size={12} /></button>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={addMaterial} className="btn-ghost" style={{ marginTop: 12 }}>
              <Plus size={14} style={{ marginRight: 6 }} /> ADD MATERIAL
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <button onClick={save} className="btn-primary"><CheckCircle2 size={16} /> SAVE QUARRY</button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== QUARRY DETAIL MODAL ==========
const QuarryDetailModal = ({ quarry, dispatches, onEdit, onDelete, onClose }) => {
  const [historyFor, setHistoryFor] = useState(null);
  const linkedDispatches = useMemo(
    () => dispatches.filter((d) => d.quarryId === quarry.id).sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [dispatches, quarry]
  );

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.1em" }}>QUARRY / SUPPLIER</div>
            <h3 className="fbt-display" style={{ fontSize: 22, margin: "4px 0 0" }}>{quarry.name}</h3>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onEdit} className="btn-ghost" style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "6px 12px", fontSize: 11 }}><Edit2 size={12} /></button>
            <button onClick={onDelete} className="btn-danger" style={{ color: "var(--hazard)", borderColor: "var(--hazard)" }}><Trash2 size={12} /></button>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ CONTACT & OPS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 20, fontSize: 13, fontFamily: "JetBrains Mono, monospace" }}>
            {quarry.address && <div style={{ gridColumn: "1 / -1" }}><strong>ADDRESS:</strong> {quarry.address}</div>}
            {quarry.contactName && <div><strong>CONTACT:</strong> {quarry.contactName}</div>}
            {quarry.phone && <div><strong>PHONE:</strong> <a href={`tel:${quarry.phone.replace(/[^\d+]/g, "")}`} style={{ color: "var(--hazard-deep)" }}>{quarry.phone}</a></div>}
            {quarry.email && <div><strong>EMAIL:</strong> <a href={`mailto:${quarry.email}`} style={{ color: "var(--hazard-deep)" }}>{quarry.email}</a></div>}
            {quarry.hours && <div style={{ gridColumn: "1 / -1" }}><strong>HOURS:</strong> {quarry.hours}</div>}
            {quarry.deliveryTerms && <div style={{ gridColumn: "1 / -1" }}><strong>TERMS:</strong> {quarry.deliveryTerms}</div>}
            {quarry.scaleInfo && <div style={{ gridColumn: "1 / -1" }}><strong>SCALE:</strong> {quarry.scaleInfo}</div>}
          </div>

          {quarry.notes && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ NOTES</div>
              <div style={{ padding: 12, background: "#FEF3C7", borderLeft: "3px solid var(--hazard)", fontSize: 13, marginBottom: 20, whiteSpace: "pre-wrap" }}>
                {quarry.notes}
              </div>
            </>
          )}

          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ MATERIALS & CURRENT PRICING</div>
          {quarry.materials.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--concrete)", border: "2px dashed var(--concrete)", fontSize: 13, marginBottom: 20 }}>No materials listed yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
              {quarry.materials.map((m) => (
                <div key={m.id} style={{ border: "2px solid var(--steel)", background: "#FFF" }}>
                  <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div className="fbt-display" style={{ fontSize: 16 }}>{m.name}</div>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                        UPDATED {fmtDate(m.updatedAt)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div className="fbt-display" style={{ fontSize: 22, color: "var(--hazard-deep)" }}>{fmt$(m.pricePerTon)}/t</div>
                      {m.history && m.history.length > 0 && (
                        <button className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10 }} onClick={() => setHistoryFor(historyFor === m.id ? null : m.id)}>
                          <History size={11} style={{ marginRight: 4 }} /> HISTORY ({m.history.length})
                        </button>
                      )}
                    </div>
                  </div>
                  {historyFor === m.id && m.history && m.history.length > 0 && (
                    <div style={{ borderTop: "1px solid var(--steel)", padding: 12, background: "#F5F5F4" }}>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>PRICE HISTORY (NEWEST FIRST)</div>
                      <div style={{ display: "grid", gap: 4 }}>
                        {m.history.map((h, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                            <span>{fmtDate(h.date)}</span>
                            <span style={{ color: "var(--concrete)" }}>{fmt$(h.price)}/ton</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {linkedDispatches.length > 0 && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>
                ▸ SOURCED ON {linkedDispatches.length} DISPATCH{linkedDispatches.length !== 1 ? "ES" : ""}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {linkedDispatches.slice(0, 10).map((d) => (
                  <div key={d.id} style={{ padding: 10, border: "1px solid var(--steel)", background: "#FFF", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                    <strong>#{d.code}</strong> · {d.jobName} · <span style={{ color: "var(--concrete)" }}>{fmtDate(d.date)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ========== MATERIAL COMPARISON ==========
const ComparisonModal = ({ quarries, materialSearch, onClose }) => {
  // Filter quarries that sell the searched material, sort by price
  const matched = useMemo(() => {
    const s = materialSearch.trim().toLowerCase();
    if (!s) return [];
    const results = [];
    quarries.forEach((q) => {
      q.materials.forEach((m) => {
        if (m.name.toLowerCase().includes(s)) {
          results.push({ quarry: q, material: m });
        }
      });
    });
    return results.sort((a, b) => Number(a.material.pricePerTon) - Number(b.material.pricePerTon));
  }, [quarries, materialSearch]);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <BarChart3 size={18} /> MATERIAL SEARCH: "{materialSearch.toUpperCase()}"
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24 }}>
          {matched.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--concrete)" }}>
              <Package size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
              <div className="fbt-mono" style={{ fontSize: 12 }}>NO QUARRIES SELL "{materialSearch.toUpperCase()}"</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Try a different search term or add this material to one of your quarries.</div>
            </div>
          ) : (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 12 }}>
                ▸ {matched.length} MATCH{matched.length !== 1 ? "ES" : ""} · SORTED BY PRICE (LOWEST FIRST)
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {matched.map(({ quarry, material }, idx) => (
                  <div key={`${quarry.id}-${material.id}`} style={{ padding: 14, border: "2px solid var(--steel)", background: idx === 0 ? "#D1FAE5" : "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      {idx === 0 && <span className="chip" style={{ background: "var(--good)", color: "#FFF", marginBottom: 6, display: "inline-flex" }}>★ BEST PRICE</span>}
                      <div className="fbt-display" style={{ fontSize: 16 }}>{quarry.name}</div>
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
                        {material.name}{quarry.address && ` · ${quarry.address}`}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="fbt-display" style={{ fontSize: 24, color: idx === 0 ? "var(--good)" : "var(--hazard-deep)" }}>{fmt$(material.pricePerTon)}/t</div>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>UPDATED {fmtDate(material.updatedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ========== FREIGHT BILL EDIT / APPROVE MODAL ==========
const FBEditModal = ({ fb, dispatches, contacts, projects = [], editFreightBill, invoices = [], onClose, onToast, currentUser }) => {
  const dispatch = dispatches.find((d) => d.id === fb.dispatchId);
  const project = dispatch ? projects.find((p) => p.id === dispatch.projectId) : null;
  const assignment = dispatch ? (dispatch.assignments || []).find((a) => a.aid === fb.assignmentId) : null;
  const invoiceOnFb = fb.invoiceId ? invoices.find((i) => i.id === fb.invoiceId) : null;
  const lockedOnInvoice = !!fb.invoiceId || !!fb.billingLockedAt;
  const lockedAsPaid = !!fb.paidAt || !!fb.customerPaidAt || !!fb.payStatementLockedAt;
  const billingSnapshotLocked = !!fb.billingLockedAt || !!fb.invoiceId;
  const paySnapshotLocked = !!fb.payStatementLockedAt;
  const [unlocked, setUnlocked] = useState(false); // admin can request unlock

  // Compute hours from pickup + dropoff times — used to seed HOURLY line qty on modal open
  const hoursFromTimes = (pickup, dropoff) => {
    if (!pickup || !dropoff) return 0;
    const [h1, m1] = String(pickup).split(":").map(Number);
    const [h2, m2] = String(dropoff).split(":").map(Number);
    if (isNaN(h1) || isNaN(h2)) return 0;
    const mins = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
    return mins > 0 ? Number((mins / 60).toFixed(2)) : 0;
  };
  // Seed value used for HOURLY qty: prefer hoursBilled if set, else calculate from times, else 0
  const seedHours = Number(fb.hoursBilled) > 0
    ? Number(fb.hoursBilled)
    : hoursFromTimes(fb.pickupTime, fb.dropoffTime);
  const [draft, setDraft] = useState({
    freightBillNumber: fb.freightBillNumber || "",
    driverName: fb.driverName || "",
    truckNumber: fb.truckNumber || "",
    material: fb.material || "",
    tonnage: fb.tonnage || "",
    loadCount: fb.loadCount || 1,
    pickupTime: fb.pickupTime || "",
    dropoffTime: fb.dropoffTime || "",
    hoursBilled: fb.hoursBilled || "",
    jobNameOverride: fb.jobNameOverride || "",
    description: fb.description || "",
    notes: fb.notes || "",
    adminNotes: fb.adminNotes || "",
    photos: fb.photos || [],
    extras: fb.extras || [],
    minHoursApplied: !!fb.minHoursApplied,

    // BILLING SNAPSHOT — what we charge customer
    // Default: existing snapshot, or seed from submitted qty + dispatch rate
    billedHours: fb.billedHours != null ? String(fb.billedHours) : (fb.hoursBilled != null ? String(fb.hoursBilled) : ""),
    billedTons: fb.billedTons != null ? String(fb.billedTons) : (fb.tonnage != null ? String(fb.tonnage) : ""),
    billedLoads: fb.billedLoads != null ? String(fb.billedLoads) : (fb.loadCount != null ? String(fb.loadCount) : ""),
    billedRate: fb.billedRate != null ? String(fb.billedRate) : (
      dispatch?.ratePerHour ? String(dispatch.ratePerHour) :
      dispatch?.ratePerTon ? String(dispatch.ratePerTon) :
      dispatch?.ratePerLoad ? String(dispatch.ratePerLoad) : ""
    ),
    billedMethod: fb.billedMethod || (
      dispatch?.ratePerHour ? "hour" :
      dispatch?.ratePerTon ? "ton" :
      dispatch?.ratePerLoad ? "load" : "hour"
    ),

    // PAY SNAPSHOT — what sub/driver gets paid
    // Default: existing snapshot, or seed from submitted qty + assignment payRate
    paidHours: fb.paidHours != null ? String(fb.paidHours) : (fb.hoursBilled != null ? String(fb.hoursBilled) : ""),
    paidTons: fb.paidTons != null ? String(fb.paidTons) : (fb.tonnage != null ? String(fb.tonnage) : ""),
    paidLoads: fb.paidLoads != null ? String(fb.paidLoads) : (fb.loadCount != null ? String(fb.loadCount) : ""),
    paidRate: fb.paidRate != null ? String(fb.paidRate) : (assignment?.payRate ? String(assignment.payRate) : ""),
    paidMethodSnapshot: fb.paidMethodSnapshot || assignment?.payMethod || "hour",

    // LINE-ITEM STRUCTURE (v16) — new master data model
    // If fb already has lines (from backfill), use them. Otherwise seed with a single HOURLY line
    // based on dispatch/assignment rates.
    billingLines: Array.isArray(fb.billingLines) && fb.billingLines.length > 0
      ? (() => {
          // BACKFILL FIX: if an existing HOURLY line has qty=0 and times give a real value, update it
          if (seedHours > 0) {
            return fb.billingLines.map((ln) => {
              if (ln.code === "H" && (!ln.qty || Number(ln.qty) === 0)) {
                const rate = Number(ln.rate) || 0;
                const gross = Number((seedHours * rate).toFixed(2));
                const net = ln.brokerable
                  ? Number((gross - gross * (Number(ln.brokeragePct) || 0) / 100).toFixed(2))
                  : gross;
                return { ...ln, qty: seedHours, gross, net };
              }
              return ln;
            });
          }
          return fb.billingLines;
        })()
      : (() => {
          // Seed one billing line from dispatch rate
          const method = dispatch?.ratePerHour ? "hour" : dispatch?.ratePerTon ? "ton" : dispatch?.ratePerLoad ? "load" : "hour";
          const code = method === "hour" ? "H" : method === "ton" ? "T" : "L";
          const item = method === "hour" ? "HOURLY" : method === "ton" ? "TONS" : "LOADS";
          const rate = Number(dispatch?.ratePerHour || dispatch?.ratePerTon || dispatch?.ratePerLoad || 0);
          // For HOUR method: use computed hours from times, else hoursBilled, else 0
          // For TON/LOAD: use submitted qty
          const qty = method === "hour" ? seedHours
                   : method === "ton" ? Number(fb.tonnage) || 0
                   : Number(fb.loadCount) || 1;
          if (rate > 0 || qty > 0) {
            const gross = Number((qty * rate).toFixed(2));
            return [{
              id: Date.now(),
              code, item, qty, rate, gross,
              brokerable: false, brokeragePct: 0, net: gross,
              copyToPay: false,
              createdAt: new Date().toISOString(),
              createdBy: "system-seed",
            }];
          }
          return [];
        })(),
    payingLines: Array.isArray(fb.payingLines) && fb.payingLines.length > 0
      ? (() => {
          // BACKFILL FIX: if an existing HOURLY line has qty=0 and times give a real value, update it
          if (seedHours > 0) {
            return fb.payingLines.map((ln) => {
              if (ln.code === "H" && (!ln.qty || Number(ln.qty) === 0)) {
                const rate = Number(ln.rate) || 0;
                const gross = Number((seedHours * rate).toFixed(2));
                const net = ln.brokerable
                  ? Number((gross - gross * (Number(ln.brokeragePct) || 0) / 100).toFixed(2))
                  : gross;
                return { ...ln, qty: seedHours, gross, net };
              }
              return ln;
            });
          }
          return fb.payingLines;
        })()
      : (() => {
          // Seed one pay line from assignment rate (if a rate is known)
          const method = assignment?.payMethod || "hour";
          const code = method === "hour" ? "H" : method === "ton" ? "T" : "L";
          const item = method === "hour" ? "HOURLY" : method === "ton" ? "TONS" : "LOADS";
          const rate = Number(assignment?.payRate || 0);
          // For HOUR method: use computed hours from times, else hoursBilled, else 0
          // For TON/LOAD: use submitted qty
          const qty = method === "hour" ? seedHours
                   : method === "ton" ? Number(fb.tonnage) || 0
                   : Number(fb.loadCount) || 1;
          if (rate > 0 || qty > 0) {
            const gross = Number((qty * rate).toFixed(2));
            const isSub = assignment?.kind === "sub";
            const contactForPay = assignment?.contactId ? contacts.find((c) => c.id === assignment.contactId) : null;
            const brokerable = isSub && !!contactForPay?.brokerageApplies;
            const brokeragePct = brokerable ? Number(contactForPay?.brokeragePercent || 8) : 0;
            const net = Number((gross - (brokerable ? gross * brokeragePct / 100 : 0)).toFixed(2));
            return [{
              id: Date.now() + 1,
              code, item, qty, rate, gross,
              brokerable, brokeragePct, net,
              sourceBillingLineId: null,
              createdAt: new Date().toISOString(),
              createdBy: "system-seed",
            }];
          }
          return [];
        })(),
  });
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LINE-ITEM HELPERS (v16 unified structure)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Compute net for a line based on gross, brokerable flag, and brokerage %
  const computeLineNet = (line) => {
    const gross = Number(line.gross) || (Number(line.qty) || 0) * (Number(line.rate) || 0);
    if (line.brokerable) {
      const pct = Number(line.brokeragePct) || 0;
      return Number((gross - gross * pct / 100).toFixed(2));
    }
    return Number(gross.toFixed(2));
  };

  // Recompute gross + net for a line after qty/rate/brokerable/brokeragePct changes
  const recomputeLine = (line) => {
    const qty = Number(line.qty) || 0;
    const rate = Number(line.rate) || 0;
    const gross = Number((qty * rate).toFixed(2));
    const net = line.brokerable
      ? Number((gross - gross * (Number(line.brokeragePct) || 0) / 100).toFixed(2))
      : gross;
    return { ...line, gross, net };
  };

  // Brokerage % from the SUB contact (pay side — drivers get 0)
  const getContactBrokeragePct = () => {
    if (!assignment) return 0;
    const isSub = assignment.kind === "sub";
    if (!isSub) return 0; // drivers never have brokerage
    const contact = contacts.find((c) => c.id === assignment.contactId);
    return contact?.brokerageApplies ? (Number(contact?.brokeragePercent) || 8) : 0;
  };

  // Brokerage % from the CUSTOMER contact (billing side — broker customers charge us %)
  // Dispatch → client_id → contact lookup
  const getCustomerBrokeragePct = () => {
    if (!dispatch?.clientId) return 0;
    const customer = contacts.find((c) => c.id === dispatch.clientId);
    return customer?.brokerageApplies ? (Number(customer?.brokeragePercent) || 8) : 0;
  };

  // Add a new billing line
  const addBillingLine = (seed = {}) => {
    const customerPct = getCustomerBrokeragePct(); // NEW: read from customer (not sub)
    const newLine = recomputeLine({
      id: Date.now(),
      code: seed.code || "",
      item: seed.item || "",
      qty: seed.qty != null ? Number(seed.qty) : 0,
      rate: seed.rate != null ? Number(seed.rate) : 0,
      brokerable: !!seed.brokerable,
      // Default to customer's % if they charge us brokerage, otherwise 8%
      brokeragePct: customerPct > 0 ? customerPct : 8,
      copyToPay: !!seed.copyToPay,
      note: seed.note || "",
      // If FB is already locked on invoice, mark this line as a post-lock adjustment
      isAdjustment: billingSnapshotLocked || !!seed.isAdjustment,
      createdAt: new Date().toISOString(),
      createdBy: currentUser || "admin",
    });
    setDraft((d) => ({ ...d, billingLines: [...(d.billingLines || []), newLine] }));
  };

  const updateBillingLine = (id, patch) => {
    setDraft((d) => {
      const next = (d.billingLines || []).map((ln) => {
        if (ln.id !== id) return ln;
        const merged = { ...ln, ...patch };
        // If Br? just turned on AND line has no pct yet, snapshot customer %
        if (patch.brokerable === true && !ln.brokerable && (!merged.brokeragePct || merged.brokeragePct === 8)) {
          const customerPct = getCustomerBrokeragePct();
          if (customerPct > 0) merged.brokeragePct = customerPct;
        }
        return recomputeLine(merged);
      });
      return { ...d, billingLines: next };
    });
  };

  const deleteBillingLine = (id) => {
    setDraft((d) => ({ ...d, billingLines: (d.billingLines || []).filter((ln) => ln.id !== id) }));
  };

  // Add/update/delete paying lines — same shape but NO copyToPay field, optional sourceBillingLineId
  const addPayingLine = (seed = {}) => {
    const contactPct = getContactBrokeragePct();
    const newLine = recomputeLine({
      id: Date.now() + Math.floor(Math.random() * 1000),
      code: seed.code || "",
      item: seed.item || "",
      qty: seed.qty != null ? Number(seed.qty) : 0,
      rate: seed.rate != null ? Number(seed.rate) : 0,
      brokerable: seed.brokerable != null ? !!seed.brokerable : (assignment?.kind === "sub"),
      // Always show 8% default (or contact's % if set) even when brokerable=false so admin can see what it'd be
      brokeragePct: contactPct > 0 ? contactPct : 8,
      sourceBillingLineId: seed.sourceBillingLineId || null,
      note: seed.note || "",
      // If FB pay snapshot is already locked, mark this line as a post-lock adjustment
      isAdjustment: paySnapshotLocked || !!seed.isAdjustment,
      createdAt: new Date().toISOString(),
      createdBy: currentUser || "admin",
    });
    setDraft((d) => ({ ...d, payingLines: [...(d.payingLines || []), newLine] }));
  };

  const updatePayingLine = (id, patch) => {
    setDraft((d) => {
      const next = (d.payingLines || []).map((ln) => {
        if (ln.id !== id) return ln;
        const merged = { ...ln, ...patch };
        if (patch.brokerable === true && !ln.brokerable) {
          merged.brokeragePct = getContactBrokeragePct();
        }
        return recomputeLine(merged);
      });
      return { ...d, payingLines: next };
    });
  };

  const deletePayingLine = (id) => {
    setDraft((d) => ({ ...d, payingLines: (d.payingLines || []).filter((ln) => ln.id !== id) }));
  };

  // Auto-sync: when a billing line's copyToPay is checked, ensure a matching pay line exists.
  // When unchecked, remove the matched pay line (if it was auto-created).
  const toggleCopyToPay = (billLineId, checked) => {
    setDraft((d) => {
      const bLines = d.billingLines || [];
      const pLines = d.payingLines || [];
      const bLine = bLines.find((x) => x.id === billLineId);
      if (!bLine) return d;

      // Update the billing line's copyToPay flag
      const nextBLines = bLines.map((x) => x.id === billLineId ? { ...x, copyToPay: checked } : x);

      if (checked) {
        // Add a matching pay line if one doesn't already exist for this billing line
        if (pLines.some((p) => p.sourceBillingLineId === billLineId)) {
          return { ...d, billingLines: nextBLines };
        }
        const isSub = assignment?.kind === "sub";
        const brokPct = getContactBrokeragePct();
        const newPayLine = recomputeLine({
          id: Date.now() + Math.floor(Math.random() * 1000),
          code: bLine.code,
          item: bLine.item,
          qty: bLine.qty,
          rate: bLine.rate,  // admin can edit pay rate after — default is SAME as bill rate
          brokerable: isSub && bLine.brokerable,   // inherit brokerable but only for subs
          brokeragePct: (isSub && bLine.brokerable) ? brokPct : 0,
          sourceBillingLineId: billLineId,
          note: "Copied from billing",
          createdAt: new Date().toISOString(),
          createdBy: currentUser || "admin",
        });
        return { ...d, billingLines: nextBLines, payingLines: [...pLines, newPayLine] };
      } else {
        // Remove the auto-created pay line (if it's still linked to this billing line)
        const nextPLines = pLines.filter((p) => p.sourceBillingLineId !== billLineId);
        return { ...d, billingLines: nextBLines, payingLines: nextPLines };
      }
    });
  };

  // Totals
  const billingTotals = useMemo(() => {
    const lines = draft.billingLines || [];
    const gross = lines.reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
    const brokerableGross = lines.filter((ln) => ln.brokerable).reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
    const brokerageAmt = lines.filter((ln) => ln.brokerable)
      .reduce((s, ln) => s + (Number(ln.gross) || 0) * (Number(ln.brokeragePct) || 0) / 100, 0);
    const net = lines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
    return { count: lines.length, gross, brokerableGross, brokerageAmt, net };
  }, [draft.billingLines]);

  const payingTotals = useMemo(() => {
    const lines = draft.payingLines || [];
    const gross = lines.reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
    const brokerableGross = lines.filter((ln) => ln.brokerable).reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
    const brokerageAmt = lines.filter((ln) => ln.brokerable)
      .reduce((s, ln) => s + (Number(ln.gross) || 0) * (Number(ln.brokeragePct) || 0) / 100, 0);
    const net = lines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
    return { count: lines.length, gross, brokerableGross, brokerageAmt, net };
  }, [draft.payingLines]);

  // Auto-calc hours from pickup/dropoff if both present
  const autoHours = useMemo(() => {
    if (!draft.pickupTime || !draft.dropoffTime) return null;
    const [h1, m1] = draft.pickupTime.split(":").map(Number);
    const [h2, m2] = draft.dropoffTime.split(":").map(Number);
    if (isNaN(h1) || isNaN(h2)) return null;
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins <= 0) return null;
    return (mins / 60).toFixed(2);
  }, [draft.pickupTime, draft.dropoffTime]);

  // Auto-fill billed + paid HOURS whenever pickup/dropoff changes — but only
  // for hour-based methods, and only if the field is currently empty (don't overwrite admin edits).
  // Skips if snapshot is locked to preserve historical values.
  useEffect(() => {
    if (!autoHours) return;
    setDraft((d) => {
      const next = { ...d };
      let changed = false;
      if (d.billedMethod === "hour" && (d.billedHours === "" || d.billedHours == null) && !billingSnapshotLocked) {
        next.billedHours = autoHours;
        changed = true;
      }
      if (d.paidMethodSnapshot === "hour" && (d.paidHours === "" || d.paidHours == null) && !paySnapshotLocked) {
        next.paidHours = autoHours;
        changed = true;
      }
      return changed ? next : d;
    });
  }, [autoHours, billingSnapshotLocked, paySnapshotLocked]);

  const save = async (andApprove = false) => {
    setSaving(true);
    try {
      const actualH = draft.hoursBilled ? Number(draft.hoursBilled) : (autoHours ? Number(autoHours) : null);
      const minH = Number(project?.minimumHours) || 0;
      const belowMin = minH > 0 && actualH != null && actualH < minH;

      const patch = {
        ...fb,
        ...draft,
        tonnage: draft.tonnage ? Number(draft.tonnage) : null,
        loadCount: Number(draft.loadCount) || 1,
        hoursBilled: actualH,

        // Persist BILLING snapshot (unless already locked by invoice)
        billedHours: billingSnapshotLocked && fb.billedHours != null ? fb.billedHours : (draft.billedHours !== "" ? Number(draft.billedHours) : null),
        billedTons:  billingSnapshotLocked && fb.billedTons  != null ? fb.billedTons  : (draft.billedTons  !== "" ? Number(draft.billedTons)  : null),
        billedLoads: billingSnapshotLocked && fb.billedLoads != null ? fb.billedLoads : (draft.billedLoads !== "" ? Number(draft.billedLoads) : null),
        billedRate:  billingSnapshotLocked && fb.billedRate  != null ? fb.billedRate  : (draft.billedRate  !== "" ? Number(draft.billedRate)  : null),
        billedMethod: billingSnapshotLocked && fb.billedMethod ? fb.billedMethod : (draft.billedMethod || null),

        // Persist PAY snapshot (unless already locked by pay statement)
        paidHours: paySnapshotLocked && fb.paidHours != null ? fb.paidHours : (draft.paidHours !== "" ? Number(draft.paidHours) : null),
        paidTons:  paySnapshotLocked && fb.paidTons  != null ? fb.paidTons  : (draft.paidTons  !== "" ? Number(draft.paidTons)  : null),
        paidLoads: paySnapshotLocked && fb.paidLoads != null ? fb.paidLoads : (draft.paidLoads !== "" ? Number(draft.paidLoads) : null),
        paidRate:  paySnapshotLocked && fb.paidRate  != null ? fb.paidRate  : (draft.paidRate  !== "" ? Number(draft.paidRate)  : null),
        paidMethodSnapshot: paySnapshotLocked && fb.paidMethodSnapshot ? fb.paidMethodSnapshot : (draft.paidMethodSnapshot || null),

        // Persist line-item arrays (v16 master data)
        // If billing is locked, don't overwrite existing lines. Otherwise save what's in draft.
        billingLines: billingSnapshotLocked && Array.isArray(fb.billingLines) && fb.billingLines.length > 0
          ? fb.billingLines
          : (draft.billingLines || []),
        payingLines: paySnapshotLocked && Array.isArray(fb.payingLines) && fb.payingLines.length > 0
          ? fb.payingLines
          : (draft.payingLines || []),
      };

      // If admin confirmed min-hours, stamp audit
      if (belowMin && draft.minHoursApplied && !fb.minHoursApplied) {
        patch.minHoursApplied = true;
        patch.minHoursApprovedBy = currentUser || "admin";
        patch.minHoursApprovedAt = new Date().toISOString();
      } else if (!belowMin) {
        patch.minHoursApplied = false;
        patch.minHoursApprovedBy = null;
        patch.minHoursApprovedAt = null;
      } else {
        patch.minHoursApplied = !!draft.minHoursApplied;
      }

      if (andApprove) {
        patch.status = "approved";
        patch.approvedAt = new Date().toISOString();
        patch.approvedBy = currentUser || "admin";
      }
      await editFreightBill(fb.id, patch);
      onToast(andApprove ? "✓ FB APPROVED" : "FB UPDATED");
      onClose();
    } catch (e) {
      console.error(e);
      onToast("SAVE FAILED");
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    if (!confirm("Reject this freight bill? It will be hidden from customer but kept for your records.")) return;
    setSaving(true);
    try {
      await editFreightBill(fb.id, { ...fb, ...draft, status: "rejected" });
      onToast("FB REJECTED");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // v18: Soft-delete FB from the edit modal (admin can remove spam/duplicate submissions).
  // Enforces the same cascade rules as DispatchesTab.removeFreightBill — blocks if
  // the FB is on an invoice, marked paid, or customer-paid. Goes to Recovery tab (30 days).
  const handleDelete = async () => {
    // Cascade check
    const blockers = [];
    if (fb.invoiceId) {
      const inv = invoices.find((i) => i.id === fb.invoiceId);
      blockers.push(`• On invoice ${inv?.invoiceNumber || fb.invoiceId} — remove from that invoice first`);
    }
    if (fb.paidAt) {
      const amt = fb.paidAmount ? ` ($${Number(fb.paidAmount).toFixed(2)})` : "";
      blockers.push(`• Paid to sub/driver${amt} on ${new Date(fb.paidAt).toLocaleDateString()} — unmark paid first`);
    }
    if (fb.customerPaidAt) {
      blockers.push(`• Customer has paid this FB — unmark customer payment first`);
    }

    if (blockers.length > 0) {
      alert([
        `✗ Cannot delete FB#${fb.freightBillNumber || "—"}.`,
        ``,
        `This freight bill has downstream records:`,
        ...blockers,
        ``,
        `Clear these first, then try again.`,
      ].join("\n"));
      return;
    }

    if (!confirm(`Delete FB#${fb.freightBillNumber || "—"}?\n\nThis is a SOFT delete. The FB stays recoverable for 30 days in the Recovery tab.`)) return;
    const reason = prompt('Reason for deletion (optional — e.g. "spam", "duplicate", "test submission"):') || "";

    setSaving(true);
    try {
      await deleteFreightBill(fb.id, { deletedBy: "admin", reason });
      onToast("✓ FB DELETED (RECOVERABLE 30 DAYS)");
      onClose();
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Delete failed: " + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  const unapprove = async () => {
    if (!confirm("Move back to pending? Customer will no longer see this FB.")) return;
    setSaving(true);
    try {
      await editFreightBill(fb.id, { ...fb, ...draft, status: "pending", approvedAt: null, approvedBy: null });
      onToast("MOVED TO PENDING");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const statusColor = fb.status === "approved" ? "var(--good)" : fb.status === "rejected" ? "var(--safety)" : "var(--hazard)";
  const statusLabel = (fb.status || "pending").toUpperCase();

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1100 }}>
        {lightbox && (
          <div onClick={(e) => { e.stopPropagation(); setLightbox(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <img src={lightbox} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} alt="" />
          </div>
        )}
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.1em" }}>
              FREIGHT BILL · #{fb.freightBillNumber || "—"} · <span style={{ color: statusColor }}>● {statusLabel}</span>
            </div>
            <h3 className="fbt-display" style={{ fontSize: 20, margin: "4px 0 0" }}>{dispatch?.jobName || "—"}</h3>
            <div className="fbt-mono" style={{ fontSize: 11, color: "#D6D3D1", marginTop: 2 }}>
              Submitted {fb.submittedAt ? new Date(fb.submittedAt).toLocaleString() : "—"}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          {/* LOCK BANNER — prevents editing of invoiced/paid FBs */}
          {(lockedOnInvoice || lockedAsPaid) && (
            <div style={{
              padding: 14,
              background: unlocked ? "#FEF3C7" : "#FEE2E2",
              border: "2px solid " + (unlocked ? "var(--hazard)" : "var(--safety)"),
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}>
              <Lock size={18} style={{ color: unlocked ? "var(--hazard-deep)" : "var(--safety)" }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 13, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em" }}>
                  {unlocked ? "⚠ LOCK OVERRIDDEN — EDITS WILL CHANGE BILLED INVOICE/PAYROLL" : "🔒 FB LOCKED — DOWNSTREAM RECORDS EXIST"}
                </div>
                <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4, lineHeight: 1.4 }}>
                  {lockedOnInvoice && <div>• On invoice <strong>{invoiceOnFb?.invoiceNumber || fb.invoiceId}</strong></div>}
                  {fb.paidAt && <div>• Paid to sub/driver ${fb.paidAmount ? Number(fb.paidAmount).toFixed(2) : ""} on {new Date(fb.paidAt).toLocaleDateString()}</div>}
                  {fb.customerPaidAt && <div>• Customer paid ${fb.customerPaidAmount ? Number(fb.customerPaidAmount).toFixed(2) : ""} on {new Date(fb.customerPaidAt).toLocaleDateString()}</div>}
                </div>
              </div>
              <button
                onClick={() => {
                  if (unlocked) { setUnlocked(false); return; }
                  if (!confirm("Override lock?\n\nThis FB is on an invoice or has payment records. Editing will create inconsistencies with downstream records. Only override if you're intentionally correcting an error.\n\nContinue?")) return;
                  setUnlocked(true);
                }}
                className="btn-ghost"
                style={{ padding: "6px 12px", fontSize: 10, background: "#FFF", whiteSpace: "nowrap" }}
              >
                {unlocked ? "RE-LOCK" : "OVERRIDE LOCK"}
              </button>
            </div>
          )}

          {/* Core IDs */}
          <fieldset disabled={!unlocked && (lockedOnInvoice || lockedAsPaid)} style={{ border: "none", padding: 0, margin: 0, display: "grid", gap: 14, opacity: (!unlocked && (lockedOnInvoice || lockedAsPaid)) ? 0.65 : 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Freight Bill #</label>
              <input className="fbt-input" value={draft.freightBillNumber} onChange={(e) => setDraft({ ...draft, freightBillNumber: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Truck #</label>
              <input className="fbt-input" value={draft.truckNumber} onChange={(e) => setDraft({ ...draft, truckNumber: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Driver Name</label>
              <input className="fbt-input" value={draft.driverName} onChange={(e) => setDraft({ ...draft, driverName: e.target.value })} />
            </div>
          </div>

          {/* Job info */}
          <div>
            <label className="fbt-label">Job Name Override (optional — leaves order's job name alone)</label>
            <input className="fbt-input" value={draft.jobNameOverride} onChange={(e) => setDraft({ ...draft, jobNameOverride: e.target.value })} placeholder={dispatch?.jobName || "Uses order's job name by default"} />
          </div>
          <div>
            <label className="fbt-label">Description of Work</label>
            <textarea className="fbt-textarea" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="e.g. 3 loads hauled basalt from Vulcan Napa to Salinas job site" style={{ minHeight: 60 }} />
          </div>

          {/* Material / tonnage / loads */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Material</label>
              <input className="fbt-input" value={draft.material} onChange={(e) => setDraft({ ...draft, material: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Tonnage</label>
              <input className="fbt-input" type="number" step="0.01" value={draft.tonnage} onChange={(e) => setDraft({ ...draft, tonnage: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Load Count</label>
              <input className="fbt-input" type="number" min="1" value={draft.loadCount} onChange={(e) => setDraft({ ...draft, loadCount: e.target.value })} />
            </div>
          </div>

          {/* Hours */}
          <div style={{ padding: 12, background: "#FEF3C7", border: "1.5px solid var(--hazard)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard-deep)", letterSpacing: "0.1em", marginBottom: 8 }}>
              ▸ HOURS (FOR BILLING)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
              <div>
                <label className="fbt-label">Pickup Time</label>
                <input className="fbt-input" type="time" value={draft.pickupTime} onChange={(e) => setDraft({ ...draft, pickupTime: e.target.value })} />
              </div>
              <div>
                <label className="fbt-label">Dropoff Time</label>
                <input className="fbt-input" type="time" value={draft.dropoffTime} onChange={(e) => setDraft({ ...draft, dropoffTime: e.target.value })} />
              </div>
            </div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 6 }}>
              ▸ HOURS FOR BILLING &amp; PAY ARE SET IN THE SNAPSHOT PANEL BELOW
            </div>

            {/* Minimum hours warning */}
            {(() => {
              const actualH = draft.hoursBilled ? Number(draft.hoursBilled) : (autoHours ? Number(autoHours) : 0);
              const minH = Number(project?.minimumHours) || 0;
              if (minH <= 0 || actualH <= 0 || actualH >= minH) return null;
              return (
                <div style={{ marginTop: 10, padding: 12, background: "#FEF3C7", border: "2px solid var(--hazard)" }}>
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", fontWeight: 700, marginBottom: 6 }}>
                    ⚠ BELOW PROJECT MINIMUM
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>
                    Actual hours: <strong>{actualH.toFixed(2)}</strong> · Project "{project.name}" minimum: <strong>{minH}</strong> hrs
                    <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
                      ▸ CUSTOMER WILL BE INVOICED FOR {minH} HRS · SUB PAID FOR {actualH.toFixed(2)} HRS (ACTUAL)
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={!!draft.minHoursApplied}
                      onChange={(e) => setDraft({ ...draft, minHoursApplied: e.target.checked })}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    CONFIRM — APPLY {minH}-HR MINIMUM ON INVOICE
                  </label>
                  {fb.minHoursApplied && fb.minHoursApprovedBy && (
                    <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 6 }}>
                      Previously confirmed by {fb.minHoursApprovedBy} on {fb.minHoursApprovedAt?.slice(0, 10)}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Notes */}
          <div>
            <label className="fbt-label">Driver Notes (from submission)</label>
            <textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} style={{ minHeight: 50 }} />
          </div>
          <div>
            <label className="fbt-label">Admin Notes (internal, customer doesn't see)</label>
            <textarea className="fbt-textarea" value={draft.adminNotes} onChange={(e) => setDraft({ ...draft, adminNotes: e.target.value })} placeholder="Why I corrected hours, any flags, etc." style={{ minHeight: 50, background: "#FEF3C7" }} />
          </div>


          </fieldset>


          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              v16 LINE ITEM TABLES — new master data model
              Combined billing + pay entry like DumpTruckSoftware TRLoDTS
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div style={{ borderTop: "3px double var(--steel)", paddingTop: 14 }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--steel)", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>
              ▸ BILLING &amp; PAY LINES (NEW STRUCTURE)
            </div>

            {/* ─── BILLING LINES ─── */}
            <div style={{ padding: 12, background: billingSnapshotLocked ? "#F0F9FF" : "#FFF", border: "2px solid " + (billingSnapshotLocked ? "#0EA5E9" : "#0369A1"), marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
                <div className="fbt-mono" style={{ fontSize: 11, color: "#0369A1", letterSpacing: "0.1em", fontWeight: 700 }}>
                  🏢 BILLING LINES (BILL TO CUSTOMER)
                </div>
                {billingSnapshotLocked && (
                  <span className="chip" style={{ background: "#0EA5E9", color: "#FFF", fontSize: 9, padding: "2px 6px" }}>
                    <Lock size={9} style={{ marginRight: 3, verticalAlign: "middle" }} />LOCKED · {invoiceOnFb?.invoiceNumber || "invoiced"}
                  </span>
                )}
              </div>

              {/* Quick-add buttons — when LOCKED, new rows become adjustments */}
              <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                {billingSnapshotLocked && (
                  <span className="fbt-mono" style={{ fontSize: 9, color: "var(--hazard-deep)", letterSpacing: "0.08em", marginRight: 6 }}>
                    + POST-LOCK ADJUSTMENT:
                  </span>
                )}
                <button type="button" onClick={() => addBillingLine({ code: "H", item: billingSnapshotLocked ? "HOURLY (adj)" : "HOURLY", rate: Number(dispatch?.ratePerHour) || 0 })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ HOURS</button>
                <button type="button" onClick={() => addBillingLine({ code: "T", item: billingSnapshotLocked ? "TONS (adj)" : "TONS", rate: Number(dispatch?.ratePerTon) || 0 })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ TONS</button>
                <button type="button" onClick={() => addBillingLine({ code: "L", item: billingSnapshotLocked ? "LOADS (adj)" : "LOADS", rate: Number(dispatch?.ratePerLoad) || 0 })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ LOADS</button>
                <button type="button" onClick={() => addBillingLine({ code: "TOLL", item: "Tolls", qty: 1 })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ TOLL</button>
                <button type="button" onClick={() => addBillingLine({ code: "DUMP", item: "Dump Fees", qty: 1 })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ DUMP</button>
                <button type="button" onClick={() => addBillingLine({ code: "FUEL", item: "Fuel", qty: 1 })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ FUEL</button>
                <button type="button" onClick={() => addBillingLine({ code: "OTHER", item: "" })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ OTHER</button>
              </div>

              {/* Lines table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 11, fontFamily: "JetBrains Mono, monospace", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #0369A1", color: "#0369A1", fontSize: 9, letterSpacing: "0.05em" }}>
                      <th style={{ textAlign: "left", padding: "4px 6px", width: 50 }}>CODE</th>
                      <th style={{ textAlign: "left", padding: "4px 6px" }}>ITEM</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 70 }}>QTY</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 80 }}>RATE</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 85 }}>GROSS</th>
                      <th style={{ textAlign: "center", padding: "4px 6px", width: 40 }}>BR?</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 50 }}>%</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 85 }}>NET</th>
                      <th style={{ textAlign: "center", padding: "4px 6px", width: 40 }}>CP?</th>
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(draft.billingLines || []).length === 0 && (
                      <tr><td colSpan={10} style={{ padding: 16, textAlign: "center", color: "var(--concrete)", fontStyle: "italic" }}>No billing lines yet — use the quick-add buttons above.</td></tr>
                    )}
                    {(draft.billingLines || []).map((ln) => {
                      // Row is locked only if the FB is locked AND this line is NOT an adjustment
                      const rowLocked = billingSnapshotLocked && !ln.isAdjustment;
                      const rowBg = ln.isAdjustment ? "#FEF3C7" : "transparent";
                      return (
                      <tr key={ln.id} style={{ borderBottom: "1px solid #BAE6FD", background: rowBg }}>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="text" value={ln.code || ""} onChange={(e) => updateBillingLine(ln.id, { code: e.target.value.toUpperCase() })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, fontFamily: "inherit", border: "1px solid #BAE6FD", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="text" value={ln.item || ""} onChange={(e) => updateBillingLine(ln.id, { item: e.target.value })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, fontFamily: "inherit", border: "1px solid #BAE6FD", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                          {ln.isAdjustment && <div style={{ fontSize: 8, color: "var(--hazard-deep)", marginTop: 2, fontWeight: 700 }}>⚙ POST-LOCK ADJ</div>}
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="number" step="0.01" value={ln.qty || ""} onChange={(e) => updateBillingLine(ln.id, { qty: e.target.value })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, textAlign: "right", fontFamily: "inherit", border: "1px solid #BAE6FD", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="number" step="0.01" value={ln.rate || ""} onChange={(e) => updateBillingLine(ln.id, { rate: e.target.value })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, textAlign: "right", fontFamily: "inherit", border: "1px solid #BAE6FD", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{fmt$(ln.gross)}</td>
                        <td style={{ padding: "4px 6px", textAlign: "center" }}>
                          <input type="checkbox" checked={!!ln.brokerable} onChange={(e) => updateBillingLine(ln.id, { brokerable: e.target.checked })}
                            disabled={rowLocked} />
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right" }}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={ln.brokeragePct ?? 8}
                            onChange={(e) => updateBillingLine(ln.id, { brokeragePct: e.target.value === "" ? 0 : Number(e.target.value) })}
                            disabled={rowLocked || !ln.brokerable}
                            style={{
                              width: 48, padding: "3px 4px", fontSize: 10, textAlign: "right",
                              fontFamily: "inherit",
                              border: "1px solid #BAE6FD",
                              background: (!ln.brokerable || rowLocked) ? "#F5F5F4" : "#FFF",
                              color: ln.brokerable ? "var(--steel)" : "var(--concrete)",
                              opacity: ln.brokerable ? 1 : 0.55,
                            }}
                          />
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700, color: "#0369A1" }}>{fmt$(ln.net)}</td>
                        <td style={{ padding: "4px 6px", textAlign: "center" }}>
                          <input type="checkbox" checked={!!ln.copyToPay} onChange={(e) => toggleCopyToPay(ln.id, e.target.checked)}
                            disabled={rowLocked}
                            title="Copy this line to the sub/driver's pay side" />
                        </td>
                        <td style={{ padding: "4px 2px", textAlign: "center" }}>
                          {!rowLocked && (
                            <button type="button" onClick={() => deleteBillingLine(ln.id)}
                              style={{ background: "transparent", border: "none", color: "var(--safety)", cursor: "pointer", padding: 2 }} title="Delete line">
                              <X size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                  {billingTotals.count > 0 && (
                    <tfoot>
                      <tr style={{ borderTop: "2px solid #0369A1", background: "#F0F9FF" }}>
                        <td colSpan={4} style={{ padding: "6px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#0369A1" }}>TOTALS</td>
                        <td style={{ padding: "6px", textAlign: "right", fontWeight: 700 }}>{fmt$(billingTotals.gross)}</td>
                        <td colSpan={2} style={{ padding: "6px", textAlign: "right", fontSize: 9, color: "var(--concrete)" }}>
                          {billingTotals.brokerageAmt > 0 ? `−${fmt$(billingTotals.brokerageAmt)}` : ""}
                        </td>
                        <td style={{ padding: "6px", textAlign: "right", fontWeight: 700, color: "#0369A1", fontSize: 13 }}>{fmt$(billingTotals.net)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* ─── PAYING LINES ─── */}
            <div style={{ padding: 12, background: paySnapshotLocked ? "#F0FDF4" : "#FFF", border: "2px solid " + (paySnapshotLocked ? "var(--good)" : "var(--good)") }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--good)", letterSpacing: "0.1em", fontWeight: 700 }}>
                  🚚 PAYING LINES (PAY TO SUB / DRIVER)
                </div>
                {paySnapshotLocked && (
                  <span className="chip" style={{ background: "var(--good)", color: "#FFF", fontSize: 9, padding: "2px 6px" }}>
                    <Lock size={9} style={{ marginRight: 3, verticalAlign: "middle" }} />LOCKED
                  </span>
                )}
              </div>

              {/* Quick-add buttons — when LOCKED, new rows become adjustments */}
              <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                {paySnapshotLocked && (
                  <span className="fbt-mono" style={{ fontSize: 9, color: "var(--hazard-deep)", letterSpacing: "0.08em", marginRight: 6 }}>
                    + POST-LOCK ADJUSTMENT:
                  </span>
                )}
                <button type="button" onClick={() => addPayingLine({ code: "H", item: paySnapshotLocked ? "HOURLY (adj)" : "HOURLY", rate: Number(assignment?.payRate) || 0, brokerable: assignment?.kind === "sub" && !!getContactBrokeragePct() })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ HOURS</button>
                <button type="button" onClick={() => addPayingLine({ code: "T", item: paySnapshotLocked ? "TONS (adj)" : "TONS" })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ TONS</button>
                <button type="button" onClick={() => addPayingLine({ code: "L", item: paySnapshotLocked ? "LOADS (adj)" : "LOADS" })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ LOADS</button>
                <button type="button" onClick={() => addPayingLine({ code: "TOLL", item: "Tolls", qty: 1, brokerable: false })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ TOLL REIMB</button>
                <button type="button" onClick={() => addPayingLine({ code: "DUMP", item: "Dump Fees", qty: 1, brokerable: false })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ DUMP REIMB</button>
                <button type="button" onClick={() => addPayingLine({ code: "OTHER", item: "", brokerable: false })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ OTHER</button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 11, fontFamily: "JetBrains Mono, monospace", borderCollapse: "collapse", minWidth: 720 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--good)", color: "var(--good)", fontSize: 9, letterSpacing: "0.05em" }}>
                      <th style={{ textAlign: "left", padding: "4px 6px", width: 50 }}>CODE</th>
                      <th style={{ textAlign: "left", padding: "4px 6px" }}>ITEM</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 70 }}>QTY</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 80 }}>RATE</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 85 }}>GROSS</th>
                      <th style={{ textAlign: "center", padding: "4px 6px", width: 40 }}>BR?</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 50 }}>%</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 85 }}>NET</th>
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(draft.payingLines || []).length === 0 && (
                      <tr><td colSpan={9} style={{ padding: 16, textAlign: "center", color: "var(--concrete)", fontStyle: "italic" }}>No pay lines yet — use the quick-add buttons above, or check CP? on a billing line.</td></tr>
                    )}
                    {(draft.payingLines || []).map((ln) => {
                      // Row is locked only if pay is locked AND this line is NOT an adjustment
                      const rowLocked = paySnapshotLocked && !ln.isAdjustment;
                      const rowBg = ln.isAdjustment ? "#FEF3C7" : (ln.sourceBillingLineId ? "#ECFDF5" : "transparent");
                      return (
                      <tr key={ln.id} style={{ borderBottom: "1px solid #86EFAC", background: rowBg }}>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="text" value={ln.code || ""} onChange={(e) => updatePayingLine(ln.id, { code: e.target.value.toUpperCase() })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, fontFamily: "inherit", border: "1px solid #86EFAC", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="text" value={ln.item || ""} onChange={(e) => updatePayingLine(ln.id, { item: e.target.value })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, fontFamily: "inherit", border: "1px solid #86EFAC", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                          {ln.sourceBillingLineId && <div style={{ fontSize: 8, color: "var(--good)", marginTop: 2 }}>↖ from billing</div>}
                          {ln.isAdjustment && <div style={{ fontSize: 8, color: "var(--hazard-deep)", marginTop: 2, fontWeight: 700 }}>⚙ POST-LOCK ADJ</div>}
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="number" step="0.01" value={ln.qty || ""} onChange={(e) => updatePayingLine(ln.id, { qty: e.target.value })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, textAlign: "right", fontFamily: "inherit", border: "1px solid #86EFAC", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="number" step="0.01" value={ln.rate || ""} onChange={(e) => updatePayingLine(ln.id, { rate: e.target.value })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, textAlign: "right", fontFamily: "inherit", border: "1px solid #86EFAC", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{fmt$(ln.gross)}</td>
                        <td style={{ padding: "4px 6px", textAlign: "center" }}>
                          <input type="checkbox" checked={!!ln.brokerable} onChange={(e) => updatePayingLine(ln.id, { brokerable: e.target.checked })}
                            disabled={rowLocked || assignment?.kind !== "sub"}
                            title={assignment?.kind !== "sub" ? "Brokerage only applies to subs" : "Apply brokerage to this line"} />
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right" }}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={ln.brokeragePct ?? 8}
                            onChange={(e) => updatePayingLine(ln.id, { brokeragePct: e.target.value === "" ? 0 : Number(e.target.value) })}
                            disabled={rowLocked || !ln.brokerable || assignment?.kind !== "sub"}
                            style={{
                              width: 48, padding: "3px 4px", fontSize: 10, textAlign: "right",
                              fontFamily: "inherit",
                              border: "1px solid #86EFAC",
                              background: (!ln.brokerable || rowLocked) ? "#F5F5F4" : "#FFF",
                              color: ln.brokerable ? "var(--steel)" : "var(--concrete)",
                              opacity: ln.brokerable ? 1 : 0.55,
                            }}
                          />
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700, color: "var(--good)" }}>{fmt$(ln.net)}</td>
                        <td style={{ padding: "4px 2px", textAlign: "center" }}>
                          {!rowLocked && (
                            <button type="button" onClick={() => deletePayingLine(ln.id)}
                              style={{ background: "transparent", border: "none", color: "var(--safety)", cursor: "pointer", padding: 2 }} title="Delete line">
                              <X size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                  {payingTotals.count > 0 && (
                    <tfoot>
                      <tr style={{ borderTop: "2px solid var(--good)", background: "#F0FDF4" }}>
                        <td colSpan={4} style={{ padding: "6px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "var(--good)" }}>TOTALS</td>
                        <td style={{ padding: "6px", textAlign: "right", fontWeight: 700 }}>{fmt$(payingTotals.gross)}</td>
                        <td colSpan={2} style={{ padding: "6px", textAlign: "right", fontSize: 9, color: "var(--concrete)" }}>
                          {payingTotals.brokerageAmt > 0 ? `−${fmt$(payingTotals.brokerageAmt)}` : ""}
                        </td>
                        <td style={{ padding: "6px", textAlign: "right", fontWeight: 700, color: "var(--good)", fontSize: 13 }}>{fmt$(payingTotals.net)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* MARGIN summary */}
            {billingTotals.net > 0 && payingTotals.net > 0 && (
              <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em" }}>▸ FB MARGIN</div>
                <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                    BILLED <strong style={{ color: "#7DD3FC" }}>{fmt$(billingTotals.net)}</strong> − PAID <strong style={{ color: "#86EFAC" }}>{fmt$(payingTotals.net)}</strong>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--hazard)" }}>
                    = {fmt$(billingTotals.net - payingTotals.net)}
                  </div>
                </div>
              </div>
            )}
            <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginTop: 8, letterSpacing: "0.05em" }}>
              ▸ CHECK CP? ON A BILLING LINE TO AUTO-ADD A MATCHING PAY LINE (EDIT PAY RATE AFTER)
            </div>
          </div>


          {/* Photos — admin can add, view, or remove */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em" }}>
                ▸ SCALE TICKETS ({draft.photos?.length || 0})
              </div>
              <label
                className="btn-ghost"
                style={{ cursor: "pointer", padding: "5px 12px", fontSize: 11 }}
                title="Add more photos for this freight bill"
              >
                <Camera size={12} style={{ marginRight: 4 }} /> ADD PHOTOS
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    const next = [...(draft.photos || [])];
                    for (const f of Array.from(files)) {
                      try {
                        const dataUrl = await compressImage(f);
                        next.push({ id: Date.now() + Math.random(), dataUrl, name: f.name, addedByAdmin: true });
                      } catch (err) { console.warn(err); }
                    }
                    setDraft({ ...draft, photos: next });
                    e.target.value = ""; // reset so same file can be picked again
                  }}
                />
              </label>
            </div>
            {(draft.photos || []).length === 0 ? (
              <div style={{ padding: 16, border: "2px dashed var(--concrete)", textAlign: "center", color: "var(--concrete)", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                NO PHOTOS ATTACHED · TAP ADD PHOTOS TO UPLOAD
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {draft.photos.map((p, idx) => (
                  <div key={p.id || idx} style={{ position: "relative" }}>
                    <img
                      src={p.dataUrl}
                      alt=""
                      style={{ width: 100, height: 100, objectFit: "cover", border: "2px solid var(--steel)", cursor: "pointer" }}
                      onClick={() => setLightbox(p.dataUrl)}
                    />
                    {p.addedByAdmin && (
                      <span
                        style={{ position: "absolute", bottom: 2, left: 2, background: "var(--steel)", color: "var(--cream)", fontSize: 8, padding: "1px 4px", letterSpacing: "0.08em", fontFamily: "JetBrains Mono, monospace" }}
                        title="Added by admin"
                      >
                        ADMIN
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm("Remove this photo?")) return;
                        setDraft({ ...draft, photos: draft.photos.filter((_, i) => i !== idx) });
                      }}
                      style={{ position: "absolute", top: -6, right: -6, background: "var(--safety)", color: "#FFF", border: "2px solid var(--steel)", width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, borderRadius: "50%" }}
                      title="Remove photo"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, paddingTop: 14, borderTop: "2px solid var(--steel)" }}>
            {fb.status !== "approved" && (
              <button
                onClick={() => save(true)}
                disabled={saving || (!unlocked && (lockedOnInvoice || lockedAsPaid))}
                className="btn-primary"
                style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}
              >
                <ShieldCheck size={16} /> SAVE & APPROVE
              </button>
            )}
            <button onClick={() => save(false)} disabled={saving || (!unlocked && (lockedOnInvoice || lockedAsPaid))} className="btn-ghost">
              <Save size={16} /> SAVE ONLY
            </button>
            {fb.status === "approved" && (
              <button onClick={unapprove} disabled={saving || (!unlocked && (lockedOnInvoice || lockedAsPaid))} className="btn-ghost">
                <Clock size={16} /> MOVE TO PENDING
              </button>
            )}
            {fb.status !== "rejected" && (
              <button onClick={reject} disabled={saving || (!unlocked && (lockedOnInvoice || lockedAsPaid))} className="btn-danger">
                <X size={16} /> REJECT
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={saving || !!fb.invoiceId || !!fb.paidAt || !!fb.customerPaidAt}
              title={
                fb.invoiceId ? "Can't delete — FB is on an invoice" :
                fb.paidAt ? "Can't delete — FB is paid to sub/driver" :
                fb.customerPaidAt ? "Can't delete — customer has paid this FB" :
                "Soft-delete this FB (recoverable for 30 days)"
              }
              className="btn-ghost"
              style={{
                borderColor: "var(--safety)",
                color: "var(--safety)",
                opacity: (!!fb.invoiceId || !!fb.paidAt || !!fb.customerPaidAt) ? 0.4 : 1,
              }}
            >
              <Trash2 size={14} style={{ marginRight: 4 }} /> DELETE
            </button>
            <button onClick={onClose} className="btn-ghost" style={{ marginLeft: "auto" }}>CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== REVIEW TAB (End-of-day approval screen) ==========
const ReviewTab = ({ freightBills, dispatches, contacts, projects = [], editFreightBill, invoices = [], pendingFB, clearPendingFB, onToast }) => {
  const [filter, setFilter] = useState("pending");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

  // Auto-open FB editor when jumping from home dashboard
  useEffect(() => {
    if (pendingFB) {
      const fb = freightBills.find((x) => x.id === pendingFB);
      if (fb) {
        setFilter("all"); // make sure it's visible in filtering
        setEditing(fb);
      }
      if (clearPendingFB) clearPendingFB();
    }
  }, [pendingFB, freightBills]);

  const pendingCount = freightBills.filter((fb) => (fb.status || "pending") === "pending").length;
  const approvedCount = freightBills.filter((fb) => fb.status === "approved").length;
  const rejectedCount = freightBills.filter((fb) => fb.status === "rejected").length;

  const filtered = useMemo(() => {
    let list = freightBills;
    if (filter !== "all") list = list.filter((fb) => (fb.status || "pending") === filter);
    if (dateFrom) list = list.filter((fb) => (fb.submittedAt || "").slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter((fb) => (fb.submittedAt || "").slice(0, 10) <= dateTo);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((fb) => {
        const d = dispatches.find((x) => x.id === fb.dispatchId);
        const hay = `${fb.freightBillNumber} ${fb.driverName} ${fb.truckNumber} ${fb.material} ${d?.jobName || ""} ${d?.code || ""}`.toLowerCase();
        return hay.includes(s);
      });
    }
    return list.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  }, [freightBills, filter, dateFrom, dateTo, search, dispatches]);

  const approveAll = async () => {
    const pending = filtered.filter((fb) => (fb.status || "pending") === "pending");
    if (pending.length === 0) { onToast("NOTHING TO APPROVE"); return; }
    if (!confirm(`Approve ${pending.length} pending freight bill${pending.length !== 1 ? "s" : ""}? Customers will be able to see them.`)) return;
    try {
      for (const fb of pending) {
        await editFreightBill(fb.id, {
          ...fb,
          status: "approved",
          approvedAt: new Date().toISOString(),
          approvedBy: "admin",
        });
      }
      onToast(`✓ ${pending.length} APPROVED`);
    } catch (e) {
      console.error(e);
      onToast("BATCH APPROVE FAILED");
    }
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {editing && (
        <FBEditModal
          fb={editing}
          dispatches={dispatches}
          contacts={contacts}
          editFreightBill={editFreightBill}
          invoices={invoices}
          onClose={() => setEditing(null)}
          onToast={onToast}
          currentUser="admin"
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <div className="fbt-card" style={{ padding: 18, background: "var(--hazard)", color: "var(--steel)" }}>
          <div className="stat-num" style={{ color: "var(--steel)" }}>{pendingCount}</div>
          <div className="stat-label">Pending Review</div>
        </div>
        <div className="fbt-card" style={{ padding: 18, background: "var(--good)", color: "#FFF" }}>
          <div className="stat-num" style={{ color: "#FFF" }}>{approvedCount}</div>
          <div className="stat-label" style={{ color: "#FFF" }}>Approved</div>
        </div>
        <div className="fbt-card" style={{ padding: 18 }}>
          <div className="stat-num">{rejectedCount}</div>
          <div className="stat-label">Rejected</div>
        </div>
        <div className="fbt-card" style={{ padding: 18 }}>
          <div className="stat-num">{freightBills.length}</div>
          <div className="stat-label">Total</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search FB#, driver, truck, job…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="fbt-select" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="pending">Pending Only</option>
          <option value="approved">Approved Only</option>
          <option value="rejected">Rejected Only</option>
          <option value="all">All</option>
        </select>
        <input className="fbt-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: "auto" }} title="From" />
        <input className="fbt-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: "auto" }} title="To" />
        {filter === "pending" && pendingCount > 0 && (
          <button onClick={approveAll} className="btn-primary" style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}>
            <ShieldCheck size={14} /> APPROVE ALL ({filtered.filter(fb => (fb.status || "pending") === "pending").length})
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <ShieldCheck size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {filter === "pending" ? "NO PENDING FREIGHT BILLS — ALL CAUGHT UP" : "NO MATCHES"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map((fb) => {
            const d = dispatches.find((x) => x.id === fb.dispatchId);
            const status = fb.status || "pending";
            const bg = status === "approved" ? "#F0FDF4" : status === "rejected" ? "#FEF2F2" : "#FEF3C7";
            const border = status === "approved" ? "var(--good)" : status === "rejected" ? "var(--safety)" : "var(--hazard)";
            const photos = fb.photos || [];
            return (
              <div key={fb.id} className="fbt-card" style={{ padding: 14, background: bg, borderLeft: `4px solid ${border}`, cursor: "pointer" }} onClick={() => setEditing(fb)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                      <span className="chip" style={{ background: border, color: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                        {status.toUpperCase()}
                      </span>
                      <span className="chip" style={{ background: "var(--hazard)", fontSize: 9, padding: "2px 8px" }}>FB #{fb.freightBillNumber || "—"}</span>
                      {d && <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>Order #{d.code}</span>}
                      {photos.length > 0 && (
                        <span className="chip" style={{ background: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                          <Camera size={10} style={{ marginRight: 3 }} /> {photos.length}
                        </span>
                      )}
                    </div>
                    <div className="fbt-display" style={{ fontSize: 15, lineHeight: 1.2 }}>
                      {fb.driverName || "Unknown driver"} · Truck {fb.truckNumber || "—"}
                    </div>
                    <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
                      {d?.jobName || "—"} · {fb.tonnage ? `${fb.tonnage}T` : ""}{fb.hoursBilled ? ` · ${fb.hoursBilled}hrs` : fb.pickupTime && fb.dropoffTime ? ` · ${fb.pickupTime}→${fb.dropoffTime}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {photos.slice(0, 3).map((p, idx) => (
                      <img key={idx} src={p.dataUrl} alt="" style={{ width: 44, height: 44, objectFit: "cover", border: "1px solid var(--steel)" }} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ========== FB TRACEABILITY MODAL ==========
// Shows the full audit trail: dispatch → FB → invoice → customer payment → sub payment
const FBTraceModal = ({ entry, invoices, contacts, onClose }) => {
  const fb = entry.fb;
  const invoice = fb.invoiceId ? invoices.find((i) => i.id === fb.invoiceId) : null;
  const customer = invoice?.billToId ? contacts.find((c) => c.id === invoice.billToId) : null;
  const custHistory = (invoice?.paymentHistory || []).filter((p) => !p.fbIds || p.fbIds.includes(fb.id));
  const methodLabel = { check: "Check", ach: "ACH", cash: "Cash", zelle: "Zelle", venmo: "Venmo", other: "Other" };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)" }}>FB TRACE</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>FB#{fb.freightBillNumber || "—"}</h3>
            <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1", marginTop: 2 }}>
              {fb.driverName || "—"}{fb.truckNumber ? ` · T${fb.truckNumber}` : ""} · {fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 14 }}>

          {/* Step 1: FB details */}
          <div style={{ padding: 12, background: "#F5F5F4", border: "1.5px solid var(--steel)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 6, letterSpacing: "0.1em" }}>▸ FREIGHT BILL</div>
            <div style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", lineHeight: 1.7 }}>
              <div><strong>Order:</strong> #{entry.dispatch?.code} — {entry.dispatch?.jobName || "—"}</div>
              <div><strong>Qty:</strong> {entry.qty.toFixed(2)} {entry.method} × ${entry.rate.toFixed(2)} (sub rate)</div>
              <div><strong>Sub Gross (agreed):</strong> <span style={{ color: "var(--steel)", fontWeight: 700 }}>{fmt$(entry.gross)}</span></div>
            </div>
          </div>

          {/* Step 2: Invoice */}
          {invoice ? (
            <div style={{ padding: 12, background: "#FEF3C7", border: "1.5px solid var(--hazard)" }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 6, letterSpacing: "0.1em" }}>▸ CUSTOMER INVOICE</div>
              <div style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", lineHeight: 1.7 }}>
                <div><strong>Invoice #:</strong> {invoice.invoiceNumber} · {invoice.invoiceDate}</div>
                <div><strong>Billed to:</strong> {customer?.companyName || invoice.billToName || "—"}</div>
                <div><strong>Pricing:</strong> {invoice.pricingMethod} @ ${Number(invoice.rate).toFixed(2)}/{invoice.pricingMethod}</div>
                <div><strong>Est. charged for this FB:</strong> <span style={{ color: "var(--hazard-deep)", fontWeight: 700 }}>{fmt$(entry.customerBilled)}</span></div>
                <div><strong>Invoice Total:</strong> {fmt$(invoice.total)}{invoice.amountPaid > 0 && ` · Paid ${fmt$(invoice.amountPaid)}`}</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 12, background: "#FEE2E2", border: "1.5px solid var(--safety)" }}>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--safety)", fontWeight: 700 }}>▸ NOT ON ANY INVOICE YET</div>
              <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>Create an invoice including this FB to start tracking customer payment.</div>
            </div>
          )}

          {/* Step 3: Customer Payment */}
          {invoice && (
            entry.custStatus === "paid" || entry.custStatus === "short" ? (
              <div style={{ padding: 12, background: entry.custStatus === "paid" ? "#F0FDF4" : "#FEF3C7", border: "1.5px solid " + (entry.custStatus === "paid" ? "var(--good)" : "var(--hazard)") }}>
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 6, letterSpacing: "0.1em" }}>▸ CUSTOMER PAYMENT</div>
                <div style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", lineHeight: 1.7 }}>
                  <div><strong>Status:</strong> {entry.custStatus === "paid" ? "✓ PAID IN FULL" : `⚠ SHORT-PAID ${Math.round(entry.customerRatio * 100)}%`}</div>
                  <div><strong>Amount received:</strong> {fmt$(entry.customerPaid)} of {fmt$(entry.customerBilled)} billed</div>
                  <div><strong>Paid on:</strong> {fb.customerPaidAt ? new Date(fb.customerPaidAt).toLocaleDateString() : "—"}</div>
                  {custHistory.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--steel)" }}>
                      <div style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 4 }}>PAYMENT HISTORY:</div>
                      {custHistory.map((p, idx) => (
                        <div key={idx} style={{ fontSize: 11 }}>
                          • {fmt$(p.amount)} · {p.method?.toUpperCase()}{p.reference ? ` #${p.reference}` : ""} · {p.date ? new Date(p.date).toLocaleDateString() : "—"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, background: "#FEE2E2", border: "1.5px solid var(--safety)" }}>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--safety)", fontWeight: 700 }}>▸ CUSTOMER NOT PAID YET</div>
                <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
                  Invoice {invoice.invoiceNumber} shows this FB as unpaid. Record payment from the Invoices tab.
                </div>
              </div>
            )
          )}

          {/* Step 4: Sub Payment */}
          {fb.paidAt ? (
            <div style={{ padding: 12, background: "#F0FDF4", border: "1.5px solid var(--good)" }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 6, letterSpacing: "0.1em" }}>▸ SUB / DRIVER PAYMENT</div>
              <div style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", lineHeight: 1.7 }}>
                <div><strong>Status:</strong> ✓ PAID TO {entry.dispatch ? (entry.dispatch.assignments?.find(a => a.aid === fb.assignmentId)?.name || "SUB") : "SUB"}</div>
                <div><strong>Amount:</strong> {fmt$(fb.paidAmount || 0)}</div>
                <div><strong>Method:</strong> {methodLabel[fb.paidMethod] || "—"}{fb.paidCheckNumber ? ` #${fb.paidCheckNumber}` : ""}</div>
                <div><strong>Date:</strong> {fb.paidAt ? new Date(fb.paidAt).toLocaleDateString() : "—"}</div>
                {fb.paidNotes && <div style={{ marginTop: 4, fontStyle: "italic", color: "var(--concrete)" }}>"{fb.paidNotes}"</div>}
              </div>
            </div>
          ) : (
            <div style={{ padding: 12, background: "#FEF3C7", border: "1.5px dashed var(--hazard)" }}>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>▸ SUB NOT PAID YET · {fmt$(entry.adjustedGross)} NET DUE</div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} className="btn-ghost">CLOSE</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== PAYROLL: MARK PAID MODAL ==========
// ========== PAY STUB PDF GENERATOR ==========
// Generates a one-page pay stub for a sub/driver covering a specific pay run (one check/payment)
// Includes YTD summary + previous pay runs in current year
const generatePayStubPDF = ({ subName, subKind, subId, fbs, payRecord, brokeragePct, brokerageApplies, allFreightBills, allDispatches, company, contact, isHistorical = false }) => {
  const esc = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
  const methodLabel = { check: "Check", ach: "ACH / Bank Transfer", cash: "Cash", zelle: "Zelle", venmo: "Venmo", other: "Other" };

  // Helper: compute gross for an FB (same logic as payroll — prefer pay snapshot)
  const fbGross = (fb, dispatch) => {
    const assignment = (dispatch?.assignments || []).find((a) => a.aid === fb.assignmentId);

    // v16 PREFERRED PATH: payingLines[]
    const hasLines = Array.isArray(fb.payingLines) && fb.payingLines.length > 0;
    if (hasLines) {
      const brokerableLines = fb.payingLines.filter((ln) => ln.brokerable);
      const nonBrokerableLines = fb.payingLines.filter((ln) => !ln.brokerable);

      const baseGross = brokerableLines.reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
      const extrasSum = nonBrokerableLines.reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
      const totalGross = baseGross + extrasSum;

      // Pull a primary display rate/qty from the first "H"/"T"/"L" line
      const primary = fb.payingLines.find((ln) => ln.code === "H" || ln.code === "T" || ln.code === "L") || fb.payingLines[0];
      const displayMethod = primary?.code === "H" ? "hour" : primary?.code === "T" ? "ton" : primary?.code === "L" ? "load" : "hour";
      const displayRate = Number(primary?.rate) || 0;
      const displayQty = Number(primary?.qty) || 0;

      return {
        gross: totalGross,
        qty: displayQty,
        method: displayMethod,
        rate: displayRate,
        extrasSum,
        baseGross,
        // For rendering line items on the stub
        payingLines: fb.payingLines,
        extras: [],
        adjustments: [],
        adjBrokerable: 0,
        adjNonBrokerable: 0,
        billingAdjCopiedToPay: 0,
        billingAdjustmentsCopied: [],
        // Pre-computed net so the stub doesn't have to re-apply brokerage
        netFromLines: fb.payingLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0),
      };
    }

    // LEGACY PATH
    const hasSnapshot = fb.paidRate != null && fb.paidMethodSnapshot;
    const rate = hasSnapshot ? Number(fb.paidRate) : (Number(assignment?.payRate) || 0);
    const method = hasSnapshot ? fb.paidMethodSnapshot : (assignment?.payMethod || "hour");
    if (!hasSnapshot && (!assignment || !assignment.payRate)) {
      return { gross: 0, qty: 0, method: "?", rate: 0, extrasSum: 0, baseGross: 0, extras: [], adjustments: [], adjBrokerable: 0, adjNonBrokerable: 0 };
    }
    let qty = 0;
    if (hasSnapshot) {
      if (method === "hour") qty = Number(fb.paidHours) || 0;
      else if (method === "ton") qty = Number(fb.paidTons) || 0;
      else if (method === "load") qty = Number(fb.paidLoads) || 0;
    } else {
      if (method === "hour") {
        if (fb.hoursBilled) qty = Number(fb.hoursBilled);
        else if (fb.pickupTime && fb.dropoffTime) {
          const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
          const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
          const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (mins > 0) qty = mins / 60;
        }
      } else if (method === "ton") qty = Number(fb.tonnage) || 0;
      else if (method === "load") qty = Number(fb.loadCount) || 1;
    }
    const baseGross = qty * rate;
    const extrasSum = (fb.extras || []).filter((x) => x.copyToPay === true).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const billingAdjCopiedToPay = (fb.billingAdjustments || [])
      .filter((a) => a.copyToPay === true)
      .reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const adjustments = fb.payingAdjustments || [];
    const adjBrokerable = adjustments.filter((a) => a.applyBrokerage !== false).reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const adjNonBrokerable = adjustments.filter((a) => a.applyBrokerage === false).reduce((s, a) => s + (Number(a.amount) || 0), 0);
    return {
      gross: baseGross + extrasSum + adjBrokerable + adjNonBrokerable + billingAdjCopiedToPay,
      qty, method, rate, extrasSum, baseGross,
      extras: fb.extras || [],
      adjustments, adjBrokerable, adjNonBrokerable,
      billingAdjCopiedToPay,
      billingAdjustmentsCopied: (fb.billingAdjustments || []).filter((a) => a.copyToPay === true),
    };
  };

  // Build FB rows for this pay run
  const fbRows = fbs.map((fb) => {
    const d = allDispatches.find((x) => x.id === fb.dispatchId);
    const calc = fbGross(fb, d);
    const extrasList = (calc.extras || []).filter((x) => Number(x.amount) > 0);
    return { fb, dispatch: d, calc, extrasList };
  });

  // v16 path — if any FB has payingLines, sum the pre-computed net directly
  const anyHasLines = fbRows.some((r) => Array.isArray(r.calc.payingLines) && r.calc.payingLines.length > 0);

  // Legacy totals (still computed for legacy FBs)
  const subtotal = fbRows.reduce((s, r) => s + (Number(r.calc.baseGross) || 0), 0);
  const extrasTotal = fbRows.reduce((s, r) => s + (Number(r.calc.extrasSum) || 0), 0);
  const adjBrokerableTotal = fbRows.reduce((s, r) => s + (Number(r.calc.adjBrokerable) || 0), 0);
  const adjNonBrokerableTotal = fbRows.reduce((s, r) => s + (Number(r.calc.adjNonBrokerable) || 0), 0);
  const billingAdjCopiedTotal = fbRows.reduce((s, r) => s + (Number(r.calc.billingAdjCopiedToPay) || 0), 0);

  // If ALL FBs have lines, use the line-level net (already includes per-line brokerage)
  const allHaveLines = fbRows.every((r) => Array.isArray(r.calc.payingLines) && r.calc.payingLines.length > 0);

  let grossForBrokerage, gross, brokerageAmt, netPay;
  if (allHaveLines) {
    // Gold path — sum net from lines directly
    const linesBrokerableGross = fbRows.reduce((s, r) => s + (r.calc.payingLines.filter((ln) => ln.brokerable).reduce((ss, ln) => ss + (Number(ln.gross) || 0), 0)), 0);
    const linesNonBrokerableGross = fbRows.reduce((s, r) => s + (r.calc.payingLines.filter((ln) => !ln.brokerable).reduce((ss, ln) => ss + (Number(ln.gross) || 0), 0)), 0);
    grossForBrokerage = linesBrokerableGross;
    gross = linesBrokerableGross + linesNonBrokerableGross;
    // Net from lines already has per-line brokerage applied
    netPay = fbRows.reduce((s, r) => s + (Number(r.calc.netFromLines) || 0), 0);
    brokerageAmt = gross - netPay;
  } else {
    // Legacy path
    grossForBrokerage = subtotal + adjBrokerableTotal;
    gross = grossForBrokerage + extrasTotal + adjNonBrokerableTotal + billingAdjCopiedTotal;
    brokerageAmt = brokerageApplies ? grossForBrokerage * (brokeragePct / 100) : 0;
    netPay = gross - brokerageAmt;
  }

  // Year-to-date: find all other paid FBs for this sub in the current year (excluding THIS pay run)
  const year = new Date().getFullYear();
  const thisFbIds = new Set(fbs.map((x) => x.id));
  const ytdFbs = (allFreightBills || []).filter((fb) => {
    if (thisFbIds.has(fb.id)) return false; // exclude current pay run
    if (!fb.paidAt) return false; // only paid FBs
    const paidYear = new Date(fb.paidAt).getFullYear();
    if (paidYear !== year) return false;
    const d = allDispatches.find((x) => x.id === fb.dispatchId);
    const assignment = (d?.assignments || []).find((a) => a.aid === fb.assignmentId);
    if (!assignment) return false;
    // Match by contactId (sub) or driver
    return assignment.contactId === subId;
  });

  // Group YTD by payment date
  const ytdByDate = new Map();
  ytdFbs.forEach((fb) => {
    const key = fb.paidAt ? fb.paidAt.slice(0, 10) : "unknown";
    if (!ytdByDate.has(key)) ytdByDate.set(key, { date: key, fbs: [], paidAmt: 0, method: fb.paidMethod, checkNumber: fb.paidCheckNumber });
    const entry = ytdByDate.get(key);
    entry.fbs.push(fb);
    entry.paidAmt += Number(fb.paidAmount) || 0;
  });
  const ytdRuns = Array.from(ytdByDate.values()).sort((a, b) => b.date.localeCompare(a.date));

  // YTD gross breakdown — compute each prior FB's gross + brokerage separately
  let ytdPriorGross = 0;
  let ytdPriorBrok = 0;
  let ytdPriorNet = 0;
  ytdFbs.forEach((fb) => {
    const d = allDispatches.find((x) => x.id === fb.dispatchId);
    const calc = fbGross(fb, d);
    const g = calc.gross;
    const b = brokerageApplies ? g * (brokeragePct / 100) : 0;
    ytdPriorGross += g;
    ytdPriorBrok += b;
    ytdPriorNet += (Number(fb.paidAmount) || 0);
  });

  const ytdGross = ytdPriorGross + gross;
  const ytdBrokerage = ytdPriorBrok + brokerageAmt;
  const ytdTotal = ytdPriorNet + netPay;

  // Aggregate payment methods used YTD
  const ytdMethods = new Map();
  [...ytdFbs, ...fbs].forEach((fb) => {
    const m = fb.paidMethod || "other";
    ytdMethods.set(m, (ytdMethods.get(m) || 0) + (Number(fb.paidAmount) || 0));
  });

  // Pay period: min/max dates of this run's FBs
  const fbDates = fbs.map((fb) => fb.submittedAt ? fb.submittedAt.slice(0, 10) : null).filter(Boolean).sort();
  const payPeriod = fbDates.length > 0
    ? (fbDates[0] === fbDates[fbDates.length - 1] ? fbDates[0] : `${fbDates[0]} to ${fbDates[fbDates.length - 1]}`)
    : "—";

  const payDate = payRecord?.paidAt ? new Date(payRecord.paidAt).toLocaleDateString() : new Date().toLocaleDateString();

  const html = `<!doctype html><html><head><title>Pay Stub — ${esc(subName)} — ${payDate}</title>
    <style>
      @page { size: letter; margin: 0.5in; }
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #1C1917; font-size: 12px; line-height: 1.4; }
      .letterhead { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F59E0B; padding-bottom: 10px; margin-bottom: 16px; }
      .letterhead h1 { font-size: 18px; margin: 0; letter-spacing: 0.02em; }
      .letterhead .sub { font-size: 10px; color: #666; margin-top: 4px; line-height: 1.5; }
      .stub-title { font-size: 28px; font-weight: 700; margin: 0; color: #1C1917; letter-spacing: 0.05em; }
      .stub-sub { font-size: 10px; color: #666; text-align: right; font-family: 'Courier New', monospace; }
      .payee-block { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; padding: 10px 14px; background: #F5F5F4; border-left: 4px solid #1C1917; }
      .payee-block .label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
      .payee-block .value { font-size: 13px; font-weight: 700; }
      .payee-block .small { font-size: 11px; font-weight: 500; }

      .section-h { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 16px 0 6px; border-bottom: 2px solid #1C1917; padding-bottom: 4px; }

      table.fb-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; }
      table.fb-table th { background: #1C1917; color: #FAFAF9; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
      table.fb-table td { padding: 6px 8px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
      table.fb-table tr:nth-child(even) td { background: #FAFAF9; }
      table.fb-table .r { text-align: right; }
      table.fb-table tr.fb-header td { background: #1C1917 !important; color: #FAFAF9; padding-top: 8px; padding-bottom: 5px; }
      table.fb-table tr.fb-header td strong { color: #F59E0B; font-size: 11px; }
      table.fb-table tr.fb-line td { background: #FAFAF9 !important; padding: 4px 8px; font-size: 10.5px; border-bottom: 1px dotted #D1D5DB; }
      table.fb-table tr.fb-subtotal td { background: #F3F4F6 !important; padding: 5px 8px; border-bottom: 2px solid #1C1917; }
      .extra-line { background: #FEF3C7 !important; font-size: 10px; padding: 3px 8px !important; color: #92400E; }
      .short-note { background: #FEE2E2 !important; font-size: 10px; padding: 3px 8px !important; color: #991B1B; font-style: italic; }

      .totals { margin-top: 10px; border: 2px solid #1C1917; }
      .totals-row { display: flex; justify-content: space-between; padding: 6px 14px; font-size: 12px; border-bottom: 1px solid #E5E7EB; }
      .totals-row.deduct { color: #991B1B; }
      .totals-row.net { background: #F59E0B; color: #1C1917; padding: 10px 14px; font-size: 18px; font-weight: 700; font-family: Arial; border-bottom: none; }

      .payment-info { margin-top: 14px; padding: 10px 14px; background: #F0FDF4; border: 2px solid #16A34A; font-size: 11px; }
      .payment-info strong { color: #16A34A; }

      .ytd-box { margin-top: 16px; border: 2px solid #1C1917; padding: 12px 14px; background: #F5F5F4; }
      .ytd-box .total { font-size: 16px; font-weight: 700; }
      .ytd-list { margin-top: 8px; font-size: 10px; }
      .ytd-list table { width: 100%; border-collapse: collapse; }
      .ytd-list td { padding: 3px 6px; border-bottom: 1px dotted #ccc; }

      .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 9px; color: #666; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; }

      .print-btn, .dl-btn { position: fixed; top: 10px; padding: 8px 16px; border: 2px solid #1C1917; font-weight: 700; cursor: pointer; z-index: 100; font-size: 11px; font-family: Arial; }
      .print-btn { right: 10px; background: #F59E0B; color: #1C1917; }
      .dl-btn { right: 140px; background: #16A34A; color: #FFF; border-color: #16A34A; }
      @media print { .print-btn, .dl-btn { display: none; } }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>
    <button class="dl-btn" onclick="(function(){var a=document.createElement('a');a.href='data:text/html;charset=utf-8,'+encodeURIComponent(document.documentElement.outerHTML);a.download='PayStub_${esc(subName.replace(/[^a-z0-9]/gi,'_'))}_${payDate.replace(/[^0-9]/g,'-')}.html';a.click();})()">⬇ DOWNLOAD HTML</button>
    <button class="print-btn" onclick="window.print()">🖨 PRINT / SAVE AS PDF</button>

    <div class="letterhead">
      <div>
        <h1>${esc(company?.name || "4 Brothers Trucking, LLC")}</h1>
        <div class="sub">
          ${esc(company?.address || "Bay Point, CA 94565")}<br/>
          ${company?.phone ? `${esc(company.phone)}<br/>` : ""}
          ${company?.usdot ? `USDOT ${esc(company.usdot)}` : ""}${company?.mcNumber ? ` · MC ${esc(company.mcNumber)}` : ""}
          ${company?.ein ? `<br/>EIN ${esc(company.ein)}` : ""}${company?.caEmployerId ? ` · CA ID ${esc(company.caEmployerId)}` : ""}
        </div>
      </div>
      <div style="text-align: right;">
        <div class="stub-title">PAY STUB</div>
        <div class="stub-sub">Issued ${esc(payDate)}</div>
        ${isHistorical ? '<div class="stub-sub" style="color:#DC2626;">REPRINT</div>' : ""}
      </div>
    </div>

    <div class="payee-block">
      <div>
        <div class="label">Pay To</div>
        <div class="value">${esc(contact?.legalName || subName)}</div>
        ${contact?.legalName && contact.legalName !== subName ? `<div class="small">DBA ${esc(subName)}</div>` : ""}
        <div class="small">${subKind === "driver" ? "Driver" : "Sub-Contractor"}${contact?.is1099Eligible ? " · 1099-NEC" : ""}</div>
        ${contact?.address ? `<div class="small" style="margin-top:4px;">${esc(contact.address)}</div>` : ""}
        ${contact?.taxId ? `<div class="small" style="margin-top:4px; font-family: 'Courier New', monospace;">${esc((contact.taxIdType || "ID").toUpperCase())}: ${esc(String(contact.taxId).replace(/.(?=.{4})/g, "•"))}</div>` : ""}
      </div>
      <div>
        <div class="label">Pay Period</div>
        <div class="value">${esc(payPeriod)}</div>
        <div class="small">${fbs.length} freight bill${fbs.length !== 1 ? "s" : ""}</div>
        ${payRecord?.paidAt ? `<div class="small" style="margin-top:4px;">Check Date: ${esc(new Date(payRecord.paidAt).toLocaleDateString())}</div>` : ""}
        ${payRecord?.paidCheckNumber ? `<div class="small">Check #: ${esc(payRecord.paidCheckNumber)}</div>` : ""}
      </div>
    </div>

    <div class="section-h">Earnings Detail</div>
    <table class="fb-table">
      <thead>
        <tr>
          <th>FB #</th>
          <th>Date</th>
          <th>Order · Job</th>
          <th class="r">Qty</th>
          <th>Unit</th>
          <th class="r">Rate</th>
          <th class="r">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${fbRows.map((r) => {
          const { fb, dispatch, calc, extrasList } = r;
          const fbDateStr = fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : "—";

          // v16 PREFERRED PATH: render per-FB header + line breakdown + subtotal
          if (Array.isArray(calc.payingLines) && calc.payingLines.length > 0) {
            // Header row for this FB
            const fbHeaderRow = `
              <tr class="fb-header">
                <td><strong>FB #${esc(fb.freightBillNumber || "—")}</strong></td>
                <td>${esc(fbDateStr)}</td>
                <td colspan="5">${esc(dispatch?.code || "—")} · ${esc(dispatch?.jobName || "—")}</td>
              </tr>
            `;
            // One row per pay line
            const lineRows = calc.payingLines.map((ln) => {
              const unit = ln.code === "H" ? "hrs" : ln.code === "T" ? "tons" : ln.code === "L" ? "loads" : "";
              const isBrok = ln.brokerable && Number(ln.brokeragePct) > 0;
              const adjBadge = ln.isAdjustment ? ' <span style="color:#B45309;font-size:8pt;">(adj)</span>' : '';
              const brokBadge = isBrok ? ` <span style="color:#92400E;font-size:8pt;">(Br ${ln.brokeragePct}%)</span>` : ' <span style="color:#065F46;font-size:8pt;">(100%)</span>';
              return `
                <tr class="fb-line">
                  <td colspan="2"></td>
                  <td style="padding-left:18px;">${esc(ln.item || ln.code || "")}${adjBadge}${brokBadge}</td>
                  <td class="r">${(Number(ln.qty) || 0).toFixed(2)}</td>
                  <td>${unit}</td>
                  <td class="r">${money(Number(ln.rate) || 0)}</td>
                  <td class="r"><strong>${money(Number(ln.net) || 0)}</strong></td>
                </tr>
                ${ln.note ? `<tr class="fb-line"><td colspan="7" style="padding-left:36px;color:#666;font-style:italic;font-size:9pt;">"${esc(ln.note)}"</td></tr>` : ""}
              `;
            }).join("");
            // FB subtotal only shown when more than 1 line
            const fbSubtotal = calc.payingLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
            const fbSubtotalRow = calc.payingLines.length > 1 ? `
              <tr class="fb-subtotal">
                <td colspan="6" class="r" style="font-size:9pt;color:#44403C;">FB#${esc(fb.freightBillNumber || "—")} NET PAY</td>
                <td class="r" style="font-weight:700;border-top:1px solid #1C1917;">${money(fbSubtotal)}</td>
              </tr>
            ` : "";
            return fbHeaderRow + lineRows + fbSubtotalRow;
          }

          // LEGACY PATH: render from old extras/adjustments
          const unit = calc.method === "hour" ? "hrs" : calc.method === "ton" ? "tons" : "loads";
          return `
            <tr>
              <td><strong>${esc(fb.freightBillNumber || "—")}</strong></td>
              <td>${esc(fbDateStr)}</td>
              <td>${esc(dispatch?.code || "—")} · ${esc(dispatch?.jobName || "—")}</td>
              <td class="r">${calc.qty.toFixed(2)}</td>
              <td>${unit}</td>
              <td class="r">${money(calc.rate)}</td>
              <td class="r"><strong>${money(calc.baseGross)}</strong></td>
            </tr>
            ${(extrasList || []).filter((x) => x.copyToPay === true).map((x) => `
              <tr><td colspan="7" class="extra-line">+ ${esc(x.label || "Extra")}: ${money(x.amount)} (reimbursed to you)</td></tr>
            `).join("")}
            ${(calc.billingAdjustmentsCopied || []).map((adj) => `
              <tr><td colspan="7" class="extra-line" style="color: #065F46;">
                + From customer bill [${esc(adj.type)}]:
                ${adj.qty != null && adj.rate != null ? `${adj.qty} × ${money(adj.rate)} = ` : ""}${money(adj.amount)}
                ${adj.note ? ` — "${esc(adj.note)}"` : ""}
              </td></tr>
            `).join("")}
            ${(calc.adjustments || []).map((adj) => `
              <tr><td colspan="7" class="extra-line" style="color: ${adj.amount >= 0 ? "#065F46" : "#991B1B"};">
                ${adj.amount >= 0 ? "+" : ""}Adjustment [${esc(adj.type)}]:
                ${adj.qty != null && adj.rate != null ? `${adj.qty} × ${money(adj.rate)} = ` : ""}${money(adj.amount)}
                ${adj.applyBrokerage === false ? " (NOT subject to brokerage)" : ""}
                ${adj.note ? ` — "${esc(adj.note)}"` : ""}
              </td></tr>
            `).join("")}
          `;
        }).join("")}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Base Earnings (${fbs.length} FB${fbs.length !== 1 ? "s" : ""})</span>
        <strong>${money(subtotal)}</strong>
      </div>
      ${adjBrokerableTotal !== 0 ? `
        <div class="totals-row" style="color: ${adjBrokerableTotal >= 0 ? "#065F46" : "#991B1B"};">
          <span>Adjustments (subject to brokerage)</span>
          <strong>${adjBrokerableTotal >= 0 ? "+" : ""}${money(adjBrokerableTotal)}</strong>
        </div>
      ` : ""}
      ${brokerageApplies ? `
        <div class="totals-row">
          <span><strong>GROSS (FOR BROKERAGE)</strong></span>
          <strong>${money(grossForBrokerage)}</strong>
        </div>
        <div class="totals-row deduct">
          <span>Brokerage Deduction (${brokeragePct}%)</span>
          <strong>−${money(brokerageAmt)}</strong>
        </div>
      ` : `
        <div class="totals-row">
          <span><strong>BASE PAY</strong></span>
          <strong>${money(grossForBrokerage)}</strong>
        </div>
      `}
      ${extrasTotal > 0 ? `
        <div class="totals-row">
          <span>Extras copied to pay (tolls / dump / fuel / etc) — paid 100%</span>
          <strong>+${money(extrasTotal)}</strong>
        </div>
      ` : ""}
      ${billingAdjCopiedTotal !== 0 ? `
        <div class="totals-row" style="color: ${billingAdjCopiedTotal >= 0 ? "#065F46" : "#991B1B"};">
          <span>Billing adjustments copied to pay — paid 100%</span>
          <strong>${billingAdjCopiedTotal >= 0 ? "+" : ""}${money(billingAdjCopiedTotal)}</strong>
        </div>
      ` : ""}
      ${adjNonBrokerableTotal !== 0 ? `
        <div class="totals-row" style="color: ${adjNonBrokerableTotal >= 0 ? "#065F46" : "#991B1B"};">
          <span>Adjustments (not subject to brokerage)</span>
          <strong>${adjNonBrokerableTotal >= 0 ? "+" : ""}${money(adjNonBrokerableTotal)}</strong>
        </div>
      ` : ""}
      <div class="totals-row net">
        <span>NET PAY</span>
        <span>${money(netPay)}</span>
      </div>
    </div>

    ${payRecord ? `
      <div class="payment-info">
        <strong>✓ PAID</strong> on ${esc(payDate)}
        · <strong>${esc(methodLabel[payRecord.paidMethod] || "Other")}</strong>${payRecord.paidCheckNumber ? ` · Check #${esc(payRecord.paidCheckNumber)}` : ""}
        ${payRecord.paidNotes ? `<div style="margin-top: 4px; font-style: italic; color: #666;">"${esc(payRecord.paidNotes)}"</div>` : ""}
      </div>
    ` : `
      <div class="payment-info" style="background: #FEF3C7; border-color: #F59E0B; color: #92400E;">
        <strong>⚠ UNPAID</strong> — this is a preview stub. Payment record will appear here once marked paid.
      </div>
    `}

    <div class="ytd-box">
      <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Year-to-Date Summary (${year})</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <tr>
          <td style="padding: 4px 8px; border-bottom: 1px solid #E5E7EB;">Gross Earnings YTD</td>
          <td style="padding: 4px 8px; border-bottom: 1px solid #E5E7EB; text-align: right;"><strong>${money(ytdGross)}</strong></td>
        </tr>
        ${brokerageApplies ? `
          <tr>
            <td style="padding: 4px 8px; border-bottom: 1px solid #E5E7EB; color: #991B1B;">Brokerage Withheld YTD (${brokeragePct}%)</td>
            <td style="padding: 4px 8px; border-bottom: 1px solid #E5E7EB; text-align: right; color: #991B1B;"><strong>−${money(ytdBrokerage)}</strong></td>
          </tr>
        ` : ""}
        <tr>
          <td style="padding: 6px 8px; background: #F59E0B; color: #1C1917; font-weight: 700; font-size: 13px;">NET PAID YTD</td>
          <td style="padding: 6px 8px; background: #F59E0B; color: #1C1917; font-weight: 700; font-size: 13px; text-align: right;">${money(ytdTotal)}</td>
        </tr>
      </table>
      ${ytdMethods.size > 0 ? `
        <div style="margin-top: 10px; font-size: 10px; color: #666;">
          <strong>Payment method mix:</strong>
          ${Array.from(ytdMethods.entries()).filter(([_, v]) => v > 0).map(([m, v]) => `${esc(methodLabel[m] || m)}: ${money(v)}`).join(" · ")}
        </div>
      ` : ""}
      ${ytdRuns.length > 0 ? `
        <div class="ytd-list">
          <div style="font-size: 10px; color: #666; margin-top: 10px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Previous Pay Runs:</div>
          <table>
            <tr><th style="text-align:left;">Date</th><th style="text-align:left;">Method</th><th style="text-align:left;">Ref</th><th style="text-align:right;">FBs</th><th style="text-align:right;">Amount</th></tr>
            ${ytdRuns.map((r) => `
              <tr>
                <td>${esc(r.date)}</td>
                <td>${esc(methodLabel[r.method] || r.method || "—")}</td>
                <td>${esc(r.checkNumber || "—")}</td>
                <td style="text-align:right;">${r.fbs.length}</td>
                <td style="text-align:right;"><strong>${money(r.paidAmt)}</strong></td>
              </tr>
            `).join("")}
          </table>
        </div>
      ` : '<div style="font-size: 10px; color: #999; margin-top: 6px;">No prior pay runs this year.</div>'}
    </div>

    ${contact?.is1099Eligible ? `
      <div style="margin-top: 14px; padding: 10px 14px; background: #EFF6FF; border: 2px solid #2563EB; font-size: 10px; color: #1E40AF;">
        <strong>📋 1099-NEC NOTICE:</strong> This contractor is classified as 1099-eligible. A Form 1099-NEC reporting total nonemployee compensation for ${year} will be issued by January 31, ${year + 1}. Keep this stub for your records.
      </div>
    ` : ""}

    <div class="footer">
      ${esc(company?.name || "4 Brothers Trucking, LLC")} · Pay Stub · ${esc(subName)} · ${esc(payDate)}${payRecord?.paidCheckNumber ? ` · Check #${esc(payRecord.paidCheckNumber)}` : ""}
    </div>
    </body></html>`;

  const w = window.open("", "_blank", "width=1000,height=1100");
  if (!w) throw new Error("Popup blocked — please allow popups to generate pay stubs.");
  w.document.write(html);
  w.document.close();
  return { opened: true };
};

// ========== PAY STUB MODAL (offered after marking paid) ==========
const PayStubOfferModal = ({ target, fbs, payRecord, allFreightBills, allDispatches, company, onPrint, onClose }) => {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ padding: "18px 22px", background: "var(--good)", color: "#FFF" }}>
          <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em" }}>PAYMENT RECORDED</div>
          <h3 className="fbt-display" style={{ fontSize: 18, margin: "4px 0 0" }}>Print Pay Stub?</h3>
        </div>
        <div style={{ padding: 22 }}>
          <p style={{ fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
            Payment to <strong>{target.subName}</strong> of <strong>{fmt$(target.net)}</strong> has been recorded.
            Would you like to generate a pay stub now?
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => { onPrint(); onClose(); }}
              className="btn-primary"
              style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}
            >
              <Printer size={16} /> PRINT STUB
            </button>
            <button onClick={onClose} className="btn-ghost">SKIP</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaidModal = ({ target, fbs, editFreightBill, onClose, onToast, onPaidSuccess, currentUser }) => {
  // target = { projectName, subName, subId, gross, brokeragePct, brokerageAmt, net, fbs }
  const defaultAmt = target.net.toFixed(2);
  const [form, setForm] = useState({
    amount: defaultAmt,
    method: "check",
    checkNumber: "",
    paidAt: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const proceed = async () => {
    if (!form.amount || Number(form.amount) <= 0) { onToast("ENTER AMOUNT"); return; }
    if (form.method === "check" && !form.checkNumber) {
      if (!confirm("No check number entered. Mark paid anyway?")) return;
    }

    // DOUBLE-PAY BACKSTOP — warn if any FB in this batch is already paid
    const alreadyPaid = fbs.filter((x) => x.fb.paidAt);
    if (alreadyPaid.length > 0) {
      const names = alreadyPaid.map((x) => `FB#${x.fb.freightBillNumber || "—"} (paid ${new Date(x.fb.paidAt).toLocaleDateString()})`).join(", ");
      const ok = confirm(
        `⚠ WARNING: ${alreadyPaid.length} FB${alreadyPaid.length !== 1 ? "S" : ""} ALREADY MARKED PAID:\n\n${names}\n\nPaying again will OVERWRITE the existing payment record. Continue?`
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      const stamp = {
        paidAt: new Date(form.paidAt).toISOString(),
        paidBy: currentUser || "admin",
        paidMethod: form.method,
        paidCheckNumber: form.checkNumber || "",
        paidNotes: form.notes || "",
      };

      // Distribute the amount across each FB proportionally to its gross
      const grossByFb = fbs.map((x) => x.adjustedGross !== undefined ? x.adjustedGross : x.gross);
      const grossSum = grossByFb.reduce((s, v) => s + v, 0) || 1;
      const totalAmt = Number(form.amount);
      const lockStamp = new Date().toISOString();

      const paidFbs = [];
      for (let i = 0; i < fbs.length; i++) {
        const entry = fbs[i];
        const share = grossSum > 0 ? (entry.gross / grossSum) * totalAmt : totalAmt / fbs.length;
        const updatedFb = {
          ...entry.fb,
          ...stamp,
          paidAmount: Number(share.toFixed(2)),
          // Lock pay snapshot — pay statement generated, no more editing hours/rate directly
          payStatementLockedAt: entry.fb.payStatementLockedAt || lockStamp,
          // Ensure snapshot exists for FBs that were approved pre-v15
          paidRate: entry.fb.paidRate != null ? entry.fb.paidRate : entry.rate,
          paidMethodSnapshot: entry.fb.paidMethodSnapshot || entry.method,
          paidHours: entry.fb.paidHours != null ? entry.fb.paidHours : (entry.method === "hour" ? entry.qty : null),
          paidTons: entry.fb.paidTons != null ? entry.fb.paidTons : (entry.method === "ton" ? entry.qty : null),
          paidLoads: entry.fb.paidLoads != null ? entry.fb.paidLoads : (entry.method === "load" ? entry.qty : null),
        };
        await editFreightBill(entry.fb.id, updatedFb);
        paidFbs.push(updatedFb);
      }
      onToast(`✓ PAID ${target.subName} — ${fbs.length} FB${fbs.length !== 1 ? "S" : ""}`);

      // Trigger stub offer BEFORE closing so parent can show the PayStubOfferModal
      if (onPaidSuccess) {
        onPaidSuccess({ paidFbs, payRecord: stamp });
      }
      onClose();
    } catch (e) {
      console.error(e);
      onToast("MARK PAID FAILED");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", letterSpacing: "0.1em" }}>MARK PAID</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>{target.subName}</h3>
            <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1", marginTop: 2 }}>
              {target.projectName || "(No project)"} · {fbs.length} FB{fbs.length !== 1 ? "S" : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 22, display: "grid", gap: 12 }}>

          {/* Advance-pay warning */}
          {target.includeAdvance && target.hasAdvance && (
            <div style={{ padding: 10, background: "#FEF2F2", border: "2px solid var(--safety)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--safety)" }}>
              ⚠ <strong>ADVANCE PAY WARNING:</strong> Some FBs here haven't been paid by customer yet. You're fronting the cash.
            </div>
          )}

          {/* Short-pay notice */}
          {(() => {
            const shortFbs = fbs.filter((x) => x.custStatus === "short");
            if (shortFbs.length === 0) return null;
            return (
              <div style={{ padding: 10, background: "#FEF3C7", border: "2px solid var(--hazard)", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                ⚠ <strong>{shortFbs.length} SHORT-PAID FB{shortFbs.length !== 1 ? "S" : ""}:</strong> Sub will be paid proportionally to what customer paid.
              </div>
            );
          })()}

          {/* Breakdown */}
          <div style={{ padding: 12, background: "#F5F5F4", border: "1.5px solid var(--steel)", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span>GROSS (adjusted for short-pay):</span><strong>{fmt$(target.gross)}</strong>
            </div>
            {target.brokerageAmt > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "var(--hazard-deep)" }}>
                <span>BROKERAGE ({target.brokeragePct}%):</span><strong>−{fmt$(target.brokerageAmt)}</strong>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--steel)", fontWeight: 700 }}>
              <span>NET:</span><span style={{ color: "var(--good)" }}>{fmt$(target.net)}</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Date Paid</label>
              <input className="fbt-input" type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Amount Paid $</label>
              <input className="fbt-input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="fbt-label">Method</label>
            <select className="fbt-select" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="check">Check</option>
              <option value="ach">ACH / Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="zelle">Zelle</option>
              <option value="venmo">Venmo</option>
              <option value="other">Other</option>
            </select>
          </div>

          {form.method === "check" && (
            <div>
              <label className="fbt-label">Check #</label>
              <input className="fbt-input" value={form.checkNumber} onChange={(e) => setForm({ ...form, checkNumber: e.target.value })} placeholder="e.g. 1024" />
            </div>
          )}

          <div>
            <label className="fbt-label">Notes (optional)</label>
            <textarea className="fbt-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Payment reference, memo, etc." style={{ minHeight: 50 }} />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={proceed} disabled={saving} className="btn-primary" style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}>
              <CheckCircle2 size={16} /> MARK PAID
            </button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== PAY STATEMENT MODAL ==========
// Sub-first flow: pick sub → see all unpaid FBs with BILLED vs PAID columns → check which to include → generate pay statement
const PayStatementModal = ({
  contacts, freightBills, dispatches, invoices, company, editFreightBill, onClose, onToast, onComplete, currentUser
}) => {
  const [subId, setSubId] = useState(null);

  // All possible pay recipients = sub contacts + driver contacts who have pay rate or FBs
  const payRecipients = useMemo(() => {
    const byId = new Map();
    // Build a list from FB assignments (anyone who has appeared as an assignment gets listed)
    freightBills.forEach((fb) => {
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      const a = (d?.assignments || []).find((ax) => ax.aid === fb.assignmentId);
      if (!a?.contactId) return;
      const c = contacts.find((x) => x.id === a.contactId);
      if (!c) return;
      if (!byId.has(c.id)) {
        byId.set(c.id, { id: c.id, name: c.companyName || c.contactName, kind: c.type, unpaidCount: 0, totalCount: 0 });
      }
      const entry = byId.get(c.id);
      entry.totalCount++;
      if (!fb.paidAt) entry.unpaidCount++;
    });
    return Array.from(byId.values()).sort((a, b) => b.unpaidCount - a.unpaidCount || a.name.localeCompare(b.name));
  }, [freightBills, dispatches, contacts]);

  const selectedSub = subId ? contacts.find((c) => c.id === subId) : null;
  // Drivers never get brokerage — force-ignore even if flag is set
  const brokerageApplies = selectedSub?.type === "sub" && !!selectedSub?.brokerageApplies;
  const brokeragePct = Number(selectedSub?.brokeragePercent) || 8;

  // FB rows for selected sub — only unpaid FBs
  const subFbRows = useMemo(() => {
    if (!subId) return [];
    return freightBills
      .filter((fb) => {
        if (fb.paidAt) return false;
        const d = dispatches.find((x) => x.id === fb.dispatchId);
        const a = (d?.assignments || []).find((ax) => ax.aid === fb.assignmentId);
        return a?.contactId === subId;
      })
      .map((fb) => {
        const d = dispatches.find((x) => x.id === fb.dispatchId);
        const a = (d?.assignments || []).find((ax) => ax.aid === fb.assignmentId);

        // BILLED side: prefer snapshot, else dispatch rate
        const hasBillSnap = fb.billedRate != null && fb.billedMethod;
        const billMethod = hasBillSnap ? fb.billedMethod : (d?.ratePerHour ? "hour" : d?.ratePerTon ? "ton" : d?.ratePerLoad ? "load" : "hour");
        const billRate = hasBillSnap ? Number(fb.billedRate)
          : billMethod === "hour" ? Number(d?.ratePerHour || 0)
          : billMethod === "ton"  ? Number(d?.ratePerTon || 0)
          : Number(d?.ratePerLoad || 0);
        const billQty = hasBillSnap
          ? (billMethod === "hour" ? Number(fb.billedHours) : billMethod === "ton" ? Number(fb.billedTons) : Number(fb.billedLoads))
          : (billMethod === "hour" ? Number(fb.hoursBilled) : billMethod === "ton" ? Number(fb.tonnage) : Number(fb.loadCount)) || 0;
        const billBase = billRate * billQty;
        const billAdj = (fb.billingAdjustments || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);

        // PAID side: prefer snapshot, else assignment
        const hasPaySnap = fb.paidRate != null && fb.paidMethodSnapshot;
        const payMethod = hasPaySnap ? fb.paidMethodSnapshot : (a?.payMethod || "hour");
        const payRate = hasPaySnap ? Number(fb.paidRate) : Number(a?.payRate || 0);
        const payQty = hasPaySnap
          ? (payMethod === "hour" ? Number(fb.paidHours) : payMethod === "ton" ? Number(fb.paidTons) : Number(fb.paidLoads))
          : (payMethod === "hour" ? Number(fb.hoursBilled) : payMethod === "ton" ? Number(fb.tonnage) : Number(fb.loadCount)) || 0;
        const payBase = payRate * payQty;
        // Only extras explicitly copied to pay flow through (not just "reimbursable" on the bill)
        const payExtras = (fb.extras || []).filter((x) => x.copyToPay === true).reduce((s, x) => s + (Number(x.amount) || 0), 0);
        // Billing adjustments flagged copy-to-pay flow 100% (non-brokerable)
        const billingAdjToPay = (fb.billingAdjustments || []).filter((x) => x.copyToPay === true).reduce((s, x) => s + (Number(x.amount) || 0), 0);
        const payAdjBrok = (fb.payingAdjustments || []).filter((x) => x.applyBrokerage !== false).reduce((s, x) => s + (Number(x.amount) || 0), 0);
        const payAdjNon = (fb.payingAdjustments || []).filter((x) => x.applyBrokerage === false).reduce((s, x) => s + (Number(x.amount) || 0), 0);
        const payGross = payBase + payExtras + payAdjBrok + payAdjNon + billingAdjToPay;
        // Brokerage only on base + brokerable adjustments — everything else flows 100%
        const payGrossForBrok = payBase + payAdjBrok;

        // Customer-pay status
        const invoice = fb.invoiceId ? invoices.find((i) => i.id === fb.invoiceId) : null;
        const custPaid = !!fb.customerPaidAt;
        const invoiced = !!fb.invoiceId;

        return {
          fb, dispatch: d, assignment: a,
          billMethod, billRate, billQty, billBase, billAdj, billTotal: billBase + billAdj,
          payMethod, payRate, payQty, payBase, payExtras, payAdjBrok, payAdjNon, billingAdjToPay,
          payGross, payGrossForBrok,
          invoice, invoiced, custPaid,
        };
      })
      .sort((a, b) => (a.fb.submittedAt || "").localeCompare(b.fb.submittedAt || ""));
  }, [subId, freightBills, dispatches, invoices]);

  // Selection state — default to all customer-paid FBs, skip advance
  const [selected, setSelected] = useState(new Set());
  useEffect(() => {
    // When sub changes, default-select ready (customer-paid) FBs
    const ready = subFbRows.filter((r) => r.custPaid).map((r) => r.fb.id);
    setSelected(new Set(ready));
  }, [subId, subFbRows.length]);

  const toggle = (fbId) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(fbId)) n.delete(fbId);
      else n.add(fbId);
      return n;
    });
  };
  const selectAll = () => setSelected(new Set(subFbRows.map((r) => r.fb.id)));
  const selectNone = () => setSelected(new Set());
  const selectReady = () => setSelected(new Set(subFbRows.filter((r) => r.custPaid).map((r) => r.fb.id)));

  // Totals based on selected
  const totals = useMemo(() => {
    const selectedRows = subFbRows.filter((r) => selected.has(r.fb.id));
    const grossForBrok = selectedRows.reduce((s, r) => s + r.payGrossForBrok, 0);
    const nonBrokAdj = selectedRows.reduce((s, r) => s + r.payAdjNon, 0);
    const gross = grossForBrok + nonBrokAdj;
    const brokerageAmt = brokerageApplies ? grossForBrok * (brokeragePct / 100) : 0;
    const net = gross - brokerageAmt;
    return { count: selectedRows.length, grossForBrok, nonBrokAdj, gross, brokerageAmt, net };
  }, [subFbRows, selected, brokerageApplies, brokeragePct]);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1040, maxHeight: "94vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", letterSpacing: "0.1em" }}>CREATE PAY STATEMENT</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>
              {selectedSub ? (selectedSub.companyName || selectedSub.contactName) : "Pick a sub / driver"}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
          {/* Step 1: pick sub */}
          {!subId && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ STEP 1 / PICK RECIPIENT ({payRecipients.length})</div>
              {payRecipients.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--concrete)", border: "2px dashed var(--concrete)" }}>
                  No subs or drivers with freight bills yet.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                  {payRecipients.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSubId(r.id)}
                      disabled={r.unpaidCount === 0}
                      className="fbt-card"
                      style={{
                        padding: 12, textAlign: "left", cursor: r.unpaidCount > 0 ? "pointer" : "not-allowed",
                        border: "2px solid var(--steel)", background: r.unpaidCount > 0 ? "#FFF" : "#F5F5F4",
                        opacity: r.unpaidCount > 0 ? 1 : 0.5,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span className="chip" style={{ background: r.kind === "driver" ? "#FFF" : "var(--hazard)", fontSize: 9, padding: "2px 6px" }}>
                          {r.kind === "driver" ? "DRIVER" : "SUB"}
                        </span>
                        <div className="fbt-display" style={{ fontSize: 14, lineHeight: 1.2 }}>{r.name}</div>
                      </div>
                      <div className="fbt-mono" style={{ fontSize: 10, color: r.unpaidCount > 0 ? "var(--safety)" : "var(--concrete)" }}>
                        {r.unpaidCount} UNPAID · {r.totalCount} TOTAL FB{r.totalCount !== 1 ? "s" : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step 2: FB list */}
          {subId && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em" }}>▸ STEP 2 / SELECT FREIGHT BILLS ({subFbRows.length} UNPAID)</div>
                <button onClick={() => setSubId(null)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>◀ CHANGE RECIPIENT</button>
              </div>
              {subFbRows.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--concrete)", border: "2px dashed var(--concrete)" }}>
                  No unpaid FBs for this recipient.
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                    <button onClick={selectAll} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>SELECT ALL</button>
                    <button onClick={selectReady} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>SELECT CUSTOMER-PAID ONLY</button>
                    <button onClick={selectNone} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>SELECT NONE</button>
                  </div>
                  <div style={{ display: "grid", gap: 4 }}>
                    {/* Column header */}
                    <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 1fr 80px", gap: 6, padding: "6px 8px", fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)", letterSpacing: "0.08em", borderBottom: "1.5px solid var(--steel)" }}>
                      <span></span>
                      <span>FB / ORDER</span>
                      <span style={{ color: "#0369A1" }}>🏢 BILLED (CUSTOMER)</span>
                      <span style={{ color: "var(--good)" }}>🚚 PAY (SUB)</span>
                      <span style={{ textAlign: "right" }}>STATUS</span>
                    </div>
                    {subFbRows.map((r) => {
                      const isSel = selected.has(r.fb.id);
                      return (
                        <div
                          key={r.fb.id}
                          onClick={() => toggle(r.fb.id)}
                          style={{
                            display: "grid", gridTemplateColumns: "28px 1fr 1fr 1fr 80px", gap: 6,
                            padding: 8, cursor: "pointer",
                            background: isSel ? "#F0FDF4" : "#FFF",
                            border: "1.5px solid " + (isSel ? "var(--good)" : "var(--steel)"),
                            fontSize: 11, fontFamily: "JetBrains Mono, monospace",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <input type="checkbox" checked={isSel} onChange={() => {}} style={{ width: 16, height: 16, pointerEvents: "none" }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700 }}>FB#{r.fb.freightBillNumber || "—"}</div>
                            <div style={{ fontSize: 10, color: "var(--concrete)" }}>
                              {r.fb.submittedAt ? new Date(r.fb.submittedAt).toLocaleDateString() : "—"} · Order #{r.dispatch?.code}
                            </div>
                          </div>
                          <div style={{ color: "#0369A1" }}>
                            <div>{r.billQty.toFixed(2)} {r.billMethod} × ${r.billRate.toFixed(2)}</div>
                            <div style={{ fontWeight: 700 }}>{fmt$(r.billTotal)}</div>
                            {r.billAdj !== 0 && <div style={{ fontSize: 9, color: "var(--concrete)" }}>(adj {r.billAdj >= 0 ? "+" : ""}{fmt$(r.billAdj)})</div>}
                          </div>
                          <div style={{ color: "var(--good)" }}>
                            <div>{r.payQty.toFixed(2)} {r.payMethod} × ${r.payRate.toFixed(2)}</div>
                            <div style={{ fontWeight: 700 }}>{fmt$(r.payGross)}</div>
                            {r.payExtras > 0 && <div style={{ fontSize: 9, color: "var(--concrete)" }}>(extras +{fmt$(r.payExtras)})</div>}
                            {(r.payAdjBrok + r.payAdjNon) !== 0 && <div style={{ fontSize: 9, color: "var(--concrete)" }}>(adj {(r.payAdjBrok + r.payAdjNon) >= 0 ? "+" : ""}{fmt$(r.payAdjBrok + r.payAdjNon)})</div>}
                          </div>
                          <div style={{ textAlign: "right", fontSize: 9 }}>
                            {r.custPaid ? (
                              <span className="chip" style={{ background: "var(--good)", color: "#FFF", fontSize: 9, padding: "2px 5px" }}>✓ CUST PAID</span>
                            ) : r.invoiced ? (
                              <span className="chip" style={{ background: "var(--hazard)", fontSize: 9, padding: "2px 5px" }}>INVOICED</span>
                            ) : (
                              <span className="chip" style={{ background: "var(--safety)", color: "#FFF", fontSize: 9, padding: "2px 5px" }}>ADVANCE</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Totals + actions footer (visible once a sub is picked) */}
        {subId && subFbRows.length > 0 && (
          <div style={{ padding: 16, background: "var(--steel)", color: "var(--cream)", borderTop: "2px solid var(--hazard)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, fontFamily: "JetBrains Mono, monospace", fontSize: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: "var(--concrete)" }}>SELECTED</div>
                <div style={{ fontWeight: 700 }}>{totals.count} FB{totals.count !== 1 ? "s" : ""}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "var(--concrete)" }}>GROSS</div>
                <div style={{ fontWeight: 700 }}>{fmt$(totals.gross)}</div>
              </div>
              {brokerageApplies && (
                <div>
                  <div style={{ fontSize: 9, color: "var(--concrete)" }}>BROKERAGE ({brokeragePct}%)</div>
                  <div style={{ fontWeight: 700, color: "var(--hazard)" }}>−{fmt$(totals.brokerageAmt)}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 9, color: "var(--hazard)" }}>NET PAY</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: "var(--hazard)" }}>{fmt$(totals.net)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  if (totals.count === 0) { onToast("SELECT AT LEAST ONE FB"); return; }
                  // Hand off to parent to open pay modal
                  if (onComplete) {
                    onComplete({
                      subId,
                      sub: selectedSub,
                      fbRows: subFbRows.filter((r) => selected.has(r.fb.id)),
                      totals,
                    });
                  }
                }}
                className="btn-primary"
                style={{ background: "var(--hazard)", color: "var(--steel)", borderColor: "var(--hazard-deep)" }}
                disabled={totals.count === 0}
              >
                <DollarSign size={14} /> PROCEED TO PAY {totals.count > 0 ? `· ${fmt$(totals.net)}` : ""}
              </button>
              <button onClick={onClose} className="btn-ghost" style={{ color: "var(--cream)", borderColor: "var(--cream)" }}>CANCEL</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== PAYROLL TAB ==========
const PayrollTab = ({ freightBills, dispatches, contacts, projects, invoices = [], editFreightBill, company, pendingPaySubId, clearPendingPaySubId, onJumpToInvoice, onToast }) => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [paidFilter, setPaidFilter] = useState("unpaid"); // unpaid | paid | all
  const [subFilter, setSubFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [expanded, setExpanded] = useState({});
  const [payTarget, setPayTarget] = useState(null);
  const [payStatementOpen, setPayStatementOpen] = useState(false);
  const [editingFB, setEditingFB] = useState(null);
  const [customerPaidOnly, setCustomerPaidOnly] = useState(true); // NEW: default ON (safer)
  const [traceFB, setTraceFB] = useState(null); // NEW: for traceability modal
  const [stubOffer, setStubOffer] = useState(null); // {target, fbs, payRecord} for auto-offer after pay

  // Auto-expand a sub's row when jumped from home dashboard
  useEffect(() => {
    if (pendingPaySubId) {
      // We don't know the projectKey here; expand ALL rows matching this sub across all projects
      // The payroll tree uses keys like `p_{projectKey}` and `s_{projectKey}_{subKey}` where subKey is subId.
      // Safest: expand whatever we find after render. Use setTimeout to do scroll after.
      setTimeout(() => {
        const el = document.getElementById(`payroll-sub-${pendingPaySubId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // Click the row's header to expand it if collapsed
          const header = el.querySelector('[style*="cursor: pointer"]');
          if (header && !el.querySelector('.fb-list')) header.click();
        }
      }, 250);
      if (clearPendingPaySubId) clearPendingPaySubId();
    }
  }, [pendingPaySubId]);

  // helper: approved + within date range + filters
  const filteredFbs = useMemo(() => {
    return freightBills.filter((fb) => {
      if ((fb.status || "pending") !== "approved") return false;
      const isPaid = !!fb.paidAt;
      if (paidFilter === "unpaid" && isPaid) return false;
      if (paidFilter === "paid" && !isPaid) return false;
      const fbDate = fb.submittedAt ? fb.submittedAt.slice(0, 10) : "";
      if (fromDate && fbDate < fromDate) return false;
      if (toDate && fbDate > toDate) return false;
      return true;
    });
  }, [freightBills, paidFilter, fromDate, toDate]);

  // Calculate gross for an FB based on its assignment's pay rate + method
  const calcGross = (fb, dispatch) => {
    const assignment = (dispatch?.assignments || []).find((a) => a.aid === fb.assignmentId);

    // v16 PREFERRED PATH: payingLines[] are the authoritative pay values
    // Each line already has gross + net (with brokerage applied) pre-computed
    const hasLines = Array.isArray(fb.payingLines) && fb.payingLines.length > 0;

    if (hasLines) {
      // Split lines into brokerable vs not — brokerage applies only to flagged lines
      const brokerableLines = fb.payingLines.filter((ln) => ln.brokerable);
      const nonBrokerableLines = fb.payingLines.filter((ln) => !ln.brokerable);

      const brokerableGross = brokerableLines.reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
      const nonBrokerableGross = nonBrokerableLines.reduce((s, ln) => s + (Number(ln.gross) || 0), 0);

      // Sum of each line's individual net (line already deducted its own brokerage)
      const totalNet = fb.payingLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);

      // Derive a "weighted avg" method + rate + qty for display purposes (pick the first or dominant)
      const primary = fb.payingLines.find((ln) => ln.code === "H" || ln.code === "T" || ln.code === "L") || fb.payingLines[0];
      const displayMethod = primary?.code === "H" ? "hour" : primary?.code === "T" ? "ton" : primary?.code === "L" ? "load" : "hour";
      const displayRate = Number(primary?.rate) || 0;
      const displayQty = Number(primary?.qty) || 0;

      return {
        gross: brokerableGross + nonBrokerableGross,         // total gross before any brokerage deduction
        // grossForBrokerage = amount that brokerage % applies to (sum of brokerable line gross)
        grossForBrokerage: brokerableGross,
        // nonBrokerableAdj = amount that passes through at 100% (reimbursements + non-brokerable lines)
        nonBrokerableAdj: nonBrokerableGross,
        qty: displayQty, method: displayMethod, rate: displayRate,
        assignment,
        extrasSum: 0, grossBeforeExtras: brokerableGross,
        adjustmentsSum: 0, adjustmentsBrokerable: 0, adjustmentsNonBrokerable: 0,
        billingAdjCopiedToPay: 0,
        // New: pre-computed net from lines (gold-standard — already includes per-line brokerage)
        netFromLines: totalNet,
      };
    }

    // LEGACY PATH: snapshot + extras + adjustments (pre-v16 FBs)
    const hasSnapshot = fb.paidRate != null && fb.paidMethodSnapshot;
    const rate = hasSnapshot ? Number(fb.paidRate) : (Number(assignment?.payRate) || 0);
    const method = hasSnapshot ? fb.paidMethodSnapshot : (assignment?.payMethod || "hour");

    if (!hasSnapshot && (!assignment || !assignment.payRate)) {
      return { gross: 0, qty: 0, method: "?", rate: 0, assignment, extrasSum: 0, grossBeforeExtras: 0, adjustmentsSum: 0 };
    }

    let qty = 0;
    if (hasSnapshot) {
      if (method === "hour") qty = Number(fb.paidHours) || 0;
      else if (method === "ton") qty = Number(fb.paidTons) || 0;
      else if (method === "load") qty = Number(fb.paidLoads) || 0;
    } else {
      if (method === "hour") {
        if (fb.hoursBilled !== null && fb.hoursBilled !== undefined && fb.hoursBilled !== "") qty = Number(fb.hoursBilled);
        else if (fb.pickupTime && fb.dropoffTime) {
          const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
          const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
          if (!isNaN(h1) && !isNaN(h2)) {
            const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (mins > 0) qty = mins / 60;
          }
        }
      } else if (method === "ton") qty = Number(fb.tonnage) || 0;
      else if (method === "load") qty = Number(fb.loadCount) || 1;
    }

    const grossBeforeExtras = qty * rate;

    const adjustmentsBrokerable = (fb.payingAdjustments || [])
      .filter((a) => a.applyBrokerage !== false)
      .reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const adjustmentsNonBrokerable = (fb.payingAdjustments || [])
      .filter((a) => a.applyBrokerage === false)
      .reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const adjustmentsSum = adjustmentsBrokerable + adjustmentsNonBrokerable;

    const extrasSum = (fb.extras || [])
      .filter((x) => x.copyToPay === true)
      .reduce((s, x) => s + (Number(x.amount) || 0), 0);

    const billingAdjCopiedToPay = (fb.billingAdjustments || [])
      .filter((a) => a.copyToPay === true)
      .reduce((s, a) => s + (Number(a.amount) || 0), 0);

    return {
      gross: grossBeforeExtras + extrasSum + adjustmentsSum + billingAdjCopiedToPay,
      grossForBrokerage: grossBeforeExtras + adjustmentsBrokerable,
      nonBrokerableAdj: adjustmentsNonBrokerable + extrasSum + billingAdjCopiedToPay,
      qty, method, rate, assignment, extrasSum, grossBeforeExtras,
      adjustmentsSum, adjustmentsBrokerable, adjustmentsNonBrokerable,
      billingAdjCopiedToPay,
    };
  };

  // Helper: compute what customer WAS billed for this FB on its invoice (estimated)
  // Includes reimbursable per-FB extras that pass through to the customer
  const fbInvoiceBilled = (fb) => {
    const invoice = invoices.find((inv) => inv.id === fb.invoiceId);
    if (!invoice) return 0;
    const method = invoice.pricingMethod || "ton";
    const rate = Number(invoice.rate) || 0;
    let qty = 0;
    if (method === "ton") qty = Number(fb.tonnage) || 0;
    else if (method === "load") qty = Number(fb.loadCount) || 1;
    else if (method === "hour") {
      if (fb.hoursBilled) qty = Number(fb.hoursBilled);
      else if (fb.pickupTime && fb.dropoffTime) {
        const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
        const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
        if (!isNaN(h1) && !isNaN(h2)) {
          const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (mins > 0) qty = mins / 60;
        }
      }
    }
    // Reimbursable FB extras also appear on customer invoice
    const extrasSum = (fb.extras || [])
      .filter((x) => x.reimbursable !== false)
      .reduce((s, x) => s + (Number(x.amount) || 0), 0);
    return qty * rate + extrasSum;
  };

  // Customer payment ratio (1.0 = paid in full, 0.85 = 85% paid, 0 = unpaid)
  const customerPaidRatio = (fb) => {
    if (!fb.customerPaidAt) return 0;
    const billed = fbInvoiceBilled(fb);
    const paid = Number(fb.customerPaidAmount) || 0;
    if (billed <= 0) return paid > 0 ? 1 : 0;
    return Math.min(1, paid / billed);
  };

  // Returns customer payment status: 'paid' | 'short' | 'unpaid' | 'no_invoice'
  const customerPayStatus = (fb) => {
    if (!fb.invoiceId) return "no_invoice";
    if (!fb.customerPaidAt) return "unpaid";
    const ratio = customerPaidRatio(fb);
    if (ratio >= 0.999) return "paid";
    return "short";
  };

  // Build grouped data: project -> sub/driver -> [fbs with calcs]
  const grouped = useMemo(() => {
    const byProject = new Map(); // projectKey -> { projectName, projectId, subs: Map<subKey, {subName, subId, type, fbs, gross, ...}> }
    filteredFbs.forEach((fb) => {
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      if (!d) return;
      const calc = calcGross(fb, d);
      if (!calc.assignment) return; // skip unassigned FBs (can't pay without a rate)

      // Apply filters
      if (projectFilter && String(d.projectId || "none") !== projectFilter) return;
      if (subFilter && String(calc.assignment.contactId) !== subFilter) return;

      // Customer-paid filter: if ON, only show FBs where customer has paid (safe to pay subs)
      const custStatus = customerPayStatus(fb);
      // If "customerPaidOnly" is on, we hide unpaid-by-customer FBs UNLESS they're already paid to sub
      if (customerPaidOnly && !fb.paidAt && custStatus !== "paid" && custStatus !== "short") return;

      const project = projects.find((p) => p.id === d.projectId);
      const projectKey = d.projectId || "none";
      const projectName = project?.name || "(No project)";

      if (!byProject.has(projectKey)) {
        byProject.set(projectKey, { projectKey, projectId: d.projectId || null, projectName, subs: new Map() });
      }
      const projectData = byProject.get(projectKey);

      const subKey = calc.assignment.contactId || `anon_${calc.assignment.aid}`;
      const contact = contacts.find((c) => c.id === calc.assignment.contactId);
      // IMPORTANT: Drivers never get brokerage applied, only subs.
      // Force-ignore brokerage flag if this is a driver (belt-and-suspenders beyond UI hiding).
      const isSub = calc.assignment.kind === "sub";
      const brokerageApplies = isSub && !!contact?.brokerageApplies;
      const brokeragePct = Number(contact?.brokeragePercent ?? 8);

      if (!projectData.subs.has(subKey)) {
        projectData.subs.set(subKey, {
          subKey,
          subId: calc.assignment.contactId,
          subName: calc.assignment.name,
          kind: calc.assignment.kind,
          brokerageApplies: !!brokerageApplies,
          brokeragePct,
          fbs: [],
          gross: 0,
          paidSum: 0,
        });
      }
      const subData = projectData.subs.get(subKey);

      // Compute proportional gross for short-pay handling
      const ratio = customerPaidRatio(fb);
      const billed = fbInvoiceBilled(fb);
      const customerPaidAmt = Number(fb.customerPaidAmount) || 0;
      // Short-pay proportions: apply ratio to brokerable portion, pass nonBrokerable through as-is
      const brokerableAdjusted = custStatus === "short" ? calc.grossForBrokerage * ratio : calc.grossForBrokerage;
      const adjustedGross = brokerableAdjusted + calc.nonBrokerableAdj;

      subData.fbs.push({
        fb,
        gross: calc.gross,              // full gross based on agreement
        adjustedGross,                  // what we'll actually pay (proportional for short-pay)
        grossForBrokerage: brokerableAdjusted, // what brokerage % applies to
        nonBrokerableAdj: calc.nonBrokerableAdj, // bypasses brokerage
        qty: calc.qty,
        method: calc.method,
        rate: calc.rate,
        dispatch: d,
        custStatus,                     // paid | short | unpaid | no_invoice
        customerRatio: ratio,
        customerBilled: billed,
        customerPaid: customerPaidAmt,
      });
      subData.gross += adjustedGross;
      if (fb.paidAmount) subData.paidSum += Number(fb.paidAmount);
    });
    // Compute net, brokerage + ready/advance splits per sub
    const asArray = Array.from(byProject.values()).map((pd) => {
      const subs = Array.from(pd.subs.values()).map((s) => {
        // Brokerage only applies to the grossForBrokerage portion, not non-brokerable adjustments
        const brokerableGross = s.fbs.reduce((sum, x) => sum + (x.grossForBrokerage || 0), 0);
        const nonBrokerableSum = s.fbs.reduce((sum, x) => sum + (x.nonBrokerableAdj || 0), 0);
        const brokerageAmt = s.brokerageApplies ? brokerableGross * (s.brokeragePct / 100) : 0;

        // Split: ready-to-pay vs advance-risk
        const unpaidEntries = s.fbs.filter((x) => !x.fb.paidAt);
        const readyEntries = unpaidEntries.filter((x) => x.custStatus === "paid" || x.custStatus === "short");
        const advanceEntries = unpaidEntries.filter((x) => x.custStatus !== "paid" && x.custStatus !== "short");
        const readyBrokerableGross = readyEntries.reduce((sum, x) => sum + (x.grossForBrokerage || 0), 0);
        const advanceBrokerableGross = advanceEntries.reduce((sum, x) => sum + (x.grossForBrokerage || 0), 0);
        const readyGross = readyEntries.reduce((sum, x) => sum + x.adjustedGross, 0);
        const advanceGross = advanceEntries.reduce((sum, x) => sum + x.adjustedGross, 0);
        const readyBrok = s.brokerageApplies ? readyBrokerableGross * (s.brokeragePct / 100) : 0;
        const advanceBrok = s.brokerageApplies ? advanceBrokerableGross * (s.brokeragePct / 100) : 0;

        return {
          ...s,
          brokerageAmt,
          nonBrokerableSum,
          net: s.gross - brokerageAmt,
          readyGross, readyNet: readyGross - readyBrok, readyCount: readyEntries.length,
          advanceGross, advanceNet: advanceGross - advanceBrok, advanceCount: advanceEntries.length,
        };
      }).sort((a, b) => a.subName.localeCompare(b.subName));
      const projGross = subs.reduce((s, x) => s + x.gross, 0);
      const projNet = subs.reduce((s, x) => s + x.net, 0);
      const projBrok = subs.reduce((s, x) => s + x.brokerageAmt, 0);
      return { ...pd, subs, projGross, projNet, projBrok };
    });
    // Sort: active projects first (by name), "No project" last
    asArray.sort((a, b) => {
      if (a.projectKey === "none") return 1;
      if (b.projectKey === "none") return -1;
      return a.projectName.localeCompare(b.projectName);
    });
    return asArray;
  }, [filteredFbs, dispatches, projects, contacts, projectFilter, subFilter, customerPaidOnly, invoices]);

  const allUnpaidSubs = useMemo(() => grouped.flatMap((p) => p.subs.filter((s) => s.fbs.some((x) => !x.fb.paidAt))), [grouped]);
  const totalUnpaidGross = grouped.reduce((s, p) => s + p.subs.reduce((ss, sub) => ss + sub.fbs.filter((x) => !x.fb.paidAt).reduce((sss, x) => sss + x.gross, 0), 0), 0);
  const totalBrokerageUnpaid = grouped.reduce((s, p) => s + p.subs.reduce((ss, sub) => {
    const unpaidGross = sub.fbs.filter((x) => !x.fb.paidAt).reduce((g, x) => g + x.gross, 0);
    return ss + (sub.brokerageApplies ? unpaidGross * (sub.brokeragePct / 100) : 0);
  }, 0), 0);
  const totalNetUnpaid = totalUnpaidGross - totalBrokerageUnpaid;
  const unpaidFBCount = grouped.reduce((s, p) => s + p.subs.reduce((ss, sub) => ss + sub.fbs.filter((x) => !x.fb.paidAt).length, 0), 0);

  const toggleProject = (key) => setExpanded((e) => ({ ...e, [`p_${key}`]: !e[`p_${key}`] }));
  const toggleSub = (pkey, skey) => setExpanded((e) => ({ ...e, [`s_${pkey}_${skey}`]: !e[`s_${pkey}_${skey}`] }));

  // Bulk pay all subs on a project
  const openPaySub = (pd, sub, includeAdvance = false) => {
    const unpaidFbs = sub.fbs.filter((x) => !x.fb.paidAt);
    if (unpaidFbs.length === 0) { onToast("ALL PAID"); return; }
    // Default: only pay ready FBs (customer has paid). If includeAdvance, include all.
    const fbsToPay = includeAdvance
      ? unpaidFbs
      : unpaidFbs.filter((x) => x.custStatus === "paid" || x.custStatus === "short");
    if (fbsToPay.length === 0) {
      onToast("NO CUSTOMER-PAID FBs — ENABLE ADVANCE PAY TO PAY ANYWAY");
      return;
    }
    const gross = fbsToPay.reduce((s, x) => s + x.adjustedGross, 0);
    const brokerageAmt = sub.brokerageApplies ? gross * (sub.brokeragePct / 100) : 0;
    setPayTarget({
      projectName: pd.projectName,
      subName: sub.subName,
      subId: sub.subId,
      subKind: sub.kind,
      brokerageApplies: sub.brokerageApplies,
      gross, brokeragePct: sub.brokeragePct, brokerageAmt, net: gross - brokerageAmt,
      fbs: fbsToPay,
      includeAdvance,
      hasAdvance: unpaidFbs.some((x) => x.custStatus !== "paid" && x.custStatus !== "short"),
      advanceAvailable: unpaidFbs.filter((x) => x.custStatus !== "paid" && x.custStatus !== "short").length,
    });
  };

  // Unmark paid (soft lock release)
  const unmarkPaid = async (fb) => {
    if (!confirm(`Un-mark FB #${fb.freightBillNumber || "(no #)"} as paid?\n\nThis removes the payment record AND unlocks the pay side so you can edit pay lines again.`)) return;
    try {
      await editFreightBill(fb.id, {
        ...fb,
        paidAt: null, paidBy: "", paidMethod: "", paidCheckNumber: "",
        paidAmount: null, paidNotes: "",
        // v17 fix: also clear the pay statement lock so admin can edit pay lines + regenerate stub
        payStatementLockedAt: null,
      });
      onToast("PAYMENT REMOVED · PAY SIDE UNLOCKED");
    } catch (e) { console.error(e); onToast("FAILED"); }
  };

  // CSV export for a project's payroll
  const exportProjectCSV = (pd) => {
    const rows = [["Sub/Driver", "FB#", "Date", "Order", "Driver", "Truck", "Method", "Qty", "Rate", "Gross", "Brok%", "Brokerage", "Net Due", "Paid Date", "Paid Amount", "Check #"]];
    pd.subs.forEach((sub) => {
      sub.fbs.forEach((entry) => {
        const brok = sub.brokerageApplies ? entry.gross * (sub.brokeragePct / 100) : 0;
        rows.push([
          sub.subName,
          entry.fb.freightBillNumber || "",
          entry.fb.submittedAt ? entry.fb.submittedAt.slice(0, 10) : "",
          entry.dispatch?.code || "",
          entry.fb.driverName || "",
          entry.fb.truckNumber || "",
          entry.method,
          entry.qty.toFixed(2),
          entry.rate.toFixed(2),
          entry.gross.toFixed(2),
          sub.brokerageApplies ? sub.brokeragePct : "",
          brok.toFixed(2),
          (entry.gross - brok).toFixed(2),
          entry.fb.paidAt ? entry.fb.paidAt.slice(0, 10) : "",
          entry.fb.paidAmount != null ? Number(entry.fb.paidAmount).toFixed(2) : "",
          entry.fb.paidCheckNumber || "",
        ]);
      });
    });
    const csv = rows.map((r) => r.map((v) => {
      const s = String(v).replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${pd.projectName.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("CSV EXPORTED");
  };

  const subContactOptions = contacts.filter((c) => c.type === "sub" || c.type === "driver");
  const methodLabel = { check: "Check", ach: "ACH", cash: "Cash", zelle: "Zelle", venmo: "Venmo", other: "Other" };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {payTarget && (
        <PaidModal
          target={payTarget}
          fbs={payTarget.fbs}
          editFreightBill={editFreightBill}
          onClose={() => setPayTarget(null)}
          onToast={onToast}
          onPaidSuccess={({ paidFbs, payRecord }) => {
            setStubOffer({
              target: payTarget,
              paidFbs,
              payRecord,
            });
          }}
          currentUser="admin"
        />
      )}
      {stubOffer && (
        <PayStubOfferModal
          target={stubOffer.target}
          fbs={stubOffer.paidFbs}
          payRecord={stubOffer.payRecord}
          allFreightBills={freightBills}
          allDispatches={dispatches}
          company={company}
          onPrint={() => {
            try {
              generatePayStubPDF({
                subName: stubOffer.target.subName,
                subKind: stubOffer.target.subKind,
                subId: stubOffer.target.subId,
                fbs: stubOffer.paidFbs,
                payRecord: stubOffer.payRecord,
                brokeragePct: stubOffer.target.brokeragePct || 8,
                brokerageApplies: (stubOffer.target.brokerageAmt || 0) > 0,
                allFreightBills: freightBills,
                allDispatches: dispatches,
                company,
                contact: contacts.find((c) => c.id === stubOffer.target.subId) || null,
              });
              onToast("STUB OPENED — PRINT / SAVE AS PDF");
            } catch (e) {
              onToast(e.message || "POPUP BLOCKED");
            }
          }}
          onClose={() => setStubOffer(null)}
        />
      )}
      {editingFB && (
        <FBEditModal
          fb={editingFB}
          dispatches={dispatches}
          contacts={contacts}
          projects={projects}
          editFreightBill={editFreightBill}
          invoices={invoices}
          onClose={() => setEditingFB(null)}
          onToast={onToast}
          currentUser="admin"
        />
      )}
      {traceFB && (
        <FBTraceModal
          entry={traceFB}
          invoices={invoices}
          contacts={contacts}
          onClose={() => setTraceFB(null)}
        />
      )}

      {/* CREATE PAY STATEMENT — sub-first flow with dual BILLED/PAID columns */}
      {payStatementOpen && (
        <PayStatementModal
          contacts={contacts}
          freightBills={freightBills}
          dispatches={dispatches}
          invoices={invoices}
          company={company}
          editFreightBill={editFreightBill}
          onClose={() => setPayStatementOpen(false)}
          onToast={onToast}
          currentUser="admin"
          onComplete={({ subId, sub, fbRows, totals }) => {
            // Hand off to the existing PaidModal — build a compatible target shape
            const subName = sub?.companyName || sub?.contactName || "Sub";
            const subKind = sub?.type || "sub";
            // Drivers never get brokerage
            const isSub = subKind === "sub";
            const payTargetData = {
              projectName: "Multi-project",
              subName, subId, subKind,
              brokerageApplies: isSub && !!sub?.brokerageApplies,
              brokeragePct: Number(sub?.brokeragePercent) || 8,
              gross: totals.gross,
              brokerageAmt: totals.brokerageAmt,
              net: totals.net,
              fbs: fbRows.map((r) => ({
                fb: r.fb,
                gross: r.payGross,
                adjustedGross: r.payGross,
                grossForBrokerage: r.payGrossForBrok,
                nonBrokerableAdj: r.payAdjNon,
                qty: r.payQty,
                method: r.payMethod,
                rate: r.payRate,
                dispatch: r.dispatch,
                custStatus: r.custPaid ? "paid" : (r.invoiced ? "unpaid" : "no_invoice"),
                customerBilled: r.billTotal,
                customerPaid: r.custPaid ? Number(r.fb.customerPaidAmount || 0) : 0,
                customerRatio: 1,
              })),
              includeAdvance: fbRows.some((r) => !r.custPaid),
              hasAdvance: fbRows.some((r) => !r.custPaid),
              advanceAvailable: fbRows.filter((r) => !r.custPaid).length,
            };
            setPayStatementOpen(false);
            setPayTarget(payTargetData);
          }}
        />
      )}

      {/* CREATE PAY STATEMENT button row */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <button
          onClick={() => setPayStatementOpen(true)}
          className="btn-primary"
          style={{ background: "var(--steel)", color: "var(--cream)", borderColor: "var(--steel)" }}
        >
          <FileText size={14} /> CREATE PAY STATEMENT
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <div className="fbt-card" style={{ padding: 16, background: "var(--hazard)", color: "var(--steel)" }}>
          <div className="stat-num" style={{ color: "var(--steel)" }}>{unpaidFBCount}</div>
          <div className="stat-label">Unpaid FBs</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{fmt$(totalUnpaidGross).replace("$", "$").slice(0, 10)}</div>
          <div className="stat-label">Unpaid Gross</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num" style={{ color: "var(--hazard-deep)" }}>−{fmt$(totalBrokerageUnpaid).replace("$", "$").slice(0, 10)}</div>
          <div className="stat-label">Brokerage</div>
        </div>
        <div className="fbt-card" style={{ padding: 16, background: "var(--good)", color: "#FFF" }}>
          <div className="stat-num" style={{ color: "#FFF" }}>{fmt$(totalNetUnpaid).replace("$", "$").slice(0, 10)}</div>
          <div className="stat-label" style={{ color: "#FFF" }}>Total Net Due</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{allUnpaidSubs.length}</div>
          <div className="stat-label">Subs/Drivers Owed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="fbt-card" style={{ padding: 16, display: "grid", gap: 12 }}>
        {/* Customer-paid filter (prominent) */}
        <div style={{ padding: 12, background: customerPaidOnly ? "#F0FDF4" : "#FEF2F2", border: "2px solid " + (customerPaidOnly ? "var(--good)" : "var(--safety)"), display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontFamily: "JetBrains Mono, monospace", flex: 1, minWidth: 240 }}>
            <input
              type="checkbox"
              checked={customerPaidOnly}
              onChange={(e) => setCustomerPaidOnly(e.target.checked)}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <Banknote size={16} style={{ color: customerPaidOnly ? "var(--good)" : "var(--safety)" }} />
            <strong>{customerPaidOnly ? "PAY ONLY WHEN CUSTOMER PAID" : "⚠ ADVANCE PAY MODE — PAYING BEFORE CUSTOMER PAYS"}</strong>
          </label>
          {!customerPaidOnly && (
            <span className="fbt-mono" style={{ fontSize: 10, color: "var(--safety)", letterSpacing: "0.1em" }}>
              RISK: YOUR CASH FIRST
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <div>
            <label className="fbt-label">Status</label>
            <select className="fbt-select" value={paidFilter} onChange={(e) => setPaidFilter(e.target.value)}>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="all">All</option>
            </select>
          </div>
          <div>
            <label className="fbt-label">From</label>
            <input className="fbt-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="fbt-label">To</label>
            <input className="fbt-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div>
            <label className="fbt-label">Project</label>
            <select className="fbt-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value="none">(No project)</option>
            </select>
          </div>
          <div>
            <label className="fbt-label">Sub / Driver</label>
            <select className="fbt-select" value={subFilter} onChange={(e) => setSubFilter(e.target.value)}>
              <option value="">All</option>
              {subContactOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grouped results */}
      {grouped.length === 0 ? (
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", color: "var(--concrete)" }}>
          <DollarSign size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {paidFilter === "unpaid" ? "NO UNPAID FREIGHT BILLS — ALL PAID" : "NO MATCHING FREIGHT BILLS"}
          </div>
          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8, lineHeight: 1.5 }}>
            FBs must be APPROVED and have a PAY RATE set on their order assignment to appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {grouped.map((pd) => {
            const pExp = expanded[`p_${pd.projectKey}`] !== false; // default expanded
            return (
              <div key={pd.projectKey} className="fbt-card" style={{ padding: 0, overflow: "hidden" }}>
                {/* Project header */}
                <div
                  style={{
                    padding: "12px 16px", background: "var(--steel)", color: "var(--cream)",
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
                    cursor: "pointer",
                  }}
                  onClick={() => toggleProject(pd.projectKey)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 200 }}>
                    <ChevronDown size={16} style={{ transform: pExp ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
                    <Briefcase size={16} style={{ color: "var(--hazard)" }} />
                    <div>
                      <div className="fbt-display" style={{ fontSize: 16 }}>{pd.projectName}</div>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1", marginTop: 2 }}>
                        {pd.subs.length} SUB{pd.subs.length !== 1 ? "S" : ""} · {pd.subs.reduce((s, x) => s + x.fbs.length, 0)} FB{pd.subs.reduce((s, x) => s + x.fbs.length, 0) !== 1 ? "S" : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "right" }}>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1" }}>GROSS</div>
                      <div className="fbt-display" style={{ fontSize: 14 }}>{fmt$(pd.projGross)}</div>
                    </div>
                    {pd.projBrok > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1" }}>BROK</div>
                        <div className="fbt-display" style={{ fontSize: 14, color: "var(--hazard)" }}>−{fmt$(pd.projBrok)}</div>
                      </div>
                    )}
                    <div style={{ textAlign: "right" }}>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)" }}>NET</div>
                      <div className="fbt-display" style={{ fontSize: 16, color: "var(--hazard)" }}>{fmt$(pd.projNet)}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); exportProjectCSV(pd); }}
                      className="btn-ghost"
                      style={{ padding: "5px 10px", fontSize: 10, color: "var(--cream)", borderColor: "var(--cream)" }}
                    >
                      <Download size={11} style={{ marginRight: 3 }} /> CSV
                    </button>
                  </div>
                </div>

                {/* Subs under this project */}
                {pExp && (
                  <div style={{ padding: 12, display: "grid", gap: 10 }}>
                    {pd.subs.map((sub) => {
                      const sExp = expanded[`s_${pd.projectKey}_${sub.subKey}`];
                      const unpaidFbs = sub.fbs.filter((x) => !x.fb.paidAt);
                      const paidFbs = sub.fbs.filter((x) => !!x.fb.paidAt);
                      const unpaidGross = unpaidFbs.reduce((s, x) => s + x.gross, 0);
                      const unpaidBrok = sub.brokerageApplies ? unpaidGross * (sub.brokeragePct / 100) : 0;
                      const unpaidNet = unpaidGross - unpaidBrok;
                      const isAllPaid = unpaidFbs.length === 0 && paidFbs.length > 0;
                      // Missing-rate detection: any FB whose assignment has no payRate configured
                      const missingRateFbs = sub.fbs.filter((x) => {
                        const d = x.dispatch;
                        const a = (d?.assignments || []).find((ax) => ax.aid === x.fb.assignmentId);
                        return !a || !a.payRate || Number(a.payRate) <= 0;
                      });
                      return (
                        <div key={sub.subKey} id={`payroll-sub-${sub.subId}`} style={{ border: "1.5px solid var(--steel)", background: isAllPaid ? "#F0FDF4" : "#FFF" }}>
                          <div
                            style={{ padding: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, cursor: "pointer" }}
                            onClick={() => toggleSub(pd.projectKey, sub.subKey)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 180 }}>
                              <ChevronDown size={14} style={{ transform: sExp ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
                              <span className="chip" style={{ background: sub.kind === "driver" ? "#FFF" : "var(--hazard)", fontSize: 9, padding: "2px 7px" }}>
                                {sub.kind === "driver" ? "DRIVER" : "SUB"}
                              </span>
                              {sub.brokerageApplies && (
                                <span className="chip" style={{ background: "var(--hazard-deep)", color: "#FFF", fontSize: 9, padding: "2px 7px" }}>
                                  −{sub.brokeragePct}% BROK
                                </span>
                              )}
                              {isAllPaid && (
                                <span className="chip" style={{ background: "var(--good)", color: "#FFF", fontSize: 9, padding: "2px 7px" }}>
                                  ✓ PAID
                                </span>
                              )}
                              <div className="fbt-display" style={{ fontSize: 14 }}>{sub.subName}</div>
                              <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
                                {unpaidFbs.length > 0 ? `${unpaidFbs.length} UNPAID` : ""}
                                {paidFbs.length > 0 ? ` ${paidFbs.length} PAID` : ""}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                              {unpaidFbs.length > 0 ? (
                                <>
                                  {/* Ready block */}
                                  {sub.readyCount > 0 && (
                                    <div style={{ textAlign: "right", padding: "4px 8px", background: "#F0FDF4", border: "1.5px solid var(--good)" }}>
                                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--good)", fontWeight: 700 }}>READY · {sub.readyCount} FB</div>
                                      <div className="fbt-display" style={{ fontSize: 14, color: "var(--good)" }}>{fmt$(sub.readyNet)}</div>
                                    </div>
                                  )}
                                  {/* Advance block */}
                                  {sub.advanceCount > 0 && (
                                    <div style={{ textAlign: "right", padding: "4px 8px", background: "#FEF2F2", border: "1.5px solid var(--safety)" }}>
                                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--safety)", fontWeight: 700 }}>⚠ ADVANCE · {sub.advanceCount} FB</div>
                                      <div className="fbt-display" style={{ fontSize: 14, color: "var(--safety)" }}>{fmt$(sub.advanceNet)}</div>
                                    </div>
                                  )}
                                  {/* Smart PAY button */}
                                  {sub.readyCount > 0 ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openPaySub(pd, sub, false); }}
                                      className="btn-primary"
                                      style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)", padding: "6px 14px", fontSize: 11 }}
                                      title={`Pay ${sub.readyCount} FBs the customer already paid for`}
                                    >
                                      <DollarSign size={12} /> PAY READY
                                    </button>
                                  ) : sub.advanceCount > 0 ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); if (confirm("No customer payments received for these FBs yet.\n\nPay sub anyway (ADVANCE PAY — your cash at risk)?")) openPaySub(pd, sub, true); }}
                                      className="btn-ghost"
                                      style={{ background: "var(--safety)", color: "#FFF", borderColor: "var(--safety)", padding: "6px 14px", fontSize: 11 }}
                                      title="Customer hasn't paid yet — advance pay is at your risk"
                                    >
                                      <AlertTriangle size={12} /> ADVANCE PAY
                                    </button>
                                  ) : null}
                                  {/* If both ready AND advance — optional secondary button */}
                                  {sub.readyCount > 0 && sub.advanceCount > 0 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); if (confirm(`Pay all ${unpaidFbs.length} FBs including ${sub.advanceCount} advance (customer not paid)?`)) openPaySub(pd, sub, true); }}
                                      className="btn-ghost"
                                      style={{ padding: "6px 10px", fontSize: 10, color: "var(--safety)", borderColor: "var(--safety)" }}
                                      title="Pay everything including advance-risk FBs"
                                    >
                                      +ADV
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="fbt-mono" style={{ fontSize: 11, color: "var(--good)", fontWeight: 700 }}>
                                  ✓ ALL PAID
                                </span>
                              )}
                              {/* Print Stub — visible when sub has any paid FBs */}
                              {paidFbs.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    try {
                                      // Group paid FBs by paidAt date to find the most recent pay run
                                      const paidByDate = new Map();
                                      paidFbs.forEach((x) => {
                                        const key = x.fb.paidAt ? x.fb.paidAt.slice(0, 10) : "unknown";
                                        if (!paidByDate.has(key)) paidByDate.set(key, []);
                                        paidByDate.get(key).push(x.fb);
                                      });
                                      // Most recent pay run
                                      const sortedDates = Array.from(paidByDate.keys()).sort().reverse();
                                      const latestDate = sortedDates[0];
                                      const latestRunFbs = paidByDate.get(latestDate);
                                      const payRecord = {
                                        paidAt: latestRunFbs[0].paidAt,
                                        paidMethod: latestRunFbs[0].paidMethod,
                                        paidCheckNumber: latestRunFbs[0].paidCheckNumber,
                                        paidNotes: latestRunFbs[0].paidNotes,
                                      };
                                      generatePayStubPDF({
                                        subName: sub.subName,
                                        subKind: sub.kind,
                                        subId: sub.subId,
                                        fbs: latestRunFbs,
                                        payRecord,
                                        brokeragePct: sub.brokeragePct,
                                        brokerageApplies: sub.brokerageApplies,
                                        allFreightBills: freightBills,
                                        allDispatches: dispatches,
                                        company,
                                        contact: contacts.find((c) => c.id === sub.subId) || null,
                                        isHistorical: true,
                                      });
                                      onToast(`STUB FOR ${sub.subName} (${latestDate})`);
                                    } catch (err) {
                                      onToast(err.message || "POPUP BLOCKED");
                                    }
                                  }}
                                  className="btn-ghost"
                                  style={{ padding: "6px 10px", fontSize: 10, color: "var(--steel)" }}
                                  title="Print pay stub for most recent pay run"
                                >
                                  <Printer size={11} style={{ marginRight: 3 }} /> STUB
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Individual FBs */}
                          {sExp && (
                            <div style={{ padding: "0 10px 10px", display: "grid", gap: 4 }}>
                              {/* Missing-rate warning — sub-level */}
                              {missingRateFbs.length > 0 && (
                                <div style={{ padding: 10, background: "#FEE2E2", border: "2px solid var(--safety)", marginBottom: 6 }}>
                                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--safety)", fontWeight: 700, marginBottom: 4, letterSpacing: "0.08em" }}>
                                    ⚠ {missingRateFbs.length} FB{missingRateFbs.length !== 1 ? "s" : ""} MISSING PAY RATE — SHOWING $0
                                  </div>
                                  <div style={{ fontSize: 10, color: "var(--concrete)", lineHeight: 1.5 }}>
                                    The order assignment for {sub.subName} has no pay rate set. To fix: open the order (click FB# link), find the assignment row, and enter the pay rate. Future orders will auto-fill from this contact's default pay rate (set in Contacts tab).
                                  </div>
                                  {missingRateFbs.length > 0 && missingRateFbs[0].dispatch && (
                                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>
                                      AFFECTED ORDERS: {[...new Set(missingRateFbs.map((x) => `#${x.dispatch.code}`))].join(", ")}
                                    </div>
                                  )}
                                </div>
                              )}
                              {sub.fbs.map((entry) => {
                                const fb = entry.fb;
                                const isPaid = !!fb.paidAt;
                                return (
                                  <div
                                    key={fb.id}
                                    style={{
                                      padding: 8, fontSize: 11, fontFamily: "JetBrains Mono, monospace",
                                      background: isPaid ? "#F0FDF4" : (entry.custStatus === "paid" || entry.custStatus === "short" ? "#FEF3C7" : "#FEE2E2"),
                                      borderLeft: `3px solid ${isPaid ? "var(--good)" : (entry.custStatus === "paid" || entry.custStatus === "short" ? "var(--hazard)" : "var(--safety)")}`,
                                      display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "center",
                                    }}
                                  >
                                    <div style={{ minWidth: 0, overflow: "hidden" }}>
                                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                        <strong style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setEditingFB(fb)}>
                                          FB#{fb.freightBillNumber || "—"}
                                        </strong>
                                        <span style={{ color: "var(--concrete)" }}>
                                          {fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : ""} · Order #{entry.dispatch?.code}
                                        </span>
                                        {/* Customer-pay status chip */}
                                        {entry.custStatus === "paid" && (
                                          <span
                                            className="chip"
                                            style={{ background: "var(--good)", color: "#FFF", fontSize: 9, padding: "2px 6px", cursor: "pointer" }}
                                            onClick={() => setTraceFB(entry)}
                                            title="Click to trace invoice + customer payment"
                                          >
                                            ✓ CUST PAID
                                          </span>
                                        )}
                                        {entry.custStatus === "short" && (
                                          <span
                                            className="chip"
                                            style={{ background: "var(--hazard)", fontSize: 9, padding: "2px 6px", cursor: "pointer" }}
                                            onClick={() => setTraceFB(entry)}
                                            title="Click to trace invoice + customer payment"
                                          >
                                            ⚠ SHORT-PAID {Math.round(entry.customerRatio * 100)}%
                                          </span>
                                        )}
                                        {entry.custStatus === "unpaid" && (
                                          <span
                                            className="chip"
                                            style={{ background: "var(--safety)", color: "#FFF", fontSize: 9, padding: "2px 6px", cursor: "pointer" }}
                                            onClick={() => setTraceFB(entry)}
                                            title="Click to trace invoice"
                                          >
                                            ○ CUST UNPAID
                                          </span>
                                        )}
                                        {entry.custStatus === "no_invoice" && (
                                          <span className="chip" style={{ background: "var(--concrete)", color: "#FFF", fontSize: 9, padding: "2px 6px" }}>
                                            NO INVOICE
                                          </span>
                                        )}
                                        {/* Direct link to invoice — if FB is on one */}
                                        {fb.invoiceId && onJumpToInvoice && (() => {
                                          const inv = invoices.find((i) => i.id === fb.invoiceId);
                                          if (!inv) return null;
                                          return (
                                            <span
                                              className="chip"
                                              style={{ background: "var(--steel)", color: "var(--cream)", fontSize: 9, padding: "2px 6px", cursor: "pointer", fontWeight: 700 }}
                                              onClick={(e) => { e.stopPropagation(); onJumpToInvoice(inv.id); }}
                                              title="Jump to this invoice"
                                            >
                                              → INV {inv.invoiceNumber}
                                            </span>
                                          );
                                        })()}
                                        {isPaid && (
                                          <span style={{ color: "var(--good)", fontWeight: 700 }}>
                                            ✓ {fb.paidAt.slice(0, 10)} · {methodLabel[fb.paidMethod] || "Paid"}{fb.paidCheckNumber ? ` #${fb.paidCheckNumber}` : ""} · {fmt$(fb.paidAmount || 0)}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ color: "var(--concrete)", fontSize: 10, marginTop: 2 }}>
                                        {fb.driverName || "—"}{fb.truckNumber ? ` · T${fb.truckNumber}` : ""} · {entry.qty.toFixed(2)} {entry.method} × ${entry.rate.toFixed(2)} = <strong style={{ color: "var(--steel)" }}>{fmt$(entry.gross)}</strong>
                                        {entry.custStatus === "short" && (
                                          <span style={{ color: "var(--safety)", marginLeft: 8 }}>
                                            → PAY {fmt$(entry.adjustedGross)} ({Math.round(entry.customerRatio * 100)}%)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 4 }}>
                                      {(entry.custStatus === "paid" || entry.custStatus === "short" || entry.custStatus === "unpaid") && (
                                        <button onClick={() => setTraceFB(entry)} className="btn-ghost" style={{ padding: "3px 8px", fontSize: 10 }} title="Trace to invoice / payment">
                                          <Search size={10} />
                                        </button>
                                      )}
                                      <button onClick={() => setEditingFB(fb)} className="btn-ghost" style={{ padding: "3px 8px", fontSize: 10 }}>
                                        <Edit2 size={10} />
                                      </button>
                                      {isPaid && (
                                        <button onClick={() => unmarkPaid(fb)} className="btn-ghost" style={{ padding: "3px 8px", fontSize: 10, color: "var(--safety)" }} title="Un-mark paid">
                                          <RefreshCw size={10} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ========== PROJECT MODAL ==========
const ProjectModal = ({ project, contacts, onSave, onClose, onToast }) => {
  const [draft, setDraft] = useState(project || {
    customerId: null, name: "", description: "", contractNumber: "", poNumber: "",
    location: "", status: "active", startDate: "", endDate: "",
    tonnageGoal: "", budget: "", bidAmount: "",
    primeContractor: "", fundingSource: "", certifiedPayroll: false, notes: "",
    defaultRate: "", minimumHours: "",
  });

  const customers = contacts.filter((c) => c.type === "customer");

  const save = async () => {
    if (!draft.name) { alert("Project name is required."); return; }
    await onSave({
      ...draft,
      id: draft.id || ("temp-" + Date.now()),
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onToast(project ? "PROJECT UPDATED" : "PROJECT CREATED");
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Briefcase size={18} /> {project ? "EDIT PROJECT" : "NEW PROJECT"}
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div>
            <label className="fbt-label">Customer</label>
            {customers.length > 0 ? (
              <select className="fbt-select" value={draft.customerId || ""} onChange={(e) => setDraft({ ...draft, customerId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— Choose customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.favorite ? "★ " : ""}{c.companyName || c.contactName}</option>
                ))}
              </select>
            ) : (
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", padding: "8px 10px", border: "1px dashed var(--concrete)", background: "#F5F5F4" }}>
                ADD A CUSTOMER IN CONTACTS FIRST
              </div>
            )}
          </div>

          <div>
            <label className="fbt-label">Project Name *</label>
            <input className="fbt-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Salinas Stormwater Phase 2A" />
          </div>

          <div>
            <label className="fbt-label">Description</label>
            <textarea className="fbt-textarea" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Brief summary of the work..." />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Contract #</label>
              <input className="fbt-input" value={draft.contractNumber} onChange={(e) => setDraft({ ...draft, contractNumber: e.target.value })} placeholder="MCI #91684" />
            </div>
            <div>
              <label className="fbt-label">PO # (for invoices)</label>
              <input className="fbt-input" value={draft.poNumber} onChange={(e) => setDraft({ ...draft, poNumber: e.target.value })} placeholder="PO-2026-0045" />
            </div>
            <div>
              <label className="fbt-label">Status</label>
              <select className="fbt-select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="complete">Complete</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="fbt-label">Location</label>
            <input className="fbt-input" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Hitchcock Rd, Salinas, CA" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Start Date</label>
              <input className="fbt-input" type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">End Date</label>
              <input className="fbt-input" type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
            </div>
          </div>

          {/* Project Billing Defaults — inherited by orders under this project */}
          <div style={{ padding: 14, background: "#F0FDF4", border: "2px solid var(--good)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>
              ▸ BILLING DEFAULTS · APPLIED TO ORDERS + INVOICES UNDER THIS PROJECT
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
              <div>
                <label className="fbt-label">Default Rate $/hr</label>
                <input
                  className="fbt-input"
                  type="number"
                  step="0.01"
                  value={draft.defaultRate ?? ""}
                  onChange={(e) => setDraft({ ...draft, defaultRate: e.target.value })}
                  placeholder="142.00"
                />
              </div>
              <div>
                <label className="fbt-label">Minimum Hours</label>
                <input
                  className="fbt-input"
                  type="number"
                  step="0.25"
                  value={draft.minimumHours ?? ""}
                  onChange={(e) => setDraft({ ...draft, minimumHours: e.target.value })}
                  placeholder="8"
                />
              </div>
            </div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8, lineHeight: 1.5 }}>
              ▸ INVOICE USES max(ACTUAL_HOURS, MINIMUM) × RATE · SUB PAYROLL USES ACTUAL HOURS
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Tonnage Goal</label>
              <input className="fbt-input" type="number" value={draft.tonnageGoal} onChange={(e) => setDraft({ ...draft, tonnageGoal: e.target.value })} placeholder="5000" />
            </div>
            <div>
              <label className="fbt-label">Bid Amount $</label>
              <input className="fbt-input" type="number" step="0.01" value={draft.bidAmount} onChange={(e) => setDraft({ ...draft, bidAmount: e.target.value })} placeholder="125000.00" />
            </div>
            <div>
              <label className="fbt-label">Budget $</label>
              <input className="fbt-input" type="number" step="0.01" value={draft.budget} onChange={(e) => setDraft({ ...draft, budget: e.target.value })} placeholder="118000.00" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Prime Contractor</label>
              <input className="fbt-input" value={draft.primeContractor} onChange={(e) => setDraft({ ...draft, primeContractor: e.target.value })} placeholder="MCI (if we're the sub)" />
            </div>
            <div>
              <label className="fbt-label">Funding Source</label>
              <select className="fbt-select" value={draft.fundingSource} onChange={(e) => setDraft({ ...draft, fundingSource: e.target.value })}>
                <option value="">— Select —</option>
                <option value="public_works">Public Works</option>
                <option value="federal">Federal</option>
                <option value="state">State</option>
                <option value="local">Local / Municipal</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, border: "2px solid var(--steel)", background: draft.certifiedPayroll ? "#FEF3C7" : "#FFF", cursor: "pointer" }}>
            <input type="checkbox" checked={draft.certifiedPayroll} onChange={(e) => setDraft({ ...draft, certifiedPayroll: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer" }} />
            <span className="fbt-mono" style={{ fontSize: 12, letterSpacing: "0.08em" }}>CERTIFIED PAYROLL REQUIRED (Prevailing Wage)</span>
          </label>

          <div>
            <label className="fbt-label">Notes</label>
            <textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Internal notes, quirks, special requirements..." />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <button onClick={save} className="btn-primary"><CheckCircle2 size={16} /> SAVE PROJECT</button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== PROJECT DETAIL MODAL ==========
const ProjectDetailModal = ({ project, contacts, dispatches, freightBills, invoices, onEdit, onDelete, onClose }) => {
  const customer = contacts.find((c) => c.id === project.customerId);
  const projectDispatches = dispatches.filter((d) => d.projectId === project.id);
  const projectBills = freightBills.filter((fb) => projectDispatches.some((d) => d.id === fb.dispatchId));
  const projectInvoices = invoices.filter((i) => i.projectId === project.id);

  const totalTons = projectBills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
  const totalInvoiced = projectInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);

  const statusColor = {
    active: "var(--good)", complete: "var(--concrete)",
    on_hold: "var(--hazard-deep)", cancelled: "var(--safety)",
  }[project.status] || "var(--concrete)";

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.1em" }}>
              PROJECT · {project.status?.toUpperCase().replace("_", " ")}
            </div>
            <h3 className="fbt-display" style={{ fontSize: 22, margin: "4px 0 0" }}>{project.name}</h3>
            {customer && <div className="fbt-mono" style={{ fontSize: 12, color: "#D6D3D1", marginTop: 4 }}>for {customer.companyName}</div>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onEdit} className="btn-ghost" style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "6px 12px", fontSize: 11 }}><Edit2 size={12} /></button>
            <button onClick={onDelete} className="btn-danger" style={{ color: "var(--hazard)", borderColor: "var(--hazard)" }}><Trash2 size={12} /></button>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* Key stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
            <div className="fbt-card" style={{ padding: 14, background: statusColor, color: "#FFF" }}>
              <div className="stat-num" style={{ fontSize: 22, color: "#FFF" }}>{project.status?.replace("_", " ").toUpperCase()}</div>
              <div className="stat-label" style={{ color: "#FFF" }}>Status</div>
            </div>
            <div className="fbt-card" style={{ padding: 14 }}>
              <div className="stat-num" style={{ fontSize: 28 }}>{projectDispatches.length}</div>
              <div className="stat-label">Orders</div>
            </div>
            <div className="fbt-card" style={{ padding: 14 }}>
              <div className="stat-num" style={{ fontSize: 28 }}>{totalTons.toFixed(1)}</div>
              <div className="stat-label">Tons Hauled</div>
            </div>
            <div className="fbt-card" style={{ padding: 14, background: "var(--hazard)" }}>
              <div className="stat-num" style={{ fontSize: 22 }}>{fmt$(totalInvoiced)}</div>
              <div className="stat-label">Invoiced</div>
            </div>
          </div>

          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ PROJECT INFO</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 20, fontSize: 13, fontFamily: "JetBrains Mono, monospace" }}>
            {project.contractNumber && <div><strong>CONTRACT:</strong> {project.contractNumber}</div>}
            {project.poNumber && <div><strong>PO #:</strong> {project.poNumber}</div>}
            {project.location && <div style={{ gridColumn: "1 / -1" }}><strong>LOCATION:</strong> {project.location}</div>}
            {project.startDate && <div><strong>START:</strong> {fmtDate(project.startDate)}</div>}
            {project.endDate && <div><strong>END:</strong> {fmtDate(project.endDate)}</div>}
            {project.primeContractor && <div><strong>PRIME:</strong> {project.primeContractor}</div>}
            {project.fundingSource && <div><strong>FUNDING:</strong> {project.fundingSource.replace("_", " ").toUpperCase()}</div>}
            {project.bidAmount && <div><strong>BID:</strong> {fmt$(project.bidAmount)}</div>}
            {project.budget && <div><strong>BUDGET:</strong> {fmt$(project.budget)}</div>}
            {project.tonnageGoal && <div><strong>TONNAGE GOAL:</strong> {Number(project.tonnageGoal).toFixed(0)}</div>}
            {project.certifiedPayroll && <div style={{ gridColumn: "1 / -1", color: "var(--hazard-deep)" }}><strong>⚠ CERTIFIED PAYROLL REQUIRED</strong></div>}
          </div>

          {project.description && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ DESCRIPTION</div>
              <div style={{ padding: 12, background: "#F5F5F4", fontSize: 13, marginBottom: 20, whiteSpace: "pre-wrap" }}>{project.description}</div>
            </>
          )}

          {project.notes && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ INTERNAL NOTES</div>
              <div style={{ padding: 12, background: "#FEF3C7", borderLeft: "3px solid var(--hazard)", fontSize: 13, marginBottom: 20, whiteSpace: "pre-wrap" }}>{project.notes}</div>
            </>
          )}

          {/* Progress bar if tonnage goal set */}
          {project.tonnageGoal > 0 && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>
                ▸ PROGRESS · {totalTons.toFixed(1)} / {Number(project.tonnageGoal).toFixed(0)} TONS
              </div>
              <div style={{ height: 14, background: "#E7E5E4", border: "1px solid var(--steel)", marginBottom: 20 }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, (totalTons / Number(project.tonnageGoal)) * 100)}%`,
                  background: totalTons >= Number(project.tonnageGoal) ? "var(--good)" : "var(--hazard)",
                }} />
              </div>
            </>
          )}

          {projectDispatches.length > 0 && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ ORDERS ON THIS PROJECT ({projectDispatches.length})</div>
              <div style={{ display: "grid", gap: 6 }}>
                {projectDispatches.slice(0, 15).map((d) => {
                  const bills = freightBills.filter((fb) => fb.dispatchId === d.id);
                  return (
                    <div key={d.id} style={{ padding: 10, border: "1px solid var(--steel)", background: "#FFF", fontSize: 12, fontFamily: "JetBrains Mono, monospace", display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <div><strong>#{d.code}</strong> · {d.jobName}</div>
                      <div style={{ color: "var(--concrete)" }}>{fmtDate(d.date)} · {bills.length}/{d.trucksExpected} FB</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ========== PROJECTS TAB ==========
const ProjectsTab = ({ projects, setProjects, contacts, dispatches, freightBills, invoices, onToast }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const save = async (p) => {
    const exists = projects.find((x) => x.id === p.id);
    const next = exists ? projects.map((x) => x.id === p.id ? p : x) : [p, ...projects];
    setProjects(next);
  };

  const remove = async (id) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`Delete project "${p.name}"? Orders linked to it will keep their project reference (but the project won't exist anymore).`)) return;
    const next = projects.filter((x) => x.id !== id);
    setProjects(next);
    onToast("PROJECT DELETED");
    setViewing(null);
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return projects
      .filter((p) => statusFilter === "all" || p.status === statusFilter)
      .filter((p) => {
        if (!s) return true;
        const customer = contacts.find((c) => c.id === p.customerId);
        const hay = `${p.name} ${p.contractNumber} ${p.poNumber} ${p.location} ${customer?.companyName || ""}`.toLowerCase();
        return hay.includes(s);
      })
      .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  }, [projects, contacts, search, statusFilter]);

  const activeCount = projects.filter((p) => p.status === "active").length;
  const completeCount = projects.filter((p) => p.status === "complete").length;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {showModal && (
        <ProjectModal
          project={editing}
          contacts={contacts}
          onSave={save}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onToast={onToast}
        />
      )}
      {viewing && !showModal && (
        <ProjectDetailModal
          project={viewing}
          contacts={contacts}
          dispatches={dispatches}
          freightBills={freightBills}
          invoices={invoices}
          onEdit={() => { setEditing(viewing); setShowModal(true); }}
          onDelete={() => remove(viewing.id)}
          onClose={() => setViewing(null)}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{projects.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--good)", color: "#FFF" }}>
          <div className="stat-num" style={{ color: "#FFF" }}>{activeCount}</div>
          <div className="stat-label" style={{ color: "#FFF" }}>Active</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{completeCount}</div>
          <div className="stat-label">Complete</div>
        </div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--hazard)" }}>
          <div className="stat-num">{projects.filter((p) => p.certifiedPayroll).length}</div>
          <div className="stat-label">Cert Payroll</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search name, contract, PO, location…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="fbt-select" style={{ width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="complete">Complete</option>
          <option value="on_hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> NEW PROJECT
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <Briefcase size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {search || statusFilter !== "all" ? "NO MATCHES" : "NO PROJECTS YET — ADD YOUR FIRST ONE"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map((p) => {
            const customer = contacts.find((c) => c.id === p.customerId);
            const orders = dispatches.filter((d) => d.projectId === p.id);
            const bills = freightBills.filter((fb) => orders.some((d) => d.id === fb.dispatchId));
            const tons = bills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
            const statusBg = {
              active: "var(--good)", complete: "var(--concrete)",
              on_hold: "var(--hazard-deep)", cancelled: "var(--safety)",
            }[p.status] || "var(--concrete)";
            return (
              <div key={p.id} className="fbt-card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => setViewing(p)}>
                <div className="hazard-stripe-thin" style={{ height: 6 }} />
                <div style={{ padding: 18 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                    <Briefcase size={18} style={{ color: "var(--hazard-deep)", flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
                        <span className="chip" style={{ background: statusBg, color: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                          {p.status?.replace("_", " ").toUpperCase()}
                        </span>
                        {p.certifiedPayroll && <span className="chip" style={{ background: "var(--hazard)", fontSize: 9, padding: "2px 8px" }}>CERT PAYROLL</span>}
                      </div>
                      <div className="fbt-display" style={{ fontSize: 17, lineHeight: 1.15 }}>{p.name}</div>
                      {customer && <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 3 }}>for {customer.companyName}</div>}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)", lineHeight: 1.6, marginTop: 8 }}>
                    {p.contractNumber && <div>CONTRACT ▸ {p.contractNumber}</div>}
                    {p.poNumber && <div>PO ▸ {p.poNumber}</div>}
                    {p.location && <div style={{ display: "flex", gap: 4, alignItems: "flex-start" }}><MapPin size={11} style={{ marginTop: 2, flexShrink: 0 }} /> {p.location}</div>}
                  </div>

                  <div style={{ marginTop: 12, padding: 10, background: "#F5F5F4", borderRadius: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, textAlign: "center" }}>
                    <div>
                      <div className="fbt-display" style={{ fontSize: 16, lineHeight: 1 }}>{orders.length}</div>
                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>ORDERS</div>
                    </div>
                    <div>
                      <div className="fbt-display" style={{ fontSize: 16, lineHeight: 1 }}>{tons.toFixed(0)}</div>
                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>TONS</div>
                    </div>
                    <div>
                      <div className="fbt-display" style={{ fontSize: 16, lineHeight: 1, color: "var(--hazard-deep)" }}>{p.bidAmount ? fmt$(p.bidAmount).replace("$", "$").slice(0, 8) : "—"}</div>
                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>BID</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ========== MATERIALS TAB ==========
const MaterialsTab = ({ quarries, setQuarries, dispatches, onToast }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");
  const [showCompare, setShowCompare] = useState(false);

  const save = async (quarry) => {
    const exists = quarries.find((q) => q.id === quarry.id);
    const next = exists ? quarries.map((q) => q.id === quarry.id ? quarry : q) : [quarry, ...quarries];
    setQuarries(next);

  };

  const remove = async (id) => {
    const q = quarries.find((x) => x.id === id);
    if (!q) return;
    if (!confirm(`Delete quarry "${q.name}"? Linked dispatches will lose their quarry reference.`)) return;
    const next = quarries.filter((x) => x.id !== id);
    setQuarries(next);

    onToast("QUARRY DELETED");
    setViewing(null);
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return quarries
      .filter((q) => {
        if (!s) return true;
        const hay = `${q.name} ${q.address || ""} ${q.contactName || ""} ${q.notes || ""} ${(q.materials || []).map((m) => m.name).join(" ")}`.toLowerCase();
        return hay.includes(s);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [quarries, search]);

  const totalMaterials = quarries.reduce((s, q) => s + (q.materials?.length || 0), 0);
  const uniqueMaterials = new Set(quarries.flatMap((q) => q.materials.map((m) => m.name.toLowerCase()))).size;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {showModal && (
        <QuarryModal
          quarry={editing}
          onSave={save}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onToast={onToast}
        />
      )}
      {viewing && !showModal && (
        <QuarryDetailModal
          quarry={viewing}
          dispatches={dispatches}
          onEdit={() => { setEditing(viewing); setShowModal(true); }}
          onDelete={() => remove(viewing.id)}
          onClose={() => setViewing(null)}
        />
      )}
      {showCompare && (
        <ComparisonModal quarries={quarries} materialSearch={materialSearch} onClose={() => setShowCompare(false)} />
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{quarries.length}</div>
          <div className="stat-label">Quarries</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{totalMaterials}</div>
          <div className="stat-label">Material Listings</div>
        </div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--hazard)" }}>
          <div className="stat-num">{uniqueMaterials}</div>
          <div className="stat-label">Unique Materials</div>
        </div>
      </div>

      {/* Material search / comparison */}
      <div className="fbt-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <BarChart3 size={20} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 18, margin: 0 }}>COMPARE PRICES</h3>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Package size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
            <input
              className="fbt-input"
              style={{ paddingLeft: 38 }}
              placeholder="Find material (e.g. basalt, rock, sand…)"
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && materialSearch.trim() && setShowCompare(true)}
            />
          </div>
          <button onClick={() => setShowCompare(true)} className="btn-primary" disabled={!materialSearch.trim()}>
            <Search size={14} /> FIND CHEAPEST
          </button>
        </div>
        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 10, letterSpacing: "0.05em" }}>
          ▸ SEARCHES ACROSS ALL QUARRIES · RANKED BY CURRENT $/TON
        </div>
      </div>

      {/* Quarry list controls */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search quarries, location, material…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> NEW QUARRY
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <Mountain size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {search ? "NO MATCHES" : "NO QUARRIES YET — ADD YOUR FIRST SUPPLIER"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map((q) => (
            <div key={q.id} className="fbt-card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => setViewing(q)}>
              <div className="hazard-stripe-thin" style={{ height: 6 }} />
              <div style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Mountain size={20} style={{ color: "var(--hazard-deep)" }} />
                  <div className="fbt-display" style={{ fontSize: 18, lineHeight: 1.15, flex: 1 }}>{q.name}</div>
                </div>
                {q.address && <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10, display: "flex", alignItems: "flex-start", gap: 4 }}>
                  <MapPin size={11} style={{ flexShrink: 0, marginTop: 2 }} /> {q.address}
                </div>}

                {q.materials && q.materials.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--concrete)", paddingTop: 10 }}>
                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 6 }}>
                      {q.materials.length} MATERIAL{q.materials.length !== 1 ? "S" : ""}
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      {q.materials.slice(0, 4).map((m) => (
                        <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                          <span style={{ color: "var(--concrete)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 6 }}>{m.name}</span>
                          <strong style={{ color: "var(--hazard-deep)" }}>{fmt$(m.pricePerTon)}</strong>
                        </div>
                      ))}
                      {q.materials.length > 4 && (
                        <div style={{ fontSize: 11, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace" }}>+ {q.materials.length - 4} more</div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 12, display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                  {q.phone && (
                    <a href={`tel:${q.phone.replace(/[^\d+]/g, "")}`} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                      <Phone size={11} style={{ marginRight: 4 }} /> CALL
                    </a>
                  )}
                  {q.email && (
                    <a href={`mailto:${q.email}`} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                      <Mail size={11} style={{ marginRight: 4 }} /> EMAIL
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ========== REPORT HELPERS ==========
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const lastWeekRange = () => {
  const now = new Date();
  // Last week = Monday through Sunday, prior to this week
  const day = now.getDay(); // 0=Sun, 1=Mon
  const thisMon = new Date(now);
  thisMon.setDate(now.getDate() - ((day + 6) % 7));
  const lastMon = new Date(thisMon);
  lastMon.setDate(thisMon.getDate() - 7);
  const lastSun = new Date(lastMon);
  lastSun.setDate(lastMon.getDate() + 6);
  return { from: startOfDay(lastMon), to: endOfDay(lastSun) };
};
const thisWeekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const thisMon = new Date(now);
  thisMon.setDate(now.getDate() - ((day + 6) % 7));
  const thisSun = new Date(thisMon);
  thisSun.setDate(thisMon.getDate() + 6);
  return { from: startOfDay(thisMon), to: endOfDay(thisSun) };
};
const daysAgoRange = (days) => {
  const to = endOfDay(new Date());
  const from = startOfDay(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
  return { from, to };
};
const toISODate = (d) => d.toISOString().slice(0, 10);

// Core computation — returns a full report object
const computeReport = ({ from, to, dispatches, freightBills, logs, invoices, quotes, quarries, contacts }) => {
  const fromT = from.getTime();
  const toT = to.getTime();

  const inRange = (iso) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= fromT && t <= toT;
  };
  const inRangeDate = (ymd) => {
    if (!ymd) return false;
    const t = new Date(ymd + "T12:00:00").getTime();
    return t >= fromT && t <= toT;
  };

  // Dispatches opened in range
  const openedInRange = dispatches.filter((d) => inRange(d.createdAt) || inRangeDate(d.date));
  // Dispatches closed in range
  const closedInRange = dispatches.filter((d) => d.status === "closed" && inRange(d.updatedAt || d.createdAt));

  // Freight bills received in range
  const billsInRange = freightBills.filter((fb) => inRange(fb.submittedAt));

  // Total tonnage
  const totalTons = billsInRange.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);

  // Hours logs → revenue
  const logsInRange = logs.filter((l) => inRangeDate(l.date));
  const laborRevenue = logsInRange.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  // Top clients by tonnage (across all bills in range)
  const clientTons = {};
  billsInRange.forEach((fb) => {
    const d = dispatches.find((x) => x.id === fb.dispatchId);
    if (!d) return;
    const client = d.clientName || d.subContractor || "Internal / Unassigned";
    clientTons[client] = (clientTons[client] || 0) + (Number(fb.tonnage) || 0);
  });
  const topClients = Object.entries(clientTons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, tons]) => ({ name, tons }));

  // Top subs by dispatches opened
  const subCounts = {};
  openedInRange.forEach((d) => {
    if (d.subContractor) subCounts[d.subContractor] = (subCounts[d.subContractor] || 0) + 1;
  });
  const topSubs = Object.entries(subCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Quarry usage — total tons from each quarry
  const quarryTons = {};
  billsInRange.forEach((fb) => {
    const d = dispatches.find((x) => x.id === fb.dispatchId);
    if (!d || !d.quarryId) return;
    const q = quarries.find((qq) => qq.id === d.quarryId);
    const name = q?.name || "Unknown Quarry";
    quarryTons[name] = (quarryTons[name] || 0) + (Number(fb.tonnage) || 0);
  });
  const quarryUsage = Object.entries(quarryTons)
    .sort((a, b) => b[1] - a[1])
    .map(([name, tons]) => ({ name, tons }));

  // Quote requests
  const quotesInRange = quotes.filter((q) => inRange(q.submittedAt));

  // Invoices
  const invoicesInRange = invoices.filter((inv) => inRangeDate(inv.invoiceDate));
  const invoiceTotal = invoicesInRange.reduce((s, inv) => s + (Number(inv.total) || 0), 0);

  // Incomplete dispatches (opened or dated in range, but not all trucks accounted for)
  const incomplete = openedInRange.filter((d) => {
    const bills = freightBills.filter((fb) => fb.dispatchId === d.id);
    return d.status !== "closed" && bills.length < Number(d.trucksExpected || 0);
  }).map((d) => ({
    code: d.code,
    jobName: d.jobName,
    date: d.date,
    submitted: freightBills.filter((fb) => fb.dispatchId === d.id).length,
    expected: Number(d.trucksExpected || 0),
  }));

  return {
    from: toISODate(from),
    to: toISODate(to),
    generatedAt: new Date().toISOString(),
    openedCount: openedInRange.length,
    closedCount: closedInRange.length,
    billsCount: billsInRange.length,
    totalTons,
    logsCount: logsInRange.length,
    laborRevenue,
    topClients,
    topSubs,
    quarryUsage,
    quotesCount: quotesInRange.length,
    quotesList: quotesInRange.map((q) => ({ name: q.name, company: q.company, service: q.service, submittedAt: q.submittedAt })),
    invoicesCount: invoicesInRange.length,
    invoiceTotal,
    invoicesList: invoicesInRange.map((i) => ({ num: i.invoiceNumber, billTo: i.billToName, total: i.total, date: i.invoiceDate })),
    incomplete,
  };
};

// HTML report for print-to-PDF
const openReportPrintWindow = (report, company, onToast) => {
  const esc = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

  const rangeLabel = `${report.from} → ${report.to}`;
  const logoHtml = company?.logoDataUrl ? `<img src="${company.logoDataUrl}" class="logo" />` : "";

  const section = (title, bodyHtml) => `<div class="section"><h2>${esc(title)}</h2>${bodyHtml}</div>`;

  const metricsHtml = `
    <div class="metrics">
      <div class="metric"><div class="num">${report.openedCount}</div><div class="lbl">Opened</div></div>
      <div class="metric"><div class="num">${report.closedCount}</div><div class="lbl">Closed</div></div>
      <div class="metric"><div class="num">${report.billsCount}</div><div class="lbl">Freight Bills</div></div>
      <div class="metric"><div class="num">${report.totalTons.toFixed(1)}</div><div class="lbl">Total Tons</div></div>
      <div class="metric accent"><div class="num">${money(report.laborRevenue)}</div><div class="lbl">Labor Revenue</div></div>
      <div class="metric"><div class="num">${report.quotesCount}</div><div class="lbl">New Quotes</div></div>
      <div class="metric"><div class="num">${report.invoicesCount}</div><div class="lbl">Invoices</div></div>
      <div class="metric accent"><div class="num">${money(report.invoiceTotal)}</div><div class="lbl">Invoiced</div></div>
    </div>`;

  const listTable = (rows, cols) => rows.length === 0
    ? `<div class="empty">Nothing in this range.</div>`
    : `<table><thead><tr>${cols.map((c) => `<th${c.r ? ' class="r"' : ""}>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td${c.r ? ' class="r"' : ""}>${esc(c.fmt ? c.fmt(r[c.key]) : r[c.key])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Weekly Report ${rangeLabel}</title>
<style>
  @page { margin: 0.5in; size: letter; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px; font-family: -apple-system, Arial, sans-serif; color: #1C1917; font-size: 10.5pt; }
  .hazard-top { height: 8px; background: #F59E0B; margin: -20px -20px 0; }
  .steel-top { height: 2px; background: #1C1917; margin: 0 -20px 22px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 24px; }
  .logo { width: 60px; height: 60px; object-fit: contain; border: 2px solid #1C1917; background: #FFF; }
  h1 { font-size: 26pt; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 4px; }
  .subtitle { font-family: Menlo, Consolas, monospace; font-size: 10pt; color: #D97706; letter-spacing: 0.12em; margin-bottom: 8px; }
  .meta { font-family: Menlo, monospace; font-size: 9pt; color: #44403C; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 28px; }
  .metric { border: 2px solid #1C1917; padding: 10px 12px; background: #FAFAF9; }
  .metric.accent { background: #F59E0B; }
  .metric .num { font-size: 20pt; font-weight: 900; letter-spacing: -0.02em; line-height: 1; }
  .metric .lbl { font-family: Menlo, monospace; font-size: 8pt; color: #44403C; letter-spacing: 0.1em; margin-top: 4px; text-transform: uppercase; }
  .section { margin-bottom: 24px; page-break-inside: avoid; }
  h2 { font-size: 11pt; letter-spacing: 0.05em; margin: 0 0 10px; font-weight: 900; border-bottom: 2px solid #1C1917; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  table th { background: #1C1917; color: #F59E0B; text-align: left; padding: 6px 8px; font-size: 8pt; letter-spacing: 0.08em; font-weight: 700; }
  table th.r, table td.r { text-align: right; }
  table td { padding: 6px 8px; border-bottom: 1px solid #E7E5E4; }
  tbody tr:nth-child(odd) td { background: #FAFAF9; }
  .empty { font-family: Menlo, monospace; font-size: 9pt; color: #78716C; padding: 12px; text-align: center; background: #F5F5F4; border: 1px dashed #A8A29E; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 2px solid #1C1917; font-family: Menlo, monospace; font-size: 8pt; color: #44403C; letter-spacing: 0.08em; display: flex; justify-content: space-between; }
  .btn-print { position: fixed; top: 10px; right: 10px; padding: 12px 20px; background: #F59E0B; color: #1C1917; border: 3px solid #1C1917; font-weight: 900; cursor: pointer; font-size: 11pt; letter-spacing: 0.06em; box-shadow: 4px 4px 0 #1C1917; }
  .instructions { background: #FEF3C7; border: 2px solid #F59E0B; padding: 10px 14px; margin-bottom: 18px; font-size: 10pt; color: #44403C; }
  @media print { .btn-print, .instructions { display: none; } body { padding: 0; } }
</style></head>
<body>
<button class="btn-print" onclick="window.print()">🖨 PRINT / SAVE AS PDF</button>
<div class="instructions"><strong>📋 How to save as PDF:</strong> Tap PRINT. In the print dialog, change destination to <strong>"Save as PDF"</strong> (desktop) or <strong>"Save to Files"</strong> (mobile).</div>
<div class="hazard-top"></div>
<div class="steel-top"></div>
<div class="header">
  <div style="display:flex; gap:14px; align-items:flex-start;">
    ${logoHtml}
    <div>
      <div class="subtitle">▸ WEEKLY SUMMARY REPORT</div>
      <h1>${esc(company?.name || "4 Brothers Trucking, LLC").toUpperCase()}</h1>
      <div class="meta">${esc(rangeLabel)}  ·  GENERATED ${new Date(report.generatedAt).toLocaleString()}</div>
    </div>
  </div>
</div>
${metricsHtml}
${section("Top Clients by Tonnage", listTable(report.topClients, [{ key: "name", label: "Client" }, { key: "tons", label: "Tons", r: true, fmt: (v) => v.toFixed(2) }]))}
${section("Top Sub-Contractors by Dispatches", listTable(report.topSubs, [{ key: "name", label: "Sub-Contractor" }, { key: "count", label: "Dispatches", r: true }]))}
${section("Quarry Usage", listTable(report.quarryUsage, [{ key: "name", label: "Quarry" }, { key: "tons", label: "Tons Sourced", r: true, fmt: (v) => v.toFixed(2) }]))}
${section("New Quote Requests", listTable(report.quotesList, [{ key: "name", label: "Name" }, { key: "company", label: "Company" }, { key: "service", label: "Service" }, { key: "submittedAt", label: "Received", fmt: (v) => v ? new Date(v).toLocaleDateString() : "—" }]))}
${section("Invoices Generated", listTable(report.invoicesList, [{ key: "num", label: "Invoice #" }, { key: "billTo", label: "Bill To" }, { key: "date", label: "Date" }, { key: "total", label: "Total", r: true, fmt: (v) => money(v) }]))}
${section(`Incomplete Dispatches (${report.incomplete.length})`, report.incomplete.length === 0 ? `<div class="empty" style="color:#65A30D;">✓ All dispatches complete!</div>` : listTable(report.incomplete, [{ key: "code", label: "Code" }, { key: "jobName", label: "Job" }, { key: "date", label: "Date" }, { key: "submitted", label: "Submitted", r: true }, { key: "expected", label: "Expected", r: true }]))}
<div class="footer"><span>${esc(company?.name || "4 Brothers Trucking, LLC")}</span><span>WEEKLY REPORT · ${esc(rangeLabel)}</span></div>
</body></html>`;

  const w = window.open("", "_blank", "width=850,height=1100");
  if (!w) { onToast?.("ALLOW POPUPS TO GENERATE REPORT"); return; }
  w.document.write(html);
  w.document.close();
  onToast?.("REPORT OPENED — HIT PRINT TO SAVE");
};

const downloadReportCSV = (report) => {
  const lines = [];
  const push = (row) => lines.push(row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","));

  push(["Weekly Summary Report"]);
  push(["Date Range", `${report.from} to ${report.to}`]);
  push(["Generated", new Date(report.generatedAt).toLocaleString()]);
  push([]);
  push(["METRIC", "VALUE"]);
  push(["Dispatches Opened", report.openedCount]);
  push(["Dispatches Closed", report.closedCount]);
  push(["Freight Bills Received", report.billsCount]);
  push(["Total Tonnage", report.totalTons.toFixed(2)]);
  push(["Hours Logs", report.logsCount]);
  push(["Labor Revenue", report.laborRevenue.toFixed(2)]);
  push(["New Quote Requests", report.quotesCount]);
  push(["Invoices Generated", report.invoicesCount]);
  push(["Total Invoiced", report.invoiceTotal.toFixed(2)]);
  push(["Incomplete Dispatches", report.incomplete.length]);
  push([]);

  push(["TOP CLIENTS BY TONNAGE"]);
  push(["Client", "Tons"]);
  report.topClients.forEach((c) => push([c.name, c.tons.toFixed(2)]));
  push([]);

  push(["TOP SUB-CONTRACTORS"]);
  push(["Sub-Contractor", "Dispatches"]);
  report.topSubs.forEach((s) => push([s.name, s.count]));
  push([]);

  push(["QUARRY USAGE"]);
  push(["Quarry", "Tons Sourced"]);
  report.quarryUsage.forEach((q) => push([q.name, q.tons.toFixed(2)]));
  push([]);

  push(["QUOTE REQUESTS"]);
  push(["Name", "Company", "Service", "Received"]);
  report.quotesList.forEach((q) => push([q.name, q.company || "", q.service, q.submittedAt ? new Date(q.submittedAt).toLocaleDateString() : ""]));
  push([]);

  push(["INVOICES"]);
  push(["Invoice #", "Bill To", "Date", "Total"]);
  report.invoicesList.forEach((i) => push([i.num, i.billTo, i.date, Number(i.total).toFixed(2)]));
  push([]);

  push(["INCOMPLETE DISPATCHES"]);
  push(["Code", "Job", "Date", "Submitted", "Expected"]);
  report.incomplete.forEach((d) => push([d.code, d.jobName, d.date, d.submitted, d.expected]));

  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `4brothers-report-${report.from}-to-${report.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ========== REPORTS TAB ==========
// ========== FREIGHT BILL SEARCH PANEL ==========
const FBSearchPanel = ({ freightBills, dispatches, contacts, projects, editFreightBill, onToast, company }) => {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const customers = contacts.filter((c) => c.type === "customer");

  // Projects filtered by selected customer
  const availableProjects = useMemo(() => {
    if (!customerId) return projects;
    return projects.filter((p) => String(p.customerId) === String(customerId));
  }, [projects, customerId]);

  // If customer changes, reset project if it doesn't belong
  useEffect(() => {
    if (customerId && projectId) {
      const match = availableProjects.find((p) => String(p.id) === String(projectId));
      if (!match) setProjectId("");
    }
  }, [customerId, projectId, availableProjects]);

  const hasAnyFilter = search.trim() || fromDate || toDate || customerId || projectId || statusFilter !== "all";

  const results = useMemo(() => {
    if (!hasAnyFilter) return [];
    let list = freightBills.slice();

    // Status filter
    if (statusFilter !== "all") list = list.filter((fb) => (fb.status || "pending") === statusFilter);

    // Date range — on submitted_at
    if (fromDate) list = list.filter((fb) => (fb.submittedAt || "").slice(0, 10) >= fromDate);
    if (toDate) list = list.filter((fb) => (fb.submittedAt || "").slice(0, 10) <= toDate);

    // Customer / project filter — via the linked order
    if (customerId || projectId) {
      list = list.filter((fb) => {
        const d = dispatches.find((x) => x.id === fb.dispatchId);
        if (!d) return false;
        if (customerId && String(d.clientId) !== String(customerId)) return false;
        if (projectId && String(d.projectId) !== String(projectId)) return false;
        return true;
      });
    }

    // Text search — FB#, driver name, truck #, job name, order code
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((fb) => {
        const d = dispatches.find((x) => x.id === fb.dispatchId);
        const hay = `${fb.freightBillNumber || ""} ${fb.driverName || ""} ${fb.truckNumber || ""} ${fb.material || ""} ${fb.description || ""} ${fb.notes || ""} ${fb.adminNotes || ""} ${d?.jobName || ""} ${d?.code || ""} ${d?.clientName || ""}`.toLowerCase();
        return hay.includes(s);
      });
    }

    return list.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  }, [hasAnyFilter, freightBills, dispatches, search, fromDate, toDate, customerId, projectId, statusFilter]);

  const resetFilters = () => {
    setSearch(""); setFromDate(""); setToDate("");
    setCustomerId(""); setProjectId(""); setStatusFilter("all");
  };

  // Quick date presets
  const setPreset = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setFromDate(from.toISOString().slice(0, 10));
    setToDate(to.toISOString().slice(0, 10));
  };

  // CSV export
  const exportCSV = () => {
    if (results.length === 0) { onToast("NO RESULTS TO EXPORT"); return; }
    const rows = [
      ["FB #", "Submitted", "Status", "Driver", "Truck", "Material", "Tonnage", "Loads", "Hours", "Order #", "Job", "Customer", "Description"],
    ];
    results.forEach((fb) => {
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      const customer = contacts.find((c) => c.id === d?.clientId);
      rows.push([
        fb.freightBillNumber || "",
        fb.submittedAt ? new Date(fb.submittedAt).toLocaleString() : "",
        fb.status || "pending",
        fb.driverName || "",
        fb.truckNumber || "",
        fb.material || "",
        fb.tonnage || "",
        fb.loadCount || "",
        fb.hoursBilled || "",
        d?.code || "",
        d?.jobName || "",
        customer?.companyName || d?.clientName || "",
        fb.description || "",
      ]);
    });
    const csv = rows.map((r) => r.map((v) => {
      const s = String(v).replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fb-search-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`EXPORTED ${results.length} ROWS`);
  };

  // Print-to-PDF view (opens new window)
  const printReport = () => {
    if (results.length === 0) { onToast("NO RESULTS TO PRINT"); return; }
    const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const now = new Date().toLocaleString();
    const totalTons = results.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
    const totalHours = results.reduce((s, fb) => s + (Number(fb.hoursBilled) || 0), 0);
    const totalLoads = results.reduce((s, fb) => s + (Number(fb.loadCount) || 0), 0);

    const rows = results.map((fb) => {
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      const customer = contacts.find((c) => c.id === d?.clientId);
      const photos = (fb.photos || []).slice(0, 3).map((p) => `<img src="${p.dataUrl}" style="width:60px;height:60px;object-fit:cover;border:1px solid #ccc;margin-right:3px;" />`).join("");
      return `
        <tr>
          <td>${esc(fb.freightBillNumber)}</td>
          <td>${fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : ""}</td>
          <td>${esc(fb.status)}</td>
          <td>${esc(fb.driverName)}</td>
          <td>${esc(fb.truckNumber)}</td>
          <td>${esc(d?.code)}</td>
          <td>${esc(d?.jobName)}</td>
          <td>${esc(customer?.companyName || d?.clientName)}</td>
          <td style="text-align:right;">${fb.tonnage || ""}</td>
          <td style="text-align:right;">${fb.hoursBilled || ""}</td>
          <td>${photos}</td>
        </tr>
      `;
    }).join("");

    const html = `<!doctype html><html><head><title>Freight Bill Search Report</title>
      <style>
        body{font-family:Arial,sans-serif;margin:20px;color:#1C1917;}
        h1{font-size:18px;margin:0 0 6px;}
        .sub{color:#666;font-size:11px;margin-bottom:14px;}
        table{width:100%;border-collapse:collapse;font-size:11px;}
        th,td{border:1px solid #ccc;padding:5px 6px;text-align:left;vertical-align:top;}
        th{background:#1C1917;color:#FAFAF9;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;}
        tr:nth-child(even) td{background:#F5F5F4;}
        .totals{margin-top:12px;padding:10px;background:#FEF3C7;border:2px solid #F59E0B;font-size:12px;}
        .filters{margin-bottom:12px;padding:8px;background:#F5F5F4;font-size:11px;}
        @media print{body{margin:10px;} th{background:#333;}}
      </style></head><body>
      <h1>${esc(company?.name || "4 Brothers Trucking, LLC")} — Freight Bill Report</h1>
      <div class="sub">Generated ${now} · ${results.length} records</div>
      <div class="filters">
        <strong>Filters:</strong>
        ${search ? ` Search="${esc(search)}"` : ""}
        ${fromDate ? ` From=${esc(fromDate)}` : ""}
        ${toDate ? ` To=${esc(toDate)}` : ""}
        ${customerId ? ` Customer=${esc(customers.find(c => String(c.id) === String(customerId))?.companyName || "")}` : ""}
        ${projectId ? ` Project=${esc(projects.find(p => String(p.id) === String(projectId))?.name || "")}` : ""}
        ${statusFilter !== "all" ? ` Status=${esc(statusFilter)}` : ""}
      </div>
      <table>
        <thead>
          <tr><th>FB #</th><th>Date</th><th>Status</th><th>Driver</th><th>Truck</th><th>Order</th><th>Job</th><th>Customer</th><th>Tons</th><th>Hrs</th><th>Photos</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <strong>Totals:</strong> ${results.length} freight bills · ${totalTons.toFixed(2)} tons · ${totalHours.toFixed(2)} hours · ${totalLoads} loads
      </div>
      </body></html>`;
    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) { onToast("POP-UP BLOCKED"); return; }
    w.document.write(html);
    w.document.close();
    onToast("REPORT OPENED — PRINT OR SAVE AS PDF");
  };

  // Download FULL PACKET — one full page per FB with full-size photos
  const downloadPacket = () => {
    if (results.length === 0) { onToast("NO RESULTS"); return; }
    const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const now = new Date().toLocaleString();
    const totalTons = results.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
    const totalHours = results.reduce((s, fb) => s + (Number(fb.hoursBilled) || 0), 0);
    const totalLoads = results.reduce((s, fb) => s + (Number(fb.loadCount) || 0), 0);

    // Build filter summary
    const filterSummary = [];
    if (fromDate) filterSummary.push(`From ${fromDate}`);
    if (toDate) filterSummary.push(`To ${toDate}`);
    if (customerId) {
      const c = customers.find((x) => String(x.id) === String(customerId));
      if (c) filterSummary.push(`Customer: ${c.companyName}`);
    }
    if (projectId) {
      const p = projects.find((x) => String(x.id) === String(projectId));
      if (p) filterSummary.push(`Project: ${p.name}`);
    }
    if (search) filterSummary.push(`Search: "${search}"`);
    if (statusFilter !== "all") filterSummary.push(`Status: ${statusFilter}`);

    // Cover page
    const coverHtml = `
      <div class="page cover">
        <div class="letterhead">
          <h1>${esc(company?.name || "4 Brothers Trucking, LLC")}</h1>
          <div class="sub">${esc(company?.address || "Bay Point, CA")}${company?.phone ? ` · ${esc(company.phone)}` : ""}</div>
        </div>
        <h2>FREIGHT BILL PACKET</h2>
        <div class="meta">
          <div><strong>Generated:</strong> ${esc(now)}</div>
          <div><strong>Records:</strong> ${results.length} freight bill${results.length !== 1 ? "s" : ""}</div>
          ${filterSummary.length > 0 ? `<div><strong>Filters:</strong> ${esc(filterSummary.join(" · "))}</div>` : ""}
        </div>
        <div class="totals-box">
          <div class="totals-row"><span>Total Tons</span><strong>${totalTons.toFixed(2)}</strong></div>
          <div class="totals-row"><span>Total Loads</span><strong>${totalLoads}</strong></div>
          <div class="totals-row"><span>Total Hours</span><strong>${totalHours.toFixed(2)}</strong></div>
        </div>

        <h3>Index</h3>
        <table class="index">
          <thead><tr><th>#</th><th>FB #</th><th>Date</th><th>Driver · Truck</th><th>Order / Job</th><th>Customer</th><th>Tons</th><th>Hrs</th><th>Status</th></tr></thead>
          <tbody>
            ${results.map((fb, idx) => {
              const d = dispatches.find((x) => x.id === fb.dispatchId);
              const customer = contacts.find((c) => c.id === d?.clientId);
              return `<tr>
                <td>${idx + 1}</td>
                <td>${esc(fb.freightBillNumber) || "—"}</td>
                <td>${fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : ""}</td>
                <td>${esc(fb.driverName || "—")}${fb.truckNumber ? ` · T${esc(fb.truckNumber)}` : ""}</td>
                <td>${esc(d?.code || "")} — ${esc(d?.jobName || "")}</td>
                <td>${esc(customer?.companyName || d?.clientName || "")}</td>
                <td style="text-align:right;">${fb.tonnage || ""}</td>
                <td style="text-align:right;">${fb.hoursBilled || ""}</td>
                <td>${esc(fb.status || "pending")}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    // One page per FB with full-size photos
    const fbPages = results.map((fb, idx) => {
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      const customer = contacts.find((c) => c.id === d?.clientId);
      const project = projects.find((p) => p.id === d?.projectId);
      const photos = fb.photos || [];
      const hrsDisplay = fb.hoursBilled || (fb.pickupTime && fb.dropoffTime ? `${fb.pickupTime}→${fb.dropoffTime}` : "—");
      return `
        <div class="page fb-page">
          <div class="fb-header">
            <div class="fb-num">FREIGHT BILL #${esc(fb.freightBillNumber) || "—"}</div>
            <div class="fb-status status-${esc(fb.status || "pending")}">${esc((fb.status || "pending").toUpperCase())}</div>
            <div class="fb-seq">Page ${idx + 2} / ${results.length + 1}</div>
          </div>
          <div class="fb-grid">
            <div class="fb-field"><span>DATE</span><strong>${fb.submittedAt ? new Date(fb.submittedAt).toLocaleString() : "—"}</strong></div>
            <div class="fb-field"><span>DRIVER</span><strong>${esc(fb.driverName || "—")}</strong></div>
            <div class="fb-field"><span>TRUCK #</span><strong>${esc(fb.truckNumber || "—")}</strong></div>
            <div class="fb-field"><span>MATERIAL</span><strong>${esc(fb.material || "—")}</strong></div>
            <div class="fb-field"><span>TONNAGE</span><strong>${fb.tonnage ? `${fb.tonnage}T` : "—"}</strong></div>
            <div class="fb-field"><span>LOADS</span><strong>${fb.loadCount || 1}</strong></div>
            <div class="fb-field"><span>HOURS</span><strong>${esc(String(hrsDisplay))}</strong></div>
            <div class="fb-field"><span>PICKUP → DROPOFF</span><strong>${esc(fb.pickupTime || "—")} → ${esc(fb.dropoffTime || "—")}</strong></div>
            <div class="fb-field wide"><span>ORDER</span><strong>#${esc(d?.code || "—")} — ${esc(d?.jobName || "—")}</strong></div>
            <div class="fb-field wide"><span>CUSTOMER</span><strong>${esc(customer?.companyName || d?.clientName || "—")}</strong></div>
            ${project ? `<div class="fb-field wide"><span>PROJECT</span><strong>${esc(project.name)}${project.contractNumber ? ` (${esc(project.contractNumber)})` : ""}</strong></div>` : ""}
            ${d?.pickup ? `<div class="fb-field wide"><span>PICKUP LOC</span><strong>${esc(d.pickup)}</strong></div>` : ""}
            ${d?.dropoff ? `<div class="fb-field wide"><span>DROPOFF LOC</span><strong>${esc(d.dropoff)}</strong></div>` : ""}
          </div>
          ${fb.description ? `<div class="fb-desc"><div class="label">DESCRIPTION</div>${esc(fb.description)}</div>` : ""}
          ${fb.notes ? `<div class="fb-desc"><div class="label">DRIVER NOTES</div>${esc(fb.notes)}</div>` : ""}
          ${fb.adminNotes ? `<div class="fb-desc admin"><div class="label">ADMIN NOTES</div>${esc(fb.adminNotes)}</div>` : ""}
          ${photos.length > 0 ? `
            <div class="fb-photos-header">SCALE TICKETS (${photos.length})</div>
            <div class="fb-photos">
              ${photos.map((p, pidx) => `
                <div class="photo-wrap">
                  <img src="${p.dataUrl}" alt="Scale ticket ${pidx + 1}" />
                  <div class="photo-caption">Ticket ${pidx + 1} of ${photos.length}</div>
                </div>
              `).join("")}
            </div>
          ` : '<div class="no-photos">No scale tickets attached</div>'}
          <div class="fb-footer">
            ${esc(company?.name || "4 Brothers Trucking, LLC")} · FB #${esc(fb.freightBillNumber) || "—"} · ${fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : ""}
          </div>
        </div>
      `;
    }).join("");

    const html = `<!doctype html><html><head><title>FB Packet — ${esc(now)}</title>
      <style>
        @page { size: letter; margin: 0.5in; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #1C1917; }
        .page { page-break-after: always; padding: 0; }
        .page:last-child { page-break-after: auto; }

        /* Cover */
        .cover { padding: 20px 0; }
        .letterhead { border-bottom: 3px solid #F59E0B; padding-bottom: 10px; margin-bottom: 20px; }
        .letterhead h1 { font-size: 22px; margin: 0; letter-spacing: 0.02em; }
        .letterhead .sub { font-size: 11px; color: #666; margin-top: 4px; }
        .cover h2 { font-size: 28px; margin: 0 0 14px; color: #1C1917; letter-spacing: 0.05em; }
        .meta { font-size: 12px; line-height: 1.7; padding: 10px 14px; background: #F5F5F4; margin-bottom: 14px; }
        .totals-box { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .totals-row { padding: 12px; background: #FEF3C7; border: 2px solid #F59E0B; text-align: center; font-size: 11px; text-transform: uppercase; }
        .totals-row strong { display: block; font-size: 22px; color: #1C1917; margin-top: 4px; }
        .cover h3 { font-size: 14px; margin: 10px 0; border-bottom: 2px solid #1C1917; padding-bottom: 4px; }
        .index { width: 100%; border-collapse: collapse; font-size: 10px; }
        .index th, .index td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
        .index th { background: #1C1917; color: #FAFAF9; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
        .index tr:nth-child(even) td { background: #F5F5F4; }

        /* FB page */
        .fb-page { display: flex; flex-direction: column; min-height: 10in; }
        .fb-header { border-bottom: 3px solid #F59E0B; padding-bottom: 8px; margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }
        .fb-num { font-size: 20px; font-weight: 700; letter-spacing: 0.02em; flex: 1; }
        .fb-status { padding: 4px 10px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; border: 2px solid #1C1917; }
        .fb-status.status-approved { background: #16A34A; color: #FFF; border-color: #16A34A; }
        .fb-status.status-pending { background: #F59E0B; color: #1C1917; }
        .fb-status.status-rejected { background: #DC2626; color: #FFF; border-color: #DC2626; }
        .fb-seq { font-size: 10px; color: #999; }
        .fb-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 14px; }
        .fb-field { padding: 6px 10px; background: #F5F5F4; border-left: 3px solid #1C1917; }
        .fb-field.wide { grid-column: 1 / -1; }
        .fb-field span { display: block; font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
        .fb-field strong { font-size: 12px; display: block; margin-top: 2px; }
        .fb-desc { padding: 10px 12px; background: #FEF3C7; border-left: 3px solid #F59E0B; margin-bottom: 10px; font-size: 12px; white-space: pre-wrap; }
        .fb-desc.admin { background: #FFEDD5; border-color: #EA580C; }
        .fb-desc .label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
        .fb-photos-header { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 14px 0 8px; border-bottom: 2px solid #1C1917; padding-bottom: 4px; }
        .fb-photos { display: flex; flex-direction: column; gap: 10px; }
        .photo-wrap { page-break-inside: avoid; border: 2px solid #1C1917; padding: 4px; background: #FFF; }
        .photo-wrap img { width: 100%; max-height: 7in; object-fit: contain; display: block; }
        .photo-caption { font-size: 10px; color: #666; text-align: center; padding: 4px; background: #F5F5F4; }
        .no-photos { padding: 20px; text-align: center; background: #F5F5F4; color: #999; font-size: 12px; border: 2px dashed #ccc; }
        .fb-footer { margin-top: auto; padding-top: 10px; border-top: 1px solid #ccc; font-size: 9px; color: #999; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; }

        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .fb-header { border-bottom-color: #F59E0B !important; }
        }
        .print-btn { position: fixed; top: 10px; right: 10px; padding: 10px 20px; background: #F59E0B; color: #1C1917; border: 3px solid #1C1917; font-weight: 700; cursor: pointer; z-index: 100; font-size: 14px; }
        @media print { .print-btn { display: none; } }
      </style></head><body>
      <button class="print-btn" onclick="window.print()">🖨 PRINT / SAVE AS PDF</button>
      ${coverHtml}
      ${fbPages}
      </body></html>`;

    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) { onToast("POP-UP BLOCKED — ALLOW POPUPS & RETRY"); return; }
    w.document.write(html);
    w.document.close();
    onToast(`PACKET OPENED — ${results.length} FB${results.length !== 1 ? "S" : ""} · HIT PRINT TO SAVE PDF`);
  };

  return (
    <div className="fbt-card" style={{ padding: 0, overflow: "hidden" }}>
      {editing && (
        <FBEditModal
          fb={editing}
          dispatches={dispatches}
          contacts={contacts}
          projects={projects}
          editFreightBill={editFreightBill}
          invoices={invoices}
          onClose={() => setEditing(null)}
          onToast={onToast}
          currentUser="admin"
        />
      )}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "zoom-out" }}>
          <img src={lightbox} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} alt="" />
        </div>
      )}

      {/* Header */}
      <div
        style={{
          padding: "14px 20px", background: "var(--steel)", color: "var(--cream)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Search size={18} />
          <div>
            <div className="fbt-display" style={{ fontSize: 16, lineHeight: 1 }}>SEARCH FREIGHT BILLS</div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", marginTop: 2, letterSpacing: "0.1em" }}>
              ▸ BY FB# · DATE · CUSTOMER · PROJECT · STATUS — WITH PHOTOS
            </div>
          </div>
        </div>
        <ChevronDown size={18} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </div>

      {expanded && (
        <div style={{ padding: 20 }}>
          {/* Filters */}
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
              <input
                className="fbt-input"
                style={{ paddingLeft: 38 }}
                placeholder="Search FB#, driver, truck, job name, order code, description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <div>
                <label className="fbt-label">From</label>
                <input className="fbt-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="fbt-label">To</label>
                <input className="fbt-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div>
                <label className="fbt-label">Customer</label>
                <select className="fbt-select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">— All —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="fbt-label">Project</label>
                <select className="fbt-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">— All —</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="fbt-label">Status</label>
                <select className="fbt-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Quick presets */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>QUICK:</span>
              <button onClick={() => setPreset(7)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>LAST 7D</button>
              <button onClick={() => setPreset(14)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>LAST 14D</button>
              <button onClick={() => setPreset(30)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>LAST 30D</button>
              <button onClick={() => setPreset(90)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>LAST 90D</button>
              {hasAnyFilter && (
                <button onClick={resetFilters} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10, marginLeft: "auto", color: "var(--safety)" }}>
                  <X size={11} style={{ marginRight: 3 }} /> CLEAR ALL
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {!hasAnyFilter ? (
            <div style={{ marginTop: 20, padding: 32, textAlign: "center", background: "#F5F5F4", border: "2px dashed var(--concrete)" }}>
              <Search size={32} style={{ opacity: 0.4, marginBottom: 8, color: "var(--concrete)" }} />
              <div className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)" }}>
                ENTER A SEARCH TERM OR PICK A FILTER TO SEE RESULTS
              </div>
            </div>
          ) : (
            <>
              {/* Result summary + exports */}
              <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "10px 14px", background: "var(--hazard)", color: "var(--steel)" }}>
                <div className="fbt-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                  ▸ {results.length} FREIGHT BILL{results.length !== 1 ? "S" : ""}
                  {results.length > 0 && ` · ${results.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0).toFixed(1)}T · ${results.reduce((s, fb) => s + (Number(fb.hoursBilled) || 0), 0).toFixed(1)}HRS`}
                </div>
                {results.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={exportCSV} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10, background: "var(--steel)", color: "var(--cream)", borderColor: "var(--steel)" }}>
                      <Download size={11} style={{ marginRight: 3 }} /> CSV
                    </button>
                    <button onClick={printReport} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10, background: "var(--steel)", color: "var(--cream)", borderColor: "var(--steel)" }}>
                      <Printer size={11} style={{ marginRight: 3 }} /> SUMMARY PDF
                    </button>
                    <button onClick={downloadPacket} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10, background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }} title="Full packet: one page per FB with full-size scale tickets">
                      <FileDown size={11} style={{ marginRight: 3 }} /> FULL PACKET PDF
                    </button>
                  </div>
                )}
              </div>

              {results.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--concrete)", background: "#F5F5F4" }}>
                  <div className="fbt-mono" style={{ fontSize: 12 }}>NO FREIGHT BILLS MATCH YOUR FILTERS</div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {results.map((fb) => {
                    const d = dispatches.find((x) => x.id === fb.dispatchId);
                    const customer = contacts.find((c) => c.id === d?.clientId);
                    const status = fb.status || "pending";
                    const statusBg = status === "approved" ? "var(--good)" : status === "rejected" ? "var(--safety)" : "var(--hazard)";
                    const photos = fb.photos || [];
                    return (
                      <div
                        key={fb.id}
                        style={{
                          padding: 12, border: "1.5px solid var(--steel)", background: "#FFF",
                          borderLeft: `4px solid ${statusBg}`,
                          display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{ flex: 1, minWidth: 200, cursor: "pointer" }}
                          onClick={() => setEditing(fb)}
                        >
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                            <span className="chip" style={{ background: statusBg, color: "#FFF", fontSize: 9, padding: "2px 7px" }}>
                              {status.toUpperCase()}
                            </span>
                            <span className="chip" style={{ background: "var(--hazard)", fontSize: 9, padding: "2px 7px" }}>
                              FB #{fb.freightBillNumber || "—"}
                            </span>
                            {d && <span className="chip" style={{ background: "#FFF", fontSize: 9, padding: "2px 7px" }}>ORDER #{d.code}</span>}
                            <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
                              {fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                          <div className="fbt-display" style={{ fontSize: 14, lineHeight: 1.2 }}>
                            {fb.driverName || "—"} · Truck {fb.truckNumber || "—"}
                          </div>
                          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 3 }}>
                            {d?.jobName || ""}
                            {customer && ` · ${customer.companyName}`}
                          </div>
                          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--steel)", marginTop: 3, fontWeight: 700 }}>
                            {fb.tonnage ? `${fb.tonnage}T` : ""}
                            {fb.loadCount ? ` · ${fb.loadCount} LOAD${fb.loadCount !== 1 ? "S" : ""}` : ""}
                            {fb.hoursBilled ? ` · ${fb.hoursBilled}HRS` : fb.pickupTime && fb.dropoffTime ? ` · ${fb.pickupTime}→${fb.dropoffTime}` : ""}
                            {fb.material ? ` · ${fb.material}` : ""}
                          </div>
                          {fb.description && (
                            <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 4, fontStyle: "italic" }}>"{fb.description}"</div>
                          )}
                        </div>

                        {/* Photo thumbnails */}
                        {photos.length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                            {photos.slice(0, 4).map((p, idx) => (
                              <img
                                key={p.id || idx}
                                src={p.dataUrl}
                                alt=""
                                style={{ width: 56, height: 56, objectFit: "cover", border: "1px solid var(--steel)", cursor: "pointer" }}
                                onClick={(e) => { e.stopPropagation(); setLightbox(p.dataUrl); }}
                              />
                            ))}
                            {photos.length > 4 && (
                              <div
                                style={{
                                  width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center",
                                  background: "var(--steel)", color: "var(--cream)", fontSize: 12, fontWeight: 700,
                                  cursor: "pointer", fontFamily: "JetBrains Mono, monospace",
                                }}
                                onClick={() => setEditing(fb)}
                                title="Open to see all photos"
                              >
                                +{photos.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ========== REPORTS TAB ==========
// ========== FB ARCHIVE PDF (Reports tab) ==========
// Generate a PDF where each FB is one page with a compact metadata strip at top,
// and each scale ticket photo becomes its own linked page (with the same metadata strip).
// Filters: customer, project, date range, status (checkbox group).
// Include fields: user picks which fields appear in the metadata strip (localStorage persisted).

const FB_ARCHIVE_FIELD_DEFAULTS = {
  date: true, fbNumber: true, loads: true, tons: true,
  startTime: true, endTime: true, hours: false,
  driver: true, truck: true, description: true, notes: true,
  customer: false, pickup: false, dropoff: false,
};
const FB_ARCHIVE_STATUS_DEFAULTS = { pending: false, approved: true, invoiced: true, paid: true };
const FB_ARCHIVE_LS_KEY = "fbt:fbArchivePrefs";

const generateFBArchivePDF = async ({ fbs, dispatches, contacts, projects, company, fieldsInclude }) => {
  const esc = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  // Build metadata strip HTML for one FB — compact, ~40-60px tall, readable
  const stripHtml = (fb) => {
    const d = dispatches.find((x) => x.id === fb.dispatchId);
    const proj = projects.find((p) => p.id === d?.projectId);
    const customer = contacts.find((c) => c.id === d?.clientId);
    const hoursCalc = (() => {
      if (fb.pickupTime && fb.dropoffTime) {
        const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
        const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
        if (!isNaN(h1) && !isNaN(h2)) {
          const mins = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
          return mins > 0 ? (mins / 60).toFixed(2) : "";
        }
      }
      return fb.hoursBilled != null ? String(fb.hoursBilled) : "";
    })();

    const parts = [];
    // Row 1 — always shows core identifiers for linking to the FB
    if (fieldsInclude.date) parts.push(`<span class="kv"><b>DATE</b> ${esc(fmtDate(fb.submittedAt))}</span>`);
    if (fieldsInclude.fbNumber) parts.push(`<span class="kv"><b>FB #</b> ${esc(fb.freightBillNumber || "—")}</span>`);
    if (fieldsInclude.customer) parts.push(`<span class="kv"><b>CUSTOMER</b> ${esc(customer?.companyName || customer?.contactName || d?.clientName || "—")}</span>`);
    if (d?.code) parts.push(`<span class="kv"><b>ORDER</b> #${esc(d.code)}</span>`);
    if (proj?.name) parts.push(`<span class="kv"><b>PROJECT</b> ${esc(proj.name)}</span>`);
    if (fieldsInclude.driver) parts.push(`<span class="kv"><b>DRIVER</b> ${esc(fb.driverName || "—")}</span>`);
    if (fieldsInclude.truck) parts.push(`<span class="kv"><b>TRUCK</b> ${esc(fb.truckNumber || "—")}</span>`);
    if (fieldsInclude.startTime) parts.push(`<span class="kv"><b>IN</b> ${esc(fb.pickupTime || "—")}</span>`);
    if (fieldsInclude.endTime) parts.push(`<span class="kv"><b>OUT</b> ${esc(fb.dropoffTime || "—")}</span>`);
    if (fieldsInclude.hours && hoursCalc) parts.push(`<span class="kv"><b>HRS</b> ${esc(hoursCalc)}</span>`);
    if (fieldsInclude.tons && fb.tonnage) parts.push(`<span class="kv"><b>TONS</b> ${esc(String(fb.tonnage))}</span>`);
    if (fieldsInclude.loads && fb.loadCount) parts.push(`<span class="kv"><b>LOADS</b> ${esc(String(fb.loadCount))}</span>`);
    if (fieldsInclude.pickup && d?.pickup) parts.push(`<span class="kv"><b>FROM</b> ${esc(d.pickup)}</span>`);
    if (fieldsInclude.dropoff && d?.dropoff) parts.push(`<span class="kv"><b>TO</b> ${esc(d.dropoff)}</span>`);

    const description = fieldsInclude.description && (fb.description || fb.material)
      ? `<div class="desc"><b>DESCRIPTION:</b> ${esc(fb.description || fb.material || "")}</div>` : "";
    const notes = fieldsInclude.notes && fb.notes
      ? `<div class="notes"><b>NOTES:</b> ${esc(fb.notes)}</div>` : "";

    return `<div class="strip">
      <div class="kv-row">${parts.join("")}</div>
      ${description}
      ${notes}
    </div>`;
  };

  // Build pages. For each FB:
  //   1. A "summary page" = big strip + list of photo count
  //   2. One "photo page" per scale ticket photo (same strip + large image)
  const pagesHtml = fbs.map((fb) => {
    const photos = fb.photos || [];
    const summary = `
      <div class="page">
        ${stripHtml(fb)}
        <div class="photo-count">${photos.length} scale ticket${photos.length !== 1 ? "s" : ""} attached</div>
      </div>
    `;
    const photoPages = photos.map((p, i) => `
      <div class="page">
        ${stripHtml(fb)}
        <div class="photo-wrap">
          <img src="${p.dataUrl || p.url || ""}" alt="Scale ticket ${i + 1}" />
          <div class="photo-label">TICKET ${i + 1} OF ${photos.length}</div>
        </div>
      </div>
    `).join("");
    return summary + photoPages;
  }).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>FB Archive — ${esc(company?.name || "4 Brothers Trucking")}</title>
<style>
  @page { margin: 0.35in; size: letter; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 10px; font-family: -apple-system, Arial, sans-serif; color: #1C1917; font-size: 10pt; }
  .btn-print { position: fixed; top: 10px; right: 10px; padding: 12px 24px; background: #F59E0B; color: #1C1917; border: 3px solid #1C1917; font-weight: 900; cursor: pointer; font-size: 12pt; letter-spacing: 0.08em; box-shadow: 4px 4px 0 #1C1917; z-index: 1000; }
  .instructions { background: #FEF3C7; border: 2px solid #F59E0B; padding: 10px 14px; margin-bottom: 20px; font-size: 10pt; }
  .page { page-break-after: always; padding: 4px; min-height: 9.5in; display: flex; flex-direction: column; }
  .page:last-child { page-break-after: auto; }
  .strip { border: 2px solid #1C1917; background: #F5F5F4; padding: 8px 12px; margin-bottom: 10px; }
  .strip .kv-row { display: flex; flex-wrap: wrap; gap: 14px; font-size: 9.5pt; line-height: 1.4; }
  .strip .kv { white-space: nowrap; }
  .strip .kv b { color: #78716C; font-size: 7.5pt; letter-spacing: 0.08em; margin-right: 4px; }
  .strip .desc, .strip .notes { margin-top: 6px; font-size: 9pt; line-height: 1.4; padding-top: 5px; border-top: 1px dotted #A8A29E; }
  .strip .desc b, .strip .notes b { color: #78716C; font-size: 7.5pt; letter-spacing: 0.08em; margin-right: 4px; }
  .photo-count { color: #78716C; font-size: 9pt; letter-spacing: 0.08em; text-align: center; padding: 40px 0; font-style: italic; }
  .photo-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
  .photo-wrap img { max-width: 100%; max-height: 8.5in; object-fit: contain; border: 1.5px solid #1C1917; }
  .photo-label { font-family: Menlo, monospace; font-size: 8pt; color: #78716C; margin-top: 6px; letter-spacing: 0.1em; }
  .footer-summary { padding-top: 20px; border-top: 2px solid #1C1917; font-size: 8pt; color: #78716C; font-family: Menlo, monospace; letter-spacing: 0.08em; }
  @media print {
    .btn-print, .instructions { display: none; }
    body { padding: 0; }
  }
</style></head>
<body>
<button class="btn-print" onclick="window.print()">🖨 PRINT / SAVE AS PDF</button>
<div class="instructions">
  <strong>📋 FB Archive:</strong> ${fbs.length} freight bill${fbs.length !== 1 ? "s" : ""} · ${fbs.reduce((s, fb) => s + (fb.photos?.length || 0), 0)} scale ticket page${fbs.reduce((s, fb) => s + (fb.photos?.length || 0), 0) !== 1 ? "s" : ""}. Click PRINT then choose "Save as PDF".
</div>
${pagesHtml}
<div class="footer-summary">ARCHIVE GENERATED ${new Date().toLocaleString()} · ${esc(company?.name || "4 BROTHERS TRUCKING")} · ${fbs.length} FB${fbs.length !== 1 ? "S" : ""}</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Popup blocked. Please allow popups and try again."); return; }
  w.document.write(html);
  w.document.close();
};

const FBArchiveModal = ({ freightBills, dispatches, contacts, projects, company, onClose, onToast }) => {
  // Load saved prefs from localStorage
  const savedPrefs = (() => {
    try { return JSON.parse(localStorage.getItem(FB_ARCHIVE_LS_KEY) || "{}"); } catch { return {}; }
  })();

  const [fromDate, setFromDate] = useState(savedPrefs.fromDate || "");
  const [toDate, setToDate] = useState(savedPrefs.toDate || "");
  const [customerId, setCustomerId] = useState(savedPrefs.customerId || "");
  const [projectId, setProjectId] = useState(savedPrefs.projectId || "");
  const [statusFilter, setStatusFilter] = useState(savedPrefs.statusFilter || FB_ARCHIVE_STATUS_DEFAULTS);
  const [fieldsInclude, setFieldsInclude] = useState(savedPrefs.fieldsInclude || FB_ARCHIVE_FIELD_DEFAULTS);

  // Customers are contacts of type customer or broker
  const customerList = useMemo(() =>
    (contacts || []).filter((c) => c.type === "customer" || c.type === "broker")
      .sort((a, b) => (a.companyName || a.contactName || "").localeCompare(b.companyName || b.contactName || "")),
    [contacts]);

  // Matched FBs based on filters
  const matchedFbs = useMemo(() => {
    return (freightBills || []).filter((fb) => {
      const status = fb.status || "pending";
      const isInvoiced = !!fb.invoiceId;
      const isPaid = !!fb.paidAt || !!fb.customerPaidAt;
      if (status === "rejected") return false;
      // Status group mapping
      if (status === "pending" && !statusFilter.pending) return false;
      if (status === "approved" && !isInvoiced && !isPaid && !statusFilter.approved) return false;
      if (isInvoiced && !isPaid && !statusFilter.invoiced) return false;
      if (isPaid && !statusFilter.paid) return false;

      const fbDate = fb.submittedAt ? fb.submittedAt.slice(0, 10) : "";
      if (fromDate && fbDate < fromDate) return false;
      if (toDate && fbDate > toDate) return false;

      const d = dispatches.find((x) => x.id === fb.dispatchId);
      if (customerId && String(d?.clientId) !== String(customerId)) return false;
      if (projectId && String(d?.projectId) !== String(projectId)) return false;

      return true;
    }).sort((a, b) => (a.submittedAt || "").localeCompare(b.submittedAt || ""));
  }, [freightBills, dispatches, statusFilter, fromDate, toDate, customerId, projectId]);

  const totalPhotos = matchedFbs.reduce((s, fb) => s + (fb.photos?.length || 0), 0);

  const savePrefs = () => {
    try {
      localStorage.setItem(FB_ARCHIVE_LS_KEY, JSON.stringify({
        fromDate, toDate, customerId, projectId, statusFilter, fieldsInclude,
      }));
    } catch {}
  };

  const handleGenerate = async () => {
    if (matchedFbs.length === 0) { onToast("NO FBs MATCH FILTERS"); return; }
    savePrefs();
    try {
      await generateFBArchivePDF({
        fbs: matchedFbs, dispatches, contacts, projects, company, fieldsInclude,
      });
      onToast(`✓ ARCHIVE GENERATED · ${matchedFbs.length} FB${matchedFbs.length !== 1 ? "S" : ""}`);
    } catch (e) {
      console.error(e); onToast("GENERATION FAILED");
    }
  };

  const toggleField = (key) => setFieldsInclude((s) => ({ ...s, [key]: !s[key] }));
  const toggleStatus = (key) => setStatusFilter((s) => ({ ...s, [key]: !s[key] }));

  const fieldCheckbox = (key, label) => (
    <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: fieldsInclude[key] ? "#FEF3C7" : "#F5F5F4", border: "1.5px solid " + (fieldsInclude[key] ? "var(--hazard-deep)" : "var(--concrete)"), cursor: "pointer", fontSize: 11 }}>
      <input type="checkbox" checked={!!fieldsInclude[key]} onChange={() => toggleField(key)} />
      <span className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.05em" }}>{label}</span>
    </label>
  );

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 820 }}>
        <div style={{ padding: "16px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.12em" }}>▸ REPORTS</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "3px 0 0" }}>FB ARCHIVE PDF</h3>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ borderColor: "var(--cream)", color: "var(--cream)" }}>
            <X size={14} style={{ marginRight: 4 }} /> CLOSE
          </button>
        </div>

        <div style={{ padding: 20, display: "grid", gap: 16 }}>
          {/* Filters */}
          <div className="fbt-card" style={{ padding: 14, background: "#F5F5F4" }}>
            <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--concrete)", marginBottom: 10, fontWeight: 700 }}>▸ FILTERS</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
              <div>
                <label className="fbt-label">From date</label>
                <input type="date" className="fbt-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="fbt-label">To date</label>
                <input type="date" className="fbt-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
              <div>
                <label className="fbt-label">Customer</label>
                <select className="fbt-select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">All customers</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="fbt-label">Project</label>
                <select className="fbt-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">All projects</option>
                  {(projects || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="fbt-label" style={{ marginBottom: 6 }}>Status include</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { k: "pending",   l: "PENDING" },
                  { k: "approved",  l: "APPROVED" },
                  { k: "invoiced",  l: "INVOICED" },
                  { k: "paid",      l: "PAID" },
                ].map(({ k, l }) => (
                  <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: statusFilter[k] ? "#FEF3C7" : "#FFF", border: "1.5px solid " + (statusFilter[k] ? "var(--hazard-deep)" : "var(--concrete)"), cursor: "pointer", fontSize: 11 }}>
                    <input type="checkbox" checked={!!statusFilter[k]} onChange={() => toggleStatus(k)} />
                    <span className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.05em" }}>{l}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Field checkboxes */}
          <div className="fbt-card" style={{ padding: 14, background: "#F5F5F4" }}>
            <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--concrete)", marginBottom: 10, fontWeight: 700 }}>▸ INCLUDE IN HEADER STRIP</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {fieldCheckbox("date", "DATE")}
              {fieldCheckbox("fbNumber", "FB #")}
              {fieldCheckbox("customer", "CUSTOMER")}
              {fieldCheckbox("driver", "DRIVER")}
              {fieldCheckbox("truck", "TRUCK")}
              {fieldCheckbox("startTime", "IN (TIME)")}
              {fieldCheckbox("endTime", "OUT (TIME)")}
              {fieldCheckbox("hours", "HOURS")}
              {fieldCheckbox("tons", "TONS")}
              {fieldCheckbox("loads", "LOADS")}
              {fieldCheckbox("pickup", "FROM")}
              {fieldCheckbox("dropoff", "TO")}
              {fieldCheckbox("description", "DESCRIPTION")}
              {fieldCheckbox("notes", "NOTES")}
            </div>
          </div>

          {/* Preview count */}
          <div style={{ padding: "12px 14px", background: matchedFbs.length > 0 ? "#F0FDF4" : "#FEE2E2", border: "2px solid " + (matchedFbs.length > 0 ? "var(--good)" : "var(--safety)"), display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div className="fbt-display" style={{ fontSize: 20 }}>
                {matchedFbs.length} FB{matchedFbs.length !== 1 ? "s" : ""} MATCH
              </div>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.08em", marginTop: 2 }}>
                {matchedFbs.length + totalPhotos} TOTAL PAGE{(matchedFbs.length + totalPhotos) !== 1 ? "S" : ""} · {totalPhotos} SCALE TICKET{totalPhotos !== 1 ? "S" : ""}
              </div>
            </div>
            <button onClick={handleGenerate} className="btn-primary" disabled={matchedFbs.length === 0} style={{ padding: "10px 18px" }}>
              <FileDown size={14} style={{ marginRight: 6 }} /> GENERATE PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================================================================
// RECOVERY TAB (v17/v18) — browse and restore soft-deleted items
// ========================================================================
// Shows soft-deleted dispatches, freight bills, invoices, and quotes.
// Items past the 30-day recovery window are flagged as "will auto-purge soon."
// Admin can RECOVER (restore to active) or DELETE PERMANENTLY (bypass auto-purge).
// ========================================================================

const RecoveryTab = ({ onToast }) => {
  const [deletedDispatches, setDeletedDispatches] = useState([]);
  const [deletedFBs, setDeletedFBs] = useState([]);
  const [deletedInvoices, setDeletedInvoices] = useState([]);
  const [deletedQuotes, setDeletedQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [d, f, i, q] = await Promise.all([
        fetchDeletedDispatches(),
        fetchDeletedFreightBills(),
        fetchDeletedInvoices(),
        fetchDeletedQuotes(),
      ]);
      setDeletedDispatches(d);
      setDeletedFBs(f);
      setDeletedInvoices(i);
      setDeletedQuotes(q);
    } catch (e) {
      console.error("Recovery fetch failed:", e);
      onToast("COULDN'T LOAD DELETED ITEMS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshAll(); }, []);

  // Is this deletion past the 30-day recovery window?
  const isExpired = (deletedAt) => {
    if (!deletedAt) return false;
    const ageMs = Date.now() - new Date(deletedAt).getTime();
    return ageMs > 30 * 24 * 60 * 60 * 1000;
  };
  const daysUntilPurge = (deletedAt) => {
    if (!deletedAt) return null;
    const ageMs = Date.now() - new Date(deletedAt).getTime();
    const remain = 30 - Math.floor(ageMs / (24 * 60 * 60 * 1000));
    return remain;
  };

  const fmtDeletedAt = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const handleRecover = async (type, id, label) => {
    if (!confirm(`Recover ${label}?\n\nThis will restore it to active records.`)) return;
    setBusyId(`${type}-${id}`);
    try {
      if (type === "dispatch") await recoverDispatch(id);
      else if (type === "fb") await recoverFreightBill(id);
      else if (type === "invoice") await recoverInvoice(id);
      else if (type === "quote") await recoverQuote(id);
      onToast(`✓ RECOVERED ${label.toUpperCase()}`);
      await refreshAll();
    } catch (e) {
      console.error("Recover failed:", e);
      alert("Recover failed: " + (e?.message || String(e)));
    } finally {
      setBusyId(null);
    }
  };

  const handleHardDelete = async (type, id, label) => {
    if (!confirm(`⚠ PERMANENTLY delete ${label}?\n\nThis CANNOT be undone. Usually auto-purge handles this after 30 days.\n\nContinue?`)) return;
    const confirm2 = prompt(`Type DELETE (all caps) to confirm permanent deletion of ${label}:`);
    if (confirm2 !== "DELETE") { onToast("CANCELLED"); return; }
    setBusyId(`${type}-${id}`);
    try {
      if (type === "dispatch") await hardDeleteDispatch(id);
      else if (type === "fb") await hardDeleteFreightBill(id);
      else if (type === "invoice") await hardDeleteInvoice(id);
      else if (type === "quote") await hardDeleteQuote(id);
      onToast(`✓ PERMANENTLY DELETED`);
      await refreshAll();
    } catch (e) {
      console.error("Hard delete failed:", e);
      alert("Permanent delete failed: " + (e?.message || String(e)));
    } finally {
      setBusyId(null);
    }
  };

  // Row renderer: one item in a group
  const renderRow = ({ type, id, title, sub, deletedAt, deletedBy, deleteReason, label }) => {
    const expired = isExpired(deletedAt);
    const days = daysUntilPurge(deletedAt);
    const busy = busyId === `${type}-${id}`;
    return (
      <div key={`${type}-${id}`} style={{ padding: "12px 14px", background: expired ? "#FEF2F2" : "#FAFAF9", border: `1.5px solid ${expired ? "var(--safety)" : "var(--concrete)"}`, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="fbt-display" style={{ fontSize: 14, margin: 0 }}>{title}</div>
          {sub && <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 3, letterSpacing: "0.04em" }}>{sub}</div>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10, color: "var(--concrete)", letterSpacing: "0.06em", marginTop: 6, textTransform: "uppercase" }}>
            <span>DELETED {fmtDeletedAt(deletedAt)}</span>
            {deletedBy && <span>· BY {deletedBy}</span>}
            {deleteReason && <span>· "{deleteReason}"</span>}
          </div>
          {expired ? (
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--safety)", letterSpacing: "0.1em", marginTop: 6, fontWeight: 700 }}>
              ⚠ EXPIRED — WILL AUTO-PURGE ON NEXT APP BOOT
            </div>
          ) : days !== null && days <= 7 && (
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard-deep)", letterSpacing: "0.1em", marginTop: 6, fontWeight: 700 }}>
              ⏱ PURGES IN {days} DAY{days !== 1 ? "S" : ""}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={() => handleRecover(type, id, label)} disabled={busy} className="btn-primary" style={{ padding: "6px 12px", fontSize: 11, background: "var(--good)", color: "#FFF" }}>
            <RefreshCw size={11} style={{ marginRight: 4 }} /> RECOVER
          </button>
          <button onClick={() => handleHardDelete(type, id, label)} disabled={busy} className="btn-ghost" style={{ padding: "6px 12px", fontSize: 11, borderColor: "var(--safety)", color: "var(--safety)" }}>
            <Trash2 size={11} style={{ marginRight: 4 }} /> PURGE
          </button>
        </div>
      </div>
    );
  };

  const groupCard = (title, items, renderItem) => (
    <div className="fbt-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid var(--steel)" }}>
        <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>{title}</h3>
        <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", fontWeight: 700 }}>
          {items.length} ITEM{items.length !== 1 ? "S" : ""}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.08em", padding: "16px 0", fontStyle: "italic" }}>
          NOTHING HERE — NO {title.replace("DELETED ", "")} DELETED
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map(renderItem)}
        </div>
      )}
    </div>
  );

  const totalDeleted = deletedDispatches.length + deletedFBs.length + deletedInvoices.length + deletedQuotes.length;
  const totalExpired = [...deletedDispatches, ...deletedFBs, ...deletedInvoices, ...deletedQuotes].filter((x) => isExpired(x.deletedAt)).length;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <h2 className="fbt-display" style={{ fontSize: 22, margin: 0 }}>RECOVERY</h2>
        <span className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)", letterSpacing: "0.08em" }}>
          SOFT-DELETED ITEMS · RECOVERABLE FOR 30 DAYS
        </span>
        <button onClick={refreshAll} disabled={loading} className="btn-ghost" style={{ marginLeft: "auto", fontSize: 11, padding: "6px 12px" }}>
          <RefreshCw size={11} style={{ marginRight: 4 }} /> REFRESH
        </button>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{totalDeleted}</div>
          <div className="stat-label">TOTAL DELETED</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{deletedDispatches.length}</div>
          <div className="stat-label">DISPATCHES</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{deletedFBs.length}</div>
          <div className="stat-label">FREIGHT BILLS</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{deletedInvoices.length + deletedQuotes.length}</div>
          <div className="stat-label">INVOICES + QUOTES</div>
        </div>
        {totalExpired > 0 && (
          <div className="fbt-card" style={{ padding: 16, background: "#FEF2F2", border: "2px solid var(--safety)" }}>
            <div className="stat-num" style={{ color: "var(--safety)" }}>{totalExpired}</div>
            <div className="stat-label" style={{ color: "var(--safety)" }}>EXPIRED · WILL PURGE</div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <div className="fbt-mono anim-roll" style={{ fontSize: 13, letterSpacing: "0.2em", color: "var(--hazard-deep)" }}>▸ LOADING RECOVERY DATA…</div>
        </div>
      ) : totalDeleted === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <CheckCircle2 size={32} style={{ opacity: 0.4, marginBottom: 8, color: "var(--good)" }} />
          <div className="fbt-display" style={{ fontSize: 14 }}>NOTHING IN RECOVERY</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.08em", marginTop: 6 }}>
            WHEN YOU DELETE DISPATCHES, FBS, INVOICES, OR QUOTES, THEY'LL APPEAR HERE FOR 30 DAYS
          </div>
        </div>
      ) : (
        <>
          {groupCard("DELETED DISPATCHES", deletedDispatches, (d) => renderRow({
            type: "dispatch",
            id: d.id,
            title: `Order #${d.code || d.id.slice(0, 8)} — ${d.jobName || "—"}`,
            sub: `${d.pickup || "—"} → ${d.dropoff || "—"} · ${d.trucksExpected || 0} truck${d.trucksExpected !== 1 ? "s" : ""}`,
            deletedAt: d.deletedAt,
            deletedBy: d.deletedBy,
            deleteReason: d.deleteReason,
            label: `Order #${d.code || d.id.slice(0, 8)}`,
          }))}

          {groupCard("DELETED FREIGHT BILLS", deletedFBs, (fb) => renderRow({
            type: "fb",
            id: fb.id,
            title: `FB #${fb.freightBillNumber || fb.id.slice(0, 8)}`,
            sub: `${fb.driverName || "—"} · Truck ${fb.truckNumber || "—"}${fb.tonnage ? ` · ${fb.tonnage} tons` : ""}${fb.loadCount ? ` · ${fb.loadCount} loads` : ""}`,
            deletedAt: fb.deletedAt,
            deletedBy: fb.deletedBy,
            deleteReason: fb.deleteReason,
            label: `FB #${fb.freightBillNumber || fb.id.slice(0, 8)}`,
          }))}

          {groupCard("DELETED INVOICES", deletedInvoices, (inv) => renderRow({
            type: "invoice",
            id: inv.id,
            title: `Invoice ${inv.invoiceNumber || inv.id.slice(0, 8)}`,
            sub: `${inv.clientName || "—"}${inv.totalAmount ? ` · $${Number(inv.totalAmount).toFixed(2)}` : ""}${inv.fbIds ? ` · ${inv.fbIds.length} FB${inv.fbIds.length !== 1 ? "s" : ""}` : ""}`,
            deletedAt: inv.deletedAt,
            deletedBy: inv.deletedBy,
            deleteReason: inv.deleteReason,
            label: `Invoice ${inv.invoiceNumber || inv.id.slice(0, 8)}`,
          }))}

          {groupCard("DELETED QUOTES", deletedQuotes, (q) => renderRow({
            type: "quote",
            id: q.id,
            title: `${q.name || "—"}${q.company ? ` — ${q.company}` : ""}`,
            sub: `${q.email || "—"}${q.phone ? ` · ${q.phone}` : ""}${q.service ? ` · ${q.service}` : ""}`,
            deletedAt: q.deletedAt,
            deletedBy: q.deletedBy,
            deleteReason: q.deleteReason,
            label: `quote from ${q.name || "—"}`,
          }))}
        </>
      )}
    </div>
  );
};

const ReportsTab = ({ dispatches, freightBills, logs, invoices, quotes, quarries, contacts, projects = [], company, editFreightBill, onToast, lastViewedMondayReport, setLastViewedMondayReport }) => {
  const [rangePreset, setRangePreset] = useState("lastweek");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const { from, to, label } = useMemo(() => {
    if (rangePreset === "lastweek") {
      const r = lastWeekRange();
      return { ...r, label: "Last week (Mon–Sun)" };
    }
    if (rangePreset === "thisweek") {
      const r = thisWeekRange();
      return { ...r, label: "This week" };
    }
    if (rangePreset === "last14") {
      return { ...daysAgoRange(14), label: "Last 14 days" };
    }
    if (rangePreset === "last30") {
      return { ...daysAgoRange(30), label: "Last 30 days" };
    }
    if (rangePreset === "custom" && customFrom && customTo) {
      return { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)), label: "Custom range" };
    }
    const r = lastWeekRange();
    return { ...r, label: "Last week (Mon–Sun)" };
  }, [rangePreset, customFrom, customTo]);

  const report = useMemo(
    () => computeReport({ from, to, dispatches, freightBills, logs, invoices, quotes, quarries, contacts }),
    [from, to, dispatches, freightBills, logs, invoices, quotes, quarries, contacts]
  );

  // Monday morning banner — show if today is Monday (5am-noon) and user hasn't viewed last week's report
  const now = new Date();
  const isMondayMorning = now.getDay() === 1 && now.getHours() >= 5 && now.getHours() < 12;
  const lwRange = lastWeekRange();
  const lwKey = toISODate(lwRange.from);
  const mondayPending = isMondayMorning && lastViewedMondayReport !== lwKey;

  useEffect(() => {
    // When viewing last week's report, mark it as viewed
    if (rangePreset === "lastweek" && isMondayMorning) {
      setLastViewedMondayReport(lwKey);
    }
  }, [rangePreset, isMondayMorning, lwKey]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {showArchiveModal && (
        <FBArchiveModal
          freightBills={freightBills}
          dispatches={dispatches}
          contacts={contacts}
          projects={projects}
          company={company}
          onClose={() => setShowArchiveModal(false)}
          onToast={onToast}
        />
      )}

      {/* FB Archive PDF card */}
      <div className="fbt-card" style={{ padding: 18, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "linear-gradient(135deg, var(--cream), #FEF3C7)", border: "2px solid var(--hazard-deep)" }}>
        <FileDown size={28} style={{ color: "var(--hazard-deep)" }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="fbt-display" style={{ fontSize: 18 }}>📂 FB ARCHIVE PDF</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4, letterSpacing: "0.05em" }}>
            EXPORT FREIGHT BILLS + SCALE TICKETS BY CUSTOMER · DATE · PROJECT
          </div>
        </div>
        <button onClick={() => setShowArchiveModal(true)} className="btn-primary" style={{ padding: "10px 18px" }}>
          <FileDown size={14} style={{ marginRight: 6 }} /> OPEN
        </button>
      </div>

      {/* FB Search Panel at top */}
      <FBSearchPanel
        freightBills={freightBills}
        dispatches={dispatches}
        contacts={contacts}
        projects={projects}
        editFreightBill={editFreightBill}
        onToast={onToast}
        company={company}
      />

      {mondayPending && (
        <div className="fbt-card" style={{ padding: 18, background: "var(--hazard)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Calendar size={28} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="fbt-display" style={{ fontSize: 16 }}>📊 MONDAY MORNING RECAP</div>
            <div className="fbt-mono" style={{ fontSize: 12, color: "var(--steel)", marginTop: 4 }}>
              LAST WEEK'S REPORT IS READY ({toISODate(lwRange.from)} → {toISODate(lwRange.to)})
            </div>
          </div>
          <button onClick={() => setRangePreset("lastweek")} className="btn-ghost" style={{ borderColor: "var(--steel)" }}>
            VIEW NOW <ArrowRight size={14} style={{ marginLeft: 6 }} />
          </button>
        </div>
      )}

      {/* Range selector */}
      <div className="fbt-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Calendar size={18} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>REPORT RANGE</h3>
          <span className="fbt-mono" style={{ marginLeft: "auto", fontSize: 12, color: "var(--concrete)", letterSpacing: "0.08em" }}>
            {toISODate(from)} → {toISODate(to)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { k: "lastweek", l: "Last Week" },
            { k: "thisweek", l: "This Week" },
            { k: "last14", l: "Last 14 Days" },
            { k: "last30", l: "Last 30 Days" },
            { k: "custom", l: "Custom" },
          ].map((p) => (
            <button
              key={p.k}
              onClick={() => setRangePreset(p.k)}
              className="btn-ghost"
              style={{
                padding: "8px 14px", fontSize: 11,
                background: rangePreset === p.k ? "var(--steel)" : "transparent",
                color: rangePreset === p.k ? "var(--cream)" : "var(--steel)",
              }}
            >
              {p.l}
            </button>
          ))}
        </div>
        {rangePreset === "custom" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 14 }}>
            <div><label className="fbt-label">From</label><input className="fbt-input" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></div>
            <div><label className="fbt-label">To</label><input className="fbt-input" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></div>
          </div>
        )}
      </div>

      {/* Core metrics */}
      <div>
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ HEADLINE METRICS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div className="fbt-card" style={{ padding: 18 }}><div className="stat-num" style={{ fontSize: 36 }}>{report.openedCount}</div><div className="stat-label">Opened</div></div>
          <div className="fbt-card" style={{ padding: 18 }}><div className="stat-num" style={{ fontSize: 36 }}>{report.closedCount}</div><div className="stat-label">Closed</div></div>
          <div className="fbt-card" style={{ padding: 18 }}><div className="stat-num" style={{ fontSize: 36 }}>{report.billsCount}</div><div className="stat-label">Freight Bills</div></div>
          <div className="fbt-card" style={{ padding: 18 }}><div className="stat-num" style={{ fontSize: 36 }}>{report.totalTons.toFixed(1)}</div><div className="stat-label">Total Tons</div></div>
          <div className="fbt-card" style={{ padding: 18, background: "var(--hazard)" }}><div className="stat-num" style={{ fontSize: 32 }}>{fmt$(report.laborRevenue)}</div><div className="stat-label">Labor Revenue</div></div>
          <div className="fbt-card" style={{ padding: 18 }}><div className="stat-num" style={{ fontSize: 36 }}>{report.quotesCount}</div><div className="stat-label">New Quotes</div></div>
          <div className="fbt-card" style={{ padding: 18, background: "#D1FAE5" }}><div className="stat-num" style={{ fontSize: 32 }}>{fmt$(report.invoiceTotal)}</div><div className="stat-label">Invoiced ({report.invoicesCount})</div></div>
          <div className="fbt-card" style={{ padding: 18, background: report.incomplete.length > 0 ? "#FEE2E2" : "#FFF" }}><div className="stat-num" style={{ fontSize: 36, color: report.incomplete.length > 0 ? "var(--safety)" : "var(--good)" }}>{report.incomplete.length}</div><div className="stat-label">Incomplete</div></div>
        </div>
      </div>

      {/* Top clients */}
      <div className="fbt-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Award size={18} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>TOP CLIENTS BY TONNAGE</h3>
        </div>
        {report.topClients.length === 0 ? (
          <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace", textAlign: "center" }}>No data in this range</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {(() => {
              const max = report.topClients[0].tons || 1;
              return report.topClients.map((c, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr auto", gap: 10, alignItems: "center" }}>
                  <div className="fbt-display" style={{ fontSize: 16, color: i === 0 ? "var(--hazard-deep)" : "var(--concrete)" }}>{i + 1}</div>
                  <div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, marginBottom: 3 }}>{c.name}</div>
                    <div style={{ height: 6, background: "#E7E5E4" }}>
                      <div style={{ width: `${(c.tons / max) * 100}%`, height: "100%", background: i === 0 ? "var(--hazard)" : "var(--concrete)" }} />
                    </div>
                  </div>
                  <div className="fbt-display" style={{ fontSize: 14 }}>{c.tons.toFixed(1)}t</div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Two-col: Subs + Quarries */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Users size={18} style={{ color: "var(--hazard-deep)" }} />
            <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>TOP SUB-CONTRACTORS</h3>
          </div>
          {report.topSubs.length === 0 ? (
            <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace", textAlign: "center" }}>No sub-contractor activity</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {report.topSubs.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i === report.topSubs.length - 1 ? "none" : "1px solid #E7E5E4", fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>
                  <span>{s.name}</span>
                  <strong>{s.count} dispatches</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fbt-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Mountain size={18} style={{ color: "var(--hazard-deep)" }} />
            <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>QUARRY USAGE</h3>
          </div>
          {report.quarryUsage.length === 0 ? (
            <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace", textAlign: "center" }}>No quarry-sourced jobs</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {report.quarryUsage.map((q, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i === report.quarryUsage.length - 1 ? "none" : "1px solid #E7E5E4", fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>
                  <span>{q.name}</span>
                  <strong>{q.tons.toFixed(1)} tons</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quotes + Invoices */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Mail size={18} style={{ color: "var(--hazard-deep)" }} />
            <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>NEW QUOTES ({report.quotesCount})</h3>
          </div>
          {report.quotesList.length === 0 ? (
            <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace", textAlign: "center" }}>No new quotes</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {report.quotesList.slice(0, 8).map((q, i) => (
                <div key={i} style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", padding: "6px 0", borderBottom: "1px solid #E7E5E4" }}>
                  <strong>{q.name}</strong>{q.company && ` · ${q.company}`}
                  <div style={{ color: "var(--concrete)", fontSize: 11, marginTop: 2 }}>{q.service} · {new Date(q.submittedAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fbt-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Receipt size={18} style={{ color: "var(--hazard-deep)" }} />
            <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>INVOICES ({report.invoicesCount})</h3>
          </div>
          {report.invoicesList.length === 0 ? (
            <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace", textAlign: "center" }}>No invoices generated</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {report.invoicesList.map((inv, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "JetBrains Mono, monospace", padding: "6px 0", borderBottom: "1px solid #E7E5E4" }}>
                  <div><strong>{inv.num}</strong> · {inv.billTo}</div>
                  <div style={{ color: "var(--hazard-deep)", fontWeight: 700 }}>{fmt$(inv.total)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Incomplete dispatches */}
      <div className="fbt-card" style={{ padding: 20, borderLeft: `6px solid ${report.incomplete.length > 0 ? "var(--safety)" : "var(--good)"}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <AlertCircle size={18} style={{ color: report.incomplete.length > 0 ? "var(--safety)" : "var(--good)" }} />
          <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>INCOMPLETE DISPATCHES</h3>
        </div>
        {report.incomplete.length === 0 ? (
          <div style={{ padding: 14, background: "#D1FAE5", fontSize: 13, color: "var(--good)", fontFamily: "JetBrains Mono, monospace", textAlign: "center", fontWeight: 700 }}>✓ ALL DISPATCHES ACCOUNTED FOR</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {report.incomplete.map((d, i) => (
              <div key={i} style={{ padding: 10, border: "1.5px solid var(--safety)", background: "#FEE2E2", fontFamily: "JetBrains Mono, monospace", fontSize: 12, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <strong>#{d.code}</strong> · {d.jobName} · <span style={{ color: "var(--concrete)" }}>{fmtDate(d.date)}</span>
                </div>
                <div>MISSING {d.expected - d.submitted} / {d.expected}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export buttons */}
      <div className="fbt-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <FileDown size={18} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>EXPORT THIS REPORT</h3>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => openReportPrintWindow(report, company, onToast)} className="btn-primary">
            <Printer size={14} /> PRINT / SAVE AS PDF
          </button>
          <button onClick={() => { downloadReportCSV(report); onToast("CSV DOWNLOADED"); }} className="btn-ghost">
            <Download size={14} style={{ marginRight: 6 }} /> DOWNLOAD CSV
          </button>
        </div>
      </div>
    </div>
  );
};

// ========== DATA TAB ==========
const DataTab = ({ state, setters, onToast }) => {
  const [includePhotos, setIncludePhotos] = useState(true);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const ts = await storageGet("fbt:lastBackupAt");
      if (ts) setLastBackup(ts);
    })();
  }, []);

  const photosCount = (state.freightBills || []).reduce((s, fb) => s + (fb.photos?.length || 0), 0);
  const totalItems =
    (state.dispatches?.length || 0) +
    (state.freightBills?.length || 0) +
    (state.invoices?.length || 0) +
    (state.logs?.length || 0) +
    (state.quotes?.length || 0) +
    (state.fleet?.length || 0);

  const handleJsonExport = async () => {
    try {
      const { size } = downloadJSONBackup(state, { includePhotos });
      const now = new Date().toISOString();
      await storageSet("fbt:lastBackupAt", now);
      setLastBackup(now);
      const kb = Math.round(size / 1024);
      onToast(`JSON BACKUP DOWNLOADED · ${kb}KB`);
    } catch (e) {
      console.error(e);
      onToast("EXPORT FAILED");
    }
  };

  const handleCSVExport = () => {
    try {
      exportAllCSVs(state);
      onToast("CSVS DOWNLOADED");
    } catch (e) {
      console.error(e);
      onToast("CSV EXPORT FAILED");
    }
  };

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result;
        const obj = JSON.parse(text);
        const err = validateBackup(obj);
        if (err) {
          alert("Import failed:\n\n" + err);
          setImporting(false);
          e.target.value = "";
          return;
        }
        const counts = {
          dispatches: obj.dispatches?.length || 0,
          freightBills: obj.freightBills?.length || 0,
          invoices: obj.invoices?.length || 0,
          contacts: obj.contacts?.length || 0,
          quarries: obj.quarries?.length || 0,
          logs: obj.logs?.length || 0,
          quotes: obj.quotes?.length || 0,
          fleet: obj.fleet?.length || 0,
        };
        const msg =
          `Restore backup from ${obj._exportedAt?.slice(0, 10) || "unknown date"}?\n\n` +
          `This will REPLACE all current data with:\n` +
          `• ${counts.dispatches} dispatches\n` +
          `• ${counts.freightBills} freight bills${obj._includesPhotos ? " (with photos)" : " (photos stripped)"}\n` +
          `• ${counts.invoices} invoices\n` +
          `• ${counts.contacts} contacts\n` +
          `• ${counts.quarries} quarries\n` +
          `• ${counts.logs} hours logs\n` +
          `• ${counts.quotes} quote requests\n` +
          `• ${counts.fleet} fleet units\n\n` +
          `Current data will be permanently overwritten.`;
        if (!confirm(msg)) {
          setImporting(false);
          e.target.value = "";
          return;
        }
        // Apply
        await setters.setLogs(obj.logs || []);
        await setters.setQuotes(obj.quotes || []);
        await setters.setFleet(obj.fleet || []);
        await setters.setDispatches(obj.dispatches || []);
        await setters.setFreightBills(obj.freightBills || []);
        await setters.setInvoices(obj.invoices || []);
        if (setters.setContacts) await setters.setContacts(obj.contacts || []);
        if (setters.setQuarries) await setters.setQuarries(obj.quarries || []);
        if (obj.company) await setters.setCompany(obj.company);
        onToast("BACKUP RESTORED");
      } catch (err) {
        console.error(err);
        alert("Import failed:\n\nThe file is not valid JSON or is corrupted.");
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };
    reader.onerror = () => {
      alert("Couldn't read the file.");
      setImporting(false);
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const daysSinceBackup = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24)) : null;
  const backupStale = daysSinceBackup === null || daysSinceBackup >= 7;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Backup status */}
      <div className="fbt-card" style={{ padding: 20, background: backupStale ? "#FEF3C7" : "#FFF", borderLeft: `6px solid ${backupStale ? "var(--safety)" : "var(--good)"}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ width: 48, height: 48, background: backupStale ? "var(--safety)" : "var(--good)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF" }}>
            {backupStale ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="fbt-display" style={{ fontSize: 18 }}>
              {lastBackup ? (backupStale ? "BACKUP OVERDUE" : "BACKUP CURRENT") : "NO BACKUP YET"}
            </div>
            <div className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)", marginTop: 4 }}>
              {lastBackup
                ? `LAST BACKUP ▸ ${fmtDateTime(lastBackup)}${daysSinceBackup >= 1 ? ` · ${daysSinceBackup} DAY${daysSinceBackup !== 1 ? "S" : ""} AGO` : " · TODAY"}`
                : "▸ BACK UP NOW BEFORE YOU LOSE DATA"}
            </div>
          </div>
        </div>
      </div>

      {/* Data summary */}
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Database size={22} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>YOUR DATA</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
          {[
            { l: "Dispatches", v: state.dispatches?.length || 0 },
            { l: "Freight Bills", v: state.freightBills?.length || 0 },
            { l: "Photos", v: photosCount },
            { l: "Invoices", v: state.invoices?.length || 0 },
            { l: "Contacts", v: state.contacts?.length || 0 },
            { l: "Quarries", v: state.quarries?.length || 0 },
            { l: "Hours Logs", v: state.logs?.length || 0 },
            { l: "Quotes", v: state.quotes?.length || 0 },
            { l: "Fleet Units", v: state.fleet?.length || 0 },
          ].map((s, i) => (
            <div key={i} style={{ padding: 14, border: "2px solid var(--steel)", background: "#FFF" }}>
              <div className="fbt-display" style={{ fontSize: 28, lineHeight: 1 }}>{s.v}</div>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <HardDrive size={22} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>EXPORT BACKUP</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {/* JSON */}
          <div style={{ border: "2px solid var(--steel)", padding: 20, background: "#FFF" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <FileDown size={18} />
              <h4 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>FULL BACKUP (.JSON)</h4>
            </div>
            <p style={{ fontSize: 13, color: "var(--concrete)", margin: "0 0 14px", lineHeight: 1.5 }}>
              Everything in one file — can be restored later to bring all your data back exactly as it was.
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)", cursor: "pointer", marginBottom: 14 }}>
              <input type="checkbox" checked={includePhotos} onChange={(e) => setIncludePhotos(e.target.checked)} />
              INCLUDE {photosCount} SCALE TICKET PHOTOS {!includePhotos && photosCount > 0 && <span style={{ color: "var(--safety)" }}>(WILL BE LOST)</span>}
            </label>
            <button onClick={handleJsonExport} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              <Download size={16} /> DOWNLOAD BACKUP
            </button>
          </div>

          {/* CSV */}
          <div style={{ border: "2px solid var(--steel)", padding: 20, background: "#FFF" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <FileText size={18} />
              <h4 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>SPREADSHEETS (.CSV)</h4>
            </div>
            <p style={{ fontSize: 13, color: "var(--concrete)", margin: "0 0 14px", lineHeight: 1.5 }}>
              Separate CSV files for dispatches, freight bills, invoices, and hours. Open in Excel or Google Sheets.
            </p>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 14, lineHeight: 1.5 }}>
              ▸ NOTE: PHOTOS NOT INCLUDED (SPREADSHEETS CAN'T HOLD IMAGES). USE JSON IF YOU NEED TO RESTORE LATER.
            </div>
            <button onClick={handleCSVExport} className="btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
              <Download size={14} style={{ marginRight: 6 }} /> DOWNLOAD CSVS
            </button>
          </div>
        </div>
      </div>

      {/* Import */}
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <RefreshCw size={22} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>RESTORE FROM BACKUP</h3>
        </div>
        <p style={{ fontSize: 13, color: "var(--concrete)", margin: "0 0 16px", lineHeight: 1.5 }}>
          Load a <code style={{ background: "#F5F5F4", padding: "1px 6px", fontFamily: "JetBrains Mono, monospace" }}>.json</code> backup file to restore all data. Your current data will be <strong>replaced</strong>.
        </p>
        <div style={{ padding: 12, background: "#FEE2E2", border: "1px solid var(--safety)", color: "var(--safety)", fontSize: 12, fontFamily: "JetBrains Mono, monospace", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={14} /> WARNING: THIS OVERWRITES EVERYTHING. BACK UP CURRENT DATA FIRST IF YOU WANT TO KEEP IT.
        </div>
        <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleFilePick} />
        <button onClick={() => fileInputRef.current?.click()} className="btn-ghost" disabled={importing}>
          <Upload size={14} style={{ marginRight: 6 }} /> {importing ? "PROCESSING…" : "SELECT BACKUP FILE"}
        </button>
      </div>

      {/* Info */}
      <div className="fbt-card" style={{ padding: 20, background: "#F5F5F4" }}>
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ HOW BACKUPS WORK</div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.8, color: "var(--concrete)" }}>
          <li>A backup <strong>auto-downloads every time you tap Log Out</strong> — so you always have a recent copy</li>
          <li>Save backup files to <strong>Google Drive, iCloud, or Dropbox</strong> for off-device safety</li>
          <li>Keep the last 3-5 backups in case one gets corrupted</li>
          <li>Total { totalItems } record{ totalItems !== 1 ? "s" : "" } in your dataset right now</li>
        </ul>
      </div>
    </div>
  );
};

// ========== NOTIFICATION BELL ==========
const NotificationBell = ({ unreadIds, freightBills, dispatches, onJumpToDispatch, onMarkAllRead, onToggleSound, soundEnabled, onToggleBrowser, browserEnabled }) => {
  const [open, setOpen] = useState(false);
  const unreadBills = useMemo(() => {
    const set = new Set(unreadIds);
    return freightBills
      .filter((fb) => set.has(fb.id))
      .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""))
      .slice(0, 20);
  }, [unreadIds, freightBills]);

  const count = unreadIds.length;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost"
        style={{ color: count > 0 ? "var(--hazard)" : "var(--cream)", borderColor: count > 0 ? "var(--hazard)" : "var(--cream)", padding: "8px 12px", fontSize: 11, position: "relative" }}
        title={count > 0 ? `${count} new upload${count !== 1 ? "s" : ""}` : "No new notifications"}
      >
        <Bell size={14} fill={count > 0 ? "var(--hazard)" : "none"} />
        {count > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "var(--safety)", color: "#FFF",
            minWidth: 18, height: 18, padding: "0 5px",
            borderRadius: 9, fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--steel)", fontFamily: "JetBrains Mono, monospace",
          }}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 91,
            width: 360, maxWidth: "90vw", maxHeight: 500,
            background: "var(--cream)", border: "2px solid var(--steel)",
            boxShadow: "6px 6px 0 var(--hazard)", display: "flex", flexDirection: "column",
          }}>
            <div className="hazard-stripe-thin" style={{ height: 5 }} />
            <div style={{ padding: "14px 16px", borderBottom: "2px solid var(--steel)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--steel)", color: "var(--cream)" }}>
              <div className="fbt-display" style={{ fontSize: 14, letterSpacing: "0.05em" }}>NOTIFICATIONS</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={onToggleSound}
                  title={soundEnabled ? "Sound on" : "Sound off"}
                  style={{ background: "transparent", border: "1px solid var(--cream)", color: "var(--cream)", padding: "4px 6px", cursor: "pointer" }}
                >
                  {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                </button>
                <button
                  onClick={onToggleBrowser}
                  title={browserEnabled ? "Browser alerts on" : "Browser alerts off"}
                  style={{ background: "transparent", border: "1px solid var(--cream)", color: "var(--cream)", padding: "4px 6px", cursor: "pointer" }}
                >
                  {browserEnabled ? <Bell size={12} /> : <BellOff size={12} />}
                </button>
              </div>
            </div>

            {count === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--concrete)" }}>
                <Bell size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
                <div className="fbt-mono" style={{ fontSize: 11, letterSpacing: "0.1em" }}>ALL CAUGHT UP</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>You'll be notified when subs upload freight bills.</div>
              </div>
            ) : (
              <>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {unreadBills.map((fb) => {
                    const d = dispatches.find((x) => x.id === fb.dispatchId);
                    return (
                      <button
                        key={fb.id}
                        onClick={() => {
                          onJumpToDispatch(fb.dispatchId);
                          setOpen(false);
                        }}
                        style={{
                          width: "100%", textAlign: "left", padding: "12px 14px",
                          background: "transparent", border: "none",
                          borderBottom: "1px solid #E7E5E4", cursor: "pointer",
                          display: "flex", gap: 10, alignItems: "flex-start",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF3C7"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ width: 8, height: 8, background: "var(--safety)", borderRadius: "50%", marginTop: 6, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "Archivo Black, sans-serif", fontSize: 13 }}>
                            FB #{fb.freightBillNumber}
                            {fb.photos?.length > 0 && <span style={{ color: "var(--good)", fontSize: 11, marginLeft: 6 }}>📎{fb.photos.length}</span>}
                          </div>
                          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
                            {fb.driverName} · Truck {fb.truckNumber}
                          </div>
                          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                            {d ? `#${d.code} · ${d.jobName.slice(0, 32)}${d.jobName.length > 32 ? "…" : ""}` : "Dispatch deleted"}
                          </div>
                          <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginTop: 3, opacity: 0.7 }}>
                            {fmtDateTime(fb.submittedAt)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ padding: 10, borderTop: "2px solid var(--steel)", background: "#FAFAF9" }}>
                  <button onClick={() => { onMarkAllRead(); setOpen(false); }} className="btn-ghost" style={{ width: "100%", justifyContent: "center", padding: "8px", fontSize: 11 }}>
                    <CheckCircle2 size={12} style={{ marginRight: 6 }} /> MARK ALL AS READ
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ========== CUSTOMER PORTAL (public, token-based access) ==========
const CustomerPortal = ({ token, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFB, setSelectedFB] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [orderFilter, setOrderFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchCustomerByToken(token);
        if (!result) { setError("Invalid or expired portal link"); }
        else { setData(result); }
      } catch (e) {
        setError("Failed to load portal — please try again");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="fbt-root texture-paper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <GlobalStyles />
        <div className="fbt-mono anim-roll" style={{ color: "var(--hazard-deep)", letterSpacing: "0.2em" }}>▸ LOADING YOUR PORTAL…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fbt-root texture-paper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
        <GlobalStyles />
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", maxWidth: 440 }}>
          <AlertCircle size={48} style={{ color: "var(--safety)", marginBottom: 16 }} />
          <h2 className="fbt-display" style={{ fontSize: 22, margin: "0 0 10px" }}>ACCESS DENIED</h2>
          <p style={{ color: "var(--concrete)", margin: "0 0 16px" }}>
            {error || "This portal link is not valid."} Please contact 4 Brothers Trucking for a new link.
          </p>
        </div>
      </div>
    );
  }

  const { customer, orders, freightBills, projects } = data;

  // Filter orders
  const filteredOrders = useMemo(() => {
    let list = orders;
    if (orderFilter !== "all") list = list.filter((o) => {
      if (orderFilter === "open") return o.status === "open";
      if (orderFilter === "closed") return o.status === "closed";
      if (orderFilter !== "all") return o.projectId === Number(orderFilter);
      return true;
    });
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((o) => {
        const fbs = freightBills.filter((fb) => fb.dispatchId === o.id);
        const hay = `${o.jobName} ${o.code} ${fbs.map((fb) => `${fb.freightBillNumber} ${fb.driverName}`).join(" ")}`.toLowerCase();
        return hay.includes(s);
      });
    }
    return list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [orders, orderFilter, search, freightBills]);

  // Metrics
  const totalTons = freightBills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
  const totalLoads = freightBills.reduce((s, fb) => s + (Number(fb.loadCount) || 0), 0);
  const totalHours = freightBills.reduce((s, fb) => s + (Number(fb.hoursBilled) || 0), 0);

  return (
    <div className="fbt-root" style={{ minHeight: "100vh", background: "#F5F5F4" }}>
      <GlobalStyles />
      {selectedFB && (
        <div className="modal-bg" onClick={() => setSelectedFB(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)" }}>FREIGHT BILL</div>
                <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>#{selectedFB.freightBillNumber || "—"}</h3>
              </div>
              <button onClick={() => setSelectedFB(null)} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, fontSize: 13, fontFamily: "JetBrains Mono, monospace", marginBottom: 16 }}>
                <div><strong>DRIVER:</strong> {selectedFB.driverName || "—"}</div>
                <div><strong>TRUCK:</strong> {selectedFB.truckNumber || "—"}</div>
                <div><strong>MATERIAL:</strong> {selectedFB.material || "—"}</div>
                <div><strong>TONNAGE:</strong> {selectedFB.tonnage ? `${selectedFB.tonnage}T` : "—"}</div>
                <div><strong>LOADS:</strong> {selectedFB.loadCount || "—"}</div>
                <div><strong>HOURS:</strong> {selectedFB.hoursBilled || "—"}</div>
                {selectedFB.pickupTime && <div><strong>PICKUP:</strong> {selectedFB.pickupTime}</div>}
                {selectedFB.dropoffTime && <div><strong>DROPOFF:</strong> {selectedFB.dropoffTime}</div>}
              </div>
              {selectedFB.description && (
                <div style={{ padding: 10, background: "#F5F5F4", fontSize: 13, marginBottom: 16 }}>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 4 }}>▸ DESCRIPTION</div>
                  {selectedFB.description}
                </div>
              )}
              {selectedFB.photos && selectedFB.photos.length > 0 && (
                <div>
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 8 }}>▸ SCALE TICKETS ({selectedFB.photos.length})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {selectedFB.photos.map((p, idx) => (
                      <img
                        key={p.id || idx}
                        src={p.dataUrl}
                        alt=""
                        style={{ width: 120, height: 120, objectFit: "cover", border: "2px solid var(--steel)", cursor: "pointer" }}
                        onClick={() => setLightbox(p.dataUrl)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "zoom-out" }}>
          <img src={lightbox} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} alt="" />
        </div>
      )}

      {/* Header */}
      <div style={{ background: "var(--steel)", color: "var(--cream)", borderBottom: "3px solid var(--hazard)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Logo size="sm" />
          <div style={{ flex: 1 }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", letterSpacing: "0.15em" }}>CUSTOMER PORTAL</div>
            <div className="fbt-display" style={{ fontSize: 18 }}>{customer.companyName}</div>
          </div>
          <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1" }}>VIEW-ONLY ACCESS</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
          <div className="fbt-card" style={{ padding: 16 }}>
            <div className="stat-num">{orders.length}</div>
            <div className="stat-label">Total Orders</div>
          </div>
          <div className="fbt-card" style={{ padding: 16, background: "var(--hazard)" }}>
            <div className="stat-num">{freightBills.length}</div>
            <div className="stat-label">Freight Bills</div>
          </div>
          <div className="fbt-card" style={{ padding: 16 }}>
            <div className="stat-num">{totalTons.toFixed(1)}</div>
            <div className="stat-label">Total Tons</div>
          </div>
          <div className="fbt-card" style={{ padding: 16 }}>
            <div className="stat-num">{totalLoads}</div>
            <div className="stat-label">Loads Hauled</div>
          </div>
          <div className="fbt-card" style={{ padding: 16 }}>
            <div className="stat-num">{totalHours.toFixed(1)}</div>
            <div className="stat-label">Hours Billed</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
            <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search job name, FB#, driver…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="fbt-select" style={{ width: "auto" }} value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)}>
            <option value="all">All Orders</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            {projects.length > 0 && <option disabled>──── Projects ────</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Orders + FBs */}
        {filteredOrders.length === 0 ? (
          <div className="fbt-card" style={{ padding: 40, textAlign: "center", color: "var(--concrete)" }}>
            <FileText size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div className="fbt-mono" style={{ fontSize: 13 }}>NO ORDERS YET</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {filteredOrders.map((order) => {
              const orderFBs = freightBills.filter((fb) => fb.dispatchId === order.id);
              const orderTons = orderFBs.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
              const project = projects.find((p) => p.id === order.projectId);
              return (
                <div key={order.id} className="fbt-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div className="hazard-stripe-thin" style={{ height: 4 }} />
                  <div style={{ padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                          <span className="chip" style={{ background: order.status === "open" ? "var(--good)" : "var(--concrete)", color: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                            ● {order.status || "open"}
                          </span>
                          <span className="chip" style={{ background: "var(--hazard)", fontSize: 9, padding: "2px 8px" }}>#{order.code}</span>
                          <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>{order.date ? new Date(order.date).toLocaleDateString() : ""}</span>
                          {project && <span className="chip" style={{ background: "#FFF", fontSize: 9, padding: "2px 8px" }}>{project.name}</span>}
                        </div>
                        <div className="fbt-display" style={{ fontSize: 17 }}>{order.jobName}</div>
                        {(order.pickup || order.dropoff) && (
                          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
                            {order.pickup && `▸ ${order.pickup}`}{order.dropoff && ` → ${order.dropoff}`}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="fbt-display" style={{ fontSize: 20 }}>{orderFBs.length}</div>
                        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>FBs · {orderTons.toFixed(1)}T</div>
                      </div>
                    </div>

                    {/* FB list */}
                    {orderFBs.length > 0 && (
                      <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                        {orderFBs.map((fb) => (
                          <div
                            key={fb.id}
                            onClick={() => setSelectedFB(fb)}
                            style={{
                              padding: 10, border: "1px solid var(--steel)", background: "#FFF",
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              cursor: "pointer", gap: 10, flexWrap: "wrap",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 150, fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                              <strong>FB #{fb.freightBillNumber || "—"}</strong> · {fb.driverName || "—"} · Truck {fb.truckNumber || "—"}
                              <div style={{ color: "var(--concrete)", fontSize: 10, marginTop: 2 }}>
                                {fb.tonnage ? `${fb.tonnage}T` : ""}{fb.loadCount ? ` · ${fb.loadCount} load${fb.loadCount !== 1 ? "s" : ""}` : ""}{fb.hoursBilled ? ` · ${fb.hoursBilled}hrs` : ""}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              {(fb.photos || []).slice(0, 3).map((p, idx) => (
                                <img key={idx} src={p.dataUrl} alt="" style={{ width: 32, height: 32, objectFit: "cover", border: "1px solid var(--steel)" }} />
                              ))}
                              {(fb.photos || []).length > 3 && (
                                <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>+{fb.photos.length - 3}</span>
                              )}
                              <Eye size={14} style={{ color: "var(--concrete)", marginLeft: 6 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: "center", padding: "30px 0 20px", color: "var(--concrete)", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
          ▸ 4 BROTHERS TRUCKING, LLC · BAY POINT, CA · QUESTIONS? CONTACT YOUR DISPATCHER
        </div>
      </div>
    </div>
  );
};

// ========== HOME / DASHBOARD TAB ==========
const HomeTab = ({
  freightBills, dispatches, contacts, projects, invoices, quotes, company,
  onJumpTab, onToast,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Day view state — which day's orders admin is looking at
  const [viewDate, setViewDate] = useState(todayStr);
  const [searchTerm, setSearchTerm] = useState("");

  // Orders for the currently-viewed day (ignore search)
  const ordersForDay = useMemo(() => {
    return dispatches
      .filter((d) => d.date === viewDate)
      .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [dispatches, viewDate]);

  // Search results — global across ALL dispatches, ignoring day filter
  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return dispatches
      .filter((d) => {
        const hay = [
          d.code, d.jobName, d.clientName, d.pickup, d.dropoff, d.material, d.notes,
          d.date,
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")) // newest first
      .slice(0, 30);
  }, [dispatches, searchTerm]);

  // Date nav helpers
  const shiftDate = (days) => {
    const d = new Date(viewDate + "T12:00:00"); // noon to dodge DST edge cases
    d.setDate(d.getDate() + days);
    setViewDate(d.toISOString().slice(0, 10));
  };
  const dateLabel = (() => {
    const d = new Date(viewDate + "T12:00:00");
    if (isNaN(d)) return viewDate;
    const isToday = viewDate === todayStr;
    return (isToday ? "TODAY · " : "") + d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase();
  })();

  // SECTION 1: Pending FB reviews
  const pendingFbs = useMemo(() =>
    freightBills.filter((fb) => (fb.status || "pending") === "pending")
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)),
    [freightBills]);

  // SECTION 2: Below-minimum FBs needing admin confirmation
  const belowMinFbs = useMemo(() => {
    return freightBills.filter((fb) => {
      if (fb.minHoursApplied) return false;
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      const p = projects.find((pp) => pp.id === d?.projectId);
      const minH = Number(p?.minimumHours) || 0;
      if (minH <= 0) return false;
      let h = Number(fb.hoursBilled) || 0;
      if (!h && fb.pickupTime && fb.dropoffTime) {
        const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
        const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
        const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (mins > 0) h = mins / 60;
      }
      return h > 0 && h < minH;
    });
  }, [freightBills, dispatches, projects]);

  // SECTION 3 & 4: Invoice statuses
  const invoiceStatus = (inv) => {
    if (inv.statusOverride) return inv.statusOverride;
    const paid = Number(inv.amountPaid || 0);
    const total = Number(inv.total || 0);
    if (total === 0) return "outstanding";
    if (paid >= total - 0.01) return "paid";
    if (paid > 0) return "partial";
    if (inv.dueDate) {
      const due = new Date(inv.dueDate);
      if (!isNaN(due) && due < new Date()) return "overdue";
    }
    return "outstanding";
  };
  const unpaidInvoices = useMemo(() =>
    invoices.filter((i) => ["outstanding", "partial", "overdue"].includes(invoiceStatus(i)))
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")),
    [invoices]);
  const overdueInvoices = useMemo(() =>
    invoices.filter((i) => invoiceStatus(i) === "overdue")
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")),
    [invoices]);

  // SECTION 5: Ready-to-pay subs (customer paid FBs waiting for payroll)
  const readyToPay = useMemo(() => {
    const bySub = new Map();
    freightBills.forEach((fb) => {
      if (fb.status !== "approved") return;
      if (fb.paidAt) return; // already paid to sub
      if (!fb.customerPaidAt) return; // customer hasn't paid yet
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      const assignment = (d?.assignments || []).find((a) => a.aid === fb.assignmentId);
      if (!assignment || !assignment.payRate) return;

      let qty = 0;
      const method = assignment.payMethod || "hour";
      if (method === "hour") {
        if (fb.hoursBilled) qty = Number(fb.hoursBilled);
        else if (fb.pickupTime && fb.dropoffTime) {
          const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
          const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
          const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (mins > 0) qty = mins / 60;
        }
      } else if (method === "ton") qty = Number(fb.tonnage) || 0;
      else if (method === "load") qty = Number(fb.loadCount) || 1;

      const key = assignment.contactId || `anon_${assignment.aid}`;
      const contact = contacts.find((c) => c.id === assignment.contactId);
      const brokPct = Number(contact?.brokeragePercent ?? 8);
      const brokApplies = !!contact?.brokerageApplies;
      const rawGross = qty * Number(assignment.payRate);
      const extraSum = (fb.extras || []).filter((x) => x.reimbursable !== false).reduce((s, x) => s + (Number(x.amount) || 0), 0);
      const gross = rawGross + extraSum;
      const net = brokApplies ? gross * (1 - brokPct / 100) : gross;

      if (!bySub.has(key)) {
        bySub.set(key, { name: assignment.name, count: 0, net: 0, kind: assignment.kind, subId: assignment.contactId });
      }
      const entry = bySub.get(key);
      entry.count += 1;
      entry.net += net;
    });
    return Array.from(bySub.values()).sort((a, b) => b.net - a.net);
  }, [freightBills, dispatches, contacts]);

  // SECTION 6: Open orders today
  const todaysOrders = useMemo(() =>
    dispatches.filter((d) => {
      if ((d.status || "open") === "closed") return false;
      const dd = (d.date || "").slice(0, 10);
      return dd === todayStr;
    }).sort((a, b) => (a.code || "").localeCompare(b.code || "")),
    [dispatches, todayStr]);

  const activeOrdersCount = useMemo(() =>
    dispatches.filter((d) => (d.status || "open") !== "closed").length,
    [dispatches]);

  // SECTION 7: Active quotes (not accepted/rejected)
  const activeQuotes = useMemo(() =>
    (quotes || []).filter((q) => {
      const s = (q.status || "pending").toLowerCase();
      return s !== "accepted" && s !== "rejected" && s !== "closed";
    }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [quotes]);

  // SECTION 8: MTD stats
  const mtd = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const startMonth = new Date(y, m, 1);
    let invoicedTotal = 0;
    let paidTotal = 0;
    invoices.forEach((i) => {
      const d = new Date(i.invoiceDate || i.createdAt || 0);
      if (d >= startMonth) {
        invoicedTotal += Number(i.total) || 0;
        paidTotal += Number(i.amountPaid) || 0;
      }
    });
    const activeProjectsCount = projects.filter((p) => (p.status || "active") === "active").length;
    return { invoicedTotal, paidTotal, activeProjectsCount };
  }, [invoices, projects]);

  // Totals
  const totalUnpaid = unpaidInvoices.reduce((s, i) => s + ((Number(i.total) || 0) - (Number(i.amountPaid) || 0)), 0);
  const totalOverdue = overdueInvoices.reduce((s, i) => s + ((Number(i.total) || 0) - (Number(i.amountPaid) || 0)), 0);
  const totalReadyToPay = readyToPay.reduce((s, x) => s + x.net, 0);

  // Reusable card wrapper
  const SectionCard = ({ title, icon, count, total, color = "var(--steel)", bg = "#FFF", onClick, children, empty }) => (
    <div
      className="fbt-card"
      style={{
        padding: 0, overflow: "hidden", cursor: onClick ? "pointer" : "default",
        transition: "transform 0.1s",
      }}
      onClick={onClick}
      onMouseDown={(e) => { if (onClick) e.currentTarget.style.transform = "translateY(1px)"; }}
      onMouseUp={(e) => { if (onClick) e.currentTarget.style.transform = ""; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.transform = ""; }}
    >
      <div style={{ padding: "12px 16px", background: color, color: color === "#FFF" || color === "#F5F5F4" ? "var(--steel)" : "var(--cream)", display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {icon}
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em", opacity: 0.85 }}>{title}</div>
            <div className="fbt-display" style={{ fontSize: 20 }}>{count ?? 0}{total != null ? ` · ${fmt$(total)}` : ""}</div>
          </div>
        </div>
        {onClick && <span className="fbt-mono" style={{ fontSize: 10, opacity: 0.7 }}>OPEN ▸</span>}
      </div>
      <div style={{ padding: 12, background: bg }}>
        {count === 0 ? (
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", textAlign: "center", padding: "12px 0" }}>
            {empty || "NOTHING PENDING ✓"}
          </div>
        ) : children}
      </div>
    </div>
  );

  const Row = ({ left, right, sub, onClick }) => (
    <div
      onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }}
      style={{
        padding: "6px 8px", fontSize: 11, fontFamily: "JetBrains Mono, monospace",
        borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between",
        gap: 8, cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {left}
        {sub && <div style={{ color: "var(--concrete)", fontSize: 10, marginTop: 1 }}>{sub}</div>}
      </div>
      {right && <div style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{right}</div>}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 20 }}>

      {/* Welcome header */}
      <div className="fbt-card" style={{ padding: "18px 22px", background: "linear-gradient(135deg, var(--steel), #3F3B38)", color: "var(--cream)" }}>
        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", letterSpacing: "0.15em" }}>
          ▸ COMMAND CENTER · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </div>
        <h2 className="fbt-display" style={{ fontSize: 22, margin: "4px 0 0" }}>
          {company?.name || "4 BROTHERS TRUCKING"}
        </h2>
      </div>

      {/* MTD stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num" style={{ color: "var(--good)" }}>{fmt$(mtd.invoicedTotal).slice(0, 10)}</div>
          <div className="stat-label">MTD Invoiced</div>
        </div>
        <div className="fbt-card" style={{ padding: 16, background: "var(--good)", color: "#FFF" }}>
          <div className="stat-num" style={{ color: "#FFF" }}>{fmt$(mtd.paidTotal).slice(0, 10)}</div>
          <div className="stat-label" style={{ color: "#FFF" }}>MTD Collected</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{activeOrdersCount}</div>
          <div className="stat-label">Active Orders</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{mtd.activeProjectsCount}</div>
          <div className="stat-label">Active Projects</div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          DAY VIEW — orders for selected day + global search
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="fbt-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", background: "var(--steel)", color: "var(--cream)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          {/* Date navigation */}
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            style={{ background: "transparent", border: "2px solid var(--cream)", color: "var(--cream)", padding: "4px 10px", cursor: "pointer", fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700 }}
            title="Previous day"
          >
            ◀
          </button>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", letterSpacing: "0.12em" }}>
              ▸ ORDERS ON DAY
            </div>
            <div className="fbt-display" style={{ fontSize: 16, lineHeight: 1.2 }}>{dateLabel}</div>
          </div>
          <input
            type="date"
            value={viewDate}
            onChange={(e) => setViewDate(e.target.value)}
            style={{ padding: "5px 8px", border: "1.5px solid var(--cream)", background: "var(--cream)", color: "var(--steel)", fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}
            title="Jump to date"
          />
          <button
            type="button"
            onClick={() => setViewDate(todayStr)}
            disabled={viewDate === todayStr}
            style={{
              background: viewDate === todayStr ? "transparent" : "var(--hazard)",
              color: viewDate === todayStr ? "var(--concrete)" : "var(--steel)",
              border: "2px solid " + (viewDate === todayStr ? "var(--concrete)" : "var(--hazard-deep)"),
              padding: "4px 12px",
              cursor: viewDate === todayStr ? "default" : "pointer",
              fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            TODAY
          </button>
          <button
            type="button"
            onClick={() => shiftDate(1)}
            style={{ background: "transparent", border: "2px solid var(--cream)", color: "var(--cream)", padding: "4px 10px", cursor: "pointer", fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700 }}
            title="Next day"
          >
            ▶
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: "10px 18px", background: "#F5F5F4", borderBottom: "1.5px solid var(--steel)", display: "flex", alignItems: "center", gap: 10 }}>
          <Search size={14} style={{ color: "var(--concrete)" }} />
          <input
            type="text"
            placeholder="Search ANY order (customer, job, code, material, date…) — ignores the day filter"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: "6px 10px", border: "1.5px solid var(--concrete)", fontFamily: "JetBrains Mono, monospace", fontSize: 12, background: "#FFF" }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="btn-ghost"
              style={{ padding: "4px 10px", fontSize: 10 }}
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Content — either search results OR day orders */}
        <div style={{ padding: "14px 18px" }}>
          {searchTerm ? (
            <>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>
                ▸ SEARCH RESULTS ({searchResults.length}{searchResults.length >= 30 ? "+" : ""}) · "{searchTerm}"
              </div>
              {searchResults.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--concrete)", fontStyle: "italic" }}>
                  No orders match "{searchTerm}". Try different keywords.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 4 }}>
                  {searchResults.map((d) => {
                    const fbCount = freightBills.filter((fb) => fb.dispatchId === d.id).length;
                    return (
                      <div
                        key={d.id}
                        onClick={() => onJumpTab("dispatches", { dispatchId: d.id })}
                        style={{
                          padding: "8px 12px", background: "#FFF", border: "1.5px solid var(--steel)",
                          cursor: "pointer", display: "grid",
                          gridTemplateColumns: "90px 70px 1fr 1fr 80px", gap: 10, alignItems: "center",
                          fontSize: 12, fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        <strong>#{d.code}</strong>
                        <span style={{ color: "var(--concrete)", fontSize: 10 }}>{d.date}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.jobName || "—"}</span>
                        <span style={{ color: "var(--concrete)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.clientName || "—"}</span>
                        <span style={{ textAlign: "right" }}>
                          {fbCount > 0 && (
                            <span className="chip" style={{ background: "var(--steel)", color: "#FFF", fontSize: 9, padding: "1px 6px" }}>
                              {fbCount} FB{fbCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>
                ▸ ORDERS THIS DAY ({ordersForDay.length})
              </div>
              {ordersForDay.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--concrete)", fontStyle: "italic" }}>
                  No orders scheduled for this day.
                  <br />
                  <button
                    type="button"
                    onClick={() => onJumpTab("dispatches")}
                    className="btn-ghost"
                    style={{ marginTop: 8, padding: "4px 10px", fontSize: 10 }}
                  >
                    + NEW ORDER
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 4 }}>
                  {ordersForDay.map((d) => {
                    const fbs = freightBills.filter((fb) => fb.dispatchId === d.id);
                    const approvedFbCount = fbs.filter((fb) => fb.status === "approved").length;
                    const pendingFbCount = fbs.filter((fb) => (fb.status || "pending") === "pending").length;
                    const expected = Number(d.trucksExpected) || (d.assignments || []).reduce((s, a) => s + (Number(a.trucks) || 0), 0);
                    return (
                      <div
                        key={d.id}
                        onClick={() => onJumpTab("dispatches", { dispatchId: d.id })}
                        style={{
                          padding: "10px 14px", background: "#FFF", border: "2px solid var(--steel)",
                          cursor: "pointer", display: "grid",
                          gridTemplateColumns: "90px 1fr 1fr 150px", gap: 12, alignItems: "center",
                          fontSize: 12, fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        <strong style={{ fontSize: 14, color: "var(--hazard-deep)" }}>#{d.code}</strong>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.jobName || "—"}</div>
                          <div style={{ fontSize: 10, color: "var(--concrete)" }}>{d.clientName || "—"}</div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <span style={{ color: "var(--concrete)" }}>FROM:</span> {d.pickup || "—"}
                          </div>
                          <div style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <span style={{ color: "var(--concrete)" }}>TO:</span> {d.dropoff || "—"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {expected > 0 && (
                            <span className="chip" style={{ background: "var(--steel)", color: "#FFF", fontSize: 9, padding: "2px 6px" }}>
                              {expected} TRUCK{expected !== 1 ? "S" : ""}
                            </span>
                          )}
                          {pendingFbCount > 0 && (
                            <span className="chip" style={{ background: "var(--safety)", color: "#FFF", fontSize: 9, padding: "2px 6px" }}>
                              {pendingFbCount} PEND
                            </span>
                          )}
                          {approvedFbCount > 0 && (
                            <span className="chip" style={{ background: "var(--good)", color: "#FFF", fontSize: 9, padding: "2px 6px" }}>
                              {approvedFbCount} ✓
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cards grid - priority order */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>

        {/* 1. Pending Review */}
        <SectionCard
          title="NEEDS REVIEW · FB APPROVAL"
          icon={<ShieldCheck size={18} />}
          count={pendingFbs.length}
          color={pendingFbs.length > 0 ? "var(--hazard)" : "var(--good)"}
          bg={pendingFbs.length > 0 ? "#FEF3C7" : "#F0FDF4"}
          onClick={() => onJumpTab("review")}
          empty="NO PENDING FBs ✓"
        >
          {pendingFbs.slice(0, 5).map((fb) => {
            const d = dispatches.find((x) => x.id === fb.dispatchId);
            return (
              <Row
                key={fb.id}
                left={<><strong>FB#{fb.freightBillNumber || "—"}</strong> · {fb.driverName || "—"}</>}
                sub={`Order #${d?.code || "—"} · ${fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : "—"}`}
                onClick={() => onJumpTab("review", fb.id)}
              />
            );
          })}
          {pendingFbs.length > 5 && <Row left={`+ ${pendingFbs.length - 5} more…`} />}
        </SectionCard>

        {/* 2. Below minimum hours */}
        <SectionCard
          title="BELOW MIN HOURS · NEEDS CONFIRM"
          icon={<AlertTriangle size={18} />}
          count={belowMinFbs.length}
          color={belowMinFbs.length > 0 ? "var(--safety)" : "var(--good)"}
          bg={belowMinFbs.length > 0 ? "#FEF2F2" : "#F0FDF4"}
          onClick={() => onJumpTab("review")}
          empty="NO MIN-HOUR EDGE CASES ✓"
        >
          {belowMinFbs.slice(0, 5).map((fb) => {
            const d = dispatches.find((x) => x.id === fb.dispatchId);
            const p = projects.find((pp) => pp.id === d?.projectId);
            return (
              <Row
                key={fb.id}
                left={<><strong>FB#{fb.freightBillNumber || "—"}</strong> · {fb.driverName || "—"}</>}
                sub={`${p?.name || "—"} · min ${p?.minimumHours}hr`}
                right={`${(Number(fb.hoursBilled) || 0).toFixed(1)}hr`}
                onClick={() => onJumpTab("review", fb.id)}
              />
            );
          })}
          {belowMinFbs.length > 5 && <Row left={`+ ${belowMinFbs.length - 5} more…`} />}
        </SectionCard>

        {/* 3. Unpaid invoices (all) */}
        <SectionCard
          title="UNPAID INVOICES"
          icon={<Receipt size={18} />}
          count={unpaidInvoices.length}
          total={totalUnpaid}
          color={unpaidInvoices.length > 0 ? "var(--hazard)" : "var(--good)"}
          bg={unpaidInvoices.length > 0 ? "#FEF3C7" : "#F0FDF4"}
          onClick={() => onJumpTab("invoices")}
          empty="ALL INVOICES PAID ✓"
        >
          {unpaidInvoices.slice(0, 5).map((inv) => {
            const bal = (Number(inv.total) || 0) - (Number(inv.amountPaid) || 0);
            const status = invoiceStatus(inv);
            return (
              <Row
                key={inv.id || inv.invoiceNumber}
                left={<><strong>{inv.invoiceNumber}</strong> · {inv.billToName}</>}
                sub={`${inv.invoiceDate}${inv.dueDate ? ` · due ${inv.dueDate}` : ""} · ${status}`}
                right={fmt$(bal)}
                onClick={() => onJumpTab("invoices", inv.id || inv.invoiceNumber)}
              />
            );
          })}
          {unpaidInvoices.length > 5 && <Row left={`+ ${unpaidInvoices.length - 5} more…`} />}
        </SectionCard>

        {/* 4. Overdue invoices */}
        <SectionCard
          title="OVERDUE INVOICES"
          icon={<Clock size={18} />}
          count={overdueInvoices.length}
          total={totalOverdue}
          color={overdueInvoices.length > 0 ? "var(--safety)" : "var(--good)"}
          bg={overdueInvoices.length > 0 ? "#FEE2E2" : "#F0FDF4"}
          onClick={() => onJumpTab("invoices")}
          empty="NOTHING OVERDUE ✓"
        >
          {overdueInvoices.slice(0, 5).map((inv) => {
            const bal = (Number(inv.total) || 0) - (Number(inv.amountPaid) || 0);
            const daysPast = inv.dueDate ? Math.floor((Date.now() - new Date(inv.dueDate)) / 86400000) : 0;
            return (
              <Row
                key={inv.id || inv.invoiceNumber}
                left={<><strong>{inv.invoiceNumber}</strong> · {inv.billToName}</>}
                sub={`Due ${inv.dueDate} · ${daysPast}d past`}
                right={fmt$(bal)}
                onClick={() => onJumpTab("invoices", inv.id || inv.invoiceNumber)}
              />
            );
          })}
          {overdueInvoices.length > 5 && <Row left={`+ ${overdueInvoices.length - 5} more…`} />}
        </SectionCard>

        {/* 5. Ready to Pay */}
        <SectionCard
          title="READY TO PAY · SUBS/DRIVERS"
          icon={<DollarSign size={18} />}
          count={readyToPay.length}
          total={totalReadyToPay}
          color={readyToPay.length > 0 ? "var(--good)" : "var(--steel)"}
          bg={readyToPay.length > 0 ? "#F0FDF4" : "#F5F5F4"}
          onClick={() => onJumpTab("payroll")}
          empty="PAYROLL CAUGHT UP ✓"
        >
          {readyToPay.slice(0, 5).map((s, idx) => (
            <Row
              key={idx}
              left={<><strong>{s.name}</strong></>}
              sub={`${s.kind === "driver" ? "Driver" : "Sub"} · ${s.count} FB${s.count !== 1 ? "s" : ""}`}
              right={fmt$(s.net)}
              onClick={() => onJumpTab("payroll", s.subId)}
            />
          ))}
          {readyToPay.length > 5 && <Row left={`+ ${readyToPay.length - 5} more…`} />}
        </SectionCard>

        {/* 6. Today's orders */}
        <SectionCard
          title="OPEN ORDERS · TODAY"
          icon={<ClipboardList size={18} />}
          count={todaysOrders.length}
          color="var(--steel)"
          bg="#F5F5F4"
          onClick={() => onJumpTab("dispatches")}
          empty="NO ORDERS SCHEDULED TODAY"
        >
          {todaysOrders.slice(0, 5).map((d) => (
            <Row
              key={d.id}
              left={<><strong>#{d.code}</strong> · {d.jobName || "—"}</>}
              sub={`${d.clientName || "—"} · ${d.trucksExpected || 1} trucks`}
              onClick={() => onJumpTab("dispatches", d.id)}
            />
          ))}
          {todaysOrders.length > 5 && <Row left={`+ ${todaysOrders.length - 5} more…`} />}
        </SectionCard>

        {/* 7. Active quotes */}
        <SectionCard
          title="ACTIVE QUOTES"
          icon={<Mail size={18} />}
          count={activeQuotes.length}
          color="var(--steel)"
          bg="#F5F5F4"
          onClick={() => onJumpTab("quotes")}
          empty="NO PENDING QUOTES"
        >
          {activeQuotes.slice(0, 5).map((q) => (
            <Row
              key={q.id}
              left={<><strong>{q.companyName || q.contactName || "—"}</strong></>}
              sub={`${q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "—"} · ${q.status || "pending"}`}
              right={q.estimatedValue ? fmt$(q.estimatedValue) : ""}
            />
          ))}
          {activeQuotes.length > 5 && <Row left={`+ ${activeQuotes.length - 5} more…`} />}
        </SectionCard>

        {/* 8. Recent activity feed */}
        <SectionCard
          title="RECENT FB SUBMISSIONS"
          icon={<Activity size={18} />}
          count={freightBills.filter((fb) => fb.submittedAt && (Date.now() - new Date(fb.submittedAt)) < 48 * 3600 * 1000).length}
          color="var(--steel)"
          bg="#F5F5F4"
          empty="NO RECENT SUBMISSIONS"
        >
          {freightBills
            .filter((fb) => fb.submittedAt)
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
            .slice(0, 5)
            .map((fb) => {
              const d = dispatches.find((x) => x.id === fb.dispatchId);
              const ago = Math.round((Date.now() - new Date(fb.submittedAt)) / 60000);
              const label = ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.round(ago / 60)}h ago` : `${Math.round(ago / 1440)}d ago`;
              return (
                <Row
                  key={fb.id}
                  left={<><strong>FB#{fb.freightBillNumber || "—"}</strong> · {fb.driverName || "—"}</>}
                  sub={`Order #${d?.code || "—"} · ${label}`}
                  right={(fb.status || "pending").slice(0, 3).toUpperCase()}
                />
              );
            })}
        </SectionCard>
      </div>
    </div>
  );
};

const Dashboard = ({ state, setters, onToast, onExit, onLogout, onChangePassword }) => {
  const [tab, setTab] = useState("home");
  const { logs, quotes, fleet, dispatches, freightBills, invoices, company, contacts, unreadIds, soundEnabled, browserNotifsEnabled, quarries, lastViewedMondayReport, projects } = state;
  const { setLogs, setQuotes, setFleet, setDispatches, setFreightBills, setInvoices, createInvoice, setCompany, setContacts, markAllRead, markDispatchRead, toggleSound, toggleBrowserNotifs, setQuarries, setLastViewedMondayReport, setProjects, editFreightBill } = setters;
  const [pendingDispatch, setPendingDispatch] = useState(null);
  const [pendingFB, setPendingFB] = useState(null); // FB id for Review tab to open
  const [pendingInvoice, setPendingInvoice] = useState(null); // Invoice id for Invoices tab
  const [pendingPaySubId, setPendingPaySubId] = useState(null); // Sub/driver id for Payroll tab
  const tabs = [
    { k: "home", l: "Home", ico: <Activity size={16} /> },
    { k: "dispatches", l: "Orders", ico: <ClipboardList size={16} /> },
    { k: "review", l: "Review", ico: <ShieldCheck size={16} /> },
    { k: "payroll", l: "Payroll", ico: <DollarSign size={16} /> },
    { k: "projects", l: "Projects", ico: <Briefcase size={16} /> },
    { k: "invoices", l: "Invoices", ico: <Receipt size={16} /> },
    { k: "contacts", l: "Contacts", ico: <Users size={16} /> },
    { k: "hours", l: "Hours", ico: <FileText size={16} /> },
    { k: "billing", l: "Billing", ico: <Fuel size={16} /> },
    { k: "quotes", l: "Quotes", ico: <Mail size={16} /> },
    { k: "fleet", l: "Fleet", ico: <Truck size={16} /> },
    { k: "materials", l: "Materials", ico: <Mountain size={16} /> },
    { k: "reports", l: "Reports", ico: <BarChart3 size={16} /> },
    { k: "recovery", l: "Recovery", ico: <History size={16} /> },
    { k: "data", l: "Data", ico: <Database size={16} /> },
  ];

  return (
    <div>
      <div style={{ background: "var(--steel)", color: "var(--cream)", borderBottom: "3px solid var(--hazard)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Logo size="sm" />
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.15em", borderLeft: "1px solid var(--concrete)", paddingLeft: 16 }}>▸ INTERNAL CONSOLE · LIVE</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <NotificationBell
              unreadIds={unreadIds || []}
              freightBills={freightBills}
              dispatches={dispatches}
              onJumpToDispatch={(did) => { setTab("dispatches"); setPendingDispatch(did); }}
              onMarkAllRead={markAllRead}
              onToggleSound={toggleSound}
              soundEnabled={soundEnabled}
              onToggleBrowser={toggleBrowserNotifs}
              browserEnabled={browserNotifsEnabled}
            />
            <button onClick={onChangePassword} className="btn-ghost" style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "8px 14px", fontSize: 11 }} title="Change password">
              <KeyRound size={12} style={{ marginRight: 4 }} /> PASSWORD
            </button>
            <button onClick={onExit} className="btn-ghost" style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "8px 14px", fontSize: 11 }}>
              ← PUBLIC SITE
            </button>
            <button onClick={onLogout} className="btn-ghost" style={{ color: "var(--hazard)", borderColor: "var(--hazard)", padding: "8px 14px", fontSize: 11 }}>
              <LogOut size={12} style={{ marginRight: 4 }} /> LOG OUT
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 14px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tabs.map((t) => <button key={t.k} onClick={() => setTab(t.k)} className={`nav-tab ${tab === t.k ? "active" : ""}`}>{t.ico} {t.l}</button>)}
        </div>
      </div>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px 80px" }}>
        {tab === "home" && <HomeTab freightBills={freightBills} dispatches={dispatches} contacts={contacts} projects={projects || []} invoices={invoices || []} quotes={quotes || []} company={company} onJumpTab={(k, payload) => {
          setTab(k);
          if (!payload) return;
          if (k === "dispatches") setPendingDispatch(payload);
          else if (k === "review") setPendingFB(payload);
          else if (k === "invoices") setPendingInvoice(payload);
          else if (k === "payroll") setPendingPaySubId(payload);
        }} onToast={onToast} />}
        {tab === "dispatches" && <DispatchesTab dispatches={dispatches} setDispatches={setDispatches} freightBills={freightBills} setFreightBills={setFreightBills} contacts={contacts} company={company} unreadIds={unreadIds || []} markDispatchRead={markDispatchRead} pendingDispatch={pendingDispatch} clearPendingDispatch={() => setPendingDispatch(null)} quarries={quarries || []} projects={projects || []} fleet={fleet || []} invoices={invoices || []} onToast={onToast} />}
        {tab === "projects" && <ProjectsTab projects={projects || []} setProjects={setProjects} contacts={contacts} dispatches={dispatches} freightBills={freightBills} invoices={invoices} onToast={onToast} />}
        {tab === "review" && <ReviewTab freightBills={freightBills} dispatches={dispatches} contacts={contacts} projects={projects || []} editFreightBill={editFreightBill} invoices={invoices || []} pendingFB={pendingFB} clearPendingFB={() => setPendingFB(null)} onToast={onToast} />}
        {tab === "payroll" && <PayrollTab freightBills={freightBills} dispatches={dispatches} contacts={contacts} projects={projects || []} invoices={invoices || []} editFreightBill={editFreightBill} company={company} pendingPaySubId={pendingPaySubId} clearPendingPaySubId={() => setPendingPaySubId(null)} onJumpToInvoice={(invId) => { setTab("invoices"); setPendingInvoice(invId); }} onToast={onToast} />}
        {tab === "invoices" && <InvoicesTab freightBills={freightBills} dispatches={dispatches} invoices={invoices} setInvoices={setInvoices} createInvoice={createInvoice} company={company} setCompany={setCompany} contacts={contacts || []} projects={projects || []} editFreightBill={editFreightBill} pendingInvoice={pendingInvoice} clearPendingInvoice={() => setPendingInvoice(null)} onJumpToPayroll={(subId) => { setTab("payroll"); setPendingPaySubId(subId); }} onToast={onToast} />}
        {tab === "contacts" && <ContactsTab contacts={contacts} setContacts={setContacts} dispatches={dispatches} freightBills={freightBills} company={company} onToast={onToast} />}
        {tab === "hours" && <HoursTab logs={logs} setLogs={setLogs} onToast={onToast} />}
        {tab === "billing" && <BillingTab logs={logs} onToast={onToast} />}
        {tab === "quotes" && <QuotesTab quotes={quotes} setQuotes={setQuotes} dispatches={dispatches} setDispatches={setDispatches} contacts={contacts} projects={projects || []} onJumpTab={(k, orderId) => { setTab(k); if (orderId) setPendingDispatch(orderId); }} onToast={onToast} />}
        {tab === "fleet" && <FleetTab fleet={fleet} setFleet={setFleet} contacts={contacts} onToast={onToast} />}
        {tab === "materials" && <MaterialsTab quarries={quarries || []} setQuarries={setQuarries} dispatches={dispatches} onToast={onToast} />}
        {tab === "reports" && <ReportsTab dispatches={dispatches} freightBills={freightBills} logs={logs} invoices={invoices} quotes={quotes} quarries={quarries || []} contacts={contacts || []} projects={projects || []} company={company} editFreightBill={editFreightBill} onToast={onToast} lastViewedMondayReport={lastViewedMondayReport} setLastViewedMondayReport={setLastViewedMondayReport} />}
        {tab === "recovery" && <RecoveryTab onToast={onToast} />}
        {tab === "data" && <DataTab state={state} setters={setters} onToast={onToast} />}
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState("public");
  const [logs, setLogs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [freightBills, setFreightBills] = useState([]);
  const [invoices, setInvoicesState] = useState([]);
  const [contacts, setContactsState] = useState([]);
  const [quarries, setQuarriesState] = useState([]);
  const [projects, setProjectsState] = useState([]);
  const [lastViewedMondayReport, setLastViewedMondayReportState] = useState(null);
  const [company, setCompanyState] = useState({ name: "4 Brothers Trucking, LLC", address: "Bay Point, CA", phone: "", email: "", usdot: "", logoDataUrl: null, defaultTerms: "Net 30. Remit by check or ACH." });
  const [toast, setToast] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [route, setRoute] = useState(() => window.location.hash);

  // Auth state
  // Auth state (Supabase)
  const [authed, setAuthed] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);

  // Notification state
  const [seenFbIds, setSeenFbIds] = useState([]); // ids of freight bills the user has already seen
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [browserNotifsEnabled, setBrowserNotifsEnabled] = useState(false);
  const prevFbIdsRef = useRef(new Set());
  const firstLoadRef = useRef(true);
  // v17 fix: ref holds latest dispatches for subscription callbacks without re-triggering the effect.
  // Reading from state inside a subscription closure gives stale data; using a ref keeps it fresh
  // without forcing the subscription to tear down + rebuild on every change.
  const dispatchesRef = useRef([]);
  const soundEnabledRef = useRef(true);
  const browserNotifsEnabledRef = useRef(false);

  useEffect(() => {
    const handler = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  useEffect(() => {
    (async () => {
      // Check Supabase session first
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setAuthed(true);
        // v17 fix: if we have a valid session on page load, go straight to dashboard.
        // Don't send authed users to the public page — that was the "refresh dumps me to login" bug.
        setView("dashboard");
      }

      // Listen for auth changes (login/logout from other tabs)
      supabase.auth.onAuthStateChange((event, sess) => {
        if (event === "SIGNED_IN") { setAuthed(true); setView("dashboard"); }
        if (event === "SIGNED_OUT") { setAuthed(false); setView("public"); }
      });

      // Load dispatches + freight bills + contacts + quarries + invoices + projects + quotes from Supabase
      const [cloudDispatches, cloudFreightBills, cloudContacts, cloudQuarries, cloudInvoices, cloudProjects, cloudQuotes] = await Promise.all([
        fetchDispatches(),
        fetchFreightBills(),
        fetchContacts(),
        fetchQuarries(),
        fetchInvoices(),
        fetchProjects(),
        fetchQuotes(),
      ]);
      setDispatches(cloudDispatches);
      setFreightBills(cloudFreightBills);
      setContactsState(cloudContacts);
      setQuarriesState(cloudQuarries);
      setInvoicesState(cloudInvoices);
      setProjectsState(cloudProjects);
      setQuotes(cloudQuotes);
      prevFbIdsRef.current = new Set(cloudFreightBills.map((x) => x.id));

      // v17: Auto-purge soft-deleted rows older than 30 days (fire-and-forget).
      // Runs once on app load. Safe to run multiple times — idempotent.
      autoPurgeDeleted(30).then((r) => {
        const total = (r.dispatches || 0) + (r.freightBills || 0) + (r.invoices || 0) + (r.quotes || 0);
        if (total > 0) {
          console.log(`[auto-purge] Removed ${total} old soft-deleted row(s):`, r);
        }
        if (r.errors?.length) console.warn("[auto-purge] errors:", r.errors);
      }).catch((e) => console.warn("[auto-purge] failed:", e));

      // Load local-cached preferences (these don't need cloud sync)
      const [seen, notifPrefs, lvmr] = await Promise.all([
        storageGet("fbt:seenFbIds"), storageGet("fbt:notifPrefs"),
        storageGet("fbt:lastViewedMondayReport"),
      ]);
      if (seen) setSeenFbIds(seen);
      if (notifPrefs) {
        if (typeof notifPrefs.soundEnabled === "boolean") setSoundEnabled(notifPrefs.soundEnabled);
        if (typeof notifPrefs.browserNotifsEnabled === "boolean") setBrowserNotifsEnabled(notifPrefs.browserNotifsEnabled);
      }
      if (lvmr) setLastViewedMondayReportState(lvmr);

      // Hours + fleet + company still use local storage (not critical to sync across devices)
      // v18: quotes moved to Supabase — no longer loaded from localStorage
      const [l, f, co] = await Promise.all([
        storageGet("fbt:logs"), storageGet("fbt:fleet"),
        storageGet("fbt:company"),
      ]);
      if (l) setLogs(l); if (f) setFleet(f);
      if (co) setCompanyState((prev) => ({ ...prev, ...co }));

      setLoaded(true);
    })();
  }, []);

  // v17 fix: keep refs synced to latest state so subscription callbacks see fresh values
  // without triggering subscription tear-down.
  useEffect(() => { dispatchesRef.current = dispatches; }, [dispatches]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { browserNotifsEnabledRef.current = browserNotifsEnabled; }, [browserNotifsEnabled]);

  // Supabase realtime subscriptions — fire when data changes from ANY device
  useEffect(() => {
    if (!authed || !loaded) return;

    firstLoadRef.current = true;
    setTimeout(() => { firstLoadRef.current = false; }, 2000);

    const unsubFB = subscribeToFreightBills(async (payload) => {
      // Refetch to get fresh data
      const fresh = await fetchFreightBills();
      const freshIds = new Set(fresh.map((x) => x.id));
      const newOnes = fresh.filter((fb) => !prevFbIdsRef.current.has(fb.id));

      if (newOnes.length > 0 && !firstLoadRef.current) {
        newOnes.forEach((fb) => {
          // Read latest dispatches from ref, not stale closure
          const d = dispatchesRef.current.find((x) => x.id === fb.dispatchId);
          const title = `New freight bill: FB #${fb.freightBillNumber}`;
          const body = `${fb.driverName || "Driver"} · Truck ${fb.truckNumber || "?"}${d ? ` · ${d.jobName}` : ""}`;
          if (browserNotifsEnabledRef.current) fireBrowserNotif(title, body, `fb-${fb.id}`);
        });
        if (soundEnabledRef.current) playDing();
      }
      setFreightBills(fresh);
      prevFbIdsRef.current = freshIds;
    });

    const unsubD = subscribeToDispatches(async () => {
      const fresh = await fetchDispatches();
      setDispatches(fresh);
    });

    const unsubC = subscribeToContacts(async () => {
      const fresh = await fetchContacts();
      setContactsState(fresh);
    });

    const unsubQ = subscribeToQuarries(async () => {
      const fresh = await fetchQuarries();
      setQuarriesState(fresh);
    });

    const unsubI = subscribeToInvoices(async () => {
      const fresh = await fetchInvoices();
      setInvoicesState(fresh);
    });

    const unsubP = subscribeToProjects(async () => {
      const fresh = await fetchProjects();
      setProjectsState(fresh);
    });

    // v18: Quotes subscription — admin sees new quote requests instantly
    const unsubQuotes = subscribeToQuotes(async () => {
      const fresh = await fetchQuotes();
      setQuotes(fresh);
    });

    return () => {
      unsubFB?.();
      unsubD?.();
      unsubC?.();
      unsubQ?.();
      unsubI?.();
      unsubP?.();
      unsubQuotes?.();
    };
    // v17 FIX: only re-subscribe when auth/load state changes.
    // Previously depended on [dispatches, soundEnabled, browserNotifsEnabled] which caused
    // the subscriptions to tear down + rebuild on every state change — dropping realtime events
    // during the gap. Using refs (above) keeps callbacks seeing fresh data without churn.
  }, [authed, loaded]);

  // Keep seenFbIds storage in sync
  useEffect(() => {
    if (loaded) storageSet("fbt:seenFbIds", seenFbIds);
  }, [seenFbIds, loaded]);

  useEffect(() => {
    if (loaded) storageSet("fbt:notifPrefs", { soundEnabled, browserNotifsEnabled });
  }, [soundEnabled, browserNotifsEnabled, loaded]);

  // Unread = freight bills that exist but aren't in seen set
  const unreadIds = useMemo(() => {
    const seen = new Set(seenFbIds);
    return freightBills.filter((fb) => !seen.has(fb.id)).map((fb) => fb.id);
  }, [freightBills, seenFbIds]);

  const markAllRead = () => {
    setSeenFbIds(freightBills.map((fb) => fb.id));
  };
  const markDispatchRead = (dispatchId) => {
    const dispatchFbIds = freightBills.filter((fb) => fb.dispatchId === dispatchId).map((fb) => fb.id);
    setSeenFbIds((prev) => Array.from(new Set([...prev, ...dispatchFbIds])));
  };

  const toggleSound = () => {
    setSoundEnabled((v) => !v);
    if (!soundEnabled) playDing(); // preview
  };

  const toggleBrowserNotifs = async () => {
    if (!browserNotifsEnabled) {
      const perm = await requestBrowserNotif();
      if (perm === "granted") {
        setBrowserNotifsEnabled(true);
        showToast("BROWSER ALERTS ON");
      } else if (perm === "denied") {
        showToast("PERMISSION DENIED — CHECK BROWSER SETTINGS");
      } else if (perm === "unsupported") {
        showToast("BROWSER DOESN'T SUPPORT NOTIFICATIONS");
      }
    } else {
      setBrowserNotifsEnabled(false);
      showToast("BROWSER ALERTS OFF");
    }
  };

  const setCompany = async (val) => { setCompanyState(val); await storageSet("fbt:company", val); };
  const setLastViewedMondayReport = async (val) => { setLastViewedMondayReportState(val); await storageSet("fbt:lastViewedMondayReport", val); };

  // Dispatch & freight bill operations — now go through Supabase
  // The setter receives the NEW FULL ARRAY (how the UI calls it today).
  // We diff against current state to figure out insert/update/delete.
  const setDispatchesShared = async (val) => {
    // Diff: find new/updated/deleted items
    const currentMap = new Map(dispatches.map((d) => [d.id, d]));
    const newMap = new Map(val.map((d) => [d.id, d]));

    try {
      // Deletes: in current but not in new
      for (const [id, d] of currentMap) {
        if (!newMap.has(id) && !String(id).startsWith("temp-")) {
          await deleteDispatch(id);
        }
      }
      // Inserts & updates
      const saved = [];
      for (const d of val) {
        if (!currentMap.has(d.id) || String(d.id).startsWith("temp-")) {
          // New — insert
          const { id: _drop, ...rest } = d;
          const newRow = await insertDispatch(rest);
          saved.push(newRow);
        } else {
          // Possibly update — only if it actually changed
          const prev = currentMap.get(d.id);
          const fieldsChanged = JSON.stringify(prev) !== JSON.stringify(d);
          if (fieldsChanged) {
            const updated = await updateDispatch(d.id, d);
            saved.push(updated);
          } else {
            saved.push(d);
          }
        }
      }
      setDispatches(saved);
    } catch (e) {
      console.error("setDispatchesShared failed:", e);
      // Fall back to optimistic local update
      setDispatches(val);
    }
  };

  const setFreightBillsShared = async (val) => {
    const currentMap = new Map(freightBills.map((fb) => [fb.id, fb]));
    const newMap = new Map(val.map((fb) => [fb.id, fb]));

    try {
      for (const [id] of currentMap) {
        if (!newMap.has(id) && !String(id).startsWith("temp-")) {
          await deleteFreightBill(id);
        }
      }
      const saved = [];
      for (const fb of val) {
        if (!currentMap.has(fb.id) || String(fb.id).startsWith("temp-")) {
          const { id: _drop, ...rest } = fb;
          const newRow = await insertFreightBill(rest);
          saved.push(newRow);
        } else {
          saved.push(fb);
        }
      }
      setFreightBills(saved);
      prevFbIdsRef.current = new Set(saved.map((x) => x.id));
    } catch (e) {
      console.error("setFreightBillsShared failed:", e);
      setFreightBills(val);
    }
  };

  const showToast = (msg) => setToast(msg);

  // --- Contacts (Supabase) ---
  const setContacts = async (val) => {
    const currentMap = new Map(contacts.map((c) => [c.id, c]));
    const newMap = new Map(val.map((c) => [c.id, c]));
    try {
      for (const [id] of currentMap) {
        if (!newMap.has(id) && !String(id).startsWith("temp-")) {
          await deleteContact(id);
        }
      }
      const saved = [];
      for (const c of val) {
        if (!currentMap.has(c.id) || String(c.id).startsWith("temp-")) {
          const { id: _drop, ...rest } = c;
          const newRow = await insertContact(rest);
          saved.push(newRow);
        } else {
          const prev = currentMap.get(c.id);
          if (JSON.stringify(prev) !== JSON.stringify(c)) {
            const updated = await updateContact(c.id, c);
            saved.push(updated);
          } else {
            saved.push(c);
          }
        }
      }
      setContactsState(saved);
    } catch (e) {
      console.error("setContacts failed:", e);
      setContactsState(val);
    }
  };

  // --- Quarries (Supabase) ---
  const setQuarries = async (val) => {
    const currentMap = new Map(quarries.map((q) => [q.id, q]));
    const newMap = new Map(val.map((q) => [q.id, q]));
    try {
      for (const [id] of currentMap) {
        if (!newMap.has(id) && !String(id).startsWith("temp-")) {
          await deleteQuarry(id);
        }
      }
      const saved = [];
      for (const q of val) {
        if (!currentMap.has(q.id) || String(q.id).startsWith("temp-")) {
          const { id: _drop, ...rest } = q;
          const newRow = await insertQuarry(rest);
          saved.push(newRow);
        } else {
          const prev = currentMap.get(q.id);
          if (JSON.stringify(prev) !== JSON.stringify(q)) {
            const updated = await updateQuarry(q.id, q);
            saved.push(updated);
          } else {
            saved.push(q);
          }
        }
      }
      setQuarriesState(saved);
    } catch (e) {
      console.error("setQuarries failed:", e);
      setQuarriesState(val);
    }
  };

  // --- Invoices (Supabase) ---
  // Invoices are append-only mostly — we just insert new ones
  const setInvoices = async (val) => {
    const currentIds = new Set(invoices.map((i) => i.id));
    try {
      // Find deleted ones
      const newIds = new Set(val.map((i) => i.id));
      for (const id of currentIds) {
        if (!newIds.has(id) && !String(id).startsWith("temp-")) {
          await deleteInvoice(id);
        }
      }
      // Insert new ones
      const saved = [];
      for (const inv of val) {
        if (!currentIds.has(inv.id) || String(inv.id).startsWith("temp-")) {
          const { id: _drop, ...rest } = inv;
          const newRow = await insertInvoice(rest);
          saved.push(newRow);
        } else {
          saved.push(inv);
        }
      }
      setInvoicesState(saved);
    } catch (e) {
      console.error("setInvoices failed:", e);
      setInvoicesState(val);
    }
  };

  // Create one invoice and return the saved row (with real id) synchronously.
  // Use this from the invoice generate flow so we can immediately lock FBs to the real invoice id.
  const createInvoice = async (invoice) => {
    try {
      const { id: _drop, ...rest } = invoice;
      const saved = await insertInvoice(rest);
      setInvoicesState((prev) => [saved, ...prev]);
      return saved;
    } catch (e) {
      console.error("createInvoice failed:", e);
      throw e;
    }
  };

  // --- Projects (Supabase) ---
  const setProjects = async (val) => {
    const currentMap = new Map(projects.map((p) => [p.id, p]));
    const newMap = new Map(val.map((p) => [p.id, p]));
    try {
      for (const [id] of currentMap) {
        if (!newMap.has(id) && !String(id).startsWith("temp-")) {
          await deleteProject(id);
        }
      }
      const saved = [];
      for (const p of val) {
        if (!currentMap.has(p.id) || String(p.id).startsWith("temp-")) {
          const { id: _drop, ...rest } = p;
          const newRow = await insertProject(rest);
          saved.push(newRow);
        } else {
          const prev = currentMap.get(p.id);
          if (JSON.stringify(prev) !== JSON.stringify(p)) {
            const updated = await updateProject(p.id, p);
            saved.push(updated);
          } else {
            saved.push(p);
          }
        }
      }
      setProjectsState(saved);
    } catch (e) {
      console.error("setProjects failed:", e);
      setProjectsState(val);
    }
  };

  const handleQuoteSubmit = async (quote) => {
    try {
      // v18: write to Supabase (was localStorage-only and silently dropping all submissions)
      const saved = await insertQuote(quote);
      // Update local state so admin UI shows it immediately (realtime will also push to other tabs)
      setQuotes((prev) => [saved, ...prev]);
      return saved;
    } catch (e) {
      console.error("handleQuoteSubmit failed:", e);
      throw e;
    }
  };

  // Admin edits/approves an FB
  const editFreightBill = async (id, patch) => {
    try {
      const updated = await updateFreightBill(id, patch);
      setFreightBills((prev) => prev.map((x) => x.id === id ? updated : x));
      return updated;
    } catch (e) {
      console.error("editFreightBill failed:", e);
      throw e;
    }
  };
  // Driver upload — insert directly to Supabase (public insert allowed, bypasses the diff logic)
  const handleTruckSubmit = async (fb) => {
    try {
      const { id: _drop, ...rest } = fb;
      // Driver/sub-submitted FBs always start as "pending" — admin must approve
      const newRow = await insertFreightBill({ ...rest, status: "pending" });
      // Realtime subscription will pick this up on dispatcher's devices, but also update our own state
      setFreightBills((prev) => [newRow, ...prev.filter((x) => x.id !== newRow.id)]);
    } catch (e) {
      console.error("handleTruckSubmit failed:", e);
      throw e;
    }
  };

  // Auth handlers
  const handleLoginSuccess = (user) => {
    setAuthed(true);
    setView("dashboard");
    showToast("LOGGED IN");
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) { console.warn("logout failed", e); }
    setAuthed(false);
    setView("public");
    showToast("LOGGED OUT");
  };

  const tryEnterDashboard = () => {
    if (authed) { setView("dashboard"); }
    else { setView("login"); }
  };

  const submitMatch = route.match(/^#\/submit\/([A-Z0-9]+)(?:\/a\/([A-Za-z0-9]+))?/i);
  const trackMatch = route.match(/^#\/track\/([A-Z0-9]+)/i);
  const customerMatch = route.match(/^#\/customer\/([a-f0-9]+)/i);
  const clientMatch = route.match(/^#\/client\/([A-Z0-9]+)/i);

  if (!loaded) {
    return (
      <div className="fbt-root texture-paper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <GlobalStyles />
        <div className="fbt-mono anim-roll" style={{ color: "var(--hazard-deep)", letterSpacing: "0.2em" }}>▸ LOADING…</div>
      </div>
    );
  }

  // Driver upload link route — public, bypasses all auth
  if (submitMatch) {
    const code = submitMatch[1].toUpperCase();
    const aid = submitMatch[2] || null;
    const d = dispatches.find((x) => x.code.toUpperCase() === code);
    const assignment = d && aid ? (d.assignments || []).find((a) => a.aid === aid) : null;

    // Freight bills for this specific assignment (or the whole dispatch if no aid)
    const scopedFBs = d
      ? freightBills.filter((fb) => {
          if (fb.dispatchId !== d.id) return false;
          if (aid) return fb.assignmentId === aid;
          return true;
        })
      : [];
    const expectedTrucks = assignment ? Number(assignment.trucks) || 1 : (d?.trucksExpected || 1);
    const enriched = d ? {
      ...d,
      submittedCount: scopedFBs.length,
      trucksExpected: expectedTrucks,
      // Override job name header with assignment-specific info if using a sublink
      _assignmentLabel: assignment ? assignment.name : null,
      _assignmentKind: assignment?.kind || null,
      _assignmentAid: aid,
    } : null;

    const availableDrivers = (d?.assignedDriverIds || []).map((id, idx) => ({
      id,
      companyName: (d.assignedDriverNames || [])[idx] || `Driver ${idx + 1}`,
    }));

    // Look up the full contact object for the assignment (for prefill: default truck, etc.)
    const assignmentContact = assignment?.contactId
      ? (contacts || []).find((c) => c.id === assignment.contactId)
      : null;

    // Check if order is closed — show closed message
    if (d && d.status === "closed") {
      return (
        <div className="fbt-root texture-paper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <GlobalStyles />
          <div className="fbt-card" style={{ padding: 40, textAlign: "center", maxWidth: 440 }}>
            <CheckCircle2 size={48} style={{ color: "var(--good)", marginBottom: 16 }} />
            <h2 className="fbt-display" style={{ fontSize: 22, margin: "0 0 10px" }}>JOB COMPLETE</h2>
            <p style={{ color: "var(--concrete)", margin: "0 0 16px" }}>
              This dispatch has been closed. If you have a freight bill for this job, contact dispatch.
            </p>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em" }}>▸ #{code}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="fbt-root">
        <GlobalStyles />
        <DriverUploadPage
          dispatch={enriched}
          onSubmitTruck={(fb) => handleTruckSubmit({ ...fb, assignmentId: aid })}
          onBack={() => { window.location.hash = ""; }}
          availableDrivers={availableDrivers}
          assignment={assignment}
          assignmentContact={assignmentContact}
        />
      </div>
    );
  }

  // Single-dispatch tracking page — public
  if (trackMatch) {
    const code = trackMatch[1].toUpperCase();
    const d = dispatches.find((x) => x.code.toUpperCase() === code);
    return (
      <div className="fbt-root">
        <GlobalStyles />
        <DispatchTrackingPage dispatch={d} freightBills={freightBills} company={company} onBack={() => { window.location.hash = ""; }} />
      </div>
    );
  }

  // Customer portal — token-based, public, view-only
  if (customerMatch) {
    const token = customerMatch[1];
    return <CustomerPortal token={token} onBack={() => { window.location.hash = ""; }} />;
  }

  // Client-wide tracking page — public
  if (clientMatch) {
    const token = clientMatch[1].toUpperCase();
    return (
      <div className="fbt-root">
        <GlobalStyles />
        <ClientTrackingPage token={token} dispatches={dispatches} freightBills={freightBills} company={company} onBack={() => { window.location.hash = ""; }} />
      </div>
    );
  }

  // Setup flow removed — we now use Supabase user accounts created via dashboard

  // Login flow
  if (view === "login") {
    return (
      <div className="fbt-root">
        <GlobalStyles />
        <LoginScreen onSuccess={handleLoginSuccess} onCancel={() => setView("public")} />
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="fbt-root">
      <GlobalStyles />
      {view === "public" ? (
        <PublicSite onQuoteSubmit={handleQuoteSubmit} onStaffLogin={tryEnterDashboard} />
      ) : (
        <>
          <Dashboard
            state={{ logs, quotes, fleet, dispatches, freightBills, invoices, company, contacts, unreadIds, soundEnabled, browserNotifsEnabled, quarries, lastViewedMondayReport, projects }}
            setters={{ setLogs, setQuotes, setFleet, setDispatches: setDispatchesShared, setFreightBills: setFreightBillsShared, setInvoices, createInvoice, setCompany, setContacts, markAllRead, markDispatchRead, toggleSound, toggleBrowserNotifs, setQuarries, setLastViewedMondayReport, setProjects, editFreightBill }}
            onToast={showToast}
            onExit={() => setView("public")}
            onLogout={handleLogout}
            onChangePassword={() => setShowChangePw(true)}
          />
          {showChangePw && (
            <ChangePasswordModal
              onClose={() => setShowChangePw(false)}
              onToast={showToast}
            />
          )}
        </>
      )}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
