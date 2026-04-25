import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Camera, Clock, Lock, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { compressImage, fmt$, nextLineId } from "../utils";
import { deleteFreightBill, recoverFreightBill, logAudit } from "../db";

export const FBEditModal = ({ fb, dispatches, contacts, projects = [], editFreightBill, setDispatches, invoices = [], freightBills = [], onClose, onToast, currentUser }) => {
  const dispatch = dispatches.find((d) => d.id === fb.dispatchId);
  const project = dispatch ? projects.find((p) => p.id === dispatch.projectId) : null;
  const assignment = dispatch ? (dispatch.assignments || []).find((a) => a.aid === fb.assignmentId) : null;
  const invoiceOnFb = fb.invoiceId ? invoices.find((i) => i.id === fb.invoiceId) : null;
  const lockedOnInvoice = !!fb.invoiceId || !!fb.billingLockedAt;
  const lockedAsPaid = !!fb.paidAt || !!fb.customerPaidAt || !!fb.payStatementLockedAt;
  const billingSnapshotLocked = !!fb.billingLockedAt || !!fb.invoiceId;
  const paySnapshotLocked = !!fb.payStatementLockedAt;
  const [unlocked, setUnlocked] = useState(false); // admin can request unlock

  // Compute hours from pickup + dropoff times — used to seed HOURLY line qty on modal open
  const hoursFromTimes = (pickup, dropoff) => {
    if (!pickup || !dropoff) return 0;
    const [h1, m1] = String(pickup).split(":").map(Number);
    const [h2, m2] = String(dropoff).split(":").map(Number);
    if (isNaN(h1) || isNaN(h2)) return 0;
    const mins = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
    return mins > 0 ? Number((mins / 60).toFixed(2)) : 0;
  };
  // Seed value used for HOURLY qty: prefer hoursBilled if set, else calculate from times, else 0
  const seedHours = Number(fb.hoursBilled) > 0
    ? Number(fb.hoursBilled)
    : hoursFromTimes(fb.pickupTime, fb.dropoffTime);
  // J3: pay-side seed for subs honors project.subMinimumHours as a floor.
  // Drivers pay actual hours (no per-project floor — driver pay is per-driver).
  // When the project field is blank, paySeedHours just equals seedHours.
  const subMinHours = assignment?.kind === "sub" && Number(project?.subMinimumHours) > 0
    ? Number(project.subMinimumHours)
    : 0;
  const paySeedHours = subMinHours > 0 ? Math.max(seedHours, subMinHours) : seedHours;

  // v23 Session X: Duplicate FB# detection
  // Warning-only. A match on ANY of these three rules flags a potential duplicate:
  //   1. Same customer + same day + same FB#
  //   2. Same order + same FB# (even if different days)
  //   3. Same driver + same day + same FB#
  // Soft-deleted FBs are excluded.
  const duplicates = useMemo(() => {
    if (!fb.freightBillNumber) return [];
    const fbNum = String(fb.freightBillNumber).trim().toLowerCase();
    if (!fbNum) return [];
    const fbDate = fb.submittedAt ? new Date(fb.submittedAt).toISOString().slice(0, 10) : null;
    const fbDispatch = dispatches.find((d) => d.id === fb.dispatchId);
    const fbClientId = fbDispatch?.clientId || null;
    const fbDriverId = fb.driverId || null;
    const fbDriverName = (fb.driverName || "").trim().toLowerCase();

    const matches = [];
    (freightBills || []).forEach((other) => {
      if (other.id === fb.id) return;
      if (other.deletedAt) return;  // skip soft-deleted
      const otherNum = String(other.freightBillNumber || "").trim().toLowerCase();
      if (!otherNum || otherNum !== fbNum) return;

      const otherDate = other.submittedAt ? new Date(other.submittedAt).toISOString().slice(0, 10) : null;
      const otherDispatch = dispatches.find((d) => d.id === other.dispatchId);
      const otherClientId = otherDispatch?.clientId || null;

      const reasons = [];
      // Rule 1: same customer + same day + same FB#
      if (fbClientId && otherClientId && fbClientId === otherClientId && fbDate && otherDate && fbDate === otherDate) {
        reasons.push("same customer, same day");
      }
      // Rule 2: same order + same FB#
      if (fb.dispatchId && other.dispatchId && fb.dispatchId === other.dispatchId) {
        reasons.push("same order");
      }
      // Rule 3: same driver + same day + same FB#
      const driverMatch = (fbDriverId && other.driverId && fbDriverId === other.driverId)
        || (fbDriverName && other.driverName && fbDriverName === (other.driverName || "").trim().toLowerCase());
      if (driverMatch && fbDate && otherDate && fbDate === otherDate) {
        reasons.push("same driver, same day");
      }

      if (reasons.length > 0) {
        matches.push({
          fb: other,
          dispatch: otherDispatch,
          reasons,
        });
      }
    });
    return matches;
  }, [fb.id, fb.freightBillNumber, fb.dispatchId, fb.driverId, fb.driverName, fb.submittedAt, freightBills, dispatches]);

  const [draft, setDraft] = useState({
    freightBillNumber: fb.freightBillNumber || "",
    driverName: fb.driverName || "",
    truckNumber: fb.truckNumber || "",
    material: fb.material || "",
    tonnage: fb.tonnage || "",
    loadCount: fb.loadCount || 1,
    pickupTime: fb.pickupTime || "",
    dropoffTime: fb.dropoffTime || "",
    signedOutStatus: fb.signedOutStatus || "",
    signedOutAt: fb.signedOutAt || "",
    hoursBilled: fb.hoursBilled || "",
    jobNameOverride: fb.jobNameOverride || "",
    description: fb.description || "",
    notes: fb.notes || "",
    adminNotes: fb.adminNotes || "",
    photos: fb.photos || [],
    extras: fb.extras || [],
    minHoursApplied: !!fb.minHoursApplied,

    // BILLING SNAPSHOT — what we charge customer
    // Default: existing snapshot, or seed from submitted qty + dispatch rate
    billedHours: fb.billedHours != null ? String(fb.billedHours) : (fb.hoursBilled != null ? String(fb.hoursBilled) : ""),
    billedTons: fb.billedTons != null ? String(fb.billedTons) : (fb.tonnage != null ? String(fb.tonnage) : ""),
    billedLoads: fb.billedLoads != null ? String(fb.billedLoads) : (fb.loadCount != null ? String(fb.loadCount) : ""),
    billedRate: fb.billedRate != null ? String(fb.billedRate) : (
      dispatch?.ratePerHour ? String(dispatch.ratePerHour) :
      dispatch?.ratePerTon ? String(dispatch.ratePerTon) :
      dispatch?.ratePerLoad ? String(dispatch.ratePerLoad) : ""
    ),
    billedMethod: fb.billedMethod || (
      dispatch?.ratePerHour ? "hour" :
      dispatch?.ratePerTon ? "ton" :
      dispatch?.ratePerLoad ? "load" : "hour"
    ),

    // PAY SNAPSHOT — what sub/driver gets paid
    // Default: existing snapshot, or seed from submitted qty + assignment payRate
    paidHours: fb.paidHours != null ? String(fb.paidHours) : (fb.hoursBilled != null ? String(fb.hoursBilled) : ""),
    paidTons: fb.paidTons != null ? String(fb.paidTons) : (fb.tonnage != null ? String(fb.tonnage) : ""),
    paidLoads: fb.paidLoads != null ? String(fb.paidLoads) : (fb.loadCount != null ? String(fb.loadCount) : ""),
    paidRate: fb.paidRate != null ? String(fb.paidRate) : (assignment?.payRate ? String(assignment.payRate) : ""),
    paidMethodSnapshot: fb.paidMethodSnapshot || assignment?.payMethod || "hour",

    // LINE-ITEM STRUCTURE (v16) — new master data model
    // If fb already has lines (from backfill), use them. Otherwise seed with a single HOURLY line
    // based on dispatch/assignment rates.
    billingLines: Array.isArray(fb.billingLines) && fb.billingLines.length > 0
      ? (() => {
          // BACKFILL FIX: if an existing HOURLY line has qty=0 and times give a real value, update it
          let lines = fb.billingLines;
          if (seedHours > 0) {
            lines = lines.map((ln) => {
              if (ln.code === "H" && (!ln.qty || Number(ln.qty) === 0)) {
                const rate = Number(ln.rate) || 0;
                const gross = Number((seedHours * rate).toFixed(2));
                const net = ln.brokerable
                  ? Number((gross - gross * (Number(ln.brokeragePct) || 0) / 100).toFixed(2))
                  : gross;
                return { ...ln, qty: seedHours, gross, net };
              }
              return ln;
            });
          }

          // v18 Fix #2: FB has lines but only extras (TOLL/DUMP/FUEL/OTHER) — no primary H/T/L line.
          // This happens when driver submits with extras but no hourly line gets auto-created.
          // Seed one primary line based on dispatch method.
          const hasPrimary = lines.some((ln) => ["H", "T", "L"].includes(ln.code));
          if (!hasPrimary) {
            const isSub = assignment?.kind === "sub";
            const contactForBilling = assignment?.contactId ? contacts.find((c) => c.id === assignment.contactId) : null;
            const brokerableDefault = isSub && !!contactForBilling?.brokerageApplies;
            const brokeragePctDefault = brokerableDefault ? Number(contactForBilling?.brokeragePercent || 10) : 0;

            const method = dispatch?.ratePerHour ? "hour" : dispatch?.ratePerTon ? "ton" : dispatch?.ratePerLoad ? "load" : "hour";
            const code = method === "hour" ? "H" : method === "ton" ? "T" : "L";
            const item = method === "hour" ? "HOURLY" : method === "ton" ? "TONS" : "LOADS";
            const rate = Number(dispatch?.ratePerHour || dispatch?.ratePerTon || dispatch?.ratePerLoad || 0);
            const qty = method === "hour" ? seedHours
                     : method === "ton" ? Number(fb.tonnage) || 0
                     : Number(fb.loadCount) || 1;

            if (rate > 0 || qty > 0) {
              const gross = Number((qty * rate).toFixed(2));
              const net = brokerableDefault
                ? Number((gross - gross * brokeragePctDefault / 100).toFixed(2))
                : gross;
              // Prepend primary line at top so admin sees it first
              lines = [{
                id: nextLineId(),
                code, item, qty, rate, gross,
                brokerable: brokerableDefault,
                brokeragePct: brokeragePctDefault,
                net,
                copyToPay: false,
                createdAt: new Date().toISOString(),
                createdBy: "system-seed",
              }, ...lines];
            }
          }

          // v18: LEGACY EXTRAS MIGRATION — old FBs have extras[] that weren't auto-converted
          // to billing lines. If we find any, append them so admin sees them in the normal grid.
          // This is a one-time migration on modal open; the merged lines will be saved when admin saves.
          const legacyExtras = Array.isArray(fb.extras) ? fb.extras.filter((x) => Number(x.amount) > 0) : [];
          if (legacyExtras.length > 0) {
            const alreadyFromExtras = lines.some((ln) => ln.sourceExtra);
            if (!alreadyFromExtras) {
              const extraLines = legacyExtras.map((x, idx) => {
                const low = String(x.label || "").toLowerCase();
                const code = low.includes("toll") ? "TOLL"
                           : low.includes("dump") ? "DUMP"
                           : low.includes("fuel") ? "FUEL"
                           : "OTHER";
                const item = code === "OTHER" ? (x.label || "Extra") : x.label;
                const totalAmt = Number(x.amount) || 0;
                // Preserve driver's qty + rate if they entered them separately
                const driverQty = Number(x.qty);
                const driverRate = Number(x.rate);
                const qty = driverQty > 0 ? driverQty : 1;
                const rate = driverRate > 0 ? driverRate : (driverQty > 0 ? totalAmt / driverQty : totalAmt);
                const gross = Number((qty * rate).toFixed(2));
                return {
                  id: nextLineId() + idx,
                  code, item, qty, rate, gross,
                  brokerable: false, brokeragePct: 0, net: gross,
                  copyToPay: false, isAdjustment: false,
                  sourceExtra: true,
                  note: x.note || "",
                  createdAt: new Date().toISOString(),
                  createdBy: "legacy-migration",
                };
              });
              lines = [...lines, ...extraLines];
            }
          }
          return lines;
        })()
      : (() => {
          // v18: brokerage default for subs — if assignment is to a sub AND contact has brokerage on,
          // seed the new line with brokerable: true and the contact's pct. For drivers, brokerage stays off.
          const isSub = assignment?.kind === "sub";
          const contactForBilling = assignment?.contactId ? contacts.find((c) => c.id === assignment.contactId) : null;
          const brokerableDefault = isSub && !!contactForBilling?.brokerageApplies;
          const brokeragePctDefault = brokerableDefault ? Number(contactForBilling?.brokeragePercent || 10) : 0;

          // Seed one billing line from dispatch rate
          const method = dispatch?.ratePerHour ? "hour" : dispatch?.ratePerTon ? "ton" : dispatch?.ratePerLoad ? "load" : "hour";
          const code = method === "hour" ? "H" : method === "ton" ? "T" : "L";
          const item = method === "hour" ? "HOURLY" : method === "ton" ? "TONS" : "LOADS";
          const rate = Number(dispatch?.ratePerHour || dispatch?.ratePerTon || dispatch?.ratePerLoad || 0);
          // For HOUR method: use computed hours from times, else hoursBilled, else 0
          // For TON/LOAD: use submitted qty
          const qty = method === "hour" ? seedHours
                   : method === "ton" ? Number(fb.tonnage) || 0
                   : Number(fb.loadCount) || 1;

          const baseLines = [];
          if (rate > 0 || qty > 0) {
            const gross = Number((qty * rate).toFixed(2));
            const net = brokerableDefault
              ? Number((gross - gross * brokeragePctDefault / 100).toFixed(2))
              : gross;
            baseLines.push({
              id: nextLineId(),
              code, item, qty, rate, gross,
              brokerable: brokerableDefault,
              brokeragePct: brokeragePctDefault,
              net,
              copyToPay: false,
              createdAt: new Date().toISOString(),
              createdBy: "system-seed",
            });
          }

          // Legacy extras migration for FBs with no billing lines yet
          const legacyExtras = Array.isArray(fb.extras) ? fb.extras.filter((x) => Number(x.amount) > 0) : [];
          const extraLines = legacyExtras.map((x, idx) => {
            const low = String(x.label || "").toLowerCase();
            const code = low.includes("toll") ? "TOLL"
                       : low.includes("dump") ? "DUMP"
                       : low.includes("fuel") ? "FUEL"
                       : "OTHER";
            const item = code === "OTHER" ? (x.label || "Extra") : x.label;
            const totalAmt = Number(x.amount) || 0;
            const driverQty = Number(x.qty);
            const driverRate = Number(x.rate);
            const qty = driverQty > 0 ? driverQty : 1;
            const rate = driverRate > 0 ? driverRate : (driverQty > 0 ? totalAmt / driverQty : totalAmt);
            const gross = Number((qty * rate).toFixed(2));
            return {
              id: nextLineId() + idx,
              code, item, qty, rate, gross,
              brokerable: false, brokeragePct: 0, net: gross,
              copyToPay: false, isAdjustment: false,
              sourceExtra: true,
              note: x.note || "",
              createdAt: new Date().toISOString(),
              createdBy: "legacy-migration",
            };
          });

          return [...baseLines, ...extraLines];
        })(),
    payingLines: Array.isArray(fb.payingLines) && fb.payingLines.length > 0
      ? (() => {
          // BACKFILL FIX: if an existing HOURLY line has qty=0 and times give a real value, update it
          if (paySeedHours > 0) {
            return fb.payingLines.map((ln) => {
              if (ln.code === "H" && (!ln.qty || Number(ln.qty) === 0)) {
                const rate = Number(ln.rate) || 0;
                const gross = Number((paySeedHours * rate).toFixed(2));
                const net = ln.brokerable
                  ? Number((gross - gross * (Number(ln.brokeragePct) || 0) / 100).toFixed(2))
                  : gross;
                return { ...ln, qty: paySeedHours, gross, net };
              }
              return ln;
            });
          }
          return fb.payingLines;
        })()
      : (() => {
          // Seed one pay line from assignment rate (if a rate is known)
          const method = assignment?.payMethod || "hour";
          const code = method === "hour" ? "H" : method === "ton" ? "T" : "L";
          const item = method === "hour" ? "HOURLY" : method === "ton" ? "TONS" : "LOADS";
          const rate = Number(assignment?.payRate || 0);
          // For HOUR method: use paySeedHours so subs on a project with
          // subMinimumHours set get the floor automatically. Drivers + non-min
          // subs see the same value (paySeedHours == seedHours when no floor).
          // For TON/LOAD: use submitted qty (no floor concept).
          const qty = method === "hour" ? paySeedHours
                   : method === "ton" ? Number(fb.tonnage) || 0
                   : Number(fb.loadCount) || 1;
          if (rate > 0 || qty > 0) {
            const gross = Number((qty * rate).toFixed(2));
            const isSub = assignment?.kind === "sub";
            const contactForPay = assignment?.contactId ? contacts.find((c) => c.id === assignment.contactId) : null;
            const brokerable = isSub && !!contactForPay?.brokerageApplies;
            const brokeragePct = brokerable ? Number(contactForPay?.brokeragePercent || 8) : 0;
            const net = Number((gross - (brokerable ? gross * brokeragePct / 100 : 0)).toFixed(2));
            return [{
              id: nextLineId(),
              code, item, qty, rate, gross,
              brokerable, brokeragePct, net,
              sourceBillingLineId: null,
              createdAt: new Date().toISOString(),
              createdBy: "system-seed",
            }];
          }
          return [];
        })(),
  });
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LINE-ITEM HELPERS (v16 unified structure)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Recompute gross + net for a line after qty/rate/brokerable/brokeragePct changes
  const recomputeLine = (line) => {
    const qty = Number(line.qty) || 0;
    const rate = Number(line.rate) || 0;
    const gross = Number((qty * rate).toFixed(2));
    const net = line.brokerable
      ? Number((gross - gross * (Number(line.brokeragePct) || 0) / 100).toFixed(2))
      : gross;
    return { ...line, gross, net };
  };

  // Brokerage % from the SUB contact (pay side — drivers get 0)
  const getContactBrokeragePct = () => {
    if (!assignment) return 0;
    const isSub = assignment.kind === "sub";
    if (!isSub) return 0; // drivers never have brokerage
    const contact = contacts.find((c) => c.id === assignment.contactId);
    return contact?.brokerageApplies ? (Number(contact?.brokeragePercent) || 8) : 0;
  };

  // Brokerage % from the CUSTOMER contact (billing side — broker customers charge us %)
  // Dispatch → client_id → contact lookup
  const getCustomerBrokeragePct = () => {
    if (!dispatch?.clientId) return 0;
    const customer = contacts.find((c) => c.id === dispatch.clientId);
    return customer?.brokerageApplies ? (Number(customer?.brokeragePercent) || 8) : 0;
  };

  // Add a new billing line
  const addBillingLine = (seed = {}) => {
    const customerPct = getCustomerBrokeragePct(); // NEW: read from customer (not sub)
    const newLine = recomputeLine({
      id: nextLineId(),
      code: seed.code || "",
      item: seed.item || "",
      qty: seed.qty != null ? Number(seed.qty) : 0,
      rate: seed.rate != null ? Number(seed.rate) : 0,
      brokerable: !!seed.brokerable,
      // Default to customer's % if they charge us brokerage, otherwise 8%
      brokeragePct: customerPct > 0 ? customerPct : 8,
      copyToPay: !!seed.copyToPay,
      note: seed.note || "",
      // If FB is already locked on invoice, mark this line as a post-lock adjustment
      isAdjustment: billingSnapshotLocked || !!seed.isAdjustment,
      createdAt: new Date().toISOString(),
      createdBy: currentUser || "admin",
    });
    setDraft((d) => ({ ...d, billingLines: [...(d.billingLines || []), newLine] }));
  };

  const updateBillingLine = (id, patch) => {
    setDraft((d) => {
      const next = (d.billingLines || []).map((ln) => {
        if (ln.id !== id) return ln;
        const merged = { ...ln, ...patch };
        // If Br? just turned on AND line has no pct yet, snapshot customer %
        if (patch.brokerable === true && !ln.brokerable && (!merged.brokeragePct || merged.brokeragePct === 8)) {
          const customerPct = getCustomerBrokeragePct();
          if (customerPct > 0) merged.brokeragePct = customerPct;
        }
        return recomputeLine(merged);
      });
      return { ...d, billingLines: next };
    });
  };

  const deleteBillingLine = (id) => {
    setDraft((d) => ({ ...d, billingLines: (d.billingLines || []).filter((ln) => ln.id !== id) }));
  };

  // Add/update/delete paying lines — same shape but NO copyToPay field, optional sourceBillingLineId
  const addPayingLine = (seed = {}) => {
    const contactPct = getContactBrokeragePct();
    const newLine = recomputeLine({
      id: nextLineId(),
      code: seed.code || "",
      item: seed.item || "",
      qty: seed.qty != null ? Number(seed.qty) : 0,
      rate: seed.rate != null ? Number(seed.rate) : 0,
      brokerable: seed.brokerable != null ? !!seed.brokerable : (assignment?.kind === "sub"),
      // Always show 8% default (or contact's % if set) even when brokerable=false so admin can see what it'd be
      brokeragePct: contactPct > 0 ? contactPct : 8,
      sourceBillingLineId: seed.sourceBillingLineId || null,
      note: seed.note || "",
      // If FB pay snapshot is already locked, mark this line as a post-lock adjustment
      isAdjustment: paySnapshotLocked || !!seed.isAdjustment,
      createdAt: new Date().toISOString(),
      createdBy: currentUser || "admin",
    });
    setDraft((d) => ({ ...d, payingLines: [...(d.payingLines || []), newLine] }));
  };

  const updatePayingLine = (id, patch) => {
    setDraft((d) => {
      const next = (d.payingLines || []).map((ln) => {
        if (ln.id !== id) return ln;
        const merged = { ...ln, ...patch };
        if (patch.brokerable === true && !ln.brokerable) {
          merged.brokeragePct = getContactBrokeragePct();
        }
        return recomputeLine(merged);
      });
      return { ...d, payingLines: next };
    });
  };

  const deletePayingLine = (id) => {
    setDraft((d) => ({ ...d, payingLines: (d.payingLines || []).filter((ln) => ln.id !== id) }));
  };

  // Auto-sync: when a billing line's copyToPay is checked, ensure a matching pay line exists.
  // When unchecked, remove the matched pay line (if it was auto-created).
  const toggleCopyToPay = (billLineId, checked) => {
    setDraft((d) => {
      const bLines = d.billingLines || [];
      const pLines = d.payingLines || [];
      const bLine = bLines.find((x) => x.id === billLineId);
      if (!bLine) return d;

      // Update the billing line's copyToPay flag
      const nextBLines = bLines.map((x) => x.id === billLineId ? { ...x, copyToPay: checked } : x);

      if (checked) {
        // Add a matching pay line if one doesn't already exist for this billing line
        if (pLines.some((p) => p.sourceBillingLineId === billLineId)) {
          return { ...d, billingLines: nextBLines };
        }
        const isSub = assignment?.kind === "sub";
        const brokPct = getContactBrokeragePct();
        const newPayLine = recomputeLine({
          id: nextLineId(),
          code: bLine.code,
          item: bLine.item,
          qty: bLine.qty,
          rate: bLine.rate,  // admin can edit pay rate after — default is SAME as bill rate
          brokerable: isSub && bLine.brokerable,   // inherit brokerable but only for subs
          brokeragePct: (isSub && bLine.brokerable) ? brokPct : 0,
          sourceBillingLineId: billLineId,
          note: "Copied from billing",
          createdAt: new Date().toISOString(),
          createdBy: currentUser || "admin",
        });
        return { ...d, billingLines: nextBLines, payingLines: [...pLines, newPayLine] };
      } else {
        // Remove the auto-created pay line (if it's still linked to this billing line)
        const nextPLines = pLines.filter((p) => p.sourceBillingLineId !== billLineId);
        return { ...d, billingLines: nextBLines, payingLines: nextPLines };
      }
    });
  };

  // Totals
  const billingTotals = useMemo(() => {
    const lines = draft.billingLines || [];
    const gross = lines.reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
    const brokerableGross = lines.filter((ln) => ln.brokerable).reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
    const brokerageAmt = lines.filter((ln) => ln.brokerable)
      .reduce((s, ln) => s + (Number(ln.gross) || 0) * (Number(ln.brokeragePct) || 0) / 100, 0);
    const net = lines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
    return { count: lines.length, gross, brokerableGross, brokerageAmt, net };
  }, [draft.billingLines]);

  const payingTotals = useMemo(() => {
    const lines = draft.payingLines || [];
    const gross = lines.reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
    const brokerableGross = lines.filter((ln) => ln.brokerable).reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
    const brokerageAmt = lines.filter((ln) => ln.brokerable)
      .reduce((s, ln) => s + (Number(ln.gross) || 0) * (Number(ln.brokeragePct) || 0) / 100, 0);
    const net = lines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
    return { count: lines.length, gross, brokerableGross, brokerageAmt, net };
  }, [draft.payingLines]);

  // Auto-calc hours from pickup/dropoff if both present
  const autoHours = useMemo(() => {
    if (!draft.pickupTime || !draft.dropoffTime) return null;
    const [h1, m1] = draft.pickupTime.split(":").map(Number);
    const [h2, m2] = draft.dropoffTime.split(":").map(Number);
    if (isNaN(h1) || isNaN(h2)) return null;
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins <= 0) return null;
    return (mins / 60).toFixed(2);
  }, [draft.pickupTime, draft.dropoffTime]);

  // Auto-fill billed + paid HOURS whenever pickup/dropoff changes — but only
  // for hour-based methods, and only if the field is currently empty (don't overwrite admin edits).
  // Skips if snapshot is locked to preserve historical values. Bounded write-on-empty:
  // once filled, the inner conditions block further writes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!autoHours) return;
    setDraft((d) => {
      const next = { ...d };
      let changed = false;
      if (d.billedMethod === "hour" && (d.billedHours === "" || d.billedHours == null) && !billingSnapshotLocked) {
        next.billedHours = autoHours;
        changed = true;
      }
      if (d.paidMethodSnapshot === "hour" && (d.paidHours === "" || d.paidHours == null) && !paySnapshotLocked) {
        next.paidHours = autoHours;
        changed = true;
      }
      return changed ? next : d;
    });
  }, [autoHours, billingSnapshotLocked, paySnapshotLocked]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const save = async (andApprove = false) => {
    // F2: warn before approving an FB with no proof-of-haul photos.
    // The approval still proceeds if the admin confirms — just makes the
    // missing-photo case loud instead of silent.
    if (andApprove && (!fb.photos || fb.photos.length === 0)) {
      const ok = window.confirm(
        `FB #${fb.freightBillNumber || "—"} has NO photos attached.\n\nApprove anyway?\n\n` +
        `(There will be no proof-of-haul if the customer disputes tonnage, pickup/dropoff, ` +
        `or load count. Cancel to add photos first.)`
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const actualH = draft.hoursBilled ? Number(draft.hoursBilled) : (autoHours ? Number(autoHours) : null);
      const minH = Number(project?.minimumHours) || 0;
      const belowMin = minH > 0 && actualH != null && actualH < minH;

      const patch = {
        ...fb,
        ...draft,
        tonnage: draft.tonnage ? Number(draft.tonnage) : null,
        loadCount: Number(draft.loadCount) || 1,
        hoursBilled: actualH,

        // Persist BILLING snapshot (unless already locked by invoice)
        billedHours: billingSnapshotLocked && fb.billedHours != null ? fb.billedHours : (draft.billedHours !== "" ? Number(draft.billedHours) : null),
        billedTons:  billingSnapshotLocked && fb.billedTons  != null ? fb.billedTons  : (draft.billedTons  !== "" ? Number(draft.billedTons)  : null),
        billedLoads: billingSnapshotLocked && fb.billedLoads != null ? fb.billedLoads : (draft.billedLoads !== "" ? Number(draft.billedLoads) : null),
        billedRate:  billingSnapshotLocked && fb.billedRate  != null ? fb.billedRate  : (draft.billedRate  !== "" ? Number(draft.billedRate)  : null),
        billedMethod: billingSnapshotLocked && fb.billedMethod ? fb.billedMethod : (draft.billedMethod || null),

        // Persist PAY snapshot (unless already locked by pay statement)
        paidHours: paySnapshotLocked && fb.paidHours != null ? fb.paidHours : (draft.paidHours !== "" ? Number(draft.paidHours) : null),
        paidTons:  paySnapshotLocked && fb.paidTons  != null ? fb.paidTons  : (draft.paidTons  !== "" ? Number(draft.paidTons)  : null),
        paidLoads: paySnapshotLocked && fb.paidLoads != null ? fb.paidLoads : (draft.paidLoads !== "" ? Number(draft.paidLoads) : null),
        paidRate:  paySnapshotLocked && fb.paidRate  != null ? fb.paidRate  : (draft.paidRate  !== "" ? Number(draft.paidRate)  : null),
        paidMethodSnapshot: paySnapshotLocked && fb.paidMethodSnapshot ? fb.paidMethodSnapshot : (draft.paidMethodSnapshot || null),

        // Persist line-item arrays (v16 master data).
        // v18 Part B fix: when locked, keep ORIGINAL (non-adjustment) lines intact
        // AND merge in any post-lock adjustment lines the admin added in draft.
        // Previously we discarded the entire draft — wiping any adjustments.
        billingLines: (() => {
          if (!billingSnapshotLocked) return draft.billingLines || [];
          const origLines = Array.isArray(fb.billingLines) ? fb.billingLines.filter((ln) => !ln.isAdjustment) : [];
          const adjLines = Array.isArray(draft.billingLines) ? draft.billingLines.filter((ln) => ln.isAdjustment) : [];
          return [...origLines, ...adjLines];
        })(),
        payingLines: (() => {
          if (!paySnapshotLocked) return draft.payingLines || [];
          const origLines = Array.isArray(fb.payingLines) ? fb.payingLines.filter((ln) => !ln.isAdjustment) : [];
          const adjLines = Array.isArray(draft.payingLines) ? draft.payingLines.filter((ln) => ln.isAdjustment) : [];
          return [...origLines, ...adjLines];
        })(),
      };

      // If admin confirmed min-hours, stamp audit
      if (belowMin && draft.minHoursApplied && !fb.minHoursApplied) {
        patch.minHoursApplied = true;
        patch.minHoursApprovedBy = currentUser || "admin";
        patch.minHoursApprovedAt = new Date().toISOString();
      } else if (!belowMin) {
        patch.minHoursApplied = false;
        patch.minHoursApprovedBy = null;
        patch.minHoursApprovedAt = null;
      } else {
        patch.minHoursApplied = !!draft.minHoursApplied;
      }

      if (andApprove) {
        patch.status = "approved";
        patch.approvedAt = new Date().toISOString();
        patch.approvedBy = currentUser || "admin";
      }
      // v19c Session L: Pass fb.updatedAt so the DB update is guarded by optimistic lock.
      // If another tab/session has modified this FB since we loaded it, the save will reject.
      await editFreightBill(fb.id, patch, fb.updatedAt);
      // v20 Session O: Audit log — fire-and-forget
      if (andApprove && fb.status !== "approved") {
        logAudit({
          actionType: "fb.approve",
          entityType: "freight_bill", entityId: fb.id,
          entityLabel: `FB#${fb.freightBillNumber || "—"}`,
          actor: currentUser || "admin",
          before: { status: fb.status },
          after: { status: "approved" },
        });
      }
      onToast(andApprove ? "✓ FB APPROVED" : "FB UPDATED");
      onClose();
    } catch (e) {
      if (e?.code === "CONCURRENT_EDIT") {
        const msg = "Someone else edited this freight bill while you were working on it.\n\nYour changes were NOT saved.\n\nOK to reload with the latest version (your edits will be lost). Cancel to keep your draft open so you can copy it elsewhere.";
        if (confirm(msg)) {
          onClose();
        }
        return;
      }
      console.error(e);
      onToast("SAVE FAILED");
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    if (!confirm("Reject this freight bill? It will be hidden from customer but kept for your records.")) return;
    setSaving(true);
    try {
      await editFreightBill(fb.id, { ...fb, ...draft, status: "rejected" });
      // v20 Session O: audit log
      logAudit({
        actionType: "fb.reject",
        entityType: "freight_bill", entityId: fb.id,
        entityLabel: `FB#${fb.freightBillNumber || "—"}`,
        actor: currentUser || "admin",
        before: { status: fb.status },
        after: { status: "rejected" },
      });
      onToast("FB REJECTED");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // v18: Soft-delete FB from the edit modal (admin can remove spam/duplicate submissions).
  // Enforces the same cascade rules as DispatchesTab.removeFreightBill — blocks if
  // the FB is on an invoice, marked paid, or customer-paid. Goes to Recovery tab (30 days).
  const handleDelete = async () => {
    // Cascade check
    const blockers = [];
    if (fb.invoiceId) {
      const inv = invoices.find((i) => i.id === fb.invoiceId);
      blockers.push(`• On invoice ${inv?.invoiceNumber || fb.invoiceId} — remove from that invoice first`);
    }
    if (fb.paidAt) {
      const amt = fb.paidAmount ? ` ($${Number(fb.paidAmount).toFixed(2)})` : "";
      blockers.push(`• Paid to sub/driver${amt} on ${new Date(fb.paidAt).toLocaleDateString()} — unmark paid first`);
    }
    if (fb.customerPaidAt) {
      blockers.push(`• Customer has paid this FB — unmark customer payment first`);
    }

    if (blockers.length > 0) {
      alert([
        `✗ Cannot delete FB#${fb.freightBillNumber || "—"}.`,
        ``,
        `This freight bill has downstream records:`,
        ...blockers,
        ``,
        `Clear these first, then try again.`,
      ].join("\n"));
      return;
    }

    if (!confirm(`Delete FB#${fb.freightBillNumber || "—"}?\n\nThis is a SOFT delete. The FB stays recoverable for 30 days in the Recovery tab.`)) return;
    const reason = prompt('Reason for deletion (optional — e.g. "spam", "duplicate", "test submission"):') || "";

    setSaving(true);
    try {
      await deleteFreightBill(fb.id, { deletedBy: "admin", reason });
      // v20 Session O: audit log
      logAudit({
        actionType: "fb.soft_delete",
        entityType: "freight_bill", entityId: fb.id,
        entityLabel: `FB#${fb.freightBillNumber || "—"}`,
        metadata: { reason, status: fb.status, driverName: fb.driverName },
      });
      onToast({
        msg: "✓ FB DELETED",
        action: {
          label: "UNDO",
          onClick: async () => {
            try {
              await recoverFreightBill(fb.id);
              onToast("FB RESTORED");
            } catch (err) {
              console.error("Undo restore failed:", err);
              onToast("⚠ UNDO FAILED — CHECK RECOVERY TAB");
            }
          },
        },
      });
      onClose();
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Delete failed: " + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  const unapprove = async () => {
    if (!confirm("Move back to pending? Customer will no longer see this FB.")) return;
    setSaving(true);
    try {
      await editFreightBill(fb.id, { ...fb, ...draft, status: "pending", approvedAt: null, approvedBy: null });
      onToast("MOVED TO PENDING");
      onClose();
    } catch (e) {
      console.error("Unapprove failed:", e);
      onToast("⚠ UNAPPROVE FAILED — CHECK CONNECTION");
    } finally {
      setSaving(false);
    }
  };

  const statusColor = fb.status === "approved" ? "var(--good)" : fb.status === "rejected" ? "var(--safety)" : "var(--hazard)";
  const statusLabel = (fb.status || "pending").toUpperCase();

  // v18 Batch 2 Session C: keyboard shortcuts
  // Escape → close modal (only when nothing has changed, or after confirm)
  // Ctrl/Cmd + S → save draft
  useEffect(() => {
    const handler = (e) => {
      // Ignore if user is typing in a textarea (Enter/Escape shouldn't bail)
      const tgt = e.target;
      const isTextInput = tgt && (tgt.tagName === "TEXTAREA" || (tgt.tagName === "INPUT" && tgt.type === "text"));

      if (e.key === "Escape") {
        if (saving) return;
        if (lightbox) { setLightbox(null); return; }  // Close lightbox first
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();  // Prevent browser save dialog
        if (saving) return;
        if (isTextInput) tgt.blur();  // Commit any in-flight text input first
        save(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // onClose + save are stable callbacks from the parent — including them
    // would re-bind the listener on every parent render with no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, lightbox]);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1100 }}>
        {lightbox && (
          <div onClick={(e) => { e.stopPropagation(); setLightbox(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <img src={lightbox} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} alt="" />
          </div>
        )}
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)" }}>
              FREIGHT BILL · #{fb.freightBillNumber || "—"} · <span style={{ color: statusColor }}>● {statusLabel}</span>
            </div>
            <h3 className="fbt-display" style={{ fontSize: 20, margin: "4px 0 0" }}>{dispatch?.jobName || "—"}</h3>
            <div className="fbt-mono" style={{ fontSize: 11, color: "#D6D3D1", marginTop: 2 }}>
              Submitted {fb.submittedAt ? new Date(fb.submittedAt).toLocaleString() : "—"}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          {/* v23 Session X: Duplicate FB# warning — soft warning, admin judges */}
          {duplicates.length > 0 && (
            <div style={{
              padding: 14,
              background: "#FEF3C7",
              border: "2px solid var(--hazard-deep)",
              borderLeft: "6px solid var(--hazard-deep)",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}>
              <AlertTriangle size={20} style={{ color: "var(--hazard-deep)", flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--hazard-deep)", marginBottom: 6 }}>
                  ⚠ POSSIBLE DUPLICATE — FB #{fb.freightBillNumber} MATCHES {duplicates.length} OTHER FB{duplicates.length !== 1 ? "S" : ""}
                </div>
                <div style={{ fontSize: 11, color: "var(--steel)", lineHeight: 1.6 }}>
                  {duplicates.slice(0, 5).map((dup) => (
                    <div key={dup.fb.id} style={{ marginBottom: 4 }}>
                      ▸ <strong>FB #{dup.fb.freightBillNumber}</strong> ·{" "}
                      {dup.dispatch ? `Order #${dup.dispatch.code}` : "no order"}
                      {dup.fb.driverName && <span> · {dup.fb.driverName}</span>}
                      {dup.fb.submittedAt && <span> · {new Date(dup.fb.submittedAt).toLocaleDateString()}</span>}
                      {" "}— <span style={{ color: "var(--safety)" }}>{dup.reasons.join(" + ")}</span>
                    </div>
                  ))}
                  {duplicates.length > 5 && <div style={{ fontSize: 10, color: "var(--concrete)" }}>... and {duplicates.length - 5} more</div>}
                </div>
                <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8, fontStyle: "italic" }}>
                  This is a warning only — review the matches and decide if this FB is a true duplicate before approving.
                </div>
              </div>
            </div>
          )}

          {/* LOCK BANNER — prevents editing of invoiced/paid FBs */}
          {(lockedOnInvoice || lockedAsPaid) && (
            <div style={{
              padding: 14,
              background: unlocked ? "#FEF3C7" : "#FEE2E2",
              border: "2px solid " + (unlocked ? "var(--hazard)" : "var(--safety)"),
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}>
              <Lock size={18} style={{ color: unlocked ? "var(--hazard-deep)" : "var(--safety)" }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {unlocked ? "⚠ LOCK OVERRIDDEN — EDITS WILL CHANGE BILLED INVOICE/PAYROLL" : "🔒 FB LOCKED — DOWNSTREAM RECORDS EXIST"}
                </div>
                <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4, lineHeight: 1.4 }}>
                  {lockedOnInvoice && <div>• On invoice <strong>{invoiceOnFb?.invoiceNumber || fb.invoiceId}</strong></div>}
                  {fb.paidAt && <div>• Paid to sub/driver ${fb.paidAmount ? Number(fb.paidAmount).toFixed(2) : ""} on {new Date(fb.paidAt).toLocaleDateString()}</div>}
                  {fb.customerPaidAt && <div>• Customer paid ${fb.customerPaidAmount ? Number(fb.customerPaidAmount).toFixed(2) : ""} on {new Date(fb.customerPaidAt).toLocaleDateString()}</div>}
                </div>
              </div>
              <button
                onClick={() => {
                  if (unlocked) { setUnlocked(false); return; }
                  if (!confirm("Override lock?\n\nThis FB is on an invoice or has payment records. Editing will create inconsistencies with downstream records. Only override if you're intentionally correcting an error.\n\nContinue?")) return;
                  setUnlocked(true);
                }}
                className="btn-ghost"
                style={{ padding: "6px 12px", fontSize: 10, background: "#FFF", whiteSpace: "nowrap" }}
              >
                {unlocked ? "RE-LOCK" : "OVERRIDE LOCK"}
              </button>
            </div>
          )}

          {/* Core IDs */}
          {/* v18 Part B: fieldset no longer disabled by either lock.
              Billing and pay sections now enforce their OWN lock independently,
              and post-lock adjustment lines are allowed on both sides. */}
          <fieldset style={{ border: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>

          {/* v18: ASSIGNED TO — contact info from the dispatch, with cascading Kind + Contact pickers */}
          {dispatch && (() => {
            const assignments = Array.isArray(dispatch.assignments) ? dispatch.assignments : [];
            const currentAssignment = assignments.find((a) => a.aid === fb.assignmentId);
            const currentContact = currentAssignment?.contactId
              ? contacts.find((c) => c.id === currentAssignment.contactId)
              : null;
            const kindColor = currentAssignment?.kind === "sub" ? "#9A3412" : "#0369A1";
            const kindLabel = currentAssignment?.kind === "sub" ? "SUBCONTRACTOR" : "DRIVER";

            // When admin picks a new contact, create a new assignment on the dispatch + repoint FB.
            const reassign = async (kind, contactId) => {
              if (!kind || !contactId) return;
              const contact = contacts.find((c) => c.id === contactId);
              if (!contact) { onToast("CONTACT NOT FOUND"); return; }
              if (!setDispatches) { onToast("⚠ CANNOT REASSIGN — DISPATCH UPDATE NOT AVAILABLE"); return; }

              // Check if an assignment for this contact already exists on this dispatch — reuse it if so
              const existing = assignments.find((a) => a.kind === kind && a.contactId === contactId);
              let targetAid;
              if (existing) {
                targetAid = existing.aid;
              } else {
                // Create new assignment
                targetAid = "a-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
                const newAssignment = {
                  aid: targetAid,
                  kind,
                  contactId,
                  name: contact.contactName || contact.companyName || "",
                  trucks: 1,
                  payMethod: contact.defaultPayMethod || "hour",
                  payRate: contact.defaultPayRate ? String(contact.defaultPayRate) : "",
                };
                const updatedDispatch = {
                  ...dispatch,
                  assignments: [...assignments, newAssignment],
                };
                try {
                  await setDispatches(dispatches.map((d) => d.id === dispatch.id ? updatedDispatch : d));
                } catch (err) {
                  console.error("Add assignment to dispatch failed:", err);
                  onToast("⚠ DISPATCH UPDATE FAILED");
                  return;
                }
              }

              // Now repoint the FB
              try {
                await editFreightBill(fb.id, {
                  ...fb,
                  assignmentId: targetAid,
                  driverName: contact.contactName || contact.companyName || fb.driverName,
                });
                setDraft((d) => ({
                  ...d,
                  driverName: contact.contactName || contact.companyName || d.driverName,
                }));
                onToast(`✓ REASSIGNED TO ${contact.contactName || contact.companyName}`);
              } catch (err) {
                console.error("Reassign FB failed:", err);
                onToast("⚠ FB REASSIGN FAILED");
              }
            };

            return (
              <div style={{ padding: 14, background: "#F0F9FF", border: "2px solid " + kindColor }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <div className="fbt-mono" style={{ fontSize: 11, color: kindColor, fontWeight: 700 }}>
                    🚚 ASSIGNED TO · {currentAssignment ? kindLabel : "UNASSIGNED"}
                  </div>
                </div>

                {/* v18: cascading Kind → Contact pickers */}
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, marginBottom: 12, padding: 10, background: "#FFF", border: "1.5px dashed " + kindColor }}>
                  <div>
                    <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginBottom: 2 }}>1. KIND</div>
                    <select
                      className="fbt-select"
                      value={currentAssignment?.kind || ""}
                      onChange={(e) => {
                        const newKind = e.target.value;
                        if (!newKind) return;
                        // If the current contact is the same kind, keep the picker open but require a new pick
                        // by not auto-triggering reassign. Admin must then choose a contact below.
                        // Just update the local UI state via a one-off trick: set a stub draft flag.
                        // Actually simpler: store pending kind in draft and let the contact picker filter on it.
                        setDraft((d) => ({ ...d, _pendingKind: newKind }));
                      }}
                      style={{ padding: "6px 8px", fontSize: 12 }}
                    >
                      <option value="">— Choose —</option>
                      <option value="driver">DRIVER</option>
                      <option value="sub">SUBCONTRACTOR</option>
                    </select>
                  </div>
                  <div>
                    <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginBottom: 2 }}>2. CONTACT</div>
                    {(() => {
                      const kindInPicker = draft._pendingKind || currentAssignment?.kind || "";
                      const filteredContacts = contacts.filter((c) => c.type === kindInPicker);
                      return (
                        <select
                          className="fbt-select"
                          disabled={!kindInPicker}
                          value={currentAssignment?.contactId || ""}
                          onChange={(e) => {
                            const newContactId = Number(e.target.value);
                            if (!newContactId) return;
                            reassign(kindInPicker, newContactId);
                            setDraft((d) => { const { _pendingKind, ...rest } = d; return rest; });
                          }}
                          style={{ padding: "6px 8px", fontSize: 12 }}
                        >
                          <option value="">{kindInPicker ? `— Pick a ${kindInPicker === "sub" ? "subcontractor" : "driver"} —` : "— Pick kind first —"}</option>
                          {filteredContacts.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.favorite ? "★ " : ""}{c.companyName || c.contactName}
                              {c.contactName && c.companyName ? ` (${c.contactName})` : ""}
                              {c.brokerageApplies ? ` · ${c.brokeragePercent || 10}% brok` : ""}
                              {c.defaultPayRate ? ` · $${c.defaultPayRate}/${c.defaultPayMethod || "hr"}` : ""}
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </div>

                {currentContact ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, fontSize: 12 }}>
                    <div>
                      <div style={{ fontSize: 9, color: "var(--concrete)", marginBottom: 2 }}>NAME</div>
                      <div style={{ fontWeight: 700 }}>{currentContact.contactName || currentAssignment?.name || "—"}</div>
                    </div>
                    {currentContact.companyName && (
                      <div>
                        <div style={{ fontSize: 9, color: "var(--concrete)", marginBottom: 2 }}>COMPANY</div>
                        <div>{currentContact.companyName}</div>
                      </div>
                    )}
                    {currentContact.phone && (
                      <div>
                        <div style={{ fontSize: 9, color: "var(--concrete)", marginBottom: 2 }}>PHONE</div>
                        <a href={`tel:${currentContact.phone}`} style={{ color: kindColor, textDecoration: "none", fontWeight: 600 }}>{currentContact.phone}</a>
                      </div>
                    )}
                    {currentContact.email && (
                      <div>
                        <div style={{ fontSize: 9, color: "var(--concrete)", marginBottom: 2 }}>EMAIL</div>
                        <a href={`mailto:${currentContact.email}`} style={{ color: kindColor, textDecoration: "none", fontWeight: 600, fontSize: 11 }}>{currentContact.email}</a>
                      </div>
                    )}
                    {currentAssignment?.kind === "sub" && currentContact.brokerageApplies && (
                      <div>
                        <div style={{ fontSize: 9, color: "var(--concrete)", marginBottom: 2 }}>BROKERAGE</div>
                        <div style={{ color: "var(--hazard-deep)", fontWeight: 700 }}>{currentContact.brokeragePercent || 10}% applied</div>
                      </div>
                    )}
                    {currentAssignment?.payRate && (
                      <div>
                        <div style={{ fontSize: 9, color: "var(--concrete)", marginBottom: 2 }}>PAY RATE</div>
                        <div>${currentAssignment.payRate} / {currentAssignment.payMethod || "hour"}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", fontStyle: "italic" }}>
                    {currentAssignment
                      ? `${currentAssignment.name || "Unnamed"} — no contact record linked.`
                      : "No assignment linked. Use the dropdowns above to pick one."}
                  </div>
                )}

                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 10 }}>
                  ▸ Picking a new contact creates a new assignment on this order and reassigns this FB to it. Pay rate pulls from the contact's default rate.
                </div>
              </div>
            );
          })()}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label" htmlFor={`fb-${fb.id}-fbnum`}>Freight Bill #</label>
              <input id={`fb-${fb.id}-fbnum`} className="fbt-input" value={draft.freightBillNumber} onChange={(e) => setDraft({ ...draft, freightBillNumber: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label" htmlFor={`fb-${fb.id}-truck`}>Truck #</label>
              <input id={`fb-${fb.id}-truck`} className="fbt-input" value={draft.truckNumber} onChange={(e) => setDraft({ ...draft, truckNumber: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label" htmlFor={`fb-${fb.id}-driver`}>Driver Name</label>
              <input id={`fb-${fb.id}-driver`} className="fbt-input" value={draft.driverName} onChange={(e) => setDraft({ ...draft, driverName: e.target.value })} />
            </div>
          </div>

          {/* Job info */}
          <div>
            <label className="fbt-label" htmlFor={`fb-${fb.id}-jobover`}>Job Name Override (optional — leaves order's job name alone)</label>
            <input id={`fb-${fb.id}-jobover`} className="fbt-input" value={draft.jobNameOverride} onChange={(e) => setDraft({ ...draft, jobNameOverride: e.target.value })} placeholder={dispatch?.jobName || "Uses order's job name by default"} />
          </div>
          <div>
            <label className="fbt-label" htmlFor={`fb-${fb.id}-desc`}>Description of Work</label>
            <textarea id={`fb-${fb.id}-desc`} className="fbt-textarea" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="e.g. 3 loads hauled basalt from Vulcan Napa to Salinas job site" style={{ minHeight: 60 }} />
          </div>

          {/* Material / tonnage / loads */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label" htmlFor={`fb-${fb.id}-material`}>Material</label>
              <input id={`fb-${fb.id}-material`} className="fbt-input" value={draft.material} onChange={(e) => setDraft({ ...draft, material: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label" htmlFor={`fb-${fb.id}-tonnage`}>Tonnage</label>
              <input id={`fb-${fb.id}-tonnage`} className="fbt-input" type="number" step="0.01" value={draft.tonnage} onChange={(e) => setDraft({ ...draft, tonnage: e.target.value })} />
              {/* F6: tonnage overage warning — flag if entered tonnage is >20% over the dispatch's expected tons/truck. */}
              {(() => {
                const expected = Number(dispatch?.expectedTonnagePerTruck);
                const actual = Number(draft.tonnage);
                if (!expected || !actual || actual <= expected * 1.2) return null;
                const pctOver = Math.round(((actual / expected) - 1) * 100);
                return (
                  <div className="fbt-mono" style={{ marginTop: 4, fontSize: 10, color: "var(--hazard-deep)", fontWeight: 700 }}>
                    ⚠ OVERAGE +{pctOver}% · EXPECTED {expected}T/TRUCK · VERIFY SCALE TICKET
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="fbt-label" htmlFor={`fb-${fb.id}-loads`}>Load Count</label>
              <input id={`fb-${fb.id}-loads`} className="fbt-input" type="number" min="1" value={draft.loadCount} onChange={(e) => setDraft({ ...draft, loadCount: e.target.value })} />
            </div>
          </div>

          {/* Hours */}
          <div style={{ padding: 12, background: "#FEF3C7", border: "1.5px solid var(--hazard)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard-deep)", marginBottom: 8 }}>
              ▸ HOURS (FOR BILLING)
            </div>
            {(() => {
              // Helper: set pickup or dropoff time and re-sync hourly billing + paying lines.
              // Used by both the time-input onChange handlers and the "Signed out" buttons.
              const setTimeWithSync = (field, newValue) => {
                const newPickup = field === "pickupTime" ? newValue : draft.pickupTime;
                const newDropoff = field === "dropoffTime" ? newValue : draft.dropoffTime;
                const newHours = hoursFromTimes(newPickup, newDropoff);
                setDraft((d) => {
                  const syncHourly = (lines) => (lines || []).map((ln) => {
                    if (ln.code !== "H") return ln;
                    if (newHours <= 0) return ln; // don't clobber if we can't compute
                    const rate = Number(ln.rate) || 0;
                    const gross = Number((newHours * rate).toFixed(2));
                    const net = ln.brokerable
                      ? Number((gross - gross * (Number(ln.brokeragePct) || 0) / 100).toFixed(2))
                      : gross;
                    return { ...ln, qty: newHours, gross, net };
                  });
                  return {
                    ...d,
                    [field]: newValue,
                    billingLines: syncHourly(d.billingLines),
                    payingLines: syncHourly(d.payingLines),
                  };
                });
              };
              const nowHHMM = () => {
                const n = new Date();
                return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
              };
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  <div>
                    <label className="fbt-label">Start time</label>
                    <input className="fbt-input" type="time" value={draft.pickupTime} onChange={(e) => setTimeWithSync("pickupTime", e.target.value)} />
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setTimeWithSync("pickupTime", nowHHMM())}
                      style={{ marginTop: 6, width: "100%", fontSize: 12 }}
                    >
                      Now
                    </button>
                  </div>
                  <div>
                    <label className="fbt-label">End time</label>
                    <input className="fbt-input" type="time" value={draft.dropoffTime} onChange={(e) => setTimeWithSync("dropoffTime", e.target.value)} />
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setTimeWithSync("dropoffTime", nowHHMM())}
                      style={{ marginTop: 6, width: "100%", fontSize: 12 }}
                    >
                      Now
                    </button>
                  </div>
                </div>
              );
            })()}
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", marginTop: 6 }}>
              ▸ Changing times auto-updates hourly lines in billing &amp; pay · you can override qty manually below
            </div>

            {/* J4: Sub minimum-hours badge — visible whenever this FB is on a
                sub assignment AND the project has subMinimumHours set AND it's
                actually being applied (paySeedHours > seedHours). Informational,
                no admin action needed (the floor was already baked into the
                pay line's qty during draft seeding). */}
            {assignment?.kind === "sub" && subMinHours > 0 && paySeedHours > seedHours && (
              <div style={{ marginTop: 8, padding: 10, background: "#EFF6FF", border: "1.5px solid var(--hazard)", borderRadius: 6 }}>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", fontWeight: 700, marginBottom: 4 }}>
                  ▸ SUB MINIMUM APPLIED · {subMinHours}HR (project default)
                </div>
                <div style={{ fontSize: 11, color: "var(--steel)", lineHeight: 1.5 }}>
                  Actual hours: <strong>{seedHours.toFixed(2)}</strong> · Sub paid for: <strong>{paySeedHours.toFixed(2)} hrs</strong> at the project sub-pay rate.
                </div>
              </div>
            )}

            {/* Minimum hours warning */}
            {(() => {
              const actualH = draft.hoursBilled ? Number(draft.hoursBilled) : (autoHours ? Number(autoHours) : 0);
              const minH = Number(project?.minimumHours) || 0;
              if (minH <= 0 || actualH <= 0 || actualH >= minH) return null;
              return (
                <div style={{ marginTop: 10, padding: 12, background: "#FEF3C7", border: "2px solid var(--hazard)" }}>
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", fontWeight: 700, marginBottom: 6 }}>
                    ⚠ BELOW PROJECT MINIMUM
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>
                    Actual hours: <strong>{actualH.toFixed(2)}</strong> · Project "{project.name}" minimum: <strong>{minH}</strong> hrs
                    <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
                      ▸ CUSTOMER WILL BE INVOICED FOR {minH} HRS · SUB PAID FOR {actualH.toFixed(2)} HRS (ACTUAL)
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={!!draft.minHoursApplied}
                      onChange={(e) => setDraft({ ...draft, minHoursApplied: e.target.checked })}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    CONFIRM — APPLY {minH}-HR MINIMUM ON INVOICE
                  </label>
                  {fb.minHoursApplied && fb.minHoursApprovedBy && (
                    <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 6 }}>
                      Previously confirmed by {fb.minHoursApprovedBy} on {fb.minHoursApprovedAt?.slice(0, 10)}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Signed-out status — separate from start/end time. Driver picks ONE
              of "loaded" or "empty" and stamps a single time. Admin can edit. */}
          <div style={{ padding: 12, background: "#F8FAFC", border: "1.5px solid var(--line)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8 }}>
              ▸ SIGNED-OUT (DRIVER YARD CHECK)
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {["loaded", "empty"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDraft({ ...draft, signedOutStatus: draft.signedOutStatus === opt ? "" : opt })}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: `2px solid ${draft.signedOutStatus === opt ? "var(--good)" : "var(--line)"}`,
                    background: draft.signedOutStatus === opt ? "var(--good)" : "#FFF",
                    color: draft.signedOutStatus === opt ? "#FFF" : "var(--steel)",
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: "capitalize",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input
              className="fbt-input"
              type="time"
              value={draft.signedOutAt || ""}
              onChange={(e) => setDraft({ ...draft, signedOutAt: e.target.value })}
              disabled={!draft.signedOutStatus}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="fbt-label">Driver Notes (from submission)</label>
            <textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} style={{ minHeight: 50 }} />
          </div>
          <div>
            <label className="fbt-label">Admin Notes (internal, customer doesn't see)</label>
            <textarea className="fbt-textarea" value={draft.adminNotes} onChange={(e) => setDraft({ ...draft, adminNotes: e.target.value })} placeholder="Why I corrected hours, any flags, etc." style={{ minHeight: 50, background: "#FEF3C7" }} />
          </div>


          </fieldset>


          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              v16 LINE ITEM TABLES — new master data model
              Combined billing + pay entry like DumpTruckSoftware TRLoDTS
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div style={{ borderTop: "3px double var(--steel)", paddingTop: 14 }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--steel)", fontWeight: 700, marginBottom: 10 }}>
              ▸ BILLING &amp; PAY LINES (NEW STRUCTURE)
            </div>


            {/* ─── BILLING LINES ─── */}
            <div style={{ padding: 12, background: billingSnapshotLocked ? "#F0F9FF" : "#FFF", border: "2px solid " + (billingSnapshotLocked ? "#0EA5E9" : "#0369A1"), marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
                <div className="fbt-mono" style={{ fontSize: 11, color: "#0369A1", fontWeight: 700 }}>
                  🏢 BILLING LINES (BILL TO CUSTOMER)
                </div>
                {billingSnapshotLocked && (
                  <span className="chip" style={{ background: "#0EA5E9", color: "#FFF", fontSize: 9, padding: "2px 6px" }}>
                    <Lock size={9} style={{ marginRight: 3, verticalAlign: "middle" }} />LOCKED · {invoiceOnFb?.invoiceNumber || "invoiced"}
                  </span>
                )}
              </div>

              {/* F5: Mixed-rate detection — if any billing line's rate differs from
                  the dispatch's CURRENT rate for the same method, surface a warning
                  with a one-click "Apply $X.XX" action per line. Skips when the
                  invoice is locked since lines can't be edited then. */}
              {!billingSnapshotLocked && (() => {
                const drift = (draft.billingLines || []).map((ln) => {
                  const code = ln.code;
                  if (code !== "H" && code !== "T" && code !== "L") return null;
                  const dispRate = code === "H" ? Number(dispatch?.ratePerHour)
                                 : code === "T" ? Number(dispatch?.ratePerTon)
                                 : Number(dispatch?.ratePerLoad);
                  if (!dispRate) return null;
                  const lnRate = Number(ln.rate) || 0;
                  if (lnRate === 0) return null;
                  if (Math.abs(lnRate - dispRate) <= 0.005) return null;
                  return { line: ln, dispRate, code };
                }).filter(Boolean);
                if (drift.length === 0) return null;
                return (
                  <div style={{ marginBottom: 10, padding: 10, background: "#FEF3C7", border: "1.5px solid var(--hazard)", borderRadius: 4 }}>
                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard-deep)", fontWeight: 700, marginBottom: 6 }}>
                      ⚠ RATE DRIFT · {drift.length} LINE{drift.length !== 1 ? "S" : ""} STAMPED AT A DIFFERENT RATE THAN THE DISPATCH'S CURRENT RATE
                    </div>
                    <div style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--steel)" }}>
                      {drift.map((d) => {
                        const methodLabel = d.code === "H" ? "hr" : d.code === "T" ? "ton" : "load";
                        return (
                          <div key={d.line.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span>
                              {d.line.item || d.code} · stamped <strong>${Number(d.line.rate).toFixed(2)}/{methodLabel}</strong> · dispatch now <strong>${d.dispRate.toFixed(2)}/{methodLabel}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => updateBillingLine(d.line.id, { rate: d.dispRate })}
                              className="btn-ghost"
                              style={{ padding: "2px 8px", fontSize: 10, color: "var(--hazard-deep)", borderColor: "var(--hazard-deep)" }}
                              title="Re-rate this line to the dispatch's current rate"
                            >
                              APPLY ${d.dispRate.toFixed(2)}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginTop: 6 }}>
                      ▸ DEFAULT IS THE STAMPED RATE (WHAT WAS AGREED WHEN APPROVED). APPLY ONLY IF YOU CONFIRMED A NEW RATE WITH THE CUSTOMER.
                    </div>
                  </div>
                );
              })()}

              {/* Quick-add buttons — when LOCKED, new rows become adjustments */}
              <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                {billingSnapshotLocked && (
                  <span className="fbt-mono" style={{ fontSize: 9, color: "var(--hazard-deep)", marginRight: 6 }}>
                    + POST-LOCK ADJUSTMENT:
                  </span>
                )}
                <button type="button" onClick={() => addBillingLine({ code: "H", item: billingSnapshotLocked ? "HOURLY (adj)" : "HOURLY", rate: Number(dispatch?.ratePerHour) || 0 })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ HOURS</button>
                <button type="button" onClick={() => addBillingLine({ code: "T", item: billingSnapshotLocked ? "TONS (adj)" : "TONS", rate: Number(dispatch?.ratePerTon) || 0 })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ TONS</button>
                <button type="button" onClick={() => addBillingLine({ code: "L", item: billingSnapshotLocked ? "LOADS (adj)" : "LOADS", rate: Number(dispatch?.ratePerLoad) || 0 })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ LOADS</button>
                <button type="button" onClick={() => addBillingLine({ code: "TOLL", item: "Tolls", qty: 1 })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ TOLL</button>
                <button type="button" onClick={() => addBillingLine({ code: "DUMP", item: "Dump Fees", qty: 1 })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ DUMP</button>
                <button type="button" onClick={() => addBillingLine({ code: "FUEL", item: "Fuel", qty: 1 })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ FUEL</button>
                <button type="button" onClick={() => addBillingLine({ code: "OTHER", item: "" })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ OTHER</button>
              </div>

              {/* Lines table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #0369A1", color: "#0369A1", fontSize: 9 }}>
                      <th style={{ textAlign: "left", padding: "4px 6px", width: 50 }}>CODE</th>
                      <th style={{ textAlign: "left", padding: "4px 6px" }}>ITEM</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 70 }}>QTY</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 80 }}>RATE</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 85 }}>GROSS</th>
                      <th style={{ textAlign: "center", padding: "4px 6px", width: 40 }}>BR?</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 50 }}>%</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 85 }}>NET</th>
                      <th style={{ textAlign: "center", padding: "4px 6px", width: 40 }}>CP?</th>
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(draft.billingLines || []).length === 0 && (
                      <tr><td colSpan={10} style={{ padding: 16, textAlign: "center", color: "var(--concrete)", fontStyle: "italic" }}>No billing lines yet — use the quick-add buttons above.</td></tr>
                    )}
                    {(draft.billingLines || []).map((ln) => {
                      // Row is locked only if the FB is locked AND this line is NOT an adjustment
                      const rowLocked = billingSnapshotLocked && !ln.isAdjustment;
                      const rowBg = ln.isAdjustment ? "#FEF3C7" : "transparent";
                      return (
                      <tr key={ln.id} style={{ borderBottom: "1px solid #BAE6FD", background: rowBg }}>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="text" value={ln.code || ""} onChange={(e) => updateBillingLine(ln.id, { code: e.target.value.toUpperCase() })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, fontFamily: "inherit", border: "1px solid #BAE6FD", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="text" value={ln.item || ""} onChange={(e) => updateBillingLine(ln.id, { item: e.target.value })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, fontFamily: "inherit", border: "1px solid #BAE6FD", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                          {ln.isAdjustment && <div style={{ fontSize: 8, color: "var(--hazard-deep)", marginTop: 2, fontWeight: 700 }}>⚙ POST-LOCK ADJ</div>}
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="number" step="0.01" value={ln.qty || ""} onChange={(e) => updateBillingLine(ln.id, { qty: e.target.value })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, textAlign: "right", fontFamily: "inherit", border: "1px solid #BAE6FD", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="number" step="0.01" value={ln.rate || ""} onChange={(e) => updateBillingLine(ln.id, { rate: e.target.value })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, textAlign: "right", fontFamily: "inherit", border: "1px solid #BAE6FD", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{fmt$(ln.gross)}</td>
                        <td style={{ padding: "4px 6px", textAlign: "center" }}>
                          <input type="checkbox" checked={!!ln.brokerable} onChange={(e) => updateBillingLine(ln.id, { brokerable: e.target.checked })}
                            disabled={rowLocked} />
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right" }}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={ln.brokeragePct ?? 8}
                            onChange={(e) => updateBillingLine(ln.id, { brokeragePct: e.target.value === "" ? 0 : Number(e.target.value) })}
                            disabled={rowLocked || !ln.brokerable}
                            style={{
                              width: 48, padding: "3px 4px", fontSize: 10, textAlign: "right",
                              fontFamily: "inherit",
                              border: "1px solid #BAE6FD",
                              background: (!ln.brokerable || rowLocked) ? "#F5F5F4" : "#FFF",
                              color: ln.brokerable ? "var(--steel)" : "var(--concrete)",
                              opacity: ln.brokerable ? 1 : 0.55,
                            }}
                          />
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700, color: "#0369A1" }}>{fmt$(ln.net)}</td>
                        <td style={{ padding: "4px 6px", textAlign: "center" }}>
                          <input type="checkbox" checked={!!ln.copyToPay} onChange={(e) => toggleCopyToPay(ln.id, e.target.checked)}
                            disabled={rowLocked}
                            title="Copy this line to the sub/driver's pay side" />
                        </td>
                        <td style={{ padding: "4px 2px", textAlign: "center" }}>
                          {!rowLocked && (
                            <button type="button" onClick={() => deleteBillingLine(ln.id)}
                              style={{ background: "transparent", border: "none", color: "var(--safety)", cursor: "pointer", padding: 2 }} title="Delete line">
                              <X size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                  {billingTotals.count > 0 && (
                    <tfoot>
                      <tr style={{ borderTop: "2px solid #0369A1", background: "#F0F9FF" }}>
                        <td colSpan={4} style={{ padding: "6px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#0369A1" }}>TOTALS</td>
                        <td style={{ padding: "6px", textAlign: "right", fontWeight: 700 }}>{fmt$(billingTotals.gross)}</td>
                        <td colSpan={2} style={{ padding: "6px", textAlign: "right", fontSize: 9, color: "var(--concrete)" }}>
                          {billingTotals.brokerageAmt > 0 ? `−${fmt$(billingTotals.brokerageAmt)}` : ""}
                        </td>
                        <td style={{ padding: "6px", textAlign: "right", fontWeight: 700, color: "#0369A1", fontSize: 13 }}>{fmt$(billingTotals.net)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* ─── PAYING LINES ─── */}
            <div style={{ padding: 12, background: paySnapshotLocked ? "#F0FDF4" : "#FFF", border: "2px solid " + (paySnapshotLocked ? "var(--good)" : "var(--good)") }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--good)", fontWeight: 700 }}>
                  🚚 PAYING LINES (PAY TO SUB / DRIVER)
                </div>
                {paySnapshotLocked && (
                  <span className="chip" style={{ background: "var(--good)", color: "#FFF", fontSize: 9, padding: "2px 6px" }}>
                    <Lock size={9} style={{ marginRight: 3, verticalAlign: "middle" }} />LOCKED
                  </span>
                )}
              </div>

              {/* Quick-add buttons — when LOCKED, new rows become adjustments */}
              <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                {paySnapshotLocked && (
                  <span className="fbt-mono" style={{ fontSize: 9, color: "var(--hazard-deep)", marginRight: 6 }}>
                    + POST-LOCK ADJUSTMENT:
                  </span>
                )}
                <button type="button" onClick={() => addPayingLine({ code: "H", item: paySnapshotLocked ? "HOURLY (adj)" : "HOURLY", rate: Number(assignment?.payRate) || 0, brokerable: assignment?.kind === "sub" && !!getContactBrokeragePct() })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ HOURS</button>
                <button type="button" onClick={() => addPayingLine({ code: "T", item: paySnapshotLocked ? "TONS (adj)" : "TONS" })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ TONS</button>
                <button type="button" onClick={() => addPayingLine({ code: "L", item: paySnapshotLocked ? "LOADS (adj)" : "LOADS" })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ LOADS</button>
                <button type="button" onClick={() => addPayingLine({ code: "TOLL", item: "Tolls", qty: 1, brokerable: false })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ TOLL REIMB</button>
                <button type="button" onClick={() => addPayingLine({ code: "DUMP", item: "Dump Fees", qty: 1, brokerable: false })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ DUMP REIMB</button>
                <button type="button" onClick={() => addPayingLine({ code: "OTHER", item: "", brokerable: false })}
                  className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+ OTHER</button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", minWidth: 720 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--good)", color: "var(--good)", fontSize: 9 }}>
                      <th style={{ textAlign: "left", padding: "4px 6px", width: 50 }}>CODE</th>
                      <th style={{ textAlign: "left", padding: "4px 6px" }}>ITEM</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 70 }}>QTY</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 80 }}>RATE</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 85 }}>GROSS</th>
                      <th style={{ textAlign: "center", padding: "4px 6px", width: 40 }}>BR?</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 50 }}>%</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", width: 85 }}>NET</th>
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(draft.payingLines || []).length === 0 && (
                      <tr><td colSpan={9} style={{ padding: 16, textAlign: "center", color: "var(--concrete)", fontStyle: "italic" }}>No pay lines yet — use the quick-add buttons above, or check CP? on a billing line.</td></tr>
                    )}
                    {(draft.payingLines || []).map((ln) => {
                      // Row is locked only if pay is locked AND this line is NOT an adjustment
                      const rowLocked = paySnapshotLocked && !ln.isAdjustment;
                      const rowBg = ln.isAdjustment ? "#FEF3C7" : (ln.sourceBillingLineId ? "#ECFDF5" : "transparent");
                      return (
                      <tr key={ln.id} style={{ borderBottom: "1px solid #86EFAC", background: rowBg }}>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="text" value={ln.code || ""} onChange={(e) => updatePayingLine(ln.id, { code: e.target.value.toUpperCase() })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, fontFamily: "inherit", border: "1px solid #86EFAC", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="text" value={ln.item || ""} onChange={(e) => updatePayingLine(ln.id, { item: e.target.value })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, fontFamily: "inherit", border: "1px solid #86EFAC", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                          {ln.sourceBillingLineId && <div style={{ fontSize: 8, color: "var(--good)", marginTop: 2 }}>↖ from billing</div>}
                          {ln.isAdjustment && <div style={{ fontSize: 8, color: "var(--hazard-deep)", marginTop: 2, fontWeight: 700 }}>⚙ POST-LOCK ADJ</div>}
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="number" step="0.01" value={ln.qty || ""} onChange={(e) => updatePayingLine(ln.id, { qty: e.target.value })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, textAlign: "right", fontFamily: "inherit", border: "1px solid #86EFAC", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input type="number" step="0.01" value={ln.rate || ""} onChange={(e) => updatePayingLine(ln.id, { rate: e.target.value })}
                            disabled={rowLocked}
                            style={{ width: "100%", padding: "3px 5px", fontSize: 10, textAlign: "right", fontFamily: "inherit", border: "1px solid #86EFAC", background: rowLocked ? "#F5F5F4" : "#FFF" }} />
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{fmt$(ln.gross)}</td>
                        <td style={{ padding: "4px 6px", textAlign: "center" }}>
                          <input type="checkbox" checked={!!ln.brokerable} onChange={(e) => updatePayingLine(ln.id, { brokerable: e.target.checked })}
                            disabled={rowLocked || assignment?.kind !== "sub"}
                            title={assignment?.kind !== "sub" ? "Brokerage only applies to subs" : "Apply brokerage to this line"} />
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right" }}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={ln.brokeragePct ?? 8}
                            onChange={(e) => updatePayingLine(ln.id, { brokeragePct: e.target.value === "" ? 0 : Number(e.target.value) })}
                            disabled={rowLocked || !ln.brokerable || assignment?.kind !== "sub"}
                            style={{
                              width: 48, padding: "3px 4px", fontSize: 10, textAlign: "right",
                              fontFamily: "inherit",
                              border: "1px solid #86EFAC",
                              background: (!ln.brokerable || rowLocked) ? "#F5F5F4" : "#FFF",
                              color: ln.brokerable ? "var(--steel)" : "var(--concrete)",
                              opacity: ln.brokerable ? 1 : 0.55,
                            }}
                          />
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700, color: "var(--good)" }}>{fmt$(ln.net)}</td>
                        <td style={{ padding: "4px 2px", textAlign: "center" }}>
                          {!rowLocked && (
                            <button type="button" onClick={() => deletePayingLine(ln.id)}
                              style={{ background: "transparent", border: "none", color: "var(--safety)", cursor: "pointer", padding: 2 }} title="Delete line">
                              <X size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                  {payingTotals.count > 0 && (
                    <tfoot>
                      <tr style={{ borderTop: "2px solid var(--good)", background: "#F0FDF4" }}>
                        <td colSpan={4} style={{ padding: "6px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "var(--good)" }}>TOTALS</td>
                        <td style={{ padding: "6px", textAlign: "right", fontWeight: 700 }}>{fmt$(payingTotals.gross)}</td>
                        <td colSpan={2} style={{ padding: "6px", textAlign: "right", fontSize: 9, color: "var(--concrete)" }}>
                          {payingTotals.brokerageAmt > 0 ? `−${fmt$(payingTotals.brokerageAmt)}` : ""}
                        </td>
                        <td style={{ padding: "6px", textAlign: "right", fontWeight: 700, color: "var(--good)", fontSize: 13 }}>{fmt$(payingTotals.net)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* MARGIN summary */}
            {billingTotals.net > 0 && payingTotals.net > 0 && (
              <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div className="fbt-mono" style={{ fontSize: 10 }}>▸ FB MARGIN</div>
                <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontSize: 11 }}>
                    BILLED <strong style={{ color: "#7DD3FC" }}>{fmt$(billingTotals.net)}</strong> − PAID <strong style={{ color: "#86EFAC" }}>{fmt$(payingTotals.net)}</strong>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--hazard)" }}>
                    = {fmt$(billingTotals.net - payingTotals.net)}
                  </div>
                </div>
              </div>
            )}
            <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginTop: 8 }}>
              ▸ CHECK CP? ON A BILLING LINE TO AUTO-ADD A MATCHING PAY LINE (EDIT PAY RATE AFTER)
            </div>
          </div>


          {/* Incident report — captured ad-hoc by the driver, attached to next
              FB submission. Shown as a prominent red panel since these usually
              require admin follow-up (insurance, photos, drivable status). */}
          {fb.incidentReport && (() => {
            const r = fb.incidentReport;
            const when = r.reportedAt ? new Date(r.reportedAt).toLocaleString() : "—";
            const drivLabel = r.drivable === "yes" ? "drivable" : r.drivable === "no" ? "NOT drivable" : "drivability unsure";
            return (
              <div style={{ padding: 12, border: "2px solid var(--safety)", background: "#FEF2F2", borderRadius: 6 }}>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--safety)", fontWeight: 700, marginBottom: 6 }}>
                  ⚠ INCIDENT REPORT · {String(r.kind || "—").toUpperCase()} · {drivLabel.toUpperCase()}
                </div>
                <div style={{ fontSize: 11, color: "var(--steel)" }}>
                  Signed by <strong>{r.signedBy || "—"}</strong> · {when} · Truck {r.truckNumber || "—"}
                  {r.location && <> · {r.location}</>}
                </div>
                {r.narrative && (
                  <div style={{ marginTop: 8, padding: 8, background: "#FFF", border: "1px solid var(--line)", fontSize: 12, lineHeight: 1.5 }}>
                    {r.narrative}
                  </div>
                )}
                {(r.otherParty || r.policeReportNumber) && (
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, color: "var(--steel)" }}>
                    {r.otherParty && <div><strong>Other party:</strong> {r.otherParty}</div>}
                    {r.policeReportNumber && <div><strong>Police report #:</strong> {r.policeReportNumber}</div>}
                  </div>
                )}
                {Array.isArray(r.photos) && r.photos.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {r.photos.map((p, idx) => (
                      <img key={p.id || idx} src={p.dataUrl} alt="" style={{ width: 80, height: 80, objectFit: "cover", border: "1px solid var(--line)" }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Pre-trip / post-trip inspections — present on the FIRST FB
              of the day (pre) or the FB submitted right after end-of-shift
              check (post). Shows OK/DEFECT counts and lists each defect inline.
              Read-only (driver-signed). */}
          {[
            { label: "DOT PRE-TRIP", insp: fb.pretripInspection },
            { label: "DOT POST-TRIP", insp: fb.posttripInspection },
          ].filter((x) => x.insp).map(({ label, insp }) => {
            const items = Array.isArray(insp.items) ? insp.items : [];
            const okCount = items.filter((i) => i.result === "ok").length;
            const defects = items.filter((i) => i.result === "defect");
            const when = insp.completedAt ? new Date(insp.completedAt).toLocaleString() : "—";
            return (
              <div key={label} style={{ padding: 10, border: `1.5px solid ${defects.length > 0 ? "var(--hazard)" : "var(--good)"}`, background: defects.length > 0 ? "#FEF3C7" : "#F0FDF4", borderRadius: 6 }}>
                <div className="fbt-mono" style={{ fontSize: 11, color: defects.length > 0 ? "var(--hazard-deep)" : "var(--good)", fontWeight: 700, marginBottom: 4 }}>
                  ▸ {label} · {okCount}/{items.length} OK · {defects.length} DEFECT{defects.length !== 1 ? "S" : ""}
                </div>
                <div style={{ fontSize: 11, color: "var(--steel)" }}>
                  Signed by <strong>{insp.signedBy || "—"}</strong> · {when} · Truck {insp.truckNumber || "—"}
                </div>
                {defects.length > 0 && (
                  <div style={{ marginTop: 6, display: "grid", gap: 3 }}>
                    {defects.map((d) => (
                      <div key={d.id} style={{ fontSize: 11, color: "var(--steel)" }}>
                        • <strong>{d.label}</strong>{d.note ? ` — ${d.note}` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Photos — admin can add, view, or remove */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
                ▸ SCALE TICKETS ({draft.photos?.length || 0})
              </div>
              <label
                className="btn-ghost"
                style={{ cursor: "pointer", padding: "5px 12px", fontSize: 11 }}
                title="Add more photos for this freight bill"
              >
                <Camera size={12} style={{ marginRight: 4 }} /> ADD PHOTOS
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    const next = [...(draft.photos || [])];
                    for (const f of Array.from(files)) {
                      try {
                        const dataUrl = await compressImage(f);
                        next.push({ id: nextLineId(), dataUrl, name: f.name, addedByAdmin: true });
                      } catch (err) { console.warn(err); }
                    }
                    setDraft({ ...draft, photos: next });
                    e.target.value = ""; // reset so same file can be picked again
                  }}
                />
              </label>
            </div>
            {(draft.photos || []).length === 0 ? (
              <div style={{ padding: 16, border: "2px dashed var(--concrete)", textAlign: "center", color: "var(--concrete)", fontSize: 12 }}>
                NO PHOTOS ATTACHED · TAP ADD PHOTOS TO UPLOAD
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {draft.photos.map((p, idx) => {
                  const catLabel = p.category === "scale_ticket" ? "SCALE"
                                 : p.category === "freight_bill" ? "FB"
                                 : p.category === "police_ticket" ? "POLICE"
                                 : p.category === "other" ? "OTHER"
                                 : null;
                  const catColor = p.category === "police_ticket" ? "var(--safety)"
                                 : p.category === "freight_bill" ? "var(--good)"
                                 : "var(--steel)";
                  return (
                  <div key={p.id || idx} style={{ position: "relative" }}>
                    <img
                      src={p.dataUrl}
                      alt=""
                      style={{ width: 100, height: 100, objectFit: "cover", border: "2px solid var(--steel)", cursor: "pointer" }}
                      onClick={() => setLightbox(p.dataUrl)}
                    />
                    {catLabel && (
                      <span
                        style={{ position: "absolute", top: 2, left: 2, background: catColor, color: "#FFF", fontSize: 8, padding: "1px 5px", fontWeight: 700 }}
                        title={`Tagged as ${p.category}`}
                      >
                        {catLabel}
                      </span>
                    )}
                    {p.addedByAdmin && (
                      <span
                        style={{ position: "absolute", bottom: 2, left: 2, background: "var(--steel)", color: "var(--cream)", fontSize: 8, padding: "1px 4px" }}
                        title="Added by admin"
                      >
                        ADMIN
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm("Remove this photo?")) return;
                        setDraft({ ...draft, photos: draft.photos.filter((_, i) => i !== idx) });
                      }}
                      style={{ position: "absolute", top: -6, right: -6, background: "var(--safety)", color: "#FFF", border: "2px solid var(--steel)", width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, borderRadius: "50%" }}
                      title="Remove photo"
                    >
                      <X size={11} />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, paddingTop: 14, borderTop: "2px solid var(--steel)" }}>
            {fb.status !== "approved" && (
              <button
                onClick={() => save(true)}
                disabled={saving || (!unlocked && (lockedOnInvoice || lockedAsPaid))}
                className="btn-primary"
                style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}
              >
                <ShieldCheck size={16} /> SAVE & APPROVE
              </button>
            )}
            <button onClick={() => save(false)} disabled={saving || (!unlocked && (lockedOnInvoice || lockedAsPaid))} className="btn-ghost">
              <Save size={16} /> SAVE ONLY
            </button>
            {fb.status === "approved" && (
              <button onClick={unapprove} disabled={saving || (!unlocked && (lockedOnInvoice || lockedAsPaid))} className="btn-ghost">
                <Clock size={16} /> MOVE TO PENDING
              </button>
            )}
            {fb.status !== "rejected" && (
              <button onClick={reject} disabled={saving || (!unlocked && (lockedOnInvoice || lockedAsPaid))} className="btn-danger">
                <X size={16} /> REJECT
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={saving || !!fb.invoiceId || !!fb.paidAt || !!fb.customerPaidAt}
              title={
                fb.invoiceId ? "Can't delete — FB is on an invoice" :
                fb.paidAt ? "Can't delete — FB is paid to sub/driver" :
                fb.customerPaidAt ? "Can't delete — customer has paid this FB" :
                "Soft-delete this FB (recoverable for 30 days)"
              }
              className="btn-ghost"
              style={{
                borderColor: "var(--safety)",
                color: "var(--safety)",
                opacity: (!!fb.invoiceId || !!fb.paidAt || !!fb.customerPaidAt) ? 0.4 : 1,
              }}
            >
              <Trash2 size={14} style={{ marginRight: 4 }} /> DELETE
            </button>
            <button onClick={onClose} className="btn-ghost" style={{ marginLeft: "auto" }}>CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};
