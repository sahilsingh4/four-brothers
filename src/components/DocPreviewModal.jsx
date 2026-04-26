import { useEffect, useMemo } from "react";
import { Download, X } from "lucide-react";

// In-page preview for compliance docs. Images render full-size; PDFs render
// in an iframe via a blob URL (data: URLs are unreliable for PDF rendering
// on iOS Safari and desktop Chrome with strict CSP — the blob URL works
// universally). Includes a Download button.
export const DocPreviewModal = ({ doc, onClose }) => {
  const isPdf = useMemo(() => {
    if (!doc) return false;
    return /\.pdf$/i.test(doc.fileName || "")
      || (doc.dataUrl || "").startsWith("data:application/pdf");
  }, [doc]);

  // Convert data URL to a blob URL for PDF iframe rendering. Revoke on
  // unmount to avoid leaking object URLs.
  const blobUrl = useMemo(() => {
    if (!doc?.dataUrl || !isPdf) return null;
    try {
      const [meta, b64] = doc.dataUrl.split(",");
      const m = meta.match(/data:(.*?);/);
      const mime = m ? m[1] : "application/pdf";
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.warn("blob conversion failed:", e);
      return null;
    }
  }, [doc, isPdf]);

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!doc) return null;

  return (
    <div
      className="modal-bg"
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 12 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#FFF", maxWidth: 960, width: "100%", maxHeight: "94vh", borderRadius: 10, padding: 0, boxShadow: "0 8px 24px rgba(15,23,42,0.18)", display: "flex", flexDirection: "column" }}
      >
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--steel)", color: "var(--cream)" }}>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div className="fbt-display" style={{ fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.label || doc.kind}</div>
            <div className="fbt-mono" style={{ fontSize: 10, opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.fileName || "—"}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <a
              href={doc.dataUrl}
              download={doc.fileName || `${doc.kind}-${doc.id}`}
              className="btn-ghost"
              style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "4px 10px", fontSize: 11, textDecoration: "none" }}
              title="Download"
            >
              <Download size={14} /> DOWNLOAD
            </a>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer", padding: 4 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", background: "#1F2937", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isPdf && blobUrl ? (
            <iframe
              src={blobUrl}
              title={doc.label || "Document preview"}
              style={{ width: "100%", height: "82vh", border: "none", background: "#FFF" }}
            />
          ) : isPdf ? (
            <div style={{ padding: 40, color: "#FFF", textAlign: "center" }}>
              <p>Couldn't render PDF inline. Use the Download button above.</p>
            </div>
          ) : (
            <img
              src={doc.dataUrl}
              alt={doc.label || ""}
              style={{ maxWidth: "100%", maxHeight: "82vh", objectFit: "contain", display: "block" }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
