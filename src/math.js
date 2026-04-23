// ============================================================================
// MATH HELPERS — pure functions extracted from App.jsx for testability
// ============================================================================
// These functions are called from FBEditModal, InvoicesTab, PayrollTab, and
// pay-stub generators. They MUST stay pure (no React, no DB, no side effects)
// so they can be tested in isolation and reused anywhere.
//
// If you need to change billing/pay math, change it HERE (one source of truth)
// and every consumer gets the update.
// ============================================================================

// ----------------------------------------------------------------------------
// TIME HELPERS
// ----------------------------------------------------------------------------

/**
 * Compute decimal hours between two "HH:MM" time strings.
 * Returns 0 if either is falsy, malformed, or dropoff <= pickup.
 * @param {string} pickup   "HH:MM"
 * @param {string} dropoff  "HH:MM"
 * @returns {number} hours, rounded to 2 decimals
 */
export const hoursFromTimes = (pickup, dropoff) => {
  if (!pickup || !dropoff) return 0;
  const [h1, m1] = String(pickup).split(":").map(Number);
  const [h2, m2] = String(dropoff).split(":").map(Number);
  if (isNaN(h1) || isNaN(h2)) return 0;
  const mins = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
  return mins > 0 ? Number((mins / 60).toFixed(2)) : 0;
};

// ----------------------------------------------------------------------------
// LINE-ITEM MATH (v16 model)
// ----------------------------------------------------------------------------

/**
 * Compute a single line's net amount based on gross + brokerage.
 * If the line is brokerable and has a brokeragePct, deduct that %.
 * Otherwise net = gross.
 * @param {object} line {gross, qty, rate, brokerable, brokeragePct}
 * @returns {number} net, rounded to 2 decimals
 */
export const computeLineNet = (line) => {
  const gross = Number(line.gross) || (Number(line.qty) || 0) * (Number(line.rate) || 0);
  if (line.brokerable) {
    const pct = Number(line.brokeragePct) || 0;
    return Number((gross - gross * pct / 100).toFixed(2));
  }
  return Number(gross.toFixed(2));
};

/**
 * Recompute gross + net on a line after qty/rate/brokerable/brokeragePct changes.
 * Returns a NEW line object (doesn't mutate the input).
 */
export const recomputeLine = (line) => {
  const qty = Number(line.qty) || 0;
  const rate = Number(line.rate) || 0;
  const gross = Number((qty * rate).toFixed(2));
  const net = line.brokerable
    ? Number((gross - gross * (Number(line.brokeragePct) || 0) / 100).toFixed(2))
    : gross;
  return { ...line, gross, net };
};

// ----------------------------------------------------------------------------
// TOTALS AGGREGATION
// ----------------------------------------------------------------------------

/**
 * Total an array of billing or paying lines.
 * Returns { count, gross, brokerableGross, brokerageAmt, net }.
 */
export const totalLines = (lines) => {
  if (!Array.isArray(lines)) lines = [];
  const gross = lines.reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
  const brokerableGross = lines.filter((ln) => ln.brokerable).reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
  const brokerageAmt = lines.filter((ln) => ln.brokerable)
    .reduce((s, ln) => s + (Number(ln.gross) || 0) * (Number(ln.brokeragePct) || 0) / 100, 0);
  const net = lines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
  return {
    count: lines.length,
    gross: Number(gross.toFixed(2)),
    brokerableGross: Number(brokerableGross.toFixed(2)),
    brokerageAmt: Number(brokerageAmt.toFixed(2)),
    net: Number(net.toFixed(2)),
  };
};

/**
 * Compute an invoice subtotal from a list of FBs, preferring each FB's billingLines[] sum.
 * For pre-v16 FBs (no lines), falls back to the legacy path caller.
 * Returns { subtotal, hasLegacyFbs, legacyFbIds }.
 * Caller is responsible for adding invoice-level extras/discount outside.
 */
export const invoiceSubtotalFromFbs = (fbs, legacyCalcFn = () => 0) => {
  if (!Array.isArray(fbs)) fbs = [];
  let subtotal = 0;
  const legacyFbIds = [];
  fbs.forEach((fb) => {
    if (Array.isArray(fb.billingLines) && fb.billingLines.length > 0) {
      subtotal += fb.billingLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
    } else {
      legacyFbIds.push(fb.id);
      subtotal += Number(legacyCalcFn(fb)) || 0;
    }
  });
  return {
    subtotal: Number(subtotal.toFixed(2)),
    hasLegacyFbs: legacyFbIds.length > 0,
    legacyFbIds,
  };
};

/**
 * Compute pay stub totals from an array of fbRows (where each has .calc.payingLines or legacy).
 * Returns { gross, brokerageAmt, netPay, allHaveLines }.
 */
export const payStubTotalsFromFbs = (fbs, brokerageApplies = false, brokeragePct = 0) => {
  if (!Array.isArray(fbs)) fbs = [];

  const allHaveLines = fbs.length > 0 && fbs.every((fb) =>
    Array.isArray(fb.payingLines) && fb.payingLines.length > 0
  );

  if (allHaveLines) {
    const brokerableGross = fbs.reduce((s, fb) =>
      s + fb.payingLines.filter((ln) => ln.brokerable).reduce((ss, ln) => ss + (Number(ln.gross) || 0), 0),
      0);
    const nonBrokerableGross = fbs.reduce((s, fb) =>
      s + fb.payingLines.filter((ln) => !ln.brokerable).reduce((ss, ln) => ss + (Number(ln.gross) || 0), 0),
      0);
    const gross = brokerableGross + nonBrokerableGross;
    const netPay = fbs.reduce((s, fb) =>
      s + fb.payingLines.reduce((ss, ln) => ss + (Number(ln.net) || 0), 0),
      0);
    return {
      allHaveLines: true,
      gross: Number(gross.toFixed(2)),
      brokerageAmt: Number((gross - netPay).toFixed(2)),
      netPay: Number(netPay.toFixed(2)),
    };
  }

  // No lines — caller must provide legacy calc. Return zeros + flag.
  return { allHaveLines: false, gross: 0, brokerageAmt: 0, netPay: 0 };
};

// ----------------------------------------------------------------------------
// SEED HELPERS
// ----------------------------------------------------------------------------

/**
 * Determine the seed hours for a FB: prefer hoursBilled if set (>0),
 * otherwise compute from pickup/dropoff times.
 */
export const seedHoursForFb = (fb) => {
  const h = Number(fb?.hoursBilled) || 0;
  if (h > 0) return h;
  return hoursFromTimes(fb?.pickupTime, fb?.dropoffTime);
};

/**
 * Get billable hours for invoicing a FB — prefers billingLines[]'s HOURLY line qty.
 * Falls back to effectiveHours (time-based) for legacy FBs without lines.
 * @param {object} fb
 * @param {function} legacyEffectiveHoursFn (fb) => hours — for pre-v16 FBs
 * @returns {number}
 */
export const billableHoursForInvoice = (fb, legacyEffectiveHoursFn = () => 0) => {
  if (Array.isArray(fb?.billingLines) && fb.billingLines.length > 0) {
    const hourLine = fb.billingLines.find((ln) => ln.code === "H");
    return hourLine ? (Number(hourLine.qty) || 0) : 0;
  }
  return Number(legacyEffectiveHoursFn(fb)) || 0;
};

// ----------------------------------------------------------------------------
// BROKERAGE
// ----------------------------------------------------------------------------

/**
 * Get a contact's applicable brokerage %: 0 if not flagged, contact's pct otherwise.
 * Returns 8 as a "default when flagged but no pct set" value.
 */
export const contactBrokeragePct = (contact) => {
  if (!contact?.brokerageApplies) return 0;
  return Number(contact.brokeragePercent) || 8;
};

// ----------------------------------------------------------------------------
// FORMATTERS
// ----------------------------------------------------------------------------

export const fmt$ = (n) => `$${(Number(n) || 0).toFixed(2)}`;

// ----------------------------------------------------------------------------
// CASCADE / DELETE RULES (v17 soft delete)
// ----------------------------------------------------------------------------

/**
 * Can this dispatch be deleted? Returns { allowed, blockers }.
 * blockers is an array of human-readable reasons if allowed === false.
 */
export const canDeleteDispatch = (dispatch, childFbs = []) => {
  const blockers = [];
  const submittedFbs = childFbs.filter((fb) => (fb.status || "pending") !== "rejected");

  if (submittedFbs.length === 0) return { allowed: true, blockers: [] };

  const invoicedCount = childFbs.filter((fb) => fb.invoiceId).length;
  const paidCount = childFbs.filter((fb) => fb.paidAt).length;
  const custPaidCount = childFbs.filter((fb) => fb.customerPaidAt).length;

  if (invoicedCount > 0) blockers.push({ type: "invoiced", count: invoicedCount });
  if (paidCount > 0) blockers.push({ type: "paid", count: paidCount });
  if (custPaidCount > 0) blockers.push({ type: "customerPaid", count: custPaidCount });

  const unblockedCount = submittedFbs.length - invoicedCount - paidCount - custPaidCount;
  if (unblockedCount > 0) blockers.push({ type: "pending", count: unblockedCount });

  return { allowed: false, blockers };
};

/**
 * Can this freight bill be deleted? Returns { allowed, blockers }.
 */
export const canDeleteFreightBill = (fb, invoiceOnFb = null) => {
  const blockers = [];
  if (fb.invoiceId) {
    blockers.push({ type: "invoiced", invoiceNumber: invoiceOnFb?.invoiceNumber || fb.invoiceId });
  }
  if (fb.paidAt) {
    blockers.push({ type: "paid", amount: fb.paidAmount, date: fb.paidAt });
  }
  if (fb.customerPaidAt) {
    blockers.push({ type: "customerPaid" });
  }
  return { allowed: blockers.length === 0, blockers };
};

/**
 * Can this invoice be deleted? Returns { allowed, blockers }.
 * Uses strict v17 rules: blocks if payment recorded OR any attached FB is customer-paid.
 */
export const canDeleteInvoice = (invoice, attachedFbs = []) => {
  const blockers = [];
  if (Number(invoice.amountPaid || 0) > 0) {
    blockers.push({ type: "paymentRecorded", amount: Number(invoice.amountPaid) });
  }
  const custPaidFbs = attachedFbs.filter((fb) => fb.customerPaidAt);
  if (custPaidFbs.length > 0) {
    blockers.push({ type: "customerPaid", count: custPaidFbs.length });
  }
  return { allowed: blockers.length === 0, blockers };
};
