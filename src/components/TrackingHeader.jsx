import { Truck } from "lucide-react";

// Header bar shown on the public tracking pages (per-dispatch and per-client).
// Renders the company logo (or a fallback truck tile) and the company name +
// "CLIENT TRACKING · LIVE" tagline.
export const TrackingHeader = ({ company }) => (
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
