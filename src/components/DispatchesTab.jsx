import { useState, useEffect, useMemo, useRef } from "react";
import {
  AlertCircle, Calendar, Camera, CheckCircle2, ClipboardList, Edit2, Eye,
  FileText, Link2, Lock, Mail, MessageSquare, Plus, Printer, RefreshCw,
  Search, Send, Share2, Trash2, Upload, X,
} from "lucide-react";
import {
  fmtDate, fmtDateTime, formatTime12h, todayISO, randomCode,
  clientToken, qrServiceUrl, buildSMSLink, buildEmailLink,
} from "../utils";
import {
  fetchDispatches, updateDispatch, deleteDispatch, recoverDispatch,
  fetchFreightBills, deleteFreightBill, recoverFreightBill, logAudit,
} from "../db";
import { Lightbox } from "./Lightbox";
import { QRCodeBlock } from "./QRCodeBlock";
import { QuickAddContactModal } from "./QuickAddContactModal";
import { FBPhotoGallery } from "./FBPhotoGallery";

// Small lock badge for a NewDispatch form field. Pulled to module scope so
// it doesn't get re-created on every render (was tripping
// react-hooks/static-components). `locks` carries the three closure values
// it used to capture inline.
const LockChip = ({ field, label, locks }) => {
  const { isFieldLocked, overriddenFields, openOverride } = locks;
  if (!isFieldLocked(field)) {
    if (overriddenFields[field]) {
      return <span className="fbt-mono" style={{ fontSize: 9, color: "var(--safety)", marginLeft: 6, fontWeight: 700 }}>🔓 OVERRIDE: {overriddenFields[field].slice(0, 30)}{overriddenFields[field].length > 30 ? "…" : ""}</span>;
    }
    return null;
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); openOverride(field, label); }}
      className="btn-ghost"
      style={{ padding: "2px 8px", fontSize: 9, marginLeft: 6, background: "#FEF2F2", borderColor: "var(--safety)", color: "var(--safety)" }}
      title="Click to override with reason"
    >
      🔒 UNLOCK
    </button>
  );
};

const printDriverSheet = async (dispatch, url, onToast) => {
  try {
    const qrUrl = qrServiceUrl(url, 800);

    const w = window.open("", "_blank", "width=850,height=1100");
    if (!w) { onToast?.("ALLOW POPUPS TO PRINT"); return; }

    const esc = (s) => String(s || "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
    const fmtDateLocal = (iso) => { try { return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); } catch { return iso || ""; } };

    const html = `<!DOCTYPE html>
<html><head><title>Dispatch ${esc(dispatch.code)} — Driver Sheet</title>
<style>
  @page { margin: 0.5in; size: letter; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, Arial, sans-serif; color: #1C1917; padding: 20px; }
  .bar { height: 14px; background: repeating-linear-gradient(-45deg, #F59E0B 0 14px, #1C1917 14px 28px); margin: -20px -20px 30px; }
  h1 { font-family: 'Archivo Black', Impact, sans-serif; font-size: 42px; letter-spacing: -0.02em; margin: 0 0 4px; line-height: 1; }
  .sub { font-family: Menlo, monospace; font-size: 12px; color: #D97706; letter-spacing: 0.15em; margin-bottom: 24px; }
  .card { border: 3px solid #1C1917; padding: 20px; margin-bottom: 20px; }
  .card-accent { border: 3px solid #F59E0B; background: #FEF3C7; padding: 20px; margin-bottom: 20px; }
  h2 { font-family: 'Archivo Black', Impact, sans-serif; font-size: 18px; margin: 0 0 10px; letter-spacing: -0.01em; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-family: Menlo, monospace; font-size: 13px; }
  .grid div strong { display: block; font-size: 10px; color: #44403C; letter-spacing: 0.1em; margin-bottom: 2px; }
  .qr-wrap { display: flex; gap: 30px; align-items: flex-start; }
  .qr-left { flex: 1; }
  .qr-right { text-align: center; }
  .qr-right img { border: 4px solid #1C1917; background: #FFF; padding: 8px; }
  ol { font-size: 14px; line-height: 1.7; padding-left: 22px; }
  ol li { margin-bottom: 6px; }
  .code-big { font-family: 'Archivo Black', Impact, sans-serif; font-size: 32px; color: #D97706; letter-spacing: 0.05em; }
  .url-box { font-family: Menlo, monospace; font-size: 11px; background: #1C1917; color: #F59E0B; padding: 8px 12px; word-break: break-all; margin-top: 8px; }
  .footer { font-family: Menlo, monospace; font-size: 10px; color: #44403C; letter-spacing: 0.15em; margin-top: 30px; padding-top: 14px; border-top: 2px solid #1C1917; display: flex; justify-content: space-between; }
  .btn-print { position: fixed; top: 10px; right: 10px; padding: 10px 20px; background: #F59E0B; border: 3px solid #1C1917; font-family: 'Archivo Black', sans-serif; cursor: pointer; font-size: 13px; letter-spacing: 0.1em; }
  @media print { .btn-print { display: none; } body { padding: 0; } }
</style></head>
<body>
<button class="btn-print" onclick="window.print()">🖨 PRINT</button>
<div class="bar"></div>
<h1>DRIVER / SUB INSTRUCTIONS</h1>
<div class="sub">▸ 4 BROTHERS TRUCKING · DISPATCH #${esc(dispatch.code)}</div>

<div class="card-accent">
  <h2>THE JOB</h2>
  <div class="grid">
    <div><strong>JOB</strong>${esc(dispatch.jobName)}</div>
    <div><strong>DATE</strong>${esc(fmtDateLocal(dispatch.date))}</div>
    <div><strong>PICKUP</strong>${esc(dispatch.pickup) || "—"}</div>
    <div><strong>DROPOFF</strong>${esc(dispatch.dropoff) || "—"}</div>
    <div><strong>MATERIAL</strong>${esc(dispatch.material) || "—"}</div>
    <div><strong>TRUCKS EXPECTED</strong>${esc(dispatch.trucksExpected)}</div>
  </div>
  ${dispatch.notes ? `<div style="margin-top:12px; padding-top:12px; border-top:1px solid #1C1917; font-size:13px; font-family:Menlo,monospace;">${esc(dispatch.notes)}</div>` : ""}
</div>

<div class="card">
  <div class="qr-wrap">
    <div class="qr-left">
      <h2>SCAN TO UPLOAD YOUR FREIGHT BILL</h2>
      <ol>
        <li>Open your phone camera and point it at the QR code →</li>
        <li>Tap the link that appears</li>
        <li>Fill in <strong>freight bill #</strong> (from the top of your paper bill), driver name, and truck #</li>
        <li>Take photos of the scale tickets and paper freight bill</li>
        <li>Tap <strong>SUBMIT FREIGHT BILL</strong> — done</li>
        <li>If you have more trucks for this dispatch, tap <strong>LOG ANOTHER TRUCK</strong> and repeat</li>
      </ol>
      <div class="code-big">${esc(dispatch.code)}</div>
      <div class="url-box">${esc(url)}</div>
    </div>
    <div class="qr-right">
      <img src="${qrUrl}" alt="QR code" style="width:240px; height:240px;" />
      <div style="font-family:Menlo,monospace; font-size:10px; color:#44403C; letter-spacing:0.15em; margin-top:6px;">▸ SCAN ME</div>
    </div>
  </div>
</div>

<div class="footer">
  <span>PROBLEMS? CONTACT DISPATCH.</span>
  <span>4 BROTHERS TRUCKING, LLC</span>
</div>
</body></html>`;

    w.document.write(html);
    w.document.close();
    onToast?.("DRIVER SHEET OPENED");
  } catch (e) {
    console.error(e);
    onToast?.("PRINT SHEET FAILED");
  }
};

export const DispatchesTab = ({ dispatches, setDispatches, freightBills, setFreightBills, contacts = [], setContacts, company = {}, unreadIds = [], markDispatchRead, pendingDispatch, clearPendingDispatch, quarries = [], projects = [], fleet = [], invoices = [], onToast }) => {
  const [showNew, setShowNew] = useState(false);
  // v18 Batch 2: quick-add contact from assignment picker. Shape: { idx, kind } — `idx` is the assignment row being edited.
  const [quickAddContact, setQuickAddContact] = useState(null);
  // v18 Batch 2 Session D: Photo gallery modal — dispatch id to filter on, or null when hidden
  const [dispatchPhotoGallery, setDispatchPhotoGallery] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingLock, setEditingLock] = useState({ level: 0, reason: "" });
  const [overriddenFields, setOverriddenFields] = useState({}); // { fieldName: "reason" }
  const [overrideTarget, setOverrideTarget] = useState(null); // { field, label } for modal

  // Check if a field is currently locked (not yet overridden)
  // field names: 'assignments', 'rate', 'material', 'job', 'all'
  const isFieldLocked = (field) => {
    if (!editingId || editingLock.level === 0) return false;
    if (overriddenFields[field]) return false;
    // Level 1: assignments only locked
    if (editingLock.level === 1) return field === "assignments";
    // Level 2: assignments + rate + material + job
    if (editingLock.level === 2) return ["assignments", "rate", "material", "job"].includes(field);
    // Level 3: everything
    if (editingLock.level === 3) return true;
    return false;
  };

  const openOverride = (field, label) => {
    setOverrideTarget({ field, label });
  };

  // Small lock badge component for form fields
  // Bundle the lock-related closure values into one object so LockChip
  // (which lives at module scope, see below) can read them via a single prop.
  const locks = { isFieldLocked, overriddenFields, openOverride };
  const [activeDispatch, setActiveDispatch] = useState(null);
  const [textQueue, setTextQueue] = useState(null); // { list: [{name, smsLink}], sent: [bool] }
  const [sendLinksTarget, setSendLinksTarget] = useState(null); // Dispatch object to show Send Links modal for

  // Jump to dispatch when notification clicked
  useEffect(() => {
    if (pendingDispatch) {
      setActiveDispatch(pendingDispatch);
      clearPendingDispatch?.();
    }
  }, [pendingDispatch]);

  // Mark as read when dispatch opened
  useEffect(() => {
    if (activeDispatch && markDispatchRead) {
      const ids = freightBills.filter((fb) => fb.dispatchId === activeDispatch && unreadIds.includes(fb.id)).map((fb) => fb.id);
      if (ids.length > 0) markDispatchRead(activeDispatch);
    }
  }, [activeDispatch]);

  const unreadSet = useMemo(() => new Set(unreadIds), [unreadIds]);
  const [lightbox, setLightbox] = useState(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState({ date: todayISO(), jobName: "", clientName: "", clientId: "", projectId: null, subContractor: "", subContractorId: "", pickup: "", dropoff: "", material: "", trucksExpected: 1, expectedTonnagePerTruck: "", shift: "day", baseStartTime: "", staggerMin: 5, ratePerHour: "", ratePerTon: "", ratePerLoad: "", notes: "", assignedDriverIds: [] });

  const resetDraft = () => setDraft({ date: todayISO(), jobName: "", clientName: "", clientId: "", projectId: null, subContractor: "", subContractorId: "", pickup: "", dropoff: "", material: "", trucksExpected: 1, expectedTonnagePerTruck: "", shift: "day", baseStartTime: "", staggerMin: 5, ratePerHour: "", ratePerTon: "", ratePerLoad: "", notes: "", assignedDriverIds: [], assignments: [] });

  // Snapshot of the draft when the modal opens; used for dirty-state detection
  // so an accidental backdrop-click or X doesn't wipe out a half-filled form.
  const draftSnapshotRef = useRef(null);
  useEffect(() => {
    if (showNew) {
      // Re-stringify on each open so the snapshot reflects edit-mode pre-fills
      // (openEditDispatch sets the draft just before flipping showNew=true).
      draftSnapshotRef.current = JSON.stringify(draft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNew]);

  // Close handler for the New/Edit Order modal — confirms when dirty so the
  // dispatcher doesn't lose a 2-minute order entry from a stray click.
  const closeOrderModal = () => {
    const isDirty = draftSnapshotRef.current && JSON.stringify(draft) !== draftSnapshotRef.current;
    if (isDirty && !window.confirm("You have unsaved changes on this order.\n\nClose anyway?")) {
      return;
    }
    setShowNew(false);
    setEditingId(null);
    resetDraft();
  };

  // Open the modal pre-filled with an existing order's data (edit mode)
  const openEditDispatch = (d) => {
    setEditingId(d.id);
    setEditingLock(lockStateFor(d)); // stash the lock state for the form to use
    setOverriddenFields({}); // reset override flags per edit session
    setDraft({
      date: d.date || todayISO(),
      jobName: d.jobName || "",
      clientName: d.clientName || "",
      clientId: d.clientId || "",
      projectId: d.projectId || null,
      subContractor: d.subContractor || "",
      subContractorId: d.subContractorId || "",
      pickup: d.pickup || "",
      dropoff: d.dropoff || "",
      material: d.material || "",
      trucksExpected: d.trucksExpected || 1,
      expectedTonnagePerTruck: d.expectedTonnagePerTruck ?? "",
      shift: d.shift || "day",
      baseStartTime: d.baseStartTime || "",
      staggerMin: d.staggerMin ?? 5,
      ratePerHour: d.ratePerHour || "",
      ratePerTon: d.ratePerTon || "",
      ratePerLoad: d.ratePerLoad || "",
      quarryId: d.quarryId || null,
      notes: d.notes || "",
      assignedDriverIds: d.assignedDriverIds || [],
      assignments: d.assignments || [],
      lockOverrides: d.lockOverrides || [],
    });
    setShowNew(true);
  };

  const createDispatch = async () => {
    if (!draft.jobName) { onToast("JOB NAME REQUIRED"); return; }

    const assignedIds = draft.assignedDriverIds || [];
    const assignedNames = assignedIds.map((id) => {
      const c = contacts.find((x) => x.id === id);
      return c ? (c.companyName || c.contactName) : "";
    }).filter(Boolean);

    // Compute expected trucks from assignments (if any) else use manual input
    const assignments = (draft.assignments || []).filter((a) => a.contactId).map((a, idx) => ({
      ...a,
      aid: a.aid || `a${Date.now().toString(36).slice(-4)}${idx}`, // stable short ID
    }));

    // DOUBLE-ASSIGNMENT CHECK — warn if any driver is on another non-closed order
    // Check both individual driver assignments AND drivers-under-sub assignments
    const driverAssignmentIds = assignments
      .filter((a) => a.kind === "driver" && a.contactId)
      .map((a) => a.contactId);

    const conflicts = [];
    for (const driverId of driverAssignmentIds) {
      const otherOrders = dispatches.filter((d) => {
        if (editingId && d.id === editingId) return false; // skip this order if editing
        if (d.status === "closed") return false;
        return (d.assignments || []).some((a) => a.kind === "driver" && a.contactId === driverId);
      });
      if (otherOrders.length > 0) {
        const contact = contacts.find((c) => c.id === driverId);
        const driverName = contact?.companyName || contact?.contactName || "Driver";
        conflicts.push({
          driverName,
          orders: otherOrders.map((o) => ({ code: o.code, date: o.date, status: o.status })),
        });
      }
    }

    if (conflicts.length > 0) {
      const msgLines = conflicts.map((c) =>
        `⚠ ${c.driverName} is already on: ${c.orders.map((o) => `#${o.code} (${o.date})`).join(", ")}`
      );
      const proceed = confirm(
        `DRIVER DOUBLE-ASSIGNMENT DETECTED:\n\n${msgLines.join("\n\n")}\n\nAssign anyway?`
      );
      if (!proceed) return;
    }

    const assignmentsTrucks = assignments.reduce((s, a) => s + (Number(a.trucks) || 0), 0);
    const finalTrucksExpected = assignmentsTrucks > 0
      ? assignmentsTrucks
      : (Number(draft.trucksExpected) || 1);

    if (editingId) {
      // EDIT MODE — update existing order (keep its original code, createdAt, status)
      const existing = dispatches.find((x) => x.id === editingId);
      if (!existing) { onToast("ORDER NOT FOUND"); return; }
      const updated = {
        ...existing,
        ...draft,
        trucksExpected: finalTrucksExpected,
        assignedDriverIds: assignedIds,
        assignedDriverNames: assignedNames,
        assignments,
        lockOverrides: draft.lockOverrides || existing.lockOverrides || [],
        updatedAt: new Date().toISOString(),
        // Preserve: id, code, createdAt, status
        id: existing.id,
        code: existing.code,
        createdAt: existing.createdAt,
        status: existing.status,
      };
      // v19c Session M: direct updateDispatch with optimistic lock on existing.updatedAt.
      // Bypasses the diff-upsert wrapper (setDispatches) which doesn't support per-row locks.
      try {
        const saved = await updateDispatch(editingId, updated, existing.updatedAt);
        // Merge saved row into local state so UI reflects the new updated_at etc.
        setDispatches((prev) => prev.map((d) => d.id === editingId ? saved : d));
        setShowNew(false);
        setEditingId(null);
        resetDraft();
        onToast("ORDER UPDATED");
      } catch (err) {
        if (err?.code === "CONCURRENT_EDIT") {
          const msg = "Someone else edited this order while you were working on it.\n\nYour changes were NOT saved.\n\nOK to reload with the latest version (your edits will be lost). Cancel to keep your draft open so you can copy it elsewhere.";
          if (confirm(msg)) {
            setShowNew(false);
            setEditingId(null);
            resetDraft();
          }
        } else {
          console.error("updateDispatch failed:", err);
          onToast("⚠ SAVE FAILED — CHECK CONNECTION");
        }
      }
      return;
    }

    // CREATE MODE — new order
    const code = randomCode(6);
    const d = {
      ...draft,
      id: "temp-" + Date.now(),
      code,
      trucksExpected: finalTrucksExpected,
      assignedDriverIds: assignedIds,
      assignedDriverNames: assignedNames,
      assignments,
      createdAt: new Date().toISOString(),
      status: "open",
    };
    const next = [d, ...dispatches];
    await setDispatches(next);
    setShowNew(false);
    // v18 fix: look up in `next` (what we just saved), not `dispatches` (stale closure).
    // Was: setTimeout + read from dispatches — brittle race with realtime refresh.
    const fresh = next.find((x) => x.code === code);
    if (fresh) setActiveDispatch(fresh.id);
    resetDraft();
    onToast("ORDER CREATED");

    // If order has assignments with contacts — open Send Links modal so admin can text/email the team
    if (assignments && assignments.length > 0 && assignments.some((a) => a.contactId)) {
      setSendLinksTarget(d);
    }
  };

  const removeDispatch = async (id) => {
    const d = dispatches.find((x) => x.id === id);
    if (!d) return;
    const childFbs = freightBills.filter((fb) => fb.dispatchId === id);
    const submittedFbs = childFbs.filter((fb) => (fb.status || "pending") !== "rejected");

    // STRICT CASCADE: block if any non-rejected FBs exist. Admin must delete/reject them first.
    if (submittedFbs.length > 0) {
      const invoicedCount = childFbs.filter((fb) => fb.invoiceId).length;
      const paidCount = childFbs.filter((fb) => fb.paidAt).length;
      const custPaidCount = childFbs.filter((fb) => fb.customerPaidAt).length;

      const lines = [
        `✗ Cannot delete Order #${d.code} (${d.jobName || "—"}).`,
        ``,
        `This order has ${submittedFbs.length} freight bill${submittedFbs.length !== 1 ? "s" : ""} attached:`,
      ];
      if (invoicedCount > 0) lines.push(`  • ${invoicedCount} on invoice${invoicedCount !== 1 ? "s" : ""} — remove from invoice first`);
      if (paidCount > 0)     lines.push(`  • ${paidCount} paid to sub/driver — unmark paid first`);
      if (custPaidCount > 0) lines.push(`  • ${custPaidCount} customer-paid — unmark payment first`);
      const unblockedCount = submittedFbs.length - invoicedCount - paidCount - custPaidCount;
      if (unblockedCount > 0) lines.push(`  • ${unblockedCount} freight bill${unblockedCount !== 1 ? "s" : ""} pending/approved — delete those first`);
      lines.push(``, `Go to the Review tab (or the order's FB list) to handle them, then try again.`);
      alert(lines.join("\n"));
      return;
    }

    // No FBs — safe to delete. Prompt for optional reason.
    if (!confirm(`Delete Order #${d.code} (${d.jobName || "—"})?\n\nThis is a SOFT delete. The order stays recoverable for 30 days in the Recovery tab.`)) return;
    const reason = prompt('Reason for deletion (optional):') || "";

    try {
      await deleteDispatch(id, { deletedBy: "admin", reason });
      const nextD = dispatches.filter((x) => x.id !== id);
      await setDispatches(nextD);
      onToast({
        msg: "ORDER DELETED",
        action: {
          label: "UNDO",
          onClick: async () => {
            try {
              await recoverDispatch(id);
              const fresh = await fetchDispatches();
              await setDispatches(fresh);
              onToast("ORDER RESTORED");
            } catch (err) {
              console.error("Undo restore failed:", err);
              onToast("⚠ UNDO FAILED — CHECK RECOVERY TAB");
            }
          },
        },
      });
    } catch (e) {
      console.error("Soft delete failed:", e);
      alert("Delete failed: " + (e?.message || String(e)));
    }
  };

  const removeFreightBill = async (id) => {
    const fb = freightBills.find((x) => x.id === id);
    if (!fb) return;

    // STRICT CASCADE: block if FB has any downstream records
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
    const reason = prompt('Reason for deletion (optional):') || "";

    try {
      await deleteFreightBill(id, { deletedBy: "admin", reason });
      const next = freightBills.filter((x) => x.id !== id);
      await setFreightBills(next);
      onToast({
        msg: "FB DELETED",
        action: {
          label: "UNDO",
          onClick: async () => {
            try {
              await recoverFreightBill(id);
              const fresh = await fetchFreightBills();
              await setFreightBills(fresh);
              onToast("FB RESTORED");
            } catch (err) {
              console.error("Undo restore failed:", err);
              onToast("⚠ UNDO FAILED — CHECK RECOVERY TAB");
            }
          },
        },
      });
    } catch (e) {
      console.error("Soft delete failed:", e);
      alert("Delete failed: " + (e?.message || String(e)));
    }
  };

  const toggleStatus = async (id) => {
    const current = dispatches.find((d) => d.id === id);
    const newStatus = current?.status === "open" ? "closed" : (current?.status === "sent" ? "closed" : "open");
    const next = dispatches.map((d) => d.id === id ? { ...d, status: newStatus } : d);
    await setDispatches(next);
    // v20 Session O: audit log
    if (current && current.status !== newStatus) {
      logAudit({
        actionType: "dispatch.status_toggle",
        entityType: "dispatch", entityId: id,
        entityLabel: `#${current.code || id.slice(0, 6)}`,
        before: { status: current.status },
        after: { status: newStatus },
      });
    }
  };

  // Mark order as dispatched (status → sent)
  const markDispatched = async (id) => {
    const current = dispatches.find((d) => d.id === id);
    const next = dispatches.map((d) => {
      if (d.id !== id) return d;
      if (d.status === "sent" || d.status === "closed") return d;
      return { ...d, status: "sent" };
    });
    await setDispatches(next);
    // v20 Session O: audit log
    if (current && current.status !== "sent" && current.status !== "closed") {
      logAudit({
        actionType: "dispatch.status_toggle",
        entityType: "dispatch", entityId: id,
        entityLabel: `#${current.code || id.slice(0, 6)}`,
        before: { status: current.status },
        after: { status: "sent" },
        metadata: { action: "markDispatched" },
      });
    }
    onToast("✓ MARKED AS DISPATCHED");

    // Offer to send team links after marking dispatched
    const dispatch = next.find((d) => d.id === id);
    if (dispatch?.assignments?.length > 0 && dispatch.assignments.some((a) => a.contactId)) {
      setSendLinksTarget(dispatch);
    }
  };

  // Reconciliation helpers
  const adjustNoShow = async (id, delta) => {
    const next = dispatches.map((d) => {
      if (d.id !== id) return d;
      const cur = Number(d.noShowCount) || 0;
      const expected = Number(d.trucksExpected) || 1;
      const submittedCount = freightBills.filter((fb) => fb.dispatchId === id).length;
      const newCount = Math.max(0, Math.min(expected - submittedCount, cur + delta));
      // If they change noShow, auto-clear any prior reconciliation stamp
      return { ...d, noShowCount: newCount, reconciledAt: null, reconciledBy: null };
    });
    await setDispatches(next);
  };

  const markReconciled = async (id) => {
    const next = dispatches.map((d) => {
      if (d.id !== id) return d;
      return { ...d, reconciledAt: new Date().toISOString(), reconciledBy: "admin" };
    });
    await setDispatches(next);
    onToast("✓ ORDER RECONCILED");
  };

  const unmarkReconciled = async (id) => {
    const next = dispatches.map((d) => {
      if (d.id !== id) return d;
      return { ...d, reconciledAt: null, reconciledBy: null };
    });
    await setDispatches(next);
  };

  // Compute the lock state for a dispatch
  // Returns { level, reason, hasApprovedFbs, hasInvoicedFbs }
  //   level: 0=draft (none), 1=sent (assignments locked), 2=approved (rate/material/job locked), 3=invoiced (full lock)
  const lockStateFor = (d) => {
    const bills = freightBills.filter((fb) => fb.dispatchId === d.id);
    const hasApprovedFbs = bills.some((fb) => fb.status === "approved");
    const hasInvoicedFbs = bills.some((fb) => fb.invoiceId);
    let level = 0;
    let reason = "";
    if (hasInvoicedFbs) { level = 3; reason = "FBs invoiced"; }
    else if (hasApprovedFbs) { level = 2; reason = "FBs approved"; }
    else if (d.status === "sent") { level = 1; reason = "Dispatched"; }
    else if (d.status === "closed") { level = 3; reason = "Order closed"; }
    return { level, reason, hasApprovedFbs, hasInvoicedFbs };
  };

  const copyLink = (code) => {
    const url = `${window.location.origin}${window.location.pathname}#/submit/${code}`;
    try { navigator.clipboard.writeText(url); onToast("LINK COPIED"); }
    catch { prompt("Copy this link:", url); }
  };

  // Build SMS/Email text with order details.
  // Per-assignment `sendRates` flag controls whether the rate + minimum-hours
  // block is included in the text — defaults ON (treats undefined/missing as ON
  // for legacy dispatches) and applies to BOTH drivers and subs.
  const buildDispatchText = (dispatch, assignment = null) => {
    const url = assignment?.aid
      ? `${window.location.origin}${window.location.pathname}#/submit/${dispatch.code}/a/${assignment.aid}`
      : `${window.location.origin}${window.location.pathname}#/submit/${dispatch.code}`;

    const project = projects.find((p) => p.id === dispatch.projectId);
    const customer = contacts.find((c) => c.id === dispatch.clientId);
    const customerName = customer?.companyName || dispatch.clientName || "";
    const primeName = project?.primeContractor || "";

    const lines = [];
    lines.push(`${company?.name || "4 BROTHERS TRUCKING"} — ORDER #${dispatch.code}`);
    lines.push(`Date: ${dispatch.date || "TBD"}`);
    if (customerName) lines.push(`Customer: ${customerName}`);
    if (primeName) lines.push(`Prime: ${primeName}`);
    if (dispatch.jobName) lines.push(`Job: ${dispatch.jobName}`);
    if (dispatch.pickup) lines.push(`PICKUP: ${dispatch.pickup}`);
    if (dispatch.dropoff) lines.push(`DROPOFF: ${dispatch.dropoff}`);
    if (dispatch.material) lines.push(`Material: ${dispatch.material}`);

    // Per-truck start times (if any are set on this assignment)
    if (assignment?.startTimes?.length > 0) {
      const validTimes = assignment.startTimes.filter((r) => r && (r.time || r.location));
      if (validTimes.length > 0) {
        lines.push("");
        lines.push(`START TIME${validTimes.length > 1 ? "S" : ""}:`);
        validTimes.forEach((r, i) => {
          const tNum = i + 1;
          const tStr = r.time ? formatTime12h(r.time) : "TBD";
          const locStr = r.location ? ` at ${r.location}` : "";
          const label = validTimes.length > 1 ? `Truck ${tNum}: ` : "";
          lines.push(`${label}${tStr}${locStr}`);
        });
      }
    }

    // Rate + min-hours block — gated by per-assignment `sendRates` flag.
    // Treats undefined/missing as ON so dispatches that pre-date the flag still
    // get rates in the text (matches the form's default behavior).
    const includeRates = assignment ? assignment.sendRates !== false : false;
    if (includeRates && assignment?.payRate) {
      const method = assignment.payMethod || "hour";
      const methodLabel = method === "hour" ? "/hr" : method === "ton" ? "/ton" : "/load";
      const minH = project?.minimumHours;
      lines.push(`Rate: $${assignment.payRate}${methodLabel}${method === "hour" && minH ? ` (${minH}hr min)` : ""}`);
    }
    if (assignment && assignment.kind === "sub" && assignment.trucks > 1) {
      lines.push(`Trucks: ${assignment.trucks}`);
    }

    if (dispatch.notes) lines.push(`Notes: ${dispatch.notes}`);

    lines.push("");
    lines.push("Submit scale tickets here:");
    lines.push(url);

    return lines.join("\n");
  };

  // Copy the full dispatch text (with details) for a specific assignment
  const copyDispatchText = (dispatch, assignment = null) => {
    const text = buildDispatchText(dispatch, assignment);
    try { navigator.clipboard.writeText(text); onToast("TEXT COPIED — PASTE INTO SMS/EMAIL"); }
    catch { prompt("Copy this text:", text); }
  };

  // SMS intent — opens the phone's messaging app
  const smsDispatch = (dispatch, assignment, phone) => {
    if (!phone) { onToast("NO PHONE NUMBER"); return; }
    const text = buildDispatchText(dispatch, assignment);
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    const url = `sms:${cleanPhone}?&body=${encodeURIComponent(text)}`;
    window.location.href = url;
  };

  // Index freight bills by dispatchId once so inline lookups are O(1)
  // instead of O(N) per render. Big win when there are hundreds of FBs
  // and every dispatch row filters across them.
  const fbsByDispatch = useMemo(() => {
    const map = new Map();
    for (const fb of freightBills) {
      const list = map.get(fb.dispatchId);
      if (list) list.push(fb); else map.set(fb.dispatchId, [fb]);
    }
    return map;
  }, [freightBills]);
  const fbForDispatch = (id) => fbsByDispatch.get(id) || [];

  const filteredDispatches = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return dispatches;
    return dispatches.filter((d) => {
      if (d.jobName.toLowerCase().includes(s)) return true;
      if ((d.subContractor || "").toLowerCase().includes(s)) return true;
      if (d.code.toLowerCase().includes(s)) return true;
      const fbs = fbsByDispatch.get(d.id) || [];
      if (fbs.some((fb) => (fb.freightBillNumber || "").toLowerCase().includes(s) || (fb.driverName || "").toLowerCase().includes(s) || (fb.truckNumber || "").toLowerCase().includes(s))) return true;
      return false;
    });
  }, [dispatches, fbsByDispatch, search]);

  // v18: group dispatches by day — key = YYYY-MM-DD of the "order date"
  // (order date is `date` field if present, else createdAt, else submittedAt).
  // Within each day, sort newest first. Days themselves are sorted newest first.
  const groupedByDay = useMemo(() => {
    const dayKey = (d) => {
      const ts = d.date || d.createdAt || d.submittedAt || new Date().toISOString();
      return (ts || "").slice(0, 10); // YYYY-MM-DD
    };
    const groups = {};
    filteredDispatches.forEach((d) => {
      const k = dayKey(d);
      if (!groups[k]) groups[k] = [];
      groups[k].push(d);
    });
    // Sort each day's orders: most-recently-created first
    Object.values(groups).forEach((arr) => {
      arr.sort((a, b) => (b.createdAt || b.submittedAt || "").localeCompare(a.createdAt || a.submittedAt || ""));
    });
    // Return as array of { date, orders }, newest day first
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map((k) => ({ date: k, orders: groups[k] }));
  }, [filteredDispatches]);

  // Human-friendly date label: "Today", "Yesterday", or "Mon, Apr 22, 2026"
  const dayLabel = (iso) => {
    if (!iso) return "—";
    const today = todayISO();
    const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
    if (iso === today) return "Today";
    if (iso === yesterday) return "Yesterday";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      {/* v18: Quick-add contact modal (triggered from assignment picker) */}
      {quickAddContact && (
        <QuickAddContactModal
          kind={quickAddContact.kind}
          onCancel={() => setQuickAddContact(null)}
          onToast={onToast}
          onSave={async (newContact) => {
            if (!setContacts) {
              onToast("⚠ CONTACT SAVE NOT AVAILABLE");
              setQuickAddContact(null);
              return;
            }
            // Add to contacts with a temp id, setContacts will insert to DB and give real id
            const tempId = "temp-" + Date.now();
            const staged = { ...newContact, id: tempId };
            const nextList = [...contacts, staged];
            try {
              await setContacts(nextList);
              // Find the newly-inserted contact (will be last one with matching name, since setContacts diff'd & returned real id)
              // Best effort: wait one tick for state to settle, then find by name match
              setTimeout(() => {
                // The saved contact will reappear via the realtime contacts subscription;
                // meanwhile pre-fill the current assignment row with the staged contact details
                // so admin doesn't have to re-pick.
                const next = [...draft.assignments];
                const idx = quickAddContact.idx;
                next[idx] = {
                  ...next[idx],
                  // contactId left as-is (temp id, but will resolve once parent state refreshes)
                  contactId: tempId,
                  name: newContact.companyName || newContact.contactName || "",
                  payRate: newContact.defaultPayRate ? String(newContact.defaultPayRate) : next[idx].payRate,
                  payMethod: newContact.defaultPayMethod || next[idx].payMethod || "hour",
                };
                setDraft({ ...draft, assignments: next });
                onToast(`✓ ${newContact.companyName || newContact.contactName} ADDED + ASSIGNED`);
                setQuickAddContact(null);
              }, 100);
            } catch (e) {
              console.error("QuickAdd contact save failed:", e);
              onToast("⚠ SAVE FAILED — CHECK CONNECTION");
            }
          }}
        />
      )}

      {/* v18 Batch 2 Session D: Photo gallery modal — triggered from dispatch detail view */}
      {dispatchPhotoGallery && (() => {
        const d = dispatches.find((x) => x.id === dispatchPhotoGallery);
        return (
          <FBPhotoGallery
            freightBills={freightBills}
            dispatches={dispatches}
            contacts={contacts}
            projects={projects}
            invoices={invoices}
            initialDispatchId={dispatchPhotoGallery}
            title={`ORDER #${d?.code || ""} PHOTOS`}
            onClose={() => setDispatchPhotoGallery(null)}
          />
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}><div className="stat-num">{dispatches.length}</div><div className="stat-label">Dispatches</div></div>
        <div className="fbt-card" style={{ padding: 20 }}><div className="stat-num">{dispatches.filter(d => d.status === "open").length}</div><div className="stat-label">Open</div></div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--hazard)" }}><div className="stat-num">{freightBills.length}</div><div className="stat-label">Freight Bills</div></div>
        <div className="fbt-card" style={{ padding: 20 }}><div className="stat-num">{freightBills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0).toFixed(1)}</div><div className="stat-label">Total Tons</div></div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search freight bill #, driver, truck, job, sub…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setEditingId(null); resetDraft(); setShowNew(true); }} className="btn-primary"><Plus size={16} /> NEW ORDER</button>
      </div>

      {/* Send Links modal — offered after order create / mark-dispatched */}
      {sendLinksTarget && (() => {
        // Find the order fresh each render so we pick up state changes
        const dispatch = dispatches.find((x) => x.id === sendLinksTarget.id) || sendLinksTarget;
        const assignmentsToNotify = (dispatch.assignments || []).filter((a) => a.contactId);

        return (
          <div className="modal-bg" onClick={() => setSendLinksTarget(null)} style={{ zIndex: 108 }}>
            <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
              <div style={{ padding: "16px 22px", background: "var(--good)", color: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em" }}>SEND DISPATCH TO TEAM</div>
                  <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>Order #{dispatch.code}</h3>
                  <div className="fbt-mono" style={{ fontSize: 10, opacity: 0.9, marginTop: 2 }}>
                    {dispatch.jobName} · {dispatch.date}
                  </div>
                </div>
                <button onClick={() => setSendLinksTarget(null)} style={{ background: "transparent", border: "none", color: "#FFF", cursor: "pointer" }}><X size={20} /></button>
              </div>

              <div style={{ padding: 18 }}>
                <div style={{ padding: 10, background: "#FEF3C7", border: "1px solid var(--hazard)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", marginBottom: 14, color: "var(--hazard-deep)", letterSpacing: "0.05em" }}>
                  ▸ TAP TEXT OR EMAIL BELOW TO SEND EACH DRIVER/SUB THEIR DISPATCH INFO · MESSAGE IS PRE-FILLED · YOU STILL TAP SEND
                </div>

                {assignmentsToNotify.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--concrete)" }}>
                    <AlertCircle size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                    <div className="fbt-mono" style={{ fontSize: 12 }}>NO ASSIGNMENTS WITH LINKED CONTACTS · ADD SUBS/DRIVERS TO THIS ORDER FIRST</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {assignmentsToNotify.map((a) => {
                      const contact = contacts.find((c) => c.id === a.contactId);
                      const text = buildDispatchText(dispatch, a);
                      const phone = contact?.phone || "";
                      const email = contact?.email || "";
                      const cleanPhone = phone.replace(/[^0-9+]/g, "");
                      const smsHref = cleanPhone ? `sms:${cleanPhone}?&body=${encodeURIComponent(text)}` : null;
                      const subject = `Dispatch — Order #${dispatch.code} · ${dispatch.date || ""}`;
                      const mailHref = email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` : null;

                      return (
                        <div key={a.aid} style={{ border: "1.5px solid var(--steel)", background: "#FFF", padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                            <div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                <span className="chip" style={{ background: a.kind === "driver" ? "#FFF" : "var(--hazard)", fontSize: 9, padding: "2px 7px" }}>
                                  {a.kind === "driver" ? "DRIVER" : "SUB"}
                                </span>
                                <div className="fbt-display" style={{ fontSize: 14 }}>{a.name}</div>
                              </div>
                              {(phone || email) && (
                                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 3 }}>
                                  {phone && `☎ ${phone}`}
                                  {phone && email && " · "}
                                  {email && `✉ ${email}`}
                                </div>
                              )}
                              {a.kind === "sub" && a.payRate && (
                                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", marginTop: 2 }}>
                                  Rate in text: ${a.payRate}/{a.payMethod || "hour"}
                                </div>
                              )}
                              {a.kind === "driver" && (
                                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                                  (rate NOT sent to drivers)
                                </div>
                              )}
                            </div>
                          </div>

                          {!phone && !email ? (
                            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--safety)", padding: 8, background: "#FEF2F2", border: "1px solid var(--safety)" }}>
                              ⚠ NO PHONE OR EMAIL ON FILE · ADD CONTACT INFO TO SEND
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {smsHref && (
                                <a
                                  href={smsHref}
                                  className="btn-primary"
                                  style={{ padding: "8px 14px", fontSize: 11, background: "var(--hazard)", color: "var(--steel)", borderColor: "var(--hazard-deep)", textDecoration: "none" }}
                                >
                                  <Send size={12} style={{ marginRight: 4 }} /> TEXT
                                </a>
                              )}
                              {mailHref && (
                                <a
                                  href={mailHref}
                                  className="btn-ghost"
                                  style={{ padding: "8px 14px", fontSize: 11, textDecoration: "none" }}
                                >
                                  <Mail size={12} style={{ marginRight: 4 }} /> EMAIL
                                </a>
                              )}
                              <button
                                className="btn-ghost"
                                style={{ padding: "8px 14px", fontSize: 11 }}
                                onClick={() => copyDispatchText(dispatch, a)}
                                title="Copy the dispatch text to paste anywhere"
                              >
                                <FileText size={12} style={{ marginRight: 4 }} /> COPY
                              </button>
                              {/* v23 Session W: Dedicated Upload Link button — sends just the /submit URL */}
                              {cleanPhone && (() => {
                                const origin = `${window.location.origin}${window.location.pathname}`;
                                const uploadUrl = `${origin}#/submit/${dispatch.code}/a/${a.aid}`;
                                const uploadMsg = `${company?.name || "4 Brothers Trucking"} — Order #${dispatch.code}\n\nWhen your loads are done, upload your freight bill here:\n\n${uploadUrl}\n\nThanks!`;
                                const uploadSmsHref = `sms:${cleanPhone}?&body=${encodeURIComponent(uploadMsg)}`;
                                return (
                                  <a
                                    href={uploadSmsHref}
                                    style={{ padding: "8px 14px", fontSize: 11, background: "var(--good)", color: "#FFF", textDecoration: "none", fontFamily: "Oswald, sans-serif", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4, border: "2px solid var(--good)" }}
                                    title="Send just the FB upload link — shorter message"
                                  >
                                    <Upload size={12} /> UPLOAD LINK
                                  </a>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", alignSelf: "center" }}>
                    ▸ CLOSE WHEN FINISHED · YOU CAN RE-SEND ANYTIME FROM THE ORDER DETAIL
                  </div>
                  <button onClick={() => setSendLinksTarget(null)} className="btn-ghost">DONE</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Override lock modal */}
      {overrideTarget && (
        <div className="modal-bg" onClick={() => setOverrideTarget(null)} style={{ zIndex: 110 }}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ padding: "16px 22px", background: "var(--safety)", color: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em" }}>OVERRIDE LOCK</div>
                <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>{overrideTarget.label}</h3>
              </div>
              <button onClick={() => setOverrideTarget(null)} style={{ background: "transparent", border: "none", color: "#FFF", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 22 }}>
              <p style={{ fontSize: 13, lineHeight: 1.5, margin: "0 0 14px" }}>
                ⚠ This field is locked because <strong>{editingLock.reason}</strong>.
                Editing it may have downstream consequences (invoices, payroll).
              </p>
              <label className="fbt-label">Reason for Override *</label>
              <textarea
                id="override-reason-input"
                className="fbt-textarea"
                style={{ minHeight: 70 }}
                placeholder="e.g. Customer changed terms mid-job — rate adjusted per email 4/22"
                autoFocus
              />
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  className="btn-primary"
                  style={{ background: "var(--safety)", color: "#FFF", borderColor: "var(--safety)" }}
                  onClick={() => {
                    const val = document.getElementById("override-reason-input")?.value?.trim() || "";
                    if (!val) { onToast("REASON REQUIRED"); return; }
                    const entry = {
                      field: overrideTarget.field,
                      reason: val,
                      by: "admin",
                      at: new Date().toISOString(),
                    };
                    setOverriddenFields({ ...overriddenFields, [overrideTarget.field]: val });
                    setDraft((prev) => ({
                      ...prev,
                      lockOverrides: [...(prev.lockOverrides || []), entry],
                    }));
                    onToast(`🔓 ${overrideTarget.label} UNLOCKED`);
                    setOverrideTarget(null);
                  }}
                >
                  🔓 UNLOCK THIS FIELD
                </button>
                <button className="btn-ghost" onClick={() => setOverrideTarget(null)}>CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="modal-bg" onClick={closeOrderModal}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>{editingId ? "EDIT ORDER" : "NEW ORDER"}</h3>
              <button onClick={closeOrderModal} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
            </div>

            {/* Lock banner (only shown when editing a locked order) */}
            {editingId && editingLock.level > 0 && (() => {
              const lockedFieldList = [];
              if (editingLock.level >= 1) lockedFieldList.push("assignments (sub/driver/rate)");
              if (editingLock.level >= 2) lockedFieldList.push("material", "rate", "job");
              if (editingLock.level >= 3) lockedFieldList.push("ALL FIELDS");
              const bg = editingLock.level === 3 ? "var(--safety)" : editingLock.level === 2 ? "var(--hazard)" : "var(--concrete)";
              return (
                <div style={{ padding: "12px 24px", background: "#FEF2F2", borderBottom: "3px solid " + bg }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Lock size={16} style={{ color: bg }} />
                    <span className="fbt-mono" style={{ fontSize: 11, fontWeight: 700 }}>
                      {editingLock.level === 1 && "ORDER DISPATCHED"}
                      {editingLock.level === 2 && "FBs APPROVED ON THIS ORDER"}
                      {editingLock.level === 3 && (editingLock.hasInvoicedFbs ? "FBs INVOICED" : "ORDER COMPLETE")}
                      {" — LOCKED FIELDS: "}{lockedFieldList.join(", ").toUpperCase()}
                    </span>
                  </div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 6 }}>
                    ▸ CLICK 🔓 UNLOCK NEXT TO ANY LOCKED FIELD TO OVERRIDE WITH A REASON (AUDIT STAMPED)
                  </div>
                </div>
              );
            })()}
            <div style={{ padding: 24, display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
                <div><label className="fbt-label">Date</label><input className="fbt-input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>
                <div><label className="fbt-label">Trucks Expected</label><input className="fbt-input" type="number" min="1" value={draft.trucksExpected} onChange={(e) => setDraft({ ...draft, trucksExpected: e.target.value })} /></div>
                <div>
                  <label className="fbt-label">Expected Tons/Truck</label>
                  <input
                    className="fbt-input"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 24"
                    value={draft.expectedTonnagePerTruck ?? ""}
                    onChange={(e) => setDraft({ ...draft, expectedTonnagePerTruck: e.target.value })}
                    title="Expected tonnage per truck/load. Used to flag overage on FB review (>20% over expected)."
                  />
                </div>
                <div>
                  <label className="fbt-label">Shift</label>
                  <select className="fbt-select" value={draft.shift || "day"} onChange={(e) => setDraft({ ...draft, shift: e.target.value })}>
                    <option value="day">Day</option>
                    <option value="night">Night</option>
                  </select>
                </div>
                <div>
                  <label className="fbt-label">Base Start Time</label>
                  <input className="fbt-input" type="time" value={draft.baseStartTime || ""} onChange={(e) => setDraft({ ...draft, baseStartTime: e.target.value })} />
                </div>
                <div>
                  <label className="fbt-label">Stagger (min)</label>
                  <input className="fbt-input" type="number" min="0" value={draft.staggerMin ?? 5} onChange={(e) => setDraft({ ...draft, staggerMin: e.target.value === "" ? "" : Number(e.target.value) })} title="Minutes between each truck's start time when 'Apply stagger' is clicked" />
                </div>
              </div>
              <div><label className="fbt-label">Job Name *<LockChip field="job" label="Job Name" locks={locks} /></label><input className="fbt-input" value={draft.jobName} onChange={(e) => setDraft({ ...draft, jobName: e.target.value })} placeholder="MCI #91684 — Salinas Stormwater Phase 2A" disabled={isFieldLocked("job")} /></div>
              <div>
                <label className="fbt-label">Customer (for tracking link & billing)</label>
                {contacts.filter((c) => c.type === "customer").length > 0 ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      className="fbt-select"
                      style={{ flex: 1, minWidth: 180 }}
                      value={draft.clientId || ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) { setDraft({ ...draft, clientId: "", clientName: "" }); return; }
                        const c = contacts.find((x) => String(x.id) === id);
                        if (c) setDraft({ ...draft, clientId: c.id, clientName: c.companyName || c.contactName });
                      }}
                    >
                      <option value="">— Choose customer —</option>
                      {contacts
                        .filter((c) => c.type === "customer")
                        .sort((a, b) => (a.favorite !== b.favorite ? (a.favorite ? -1 : 1) : 0))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.favorite ? "★ " : ""}{c.companyName || c.contactName}
                          </option>
                        ))}
                    </select>
                    <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>OR</span>
                    <input
                      className="fbt-input"
                      style={{ flex: 1, minWidth: 120 }}
                      value={draft.clientId ? "" : (draft.clientName || "")}
                      onChange={(e) => setDraft({ ...draft, clientName: e.target.value, clientId: "" })}
                      placeholder="Type new name"
                      disabled={!!draft.clientId}
                    />
                  </div>
                ) : (
                  <input className="fbt-input" value={draft.clientName || ""} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} placeholder="e.g. Mountain Cascade, Inc. — add as Customer in Contacts for dropdown" />
                )}
              </div>

              {/* Project dropdown — filtered by selected customer */}
              {(() => {
                const availableProjects = projects.filter((p) => {
                  if (p.status === "cancelled") return false;
                  if (draft.clientId) return p.customerId === Number(draft.clientId) || p.customerId === draft.clientId;
                  return true;
                });
                return (
                  <div>
                    <label className="fbt-label">
                      Project {draft.clientId && ` · ${availableProjects.length} for this customer`}
                    </label>
                    {availableProjects.length > 0 ? (
                      <select
                        className="fbt-select"
                        value={draft.projectId || ""}
                        onChange={(e) => {
                          const pid = e.target.value ? Number(e.target.value) : null;
                          const p = availableProjects.find((x) => x.id === pid);
                          const patch = { projectId: pid };
                          // Inherit project's default rate if order rate is still the default "142"
                          if (p?.defaultRate != null && p.defaultRate !== "" && (draft.ratePerHour === "142" || !draft.ratePerHour)) {
                            patch.ratePerHour = String(p.defaultRate);
                          }
                          setDraft({ ...draft, ...patch });
                        }}
                      >
                        <option value="">— No project / One-off job —</option>
                        {availableProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.contractNumber ? ` (${p.contractNumber})` : ""}{p.defaultRate ? ` · $${p.defaultRate}/hr` : ""}{p.minimumHours ? ` · ${p.minimumHours}hr min` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", padding: "8px 10px", border: "1px dashed var(--concrete)", background: "#F5F5F4" }}>
                        {draft.clientId ? "NO PROJECTS FOR THIS CUSTOMER YET — ADD ONE IN PROJECTS TAB" : "NO PROJECTS YET"}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* SUB-CONTRACTORS & DRIVERS (unified) */}
              <div style={{ borderTop: "2px dashed var(--concrete)", paddingTop: 14, position: "relative" }}>
                <label className="fbt-label">
                  Sub-Contractors & Drivers{draft.assignments?.length > 0 && ` · ${draft.assignments.length} ROW${draft.assignments.length !== 1 ? "S" : ""}`}
                  <LockChip field="assignments" label="Assignments" locks={locks} />
                </label>
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8 }}>
                  ▸ ADD EACH SUB AND/OR DRIVER WORKING THIS ORDER · DRIVER = 1 TRUCK · SUB = TRUCK COUNT YOU ENTER · DRIVER PAY RATE + TRUCK # AUTO-FILL FROM CONTACT
                </div>
                {/* Dimmed overlay if locked */}
                {isFieldLocked("assignments") && (
                  <div style={{
                    position: "absolute", top: 28, left: 0, right: 0, bottom: 0,
                    background: "rgba(245, 245, 244, 0.75)", pointerEvents: "auto",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 10, cursor: "not-allowed",
                  }}
                  onClick={() => openOverride("assignments", "Assignments")}
                  >
                    <div style={{ padding: 14, background: "#FFF", border: "2px solid var(--safety)", fontFamily: "JetBrains Mono, monospace", fontSize: 12, textAlign: "center" }}>
                      <Lock size={20} style={{ color: "var(--safety)", marginBottom: 6 }} />
                      <div style={{ fontWeight: 700, color: "var(--safety)" }}>ASSIGNMENTS LOCKED</div>
                      <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>CLICK TO OVERRIDE WITH REASON</div>
                    </div>
                  </div>
                )}
                {(draft.assignments || []).length > 0 && (
                  <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
                    {draft.assignments.map((a, idx) => {
                      const isDriver = a.kind === "driver";
                      const contactsOfKind = contacts.filter((c) => c.type === (isDriver ? "driver" : "sub"));
                      const selectedContact = a.contactId ? contacts.find((c) => c.id === a.contactId) : null;
                      const hasBrokerage = selectedContact?.brokerageApplies;
                      const brokeragePct = selectedContact?.brokeragePercent ?? 8;
                      return (
                        <div key={idx} style={{ padding: 10, border: "1.5px solid var(--steel)", background: "#FFF" }}>
                          {/* Row 1: kind / contact / trucks / delete */}
                          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px auto", gap: 8, alignItems: "center", marginBottom: 8 }}>
                            <select
                              className="fbt-select"
                              style={{ padding: "6px 8px", fontSize: 11 }}
                              value={a.kind}
                              onChange={(e) => {
                                const next = [...draft.assignments];
                                next[idx] = { ...next[idx], kind: e.target.value, contactId: null, name: "", trucks: e.target.value === "driver" ? 1 : next[idx].trucks || 1 };
                                setDraft({ ...draft, assignments: next });
                              }}
                            >
                              <option value="sub">Sub</option>
                              <option value="driver">Driver</option>
                            </select>
                            <select
                              className="fbt-select"
                              style={{ padding: "6px 8px", fontSize: 12 }}
                              value={a.contactId || ""}
                              onChange={(e) => {
                                const id = e.target.value;
                                // v18: "+ NEW" sentinel opens the quick-add modal
                                if (id === "__NEW__") {
                                  setQuickAddContact({ idx, kind: a.kind });
                                  return;
                                }
                                const c = contactsOfKind.find((x) => String(x.id) === id);
                                const next = [...draft.assignments];
                                // Look up fleet unit assigned to this driver (sync'd from Fleet tab)
                                const fleetUnit = isDriver && c ? fleet.find((f) => f.driverId === c.id) : null;
                                const resolvedTruck = fleetUnit?.unit || c?.defaultTruckNumber || "";
                                // Auto-fill pay rate/method from contact default (both drivers AND subs)
                                // Only fill if the assignment field is empty
                                const autoFill = c ? {
                                  payRate: (next[idx].payRate === "" || next[idx].payRate == null) && c.defaultPayRate != null
                                    ? String(c.defaultPayRate) : next[idx].payRate,
                                  payMethod: (!next[idx].payMethod || next[idx].payMethod === "hour") && c.defaultPayMethod
                                    ? c.defaultPayMethod : (next[idx].payMethod || "hour"),
                                  truckNumber: isDriver && (!next[idx].truckNumber) && resolvedTruck
                                    ? resolvedTruck : next[idx].truckNumber,
                                } : {};
                                next[idx] = {
                                  ...next[idx],
                                  contactId: c?.id || null,
                                  name: c ? (c.companyName || c.contactName) : "",
                                  ...autoFill,
                                };
                                setDraft({ ...draft, assignments: next });
                              }}
                            >
                              <option value="">— Choose {isDriver ? "driver" : "sub"} —</option>
                              {contactsOfKind.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.favorite ? "★ " : ""}{c.companyName || c.contactName}{c.brokerageApplies ? ` (${c.brokeragePercent ?? 8}% brok)` : ""}
                                </option>
                              ))}
                              {/* v18: Quick-add shortcut — no need to leave the dispatch flow */}
                              <option value="__NEW__" style={{ fontWeight: 700, color: "var(--hazard-deep)" }}>
                                ➕ ADD NEW {isDriver ? "DRIVER" : "SUB"}...
                              </option>
                            </select>
                            <input
                              className="fbt-input"
                              style={{ padding: "6px 8px", fontSize: 12 }}
                              type="number" min="1"
                              disabled={isDriver}
                              value={a.trucks || 1}
                              onChange={(e) => {
                                const next = [...draft.assignments];
                                next[idx] = { ...next[idx], trucks: Number(e.target.value) || 1 };
                                setDraft({ ...draft, assignments: next });
                              }}
                              title={isDriver ? "Drivers always = 1 truck" : "Truck count for this sub"}
                            />
                            <button
                              onClick={() => setDraft({ ...draft, assignments: draft.assignments.filter((_, i) => i !== idx) })}
                              className="btn-danger"
                              style={{ padding: "6px 10px", fontSize: 11 }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Row 2: pay method + pay rate + brokerage indicator */}
                          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center" }}>
                            <select
                              className="fbt-select"
                              style={{ padding: "5px 8px", fontSize: 11 }}
                              value={a.payMethod || "hour"}
                              onChange={(e) => {
                                const next = [...draft.assignments];
                                next[idx] = { ...next[idx], payMethod: e.target.value };
                                setDraft({ ...draft, assignments: next });
                              }}
                              title="How you pay this sub/driver"
                            >
                              <option value="hour">PAY $/hr</option>
                              <option value="ton">PAY $/ton</option>
                              <option value="load">PAY $/load</option>
                            </select>
                            <input
                              className="fbt-input"
                              type="number"
                              step="0.01"
                              placeholder="Pay rate (e.g. 135)"
                              style={{ padding: "5px 8px", fontSize: 12 }}
                              value={a.payRate || ""}
                              onChange={(e) => {
                                const next = [...draft.assignments];
                                next[idx] = { ...next[idx], payRate: e.target.value };
                                setDraft({ ...draft, assignments: next });
                              }}
                            />
                            {hasBrokerage ? (
                              <span
                                className="chip"
                                style={{ background: "var(--hazard)", fontSize: 9, padding: "3px 8px", whiteSpace: "nowrap" }}
                                title="Brokerage will be deducted when paying"
                              >
                                − {brokeragePct}% BROK
                              </span>
                            ) : (
                              <span
                                className="fbt-mono"
                                style={{ fontSize: 9, color: "var(--concrete)", whiteSpace: "nowrap" }}
                              >
                                {selectedContact ? "NO BROK" : ""}
                              </span>
                            )}
                          </div>

                          {/* Row 2.5: Send-rates toggle (controls whether the dispatch SMS/email shows pay rate + min hours to this driver/sub) */}
                          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                              type="checkbox"
                              id={`send-rates-${idx}`}
                              checked={a.sendRates !== false}
                              onChange={(e) => {
                                const next = [...draft.assignments];
                                next[idx] = { ...next[idx], sendRates: e.target.checked };
                                setDraft({ ...draft, assignments: next });
                              }}
                              style={{ cursor: "pointer" }}
                            />
                            <label htmlFor={`send-rates-${idx}`} className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.05em", cursor: "pointer", userSelect: "none" }}>
                              ▸ INCLUDE PAY RATE + MIN HOURS IN {a.kind === "driver" ? "DRIVER" : "SUB"} SMS/EMAIL
                            </label>
                          </div>

                          {/* Row 3: Per-truck start times + locations */}
                          {(() => {
                            const truckCount = Math.max(1, Number(a.trucks) || 1);
                            const startTimes = Array.isArray(a.startTimes) ? a.startTimes : [];
                            // Ensure array matches trucks count (add blanks if more trucks)
                            const displayRows = Array.from({ length: truckCount }, (_, i) => startTimes[i] || { time: "", location: "" });
                            return (
                              <div style={{ marginTop: 8, padding: 8, background: "#FAFAF9", border: "1px dashed var(--concrete)" }}>
                                <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>
                                  ▸ START TIMES · {truckCount} TRUCK{truckCount !== 1 ? "S" : ""} (INCLUDED IN DISPATCH TEXT)
                                </div>
                                <div style={{ display: "grid", gap: 4 }}>
                                  {displayRows.map((row, tIdx) => (
                                    <div key={tIdx} style={{ display: "grid", gridTemplateColumns: "50px 100px 1fr", gap: 6, alignItems: "center" }}>
                                      <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
                                        TRUCK {tIdx + 1}
                                      </span>
                                      <input
                                        className="fbt-input"
                                        type="time"
                                        style={{ padding: "4px 6px", fontSize: 11 }}
                                        value={row.time || ""}
                                        onChange={(e) => {
                                          const next = [...draft.assignments];
                                          const newTimes = Array.from({ length: truckCount }, (_, i) => startTimes[i] || { time: "", location: "" });
                                          newTimes[tIdx] = { ...newTimes[tIdx], time: e.target.value };
                                          next[idx] = { ...next[idx], startTimes: newTimes };
                                          setDraft({ ...draft, assignments: next });
                                        }}
                                      />
                                      <input
                                        className="fbt-input"
                                        type="text"
                                        placeholder="Location / note (e.g. at Vulcan Napa)"
                                        style={{ padding: "4px 8px", fontSize: 11 }}
                                        value={row.location || ""}
                                        onChange={(e) => {
                                          const next = [...draft.assignments];
                                          const newTimes = Array.from({ length: truckCount }, (_, i) => startTimes[i] || { time: "", location: "" });
                                          newTimes[tIdx] = { ...newTimes[tIdx], location: e.target.value };
                                          next[idx] = { ...next[idx], startTimes: newTimes };
                                          setDraft({ ...draft, assignments: next });
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setDraft({ ...draft, assignments: [...(draft.assignments || []), { kind: "sub", contactId: null, name: "", trucks: 1, payMethod: "hour", payRate: "", sendRates: true }] })}
                  style={{ padding: "6px 12px", fontSize: 11 }}
                >
                  <Plus size={12} style={{ marginRight: 4 }} /> ADD SUB / DRIVER
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={!draft.baseStartTime || !(draft.assignments || []).length}
                  title={!draft.baseStartTime ? "Set a Base Start Time at the top first" : `Distribute start times across all truck slots ${draft.staggerMin || 5} min apart`}
                  onClick={() => {
                    const base = draft.baseStartTime;
                    if (!base) return;
                    const stepMin = Number(draft.staggerMin) || 5;
                    const [h0, m0] = base.split(":").map(Number);
                    if (Number.isNaN(h0) || Number.isNaN(m0)) return;
                    let slotIdx = 0;
                    const next = (draft.assignments || []).map((a) => {
                      const truckCount = Math.max(1, Number(a.trucks) || 1);
                      const existing = Array.isArray(a.startTimes) ? a.startTimes : [];
                      const newTimes = Array.from({ length: truckCount }, (_, i) => {
                        const totalMins = h0 * 60 + m0 + slotIdx * stepMin;
                        slotIdx += 1;
                        const hh = String(Math.floor(totalMins / 60) % 24).padStart(2, "0");
                        const mm = String(totalMins % 60).padStart(2, "0");
                        return { time: `${hh}:${mm}`, location: existing[i]?.location || "" };
                      });
                      return { ...a, startTimes: newTimes };
                    });
                    setDraft({ ...draft, assignments: next });
                    onToast("STAGGER APPLIED");
                  }}
                  style={{ padding: "6px 12px", fontSize: 11, marginLeft: 8 }}
                >
                  ▶ APPLY STAGGER
                </button>

                {/* Total trucks calculation */}
                {(draft.assignments || []).length > 0 && (
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", marginTop: 8, fontWeight: 700 }}>
                    ▸ TOTAL EXPECTED TRUCKS/FBs FROM ASSIGNMENTS: {draft.assignments.reduce((s, a) => s + (Number(a.trucks) || 0), 0)}
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                <div><label className="fbt-label">Pickup</label><input className="fbt-input" value={draft.pickup} onChange={(e) => setDraft({ ...draft, pickup: e.target.value })} /></div>
                <div><label className="fbt-label">Dropoff</label><input className="fbt-input" value={draft.dropoff} onChange={(e) => setDraft({ ...draft, dropoff: e.target.value })} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
                <div>
                  <label className="fbt-label">Material<LockChip field="material" label="Material" locks={locks} /></label>
                  <input className="fbt-input" value={draft.material} onChange={(e) => setDraft({ ...draft, material: e.target.value })} disabled={isFieldLocked("material")} />
                </div>
              </div>

              {/* CUSTOMER BILL RATE — what we charge the customer. Sub/driver pay rate is set per-assignment below. */}
              <div style={{ padding: 10, background: "#F0F9FF", border: "2px solid #0EA5E9", marginTop: 4 }}>
                <div className="fbt-mono" style={{ fontSize: 10, color: "#0369A1", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>
                  ▸ CUSTOMER BILL RATE · FILL AT LEAST ONE {draft.projectId ? "(AUTO-FILLED FROM PROJECT DEFAULT WHERE APPLICABLE)" : ""}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  <div>
                    <label className="fbt-label">Bill $/hr<LockChip field="rate" label="Hourly Bill Rate" locks={locks} /></label>
                    <input className="fbt-input" type="number" step="0.01" value={draft.ratePerHour} onChange={(e) => setDraft({ ...draft, ratePerHour: e.target.value })} disabled={isFieldLocked("rate")} placeholder="e.g. 142.00" />
                  </div>
                  <div>
                    <label className="fbt-label">Bill $/ton<LockChip field="rate" label="Per-Ton Bill Rate" locks={locks} /></label>
                    <input className="fbt-input" type="number" step="0.01" value={draft.ratePerTon} onChange={(e) => setDraft({ ...draft, ratePerTon: e.target.value })} disabled={isFieldLocked("rate")} placeholder="e.g. 14.50" />
                  </div>
                  <div>
                    <label className="fbt-label">Bill $/load<LockChip field="rate" label="Per-Load Bill Rate" locks={locks} /></label>
                    <input className="fbt-input" type="number" step="0.01" value={draft.ratePerLoad} onChange={(e) => setDraft({ ...draft, ratePerLoad: e.target.value })} disabled={isFieldLocked("rate")} placeholder="e.g. 450.00" />
                  </div>
                </div>
                <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginTop: 6, letterSpacing: "0.05em" }}>
                  ▸ SUB/DRIVER PAY RATE IS SET PER-ASSIGNMENT BELOW (SEPARATE FROM WHAT WE BILL CUSTOMER)
                </div>
              </div>
              {quarries.length > 0 && (
                <div>
                  <label className="fbt-label">Sourced From (Quarry)</label>
                  <select
                    className="fbt-select"
                    value={draft.quarryId || ""}
                    onChange={(e) => setDraft({ ...draft, quarryId: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">— Not specified —</option>
                    {quarries.map((q) => (
                      <option key={q.id} value={q.id}>{q.name}{q.address ? ` · ${q.address}` : ""}</option>
                    ))}
                  </select>
                </div>
              )}
              <div><label className="fbt-label">Notes</label><textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button onClick={createDispatch} className="btn-primary"><CheckCircle2 size={16} /> {editingId ? "SAVE CHANGES" : "CREATE & GET LINK"}</button>
                <button onClick={closeOrderModal} className="btn-ghost">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text queue modal */}
      {textQueue && (
        <div className="modal-bg" onClick={() => setTextQueue(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)" }}>TEXT QUEUE</div>
                <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>SEND {textQueue.list.length} TEXT{textQueue.list.length !== 1 ? "S" : ""}</h3>
              </div>
              <button onClick={() => setTextQueue(null)} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 12, lineHeight: 1.5 }}>
                ▸ TAP EACH BUTTON BELOW TO OPEN THAT TEXT. YOUR PHONE WILL PRE-FILL THE MESSAGE — JUST HIT SEND AND COME BACK HERE.
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {textQueue.list.map((item, idx) => {
                  const isSent = textQueue.sent[idx];
                  return (
                    <a
                      key={idx}
                      href={item.smsLink}
                      onClick={() => {
                        setTextQueue((q) => {
                          if (!q) return q;
                          const newSent = [...q.sent];
                          newSent[idx] = true;
                          return { ...q, sent: newSent };
                        });
                      }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 14px",
                        background: isSent ? "#F0FDF4" : "var(--cream)",
                        border: "2px solid " + (isSent ? "var(--good)" : "var(--steel)"),
                        textDecoration: "none",
                        color: "var(--steel)",
                        fontSize: 13,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>
                          {isSent && <CheckCircle2 size={13} style={{ color: "var(--good)", marginRight: 6, verticalAlign: "middle" }} />}
                          {item.name}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>{item.phone}</div>
                      </div>
                      <div style={{ background: isSent ? "var(--good)" : "var(--hazard)", color: isSent ? "#FFF" : "var(--steel)", padding: "6px 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>
                        {isSent ? "SENT ✓" : <><MessageSquare size={11} style={{ marginRight: 4, verticalAlign: "middle" }} /> TAP TO SEND</>}
                      </div>
                    </a>
                  );
                })}
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "space-between" }}>
                <button
                  onClick={() => setTextQueue((q) => q ? { ...q, sent: q.sent.map(() => false) } : q)}
                  className="btn-ghost"
                  style={{ fontSize: 10, padding: "6px 12px" }}
                >
                  <RefreshCw size={11} style={{ marginRight: 3 }} /> RESET
                </button>
                <button onClick={() => setTextQueue(null)} className="btn-primary" style={{ fontSize: 11 }}>
                  DONE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeDispatch && (() => {
        const d = dispatches.find((x) => x.id === activeDispatch);
        if (!d) return null;
        const bills = fbForDispatch(d.id);
        const shareUrl = `${window.location.origin}${window.location.pathname}#/submit/${d.code}`;
        return (
          <div className="modal-bg" onClick={() => setActiveDispatch(null)}>
            <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
              <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.1em" }}>ORDER #{d.code}</div>
                  <h3 className="fbt-display" style={{ fontSize: 22, margin: "4px 0 0" }}>{d.jobName}</h3>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {/* v18 Batch 2 Session D: Photos button — opens gallery filtered to this dispatch */}
                  {(() => {
                    const fbsWithPhotos = freightBills.filter((fb) => fb.dispatchId === d.id && fb.photos?.length > 0);
                    const photoCount = fbsWithPhotos.reduce((s, fb) => s + fb.photos.length, 0);
                    if (photoCount === 0) return null;
                    return (
                      <button
                        onClick={() => setDispatchPhotoGallery(d.id)}
                        className="btn-ghost"
                        style={{ padding: "6px 12px", fontSize: 11, color: "var(--cream)", borderColor: "var(--cream)" }}
                        title="View all photos on this order's FBs"
                      >
                        <Camera size={12} style={{ marginRight: 4 }} /> PHOTOS · {photoCount}
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => { setActiveDispatch(null); openEditDispatch(d); }}
                    className="btn-ghost"
                    style={{ padding: "6px 12px", fontSize: 11, color: "var(--cream)", borderColor: "var(--cream)" }}
                  >
                    <Edit2 size={12} style={{ marginRight: 4 }} /> EDIT ORDER
                  </button>
                  <button onClick={() => setActiveDispatch(null)} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
                </div>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ background: "#FEF3C7", border: "2px solid var(--hazard)", padding: 16, marginBottom: 20 }}>
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ MASTER LINK (ANYONE CAN UPLOAD)</div>
                  <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <QRCodeBlock url={shareUrl} size={150} label={`order-${d.code}`} onToast={onToast} />
                    <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 4 }}>▸ LINK</div>
                        <code style={{ display: "block", padding: "8px 12px", background: "#FFF", border: "1px solid var(--steel)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all" }}>{shareUrl}</code>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn-primary" onClick={() => copyLink(d.code)} style={{ padding: "8px 16px", fontSize: 11 }}><Share2 size={12} /> COPY LINK</button>
                        <button
                          className="btn-primary"
                          onClick={() => copyDispatchText(d)}
                          style={{ padding: "8px 16px", fontSize: 11, background: "var(--good)", borderColor: "var(--good)", color: "#FFF" }}
                          title="Copy full dispatch text with job details"
                        >
                          <Mail size={12} /> COPY TEXT
                        </button>
                        <button className="btn-ghost" onClick={() => printDriverSheet(d, shareUrl, onToast)} style={{ padding: "8px 16px", fontSize: 11 }}><Printer size={12} style={{ marginRight: 4 }} /> PRINT SHEET</button>
                      </div>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", lineHeight: 1.5, marginTop: 4 }}>
                        ▸ MASTER LINK — SHARE WITH THE FIELD, OR USE PER-ASSIGNMENT SUBLINKS BELOW FOR INDIVIDUAL TRACKING.
                      </div>
                    </div>
                  </div>
                </div>

                {/* PER-ASSIGNMENT SUBLINKS */}
                {(d.assignments || []).length > 0 && (() => {
                  const origin = `${window.location.origin}${window.location.pathname}`;
                  // Build all assignment sublink details
                  const assignmentRows = (d.assignments || []).map((a) => {
                    const aFbs = bills.filter((fb) => fb.assignmentId === a.aid);
                    const expected = Number(a.trucks) || 1;
                    const submitted = aFbs.length;
                    const subUrl = `${origin}#/submit/${d.code}/a/${a.aid}`;
                    const contact = contacts.find((c) => c.id === a.contactId);
                    const statusKey = submitted === 0 ? "pending" : submitted >= expected ? "complete" : "in_progress";
                    const statusLabel = submitted === 0 ? "PENDING" : submitted >= expected ? "COMPLETE" : "IN PROGRESS";
                    const statusBg = { pending: "var(--concrete)", in_progress: "var(--hazard)", complete: "var(--good)" }[statusKey];
                    // Use buildDispatchText so the per-truck staggered start
                    // times and the sendRates-gated rate block both flow into
                    // the SMS/email body, not just the bare upload-link.
                    const msg = buildDispatchText(d, a);
                    const subject = `Order #${d.code} — ${d.jobName}`;
                    const smsLink = contact?.phone ? buildSMSLink(contact.phone, msg) : null;
                    const emailLink = contact?.email ? buildEmailLink(contact.email, subject, msg) : null;
                    return { a, contact, subUrl, expected, submitted, statusLabel, statusBg, smsLink, emailLink, msg };
                  });

                  return (
                    <div style={{ background: "#FFF", border: "2px solid var(--steel)", padding: 16, marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em" }}>
                          ▸ PER-ASSIGNMENT LINKS ({assignmentRows.length})
                        </div>
                        {/* Send to All button */}
                        <button
                          className="btn-ghost"
                          style={{ padding: "6px 12px", fontSize: 10 }}
                          onClick={() => {
                            const textable = assignmentRows.filter((r) => r.smsLink).map((r) => ({
                              name: r.a.name,
                              smsLink: r.smsLink,
                              phone: r.contact?.phone || "",
                            }));
                            if (textable.length === 0) { onToast("NO CONTACTS HAVE PHONE NUMBERS"); return; }
                            setTextQueue({ list: textable, sent: textable.map(() => false) });
                          }}
                          title="Open a queue to text each sublink one tap at a time"
                        >
                          <MessageSquare size={12} style={{ marginRight: 4 }} /> TEXT ALL
                        </button>
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        {assignmentRows.map(({ a, contact, subUrl, expected, submitted, statusLabel, statusBg, smsLink, emailLink }) => (
                          <div key={a.aid} style={{ padding: 12, border: "1.5px solid var(--steel)", background: "var(--cream)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                                  <span className="chip" style={{ background: a.kind === "driver" ? "#FFF" : "var(--hazard)", fontSize: 9, padding: "2px 8px" }}>
                                    {a.kind === "driver" ? "DRIVER" : "SUB"}
                                  </span>
                                  <span className="chip" style={{ background: statusBg, color: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                                    {statusLabel} · {submitted}/{expected}
                                  </span>
                                </div>
                                <div className="fbt-display" style={{ fontSize: 15, lineHeight: 1.15 }}>{a.name}</div>
                                {contact && (
                                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                                    {contact.phone && `☎ ${contact.phone}`}
                                    {contact.phone && contact.email && " · "}
                                    {contact.email && `✉ ${contact.email}`}
                                  </div>
                                )}
                                {/* Start times summary */}
                                {a.startTimes?.length > 0 && a.startTimes.some((r) => r && (r.time || r.location)) && (
                                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard-deep)", marginTop: 4, fontWeight: 700 }}>
                                    ▸ START: {a.startTimes
                                      .filter((r) => r && (r.time || r.location))
                                      .map((r) => {
                                        const t = r.time ? formatTime12h(r.time) : "TBD";
                                        const loc = r.location ? ` @ ${r.location}` : "";
                                        return `${t}${loc}`;
                                      })
                                      .join(" · ")}
                                  </div>
                                )}
                              </div>
                            </div>
                            <code style={{ display: "block", padding: "6px 10px", background: "#FFF", border: "1px solid var(--steel)", fontSize: 10, fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all", marginBottom: 8 }}>
                              {subUrl}
                            </code>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button
                                className="btn-ghost"
                                style={{ padding: "5px 10px", fontSize: 10 }}
                                onClick={async () => {
                                  try { await navigator.clipboard.writeText(subUrl); onToast("SUBLINK COPIED"); }
                                  catch { onToast("COPY FAILED"); }
                                }}
                              >
                                <Link2 size={11} style={{ marginRight: 3 }} /> COPY
                              </button>
                              <button
                                className="btn-ghost"
                                style={{ padding: "5px 10px", fontSize: 10, background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}
                                onClick={() => copyDispatchText(d, a)}
                                title="Copy the full dispatch text (customer, pickup, dropoff, material, rate) ready to paste into SMS/email"
                              >
                                <FileText size={11} style={{ marginRight: 3 }} /> COPY TEXT
                              </button>
                              {contact?.phone && (
                                <button
                                  className="btn-ghost"
                                  style={{ padding: "5px 10px", fontSize: 10, background: "var(--hazard)", color: "var(--steel)", borderColor: "var(--hazard-deep)" }}
                                  onClick={() => smsDispatch(d, a, contact.phone)}
                                  title="Open phone's messaging app pre-filled with dispatch details"
                                >
                                  <Send size={11} style={{ marginRight: 3 }} /> SMS w/ DETAILS
                                </button>
                              )}
                              {smsLink && (
                                <a
                                  href={smsLink}
                                  style={{ padding: "5px 12px", fontSize: 10, textDecoration: "none", background: "var(--good)", color: "#FFF", fontFamily: "Oswald, sans-serif", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 3, border: "2px solid var(--good)" }}
                                  title="Texts just the FB upload link — no dispatch details. Use mid-day to remind drivers to upload."
                                >
                                  <Upload size={11} style={{ marginRight: 3 }} /> SEND UPLOAD LINK
                                </a>
                              )}
                              {emailLink && (
                                <a href={emailLink} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10, textDecoration: "none" }}>
                                  <Mail size={11} style={{ marginRight: 3 }} /> EMAIL
                                </a>
                              )}
                              {!contact && (
                                <span className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", padding: "6px 4px" }}>
                                  (Add contact to enable TEXT/EMAIL)
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Client tracking links */}
                <div style={{ background: "#FFF", border: "2px solid var(--steel)", padding: 16, marginBottom: 20 }}>
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ CLIENT TRACKING LINKS (SEND TO CUSTOMER)</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {/* Per-dispatch tracking link */}
                    <div>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 4 }}>▸ THIS JOB ONLY</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <code style={{ flex: 1, padding: "6px 10px", background: "var(--cream)", border: "1px solid var(--steel)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all" }}>
                          {`${window.location.origin}${window.location.pathname}#/track/${d.code}`}
                        </code>
                        <button
                          className="btn-ghost"
                          style={{ padding: "6px 12px", fontSize: 10 }}
                          onClick={() => {
                            const url = `${window.location.origin}${window.location.pathname}#/track/${d.code}`;
                            try { navigator.clipboard.writeText(url); onToast("LINK COPIED"); } catch { prompt("Copy this link:", url); }
                          }}
                        >
                          <Link2 size={11} style={{ marginRight: 4 }} /> COPY
                        </button>
                      </div>
                    </div>
                    {/* Per-client tracking link */}
                    {(d.clientName || d.subContractor) && (() => {
                      const ct = clientToken(d.clientName || d.subContractor);
                      if (!ct) return null;
                      return (
                        <div>
                          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 4 }}>
                            ▸ ALL JOBS FOR {(d.clientName || d.subContractor).toUpperCase()}
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <code style={{ flex: 1, padding: "6px 10px", background: "var(--cream)", border: "1px solid var(--steel)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all" }}>
                              {`${window.location.origin}${window.location.pathname}#/client/${ct}`}
                            </code>
                            <button
                              className="btn-ghost"
                              style={{ padding: "6px 12px", fontSize: 10 }}
                              onClick={() => {
                                const url = `${window.location.origin}${window.location.pathname}#/client/${ct}`;
                                try { navigator.clipboard.writeText(url); onToast("CLIENT LINK COPIED"); } catch { prompt("Copy this link:", url); }
                              }}
                            >
                              <Link2 size={11} style={{ marginRight: 4 }} /> COPY
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", lineHeight: 1.5, marginTop: 10 }}>
                    ▸ CLIENT TRACKING PAGES SHOW JOB PROGRESS, TONNAGE, AND SCALE TICKETS · NO LOGIN REQUIRED
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, fontSize: 13, fontFamily: "JetBrains Mono, monospace", marginBottom: 20 }}>
                  <div><strong>DATE:</strong> {fmtDate(d.date)}</div>
                  <div><strong>CLIENT:</strong> {d.clientName || "—"}</div>
                  <div><strong>SUB:</strong> {d.subContractor || "internal"}</div>
                  <div><strong>PICKUP:</strong> {d.pickup || "—"}</div>
                  <div><strong>DROPOFF:</strong> {d.dropoff || "—"}</div>
                  <div><strong>TRUCKS:</strong> {bills.length} / {d.trucksExpected}</div>
                  <div>
                    <strong>STATUS:</strong>{" "}
                    {(() => {
                      const status = d.status === "closed" ? "complete" : d.status === "sent" ? "sent" : "draft";
                      const color = status === "complete" ? "var(--concrete)" : status === "sent" ? "var(--hazard)" : "var(--good)";
                      return <span style={{ color, fontWeight: 700 }}>● {status.toUpperCase()}</span>;
                    })()}
                  </div>
                </div>

                {/* Lock badge */}
                {(() => {
                  const lock = lockStateFor(d);
                  if (lock.level === 0) return null;
                  const bg = lock.level === 3 ? "var(--safety)" : lock.level === 2 ? "var(--hazard)" : "var(--concrete)";
                  return (
                    <div style={{ padding: 10, background: "#FEF2F2", border: "2px solid " + bg, marginBottom: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <Lock size={16} style={{ color: bg }} />
                      <span className="fbt-mono" style={{ fontSize: 11, fontWeight: 700 }}>
                        {lock.level === 1 && "DISPATCHED — ASSIGNMENTS LOCKED"}
                        {lock.level === 2 && "FBs APPROVED — RATE / MATERIAL / JOB LOCKED"}
                        {lock.level === 3 && (lock.hasInvoicedFbs ? "FBs INVOICED — FULLY LOCKED" : "ORDER CLOSED")}
                      </span>
                      <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginLeft: "auto" }}>
                        {lock.reason} · edit via override button below
                      </span>
                    </div>
                  );
                })()}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                  {/* Mark dispatched — only for draft/open */}
                  {(d.status === "open" || !d.status || d.status === "draft") && (
                    <button
                      className="btn-primary"
                      style={{ background: "var(--hazard)", color: "var(--steel)", borderColor: "var(--hazard-deep)" }}
                      onClick={async () => {
                        if (!confirm(`Mark Order #${d.code} as DISPATCHED?\n\nThis locks the driver/sub assignments. You can still override later if needed.`)) return;
                        await markDispatched(d.id);
                      }}
                    >
                      <Send size={14} /> MARK AS DISPATCHED
                    </button>
                  )}
                  <button className="btn-ghost" onClick={() => toggleStatus(d.id)}>
                    {d.status === "closed" ? "REOPEN" : "CLOSE / COMPLETE"}
                  </button>
                </div>

                {/* Reconciliation panel — shows when submitted < expected or when tracking no-shows */}
                {(() => {
                  const submittedCount = bills.length;
                  const expected = Number(d.trucksExpected) || 1;
                  const noShow = Number(d.noShowCount) || 0;
                  const resolved = submittedCount + noShow;
                  const unresolved = expected - resolved;
                  const mathBalances = unresolved === 0;
                  const isReconciled = !!d.reconciledAt;

                  // Don't show panel if nothing's outstanding and not reconciled
                  if (submittedCount >= expected && noShow === 0 && !isReconciled) return null;

                  return (
                    <div style={{
                      padding: 14,
                      background: isReconciled ? "#F0FDF4" : (mathBalances ? "#FEF3C7" : "#FEE2E2"),
                      border: "2px solid " + (isReconciled ? "var(--good)" : mathBalances ? "var(--hazard)" : "var(--safety)"),
                      marginBottom: 20,
                    }}>
                      <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700, color: isReconciled ? "var(--good)" : mathBalances ? "var(--hazard-deep)" : "var(--safety)" }}>
                        {isReconciled ? "✓ ORDER RECONCILED" : mathBalances ? "▸ READY TO RECONCILE" : "▸ TRUCKS NEED RESOLUTION"}
                      </div>
                      <div style={{ fontSize: 13, fontFamily: "JetBrains Mono, monospace", marginBottom: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
                        <div><strong>EXPECTED:</strong> {expected}</div>
                        <div><strong>SUBMITTED:</strong> {submittedCount}</div>
                        <div><strong>NO-SHOW:</strong> {noShow}</div>
                        <div style={{ color: mathBalances ? "var(--good)" : "var(--safety)", fontWeight: 700 }}>
                          <strong>UNRESOLVED:</strong> {unresolved}
                        </div>
                      </div>
                      {isReconciled ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
                            Reconciled by {d.reconciledBy} on {new Date(d.reconciledAt).toLocaleDateString()}
                          </div>
                          <button
                            onClick={() => { if (confirm("Un-reconcile this order? You'll be able to edit no-show count again.")) unmarkReconciled(d.id); }}
                            className="btn-ghost"
                            style={{ padding: "4px 10px", fontSize: 10, marginLeft: "auto" }}
                          >
                            UN-RECONCILE
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <button
                            onClick={() => adjustNoShow(d.id, 1)}
                            className="btn-ghost"
                            style={{ padding: "6px 12px", fontSize: 11, background: "#FFF" }}
                            disabled={unresolved <= 0}
                            title="Mark one expected truck as a no-show"
                          >
                            + NO-SHOW
                          </button>
                          <button
                            onClick={() => adjustNoShow(d.id, -1)}
                            className="btn-ghost"
                            style={{ padding: "6px 12px", fontSize: 11, background: "#FFF" }}
                            disabled={noShow <= 0}
                          >
                            − NO-SHOW
                          </button>
                          <button
                            onClick={() => markReconciled(d.id)}
                            className="btn-primary"
                            style={{ padding: "6px 14px", fontSize: 11, marginLeft: "auto", background: mathBalances ? "var(--good)" : "var(--concrete)", borderColor: mathBalances ? "var(--good)" : "var(--concrete)", color: "#FFF", opacity: mathBalances ? 1 : 0.5, cursor: mathBalances ? "pointer" : "not-allowed" }}
                            disabled={!mathBalances}
                            title={mathBalances ? "Confirm all trucks are accounted for — ready to invoice" : "Resolve all unresolved trucks first"}
                          >
                            ✓ MARK RECONCILED
                          </button>
                        </div>
                      )}
                      {!isReconciled && !mathBalances && (
                        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8 }}>
                          ▸ WAITING ON {unresolved} MORE FB{unresolved !== 1 ? "S" : ""} OR MARK THEM AS NO-SHOW
                        </div>
                      )}
                      {!isReconciled && mathBalances && (
                        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", marginTop: 8 }}>
                          ▸ ALL TRUCKS ACCOUNTED FOR · CLICK MARK RECONCILED TO ENABLE INVOICING
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ SUBMITTED FREIGHT BILLS ({bills.length})</div>
                {bills.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", border: "2px dashed var(--concrete)", color: "var(--concrete)" }}>
                    <FileText size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                    <div className="fbt-mono" style={{ fontSize: 12 }}>NO FREIGHT BILLS YET</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>Share the upload link with the driver/sub.</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {bills.map((fb) => {
                      const inv = fb.invoiceId ? invoices.find((i) => i.id === fb.invoiceId) : null;
                      const noPhotos = !fb.photos || fb.photos.length === 0;
                      const fbStatus = fb.status || "pending";
                      return (
                      <div key={fb.id} style={{ border: "1px solid var(--line)", borderRadius: 8, background: "#FFF" }}>
                        <div style={{ padding: "12px 16px", background: "var(--surface)", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div className="fbt-display" style={{ fontSize: 18 }}>FB #{fb.freightBillNumber}</div>
                            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{fmtDateTime(fb.submittedAt)}</div>
                          </div>
                          <button className="btn-danger" onClick={() => removeFreightBill(fb.id)}><Trash2 size={12} /></button>
                        </div>
                        {/* Cross-stage status chip strip — surfaces invoice / payroll / photo state at a glance */}
                        <div style={{ padding: "8px 16px", display: "flex", flexWrap: "wrap", gap: 6, borderBottom: "1px solid var(--line)" }}>
                          <span className="chip" style={{ background: fbStatus === "approved" ? "#F0FDF4" : fbStatus === "rejected" ? "#FEF2F2" : "var(--surface)", color: fbStatus === "approved" ? "var(--good)" : fbStatus === "rejected" ? "var(--safety)" : "var(--concrete)", borderColor: fbStatus === "approved" ? "var(--good)" : fbStatus === "rejected" ? "var(--safety)" : "var(--line)" }}>
                            {fbStatus.toUpperCase()}
                          </span>
                          {inv && (
                            <span className="chip" title={`On invoice ${inv.invoiceNumber}`} style={{ background: "#EFF6FF", color: "var(--hazard-deep)", borderColor: "var(--hazard)" }}>
                              ON {inv.invoiceNumber || "INV"}
                            </span>
                          )}
                          {fb.paidAt && (
                            <span className="chip" title="Sub paid out" style={{ background: "#F0FDF4", color: "var(--good)", borderColor: "var(--good)" }}>
                              SUB PAID
                            </span>
                          )}
                          {fb.customerPaidAt && (
                            <span className="chip" title="Customer paid invoice" style={{ background: "#F0FDF4", color: "var(--good)", borderColor: "var(--good)" }}>
                              CUST PAID
                            </span>
                          )}
                          {noPhotos && (
                            <span className="chip" title="No proof-of-haul photos attached" style={{ background: "#FEF2F2", color: "var(--safety)", borderColor: "var(--safety)" }}>
                              ⚠ NO PHOTOS
                            </span>
                          )}
                        </div>
                        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                          <div><strong>DRIVER:</strong> {fb.driverName}</div>
                          <div><strong>TRUCK:</strong> {fb.truckNumber}</div>
                          {fb.material && <div><strong>MAT:</strong> {fb.material}</div>}
                          {fb.tonnage && <div><strong>TONS:</strong> {fb.tonnage}</div>}
                          {fb.loadCount && <div><strong>LOADS:</strong> {fb.loadCount}</div>}
                          {fb.pickupTime && <div><strong>PU:</strong> {fb.pickupTime}</div>}
                          {fb.dropoffTime && <div><strong>DO:</strong> {fb.dropoffTime}</div>}
                        </div>
                        {fb.notes && <div style={{ margin: "0 16px 14px", padding: 10, background: "var(--surface)", fontSize: 12, borderLeft: "3px solid var(--hazard)" }}>{fb.notes}</div>}
                        {fb.photos && fb.photos.length > 0 && (
                          <div style={{ padding: "0 16px 16px" }}>
                            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ {fb.photos.length} ATTACHMENT{fb.photos.length !== 1 ? "S" : ""}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {fb.photos.map((p) => <img key={p.id} src={p.dataUrl} className="thumb" alt={p.name || "ticket"} onClick={() => setLightbox(p.dataUrl)} />)}
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {filteredDispatches.length === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <ClipboardList size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>{search ? "NO MATCHES FOR THAT SEARCH" : "NO DISPATCHES YET — CREATE ONE ABOVE"}</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 28 }}>
          {groupedByDay.map((group) => (
            <div key={group.date}>
              {/* Day header */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10, paddingBottom: 8, borderBottom: "2px solid var(--steel)" }}>
                <Calendar size={16} style={{ color: "var(--hazard-deep)" }} />
                <h3 className="fbt-display" style={{ fontSize: 16, margin: 0, letterSpacing: "0.02em" }}>{dayLabel(group.date)}</h3>
                <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em" }}>
                  {group.date}
                </span>
                <span className="fbt-mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", fontWeight: 700 }}>
                  {group.orders.length} ORDER{group.orders.length !== 1 ? "S" : ""}
                </span>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {group.orders.map((d) => {
            const bills = fbForDispatch(d.id);
            const pct = d.trucksExpected ? Math.min(100, (bills.length / d.trucksExpected) * 100) : 0;
            const unreadOnThis = bills.filter((fb) => unreadSet.has(fb.id)).length;
            return (
              <div key={d.id} className="fbt-card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
                {unreadOnThis > 0 && (
                  <div style={{
                    position: "absolute", top: 14, right: 14, zIndex: 2,
                    background: "var(--safety)", color: "#FFF",
                    padding: "4px 10px", border: "2px solid var(--steel)",
                    fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4,
                    animation: "slideUp 0.3s ease-out",
                  }}>
                    <span style={{ width: 6, height: 6, background: "#FFF", borderRadius: "50%" }} />
                    {unreadOnThis} NEW
                  </div>
                )}
                <div className="hazard-stripe-thin" style={{ height: 6 }} />
                <div style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {(() => {
                          const status = d.status === "closed" ? "complete" : d.status === "sent" ? "sent" : "draft";
                          const bg = status === "complete" ? "var(--concrete)" : status === "sent" ? "var(--hazard)" : "var(--good)";
                          return <span className="chip" style={{ background: bg, color: status === "sent" ? "var(--steel)" : "#FFF", borderColor: "var(--steel)" }}>● {status.toUpperCase()}</span>;
                        })()}
                        <span className="chip" style={{ background: "var(--hazard)" }}>#{d.code}</span>
                        <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>{fmtDate(d.date)}</span>
                      </div>
                      <h3 className="fbt-display" style={{ fontSize: 20, margin: "8px 0 4px" }}>{d.jobName}</h3>
                      <div className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)" }}>
                        {d.subContractor ? `SUB: ${d.subContractor}` : "INTERNAL"}
                        {d.pickup && ` · ${d.pickup}`}{d.dropoff && ` → ${d.dropoff}`}
                      </div>
                      {/* Per-assignment progress chips */}
                      {(d.assignments || []).length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                          {d.assignments.map((a) => {
                            const aFbs = bills.filter((fb) => fb.assignmentId === a.aid);
                            const expected = Number(a.trucks) || 1;
                            const submitted = aFbs.length;
                            const bg = submitted === 0 ? "var(--concrete)"
                              : submitted >= expected ? "var(--good)"
                              : "var(--hazard)";
                            return (
                              <span
                                key={a.aid}
                                className="chip"
                                style={{
                                  background: bg, color: "#FFF", fontSize: 9, padding: "2px 8px",
                                  borderColor: "var(--steel)",
                                }}
                                title={`${a.name}: ${submitted} of ${expected} submitted`}
                              >
                                {a.name.slice(0, 18)}{a.name.length > 18 ? "…" : ""} · {submitted}/{expected}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 11 }} onClick={() => copyLink(d.code)}><Link2 size={12} style={{ marginRight: 4 }} /> COPY LINK</button>
                      <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 11 }} onClick={() => printDriverSheet(d, `${window.location.origin}${window.location.pathname}#/submit/${d.code}`, onToast)} title="Print driver sheet with QR"><Printer size={12} style={{ marginRight: 4 }} /> PRINT</button>
                      <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 11 }} onClick={() => openEditDispatch(d)} title="Edit this order"><Edit2 size={12} style={{ marginRight: 4 }} /> EDIT</button>
                      <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 11 }} onClick={() => setActiveDispatch(d.id)}><Eye size={12} style={{ marginRight: 4 }} /> OPEN</button>
                      <button className="btn-danger" onClick={() => removeDispatch(d.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "JetBrains Mono, monospace", marginBottom: 4, color: "var(--concrete)" }}>
                      <span>▸ {bills.length} / {d.trucksExpected} FREIGHT BILLS IN</span>
                      {bills.length >= d.trucksExpected && <span style={{ color: "var(--good)", fontWeight: 700 }}>✓ COMPLETE</span>}
                    </div>
                    <div style={{ height: 8, background: "#E7E5E4", border: "1px solid var(--steel)" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "var(--good)" : "var(--hazard)", transition: "width 0.3s" }} />
                    </div>
                  </div>
                  {bills.length > 0 && (
                    <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {bills.map((fb) => (
                        <span key={fb.id} className="chip" style={{ background: "#FEF3C7", cursor: "pointer" }} onClick={() => setActiveDispatch(d.id)}>
                          <FileText size={10} /> FB#{fb.freightBillNumber} · {fb.truckNumber}
                          {fb.photos?.length > 0 && <span style={{ color: "var(--good)" }}>· {fb.photos.length}📎</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
