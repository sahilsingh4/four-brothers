import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase";
import { fetchDispatches, insertDispatch, updateDispatch, deleteDispatch, fetchFreightBills, insertFreightBill, updateFreightBill, deleteFreightBill, subscribeToDispatches, subscribeToFreightBills, fetchContacts, insertContact, updateContact, deleteContact, fetchQuarries, insertQuarry, updateQuarry, deleteQuarry, fetchInvoices, insertInvoice, updateInvoice, deleteInvoice, subscribeToContacts, subscribeToQuarries, subscribeToInvoices, fetchProjects, insertProject, updateProject, deleteProject, subscribeToProjects, fetchCustomerByToken } from "./db";
import { Truck, ClipboardList, Receipt, Menu, Phone, Mail, MapPin, Fuel, Plus, Trash2, Download, CheckCircle2, AlertCircle, AlertTriangle, ArrowRight, Wrench, FileText, Search, Link2, Camera, Upload, X, Eye, Share2, Lock, LogOut, Settings, KeyRound, Building2, Printer, FileDown, QrCode, Database, HardDrive, RefreshCw, Users, Star, MessageSquare, UserPlus, Edit2, ChevronDown, Bell, BellOff, Volume2, VolumeX, Activity, TrendingUp, Package, Mountain, TrendingDown, BarChart3, History, Calendar, DollarSign, Banknote, Award, Zap, Briefcase, Hash, Shield, ShieldCheck, Clock, Save } from "lucide-react";

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

const PublicSite = ({ onQuoteSubmit }) => {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", service: "hauling", pickup: "", dropoff: "", material: "", quantity: "", needDate: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email) return;
    await onQuoteSubmit({ ...form, id: Date.now(), submittedAt: new Date().toISOString(), status: "new" });
    setSubmitted(true);
    setForm({ name: "", company: "", email: "", phone: "", service: "hauling", pickup: "", dropoff: "", material: "", quantity: "", needDate: "", notes: "" });
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div>
      <section style={{ background: "var(--steel)", color: "var(--cream)", position: "relative", overflow: "hidden" }} className="grain">
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px 100px", position: "relative", zIndex: 1 }}>
          <div className="fbt-mono anim-up" style={{ fontSize: 12, color: "var(--hazard)", letterSpacing: "0.2em", marginBottom: 24 }}>▸ BAY AREA · CENTRAL VALLEY · FOR-HIRE</div>
          <h1 className="fbt-display anim-up" style={{ fontSize: "clamp(48px, 8vw, 104px)", lineHeight: 0.92, margin: 0, animationDelay: "0.1s" }}>HEAVY<br />HAUL.<br /><span style={{ color: "var(--hazard)" }}>ON CALL.</span></h1>
          <p className="anim-up" style={{ fontSize: 20, maxWidth: 560, marginTop: 32, color: "#D6D3D1", animationDelay: "0.25s" }}>Super trucks, transfer end dumps, and a crew that shows up on time. Aggregate supply, site support, and on-demand hauling across Northern California.</p>
          <div className="anim-up" style={{ display: "flex", gap: 16, marginTop: 40, flexWrap: "wrap", animationDelay: "0.4s" }}>
            <a href="#quote" className="btn-primary">REQUEST A QUOTE <ArrowRight size={16} /></a>
            <a href="tel:+1000000000" className="btn-ghost" style={{ color: "var(--cream)", borderColor: "var(--cream)" }}><Phone size={14} style={{ marginRight: 6 }} /> CALL DISPATCH</a>
          </div>
        </div>
        <div style={{ height: 24 }} className="hazard-stripe" />
      </section>

      <section style={{ background: "var(--cream)", padding: "48px 24px" }} className="texture-paper">
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
          {[{ n: "24/7", l: "Dispatch Ready" }, { n: "CA", l: "Motor Carrier Permit" }, { n: "USDOT", l: "Fully Registered" }, { n: "100%", l: "Insured & Bonded" }].map((s, i) => (
            <div key={i} style={{ borderLeft: "4px solid var(--hazard)", paddingLeft: 20 }}>
              <div className="stat-num">{s.n}</div>
              <div className="stat-label">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: "#FFF", padding: "80px 24px", borderTop: "2px solid var(--steel)", borderBottom: "2px solid var(--steel)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="fbt-mono" style={{ fontSize: 12, color: "var(--hazard-deep)", letterSpacing: "0.2em", marginBottom: 12 }}>▸ 01 / SERVICES</div>
          <h2 className="fbt-display" style={{ fontSize: "clamp(36px, 5vw, 56px)", margin: "0 0 48px", maxWidth: 800 }}>WHAT WE MOVE.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {[
              { ico: <Truck size={32} />, t: "AGGREGATE SUPPLY", d: "Basalt, rock, base material — sourced, loaded, and delivered to stockpile. Prime contractor capable on public agency bids." },
              { ico: <Wrench size={32} />, t: "SITE SUPPORT", d: "On-call hauling for construction crews. Super trucks, 8-hour minimums, demand-driven dispatch." },
              { ico: <ClipboardList size={32} />, t: "SUBCONTRACT HAULING", d: "Prime contractor, public works, or private — we subcontract under clean paperwork with full compliance." },
            ].map((s, i) => (
              <div key={i} style={{ position: "relative", padding: 28, border: "2px solid var(--steel)", background: "var(--cream)" }}>
                <div className="corner-mark tl" /><div className="corner-mark tr" /><div className="corner-mark bl" /><div className="corner-mark br" />
                <div style={{ color: "var(--hazard-deep)", marginBottom: 16 }}>{s.ico}</div>
                <h3 className="fbt-display" style={{ fontSize: 22, margin: "0 0 10px" }}>{s.t}</h3>
                <p style={{ margin: 0, color: "var(--concrete)", fontSize: 15, lineHeight: 1.5 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--hazard)", padding: "72px 24px", borderBottom: "2px solid var(--steel)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="fbt-mono" style={{ fontSize: 12, letterSpacing: "0.2em", marginBottom: 12 }}>▸ 02 / ABOUT</div>
          <h2 className="fbt-display" style={{ fontSize: "clamp(32px, 5vw, 48px)", margin: 0, lineHeight: 1.05 }}>FAMILY-OWNED. BASED IN BAY POINT. BUILT FOR THE WORK NOBODY WANTS TO RESCHEDULE.</h2>
          <p style={{ fontSize: 17, marginTop: 24, maxWidth: 760, color: "var(--steel)" }}>4 Brothers Trucking runs lean, runs clean, and shows up. We pursue subcontract and prime contractor roles on public material supply bids across the Bay Area and Central Valley. If you need weight moved, we'll move it.</p>
        </div>
      </section>

      <section id="quote" style={{ background: "var(--steel)", color: "var(--cream)", padding: "80px 24px", position: "relative" }} className="grain">
        <div style={{ maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div className="fbt-mono" style={{ fontSize: 12, color: "var(--hazard)", letterSpacing: "0.2em", marginBottom: 12 }}>▸ 03 / REQUEST A QUOTE</div>
          <h2 className="fbt-display" style={{ fontSize: "clamp(36px, 5vw, 56px)", margin: "0 0 12px" }}>TELL US THE JOB.</h2>
          <p style={{ color: "#D6D3D1", marginBottom: 40, fontSize: 16 }}>Fill it out. We'll come back with a number, a date, and a truck.</p>
          <div style={{ background: "var(--cream)", color: "var(--steel)", padding: 32, border: "2px solid var(--hazard)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
              <div><label className="fbt-label">Your Name *</label><input className="fbt-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" /></div>
              <div><label className="fbt-label">Company</label><input className="fbt-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="ACME Construction" /></div>
              <div><label className="fbt-label">Email *</label><input className="fbt-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="fbt-label">Phone</label><input className="fbt-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label className="fbt-label">Service Type</label><select className="fbt-select" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}><option value="hauling">On-Call Hauling</option><option value="aggregate">Aggregate Supply</option><option value="site">Site Support</option><option value="other">Other / Not Sure</option></select></div>
              <div><label className="fbt-label">Needed By</label><input className="fbt-input" type="date" value={form.needDate} onChange={(e) => setForm({ ...form, needDate: e.target.value })} /></div>
              <div><label className="fbt-label">Pickup / Origin</label><input className="fbt-input" value={form.pickup} onChange={(e) => setForm({ ...form, pickup: e.target.value })} /></div>
              <div><label className="fbt-label">Dropoff / Site</label><input className="fbt-input" value={form.dropoff} onChange={(e) => setForm({ ...form, dropoff: e.target.value })} /></div>
              <div><label className="fbt-label">Material</label><input className="fbt-input" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} /></div>
              <div><label className="fbt-label">Quantity (tons / loads)</label><input className="fbt-input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label className="fbt-label">Notes</label><textarea className="fbt-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <button onClick={handleSubmit} className="btn-primary">SEND REQUEST <ArrowRight size={16} /></button>
              {submitted && <span className="fbt-mono" style={{ color: "var(--good)", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={16} /> RECEIVED. WE'LL BE IN TOUCH.</span>}
            </div>
          </div>
        </div>
      </section>

      <footer style={{ background: "var(--steel)", color: "var(--cream)", padding: "48px 24px 24px", borderTop: "1px solid var(--concrete)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
          <div><Logo /></div>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.15em", marginBottom: 12 }}>CONTACT</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><MapPin size={14} /> Bay Point, CA</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Phone size={14} /> Dispatch: on request</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Mail size={14} /> Via quote form</span>
            </div>
          </div>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.15em", marginBottom: 12 }}>COMPLIANCE</div>
            <div style={{ fontSize: 14, color: "#D6D3D1", lineHeight: 1.7 }}>CA Motor Carrier Permit<br />USDOT Registered<br />Fully Insured</div>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: "40px auto 0", paddingTop: 20, borderTop: "1px solid var(--concrete)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: 12, color: "#A8A29E" }}>
          <div className="fbt-mono">© 2026 4 BROTHERS TRUCKING, LLC</div>
          <div className="fbt-mono">MADE FOR THE ROAD.</div>
        </div>
      </footer>
    </div>
  );
};

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

const DriverUploadPage = ({ dispatch, onSubmitTruck, onBack, availableDrivers = [], assignment = null }) => {
  // For driver-kind assignments, driver name is locked in
  const lockedDriverName = assignment?.kind === "driver" ? assignment.name : null;
  const [form, setForm] = useState({
    freightBillNumber: "",
    driverName: lockedDriverName || "",
    driverId: assignment?.kind === "driver" ? assignment.contactId : null,
    truckNumber: "",
    material: dispatch?.material || "",
    tonnage: "", loadCount: "1",
    pickupTime: "", dropoffTime: "", notes: "",
    extras: [],
  });
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [lastFB, setLastFB] = useState("");

  const handlePhotos = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const next = [...photos];
    for (const f of Array.from(files)) {
      try { const dataUrl = await compressImage(f); next.push({ id: Date.now() + Math.random(), dataUrl, name: f.name }); } catch (e) { console.warn(e); }
    }
    setPhotos(next);
    setUploading(false);
  };

  const removePhoto = (id) => setPhotos(photos.filter((p) => p.id !== id));

  const submit = async () => {
    if (!form.freightBillNumber || !form.driverName || !form.truckNumber) { alert("Freight bill #, driver name, and truck # are required."); return; }
    const cleanExtras = (form.extras || []).filter((x) => Number(x.amount) > 0);
    await onSubmitTruck({ ...form, extras: cleanExtras, id: "temp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7), dispatchId: dispatch.id, photos, submittedAt: new Date().toISOString() });
    setLastFB(form.freightBillNumber);
    setSubmitted(true);
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", maxWidth: 480 }}>
          <div style={{ width: 80, height: 80, background: "var(--good)", borderRadius: "50%", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={44} color="#FFF" />
          </div>
          <h2 className="fbt-display" style={{ fontSize: 28, margin: "0 0 12px" }}>FB #{lastFB} SUBMITTED</h2>
          <p style={{ color: "var(--concrete)", margin: "0 0 24px", fontSize: 15 }}>Thanks — your paperwork is in. If you have another truck to log for this same dispatch, tap below.</p>
          <button className="btn-primary" onClick={() => {
            setSubmitted(false);
            setForm({ freightBillNumber: "", driverName: form.driverName, truckNumber: "", material: dispatch.material || "", tonnage: "", loadCount: "1", pickupTime: "", dropoffTime: "", notes: "", extras: [] });
            setPhotos([]);
            window.scrollTo(0, 0);
          }}><Plus size={16} /> LOG ANOTHER TRUCK</button>
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
                <label className="fbt-label">Driver Name *</label>
                {lockedDriverName ? (
                  <input
                    className="fbt-input"
                    value={lockedDriverName}
                    disabled
                    style={{ background: "#FEF3C7", fontWeight: 700 }}
                    title="This link is assigned to you"
                  />
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
              <div><label className="fbt-label">Truck # *</label><input className="fbt-input" value={form.truckNumber} onChange={(e) => setForm({ ...form, truckNumber: e.target.value })} placeholder="T-01 or plate" /></div>
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
                <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
                  {form.extras.map((x, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "130px 1fr 100px auto", gap: 6, alignItems: "center" }}>
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
                        placeholder={["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? "Note (optional)" : "Describe — specify type"}
                        value={x.label && !["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? x.label : (x.note || "")}
                        onChange={(e) => {
                          const next = [...form.extras];
                          const isOther = !["Tolls", "Dump Fees", "Fuel Surcharge"].includes(next[idx].label);
                          if (isOther) next[idx] = { ...next[idx], label: e.target.value };
                          else next[idx] = { ...next[idx], note: e.target.value };
                          setForm({ ...form, extras: next });
                        }}
                      />
                      <input
                        className="fbt-input"
                        type="number" step="0.01" min="0"
                        placeholder="$0.00"
                        style={{ padding: "6px 10px", fontSize: 12 }}
                        value={x.amount || ""}
                        onChange={(e) => {
                          const next = [...form.extras];
                          next[idx] = { ...next[idx], amount: e.target.value };
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
                  ))}
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
              <label className="fbt-label">Scale Tickets / Freight Bill Photos</label>
              <div style={{ border: "2px dashed var(--steel)", padding: 20, textAlign: "center", background: "#FFF" }}>
                <Camera size={32} style={{ color: "var(--hazard-deep)", marginBottom: 8 }} />
                <div style={{ fontSize: 13, color: "var(--concrete)", marginBottom: 12, fontFamily: "JetBrains Mono, monospace" }}>{uploading ? "PROCESSING…" : "TAKE PHOTO OR PICK FROM GALLERY"}</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <label className="btn-primary" style={{ cursor: "pointer", display: "inline-flex", padding: "10px 16px" }}>
                    <Camera size={16} /> {photos.length > 0 ? `CAMERA` : "TAKE PHOTO"}
                    <input type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={(e) => handlePhotos(e.target.files)} />
                  </label>
                  <label className="btn-ghost" style={{ cursor: "pointer", display: "inline-flex", padding: "10px 16px" }}>
                    <Upload size={16} /> {photos.length > 0 ? `ADD FROM GALLERY` : "FROM GALLERY"}
                    <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handlePhotos(e.target.files)} />
                  </label>
                </div>
                {photos.length > 0 && (
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8 }}>
                    {photos.length} PHOTO{photos.length !== 1 ? "S" : ""} ATTACHED
                  </div>
                )}
              </div>
              {photos.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {photos.map((p) => (
                    <div key={p.id} style={{ position: "relative" }}>
                      <img src={p.dataUrl} className="thumb" alt={p.name} onClick={() => setLightbox(p.dataUrl)} />
                      <button onClick={() => removePhoto(p.id)} style={{ position: "absolute", top: -6, right: -6, background: "var(--safety)", color: "#FFF", border: "2px solid var(--steel)", width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={submit} className="btn-primary" style={{ marginTop: 12 }} disabled={uploading}><CheckCircle2 size={16} /> SUBMIT FREIGHT BILL</button>
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

const DispatchesTab = ({ dispatches, setDispatches, freightBills, setFreightBills, contacts = [], company = {}, unreadIds = [], markDispatchRead, pendingDispatch, clearPendingDispatch, quarries = [], projects = [], onToast }) => {
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeDispatch, setActiveDispatch] = useState(null);
  const [textQueue, setTextQueue] = useState(null); // { list: [{name, smsLink}], sent: [bool] }

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
  const [draft, setDraft] = useState({ date: todayISO(), jobName: "", clientName: "", clientId: "", projectId: null, subContractor: "", subContractorId: "", pickup: "", dropoff: "", material: "", trucksExpected: 1, ratePerHour: "142", ratePerTon: "", notes: "", assignedDriverIds: [] });

  const resetDraft = () => setDraft({ date: todayISO(), jobName: "", clientName: "", clientId: "", projectId: null, subContractor: "", subContractorId: "", pickup: "", dropoff: "", material: "", trucksExpected: 1, ratePerHour: "142", ratePerTon: "", notes: "", assignedDriverIds: [], assignments: [] });

  // Open the modal pre-filled with an existing order's data (edit mode)
  const openEditDispatch = (d) => {
    setEditingId(d.id);
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
      quarryId: d.quarryId || null,
      notes: d.notes || "",
      assignedDriverIds: d.assignedDriverIds || [],
      assignments: d.assignments || [],
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
    onToast("ORDER CREATED — COPY THE LINK");
  };

  const removeDispatch = async (id) => {
    if (!confirm("Delete this order AND all its freight bills?")) return;
    const nextD = dispatches.filter((d) => d.id !== id);
    const nextFB = freightBills.filter((fb) => fb.dispatchId !== id);
    await setDispatches(nextD);
    await setFreightBills(nextFB);
    onToast("DISPATCH DELETED");
  };

  const removeFreightBill = async (id) => {
    if (!confirm("Delete this freight bill?")) return;
    const next = freightBills.filter((fb) => fb.id !== id);
    await setFreightBills(next);
    onToast("FREIGHT BILL DELETED");
  };

  const toggleStatus = async (id) => {
    const next = dispatches.map((d) => d.id === id ? { ...d, status: d.status === "open" ? "closed" : "open" } : d);
    await setDispatches(next);
  };

  const copyLink = (code) => {
    const url = `${window.location.origin}${window.location.pathname}#/submit/${code}`;
    try { navigator.clipboard.writeText(url); onToast("LINK COPIED"); }
    catch { prompt("Copy this link:", url); }
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

      {showNew && (
        <div className="modal-bg" onClick={() => { setShowNew(false); setEditingId(null); resetDraft(); }}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>{editingId ? "EDIT ORDER" : "NEW ORDER"}</h3>
              <button onClick={() => { setShowNew(false); setEditingId(null); resetDraft(); }} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                <div><label className="fbt-label">Date</label><input className="fbt-input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>
                <div><label className="fbt-label">Trucks Expected</label><input className="fbt-input" type="number" min="1" value={draft.trucksExpected} onChange={(e) => setDraft({ ...draft, trucksExpected: e.target.value })} /></div>
              </div>
              <div><label className="fbt-label">Job Name *</label><input className="fbt-input" value={draft.jobName} onChange={(e) => setDraft({ ...draft, jobName: e.target.value })} placeholder="MCI #91684 — Salinas Stormwater Phase 2A" /></div>
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
              <div>
                <label className="fbt-label">Sub-Contractor / Crew</label>
                {contacts.filter((c) => c.type === "sub").length > 0 ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      className="fbt-select"
                      style={{ flex: 1, minWidth: 180 }}
                      value={draft.subContractorId || ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) { setDraft({ ...draft, subContractorId: "", subContractor: "" }); return; }
                        const c = contacts.find((x) => String(x.id) === id);
                        if (c) setDraft({ ...draft, subContractorId: c.id, subContractor: c.companyName || c.contactName });
                      }}
                    >
                      <option value="">— Internal (no sub) —</option>
                      {contacts
                        .filter((c) => c.type === "sub")
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
                      value={draft.subContractorId ? "" : (draft.subContractor || "")}
                      onChange={(e) => setDraft({ ...draft, subContractor: e.target.value, subContractorId: "" })}
                      placeholder="Type new name"
                      disabled={!!draft.subContractorId}
                    />
                  </div>
                ) : (
                  <input className="fbt-input" value={draft.subContractor || ""} onChange={(e) => setDraft({ ...draft, subContractor: e.target.value })} placeholder="Leave blank if internal · add contacts to see a picker" />
                )}
              </div>

              {/* SUB-CONTRACTORS & DRIVERS (unified) */}
              <div style={{ borderTop: "2px dashed var(--concrete)", paddingTop: 14 }}>
                <label className="fbt-label">
                  Sub-Contractors & Drivers{draft.assignments?.length > 0 && ` · ${draft.assignments.length} ROW${draft.assignments.length !== 1 ? "S" : ""}`}
                </label>
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8 }}>
                  ▸ ADD EACH SUB AND/OR DRIVER WORKING THIS ORDER · DRIVER = 1 TRUCK · SUB = TRUCK COUNT YOU ENTER · DRIVER PAY RATE + TRUCK # AUTO-FILL FROM CONTACT
                </div>
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
                                // For drivers: auto-fill pay rate, method, and truck # from contact
                                // unless already manually set on this assignment row
                                const autoFill = isDriver && c ? {
                                  payRate: (next[idx].payRate === "" || next[idx].payRate == null) && c.defaultPayRate != null
                                    ? String(c.defaultPayRate) : next[idx].payRate,
                                  payMethod: (!next[idx].payMethod || next[idx].payMethod === "hour") && c.defaultPayMethod
                                    ? c.defaultPayMethod : (next[idx].payMethod || "hour"),
                                  truckNumber: (!next[idx].truckNumber) && c.defaultTruckNumber
                                    ? c.defaultTruckNumber : next[idx].truckNumber,
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
                <div><label className="fbt-label">Material</label><input className="fbt-input" value={draft.material} onChange={(e) => setDraft({ ...draft, material: e.target.value })} /></div>
                <div><label className="fbt-label">Rate $/hr</label><input className="fbt-input" type="number" value={draft.ratePerHour} onChange={(e) => setDraft({ ...draft, ratePerHour: e.target.value })} /></div>
                <div><label className="fbt-label">Rate $/ton (opt)</label><input className="fbt-input" type="number" step="0.01" value={draft.ratePerTon} onChange={(e) => setDraft({ ...draft, ratePerTon: e.target.value })} /></div>
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
                              {smsLink && (
                                <a href={smsLink} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10, textDecoration: "none" }}>
                                  <MessageSquare size={11} style={{ marginRight: 3 }} /> TEXT
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
                  <div><strong>STATUS:</strong> <span style={{ color: d.status === "open" ? "var(--good)" : "var(--concrete)" }}>● {d.status}</span></div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                  <button className="btn-ghost" onClick={() => toggleStatus(d.id)}>{d.status === "open" ? "CLOSE" : "REOPEN"} DISPATCH</button>
                </div>
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
        <div style={{ display: "grid", gap: 14 }}>
          {filteredDispatches.map((d) => {
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
                        <span className="chip" style={{ background: d.status === "open" ? "var(--good)" : "var(--concrete)", color: "#FFF", borderColor: "var(--steel)" }}>● {d.status}</span>
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

const QuotesTab = ({ quotes, setQuotes, onToast }) => {
  const updateStatus = async (id, status) => { const next = quotes.map((q) => q.id === id ? { ...q, status } : q); setQuotes(next); await storageSet("fbt:quotes", next); onToast(`QUOTE ${status.toUpperCase()}`); };
  const remove = async (id) => { const next = quotes.filter((q) => q.id !== id); setQuotes(next); await storageSet("fbt:quotes", next); onToast("QUOTE DELETED"); };
  const byStatus = { new: quotes.filter((q) => q.status === "new"), contacted: quotes.filter((q) => q.status === "contacted"), won: quotes.filter((q) => q.status === "won"), lost: quotes.filter((q) => q.status === "lost") };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        {[{ l: "New", v: byStatus.new.length, c: "var(--hazard)" }, { l: "Contacted", v: byStatus.contacted.length, c: "#FFF" }, { l: "Won", v: byStatus.won.length, c: "var(--good)", fg: "#FFF" }, { l: "Lost", v: byStatus.lost.length, c: "var(--concrete)", fg: "#FFF" }].map((s, i) => (
          <div key={i} className="fbt-card" style={{ padding: 20, background: s.c, color: s.fg || "var(--steel)" }}>
            <div className="stat-num" style={{ color: s.fg || "var(--steel)" }}>{s.v}</div>
            <div className="stat-label" style={{ color: s.fg ? "#E7E5E4" : "var(--concrete)" }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div className="fbt-card" style={{ padding: 0 }}>
        <div style={{ padding: "18px 24px", borderBottom: "2px solid var(--steel)", display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>INBOUND QUOTE REQUESTS</h3></div>
        {quotes.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
            <AlertCircle size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div className="fbt-mono" style={{ fontSize: 13 }}>NO INBOUND REQUESTS YET</div>
          </div>
        ) : (
          <div style={{ padding: 24, display: "grid", gap: 16 }}>
            {quotes.map((q) => (
              <div key={q.id} style={{ border: "2px solid var(--steel)", padding: 20, background: q.status === "new" ? "#FEF3C7" : "#FFF" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div className="fbt-display" style={{ fontSize: 18 }}>{q.name} {q.company && <span style={{ color: "var(--concrete)", fontSize: 14 }}>· {q.company}</span>}</div>
                    <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{fmtDate(q.submittedAt)} · {q.service} {q.needDate && `· needed ${fmtDate(q.needDate)}`}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <select className="fbt-select" style={{ padding: "6px 10px", fontSize: 12, width: "auto" }} value={q.status} onChange={(e) => updateStatus(q.id, e.target.value)}>
                      <option value="new">● New</option><option value="contacted">◐ Contacted</option><option value="won">✓ Won</option><option value="lost">✕ Lost</option>
                    </select>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FleetTab = ({ fleet, setFleet, onToast }) => {
  const [draft, setDraft] = useState({ unit: "", type: "Super Dump", driver: "", status: "available", notes: "" });
  const add = async () => { if (!draft.unit) { onToast("UNIT # REQUIRED"); return; } const next = [...fleet, { ...draft, id: Date.now() }]; setFleet(next); await storageSet("fbt:fleet", next); setDraft({ unit: "", type: "Super Dump", driver: "", status: "available", notes: "" }); onToast("UNIT ADDED"); };
  const update = async (id, field, value) => { const next = fleet.map((f) => f.id === id ? { ...f, [field]: value } : f); setFleet(next); await storageSet("fbt:fleet", next); };
  const remove = async (id) => { const next = fleet.filter((f) => f.id !== id); setFleet(next); await storageSet("fbt:fleet", next); onToast("UNIT REMOVED"); };
  const statusColor = (s) => ({ available: "var(--good)", dispatched: "var(--hazard-deep)", maintenance: "var(--safety)", offline: "var(--concrete)" }[s] || "var(--concrete)");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>ADD FLEET UNIT</h3></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <div><label className="fbt-label">Unit #</label><input className="fbt-input" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="T-01" /></div>
          <div><label className="fbt-label">Type</label><select className="fbt-select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}><option>Super Dump</option><option>Transfer End Dump</option><option>Truck & Trailer</option><option>End Dump</option><option>Other</option></select></div>
          <div><label className="fbt-label">Driver</label><input className="fbt-input" value={draft.driver} onChange={(e) => setDraft({ ...draft, driver: e.target.value })} /></div>
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
                  <div style={{ marginTop: 14, fontSize: 13, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)" }}>DRIVER ▸ {f.driver || "unassigned"}</div>
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

  const rowsHtml = freightBills.map((fb, idx) => {
    let qty = 0, unitLabel = "";
    if (pricing.method === "ton") { qty = Number(fb.tonnage) || 0; unitLabel = "tons"; }
    else if (pricing.method === "load") { qty = Number(fb.loadCount) || 1; unitLabel = "loads"; }
    else if (pricing.method === "hour") { qty = Number(fb.hoursOverride || 0); unitLabel = "hrs"; }
    const amount = qty * rate;
    const fbDate = fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
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
    let qty = 0;
    if (pricing.method === "ton") qty = Number(fb.tonnage) || 0;
    else if (pricing.method === "load") qty = Number(fb.loadCount) || 1;
    else if (pricing.method === "hour") qty = Number(fb.hoursOverride || 0);
    return s + qty * rate;
  }, 0);
  // FB-level reimbursable extras (tolls, dump, fuel, other paid by driver/sub)
  const fbExtrasSum = freightBills.reduce((s, fb) => {
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
const InvoiceViewModal = ({ invoice, freightBills, onClose, onToast }) => {
  const invFbs = (invoice.freightBillIds || []).map((id) => freightBills.find((fb) => fb.id === id)).filter(Boolean);
  const history = invoice.paymentHistory || [];
  const balance = (Number(invoice.total) || 0) - (Number(invoice.amountPaid) || 0);

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

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} className="btn-ghost">CLOSE</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== INVOICES TAB ==========
const InvoicesTab = ({ freightBills, dispatches, invoices, setInvoices, company, setCompany, contacts = [], projects = [], editFreightBill, onToast }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [pricingMethod, setPricingMethod] = useState("ton");
  const [rate, setRate] = useState("");
  const [billTo, setBillTo] = useState({ id: "", name: "", address: "", contact: "" });
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
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
    const actual = effectiveHours(fb);
    // If admin hasn't confirmed the minimum, use actual regardless
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

      // Skip FBs already locked to another invoice (unless toggle enabled)
      if (!showAlreadyInvoiced && fb.invoiceId) return false;

      const fbDate = fb.submittedAt ? fb.submittedAt.slice(0, 10) : "";
      if (fromDate && fbDate < fromDate) return false;
      if (toDate && fbDate > toDate) return false;
      if (clientFilter) {
        const disp = dispatches.find((d) => d.id === fb.dispatchId);
        const hay = `${disp?.subContractor || ""} ${disp?.jobName || ""} ${disp?.clientName || ""}`.toLowerCase();
        if (!hay.includes(clientFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [freightBills, dispatches, fromDate, toDate, clientFilter, includeUnapproved, showAlreadyInvoiced]);

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
    matchedBills.forEach((fb) => {
      let qty = 0;
      if (pricingMethod === "ton") qty = Number(fb.tonnage) || 0;
      else if (pricingMethod === "load") qty = Number(fb.loadCount) || 1;
      else if (pricingMethod === "hour") {
        const manual = hoursOverride[fb.id];
        if (manual !== undefined && manual !== "") qty = Number(manual) || 0;
        else qty = billableHoursForInvoice(fb);
      }
      subtotal += qty * r;
      // Sum reimbursable FB-level extras (tolls/dump/fuel/other paid by driver/sub)
      (fb.extras || []).forEach((x) => {
        if (x.reimbursable !== false) fbExtrasSum += Number(x.amount) || 0;
      });
    });
    const ef = Number(extraFees) || 0;
    const extrasSum = (extras || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const d = Number(discount) || 0;
    return { subtotal, extrasSum, fbExtrasSum, total: subtotal + ef + extrasSum + fbExtrasSum - d };
  }, [matchedBills, rate, pricingMethod, hoursOverride, extraFees, discount, extras]);

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
    if (!billTo.name) { onToast("BILL-TO NAME REQUIRED"); return; }

    const invoiceNumber = makeInvoiceNumber();
    const invoiceDate = todayISO();

    const billsWithHours = matchedBills.map((fb) => {
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
      freightBillIds: matchedBills.map((fb) => fb.id),
      subtotal: previewTotals.subtotal,
      total: previewTotals.total,
      createdAt: new Date().toISOString(),
    };

    try {
      await generateInvoicePDF(invoice, company, billsWithHours, { method: pricingMethod, rate });

      // Save to history
      const next = [invoice, ...invoices];
      await setInvoices(next);

      // Find the newly saved invoice (real id from Supabase) and lock FBs to it
      // Wait briefly for realtime sub to give us the saved invoice, then match by number
      setTimeout(async () => {
        const saved = invoices.find((x) => x.invoiceNumber === invoiceNumber);
        const realId = saved?.id;
        if (realId && editFreightBill && matchedBills.length > 0) {
          for (const fb of matchedBills) {
            if (!fb.invoiceId) {
              try { await editFreightBill(fb.id, { ...fb, invoiceId: realId }); }
              catch (e) { console.warn("Could not tag FB with invoice", fb.id, e); }
            }
          }
          onToast(`✓ ${matchedBills.length} FB${matchedBills.length !== 1 ? "S" : ""} LOCKED TO ${invoiceNumber}`);
        }
      }, 800);

      onToast(`${invoiceNumber} OPENED — HIT PRINT TO SAVE AS PDF`);
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
    if (!confirm(`Delete invoice ${invNum} from history? This won't affect the freight bills.`)) return;
    const next = invoices.filter((i) => i.invoiceNumber !== invNum);
    setInvoices(next);
    onToast("INVOICE DELETED");
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
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ 01 / SELECT FREIGHT BILLS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
          <div><label className="fbt-label">From Date</label><input className="fbt-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
          <div><label className="fbt-label">To Date</label><input className="fbt-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
          <div><label className="fbt-label">Client / Sub / Job Contains</label><input className="fbt-input" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} placeholder="e.g. MCI" /></div>
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

        {/* Already-invoiced toggle */}
        <div style={{ padding: 10, background: showAlreadyInvoiced ? "#FEF2F2" : "#F0FDF4", border: "2px solid " + (showAlreadyInvoiced ? "var(--safety)" : "var(--good)"), marginBottom: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
            <input
              type="checkbox"
              checked={!showAlreadyInvoiced}
              onChange={(e) => setShowAlreadyInvoiced(!e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <Lock size={14} style={{ color: showAlreadyInvoiced ? "var(--safety)" : "var(--good)" }} />
            <strong>HIDE FBs ALREADY ON ANOTHER INVOICE</strong>
          </label>
          {showAlreadyInvoiced && (
            <span className="fbt-mono" style={{ fontSize: 10, color: "var(--safety)", letterSpacing: "0.1em", marginLeft: "auto" }}>
              ⚠ INCLUDING INVOICED FBs (DUPLICATE RISK)
            </span>
          )}
        </div>

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
          </div>
        </div>

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

        {/* Bill-to */}
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ 03 / BILL TO</div>
        <div style={{ display: "grid", gap: 14, marginBottom: 18 }}>
          {contacts.filter((c) => c.type === "customer").length > 0 && (
            <div>
              <label className="fbt-label">Choose Customer (auto-fills below)</label>
              <select
                className="fbt-select"
                value={billTo.id || ""}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) { setBillTo({ id: "", name: "", contact: "", address: "" }); return; }
                  const c = contacts.find((x) => String(x.id) === id);
                  if (c) setBillTo({
                    id: c.id,
                    name: c.companyName || c.contactName,
                    contact: c.contactName || "",
                    address: c.address || "",
                  });
                }}
              >
                <option value="">— Manual entry —</option>
                {contacts
                  .filter((c) => c.type === "customer")
                  .sort((a, b) => (a.favorite !== b.favorite ? (a.favorite ? -1 : 1) : 0))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.favorite ? "★ " : ""}{c.companyName || c.contactName}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div><label className="fbt-label">Client Name *</label><input className="fbt-input" value={billTo.name} onChange={(e) => setBillTo({ ...billTo, name: e.target.value, id: "" })} placeholder="Mountain Cascade, Inc." /></div>
            <div><label className="fbt-label">Contact / Attn</label><input className="fbt-input" value={billTo.contact} onChange={(e) => setBillTo({ ...billTo, contact: e.target.value })} placeholder="Accounts Payable" /></div>
          </div>
          <div><label className="fbt-label">Address</label><input className="fbt-input" value={billTo.address} onChange={(e) => setBillTo({ ...billTo, address: e.target.value })} placeholder="Street, City, State ZIP" /></div>
          {(() => {
            // Filter projects by selected customer (if any)
            const availableProjects = projects.filter((p) => {
              if (p.status === "cancelled") return false;
              if (billTo.id) return p.customerId === Number(billTo.id) || p.customerId === billTo.id;
              return true;
            });
            return availableProjects.length > 0 ? (
              <div>
                <label className="fbt-label">Project (auto-fills PO# & Job Reference)</label>
                <select
                  className="fbt-select"
                  value={projectId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setProjectId(id);
                    if (!id) return;
                    const p = availableProjects.find((x) => String(x.id) === id);
                    if (p) {
                      if (p.poNumber) setPoNumber(p.poNumber);
                      if (p.name && !jobRef) setJobRef(`${p.contractNumber ? p.contractNumber + " — " : ""}${p.name}`);
                    }
                  }}
                >
                  <option value="">— No project / Manual entry —</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.contractNumber ? ` (${p.contractNumber})` : ""}{p.poNumber ? ` · PO ${p.poNumber}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null;
          })()}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div><label className="fbt-label">PO # (shown on invoice)</label><input className="fbt-input" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO-2026-0045" /></div>
            <div><label className="fbt-label">Job Reference</label><input className="fbt-input" value={jobRef} onChange={(e) => setJobRef(e.target.value)} placeholder="MCI #91684 — Salinas Stormwater 2A" /></div>
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
  });

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

          {/* Brokerage section — for subs and drivers */}
          {(draft.type === "sub" || draft.type === "driver") && (
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
                ▸ WHEN WE PAY THIS {draft.type === "sub" ? "SUB" : "DRIVER"}, WE'LL SUBTRACT THIS % FROM THEIR GROSS PAY. LEAVE OFF IF BROKERAGE ISN'T INVOLVED.
              </div>
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
const FBEditModal = ({ fb, dispatches, contacts, projects = [], editFreightBill, onClose, onToast, currentUser }) => {
  const dispatch = dispatches.find((d) => d.id === fb.dispatchId);
  const project = dispatch ? projects.find((p) => p.id === dispatch.projectId) : null;
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
  });
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState(null);

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
      };

      // If admin confirmed min-hours, stamp audit
      if (belowMin && draft.minHoursApplied && !fb.minHoursApplied) {
        patch.minHoursApplied = true;
        patch.minHoursApprovedBy = currentUser || "admin";
        patch.minHoursApprovedAt = new Date().toISOString();
      } else if (!belowMin) {
        // Actual hours >= min → unneeded, clear the flag
        patch.minHoursApplied = false;
        patch.minHoursApprovedBy = null;
        patch.minHoursApprovedAt = null;
      } else {
        // belowMin but not confirmed — keep flag as is
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
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
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
          {/* Core IDs */}
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
              <div>
                <label className="fbt-label">
                  Hours Billed {autoHours && !draft.hoursBilled ? `(auto: ${autoHours})` : ""}
                </label>
                <input
                  className="fbt-input"
                  type="number" step="0.25"
                  value={draft.hoursBilled}
                  onChange={(e) => setDraft({ ...draft, hoursBilled: e.target.value })}
                  placeholder={autoHours || "0.00"}
                />
              </div>
            </div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 6 }}>
              ▸ LEAVE HOURS BILLED BLANK TO AUTO-USE PICKUP→DROPOFF DIFFERENCE
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

          {/* Extras — tolls / dump / fuel / other */}
          <div style={{ padding: 12, background: "#FEF3C7", border: "2px solid var(--hazard)" }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 6, fontWeight: 700 }}>
              ▸ EXTRAS (TOLLS · DUMP · FUEL · OTHER) {draft.extras?.length > 0 ? `(${draft.extras.length})` : ""}
            </div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8, lineHeight: 1.4 }}>
              Reimbursable = customer pays us, we pay the sub back for it.
            </div>
            {(draft.extras || []).length > 0 && (
              <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
                {draft.extras.map((x, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px 80px auto", gap: 6, alignItems: "center" }}>
                    <select
                      className="fbt-select"
                      style={{ padding: "6px 8px", fontSize: 11 }}
                      value={["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? x.label : "Other"}
                      onChange={(e) => {
                        const v = e.target.value;
                        const next = [...draft.extras];
                        next[idx] = { ...next[idx], label: v === "Other" ? (next[idx].label || "") : v };
                        setDraft({ ...draft, extras: next });
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
                      placeholder={["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? "Note" : "Describe"}
                      value={x.label && !["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? x.label : (x.note || "")}
                      onChange={(e) => {
                        const next = [...draft.extras];
                        const isOther = !["Tolls", "Dump Fees", "Fuel Surcharge"].includes(next[idx].label);
                        if (isOther) next[idx] = { ...next[idx], label: e.target.value };
                        else next[idx] = { ...next[idx], note: e.target.value };
                        setDraft({ ...draft, extras: next });
                      }}
                    />
                    <input
                      className="fbt-input"
                      type="number" step="0.01" min="0"
                      placeholder="$0.00"
                      style={{ padding: "6px 10px", fontSize: 12 }}
                      value={x.amount || ""}
                      onChange={(e) => {
                        const next = [...draft.extras];
                        next[idx] = { ...next[idx], amount: e.target.value };
                        setDraft({ ...draft, extras: next });
                      }}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: "JetBrains Mono, monospace", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={x.reimbursable !== false}
                        onChange={(e) => {
                          const next = [...draft.extras];
                          next[idx] = { ...next[idx], reimbursable: e.target.checked };
                          setDraft({ ...draft, extras: next });
                        }}
                      />
                      REIMB
                    </label>
                    <button
                      onClick={() => setDraft({ ...draft, extras: draft.extras.filter((_, i) => i !== idx) })}
                      className="btn-danger"
                      style={{ padding: "6px 10px", fontSize: 11 }}
                      type="button"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => setDraft({ ...draft, extras: [...(draft.extras || []), { label: "Tolls", amount: "", reimbursable: true }] })}>
                <Plus size={11} style={{ marginRight: 3 }} /> TOLLS
              </button>
              <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => setDraft({ ...draft, extras: [...(draft.extras || []), { label: "Dump Fees", amount: "", reimbursable: true }] })}>
                <Plus size={11} style={{ marginRight: 3 }} /> DUMP
              </button>
              <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => setDraft({ ...draft, extras: [...(draft.extras || []), { label: "Fuel Surcharge", amount: "", reimbursable: true }] })}>
                <Plus size={11} style={{ marginRight: 3 }} /> FUEL
              </button>
              <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => setDraft({ ...draft, extras: [...(draft.extras || []), { label: "", amount: "", reimbursable: true }] })}>
                <Plus size={11} style={{ marginRight: 3 }} /> OTHER
              </button>
            </div>
          </div>

          {/* Photos */}
          {draft.photos.length > 0 && (
            <div>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>
                ▸ SCALE TICKETS ({draft.photos.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {draft.photos.map((p, idx) => (
                  <img
                    key={p.id || idx}
                    src={p.dataUrl}
                    alt=""
                    style={{ width: 100, height: 100, objectFit: "cover", border: "2px solid var(--steel)", cursor: "pointer" }}
                    onClick={() => setLightbox(p.dataUrl)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, paddingTop: 14, borderTop: "2px solid var(--steel)" }}>
            {fb.status !== "approved" && (
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="btn-primary"
                style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}
              >
                <ShieldCheck size={16} /> SAVE & APPROVE
              </button>
            )}
            <button onClick={() => save(false)} disabled={saving} className="btn-ghost">
              <Save size={16} /> SAVE ONLY
            </button>
            {fb.status === "approved" && (
              <button onClick={unapprove} disabled={saving} className="btn-ghost">
                <Clock size={16} /> MOVE TO PENDING
              </button>
            )}
            {fb.status !== "rejected" && (
              <button onClick={reject} disabled={saving} className="btn-danger">
                <X size={16} /> REJECT
              </button>
            )}
            <button onClick={onClose} className="btn-ghost" style={{ marginLeft: "auto" }}>CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== REVIEW TAB (End-of-day approval screen) ==========
const ReviewTab = ({ freightBills, dispatches, contacts, projects = [], editFreightBill, onToast }) => {
  const [filter, setFilter] = useState("pending");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

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
const generatePayStubPDF = ({ subName, subKind, subId, fbs, payRecord, brokeragePct, brokerageApplies, allFreightBills, allDispatches, company, isHistorical = false }) => {
  const esc = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
  const methodLabel = { check: "Check", ach: "ACH / Bank Transfer", cash: "Cash", zelle: "Zelle", venmo: "Venmo", other: "Other" };

  // Helper: compute gross for an FB (same logic as payroll)
  const fbGross = (fb, dispatch) => {
    const assignment = (dispatch?.assignments || []).find((a) => a.aid === fb.assignmentId);
    if (!assignment || !assignment.payRate) return { gross: 0, qty: 0, method: "?", rate: 0, extrasSum: 0, baseGross: 0 };
    const rate = Number(assignment.payRate) || 0;
    const method = assignment.payMethod || "hour";
    let qty = 0;
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
    const baseGross = qty * rate;
    const extrasSum = (fb.extras || []).filter((x) => x.reimbursable !== false).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    return { gross: baseGross + extrasSum, qty, method, rate, extrasSum, baseGross, extras: fb.extras || [] };
  };

  // Build FB rows for this pay run
  const fbRows = fbs.map((fb) => {
    const d = allDispatches.find((x) => x.id === fb.dispatchId);
    const calc = fbGross(fb, d);
    const extrasList = (calc.extras || []).filter((x) => Number(x.amount) > 0);
    return { fb, dispatch: d, calc, extrasList };
  });

  const subtotal = fbRows.reduce((s, r) => s + r.calc.baseGross, 0);
  const extrasTotal = fbRows.reduce((s, r) => s + r.calc.extrasSum, 0);
  const gross = subtotal + extrasTotal;
  const brokerageAmt = brokerageApplies ? gross * (brokeragePct / 100) : 0;
  const netPay = gross - brokerageAmt;

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

  const ytdTotal = ytdFbs.reduce((s, fb) => s + (Number(fb.paidAmount) || 0), 0) + netPay;

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
        <div class="value">${esc(subName)}</div>
        <div class="small">${subKind === "driver" ? "Driver" : "Sub-Contractor"}</div>
      </div>
      <div>
        <div class="label">Pay Period</div>
        <div class="value">${esc(payPeriod)}</div>
        <div class="small">${fbs.length} freight bill${fbs.length !== 1 ? "s" : ""}</div>
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
          const unit = calc.method === "hour" ? "hrs" : calc.method === "ton" ? "tons" : "loads";
          return `
            <tr>
              <td><strong>${esc(fb.freightBillNumber || "—")}</strong></td>
              <td>${fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : "—"}</td>
              <td>${esc(dispatch?.code || "—")} · ${esc(dispatch?.jobName || "—")}</td>
              <td class="r">${calc.qty.toFixed(2)}</td>
              <td>${unit}</td>
              <td class="r">${money(calc.rate)}</td>
              <td class="r"><strong>${money(calc.baseGross)}</strong></td>
            </tr>
            ${extrasList.filter((x) => x.reimbursable !== false).map((x) => `
              <tr><td colspan="7" class="extra-line">+ ${esc(x.label || "Extra")}: ${money(x.amount)} (reimbursable)</td></tr>
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
      ${extrasTotal > 0 ? `
        <div class="totals-row">
          <span>Reimbursable Extras (tolls / dump / fuel / etc)</span>
          <strong>${money(extrasTotal)}</strong>
        </div>
      ` : ""}
      <div class="totals-row">
        <span><strong>GROSS PAY</strong></span>
        <strong>${money(gross)}</strong>
      </div>
      ${brokerageApplies ? `
        <div class="totals-row deduct">
          <span>Brokerage Deduction (${brokeragePct}%)</span>
          <strong>−${money(brokerageAmt)}</strong>
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
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.08em;">Year-to-Date (${year})</div>
          <div class="total">${money(ytdTotal)}</div>
          <div style="font-size: 10px; color: #666;">Total paid to ${esc(subName)} in ${year}${ytdRuns.length > 0 ? ` · ${ytdRuns.length} prior pay run${ytdRuns.length !== 1 ? "s" : ""}` : ""}</div>
        </div>
      </div>
      ${ytdRuns.length > 0 ? `
        <div class="ytd-list">
          <div style="font-size: 10px; color: #666; margin-top: 8px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Previous Pay Runs:</div>
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

      const paidFbs = [];
      for (let i = 0; i < fbs.length; i++) {
        const entry = fbs[i];
        const share = grossSum > 0 ? (entry.gross / grossSum) * totalAmt : totalAmt / fbs.length;
        const updatedFb = {
          ...entry.fb,
          ...stamp,
          paidAmount: Number(share.toFixed(2)),
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

// ========== PAYROLL TAB ==========
const PayrollTab = ({ freightBills, dispatches, contacts, projects, invoices = [], editFreightBill, company, onToast }) => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [paidFilter, setPaidFilter] = useState("unpaid"); // unpaid | paid | all
  const [subFilter, setSubFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [expanded, setExpanded] = useState({});
  const [payTarget, setPayTarget] = useState(null);
  const [editingFB, setEditingFB] = useState(null);
  const [customerPaidOnly, setCustomerPaidOnly] = useState(true); // NEW: default ON (safer)
  const [traceFB, setTraceFB] = useState(null); // NEW: for traceability modal
  const [stubOffer, setStubOffer] = useState(null); // {target, fbs, payRecord} for auto-offer after pay

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
    if (!assignment || !assignment.payRate) return { gross: 0, qty: 0, method: "?", rate: 0, assignment: null, extrasSum: 0, grossBeforeExtras: 0 };
    const rate = Number(assignment.payRate) || 0;
    const method = assignment.payMethod || "hour";
    let qty = 0;
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
    const grossBeforeExtras = qty * rate;
    // Reimbursable FB extras are added to gross (sub fronted the cost, gets paid back)
    const extrasSum = (fb.extras || [])
      .filter((x) => x.reimbursable !== false)
      .reduce((s, x) => s + (Number(x.amount) || 0), 0);
    return { gross: grossBeforeExtras + extrasSum, qty, method, rate, assignment, extrasSum, grossBeforeExtras };
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
      const brokerageApplies = contact?.brokerageApplies;
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
      const adjustedGross = custStatus === "short" ? calc.gross * ratio : calc.gross;

      subData.fbs.push({
        fb,
        gross: calc.gross,              // full gross based on agreement
        adjustedGross,                  // what we'll actually pay (proportional for short-pay)
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
        const brokerageAmt = s.brokerageApplies ? s.gross * (s.brokeragePct / 100) : 0;

        // Split: ready-to-pay vs advance-risk
        const unpaidEntries = s.fbs.filter((x) => !x.fb.paidAt);
        const readyEntries = unpaidEntries.filter((x) => x.custStatus === "paid" || x.custStatus === "short");
        const advanceEntries = unpaidEntries.filter((x) => x.custStatus !== "paid" && x.custStatus !== "short");
        const readyGross = readyEntries.reduce((sum, x) => sum + x.adjustedGross, 0);
        const advanceGross = advanceEntries.reduce((sum, x) => sum + x.adjustedGross, 0);
        const readyBrok = s.brokerageApplies ? readyGross * (s.brokeragePct / 100) : 0;
        const advanceBrok = s.brokerageApplies ? advanceGross * (s.brokeragePct / 100) : 0;

        return {
          ...s,
          brokerageAmt,
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
    if (!confirm(`Un-mark FB #${fb.freightBillNumber || "(no #)"} as paid? This removes the payment record.`)) return;
    try {
      await editFreightBill(fb.id, {
        ...fb,
        paidAt: null, paidBy: "", paidMethod: "", paidCheckNumber: "",
        paidAmount: null, paidNotes: "",
      });
      onToast("PAYMENT RECORD REMOVED");
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
                      return (
                        <div key={sub.subKey} style={{ border: "1.5px solid var(--steel)", background: isAllPaid ? "#F0FDF4" : "#FFF" }}>
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
const ReportsTab = ({ dispatches, freightBills, logs, invoices, quotes, quarries, contacts, projects = [], company, editFreightBill, onToast, lastViewedMondayReport, setLastViewedMondayReport }) => {
  const [rangePreset, setRangePreset] = useState("lastweek");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

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
        bySub.set(key, { name: assignment.name, count: 0, net: 0, kind: assignment.kind });
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
  const { setLogs, setQuotes, setFleet, setDispatches, setFreightBills, setInvoices, setCompany, setContacts, markAllRead, markDispatchRead, toggleSound, toggleBrowserNotifs, setQuarries, setLastViewedMondayReport, setProjects, editFreightBill } = setters;
  const [pendingDispatch, setPendingDispatch] = useState(null);
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
        {tab === "home" && <HomeTab freightBills={freightBills} dispatches={dispatches} contacts={contacts} projects={projects || []} invoices={invoices || []} quotes={quotes || []} company={company} onJumpTab={(k) => setTab(k)} onToast={onToast} />}
        {tab === "dispatches" && <DispatchesTab dispatches={dispatches} setDispatches={setDispatches} freightBills={freightBills} setFreightBills={setFreightBills} contacts={contacts} company={company} unreadIds={unreadIds || []} markDispatchRead={markDispatchRead} pendingDispatch={pendingDispatch} clearPendingDispatch={() => setPendingDispatch(null)} quarries={quarries || []} projects={projects || []} onToast={onToast} />}
        {tab === "projects" && <ProjectsTab projects={projects || []} setProjects={setProjects} contacts={contacts} dispatches={dispatches} freightBills={freightBills} invoices={invoices} onToast={onToast} />}
        {tab === "review" && <ReviewTab freightBills={freightBills} dispatches={dispatches} contacts={contacts} projects={projects || []} editFreightBill={editFreightBill} onToast={onToast} />}
        {tab === "payroll" && <PayrollTab freightBills={freightBills} dispatches={dispatches} contacts={contacts} projects={projects || []} invoices={invoices || []} editFreightBill={editFreightBill} company={company} onToast={onToast} />}
        {tab === "invoices" && <InvoicesTab freightBills={freightBills} dispatches={dispatches} invoices={invoices} setInvoices={setInvoices} company={company} setCompany={setCompany} contacts={contacts || []} projects={projects || []} editFreightBill={editFreightBill} onToast={onToast} />}
        {tab === "contacts" && <ContactsTab contacts={contacts} setContacts={setContacts} dispatches={dispatches} freightBills={freightBills} company={company} onToast={onToast} />}
        {tab === "hours" && <HoursTab logs={logs} setLogs={setLogs} onToast={onToast} />}
        {tab === "billing" && <BillingTab logs={logs} onToast={onToast} />}
        {tab === "quotes" && <QuotesTab quotes={quotes} setQuotes={setQuotes} onToast={onToast} />}
        {tab === "fleet" && <FleetTab fleet={fleet} setFleet={setFleet} onToast={onToast} />}
        {tab === "materials" && <MaterialsTab quarries={quarries || []} setQuarries={setQuarries} dispatches={dispatches} onToast={onToast} />}
        {tab === "reports" && <ReportsTab dispatches={dispatches} freightBills={freightBills} logs={logs} invoices={invoices} quotes={quotes} quarries={quarries || []} contacts={contacts || []} projects={projects || []} company={company} editFreightBill={editFreightBill} onToast={onToast} lastViewedMondayReport={lastViewedMondayReport} setLastViewedMondayReport={setLastViewedMondayReport} />}
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

  useEffect(() => {
    const handler = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  useEffect(() => {
    (async () => {
      // Check Supabase session first
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setAuthed(true);

      // Listen for auth changes (login/logout from other tabs)
      supabase.auth.onAuthStateChange((event, sess) => {
        if (event === "SIGNED_IN") setAuthed(true);
        if (event === "SIGNED_OUT") setAuthed(false);
      });

      // Load dispatches + freight bills + contacts + quarries + invoices + projects from Supabase
      const [cloudDispatches, cloudFreightBills, cloudContacts, cloudQuarries, cloudInvoices, cloudProjects] = await Promise.all([
        fetchDispatches(),
        fetchFreightBills(),
        fetchContacts(),
        fetchQuarries(),
        fetchInvoices(),
        fetchProjects(),
      ]);
      setDispatches(cloudDispatches);
      setFreightBills(cloudFreightBills);
      setContactsState(cloudContacts);
      setQuarriesState(cloudQuarries);
      setInvoicesState(cloudInvoices);
      setProjectsState(cloudProjects);
      prevFbIdsRef.current = new Set(cloudFreightBills.map((x) => x.id));

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

      // Hours, quotes, fleet, company still use local storage (smaller impact, less critical to sync)
      const [l, q, f, co] = await Promise.all([
        storageGet("fbt:logs"), storageGet("fbt:quotes"), storageGet("fbt:fleet"),
        storageGet("fbt:company"),
      ]);
      if (l) setLogs(l); if (q) setQuotes(q); if (f) setFleet(f);
      if (co) setCompanyState((prev) => ({ ...prev, ...co }));

      setLoaded(true);
    })();
  }, []);

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
          const d = dispatches.find((x) => x.id === fb.dispatchId);
          const title = `New freight bill: FB #${fb.freightBillNumber}`;
          const body = `${fb.driverName || "Driver"} · Truck ${fb.truckNumber || "?"}${d ? ` · ${d.jobName}` : ""}`;
          if (browserNotifsEnabled) fireBrowserNotif(title, body, `fb-${fb.id}`);
        });
        if (soundEnabled) playDing();
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

    return () => {
      unsubFB?.();
      unsubD?.();
      unsubC?.();
      unsubQ?.();
      unsubI?.();
      unsubP?.();
    };
  }, [authed, loaded, dispatches, soundEnabled, browserNotifsEnabled]);

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

  const handleQuoteSubmit = async (quote) => { const next = [quote, ...quotes]; setQuotes(next); await storageSet("fbt:quotes", next); };

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
      {view === "public" && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50 }}>
          <button onClick={tryEnterDashboard} className="btn-primary" style={{ padding: "10px 18px", fontSize: 12 }}>
            <Lock size={14} /> STAFF LOGIN
          </button>
        </div>
      )}
      {view === "public" ? (
        <PublicSite onQuoteSubmit={handleQuoteSubmit} />
      ) : (
        <>
          <Dashboard
            state={{ logs, quotes, fleet, dispatches, freightBills, invoices, company, contacts, unreadIds, soundEnabled, browserNotifsEnabled, quarries, lastViewedMondayReport, projects }}
            setters={{ setLogs, setQuotes, setFleet, setDispatches: setDispatchesShared, setFreightBills: setFreightBillsShared, setInvoices, setCompany, setContacts, markAllRead, markDispatchRead, toggleSound, toggleBrowserNotifs, setQuarries, setLastViewedMondayReport, setProjects, editFreightBill }}
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
