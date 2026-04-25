import { fmtDate, fmtDateTime, computeDispatchSummary } from "../utils";

// Single dispatch tracking card (also used in client-wide view).
// Shows status, progress bar, totals, and the list of submitted FBs with photos.
export const DispatchTrackingCard = ({ dispatch, bills, expanded, onPhotoClick }) => {
  const { totalTons, totalLoads, pct, statusLabel, statusColor } = computeDispatchSummary(dispatch, bills);
  return (
    <div className="fbt-card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="hazard-stripe-thin" style={{ height: 6 }} />
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <span className="chip" style={{ background: statusColor, color: "#FFF", borderColor: "var(--steel)" }}>● {statusLabel}</span>
              <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>{fmtDate(dispatch.date)}</span>
            </div>
            <h3 className="fbt-display" style={{ fontSize: 22, margin: "0 0 6px", lineHeight: 1.15 }}>{dispatch.jobName}</h3>
            <div className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)" }}>
              {dispatch.material && <>MATERIAL ▸ {dispatch.material}</>}
              {dispatch.pickup && <><br />PICKUP ▸ {dispatch.pickup}</>}
              {dispatch.dropoff && <><br />DROPOFF ▸ {dispatch.dropoff}</>}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "JetBrains Mono, monospace", marginBottom: 4, color: "var(--concrete)" }}>
            <span>▸ {bills.length} / {dispatch.trucksExpected} TRUCKS IN</span>
            <span>{pct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 10, background: "#E7E5E4", border: "1px solid var(--steel)" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "var(--good)" : "var(--hazard)", transition: "width 0.4s ease" }} />
          </div>
        </div>

        {/* Totals */}
        {bills.length > 0 && (
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            <div style={{ padding: 12, border: "1.5px solid var(--steel)", background: "#FFF" }}>
              <div className="fbt-display" style={{ fontSize: 22, lineHeight: 1 }}>{totalTons.toFixed(1)}</div>
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.1em", marginTop: 2 }}>TOTAL TONS</div>
            </div>
            <div style={{ padding: 12, border: "1.5px solid var(--steel)", background: "#FFF" }}>
              <div className="fbt-display" style={{ fontSize: 22, lineHeight: 1 }}>{totalLoads}</div>
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.1em", marginTop: 2 }}>LOADS</div>
            </div>
            <div style={{ padding: 12, border: "1.5px solid var(--steel)", background: "var(--hazard)" }}>
              <div className="fbt-display" style={{ fontSize: 22, lineHeight: 1 }}>{bills.length}</div>
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--steel)", letterSpacing: "0.1em", marginTop: 2, fontWeight: 700 }}>FREIGHT BILLS</div>
            </div>
          </div>
        )}

        {/* Freight bill list (when expanded or always if short) */}
        {expanded && bills.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ FREIGHT BILLS SUBMITTED</div>
            <div style={{ display: "grid", gap: 8 }}>
              {bills.map((fb) => (
                <div key={fb.id} style={{ border: "1.5px solid var(--steel)", background: "#FFF", padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div className="fbt-display" style={{ fontSize: 15 }}>FB #{fb.freightBillNumber}</div>
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
                        {fb.driverName} · TRUCK {fb.truckNumber}
                        {fb.tonnage && <> · {fb.tonnage} TONS</>}
                      </div>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2, opacity: 0.7 }}>
                        DELIVERED ▸ {fmtDateTime(fb.submittedAt)}
                      </div>
                    </div>
                    {fb.photos && fb.photos.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {fb.photos.slice(0, 3).map((p) => (
                          <img key={p.id} src={p.dataUrl} onClick={() => onPhotoClick?.(p.dataUrl)} style={{ width: 48, height: 48, objectFit: "cover", border: "1.5px solid var(--steel)", cursor: "pointer" }} alt="ticket" />
                        ))}
                        {fb.photos.length > 3 && (
                          <div style={{ width: 48, height: 48, border: "1.5px dashed var(--concrete)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)" }}>
                            +{fb.photos.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
