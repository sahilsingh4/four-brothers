import { X } from "lucide-react";
import { fmt$ } from "../utils";

// FB Trace — read-only forensic view of a single freight bill's
// money flow: FB details → customer invoice → customer payment →
// sub/driver payment. `entry` is a precomputed row with totals
// already calculated by the parent (PayrollTab); we just render.
export const FBTraceModal = ({ entry, invoices, contacts, onClose }) => {
  const fb = entry.fb;
  const invoice = fb.invoiceId ? invoices.find((i) => i.id === fb.invoiceId) : null;
  const customer = invoice?.billToId ? contacts.find((c) => c.id === invoice.billToId) : null;
  const custHistory = (invoice?.paymentHistory || []).filter((p) => !p.fbIds || p.fbIds.includes(fb.id));
  const methodLabel = { check: "Check", ach: "ACH", cash: "Cash", zelle: "Zelle", venmo: "Venmo", other: "Other" };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)" }}>FB TRACE</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>FB#{fb.freightBillNumber || "—"}</h3>
            <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1", marginTop: 2 }}>
              {fb.driverName || "—"}{fb.truckNumber ? ` · T${fb.truckNumber}` : ""} · {fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 14 }}>

          {/* Step 1: FB details */}
          <div style={{ padding: 12, background: "#F5F5F4", border: "1.5px solid var(--steel)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 6 }}>▸ FREIGHT BILL</div>
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              <div><strong>Order:</strong> #{entry.dispatch?.code} — {entry.dispatch?.jobName || "—"}</div>
              <div><strong>Qty:</strong> {entry.qty.toFixed(2)} {entry.method} × ${entry.rate.toFixed(2)} (sub rate)</div>
              <div><strong>Sub Gross (agreed):</strong> <span style={{ color: "var(--steel)", fontWeight: 700 }}>{fmt$(entry.gross)}</span></div>
            </div>
          </div>

          {/* Step 2: Invoice */}
          {invoice ? (
            <div style={{ padding: 12, background: "#FEF3C7", border: "1.5px solid var(--hazard)" }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 6 }}>▸ CUSTOMER INVOICE</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                <div><strong>Invoice #:</strong> {invoice.invoiceNumber} · {invoice.invoiceDate}</div>
                <div><strong>Billed to:</strong> {customer?.companyName || invoice.billToName || "—"}</div>
                <div><strong>Pricing:</strong> {invoice.pricingMethod} @ ${Number(invoice.rate).toFixed(2)}/{invoice.pricingMethod}</div>
                <div><strong>Est. charged for this FB:</strong> <span style={{ color: "var(--hazard-deep)", fontWeight: 700 }}>{fmt$(entry.customerBilled)}</span></div>
                <div><strong>Invoice Total:</strong> {fmt$(invoice.total)}{invoice.amountPaid > 0 && ` · Paid ${fmt$(invoice.amountPaid)}`}</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 12, background: "#FEE2E2", border: "1.5px solid var(--safety)" }}>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--safety)", fontWeight: 700 }}>▸ NOT ON ANY INVOICE YET</div>
              <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>Create an invoice including this FB to start tracking customer payment.</div>
            </div>
          )}

          {/* Step 3: Customer Payment */}
          {invoice && (
            entry.custStatus === "paid" || entry.custStatus === "short" ? (
              <div style={{ padding: 12, background: entry.custStatus === "paid" ? "#F0FDF4" : "#FEF3C7", border: "1.5px solid " + (entry.custStatus === "paid" ? "var(--good)" : "var(--hazard)") }}>
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 6 }}>▸ CUSTOMER PAYMENT</div>
                <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                  <div><strong>Status:</strong> {entry.custStatus === "paid" ? "✓ PAID IN FULL" : `⚠ SHORT-PAID ${Math.round(entry.customerRatio * 100)}%`}</div>
                  <div><strong>Amount received:</strong> {fmt$(entry.customerPaid)} of {fmt$(entry.customerBilled)} billed</div>
                  <div><strong>Paid on:</strong> {fb.customerPaidAt ? new Date(fb.customerPaidAt).toLocaleDateString() : "—"}</div>
                  {custHistory.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--steel)" }}>
                      <div style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 4 }}>PAYMENT HISTORY:</div>
                      {custHistory.map((p, idx) => (
                        <div key={idx} style={{ fontSize: 11 }}>
                          • {fmt$(p.amount)} · {p.method?.toUpperCase()}{p.reference ? ` #${p.reference}` : ""} · {p.date ? new Date(p.date).toLocaleDateString() : "—"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, background: "#FEE2E2", border: "1.5px solid var(--safety)" }}>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--safety)", fontWeight: 700 }}>▸ CUSTOMER NOT PAID YET</div>
                <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
                  Invoice {invoice.invoiceNumber} shows this FB as unpaid. Record payment from the Invoices tab.
                </div>
              </div>
            )
          )}

          {/* Step 4: Sub Payment */}
          {fb.paidAt ? (
            <div style={{ padding: 12, background: "#F0FDF4", border: "1.5px solid var(--good)" }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 6 }}>▸ SUB / DRIVER PAYMENT</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                <div><strong>Status:</strong> ✓ PAID TO {entry.dispatch ? (entry.dispatch.assignments?.find(a => a.aid === fb.assignmentId)?.name || "SUB") : "SUB"}</div>
                <div><strong>Amount:</strong> {fmt$(fb.paidAmount || 0)}</div>
                <div><strong>Method:</strong> {methodLabel[fb.paidMethod] || "—"}{fb.paidCheckNumber ? ` #${fb.paidCheckNumber}` : ""}</div>
                <div><strong>Date:</strong> {fb.paidAt ? new Date(fb.paidAt).toLocaleDateString() : "—"}</div>
                {fb.payStatementNumber && <div><strong>Statement #:</strong> <span style={{ color: "var(--hazard-deep)", fontWeight: 700 }}>{fb.payStatementNumber}</span></div>}
                {fb.paidNotes && <div style={{ marginTop: 4, fontStyle: "italic", color: "var(--concrete)" }}>"{fb.paidNotes}"</div>}
              </div>
            </div>
          ) : (
            <div style={{ padding: 12, background: "#FEF3C7", border: "1.5px dashed var(--hazard)" }}>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>▸ SUB NOT PAID YET · {fmt$(entry.adjustedGross)} NET DUE</div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} className="btn-ghost">CLOSE</button>
          </div>
        </div>
      </div>
    </div>
  );
};
