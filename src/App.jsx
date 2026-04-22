import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase";
import { fetchDispatches, insertDispatch, updateDispatch, deleteDispatch, fetchFreightBills, insertFreightBill, deleteFreightBill, subscribeToDispatches, subscribeToFreightBills, fetchContacts, insertContact, updateContact, deleteContact, fetchQuarries, insertQuarry, updateQuarry, deleteQuarry, fetchInvoices, insertInvoice, deleteInvoice, subscribeToContacts, subscribeToQuarries, subscribeToInvoices } from "./db";
import { Truck, ClipboardList, Receipt, Menu, Phone, Mail, MapPin, Fuel, Plus, Trash2, Download, CheckCircle2, AlertCircle, ArrowRight, Wrench, FileText, Search, Link2, Camera, Upload, X, Eye, Share2, Lock, LogOut, Settings, KeyRound, Building2, Printer, FileDown, QrCode, Database, HardDrive, RefreshCw, Users, Star, MessageSquare, UserPlus, Edit2, ChevronDown, Bell, BellOff, Volume2, VolumeX, Activity, TrendingUp, Package, Mountain, TrendingDown, BarChart3, History, Calendar, DollarSign, Award, Zap } from "lucide-react";

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
  <div className="modal-bg" onClick={onClose} style={{ alignItems: "center" }}>
    <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
      <button onClick={onClose} style={{ position: "absolute", top: -40, right: 0, background: "var(--hazard)", border: "2px solid var(--steel)", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <X size={18} />
      </button>
      <img src={src} alt="Scale ticket" style={{ maxWidth: "90vw", maxHeight: "90vh", border: "3px solid var(--hazard)" }} />
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

const DriverUploadPage = ({ dispatch, onSubmitTruck, onBack }) => {
  const [form, setForm] = useState({ freightBillNumber: "", driverName: "", truckNumber: "", material: dispatch?.material || "", tonnage: "", loadCount: "1", pickupTime: "", dropoffTime: "", notes: "" });
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
    await onSubmitTruck({ ...form, id: "temp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7), dispatchId: dispatch.id, photos, submittedAt: new Date().toISOString() });
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
            setForm({ freightBillNumber: "", driverName: form.driverName, truckNumber: "", material: dispatch.material || "", tonnage: "", loadCount: "1", pickupTime: "", dropoffTime: "", notes: "" });
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
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", letterSpacing: "0.15em", marginBottom: 8 }}>▸ DRIVER / SUB UPLOAD · DISPATCH #{dispatch.code}</div>
        <h1 className="fbt-display" style={{ fontSize: 32, margin: "0 0 8px", lineHeight: 1.1 }}>UPLOAD YOUR FREIGHT BILL</h1>
        <p style={{ color: "var(--concrete)", margin: "0 0 24px", fontSize: 15 }}>One submission per truck. Fill out the freight bill info and attach the scale ticket photos.</p>
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
              <div><label className="fbt-label">Driver Name *</label><input className="fbt-input" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="Your full name" /></div>
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
            <div>
              <label className="fbt-label">Scale Tickets / Freight Bill Photos</label>
              <div style={{ border: "2px dashed var(--steel)", padding: 20, textAlign: "center", background: "#FFF" }}>
                <Camera size={32} style={{ color: "var(--hazard-deep)", marginBottom: 8 }} />
                <div style={{ fontSize: 13, color: "var(--concrete)", marginBottom: 12, fontFamily: "JetBrains Mono, monospace" }}>{uploading ? "PROCESSING…" : "TAP TO TAKE PHOTO OR UPLOAD"}</div>
                <label className="btn-primary" style={{ cursor: "pointer", display: "inline-flex" }}>
                  <Upload size={16} /> {photos.length > 0 ? `ADD MORE (${photos.length})` : "SELECT PHOTOS"}
                  <input type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={(e) => handlePhotos(e.target.files)} />
                </label>
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

const DispatchesTab = ({ dispatches, setDispatches, freightBills, setFreightBills, contacts = [], company = {}, unreadIds = [], markDispatchRead, pendingDispatch, clearPendingDispatch, quarries = [], onToast }) => {
  const [showNew, setShowNew] = useState(false);
  const [activeDispatch, setActiveDispatch] = useState(null);

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
  const [draft, setDraft] = useState({ date: todayISO(), jobName: "", clientName: "", subContractor: "", pickup: "", dropoff: "", material: "", trucksExpected: 1, ratePerHour: "142", ratePerTon: "", notes: "" });

  const createDispatch = async () => {
    if (!draft.jobName) { onToast("JOB NAME REQUIRED"); return; }
    const code = randomCode(6);
    const d = { ...draft, id: "temp-" + Date.now(), code, trucksExpected: Number(draft.trucksExpected) || 1, createdAt: new Date().toISOString(), status: "open" };
    const next = [d, ...dispatches];
    await setDispatches(next);
    setShowNew(false);
    // Find the newly inserted dispatch (its ID is now the Supabase UUID)
    // Small delay to let state settle then activate by code
    setTimeout(() => {
      const fresh = dispatches.find((x) => x.code === code);
      if (fresh) setActiveDispatch(fresh.id);
    }, 100);
    setDraft({ date: todayISO(), jobName: "", clientName: "", subContractor: "", pickup: "", dropoff: "", material: "", trucksExpected: 1, ratePerHour: "142", ratePerTon: "", notes: "" });
    onToast("DISPATCH CREATED — COPY THE LINK");
  };

  const removeDispatch = async (id) => {
    if (!confirm("Delete this dispatch AND all its freight bills?")) return;
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
        <button onClick={() => setShowNew(true)} className="btn-primary"><Plus size={16} /> NEW DISPATCH</button>
      </div>

      {showNew && (
        <div className="modal-bg" onClick={() => setShowNew(false)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>NEW DISPATCH</h3>
              <button onClick={() => setShowNew(false)} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                <div><label className="fbt-label">Date</label><input className="fbt-input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>
                <div><label className="fbt-label">Trucks Expected</label><input className="fbt-input" type="number" min="1" value={draft.trucksExpected} onChange={(e) => setDraft({ ...draft, trucksExpected: e.target.value })} /></div>
              </div>
              <div><label className="fbt-label">Job Name *</label><input className="fbt-input" value={draft.jobName} onChange={(e) => setDraft({ ...draft, jobName: e.target.value })} placeholder="MCI #91684 — Salinas Stormwater Phase 2A" /></div>
              <div>
                <label className="fbt-label">Client (for tracking link)</label>
                <input className="fbt-input" value={draft.clientName || ""} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} placeholder="e.g. Mountain Cascade, Inc. — jobs with same client share a tracking link" />
              </div>
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
                <button onClick={createDispatch} className="btn-primary"><CheckCircle2 size={16} /> CREATE & GET LINK</button>
                <button onClick={() => setShowNew(false)} className="btn-ghost">CANCEL</button>
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
              <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.1em" }}>DISPATCH #{d.code}</div>
                  <h3 className="fbt-display" style={{ fontSize: 22, margin: "4px 0 0" }}>{d.jobName}</h3>
                </div>
                <button onClick={() => setActiveDispatch(null)} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ background: "#FEF3C7", border: "2px solid var(--hazard)", padding: 16, marginBottom: 20 }}>
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ SHARE WITH DRIVER / SUB</div>
                  <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <QRCodeBlock url={shareUrl} size={150} label={`dispatch-${d.code}`} onToast={onToast} />
                    <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 4 }}>▸ LINK</div>
                        <code style={{ display: "block", padding: "8px 12px", background: "#FFF", border: "1px solid var(--steel)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all" }}>{shareUrl}</code>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn-primary" onClick={() => copyLink(d.code)} style={{ padding: "8px 16px", fontSize: 11 }}><Share2 size={12} /> COPY LINK</button>
                        <button className="btn-ghost" onClick={() => printDriverSheet(d, shareUrl, onToast)} style={{ padding: "8px 16px", fontSize: 11 }}><Printer size={12} style={{ marginRight: 4 }} /> PRINT SHEET</button>
                        {(() => {
                          const sub = contacts.find((c) => c.id === d.subContractorId) || (d.subContractor ? contacts.find((c) => (c.companyName || "").toLowerCase() === (d.subContractor || "").toLowerCase()) : null);
                          if (!sub) return null;
                          const msg = buildDispatchMessage(d, shareUrl, company?.name);
                          const smsLink = buildSMSLink(sub.phone, msg);
                          const emailLink = buildEmailLink(sub.email, `Dispatch #${d.code} — ${d.jobName}`, msg);
                          return (
                            <>
                              {smsLink && (
                                <a href={smsLink} className="btn-ghost" style={{ padding: "8px 16px", fontSize: 11, textDecoration: "none" }}>
                                  <MessageSquare size={12} style={{ marginRight: 4 }} /> TEXT {sub.companyName || sub.contactName}
                                </a>
                              )}
                              {emailLink && (
                                <a href={emailLink} className="btn-ghost" style={{ padding: "8px 16px", fontSize: 11, textDecoration: "none" }}>
                                  <Mail size={12} style={{ marginRight: 4 }} /> EMAIL
                                </a>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", lineHeight: 1.5, marginTop: 4 }}>
                        ▸ TEXT THE LINK, OR HAND THEM THE PRINT SHEET AT THE JOB SITE. QR WORKS WITH ANY PHONE CAMERA.
                      </div>
                    </div>
                  </div>
                </div>

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
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 11 }} onClick={() => copyLink(d.code)}><Link2 size={12} style={{ marginRight: 4 }} /> COPY LINK</button>
                      <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 11 }} onClick={() => printDriverSheet(d, `${window.location.origin}${window.location.pathname}#/submit/${d.code}`, onToast)} title="Print driver sheet with QR"><Printer size={12} style={{ marginRight: 4 }} /> PRINT</button>
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
  const extraFees = Number(invoice.extraFees) || 0;
  const discount = Number(invoice.discount) || 0;
  const total = subtotal + extraFees - discount;

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
const InvoicesTab = ({ freightBills, dispatches, invoices, setInvoices, company, setCompany, onToast }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [pricingMethod, setPricingMethod] = useState("ton");
  const [rate, setRate] = useState("");
  const [billTo, setBillTo] = useState({ name: "", address: "", contact: "" });
  const [jobRef, setJobRef] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [terms, setTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [extraFees, setExtraFees] = useState("");
  const [extraFeesLabel, setExtraFeesLabel] = useState("");
  const [discount, setDiscount] = useState("");
  const [includePhotos, setIncludePhotos] = useState(true);
  const [hoursOverride, setHoursOverride] = useState({}); // fb.id -> hours for "per hour" pricing

  useEffect(() => {
    if (company?.defaultTerms && !terms) setTerms(company.defaultTerms);
  }, [company]);

  // Filter freight bills by date + client (dispatch sub/job)
  const matchedBills = useMemo(() => {
    return freightBills.filter((fb) => {
      const fbDate = fb.submittedAt ? fb.submittedAt.slice(0, 10) : "";
      if (fromDate && fbDate < fromDate) return false;
      if (toDate && fbDate > toDate) return false;
      if (clientFilter) {
        const disp = dispatches.find((d) => d.id === fb.dispatchId);
        const hay = `${disp?.subContractor || ""} ${disp?.jobName || ""}`.toLowerCase();
        if (!hay.includes(clientFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [freightBills, dispatches, fromDate, toDate, clientFilter]);

  const previewTotals = useMemo(() => {
    const r = Number(rate) || 0;
    let subtotal = 0;
    matchedBills.forEach((fb) => {
      let qty = 0;
      if (pricingMethod === "ton") qty = Number(fb.tonnage) || 0;
      else if (pricingMethod === "load") qty = Number(fb.loadCount) || 1;
      else if (pricingMethod === "hour") qty = Number(hoursOverride[fb.id] ?? 0);
      subtotal += qty * r;
    });
    const ef = Number(extraFees) || 0;
    const d = Number(discount) || 0;
    return { subtotal, total: subtotal + ef - d };
  }, [matchedBills, rate, pricingMethod, hoursOverride, extraFees, discount]);

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

    const billsWithHours = matchedBills.map((fb) => ({
      ...fb,
      hoursOverride: hoursOverride[fb.id] ?? 0,
    }));

    const invoice = {
      invoiceNumber,
      invoiceDate,
      dueDate,
      billToName: billTo.name,
      billToAddress: billTo.address,
      billToContact: billTo.contact,
      jobReference: jobRef,
      terms,
      notes,
      extraFees,
      extraFeesLabel,
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
      setInvoices(next);

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

        <div style={{ padding: 12, background: matchedBills.length > 0 ? "#FEF3C7" : "#F5F5F4", border: "2px solid var(--steel)", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {matchedBills.length === 0 ? "NO MATCHES" : `${matchedBills.length} FREIGHT BILL${matchedBills.length !== 1 ? "S" : ""} MATCHED`}
          </div>
          {matchedBills.length > 0 && (
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
              TOTAL TONS: {matchedBills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0).toFixed(1)} · TOTAL LOADS: {matchedBills.reduce((s, fb) => s + (Number(fb.loadCount) || 0), 0)}
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
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ ENTER HOURS PER FREIGHT BILL (8-HR MIN APPLIES IF DESIRED)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {matchedBills.map((fb) => (
                <div key={fb.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, minWidth: 90 }}>FB#{fb.freightBillNumber}</span>
                  <input
                    className="fbt-input"
                    type="number"
                    step="0.25"
                    style={{ padding: "6px 10px", fontSize: 13 }}
                    placeholder="hrs"
                    value={hoursOverride[fb.id] ?? ""}
                    onChange={(e) => setHoursOverride({ ...hoursOverride, [fb.id]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bill-to */}
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ 03 / BILL TO</div>
        <div style={{ display: "grid", gap: 14, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div><label className="fbt-label">Client Name *</label><input className="fbt-input" value={billTo.name} onChange={(e) => setBillTo({ ...billTo, name: e.target.value })} placeholder="Mountain Cascade, Inc." /></div>
            <div><label className="fbt-label">Contact / Attn</label><input className="fbt-input" value={billTo.contact} onChange={(e) => setBillTo({ ...billTo, contact: e.target.value })} placeholder="Accounts Payable" /></div>
          </div>
          <div><label className="fbt-label">Address</label><input className="fbt-input" value={billTo.address} onChange={(e) => setBillTo({ ...billTo, address: e.target.value })} placeholder="Street, City, State ZIP" /></div>
          <div><label className="fbt-label">Job Reference</label><input className="fbt-input" value={jobRef} onChange={(e) => setJobRef(e.target.value)} placeholder="MCI #91684 — Salinas Stormwater 2A" /></div>
        </div>

        {/* Terms / notes */}
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ 04 / DETAILS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 14 }}>
          <div><label className="fbt-label">Due Date</label><input className="fbt-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <div><label className="fbt-label">Additional Fees $</label><input className="fbt-input" type="number" step="0.01" value={extraFees} onChange={(e) => setExtraFees(e.target.value)} /></div>
          <div><label className="fbt-label">Fees Label</label><input className="fbt-input" value={extraFeesLabel} onChange={(e) => setExtraFeesLabel(e.target.value)} placeholder="Fuel Surcharge" /></div>
          <div><label className="fbt-label">Discount $</label><input className="fbt-input" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
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
              {Number(extraFees) !== 0 && (
                <tr>
                  <td style={{ fontWeight: 600 }}>{extraFeesLabel || "ADDITIONAL FEES"}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt$(extraFees)}</td>
                </tr>
              )}
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

        <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={generate} className="btn-primary" disabled={matchedBills.length === 0 || !rate || !billTo.name}>
            <FileDown size={16} /> OPEN INVOICE (PRINT / SAVE AS PDF)
          </button>
        </div>
      </div>

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
              <thead><tr><th>Invoice #</th><th>Date</th><th>Bill To</th><th>FBs</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.invoiceNumber}>
                    <td><strong>{inv.invoiceNumber}</strong></td>
                    <td>{inv.invoiceDate}</td>
                    <td>{inv.billToName}</td>
                    <td>{inv.freightBillIds?.length || 0}</td>
                    <td style={{ color: "var(--hazard-deep)", fontWeight: 700 }}>{fmt$(inv.total)}</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => reDownload(inv)}>
                        <FileDown size={12} style={{ marginRight: 4 }} /> OPEN
                      </button>
                      <button className="btn-danger" onClick={() => removeInvoice(inv.invoiceNumber)}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
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
const ContactModal = ({ contact, onSave, onClose, onToast }) => {
  const [draft, setDraft] = useState(contact || {
    type: "sub", companyName: "", contactName: "", phone: "", phone2: "",
    email: "", address: "", typicalTrucks: "", rateNotes: "",
    usdot: "", insurance: "", notes: "", favorite: false,
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

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={18} /> {contact ? "EDIT CONTACT" : "NEW CONTACT"}
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
              </select>
            </div>
            <div>
              <label className="fbt-label">{draft.type === "sub" ? "Company Name" : "Full Name"}</label>
              <input className="fbt-input" value={draft.companyName} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} placeholder={draft.type === "sub" ? "ACME Trucking Inc." : "John Smith"} />
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

          {draft.type === "sub" && (
            <div>
              <label className="fbt-label">Primary Contact Person</label>
              <input className="fbt-input" value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} placeholder="Who to ask for" />
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
            <label className="fbt-label">Address / Office Location</label>
            <input className="fbt-input" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Street, City, State ZIP" />
          </div>

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

          <div>
            <label className="fbt-label">USDOT / MC # / CA MCP</label>
            <input className="fbt-input" value={draft.usdot} onChange={(e) => setDraft({ ...draft, usdot: e.target.value })} placeholder="USDOT 1234567 · MC 000000" />
          </div>

          <div>
            <label className="fbt-label">Insurance Info</label>
            <input className="fbt-input" value={draft.insurance} onChange={(e) => setDraft({ ...draft, insurance: e.target.value })} placeholder="Carrier · Policy # · Expires" />
          </div>

          <div>
            <label className="fbt-label">Internal Notes</label>
            <textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Reliability, strengths, quirks, when to call, when not to, equipment details..." />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <button onClick={save} className="btn-primary"><CheckCircle2 size={16} /> SAVE CONTACT</button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== CONTACT DETAIL MODAL ==========
const ContactDetailModal = ({ contact, dispatches, freightBills, company, onEdit, onDelete, onClose, onToast }) => {
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

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.1em" }}>
              {contact.type === "sub" ? "SUB-CONTRACTOR" : "DRIVER"}{contact.favorite && " · ★ PREFERRED"}
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

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {showModal && (
        <ContactModal
          contact={editing}
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
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{contacts.length}</div>
          <div className="stat-label">Total Contacts</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{subsCount}</div>
          <div className="stat-label">Sub-Contractors</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{driversCount}</div>
          <div className="stat-label">Drivers</div>
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
          <option value="sub">Subs Only</option>
          <option value="driver">Drivers Only</option>
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
                        <span className="chip" style={{ background: c.type === "sub" ? "var(--hazard)" : "#FFF", fontSize: 9, padding: "2px 8px" }}>
                          {c.type === "sub" ? "SUB" : "DRIVER"}
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
const ReportsTab = ({ dispatches, freightBills, logs, invoices, quotes, quarries, contacts, company, onToast, lastViewedMondayReport, setLastViewedMondayReport }) => {
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

const Dashboard = ({ state, setters, onToast, onExit, onLogout, onChangePassword }) => {
  const [tab, setTab] = useState("dispatches");
  const { logs, quotes, fleet, dispatches, freightBills, invoices, company, contacts, unreadIds, soundEnabled, browserNotifsEnabled, quarries, lastViewedMondayReport } = state;
  const { setLogs, setQuotes, setFleet, setDispatches, setFreightBills, setInvoices, setCompany, setContacts, markAllRead, markDispatchRead, toggleSound, toggleBrowserNotifs, setQuarries, setLastViewedMondayReport } = setters;
  const [pendingDispatch, setPendingDispatch] = useState(null);
  const tabs = [
    { k: "dispatches", l: "Dispatches", ico: <ClipboardList size={16} /> },
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
        {tab === "dispatches" && <DispatchesTab dispatches={dispatches} setDispatches={setDispatches} freightBills={freightBills} setFreightBills={setFreightBills} contacts={contacts} company={company} unreadIds={unreadIds || []} markDispatchRead={markDispatchRead} pendingDispatch={pendingDispatch} clearPendingDispatch={() => setPendingDispatch(null)} quarries={quarries || []} onToast={onToast} />}
        {tab === "invoices" && <InvoicesTab freightBills={freightBills} dispatches={dispatches} invoices={invoices} setInvoices={setInvoices} company={company} setCompany={setCompany} onToast={onToast} />}
        {tab === "contacts" && <ContactsTab contacts={contacts} setContacts={setContacts} dispatches={dispatches} freightBills={freightBills} company={company} onToast={onToast} />}
        {tab === "hours" && <HoursTab logs={logs} setLogs={setLogs} onToast={onToast} />}
        {tab === "billing" && <BillingTab logs={logs} onToast={onToast} />}
        {tab === "quotes" && <QuotesTab quotes={quotes} setQuotes={setQuotes} onToast={onToast} />}
        {tab === "fleet" && <FleetTab fleet={fleet} setFleet={setFleet} onToast={onToast} />}
        {tab === "materials" && <MaterialsTab quarries={quarries || []} setQuarries={setQuarries} dispatches={dispatches} onToast={onToast} />}
        {tab === "reports" && <ReportsTab dispatches={dispatches} freightBills={freightBills} logs={logs} invoices={invoices} quotes={quotes} quarries={quarries || []} contacts={contacts || []} company={company} onToast={onToast} lastViewedMondayReport={lastViewedMondayReport} setLastViewedMondayReport={setLastViewedMondayReport} />}
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

      // Load dispatches + freight bills + contacts + quarries + invoices from Supabase
      const [cloudDispatches, cloudFreightBills, cloudContacts, cloudQuarries, cloudInvoices] = await Promise.all([
        fetchDispatches(),
        fetchFreightBills(),
        fetchContacts(),
        fetchQuarries(),
        fetchInvoices(),
      ]);
      setDispatches(cloudDispatches);
      setFreightBills(cloudFreightBills);
      setContactsState(cloudContacts);
      setQuarriesState(cloudQuarries);
      setInvoicesState(cloudInvoices);
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

    return () => {
      unsubFB?.();
      unsubD?.();
      unsubC?.();
      unsubQ?.();
      unsubI?.();
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

  const handleQuoteSubmit = async (quote) => { const next = [quote, ...quotes]; setQuotes(next); await storageSet("fbt:quotes", next); };
  // Driver upload — insert directly to Supabase (public insert allowed, bypasses the diff logic)
  const handleTruckSubmit = async (fb) => {
    try {
      const { id: _drop, ...rest } = fb;
      const newRow = await insertFreightBill(rest);
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

  const submitMatch = route.match(/^#\/submit\/([A-Z0-9]+)/i);
  const trackMatch = route.match(/^#\/track\/([A-Z0-9]+)/i);
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
    const d = dispatches.find((x) => x.code.toUpperCase() === code);
    const enriched = d ? { ...d, submittedCount: freightBills.filter(fb => fb.dispatchId === d.id).length } : null;
    return (
      <div className="fbt-root">
        <GlobalStyles />
        <DriverUploadPage dispatch={enriched} onSubmitTruck={handleTruckSubmit} onBack={() => { window.location.hash = ""; }} />
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
            state={{ logs, quotes, fleet, dispatches, freightBills, invoices, company, contacts, unreadIds, soundEnabled, browserNotifsEnabled, quarries, lastViewedMondayReport }}
            setters={{ setLogs, setQuotes, setFleet, setDispatches: setDispatchesShared, setFreightBills: setFreightBillsShared, setInvoices, setCompany, setContacts, markAllRead, markDispatchRead, toggleSound, toggleBrowserNotifs, setQuarries, setLastViewedMondayReport }}
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
