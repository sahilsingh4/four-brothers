import { fmt$ } from "../utils";

// Shared dashboard tile used on both the admin Home tab and the customer portal.
// Colored bar with title + count + optional total (formatted via fmt$),
// then a body for child content. Renders an empty-state message when count===0.
export const SectionCard = ({ title, icon, count, total, color = "var(--steel)", bg = "#FFF", onClick, children, empty }) => (
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

// Row inside a SectionCard list. Pure presentational, props-only.
export const Row = ({ left, right, sub, onClick }) => (
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
