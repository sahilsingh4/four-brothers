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
  // v24: Per-FB amount in per-FB mode. Replaces silent pro-rata so admin
  // can record an exact split when a customer pays uneven amounts across
  // FBs (e.g. one FB short-paid for damage dispute, the others paid in
  // full). Keys are FB ids; values are strings to keep the input controlled.
  const [perFbAmounts, setPerFbAmounts] = useState({});
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

  // Per-FB sum drives the global "Amount Received" field in per-FB mode so
  // admin can see the total grow as they type per-row amounts. In full mode
  // the global field is just editable balance.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  const perFbSum = useMemo(() => {
    if (mode !== "perfb") return 0;
    return invFbs
      .filter((fb) => checkedFbs[fb.id])
      .reduce((s, fb) => s + (Number(perFbAmounts[fb.id]) || 0), 0);
  }, [checkedFbs, mode, perFbAmounts, invFbs]);

  useEffect(() => {
    if (mode === "perfb") {
      setForm((f) => ({ ...f, amount: perFbSum.toFixed(2) }));
    } else {
      setForm((f) => ({ ...f, amount: balance.toFixed(2) }));
    }
  }, [mode, perFbSum]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // When admin checks an FB row, default-fill the per-FB amount with the
  // FB's billed estimate (full payment). Admin types a lower number to mark
  // it short-paid. Unchecking clears the row's amount.
  const toggleFbChecked = (fb, checked) => {
    setCheckedFbs((m) => ({ ...m, [fb.id]: checked }));
    setPerFbAmounts((m) => {
      const next = { ...m };
      if (checked && !next[fb.id]) next[fb.id] = fbEstimate(fb).toFixed(2);
      if (!checked) delete next[fb.id];
      return next;
    });
  };

  // "Pro-rate from total" helper — distribute a typed total across the
  // currently-checked rows proportional to their billed estimate. Useful
  // when admin gets a single check covering N FBs and wants the modal to
  // do the math.
  const proRateFromTotal = () => {
    const target = Number(form.amount);
    if (!target || target <= 0) { onToast("ENTER TOTAL AMOUNT FIRST"); return; }
    const checked = invFbs.filter((fb) => checkedFbs[fb.id]);
    if (checked.length === 0) { onToast("CHECK AT LEAST ONE FB"); return; }
    const baseSum = checked.reduce((s, fb) => s + fbEstimate(fb), 0);
    const next = { ...perFbAmounts };
    checked.forEach((fb) => {
      const share = baseSum > 0 ? (fbEstimate(fb) / baseSum) * target : target / checked.length;
      next[fb.id] = share.toFixed(2);
    });
    setPerFbAmounts(next);
  };

  // v24: Compute the sub-pay debt to stamp on a post-lock short-pay. If
  // sub was already paid (paidAt set) and the customer pays less than what
  // was billed, the company has overpaid the sub by the brokerable share
  // of the shortfall. Pass-through extras (tolls, dump) ride at full
  // value — those are the sub's out-of-pocket reimbursement and don't
  // scale with the customer ratio. Returns 0 if the FB shouldn't be
  // debt-stamped (sub not paid yet, or paid in full, or no prior amount).
  const computePostLockDebt = (fb, customerPaidShare, billedEstimate) => {
    if (!fb.paidAt) return 0; // sub not paid yet — handled live by PayrollTab
    if (!fb.paidAmount) return 0; // legacy FB with no paid snapshot
    if (billedEstimate <= 0) return 0;
    const ratio = customerPaidShare / billedEstimate;
    if (ratio >= 0.999) return 0; // paid in full — no debt
    // Pass-through portion (tolls/dumps) doesn't scale with customer ratio
    const passThroughSum = (fb.payingLines || [])
      .filter((l) => l.passThrough || l.code === "TOLL" || l.code === "DUMP" || l.code === "FUEL")
      .reduce((s, l) => s + (Number(l.gross) || Number(l.net) || 0), 0);
    const subBrokerable = Number(fb.paidAmount) - passThroughSum;
    if (subBrokerable <= 0) return 0;
    const debt = subBrokerable * (1 - ratio);
    return Number(debt.toFixed(2));
  };

  const proceed = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { onToast("ENTER AMOUNT"); return; }
    if (mode === "perfb" && Object.values(checkedFbs).every((v) => !v)) {
      onToast("SELECT AT LEAST ONE FB"); return;
    }

    setSaving(true);
    try {
      // 1. Stamp each selected FB (or all if full) with customer_paid_at + amount.
      //    In per-FB mode the share is the admin-typed amount; in full mode
      //    we still pro-rate by billed estimate (it's the "customer paid the
      //    whole invoice" path so per-FB editing isn't needed).
      const fbsToStamp = mode === "full"
        ? invFbs.filter((fb) => !fb.customerPaidAt) // skip already paid
        : invFbs.filter((fb) => checkedFbs[fb.id]);

      if (fbsToStamp.length > 0) {
        const baseSum = fbsToStamp.reduce((s, fb) => s + fbEstimate(fb), 0);
        // Atomicity: stamp every FB BEFORE touching the invoice. If any
        // stamp throws, abort and surface the error — don't write the
        // invoice payment_history because that would leave the system in
        // a state where the invoice says "paid" but only some FBs reflect
        // it (visible inconsistency the admin can't easily clean up). A
        // retry is safe: editFreightBill is idempotent for the same
        // amount, and any FBs already stamped just get the same value.
        const stampFailures = [];
        const debtsStamped = []; // for the post-record toast / log
        for (const fb of fbsToStamp) {
          const share = mode === "perfb"
            ? Number(perFbAmounts[fb.id]) || 0
            : (baseSum > 0 ? (fbEstimate(fb) / baseSum) * amt : amt / fbsToStamp.length);
          const billed = fbEstimate(fb);
          const debt = computePostLockDebt(fb, share, billed);
          try {
            const patch = {
              ...fb,
              customerPaidAt: new Date(form.date).toISOString(),
              customerPaidAmount: Number(share.toFixed(2)),
            };
            if (debt > 0) {
              // Post-lock customer short-pay: stamp the per-FB sub
              // overpayment so PayrollTab can recoup on the sub's next
              // pay statement (or the admin can WAIVE).
              patch.subPayDebtAmount = debt;
              // Reset settled — if a prior debt was settled and the
              // customer short-pays AGAIN (e.g. dispute follow-up), the
              // new shortfall reopens the debt.
              patch.subPayDebtSettledAt = null;
              debtsStamped.push({ fbNum: fb.freightBillNumber || fb.id, debt });
            }
            await editFreightBill(fb.id, patch);
          } catch (e) {
            console.error("Stamp FB customerPaidAt failed:", fb.id, e);
            stampFailures.push({ fbNum: fb.freightBillNumber || fb.id, err: e?.message || String(e) });
          }
        }
        if (stampFailures.length > 0) {
          alert(
            `Couldn't stamp ${stampFailures.length} of ${fbsToStamp.length} freight bill${fbsToStamp.length !== 1 ? "s" : ""} — payment NOT recorded.\n\nFailed:\n` +
            stampFailures.map((f) => `  • FB #${f.fbNum}: ${f.err}`).join("\n") +
            "\n\nNothing has been written. Try again in a moment, or check your network."
          );
          setSaving(false);
          return;
        }
        if (debtsStamped.length > 0) {
          const totalDebt = debtsStamped.reduce((s, d) => s + d.debt, 0);
          // Audit trail — also helps when reconciling with the sub later.
          logAudit({
            actionType: "fb.sub_pay_debt_created",
            entityType: "invoice", entityId: invoice.id,
            entityLabel: invoice.invoiceNumber || "—",
            metadata: {
              totalDebt,
              fbCount: debtsStamped.length,
              perFb: debtsStamped,
              reason: "customer short-pay after sub already paid",
            },
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

          {/* Per-FB checklist + per-FB editable amount */}
          {mode === "perfb" && (
            <div style={{ padding: 10, border: "1px solid var(--line)", background: "var(--surface)", maxHeight: 320, overflowY: "auto", borderRadius: 6 }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8 }}>
                ▸ CHECK FBs · TYPE WHAT THE CUSTOMER ACTUALLY PAID FOR EACH
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 10, padding: "4px 8px" }}
                  onClick={() => {
                    const m = {};
                    const amounts = { ...perFbAmounts };
                    invFbs.forEach((fb) => {
                      const check = !fb.customerPaidAt;
                      m[fb.id] = check;
                      if (check && !amounts[fb.id]) amounts[fb.id] = fbEstimate(fb).toFixed(2);
                      if (!check) delete amounts[fb.id];
                    });
                    setCheckedFbs(m);
                    setPerFbAmounts(amounts);
                  }}
                >
                  CHECK ALL UNPAID
                </button>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 10, padding: "4px 8px" }}
                  onClick={() => {
                    const m = {};
                    invFbs.forEach((fb) => { m[fb.id] = false; });
                    setCheckedFbs(m);
                    setPerFbAmounts({});
                  }}
                >
                  CLEAR
                </button>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 10, padding: "4px 8px" }}
                  onClick={proRateFromTotal}
                  title="Distribute the Amount Received total across checked FBs proportional to billed estimate"
                >
                  ⇆ PRO-RATE FROM TOTAL
                </button>
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {invFbs.map((fb) => {
                  const alreadyPaid = !!fb.customerPaidAt;
                  const checked = !!checkedFbs[fb.id];
                  const est = fbEstimate(fb);
                  const enteredStr = perFbAmounts[fb.id] ?? "";
                  const entered = Number(enteredStr) || 0;
                  const isShort = checked && entered > 0 && entered < est - 0.01;
                  const isOver = checked && entered > est + 0.01;
                  // Post-lock indicator: sub already paid → if we short, debt
                  // gets stamped for next pay statement. Surface so admin
                  // knows the consequence before clicking RECORD PAYMENT.
                  const postLock = !!fb.paidAt;
                  return (
                    <div
                      key={fb.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto auto",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        background: alreadyPaid ? "#F1F5F9" : "#FFF",
                        border: `1px solid ${isShort ? "var(--safety)" : "var(--line)"}`,
                        borderRadius: 4,
                        opacity: alreadyPaid ? 0.7 : 1,
                        fontSize: 11,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={alreadyPaid}
                        onChange={(e) => toggleFbChecked(fb, e.target.checked)}
                        style={{ cursor: alreadyPaid ? "not-allowed" : "pointer" }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div>
                          <strong>FB#{fb.freightBillNumber || "—"}</strong> · {fb.driverName || "—"}
                          {alreadyPaid && <span className="chip" style={{ marginLeft: 6, fontSize: 9, background: "var(--good-soft)", color: "var(--good)", borderColor: "var(--good-border)" }}>✓ STAMPED</span>}
                          {postLock && !alreadyPaid && <span className="chip" style={{ marginLeft: 6, fontSize: 9, background: "#FEF3C7", color: "#92400E", borderColor: "var(--warn-border)" }}>SUB ALREADY PAID</span>}
                          {isShort && <span className="chip" style={{ marginLeft: 6, fontSize: 9, background: "var(--danger-soft)", color: "var(--safety)", borderColor: "var(--danger-border)" }}>SHORT {fmt$(est - entered)}</span>}
                          {isOver && <span className="chip" style={{ marginLeft: 6, fontSize: 9, background: "var(--accent-soft)", color: "var(--hazard-deep)", borderColor: "var(--accent-border)" }}>OVER {fmt$(entered - est)}</span>}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                          Billed {fmt$(est)}
                          {isShort && postLock && (
                            <span style={{ color: "var(--safety)", fontWeight: 600 }}>
                              {" · "}sub overpaid → debt carries to next pay statement
                            </span>
                          )}
                        </div>
                      </div>
                      <input
                        className="fbt-input"
                        type="number"
                        step="0.01"
                        value={enteredStr}
                        disabled={!checked || alreadyPaid}
                        onChange={(e) => setPerFbAmounts({ ...perFbAmounts, [fb.id]: e.target.value })}
                        placeholder={est.toFixed(2)}
                        style={{ width: 100, padding: "5px 8px", fontSize: 12, textAlign: "right" }}
                        title="What the customer actually paid for this FB"
                      />
                      <span className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", width: 14, textAlign: "right" }}>$</span>
                    </div>
                  );
                })}
              </div>
              {/* Per-FB sum vs typed-total guard */}
              {(() => {
                const sum = perFbSum;
                const typed = Number(form.amount);
                if (!checkedFbs || Object.values(checkedFbs).every((v) => !v)) return null;
                if (Math.abs(sum - typed) <= 0.01) return null;
                return (
                  <div className="fbt-mono" style={{
                    marginTop: 8, padding: "6px 8px", fontSize: 10,
                    background: "#FEF3C7", color: "#92400E",
                    border: "1px solid var(--warn-border)", borderRadius: 4,
                  }}>
                    Per-FB sum {fmt$(sum)} doesn't match Amount Received {fmt$(typed)}.
                    {" "}The amount written to the invoice will be the sum.
                  </div>
                );
              })()}
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
