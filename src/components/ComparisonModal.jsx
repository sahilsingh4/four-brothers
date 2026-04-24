import { useMemo } from "react";
import { BarChart3, X, Package } from "lucide-react";
import { fmt$, fmtDate } from "../utils";

// Cross-quarry material price comparison. Given a free-text materialSearch,
// finds every quarry that sells a matching material and ranks them by
// pricePerTon ascending. The cheapest match is highlighted with a "BEST PRICE"
// chip and a green background.
export const ComparisonModal = ({ quarries, materialSearch, onClose }) => {
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
