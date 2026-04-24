import { useState } from "react";
import { Download, AlertCircle } from "lucide-react";

// Uses goqr.me's free public API — no key required, returns PNG.
// Exported so the printable driver sheet (printDriverSheet in App.jsx) can
// reuse the same URL builder.
export const qrServiceUrl = (data, size = 300) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=10&color=1C1917&bgcolor=FAFAF9`;

// Renders a QR code with a "SAVE PNG" button. If the QR service is offline
// (image fails to load), shows an inline fallback message instead of an
// inscrutable broken-image icon.
export const QRCodeBlock = ({ url, size = 180, label, onToast }) => {
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
