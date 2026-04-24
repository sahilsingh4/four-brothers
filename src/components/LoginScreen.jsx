import { useState } from "react";
import { Lock, AlertCircle, ArrowRight } from "lucide-react";
import { supabase } from "../supabase";
import { validateEmail } from "../utils";

// Staff sign-in screen. Calls supabase.auth.signInWithPassword and
// surfaces whatever error it returns. onSuccess receives the user object.
export const LoginScreen = ({ onSuccess, onCancel }) => {
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
              <label htmlFor="login-email" className="fbt-label">Email</label>
              <input id="login-email" className="fbt-input" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} autoFocus placeholder="you@example.com" />
            </div>
            <div>
              <label htmlFor="login-password" className="fbt-label">Password</label>
              <input id="login-password" className="fbt-input" type="password" autoComplete="current-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} />
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
