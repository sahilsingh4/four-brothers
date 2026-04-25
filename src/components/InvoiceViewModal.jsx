import { useState, useEffect } from "react";
import { Camera, Trash2, X } from "lucide-react";
import { fmt$ } from "../utils";
import { logAudit, updateInvoice } from "../db";

export const InvoiceViewModal = ({ invoice, freightBills, contacts = [], dispatches = [], projects = [], editFreightBill, setInvoices, invoices = [], onJumpToPayroll, onClose, onToast, FBPhotoGallery }) => {
  const invFbs = (invoice.freightBillIds || []).map((id) => freightBills.find((fb) => fb.id === id)).filter(Boolean);
  const history = invoice.paymentHistory || [];
  const balance = (Number(invoice.total) || 0) - (Number(invoice.amountPaid) || 0);
  // v18 Batch 2 Session D: photo gallery toggle
  const [showPhotos, setShowPhotos] = useState(false);
  // Count photos across this invoice's FBs (for button label)
  const invoicePhotoCount = invFbs.reduce((s, fb) => s + (fb.photos?.length || 0), 0);

  // v18: Delete payment handler. Removes payment from history, recalcs totals,
  // and clears customerPaidAt on FBs that were ONLY linked to this deleted payment.
  const [deletingIdx, setDeletingIdx] = useState(null);
  const deletePayment = async (idx) => {
    const payment = history[idx];
    if (!payment) return;
    const msg = `Delete this payment?\n\n${fmt$(payment.amount)} · ${payment.date ? new Date(payment.date).toLocaleDateString() : "—"} · ${(payment.method || "").toUpperCase()}${payment.reference ? ` #${payment.reference}` : ""}\n\nThis will recalculate the invoice balance. Any FBs marked "customer paid" by this payment will be reverted if no other payment covers them.`;
    if (!confirm(msg)) return;

    setDeletingIdx(idx);
    try {
      // 1. Build new history without this entry
      const newHistory = history.filter((_, i) => i !== idx);
      const newAmountPaid = newHistory.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const newTotal = Number(invoice.total) || 0;
      let newStatus = "outstanding";
      if (newTotal > 0 && newAmountPaid >= newTotal - 0.01) newStatus = "paid";
      else if (newAmountPaid > 0) newStatus = "partial";

      // 2. For FBs the deleted payment touched, check if ANOTHER remaining payment still covers them.
      // If no remaining payment covers the FB, clear its customerPaidAt/customerPaidAmount.
      const affectedFbIds = payment.mode === "perfb" && payment.fbIds?.length > 0
        ? payment.fbIds
        : (invoice.freightBillIds || []);  // "full" mode touched all FBs

      for (const fbId of affectedFbIds) {
        const fb = freightBills.find((f) => f.id === fbId);
        if (!fb) continue;
        if (!fb.customerPaidAt) continue;  // wasn't paid — nothing to clear

        // Is there any remaining payment (in newHistory) that references this FB?
        const stillCovered = newHistory.some((p) => {
          if (p.mode === "perfb") return p.fbIds?.includes(fbId);
          // "full" mode covers all FBs on the invoice
          return (invoice.freightBillIds || []).includes(fbId);
        });
        if (stillCovered) continue;

        // No remaining payment covers this FB — clear the paid stamp
        try {
          await editFreightBill(fbId, {
            ...fb,
            customerPaidAt: null,
            customerPaidAmount: null,
          });
        } catch (e) {
          console.error("Clear customerPaidAt failed for FB:", fbId, e);
        }
      }

      // 3. Update the invoice with new history + recalculated totals
      const updatedInvoice = {
        ...invoice,
        amountPaid: newAmountPaid,
        paymentHistory: newHistory,
        paymentStatus: newStatus,
      };
      try {
        // v19c Session M: optimistic lock via invoice.updatedAt
        await updateInvoice(invoice.id, updatedInvoice, invoice.updatedAt);
        // Also push to local state so the modal's displayed data refreshes
        if (setInvoices && Array.isArray(invoices)) {
          const nextInvoices = invoices.map((i) => i.id === invoice.id ? updatedInvoice : i);
          setInvoices(nextInvoices);
        }
      } catch (e) {
        if (e?.code === "CONCURRENT_EDIT") {
          onToast("⚠ SOMEONE ELSE EDITED THIS INVOICE — CLOSE + REOPEN TO RETRY");
          return;
        }
        console.error("updateInvoice failed:", e);
        onToast("⚠ DELETE FAILED — DATABASE ERROR");
        return;
      }

      onToast(`✓ PAYMENT DELETED — ${fmt$(payment.amount)}`);
      // v20 Session O: audit log
      logAudit({
        actionType: "invoice.payment_deleted",
        entityType: "invoice", entityId: invoice.id,
        entityLabel: invoice.invoiceNumber || "—",
        metadata: {
          deletedAmount: payment.amount,
          deletedMethod: payment.method,
          deletedReference: payment.reference || "",
          deletedDate: payment.date,
          newAmountPaid,
          newStatus,
        },
      });
      // Don't close the modal — admin might want to delete more.
      // But the modal is rendered with the STALE `invoice` prop. Caller must re-fetch.
      // Workaround: close modal to force re-render with fresh data.
      setTimeout(() => { onClose(); }, 300);
    } catch (e) {
      console.error("deletePayment failed:", e);
      onToast("⚠ DELETE FAILED");
    } finally {
      setDeletingIdx(null);
    }
  };

  // Compute payroll status for each FB — who got paid, what's still owed
  const payrollByFb = invFbs.map((fb) => {
    const dispatch = dispatches.find((d) => d.id === fb.dispatchId);
    const assignment = (dispatch?.assignments || []).find((a) => a.aid === fb.assignmentId);
    const contact = assignment?.contactId ? contacts.find((c) => c.id === assignment.contactId) : null;
    const subName = assignment?.name || "—";
    const isPaid = !!fb.paidAt;
    return {
      fb,
      assignment,
      contact,
      subName,
      subKind: assignment?.kind,
      isPaid,
      paidAmount: fb.paidAmount,
      paidMethod: fb.paidMethod,
      paidCheckNumber: fb.paidCheckNumber,
      paidAt: fb.paidAt,
    };
  });

  // Group by sub for summary
  const payrollBySub = new Map();
  payrollByFb.forEach((p) => {
    if (!p.assignment) return;
    const key = p.assignment.contactId || `anon_${p.assignment.aid}`;
    if (!payrollBySub.has(key)) {
      payrollBySub.set(key, { name: p.subName, kind: p.subKind, subId: p.assignment.contactId, fbs: [], paidCount: 0, unpaidCount: 0, paidTotal: 0 });
    }
    const e = payrollBySub.get(key);
    e.fbs.push(p);
    if (p.isPaid) { e.paidCount++; e.paidTotal += Number(p.paidAmount) || 0; }
    else e.unpaidCount++;
  });
  const payrollSummary = Array.from(payrollBySub.values());

  // v18 Batch 2: Escape closes modal
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape" && deletingIdx === null) onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [deletingIdx]);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        {/* v18 Batch 2 Session D: contextual photo gallery */}
        {showPhotos && (
          <FBPhotoGallery
            title={`PHOTOS · INVOICE ${invoice.invoiceNumber}`}
            freightBills={freightBills}
            dispatches={dispatches}
            contacts={contacts}
            projects={projects}
            invoices={invoices}
            initialInvoiceId={invoice.id}
            onClose={() => setShowPhotos(false)}
          />
        )}
        <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)" }}>INVOICE DETAILS</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>{invoice.invoiceNumber}</h3>
            <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1", marginTop: 2 }}>
              {invoice.billToName} · Total {fmt$(invoice.total)} · Paid {fmt$(invoice.amountPaid || 0)} · Balance {fmt$(balance)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {invoicePhotoCount > 0 && (
              <button
                onClick={() => setShowPhotos(true)}
                style={{ background: "var(--hazard)", color: "var(--steel)", border: "none", padding: "6px 10px", cursor: "pointer", fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}
                title="View all photos attached to this invoice's freight bills"
              >
                <Camera size={12} style={{ marginRight: 4, verticalAlign: "middle" }} /> PHOTOS ({invoicePhotoCount})
              </button>
            )}
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 16 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ PAYMENT HISTORY</div>
            {history.length === 0 ? (
              <div style={{ padding: 18, textAlign: "center", background: "#F5F5F4", fontSize: 12, color: "var(--concrete)" }}>
                No payments recorded yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 4 }}>
                {history.map((p, idx) => (
                  <div key={idx} style={{ padding: 10, background: "#F0FDF4", border: "1.5px solid var(--good)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 12, fontFamily: "JetBrains Mono, monospace", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <strong>{fmt$(p.amount)}</strong> · {p.date ? new Date(p.date).toLocaleDateString() : "—"} · {p.method?.toUpperCase()}{p.reference ? ` #${p.reference}` : ""}
                      {p.mode === "perfb" && p.fbIds?.length > 0 && <span style={{ color: "var(--concrete)" }}> · {p.fbIds.length} FB{p.fbIds.length !== 1 ? "s" : ""}</span>}
                      {p.notes && <div style={{ color: "var(--concrete)", fontSize: 11, marginTop: 2, fontStyle: "italic" }}>"{p.notes}"</div>}
                    </div>
                    {editFreightBill && setInvoices && (
                      <button
                        type="button"
                        disabled={deletingIdx === idx}
                        onClick={() => deletePayment(idx)}
                        style={{ padding: "4px 10px", fontSize: 10, background: "transparent", border: "1.5px solid var(--safety)", color: "var(--safety)", cursor: deletingIdx === idx ? "wait" : "pointer", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, letterSpacing: "0.05em" }}
                        title="Delete this payment (reverses any linked FB paid stamps)"
                      >
                        {deletingIdx === idx ? "..." : <><Trash2 size={11} style={{ marginRight: 3, verticalAlign: "middle" }} /> DELETE</>}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ FREIGHT BILLS ON THIS INVOICE ({invFbs.length})</div>
            <div style={{ display: "grid", gap: 4, maxHeight: 300, overflowY: "auto" }}>
              {invFbs.map((fb) => {
                const paid = !!fb.customerPaidAt;
                return (
                  <div key={fb.id} style={{ padding: 8, background: paid ? "#F0FDF4" : "#FEF3C7", border: "1px solid var(--steel)", borderLeft: `3px solid ${paid ? "var(--good)" : "var(--hazard)"}`, fontSize: 11, fontFamily: "JetBrains Mono, monospace", display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <strong>FB#{fb.freightBillNumber || "—"}</strong> · {fb.driverName || "—"}{fb.truckNumber ? ` · T${fb.truckNumber}` : ""}
                      <div style={{ color: "var(--concrete)", fontSize: 10, marginTop: 2 }}>
                        {fb.tonnage ? `${fb.tonnage}T` : ""}
                        {fb.loadCount ? ` · ${fb.loadCount} loads` : ""}
                        {fb.hoursBilled ? ` · ${fb.hoursBilled} hrs` : ""}
                      </div>
                    </div>
                    {paid ? (
                      <div style={{ color: "var(--good)", fontWeight: 700, whiteSpace: "nowrap" }}>
                        ✓ {fb.customerPaidAt.slice(0, 10)}
                        {fb.customerPaidAmount != null && <div style={{ fontSize: 10 }}>{fmt$(fb.customerPaidAmount)}</div>}
                      </div>
                    ) : (
                      <span style={{ color: "var(--hazard-deep)", fontWeight: 700, fontSize: 10 }}>UNPAID</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PAYROLL STATUS — subs/drivers who worked this invoice */}
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ PAYROLL STATUS — SUBS/DRIVERS WHO WORKED THIS INVOICE ({payrollSummary.length})</div>
            {payrollSummary.length === 0 ? (
              <div style={{ padding: 12, background: "#F5F5F4", fontSize: 11, color: "var(--concrete)", fontStyle: "italic" }}>
                No assignments linked to these FBs.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {payrollSummary.map((p, idx) => {
                  const allPaid = p.unpaidCount === 0 && p.paidCount > 0;
                  const bg = allPaid ? "#F0FDF4" : p.paidCount > 0 ? "#FEF3C7" : "#FEE2E2";
                  const borderColor = allPaid ? "var(--good)" : p.paidCount > 0 ? "var(--hazard)" : "var(--safety)";
                  return (
                    <div
                      key={idx}
                      onClick={() => p.subId && onJumpToPayroll && onJumpToPayroll(p.subId)}
                      style={{
                        padding: 10, background: bg, border: "1.5px solid " + borderColor,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        flexWrap: "wrap", gap: 8, fontSize: 12, fontFamily: "JetBrains Mono, monospace",
                        cursor: p.subId && onJumpToPayroll ? "pointer" : "default",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <span className="chip" style={{ background: p.kind === "driver" ? "#FFF" : "var(--hazard)", fontSize: 9, padding: "2px 7px", marginRight: 6 }}>
                          {p.kind === "driver" ? "DRIVER" : "SUB"}
                        </span>
                        <strong>{p.name}</strong>
                        <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                          {p.paidCount > 0 && `${p.paidCount} paid · `}
                          {p.unpaidCount > 0 && `${p.unpaidCount} unpaid · `}
                          {p.fbs.length} FB{p.fbs.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {allPaid ? (
                          <div style={{ color: "var(--good)", fontWeight: 700, fontSize: 11 }}>✓ PAID {fmt$(p.paidTotal)}</div>
                        ) : p.paidCount > 0 ? (
                          <div>
                            <div style={{ color: "var(--hazard-deep)", fontWeight: 700, fontSize: 11 }}>PARTIAL</div>
                            <div style={{ fontSize: 10, color: "var(--concrete)" }}>{p.unpaidCount} still owed</div>
                          </div>
                        ) : (
                          <div style={{ color: "var(--safety)", fontWeight: 700, fontSize: 11 }}>UNPAID</div>
                        )}
                        {p.subId && onJumpToPayroll && (
                          <div style={{ fontSize: 9, color: "var(--concrete)", marginTop: 2, letterSpacing: "0.08em" }}>TAP TO VIEW ▸</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} className="btn-ghost">CLOSE</button>
          </div>
        </div>
      </div>
    </div>
  );
};
