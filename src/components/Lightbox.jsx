import { X } from "lucide-react";

// Modal overlay that displays a single image full-bleed. Clicking the
// background or the close button calls onClose; clicks on the image itself
// don't bubble (so users can drag/zoom natively without dismissing).
export const Lightbox = ({ src, onClose }) => (
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
