import { useState } from "react";
import { KeyRound, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "../supabase";
import { validatePassword } from "../utils";

// Modal for changing the signed-in user's password. Validates on the client
// (12+ chars, mixed complexity, no common words), then calls
// supabase.auth.updateUser. onToast is the standard string toast — passes
// "PASSWORD CHANGED" on success.
export const ChangePasswordModal = ({ onClose, onToast }) => {
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
            <label htmlFor="cpw-new" className="fbt-label">New Password</label>
            <input id="cpw-new" className="fbt-input" type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} placeholder="12+ chars · upper + lower + number + symbol" autoFocus />
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 6, lineHeight: 1.6, letterSpacing: "0.03em" }}>
              ▸ MIN 12 CHARS · MIX CASE · INCLUDE A NUMBER · INCLUDE A SYMBOL<br/>
              ▸ NO COMMON WORDS (PASSWORD, BROTHERS, TRUCKING, QWERTY, 123456)<br/>
              ▸ NO 3+ REPEATED CHARS IN A ROW
            </div>
          </div>
          <div>
            <label htmlFor="cpw-confirm" className="fbt-label">Confirm New Password</label>
            <input id="cpw-confirm" className="fbt-input" type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} />
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
