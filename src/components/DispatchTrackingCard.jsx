import { fmtDate, fmtDateTime, computeDispatchSummary } from "../utils";

// Single dispatch tracking card (also used in client-wide view).
// Shows status, progress bar, totals, and the list of submitted FBs with photos.
export const DispatchTrackingCard = ({ dispatch, bills, expanded, onPhotoClick }) => {
  const {
    totalTons, totalLoads, pct, statusLabel, statusColor,
    approvedCount, pendingReviewCount,
    invoicedCount, pendingInvoiceCount,
    paidOutCount, customerPaidCount,
    flaggedCount,
  } = computeDispatchSummary(dispatch, bills);
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
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4, color: "var(--concrete)" }}>
            <span>▸ {bills.length} / {dispatch.trucksExpected} TRUCKS IN</span>
            <span>{pct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 10, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "var(--good)" : "var(--hazard)", transition: "width 0.4s ease" }} />
          </div>
        </div>

        {/* F3: Pipeline status — review/invoice/paid counts at a glance, plus a flagged-FB warning. */}
        {bills.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {pendingReviewCount > 0 && (
              <span className="chip" title="Freight bills awaiting end-of-day review" style={{ background: "#FEF3C7", color: "var(--hazard-deep)", borderColor: "var(--hazard)" }}>
                {pendingReviewCount} TO REVIEW
              </span>
            )}
            {approvedCount > 0 && (
              <span className="chip" title="Approved FBs" style={{ background: "#F0FDF4", color: "var(--good)", borderColor: "var(--good)" }}>
                {approvedCount} APPROVED
              </span>
            )}
            {pendingInvoiceCount > 0 && (
              <span className="chip" title="Approved FBs not yet on an invoice" style={{ background: "#EFF6FF", color: "var(--hazard-deep)", borderColor: "var(--hazard)" }}>
                {pendingInvoiceCount} TO INVOICE
              </span>
            )}
            {invoicedCount > 0 && (
              <span className="chip" title="FBs on an invoice" style={{ background: "var(--surface)", color: "var(--steel)", borderColor: "var(--line)" }}>
                {invoicedCount} INVOICED
              </span>
            )}
            {paidOutCount > 0 && (
              <span className="chip" title="FBs paid out to subs" style={{ background: "#F0FDF4", color: "var(--good)", borderColor: "var(--good)" }}>
                {paidOutCount} SUB PAID
              </span>
            )}
            {customerPaidCount > 0 && customerPaidCount === bills.length && (
              <span className="chip" title="Customer paid the invoice for all FBs" style={{ background: "#F0FDF4", color: "var(--good)", borderColor: "var(--good)" }}>
                ✓ CUST PAID
              </span>
            )}
            {flaggedCount > 0 && (
              <span className="chip" title="FBs missing proof-of-haul photos" style={{ background: "#FEF2F2", color: "var(--safety)", borderColor: "var(--safety)" }}>
                ⚠ {flaggedCount} NO PHOTOS
              </span>
            )}
          </div>
        )}

        {/* Totals */}
        {bills.length > 0 && (
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            <div style={{ padding: 12, border: "1.5px solid var(--steel)", background: "#FFF" }}>
              <div className="fbt-display" style={{ fontSize: 22, lineHeight: 1 }}>{totalTons.toFixed(1)}</div>
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginTop: 2 }}>TOTAL TONS</div>
            </div>
            <div style={{ padding: 12, border: "1.5px solid var(--steel)", background: "#FFF" }}>
              <div className="fbt-display" style={{ fontSize: 22, lineHeight: 1 }}>{totalLoads}</div>
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginTop: 2 }}>LOADS</div>
            </div>
            <div style={{ padding: 12, border: "1.5px solid var(--steel)", background: "var(--hazard)" }}>
              <div className="fbt-display" style={{ fontSize: 22, lineHeight: 1 }}>{bills.length}</div>
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--steel)", marginTop: 2, fontWeight: 700 }}>FREIGHT BILLS</div>
            </div>
          </div>
        )}

        {/* Freight bill list (when expanded or always if short) */}
        {expanded && bills.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 8 }}>▸ FREIGHT BILLS SUBMITTED</div>
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
                          <div style={{ width: 48, height: 48, border: "1.5px dashed var(--concrete)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--concrete)" }}>
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
