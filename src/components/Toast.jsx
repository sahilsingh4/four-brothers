import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

// Toast accepts either a plain string (legacy calls) or
// { msg, action: { label, onClick }, duration } for interactive toasts (e.g. undo).
// It auto-dismisses after `duration` ms (defaults: 2.8s plain, 6s with an action).
export const Toast = ({ msg, onClose }) => {
  const isObj = msg && typeof msg === "object";
  const text = isObj ? msg.msg : msg;
  const action = isObj ? msg.action : null;
  const duration = isObj && msg.duration ? msg.duration : (action ? 6000 : 2800);
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);
  return (
    <div className="toast">
      <CheckCircle2 size={18} /> {text}
      {action && (
        <button
          onClick={() => { action.onClick(); onClose(); }}
          style={{
            marginLeft: 10, background: "var(--hazard)", color: "var(--steel)",
            border: "2px solid var(--hazard)", padding: "4px 10px", cursor: "pointer",
            fontFamily: "inherit", fontWeight: 700, fontSize: 12, letterSpacing: "0.08em",
          }}
        >{action.label}</button>
      )}
    </div>
  );
};
