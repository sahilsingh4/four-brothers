import { useState, useMemo } from "react";
import { Edit2, Trash2, X, History } from "lucide-react";
import { fmt$, fmtDate } from "../utils";

// Read-only detail card for a single quarry: contact info, notes,
// materials with current pricing + per-material price history,
// and the list of dispatches that sourced from this quarry.
export const QuarryDetailModal = ({ quarry, dispatches, onEdit, onDelete, onClose }) => {
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
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)" }}>QUARRY / SUPPLIER</div>
            <h3 className="fbt-display" style={{ fontSize: 22, margin: "4px 0 0" }}>{quarry.name}</h3>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onEdit} className="btn-ghost" style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "6px 12px", fontSize: 11 }}><Edit2 size={12} /></button>
            <button onClick={onDelete} className="btn-danger" style={{ color: "var(--hazard)", borderColor: "var(--hazard)" }}><Trash2 size={12} /></button>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ CONTACT & OPS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 20, fontSize: 13 }}>
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
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ NOTES</div>
              <div style={{ padding: 12, background: "#FEF3C7", borderLeft: "3px solid var(--hazard)", fontSize: 13, marginBottom: 20, whiteSpace: "pre-wrap" }}>
                {quarry.notes}
              </div>
            </>
          )}

          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ MATERIALS & CURRENT PRICING</div>
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
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8 }}>PRICE HISTORY (NEWEST FIRST)</div>
                      <div style={{ display: "grid", gap: 4 }}>
                        {m.history.map((h, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
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
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>
                ▸ SOURCED ON {linkedDispatches.length} DISPATCH{linkedDispatches.length !== 1 ? "ES" : ""}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {linkedDispatches.slice(0, 10).map((d) => (
                  <div key={d.id} style={{ padding: 10, border: "1px solid var(--steel)", background: "#FFF", fontSize: 12 }}>
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
