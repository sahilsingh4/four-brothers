import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, X } from "lucide-react";
import { fmt$ } from "../utils";
import { logAudit, updateInvoice } from "../db";

export const RecordPaymentModal = ({ invoice, freightBills, editFreightBill, onClose, onToast }) => {
  const invFbs = (invoice.freightBillIds || []).map((id) => freightBills.find((fb) => fb.id === id)).filter(Boolean);
  const balance = (Number(invoice.total) || 0) - (Number(invoice.amountPaid) || 0);

  const [mode, setMode] = useState("full"); // 'full' | 'perfb'
  const [form, setForm] = useState({
    amount: balance.toFixed(2),
    date: new Date().toISOString().slice(0, 10),
    method: "check",
    reference: "",
    notes: "",
  });
  const [checkedFbs, setCheckedFbs] = useState(() => {
    const m = {};
    invFbs.forEach((fb) => { m[fb.id] = false; });
    return m;
  });
  const [saving, setSaving] = useState(false);

  // For per-FB mode, estimate the per-FB gross within this invoice
  // (uses the invoice's pricing method/rate since we don't have line-level totals stored)
  const fbEstimate = (fb) => {
    const method = invoice.pricingMethod || "ton";
    const rate = Number(invoice.rate) || 0;
    let qty = 0;
    if (method === "ton") qty = Number(fb.tonnage) || 0;
    else if (method === "load") qty = Number(fb.loadCount) || 1;
    else if (method === "hour") {
      if (fb.hoursBilled) qty = Number(fb.hoursBilled);
      else if (fb.pickupTime && fb.dropoffTime) {
        const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
        const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
        if (!isNaN(h1) && !isNaN(h2)) {
          const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (mins > 0) qty = mins / 60;
        }
      }
    }
    return qty * rate;
  };

  // Auto-calc amount from checked FBs in per-FB mode + autofill amount on
  // mode toggle. fbEstimate is stable for the modal's lifetime; balance comes
  // from a parent and would re-fire the autofill on every parent render. Both
  // setStates are bounded write-once on a real toggle.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  const perFbTotal = useMemo(() => {
    if (mode !== "perfb") return 0;
    return invFbs.filter((fb) => checkedFbs[fb.id]).reduce((s, fb) => s + fbEstimate(fb), 0);
  }, [checkedFbs, mode, invFbs]);

  useEffect(() => {
    if (mode === "perfb") {
      setForm((f) => ({ ...f, amount: perFbTotal.toFixed(2) }));
    } else {
      setForm((f) => ({ ...f, amount: balance.toFixed(2) }));
    }
  }, [mode, perFbTotal]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const proceed = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { onToast("ENTER AMOUNT"); return; }
    if (mode === "perfb" && Object.values(checkedFbs).every((v) => !v)) {
      onToast("SELECT AT LEAST ONE FB"); return;
    }

    setSaving(true);
    try {
      // 1. Stamp each selected FB (or all if full) with customer_paid_at + amount (prorated)
      const fbsToStamp = mode === "full"
        ? invFbs.filter((fb) => !fb.customerPaidAt) // skip already paid
        : invFbs.filter((fb) => checkedFbs[fb.id]);

      if (fbsToStamp.length > 0) {
        const baseSum = fbsToStamp.reduce((s, fb) => s + fbEstimate(fb), 0);
        for (const fb of fbsToStamp) {
          const share = baseSum > 0 ? (fbEstimate(fb) / baseSum) * amt : amt / fbsToStamp.length;
          await editFreightBill(fb.id, {
            ...fb,
            customerPaidAt: new Date(form.date).toISOString(),
            customerPaidAmount: Number(share.toFixed(2)),
          });
        }
      }

      // 2. Update invoice: append to payment_history + recompute amount_paid
      const newPayment = {
        date: new Date(form.date).toISOString(),
        amount: amt,
        method: form.method,
        reference: form.reference || "",
        notes: form.notes || "",
        fbIds: fbsToStamp.map((fb) => fb.id),
        mode,
      };
      const newHistory = [...(invoice.paymentHistory || []), newPayment];
      const newAmountPaid = newHistory.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const newTotal = Number(invoice.total) || 0;
      let newStatus = "outstanding";
      if (newTotal > 0 && newAmountPaid >= newTotal - 0.01) newStatus = "paid";
      else if (newAmountPaid > 0) newStatus = "partial";

      // Use direct updateInvoice (imported at module top) since setInvoices diff-logic
      // compares by object equality and we want a targeted update here.
      try {
        // v19c Session M: pass invoice.updatedAt for optimistic lock
        await updateInvoice(invoice.id, {
          ...invoice,
          amountPaid: newAmountPaid,
          paymentHistory: newHistory,
          paymentStatus: newStatus,
        }, invoice.updatedAt);
        // v20 Session O: audit log
        logAudit({
          actionType: "invoice.payment_recorded",
          entityType: "invoice", entityId: invoice.id,
          entityLabel: invoice.invoiceNumber || "—",
          metadata: {
            amount: amt,
            method: form.method,
            checkNumber: form.reference || "",
            paymentDate: form.paidAt,
            newAmountPaid,
            newStatus,
          },
        });
        onToast(`✓ PAYMENT RECORDED — ${fmt$(amt)}`);
      } catch (e) {
        if (e?.code === "CONCURRENT_EDIT") {
          onToast("⚠ SOMEONE ELSE EDITED THIS INVOICE — CLOSE + REOPEN TO RETRY");
          return;
        }
        console.error("updateInvoice failed:", e);
        // v18 FIX: previously silently failed, then showed success toast. Bad data.
        onToast("⚠ PAYMENT SAVE FAILED — INVOICE NOT UPDATED. FB PAID FLAGS MAY BE WRONG.");
        // Don't close modal so user knows something's wrong
        return;
      }
      onClose();
    } catch (e) {
      console.error(e);
      onToast("RECORD PAYMENT FAILED");
    } finally {
      setSaving(false);
    }
  };

  // v18 Batch 2: Escape closes modal (unless saving)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // onClose is a stable callback; intentionally not in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving]);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)" }}>RECORD CUSTOMER PAYMENT</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>{invoice.invoiceNumber}</h3>
            <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1", marginTop: 2 }}>
              {invoice.billToName} · Total {fmt$(invoice.total)} · Balance {fmt$(balance)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 14 }}>
          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setMode("full")}
              className={mode === "full" ? "btn-primary" : "btn-ghost"}
              style={{ flex: 1, padding: "10px", fontSize: 11 }}
            >
              FULL INVOICE PAID
            </button>
            <button
              onClick={() => setMode("perfb")}
              className={mode === "perfb" ? "btn-primary" : "btn-ghost"}
              style={{ flex: 1, padding: "10px", fontSize: 11 }}
            >
              PARTIAL (PICK FBs)
            </button>
          </div>

          {/* Per-FB checklist */}
          {mode === "perfb" && (
            <div style={{ padding: 10, border: "1.5px solid var(--steel)", background: "#F5F5F4", maxHeight: 280, overflowY: "auto" }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8 }}>
                ▸ CHECK WHICH FBs THE CUSTOMER PAID FOR
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 10, padding: "4px 8px" }}
                  onClick={() => { const m = {}; invFbs.forEach((fb) => { m[fb.id] = !fb.customerPaidAt; }); setCheckedFbs(m); }}
                >
                  CHECK ALL UNPAID
                </button>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 10, padding: "4px 8px" }}
                  onClick={() => { const m = {}; invFbs.forEach((fb) => { m[fb.id] = false; }); setCheckedFbs(m); }}
                >
                  CLEAR
                </button>
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {invFbs.map((fb) => {
                  const alreadyPaid = !!fb.customerPaidAt;
                  const est = fbEstimate(fb);
                  return (
                    <label
                      key={fb.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                        background: alreadyPaid ? "#E5E7EB" : "#FFF", border: "1px solid var(--steel)",
                        opacity: alreadyPaid ? 0.6 : 1, cursor: alreadyPaid ? "not-allowed" : "pointer",
                        fontSize: 11, fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!checkedFbs[fb.id]}
                        disabled={alreadyPaid}
                        onChange={(e) => setCheckedFbs({ ...checkedFbs, [fb.id]: e.target.checked })}
                      />
                      <span style={{ flex: 1 }}>
                        <strong>FB#{fb.freightBillNumber || "—"}</strong> · {fb.driverName || "—"}
                        {alreadyPaid && <span style={{ color: "var(--good)", marginLeft: 6 }}>✓ ALREADY PAID</span>}
                      </span>
                      <span style={{ fontWeight: 700 }}>{fmt$(est)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Date Received</label>
              <input className="fbt-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Amount Received $</label>
              <input className="fbt-input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Method</label>
              <select className="fbt-select" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option value="check">Check</option>
                <option value="ach">ACH / Wire</option>
                <option value="cash">Cash</option>
                <option value="zelle">Zelle</option>
                <option value="venmo">Venmo</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="fbt-label">Reference / Check #</label>
              <input className="fbt-input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. 1024 or confirmation #" />
            </div>
          </div>

          <div>
            <label className="fbt-label">Notes</label>
            <textarea className="fbt-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Short-pay reason, dispute notes, etc." style={{ minHeight: 50 }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={proceed} disabled={saving} className="btn-primary" style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}>
              <CheckCircle2 size={16} /> RECORD PAYMENT
            </button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};
