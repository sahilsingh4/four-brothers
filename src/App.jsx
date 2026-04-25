import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { supabase } from "./supabase";
import {
  fetchDispatches, insertDispatch, updateDispatch, deleteDispatch,
  fetchFreightBills, insertFreightBill, updateFreightBill, deleteFreightBill,
  subscribeToDispatches, subscribeToFreightBills,
  fetchContacts, insertContact, updateContact, deleteContact,
  fetchQuarries, insertQuarry, updateQuarry, deleteQuarry,
  fetchInvoices, insertInvoice, updateInvoice, deleteInvoice,
  subscribeToContacts, subscribeToQuarries, subscribeToInvoices,
  fetchProjects, insertProject, updateProject, deleteProject, subscribeToProjects,
  fetchDeletedDispatches, fetchDeletedFreightBills, fetchDeletedInvoices,
  recoverDispatch, recoverFreightBill, recoverInvoice,
  hardDeleteDispatch, hardDeleteFreightBill, hardDeleteInvoice,
  autoPurgeDeleted,
  fetchQuotes, insertQuote, updateQuote, deleteQuote, subscribeToQuotes,
  fetchDeletedQuotes, recoverQuote, hardDeleteQuote,
  fetchBids, insertBid, updateBid, deleteBid, subscribeToBids,
  logAudit, fetchAuditLog,
  fetchTestimonials,
  insertTestimonial, updateTestimonial, deleteTestimonial,
  COMPLIANCE_DOC_TYPES,
} from "./db";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  Banknote,
  BarChart3,
  Bell,
  BellOff,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Database,
  DollarSign,
  Download,
  Edit2,
  Eye,
  EyeOff,
  FileDown,
  FileText,
  Fuel,
  HardDrive,
  History,
  KeyRound,
  Link2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Mountain,
  Package,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Receipt,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  Truck,
  Upload,
  User,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from "lucide-react";
// Pure formatters & validators live in ./utils so they're unit-testable
// without React/DOM. See src/utils.js + src/utils.test.js.
import {
  fmt$, fmtDate, fmtDateTime, formatTime12h, todayISO, randomCode,
  clientToken, qrServiceUrl, buildSMSLink, buildEmailLink,
  nextLineId, isPastRecoveryWindow, daysUntilPurge, daysSince,
  BID_STATUSES, BID_STATUS_MAP,
} from "./utils";
import { Toast } from "./components/Toast";
import { Logo } from "./components/Logo";
import { Lightbox } from "./components/Lightbox";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { TrackingHeader } from "./components/TrackingHeader";
import { DispatchTrackingCard } from "./components/DispatchTrackingCard";

// v24: route-level code splitting via React.lazy. Each of these is a top-level
// view that the user reaches via a hash route — none are needed for first
// paint of any other route, so loading them on demand keeps the initial
// bundle small. Vite emits each as its own chunk.
const LoginScreen = lazy(() => import("./components/LoginScreen").then((m) => ({ default: m.LoginScreen })));
const DispatchTrackingPage = lazy(() => import("./components/DispatchTrackingPage").then((m) => ({ default: m.DispatchTrackingPage })));
import { QRCodeBlock } from "./components/QRCodeBlock";
import { QuickAddContactModal } from "./components/QuickAddContactModal";
import { QuarryDetailModal } from "./components/QuarryDetailModal";
import { ComparisonModal } from "./components/ComparisonModal";
import { FBTraceModal } from "./components/FBTraceModal";
import { BidDeadlineChip } from "./components/BidDeadlineChip";
import { FBEditModal } from "./components/FBEditModal";
import { HomeTab } from "./components/HomeTab";
import { BidModal } from "./components/BidModal";
import { RecordPaymentModal } from "./components/RecordPaymentModal";
import { CompanyProfileModal } from "./components/CompanyProfileModal";
import { ContactDetailModal } from "./components/ContactDetailModal";
import { readUploadQueue, enqueueUpload, removeFromUploadQueue } from "./hooks/uploadQueue";
import { GlobalStyles } from "./components/GlobalStyles";
const ClientTrackingPage = lazy(() => import("./components/ClientTrackingPage").then((m) => ({ default: m.ClientTrackingPage })));
const DriverPayPortalPage = lazy(() => import("./components/DriverPayPortalPage").then((m) => ({ default: m.DriverPayPortalPage })));
const DriverUploadPage = lazy(() => import("./components/DriverUploadPage").then((m) => ({ default: m.DriverUploadPage })));
const CustomerPortal = lazy(() => import("./components/CustomerPortal").then((m) => ({ default: m.CustomerPortal })));
const PublicSite = lazy(() => import("./components/PublicSite").then((m) => ({ default: m.PublicSite })));

// Suspense fallback shown while a lazy chunk is in flight.
// Intentionally minimal — chunks are small enough that a heavy spinner would
// be visible longer than the load itself on most connections.
const RouteLoading = () => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div className="fbt-mono anim-roll" style={{ color: "var(--hazard-deep)", letterSpacing: "0.2em", fontSize: 12 }}>▸ LOADING…</div>
  </div>
);


const storageSet = async (key, value, shared = false) => { try { await window.storage?.set(key, JSON.stringify(value), shared); } catch (e) { console.warn("storage set failed", key, e); } };
const storageGet = async (key, shared = false) => { try { const r = await window.storage?.get(key, shared); return r?.value ? JSON.parse(r.value) : null; } catch { return null; } };


// Short "ding" via WebAudio so no asset is required.
const playDing = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
    osc.onended = () => { try { ctx.close(); } catch { /* noop */ } };
  } catch { /* noop */ }
};

const requestBrowserNotif = async () => {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return "denied"; }
};

const fireBrowserNotif = (title, body, tag) => {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const n = new Notification(title, { body, tag, silent: true });
    setTimeout(() => { try { n.close(); } catch { /* noop */ } }, 8000);
  } catch { /* noop */ }
};




// ========== AUTH UTILITIES (SUPABASE) ==========
// v20 Session Q: Hardened password requirements.
// NIST-aligned: 12+ chars with mixed complexity. Catches most common attacks (brute force, credential stuffing).



// ========================================================================
// PUBLIC MARKETING SITE — redesigned v18 (clean corporate style)
// ========================================================================
// Inspired by Double D Transportation, Jass Boys, Channa Trucking:
// whites + steel greys, big hero with stock truck photo, services grid,
// fleet section, prominent quote CTA, contact block, minimal visual clutter.
//
// Quote requests now write to Supabase via the onQuoteSubmit handler, which
// calls insertQuote() so admin sees them in real time.
// ========================================================================



// ========== CLIENT TOKEN HELPER ==========
// Deterministic token from client name — same name always → same link

// ========== SHARED TRACKING UI ==========

// Client-wide tracking page (all dispatches for a client)



// ========== PRINTABLE DRIVER SHEET ==========
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

const DispatchesTab = ({ dispatches, setDispatches, freightBills, setFreightBills, contacts = [], setContacts, company = {}, unreadIds = [], markDispatchRead, pendingDispatch, clearPendingDispatch, quarries = [], projects = [], fleet = [], invoices = [], onToast }) => {
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
  const [draft, setDraft] = useState({ date: todayISO(), jobName: "", clientName: "", clientId: "", projectId: null, subContractor: "", subContractorId: "", pickup: "", dropoff: "", material: "", trucksExpected: 1, ratePerHour: "", ratePerTon: "", ratePerLoad: "", notes: "", assignedDriverIds: [] });

  const resetDraft = () => setDraft({ date: todayISO(), jobName: "", clientName: "", clientId: "", projectId: null, subContractor: "", subContractorId: "", pickup: "", dropoff: "", material: "", trucksExpected: 1, ratePerHour: "", ratePerTon: "", ratePerLoad: "", notes: "", assignedDriverIds: [], assignments: [] });

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

  // Build SMS/Email text with order details
  // For drivers (kind=driver): NO rate shown. For subs: include rate + method.
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

    // Rate section — SUBS ONLY (not individual drivers)
    if (assignment && assignment.kind === "sub" && assignment.payRate) {
      const method = assignment.payMethod || "hour";
      const methodLabel = method === "hour" ? "/hr" : method === "ton" ? "/ton" : "/load";
      const minH = project?.minimumHours;
      lines.push(`Rate: $${assignment.payRate}${methodLabel}${method === "hour" && minH ? ` (${minH}hr min)` : ""}`);
      if (assignment.trucks > 1) lines.push(`Trucks: ${assignment.trucks}`);
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
        <div className="modal-bg" onClick={() => { setShowNew(false); setEditingId(null); resetDraft(); }}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>{editingId ? "EDIT ORDER" : "NEW ORDER"}</h3>
              <button onClick={() => { setShowNew(false); setEditingId(null); resetDraft(); }} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                <div><label className="fbt-label">Date</label><input className="fbt-input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>
                <div><label className="fbt-label">Trucks Expected</label><input className="fbt-input" type="number" min="1" value={draft.trucksExpected} onChange={(e) => setDraft({ ...draft, trucksExpected: e.target.value })} /></div>
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
                  onClick={() => setDraft({ ...draft, assignments: [...(draft.assignments || []), { kind: "sub", contactId: null, name: "", trucks: 1, payMethod: "hour", payRate: "" }] })}
                  style={{ padding: "6px 12px", fontSize: 11 }}
                >
                  <Plus size={12} style={{ marginRight: 4 }} /> ADD SUB / DRIVER
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
                <button onClick={() => { setShowNew(false); setEditingId(null); resetDraft(); }} className="btn-ghost">CANCEL</button>
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
                    const msg = `Hi ${a.name} — upload your freight bill${expected > 1 ? "s" : ""} for job "${d.jobName}" (${fmtDate(d.date)}) here: ${subUrl}`;
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
                    {bills.map((fb) => (
                      <div key={fb.id} style={{ border: "2px solid var(--steel)", background: "#FFF" }}>
                        <div style={{ padding: "12px 16px", background: "#FEF3C7", borderBottom: "2px solid var(--steel)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div className="fbt-display" style={{ fontSize: 18 }}>FB #{fb.freightBillNumber}</div>
                            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{fmtDateTime(fb.submittedAt)}</div>
                          </div>
                          <button className="btn-danger" onClick={() => removeFreightBill(fb.id)}><Trash2 size={12} /></button>
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
                        {fb.notes && <div style={{ margin: "0 16px 14px", padding: 10, background: "#F5F5F4", fontSize: 12, borderLeft: "3px solid var(--hazard)" }}>{fb.notes}</div>}
                        {fb.photos && fb.photos.length > 0 && (
                          <div style={{ padding: "0 16px 16px" }}>
                            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ {fb.photos.length} ATTACHMENT{fb.photos.length !== 1 ? "S" : ""}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {fb.photos.map((p) => <img key={p.id} src={p.dataUrl} className="thumb" alt={p.name || "ticket"} onClick={() => setLightbox(p.dataUrl)} />)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
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

const HoursTab = ({ logs, setLogs, onToast }) => {
  const [draft, setDraft] = useState({ date: todayISO(), truck: "", driver: "", job: "", startTime: "", endTime: "", hours: "", rate: "142", notes: "" });
  const computeHours = (s, e) => { if (!s || !e) return ""; const [sh, sm] = s.split(":").map(Number); const [eh, em] = e.split(":").map(Number); const diff = (eh * 60 + em - sh * 60 - sm) / 60; return diff > 0 ? diff.toFixed(2) : ""; };

  const addLog = async () => {
    if (!draft.truck || !draft.driver) { onToast("TRUCK + DRIVER REQUIRED"); return; }
    const hrs = draft.hours || computeHours(draft.startTime, draft.endTime) || "0";
    const billable = Math.max(8, Number(hrs));
    const entry = { id: Date.now(), ...draft, hours: hrs, billableHours: billable, amount: billable * Number(draft.rate || 0) };
    const next = [entry, ...logs];
    setLogs(next);
    await storageSet("fbt:logs", next);
    setDraft({ ...draft, truck: "", driver: "", job: "", startTime: "", endTime: "", hours: "", notes: "" });
    onToast("LOG ADDED");
  };

  const removeLog = async (id) => { const next = logs.filter((l) => l.id !== id); setLogs(next); await storageSet("fbt:logs", next); onToast("LOG REMOVED"); };

  const totalHours = logs.reduce((s, l) => s + Number(l.billableHours || 0), 0);
  const totalDollars = logs.reduce((s, l) => s + Number(l.amount || 0), 0);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}><div className="stat-num">{logs.length}</div><div className="stat-label">Total Logs</div></div>
        <div className="fbt-card" style={{ padding: 20 }}><div className="stat-num">{totalHours.toFixed(1)}</div><div className="stat-label">Billable Hours</div></div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--hazard)" }}><div className="stat-num">{fmt$(totalDollars)}</div><div className="stat-label">Gross Billing</div></div>
      </div>
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>NEW HOURS LOG</h3></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <div><label className="fbt-label">Date</label><input className="fbt-input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>
          <div><label className="fbt-label">Truck #</label><input className="fbt-input" value={draft.truck} onChange={(e) => setDraft({ ...draft, truck: e.target.value })} placeholder="T-01" /></div>
          <div><label className="fbt-label">Driver</label><input className="fbt-input" value={draft.driver} onChange={(e) => setDraft({ ...draft, driver: e.target.value })} /></div>
          <div><label className="fbt-label">Job / Client</label><input className="fbt-input" value={draft.job} onChange={(e) => setDraft({ ...draft, job: e.target.value })} placeholder="MCI #91684" /></div>
          <div><label className="fbt-label">Start</label><input className="fbt-input" type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} /></div>
          <div><label className="fbt-label">End</label><input className="fbt-input" type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} /></div>
          <div><label className="fbt-label">Hours (override)</label><input className="fbt-input" type="number" step="0.25" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} placeholder="auto" /></div>
          <div><label className="fbt-label">Rate $/hr</label><input className="fbt-input" type="number" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="fbt-label">Notes</label><input className="fbt-input" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
        </div>
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button onClick={addLog} className="btn-primary"><Plus size={16} /> ADD LOG</button>
          <span className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)" }}>▸ 8-HR MIN AUTO-APPLIED · DEFAULT RATE $142 (MCI)</span>
        </div>
      </div>
      <div className="fbt-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "2px solid var(--steel)", display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>LOG SHEET</h3></div>
        <div className="scroll-x">
          <table className="fbt-table">
            <thead><tr><th>Date</th><th>Truck</th><th>Driver</th><th>Job</th><th>Hrs</th><th>Billable</th><th>Rate</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {logs.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--concrete)" }}>No logs yet.</td></tr>}
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{fmtDate(l.date)}</td><td><strong>{l.truck}</strong></td><td>{l.driver}</td><td>{l.job || "—"}</td>
                  <td>{l.hours || "—"}</td><td><strong>{Number(l.billableHours).toFixed(2)}</strong></td>
                  <td>{fmt$(l.rate)}</td><td style={{ color: "var(--hazard-deep)", fontWeight: 700 }}>{fmt$(l.amount)}</td>
                  <td><button className="btn-danger" onClick={() => removeLog(l.id)}><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const BillingTab = ({ logs, onToast }) => {
  const [dieselPrice, setDieselPrice] = useState(6.25);
  const [threshold, setThreshold] = useState(6.75);
  const [gallonsPerHour, setGallonsPerHour] = useState(6);
  const [clientFilter, setClientFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => { (async () => { const s = await storageGet("fbt:billing"); if (s) { setDieselPrice(s.dieselPrice ?? 6.25); setThreshold(s.threshold ?? 6.75); setGallonsPerHour(s.gallonsPerHour ?? 6); } })(); }, []);
  useEffect(() => { storageSet("fbt:billing", { dieselPrice, threshold, gallonsPerHour }); }, [dieselPrice, threshold, gallonsPerHour]);

  const filtered = logs.filter((l) => {
    if (clientFilter && !(l.job || "").toLowerCase().includes(clientFilter.toLowerCase())) return false;
    if (fromDate && l.date < fromDate) return false;
    if (toDate && l.date > toDate) return false;
    return true;
  });

  const subtotal = filtered.reduce((s, l) => s + Number(l.amount || 0), 0);
  const totalBillableHours = filtered.reduce((s, l) => s + Number(l.billableHours || 0), 0);
  const surchargeActive = Number(dieselPrice) > Number(threshold);
  const extraPerGal = Math.max(0, Number(dieselPrice) - Number(threshold));
  const surchargePerHourClean = extraPerGal * Number(gallonsPerHour);
  const fuelSurcharge = surchargeActive ? totalBillableHours * surchargePerHourClean : 0;
  const total = subtotal + fuelSurcharge;

  const exportCSV = () => {
    const rows = [["Date", "Truck", "Driver", "Job", "Hours", "Billable Hrs", "Rate", "Amount", "Notes"], ...filtered.map((l) => [l.date, l.truck, l.driver, l.job, l.hours, l.billableHours, l.rate, l.amount, l.notes || ""])];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `4brothers-billing-${todayISO()}.csv`; a.click();
    URL.revokeObjectURL(url);
    onToast("CSV EXPORTED");
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Fuel size={22} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>FUEL SURCHARGE ENGINE</h3>
          <span className="fbt-mono" style={{ marginLeft: "auto", padding: "4px 10px", background: surchargeActive ? "var(--safety)" : "var(--good)", color: "var(--cream)", fontSize: 11, letterSpacing: "0.1em" }}>{surchargeActive ? "● ACTIVE" : "○ BELOW THRESHOLD"}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
          <div><label className="fbt-label">Current Diesel $/gal</label><input className="fbt-input" type="number" step="0.01" value={dieselPrice} onChange={(e) => setDieselPrice(e.target.value)} /></div>
          <div><label className="fbt-label">Threshold $/gal</label><input className="fbt-input" type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)} /></div>
          <div><label className="fbt-label">Gallons / Hour</label><input className="fbt-input" type="number" step="0.1" value={gallonsPerHour} onChange={(e) => setGallonsPerHour(e.target.value)} /></div>
          <div><label className="fbt-label">Extra $/gal Over</label><input className="fbt-input" value={extraPerGal.toFixed(3)} readOnly style={{ background: "#F5F5F4" }} /></div>
        </div>
        <div style={{ marginTop: 16, padding: 14, background: "var(--steel)", color: "var(--cream)", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
          ▸ FORMULA: ( DIESEL − THRESHOLD ) × GAL/HR × BILLABLE_HRS<br />
          ▸ PER HOUR SURCHARGE: {fmt$(surchargePerHourClean)} · TRIGGERS ABOVE {fmt$(threshold)}/GAL
        </div>
      </div>
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>INVOICE BUILDER</h3></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <div><label className="fbt-label">Client / Job Contains</label><input className="fbt-input" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} placeholder="e.g. MCI" /></div>
          <div><label className="fbt-label">From</label><input className="fbt-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
          <div><label className="fbt-label">To</label><input className="fbt-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 24, border: "2px solid var(--steel)" }}>
          <table className="fbt-table">
            <tbody>
              <tr><td style={{ fontWeight: 600 }}>LABOR · {filtered.length} LOGS · {totalBillableHours.toFixed(2)} HRS</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt$(subtotal)}</td></tr>
              <tr><td style={{ fontWeight: 600, color: surchargeActive ? "var(--rust)" : "var(--concrete)" }}>FUEL SURCHARGE {surchargeActive ? `· ${fmt$(surchargePerHourClean)}/HR` : "(inactive)"}</td><td style={{ textAlign: "right", fontWeight: 700, color: surchargeActive ? "var(--rust)" : "var(--concrete)" }}>{fmt$(fuelSurcharge)}</td></tr>
              <tr style={{ background: "var(--hazard)" }}><td style={{ fontWeight: 700, fontSize: 16, fontFamily: "Archivo Black, sans-serif" }}>TOTAL DUE</td><td style={{ textAlign: "right", fontWeight: 700, fontSize: 16, fontFamily: "Archivo Black, sans-serif" }}>{fmt$(total)}</td></tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 20 }}><button onClick={exportCSV} className="btn-primary"><Download size={16} /> EXPORT CSV</button></div>
      </div>
    </div>
  );
};

// ========== QUOTE DETAIL MODAL (revisions + convert) ==========
const QuoteDetailModal = ({ quote, dispatches, setQuotes, quotes, onConvertToOrder, onClose, onToast }) => {
  const [draft, setDraft] = useState({ ...quote });
  const [showRevisions, setShowRevisions] = useState(false);
  const [revReason, setRevReason] = useState("");
  const [dirty, setDirty] = useState(false);

  const linkedOrder = quote.convertedToOrderId ? dispatches.find((d) => d.id === quote.convertedToOrderId) : null;

  const updateField = (field, value) => {
    setDraft({ ...draft, [field]: value });
    setDirty(true);
  };

  const saveRevision = async () => {
    if (!dirty) { onToast("NO CHANGES TO SAVE"); return; }
    // Build revision snapshot from current quote (pre-edit state)
    const currentRev = quote.revisions?.length || 0;
    const newRevision = {
      revNumber: currentRev + 1,
      savedAt: new Date().toISOString(),
      savedBy: "admin",
      changeReason: revReason || "(no reason given)",
      snapshot: {
        name: quote.name, company: quote.company, email: quote.email, phone: quote.phone,
        pickup: quote.pickup, dropoff: quote.dropoff, material: quote.material,
        quantity: quote.quantity, needDate: quote.needDate, notes: quote.notes,
        status: quote.status, service: quote.service,
      },
    };
    const updated = {
      ...draft,
      revisions: [...(quote.revisions || []), newRevision],
      updatedAt: new Date().toISOString(),
    };
    const next = quotes.map((q) => q.id === quote.id ? updated : q);
    setQuotes(next);
    // v18: persist to Supabase (was localStorage-only). Fail loudly if DB write fails.
    try {
      // v19c Session N: pass quote.updatedAt as optimistic lock
      await updateQuote(quote.id, updated, quote.updatedAt);
      onToast(`✓ REVISION ${newRevision.revNumber + 1} SAVED`);
    } catch (e) {
      if (e?.code === "CONCURRENT_EDIT") {
        onToast("⚠ SOMEONE ELSE EDITED THIS QUOTE — RELOAD");
        setQuotes(quotes);  // revert local state
      } else {
        console.error("saveQuote:", e);
        onToast("⚠ SAVE FAILED — CHANGES LOCAL ONLY. CHECK CONNECTION.");
      }
    }
    setDirty(false);
    setRevReason("");
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", letterSpacing: "0.1em" }}>QUOTE</div>
            <h3 className="fbt-display" style={{ fontSize: 20, margin: "2px 0 0" }}>{quote.name}{quote.company ? ` · ${quote.company}` : ""}</h3>
            <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1", marginTop: 2 }}>
              {fmtDate(quote.submittedAt)} · {quote.service || "—"} · rev {(quote.revisions?.length || 0) + 1}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 14 }}>

          {/* Converted banner */}
          {linkedOrder && (
            <div style={{ padding: 12, background: "#F0FDF4", border: "2px solid var(--good)" }}>
              <div className="fbt-mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--good)" }}>
                ✓ CONVERTED TO ORDER #{linkedOrder.code}
              </div>
              <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
                {quote.convertedAt ? new Date(quote.convertedAt).toLocaleDateString() : "—"} · {linkedOrder.jobName}
              </div>
            </div>
          )}

          {/* Status */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <div>
              <label className="fbt-label">Status</label>
              <select className="fbt-select" value={draft.status || "new"} onChange={(e) => updateField("status", e.target.value)}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="won">Won / Accepted</option>
                <option value="lost">Lost</option>
                {quote.convertedToOrderId && <option value="converted">Converted</option>}
              </select>
            </div>
            <div>
              <label className="fbt-label">Need Date</label>
              <input className="fbt-input" type="date" value={draft.needDate || ""} onChange={(e) => updateField("needDate", e.target.value)} />
            </div>
          </div>

          {/* Contact + job details */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <div><label className="fbt-label">Name</label><input className="fbt-input" value={draft.name || ""} onChange={(e) => updateField("name", e.target.value)} /></div>
            <div><label className="fbt-label">Company</label><input className="fbt-input" value={draft.company || ""} onChange={(e) => updateField("company", e.target.value)} /></div>
            <div><label className="fbt-label">Email</label><input className="fbt-input" value={draft.email || ""} onChange={(e) => updateField("email", e.target.value)} /></div>
            <div><label className="fbt-label">Phone</label><input className="fbt-input" value={draft.phone || ""} onChange={(e) => updateField("phone", e.target.value)} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label className="fbt-label">Pickup</label><input className="fbt-input" value={draft.pickup || ""} onChange={(e) => updateField("pickup", e.target.value)} /></div>
            <div><label className="fbt-label">Dropoff</label><input className="fbt-input" value={draft.dropoff || ""} onChange={(e) => updateField("dropoff", e.target.value)} /></div>
            <div><label className="fbt-label">Material</label><input className="fbt-input" value={draft.material || ""} onChange={(e) => updateField("material", e.target.value)} /></div>
            <div><label className="fbt-label">Quantity / Loads</label><input className="fbt-input" value={draft.quantity || ""} onChange={(e) => updateField("quantity", e.target.value)} /></div>
          </div>
          <div>
            <label className="fbt-label">Notes</label>
            <textarea className="fbt-textarea" value={draft.notes || ""} onChange={(e) => updateField("notes", e.target.value)} />
          </div>

          {/* Revision reason (only visible if dirty) */}
          {dirty && (
            <div style={{ padding: 10, background: "#FEF3C7", border: "2px solid var(--hazard)" }}>
              <label className="fbt-label" style={{ color: "var(--hazard-deep)" }}>
                CHANGE REASON (why are you revising this quote?)
              </label>
              <input
                className="fbt-input"
                value={revReason}
                onChange={(e) => setRevReason(e.target.value)}
                placeholder="e.g. Customer requested rate adjustment · added tonnage"
              />
            </div>
          )}

          {/* Revision history */}
          {(quote.revisions?.length || 0) > 0 && (
            <div style={{ border: "1.5px solid var(--steel)", padding: 12 }}>
              <div
                style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onClick={() => setShowRevisions(!showRevisions)}
              >
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em" }}>
                  ▸ REVISION HISTORY ({quote.revisions.length} PRIOR VERSION{quote.revisions.length !== 1 ? "S" : ""})
                </div>
                <ChevronDown size={14} style={{ transform: showRevisions ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
              </div>
              {showRevisions && (
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  {[...quote.revisions].reverse().map((rev, idx) => (
                    <div key={idx} style={{ padding: 10, background: "#F5F5F4", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        REV {rev.revNumber} · {new Date(rev.savedAt).toLocaleString()}
                      </div>
                      <div style={{ color: "var(--concrete)", marginBottom: 4 }}>"{rev.changeReason || "(no reason)"}"</div>
                      <div style={{ fontSize: 10 }}>
                        {rev.snapshot.material ? `Material: ${rev.snapshot.material} · ` : ""}
                        {rev.snapshot.pickup ? `Pickup: ${rev.snapshot.pickup} · ` : ""}
                        {rev.snapshot.dropoff ? `Dropoff: ${rev.snapshot.dropoff} · ` : ""}
                        {rev.snapshot.quantity ? `Qty: ${rev.snapshot.quantity} · ` : ""}
                        Status: {rev.snapshot.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dirty && (
              <button onClick={saveRevision} className="btn-primary">
                <Save size={14} /> SAVE AS NEW REVISION
              </button>
            )}
            {/* Convert to Order — only on "won" status, not already converted */}
            {(draft.status === "won" || quote.status === "won") && !quote.convertedToOrderId && (
              <button
                onClick={() => onConvertToOrder(quote)}
                className="btn-primary"
                style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}
              >
                <ArrowRight size={14} /> CONVERT TO ORDER
              </button>
            )}
            {/* Show warning if trying to convert non-won quote */}
            {!quote.convertedToOrderId && draft.status !== "won" && quote.status !== "won" && (
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", alignSelf: "center" }}>
                ▸ MARK AS WON FIRST TO ENABLE CONVERT
              </div>
            )}
            <button onClick={onClose} className="btn-ghost">CLOSE</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuotesTab = ({ quotes, setQuotes, dispatches = [], setDispatches, contacts = [], projects = [], onJumpTab, onToast }) => {
  const [viewingQuote, setViewingQuote] = useState(null);
  const [pendingConversion, setPendingConversion] = useState(null); // quote being converted

  const updateStatus = async (id, status) => {
    const current = quotes.find((q) => q.id === id);
    const next = quotes.map((q) => q.id === id ? { ...q, status } : q);
    setQuotes(next);
    // v18: persist to Supabase. Fail loudly if DB write fails.
    try {
      // v19c Session N: optimistic lock
      await updateQuote(id, { status }, current?.updatedAt);
      // v20 Session O: audit log
      if (current && current.status !== status) {
        logAudit({
          actionType: "quote.status_change",
          entityType: "quote", entityId: id,
          entityLabel: current.company || current.contactName || "Quote",
          before: { status: current.status },
          after: { status },
        });
      }
      onToast(`QUOTE ${status.toUpperCase()}`);
    } catch (e) {
      if (e?.code === "CONCURRENT_EDIT") {
        onToast("⚠ SOMEONE ELSE EDITED THIS QUOTE — RELOAD");
        setQuotes(quotes);  // revert
        return;
      }
      console.error("updateStatus:", e);
      onToast("⚠ STATUS UPDATE FAILED — LOCAL ONLY");
    }
  };
  const remove = async (id) => {
    if (!confirm("Delete this quote? Revision history will be lost.")) return;
    // v18 FIX: await the DB soft-delete FIRST, then update local state.
    // Previous version did optimistic removal first → realtime subscription could re-fetch
    // before the DELETE landed, putting the quote back in state.
    try {
      await deleteQuote(id, { deletedBy: "admin", reason: "" });
      // Only remove from local state after DB confirms soft-delete
      const next = quotes.filter((q) => q.id !== id);
      setQuotes(next);
      onToast("QUOTE DELETED");
    } catch (e) {
      console.error("removeQuote:", e);
      onToast("⚠ DELETE FAILED — QUOTE STILL ACTIVE");
    }
  };

  // Convert to Order — uses the pending-conversion state to trigger the order form pre-fill
  const handleConvert = (quote) => {
    // Try to match customer by email/phone/name against existing customer contacts
    const customer = contacts.find((c) =>
      c.type === "customer" && (
        (quote.email && c.email && c.email.toLowerCase() === quote.email.toLowerCase()) ||
        (quote.phone && c.phone && c.phone.replace(/[^0-9]/g, "") === String(quote.phone).replace(/[^0-9]/g, "")) ||
        (quote.company && c.companyName && c.companyName.toLowerCase() === quote.company.toLowerCase())
      )
    );

    // Pre-filled order draft — user still needs to add date + truck count
    const orderDraft = {
      date: quote.needDate || new Date().toISOString().slice(0, 10),
      jobName: quote.company ? `${quote.company} — ${quote.material || quote.service || "Hauling"}` : (quote.service || "Hauling Job"),
      clientId: customer?.id || "",
      clientName: customer?.companyName || quote.company || quote.name || "",
      pickup: quote.pickup || "",
      dropoff: quote.dropoff || "",
      material: quote.material || "",
      trucksExpected: 1,
      notes: `Converted from quote submitted ${quote.submittedAt ? new Date(quote.submittedAt).toLocaleDateString() : "—"}.${quote.notes ? "\n\nOriginal quote notes: " + quote.notes : ""}`,
      fromQuoteId: quote.id,
    };

    setPendingConversion({ quote, orderDraft });
    setViewingQuote(null);
    onToast("QUOTE LOADED — FILL IN DATE + TRUCK COUNT & SAVE");
  };

  // When user completes the conversion (clicks save in the embedded form)
  const finalizeConversion = async (newOrder) => {
    if (!pendingConversion) return;
    const { quote } = pendingConversion;
    // Stamp the quote as converted
    const updatedQuote = {
      ...quote,
      status: "converted",
      convertedToOrderId: newOrder.id,
      convertedAt: new Date().toISOString(),
    };
    const next = quotes.map((q) => q.id === quote.id ? updatedQuote : q);
    setQuotes(next);
    // v18: persist conversion to Supabase. Fail loudly if DB write fails.
    try {
      // v19c Session N: optimistic lock
      await updateQuote(quote.id, updatedQuote, quote.updatedAt);
      // v20 Session O: audit log
      logAudit({
        actionType: "quote.convert",
        entityType: "quote", entityId: quote.id,
        entityLabel: quote.company || quote.contactName || "Quote",
        metadata: {
          newOrderCode: newOrder.code,
          newOrderId: newOrder.id,
          customer: quote.company || quote.contactName,
        },
      });
      onToast(`✓ QUOTE CONVERTED → ORDER #${newOrder.code}`);
    } catch (e) {
      if (e?.code === "CONCURRENT_EDIT") {
        onToast("⚠ SOMEONE ELSE EDITED THIS QUOTE — RELOAD");
        setQuotes(quotes);  // revert
        setPendingConversion(null);
        return;
      }
      console.error("finalizeConversion:", e);
      onToast("⚠ QUOTE CONVERTED LOCALLY — SYNC FAILED. CHECK CONNECTION.");
    }
    setPendingConversion(null);
  };

  const byStatus = {
    new: quotes.filter((q) => q.status === "new"),
    contacted: quotes.filter((q) => q.status === "contacted"),
    won: quotes.filter((q) => q.status === "won"),
    converted: quotes.filter((q) => q.status === "converted"),
    lost: quotes.filter((q) => q.status === "lost"),
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {viewingQuote && (
        <QuoteDetailModal
          quote={viewingQuote}
          dispatches={dispatches}
          setQuotes={setQuotes}
          quotes={quotes}
          onConvertToOrder={handleConvert}
          onClose={() => setViewingQuote(null)}
          onToast={onToast}
        />
      )}

      {pendingConversion && (
        <QuoteConversionForm
          quote={pendingConversion.quote}
          draft={pendingConversion.orderDraft}
          dispatches={dispatches}
          setDispatches={setDispatches}
          projects={projects}
          contacts={contacts}
          onSave={finalizeConversion}
          onCancel={() => setPendingConversion(null)}
          onToast={onToast}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {[
          { l: "New", v: byStatus.new.length, c: "var(--hazard)", fg: "var(--steel)" },
          { l: "Contacted", v: byStatus.contacted.length, c: "#FFF", fg: "var(--steel)" },
          { l: "Won", v: byStatus.won.length, c: "var(--good)", fg: "#FFF" },
          { l: "Converted", v: byStatus.converted.length, c: "var(--steel)", fg: "var(--cream)" },
          { l: "Lost", v: byStatus.lost.length, c: "var(--concrete)", fg: "#FFF" },
        ].map((s, i) => (
          <div key={i} className="fbt-card" style={{ padding: 20, background: s.c, color: s.fg }}>
            <div className="stat-num" style={{ color: s.fg }}>{s.v}</div>
            <div className="stat-label" style={{ color: s.fg === "#FFF" || s.fg === "var(--cream)" ? "#E7E5E4" : "var(--concrete)" }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div className="fbt-card" style={{ padding: 0 }}>
        <div style={{ padding: "18px 24px", borderBottom: "2px solid var(--steel)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 24, background: "var(--hazard)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>INBOUND QUOTE REQUESTS</h3>
        </div>
        {quotes.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
            <AlertCircle size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div className="fbt-mono" style={{ fontSize: 13 }}>NO INBOUND REQUESTS YET</div>
          </div>
        ) : (
          <div style={{ padding: 24, display: "grid", gap: 16 }}>
            {quotes.map((q) => {
              const linkedOrder = q.convertedToOrderId ? dispatches.find((d) => d.id === q.convertedToOrderId) : null;
              const bg = q.status === "converted" ? "#F0FDF4" : q.status === "new" ? "#FEF3C7" : "#FFF";
              const revCount = q.revisions?.length || 0;
              return (
                <div key={q.id} style={{ border: "2px solid var(--steel)", padding: 20, background: bg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        <span className="fbt-display" style={{ fontSize: 18 }}>{q.name}</span>
                        {q.company && <span style={{ color: "var(--concrete)", fontSize: 14 }}>· {q.company}</span>}
                        {revCount > 0 && (
                          <span className="chip" style={{ background: "var(--steel)", color: "var(--cream)", fontSize: 9, padding: "2px 7px" }}>
                            REV {revCount + 1}
                          </span>
                        )}
                      </div>
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {fmtDate(q.submittedAt)} · {q.service} {q.needDate && `· needed ${fmtDate(q.needDate)}`}
                      </div>
                      {linkedOrder && (
                        <div
                          onClick={() => onJumpTab && onJumpTab("dispatches", linkedOrder.id)}
                          style={{ marginTop: 6, padding: "4px 8px", background: "var(--good)", color: "#FFF", display: "inline-block", fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", cursor: "pointer", fontWeight: 700 }}
                        >
                          ✓ CONVERTED → ORDER #{linkedOrder.code} ▸
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: "6px 10px", fontSize: 11 }}
                        onClick={() => setViewingQuote(q)}
                      >
                        <Eye size={11} style={{ marginRight: 4 }} /> VIEW / EDIT
                      </button>
                      {!q.convertedToOrderId && (
                        <select className="fbt-select" style={{ padding: "6px 10px", fontSize: 12, width: "auto" }} value={q.status} onChange={(e) => updateStatus(q.id, e.target.value)}>
                          <option value="new">● New</option>
                          <option value="contacted">◐ Contacted</option>
                          <option value="won">✓ Won</option>
                          <option value="lost">✕ Lost</option>
                        </select>
                      )}
                      {/* Quick Convert button on won quotes */}
                      {q.status === "won" && !q.convertedToOrderId && (
                        <button
                          className="btn-primary"
                          style={{ padding: "6px 10px", fontSize: 11, background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}
                          onClick={() => handleConvert(q)}
                        >
                          <ArrowRight size={11} style={{ marginRight: 4 }} /> CONVERT
                        </button>
                      )}
                      <button className="btn-danger" onClick={() => remove(q.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
                    {q.email && <div><span style={{ color: "var(--concrete)" }}>EMAIL ▸</span> {q.email}</div>}
                    {q.phone && <div><span style={{ color: "var(--concrete)" }}>PHONE ▸</span> {q.phone}</div>}
                    {q.pickup && <div><span style={{ color: "var(--concrete)" }}>PICKUP ▸</span> {q.pickup}</div>}
                    {q.dropoff && <div><span style={{ color: "var(--concrete)" }}>DROPOFF ▸</span> {q.dropoff}</div>}
                    {q.material && <div><span style={{ color: "var(--concrete)" }}>MATERIAL ▸</span> {q.material}</div>}
                    {q.quantity && <div><span style={{ color: "var(--concrete)" }}>QTY ▸</span> {q.quantity}</div>}
                  </div>
                  {q.notes && <div style={{ marginTop: 12, padding: 10, background: "#F5F5F4", fontSize: 13, borderLeft: "3px solid var(--hazard)" }}>{q.notes}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ========== QUOTE CONVERSION FORM ==========
// Simple modal form focused on the 2 required fields (date + truck count) + optional rate
const QuoteConversionForm = ({ quote, draft, dispatches, setDispatches, projects, contacts, onSave, onCancel, onToast }) => {
  const [form, setForm] = useState({
    ...draft,
    ratePerHour: "142",
    ratePerTon: "",
    projectId: null,
    subContractor: "",
    subContractorId: "",
    quarryId: null,
  });

  const customers = contacts.filter((c) => c.type === "customer");
  const availableProjects = form.clientId
    ? projects.filter((p) => String(p.customerId) === String(form.clientId))
    : projects;

  const save = async () => {
    if (!form.jobName) { onToast("JOB NAME REQUIRED"); return; }
    if (!form.date) { onToast("DATE REQUIRED"); return; }
    if (!Number(form.trucksExpected) || Number(form.trucksExpected) < 1) { onToast("ENTER # OF TRUCKS"); return; }

    // Generate a unique code
    const year = new Date().getFullYear();
    const existing = dispatches.filter((d) => d.code?.startsWith(`${year}-`));
    const maxN = existing.reduce((m, d) => {
      const n = parseInt(String(d.code).split("-")[1], 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    const code = `${year}-${String(maxN + 1).padStart(4, "0")}`;

    const newOrder = {
      id: "temp-" + Date.now(),
      code,
      ...form,
      trucksExpected: Number(form.trucksExpected),
      ratePerHour: form.ratePerHour ? Number(form.ratePerHour) : null,
      ratePerTon: form.ratePerTon ? Number(form.ratePerTon) : null,
      assignments: [],
      assignedDriverIds: [],
      assignedDriverNames: [],
      status: "open",
      createdAt: new Date().toISOString(),
    };

    const next = [newOrder, ...dispatches];
    try {
      await setDispatches(next);
      // Wait briefly so Supabase returns the real id, then finalize conversion
      setTimeout(async () => {
        // Find the actual saved order (code-matched)
        const saved = dispatches.find((d) => d.code === code) || newOrder;
        await onSave(saved);
      }, 600);
      onToast(`✓ ORDER #${code} CREATED`);
    } catch (e) {
      console.error(e);
      onToast("CONVERSION FAILED");
    }
  };

  return (
    <div className="modal-bg" onClick={onCancel} style={{ zIndex: 105 }}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div style={{ padding: "18px 22px", background: "var(--good)", color: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em" }}>CONVERT QUOTE → ORDER</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>{quote.name}{quote.company ? ` · ${quote.company}` : ""}</h3>
          </div>
          <button onClick={onCancel} style={{ background: "transparent", border: "none", color: "#FFF", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 12 }}>
          <div style={{ padding: 10, background: "#FEF3C7", border: "2px solid var(--hazard)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--hazard-deep)" }}>
            ⚠ FILL IN <strong>DATE</strong> AND <strong>TRUCKS EXPECTED</strong> TO CONTINUE · OTHER FIELDS PRE-FILLED FROM QUOTE
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label" style={{ color: "var(--hazard-deep)" }}>Date * (required)</label>
              <input className="fbt-input" type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ borderColor: "var(--hazard)" }} />
            </div>
            <div>
              <label className="fbt-label" style={{ color: "var(--hazard-deep)" }}>Trucks Expected * (required)</label>
              <input className="fbt-input" type="number" min="1" value={form.trucksExpected} onChange={(e) => setForm({ ...form, trucksExpected: e.target.value })} style={{ borderColor: "var(--hazard)" }} />
            </div>
          </div>

          <div>
            <label className="fbt-label">Job Name</label>
            <input className="fbt-input" value={form.jobName} onChange={(e) => setForm({ ...form, jobName: e.target.value })} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Customer</label>
              <select className="fbt-select" value={form.clientId || ""} onChange={(e) => {
                const id = e.target.value;
                const c = customers.find((x) => String(x.id) === id);
                setForm({ ...form, clientId: c?.id || "", clientName: c?.companyName || "" });
              }}>
                <option value="">— {form.clientName || "No customer link"} —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>)}
              </select>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>
                ▸ {form.clientId ? "LINKED TO CUSTOMER CONTACT" : "NO CUSTOMER CONTACT MATCHED — CREATE ONE IN CONTACTS FOR FUTURE USE"}
              </div>
            </div>
            <div>
              <label className="fbt-label">Project (optional)</label>
              <select className="fbt-select" value={form.projectId || ""} onChange={(e) => setForm({ ...form, projectId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— None —</option>
                {availableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.defaultRate ? ` · $${p.defaultRate}/hr` : ""}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Pickup</label>
              <input className="fbt-input" value={form.pickup || ""} onChange={(e) => setForm({ ...form, pickup: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Dropoff</label>
              <input className="fbt-input" value={form.dropoff || ""} onChange={(e) => setForm({ ...form, dropoff: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Material</label>
              <input className="fbt-input" value={form.material || ""} onChange={(e) => setForm({ ...form, material: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Rate $/hr</label>
              <input className="fbt-input" type="number" value={form.ratePerHour || ""} onChange={(e) => setForm({ ...form, ratePerHour: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Rate $/ton</label>
              <input className="fbt-input" type="number" step="0.01" value={form.ratePerTon || ""} onChange={(e) => setForm({ ...form, ratePerTon: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="fbt-label">Notes</label>
            <textarea className="fbt-textarea" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", padding: 10, background: "#F5F5F4" }}>
            ▸ AFTER SAVING: ADD SUBS / DRIVERS ON THE ORDERS TAB · SHARE DRIVER LINKS · MARK AS DISPATCHED WHEN READY
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} className="btn-primary" style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}>
              <CheckCircle2 size={16} /> CREATE ORDER FROM QUOTE
            </button>
            <button onClick={onCancel} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FleetTab = ({ fleet, setFleet, contacts = [], onToast }) => {
  const [draft, setDraft] = useState({ unit: "", type: "Super Dump", driver: "", driverId: null, status: "available", notes: "" });
  const driverContacts = contacts.filter((c) => c.type === "driver");

  const add = async () => {
    if (!draft.unit) { onToast("UNIT # REQUIRED"); return; }
    const next = [...fleet, { ...draft, id: Date.now() }];
    setFleet(next); await storageSet("fbt:fleet", next);
    setDraft({ unit: "", type: "Super Dump", driver: "", driverId: null, status: "available", notes: "" });
    onToast("UNIT ADDED");
  };
  const update = async (id, field, value) => { const next = fleet.map((f) => f.id === id ? { ...f, [field]: value } : f); setFleet(next); await storageSet("fbt:fleet", next); };
  const updateDriver = async (id, driverId) => {
    const contact = driverId ? contacts.find((c) => c.id === Number(driverId) || c.id === driverId) : null;
    const next = fleet.map((f) => f.id === id ? { ...f, driverId: driverId || null, driver: contact ? (contact.companyName || contact.contactName) : "" } : f);
    setFleet(next); await storageSet("fbt:fleet", next);
  };
  const remove = async (id) => { const next = fleet.filter((f) => f.id !== id); setFleet(next); await storageSet("fbt:fleet", next); onToast("UNIT REMOVED"); };
  const statusColor = (s) => ({ available: "var(--good)", dispatched: "var(--hazard-deep)", maintenance: "var(--safety)", offline: "var(--concrete)" }[s] || "var(--concrete)");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>ADD FLEET UNIT</h3></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <div><label className="fbt-label">Unit #</label><input className="fbt-input" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="T-01" /></div>
          <div><label className="fbt-label">Type</label><select className="fbt-select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}><option>Super Dump</option><option>Transfer End Dump</option><option>Truck & Trailer</option><option>End Dump</option><option>Other</option></select></div>
          <div>
            <label className="fbt-label">Driver</label>
            {driverContacts.length > 0 ? (
              <select
                className="fbt-select"
                value={draft.driverId || ""}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) { setDraft({ ...draft, driverId: null, driver: "" }); return; }
                  const c = contacts.find((x) => String(x.id) === id);
                  if (c) setDraft({ ...draft, driverId: c.id, driver: c.companyName || c.contactName });
                }}
              >
                <option value="">— Unassigned —</option>
                {driverContacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>
                ))}
              </select>
            ) : (
              <input className="fbt-input" value={draft.driver} onChange={(e) => setDraft({ ...draft, driver: e.target.value })} placeholder="Add driver contacts for a picker" />
            )}
          </div>
          <div><label className="fbt-label">Status</label><select className="fbt-select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="available">Available</option><option value="dispatched">Dispatched</option><option value="maintenance">Maintenance</option><option value="offline">Offline</option></select></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="fbt-label">Notes</label><input className="fbt-input" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
        </div>
        <button onClick={add} className="btn-primary" style={{ marginTop: 18 }}><Plus size={16} /> ADD UNIT</button>
      </div>
      <div className="fbt-card" style={{ padding: 0 }}>
        <div style={{ padding: "18px 24px", borderBottom: "2px solid var(--steel)", display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>FLEET ROSTER</h3></div>
        {fleet.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
            <Truck size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div className="fbt-mono" style={{ fontSize: 13 }}>NO UNITS ON ROSTER</div>
          </div>
        ) : (
          <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {fleet.map((f) => (
              <div key={f.id} style={{ border: "2px solid var(--steel)", background: "#FFF", position: "relative" }}>
                <div className="hazard-stripe-thin" style={{ height: 6 }} />
                <div style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div className="fbt-display" style={{ fontSize: 24 }}>{f.unit}</div>
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{f.type}</div>
                    </div>
                    <div style={{ padding: "4px 10px", background: statusColor(f.status), color: "#FFF", fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>● {f.status}</div>
                  </div>
                  <div style={{ marginTop: 14, fontSize: 13, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)" }}>DRIVER ▸ {f.driver || "unassigned"}{f.driverId ? " · LINKED" : ""}</div>
                  {driverContacts.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <select
                        className="fbt-select"
                        style={{ padding: "4px 8px", fontSize: 10 }}
                        value={f.driverId || ""}
                        onChange={(e) => updateDriver(f.id, e.target.value)}
                      >
                        <option value="">— Unassigned —</option>
                        {driverContacts.map((c) => (
                          <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {f.notes && <div style={{ marginTop: 8, fontSize: 12, color: "var(--concrete)" }}>{f.notes}</div>}
                  <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
                    <select className="fbt-select" style={{ padding: "6px 8px", fontSize: 11 }} value={f.status} onChange={(e) => update(f.id, "status", e.target.value)}>
                      <option value="available">Available</option><option value="dispatched">Dispatched</option><option value="maintenance">Maintenance</option><option value="offline">Offline</option>
                    </select>
                    <button className="btn-danger" onClick={() => remove(f.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ========== PRINT-BASED INVOICE GENERATION ==========
// Opens a styled print window — user hits Print and saves as PDF from browser dialog.
// Works on mobile (Safari/Chrome both support "Save as PDF" in print dialog).
const generateInvoicePDF = async (invoice, company, freightBills, pricing) => {
  // v18 Task B: clean invoice layout matching the actual 4 Brothers printed invoice.
  // Sparse table · FB headers with sub-rows for tolls/dump/etc · left-aligned Bill To ·
  // centered circular logo · boxed total · customizable terms footer.
  const esc = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
  const fmtQty = (n) => Number(n || 0).toFixed(2);
  const rate = Number(pricing.rate) || 0;

  const fmtFullDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" }) : "";
  const fmtLongDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "";

  // Inline SVG logo — circular mark with "4 BROTHERS" banner, "4B" in center.
  // Monochrome to print cleanly on any black-and-white printer.
  const logoSvg = `<svg viewBox="0 0 120 120" width="88" height="88" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" fill="#FFF" stroke="#1C1917" stroke-width="3"/>
    <circle cx="60" cy="60" r="48" fill="none" stroke="#1C1917" stroke-width="1"/>
    <!-- banner -->
    <path d="M 10 56 L 110 56 L 110 74 L 10 74 Z" fill="#1C1917"/>
    <path d="M 2 58 L 10 56 L 10 74 L 2 76 Z" fill="#1C1917"/>
    <path d="M 118 58 L 110 56 L 110 74 L 118 76 Z" fill="#1C1917"/>
    <!-- banner text -->
    <text x="60" y="69" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="10" font-weight="900" fill="#FFF" letter-spacing="0.5">4 BROTHERS</text>
    <!-- 4B center -->
    <text x="60" y="38" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="22" font-weight="900" fill="#1C1917" letter-spacing="-1">4B</text>
    <!-- decorative line top -->
    <path d="M 22 44 Q 60 32 98 44" fill="none" stroke="#1C1917" stroke-width="1.2"/>
    <!-- base text -->
    <text x="60" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" font-weight="700" fill="#1C1917" letter-spacing="1">TRUCKING, LLC</text>
  </svg>`;

  // Per-FB rows: "main row" has date + FB# + truck + first-line description, qty, rate, amount.
  // Sub-rows have blank date/FB#/truck and just description/qty/rate/amount — matches sample.
  const rowsHtml = freightBills.map((fb) => {
    const fbDate = fb.submittedAt ? fmtFullDate(fb.submittedAt) : "";
    const hasLines = Array.isArray(fb.billingLines) && fb.billingLines.length > 0;

    if (hasLines) {
      return fb.billingLines.map((ln, lnIdx) => {
        const isFirst = lnIdx === 0;
        // Description — if HOURLY show "HOURLY", if LOAD show "LOAD", if TOLL show "TOLL EMPTY" or "TOLL LOADED" etc.
        const desc = (ln.item || ln.code || "").toUpperCase();
        const qty = Number(ln.qty) || 0;
        const rate = Number(ln.rate) || 0;
        const amt = Number(ln.net) || 0;
        return `<tr class="line ${isFirst ? 'line-first' : 'line-sub'}">
          <td>${isFirst ? esc(fbDate) : ''}</td>
          <td>${isFirst ? esc(fb.freightBillNumber || '—') : ''}</td>
          <td>${isFirst ? esc(fb.truckNumber || '') : ''}</td>
          <td>${esc(desc)}</td>
          <td class="r">${fmtQty(qty)}</td>
          <td class="r">${money(rate)}</td>
          <td class="r">${money(amt)}</td>
        </tr>`;
      }).join("");
    }

    // LEGACY FB — no billingLines. Render a single row using the invoice's global rate/method.
    let qty = 0;
    if (pricing.method === "ton") qty = Number(fb.tonnage) || 0;
    else if (pricing.method === "load") qty = Number(fb.loadCount) || 1;
    else if (pricing.method === "hour") qty = Number(fb.hoursOverride || 0);
    const desc = pricing.method === "ton" ? "TONS" : pricing.method === "load" ? "LOAD" : "HOURLY";
    const amt = qty * rate;
    return `<tr class="line line-first">
      <td>${esc(fbDate)}</td>
      <td>${esc(fb.freightBillNumber || '—')}</td>
      <td>${esc(fb.truckNumber || '')}</td>
      <td>${desc}</td>
      <td class="r">${fmtQty(qty)}</td>
      <td class="r">${money(rate)}</td>
      <td class="r">${money(amt)}</td>
    </tr>`;
  }).join("");

  // Subtotal = sum of all billingLines net, or legacy calc
  const subtotal = freightBills.reduce((s, fb) => {
    if (Array.isArray(fb.billingLines) && fb.billingLines.length > 0) {
      return s + fb.billingLines.reduce((ss, ln) => ss + (Number(ln.net) || 0), 0);
    }
    let qty = 0;
    if (pricing.method === "ton") qty = Number(fb.tonnage) || 0;
    else if (pricing.method === "load") qty = Number(fb.loadCount) || 1;
    else if (pricing.method === "hour") qty = Number(fb.hoursOverride || 0);
    return s + qty * rate;
  }, 0);

  // Invoice-level extras, fees, discount (rendered as extra table rows under the FBs)
  const extraFees = Number(invoice.extraFees) || 0;
  const invoiceExtras = (invoice.extras || []).filter((x) => x.label || Number(x.amount));
  const invoiceExtrasSum = invoiceExtras.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const discount = Number(invoice.discount) || 0;
  // Legacy-only: FB-level extras that haven't been converted to lines (pre-v16 FBs)
  const fbExtrasSum = freightBills.reduce((s, fb) => {
    if (Array.isArray(fb.billingLines) && fb.billingLines.length > 0) return s;
    return s + (fb.extras || [])
      .filter((x) => x.reimbursable !== false)
      .reduce((ss, x) => ss + (Number(x.amount) || 0), 0);
  }, 0);
  const total = subtotal + fbExtrasSum + extraFees + invoiceExtrasSum - discount;

  // Extra invoice-level rows (tolls/dump/fuel/other added at invoice time)
  const invoiceExtrasRows = invoiceExtras.map((x) => `
    <tr class="line line-first">
      <td></td><td></td><td></td>
      <td>${esc((x.label || "").toUpperCase())}</td>
      <td class="r">1.00</td>
      <td class="r">${money(x.amount)}</td>
      <td class="r">${money(x.amount)}</td>
    </tr>
  `).join("");

  // Optional scale ticket photos at the end
  const photos = invoice.includePhotos
    ? freightBills.flatMap((fb) => (fb.photos || []).map((p) => ({ ...p, fbNum: fb.freightBillNumber })))
    : [];
  const photosHtml = photos.length
    ? `<div class="photos">
        <h3 style="text-align:center;font-size:11pt;margin:30px 0 12px;letter-spacing:0.1em;">ATTACHED SCALE TICKETS / FREIGHT BILLS</h3>
        <div class="photo-grid">
          ${photos.map((p) => `<div class="photo-item">
            <img src="${p.dataUrl}" alt="scale ticket" />
            <div class="photo-label">FB #${esc(p.fbNum || "")}</div>
          </div>`).join("")}
        </div>
      </div>`
    : "";

  // Footer terms — from invoice.terms (per-invoice override) or company.defaultTerms
  const footerTerms = invoice.terms || company.defaultTerms || "Net 30 Days. Unpaid balance is subject to 1 1/2% service charge per month and any and all cost of collections.";

  // Company header info (left column)
  const companyAddr = company.address ? company.address.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const companyLines = [
    company.name || "4 BROTHERS TRUCKING, LLC",
    ...companyAddr,
    company.phone ? `Office: ${company.phone}` : "",
    company.email || "",
  ].filter(Boolean);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${esc(invoice.invoiceNumber)} — ${esc(invoice.billToName || "")}</title>
<style>
  @page { margin: 0.5in; size: letter; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 18px; font-family: 'Times New Roman', Times, serif; color: #000; font-size: 10pt; line-height: 1.35; }
  .btn-print { position: fixed; top: 10px; right: 10px; padding: 10px 20px; background: #F59E0B; color: #000; border: 2px solid #000; font-weight: 900; cursor: pointer; font-size: 11pt; letter-spacing: 0.06em; box-shadow: 3px 3px 0 #000; z-index: 999; font-family: Arial, sans-serif; }
  @media print { .btn-print { display: none; } body { padding: 0; } }

  /* HEADER ─────────────────────────────────────── */
  .hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 26px; }
  .hdr-left { flex: 1; }
  .hdr-left .co-name { font-weight: 700; font-size: 11pt; text-transform: uppercase; letter-spacing: 0.02em; }
  .hdr-left .co-line { font-size: 10pt; color: #000; }
  .hdr-logo { flex-shrink: 0; padding: 0 20px; }
  .hdr-right { flex: 1; text-align: right; font-size: 10pt; }
  .hdr-right .invoice-num { font-weight: 700; font-size: 11pt; margin-bottom: 2px; }

  /* BILL TO ─────────────────────────────────────── */
  .billto { margin-bottom: 16px; }
  .billto .label { font-size: 9pt; color: #555; font-style: italic; margin-bottom: 2px; }
  .billto .name { font-size: 11pt; font-weight: 700; text-transform: uppercase; }
  .billto .addr { font-size: 10pt; color: #333; }

  .jobref { margin-bottom: 16px; font-size: 10pt; }
  .jobref strong { font-weight: 700; }

  /* LINE ITEMS TABLE ─────────────────────────────────────── */
  table.lines { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  table.lines thead th {
    background: #E5E5E5;
    font-size: 9.5pt;
    font-weight: 700;
    text-align: left;
    padding: 4px 6px;
    border: 1px solid #000;
  }
  table.lines thead th.r { text-align: right; }
  table.lines td {
    font-size: 9.5pt;
    padding: 2px 6px;
    border: 1px solid #000;
    vertical-align: top;
  }
  table.lines td.r { text-align: right; }
  table.lines tr.line-sub td:nth-child(-n+3) { border-top: none; border-bottom: none; }
  /* Column widths (total fits letter page @ 0.5in margins ≈ 7.5in) */
  table.lines th:nth-child(1), table.lines td:nth-child(1) { width: 8%; }
  table.lines th:nth-child(2), table.lines td:nth-child(2) { width: 10%; }
  table.lines th:nth-child(3), table.lines td:nth-child(3) { width: 8%; }
  table.lines th:nth-child(4), table.lines td:nth-child(4) { width: 38%; }
  table.lines th:nth-child(5), table.lines td:nth-child(5) { width: 9%; }
  table.lines th:nth-child(6), table.lines td:nth-child(6) { width: 12%; }
  table.lines th:nth-child(7), table.lines td:nth-child(7) { width: 15%; }

  /* TOTAL ROW ─────────────────────────────────────── */
  .total-row { display: flex; justify-content: flex-end; margin-top: 6px; font-size: 11pt; }
  .total-row .total-box {
    border: 2px solid #000;
    padding: 6px 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    display: flex;
    gap: 40px;
    min-width: 340px;
    justify-content: space-between;
  }

  .thank-you { text-align: center; font-size: 11pt; font-style: italic; margin-top: 24px; }
  .terms { text-align: center; font-size: 9pt; color: #444; margin-top: 6px; padding: 0 20px; line-height: 1.4; }

  /* PHOTOS ─────────────────────────────────────── */
  .photos { page-break-before: always; margin-top: 40px; }
  .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  .photo-item { border: 1px solid #1C1917; padding: 4px; }
  .photo-item img { width: 100%; max-height: 400px; object-fit: contain; display: block; }
  .photo-label { font-family: Menlo, monospace; font-size: 8pt; text-align: center; padding: 4px; background: #F5F5F4; }
</style></head>
<body>
<button class="btn-print" onclick="window.print()">🖨 PRINT / SAVE AS PDF</button>

<div class="hdr">
  <div class="hdr-left">
    ${companyLines.map((l, i) => `<div class="${i === 0 ? 'co-name' : 'co-line'}">${esc(l)}</div>`).join("")}
  </div>
  <div class="hdr-logo">${logoSvg}</div>
  <div class="hdr-right">
    <div class="invoice-num">INVOICE: ${esc(invoice.invoiceNumber)}</div>
    <div>Date: ${esc(fmtLongDate(invoice.invoiceDate))}</div>
    ${invoice.dueDate ? `<div>Due: ${esc(fmtLongDate(invoice.dueDate))}</div>` : ''}
    ${invoice.poNumber ? `<div>PO #: ${esc(invoice.poNumber)}</div>` : ''}
  </div>
</div>

${(invoice.jobReference || '') ? `<div class="jobref"><strong>Customer Job:</strong> ${esc(invoice.jobReference)}</div>` : ''}

<div class="billto">
  <div class="label">Bill To:</div>
  <div class="name">${esc(invoice.billToName || '—')}</div>
  ${invoice.billToContact ? `<div class="addr">Attn: ${esc(invoice.billToContact)}</div>` : ''}
  ${invoice.billToAddress ? `<div class="addr">${esc(invoice.billToAddress)}</div>` : ''}
</div>

<table class="lines">
  <thead>
    <tr>
      <th>Date</th>
      <th>Ft Bill</th>
      <th>Truck</th>
      <th>Description</th>
      <th class="r">Qty</th>
      <th class="r">Rate</th>
      <th class="r">Amount</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
    ${invoiceExtrasRows}
    ${Number(extraFees) > 0 ? `
      <tr class="line line-first">
        <td></td><td></td><td></td>
        <td>${esc((invoice.extraFeesLabel || "ADDITIONAL FEES").toUpperCase())}</td>
        <td class="r">1.00</td>
        <td class="r">${money(extraFees)}</td>
        <td class="r">${money(extraFees)}</td>
      </tr>
    ` : ''}
    ${Number(discount) > 0 ? `
      <tr class="line line-first">
        <td></td><td></td><td></td>
        <td>DISCOUNT</td>
        <td class="r">1.00</td>
        <td class="r">-${money(discount)}</td>
        <td class="r">-${money(discount)}</td>
      </tr>
    ` : ''}
  </tbody>
</table>

<div class="total-row">
  <div class="total-box">
    <span>Please Pay This Amount:</span>
    <span>${money(total)}</span>
  </div>
</div>

<div class="thank-you">Thank you for your business</div>
<div class="terms">${esc(footerTerms)}</div>

${invoice.notes ? `<div class="terms" style="margin-top:14px;font-size:8.5pt;">${esc(invoice.notes)}</div>` : ''}

${photosHtml}

</body></html>`;

  const w = window.open("", "_blank", "width=850,height=1100");
  if (!w) throw new Error("Popup blocked — please allow popups to generate invoices.");
  w.document.write(html);
  w.document.close();
  return { opened: true };
};

// ========== CUSTOMER STATEMENT PDF (v18) ==========
// Statement showing all invoices for a customer over a date range with running balance.
// Same invoice-style layout: logo · header · To block · sparse table · total due.
const generateCustomerStatementPDF = ({ customer, invoices, company, fromDate, toDate, openOnly = false }) => {
  const esc = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
  const fmtFullDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" }) : "";
  const fmtLongDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "";

  const logoSvg = `<svg viewBox="0 0 120 120" width="88" height="88" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" fill="#FFF" stroke="#1C1917" stroke-width="3"/>
    <circle cx="60" cy="60" r="48" fill="none" stroke="#1C1917" stroke-width="1"/>
    <path d="M 10 56 L 110 56 L 110 74 L 10 74 Z" fill="#1C1917"/>
    <path d="M 2 58 L 10 56 L 10 74 L 2 76 Z" fill="#1C1917"/>
    <path d="M 118 58 L 110 56 L 110 74 L 118 76 Z" fill="#1C1917"/>
    <text x="60" y="69" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="10" font-weight="900" fill="#FFF" letter-spacing="0.5">4 BROTHERS</text>
    <text x="60" y="38" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="22" font-weight="900" fill="#1C1917" letter-spacing="-1">4B</text>
    <path d="M 22 44 Q 60 32 98 44" fill="none" stroke="#1C1917" stroke-width="1.2"/>
    <text x="60" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" font-weight="700" fill="#1C1917" letter-spacing="1">TRUCKING, LLC</text>
  </svg>`;

  // Filter invoices for this customer + optional date range + optional open-only
  const custInvoices = invoices.filter((inv) => {
    // Match by billToId (customer.id) if set, else by billToName (case-insensitive)
    const matchesCustomer = inv.billToId
      ? String(inv.billToId) === String(customer.id)
      : (inv.billToName || "").toLowerCase() === (customer.companyName || customer.contactName || "").toLowerCase();
    if (!matchesCustomer) return false;

    const invDate = inv.invoiceDate || inv.createdAt || "";
    if (fromDate && invDate.slice(0, 10) < fromDate) return false;
    if (toDate && invDate.slice(0, 10) > toDate) return false;

    if (openOnly) {
      const paid = Number(inv.amountPaid || 0);
      const total = Number(inv.total || 0);
      if (paid >= total - 0.01) return false;  // fully paid → exclude
    }
    return true;
  }).sort((a, b) => (a.invoiceDate || "").localeCompare(b.invoiceDate || ""));

  // Build rows with running balance
  let runningBalance = 0;
  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalBalance = 0;

  const rowsHtml = custInvoices.map((inv) => {
    const invTotal = Number(inv.total) || 0;
    const paid = Number(inv.amountPaid || 0);
    const balance = invTotal - paid;
    runningBalance += balance;
    totalInvoiced += invTotal;
    totalPaid += paid;
    totalBalance = runningBalance;

    const isOverdue = inv.dueDate && balance > 0 && new Date(inv.dueDate) < new Date();
    const statusColor = balance <= 0.01 ? "#047857" : isOverdue ? "#B91C1C" : "#92400E";
    const statusLabel = balance <= 0.01 ? "PAID" : isOverdue ? "OVERDUE" : "OPEN";

    return `<tr>
      <td style="font-weight:700;">${esc(inv.invoiceNumber || "—")}</td>
      <td>${esc(fmtFullDate(inv.invoiceDate))}</td>
      <td>${esc(fmtFullDate(inv.dueDate) || "—")}</td>
      <td class="r">${money(invTotal)}</td>
      <td class="r">${money(paid)}</td>
      <td class="r" style="color:${statusColor}; font-weight:700;">${money(balance)}</td>
      <td class="r">${money(runningBalance)}</td>
      <td style="color:${statusColor}; font-size:8.5pt; font-weight:700;">${statusLabel}</td>
    </tr>`;
  }).join("");

  const statementDate = new Date().toISOString();
  const statementNum = `ST-${new Date().getFullYear()}-${String(customer.id || "").slice(0, 8)}-${String(Date.now()).slice(-4)}`;

  // Pay To block (the customer)
  const custName = customer.companyName || customer.contactName || "—";
  const custContactName = customer.companyName && customer.contactName ? customer.contactName : "";
  const custAddress = customer.address || "";
  const custPhone = customer.phone || "";
  const custEmail = customer.email || "";

  const companyAddr = company?.address ? company.address.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const companyLines = [
    company?.name || "4 BROTHERS TRUCKING, LLC",
    ...companyAddr,
    company?.phone ? `Office: ${company.phone}` : "",
    company?.email || "",
  ].filter(Boolean);

  const rangeLabel = [
    fromDate ? fmtLongDate(fromDate) : "All time",
    toDate ? fmtLongDate(toDate) : fmtLongDate(statementDate),
  ].join(" — ");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Customer Statement — ${esc(custName)}</title>
<style>
  @page { margin: 0.5in; size: letter; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 18px; font-family: 'Times New Roman', Times, serif; color: #000; font-size: 10pt; line-height: 1.35; }
  .btn-print { position: fixed; top: 10px; right: 10px; padding: 10px 20px; background: #F59E0B; color: #000; border: 2px solid #000; font-weight: 900; cursor: pointer; font-size: 11pt; letter-spacing: 0.06em; box-shadow: 3px 3px 0 #000; z-index: 999; font-family: Arial, sans-serif; }
  @media print { .btn-print { display: none; } body { padding: 0; } }

  .hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 26px; }
  .hdr-left { flex: 1; }
  .hdr-left .co-name { font-weight: 700; font-size: 11pt; text-transform: uppercase; letter-spacing: 0.02em; }
  .hdr-left .co-line { font-size: 10pt; }
  .hdr-logo { flex-shrink: 0; padding: 0 20px; }
  .hdr-right { flex: 1; text-align: right; font-size: 10pt; }
  .hdr-right .stmt-num { font-weight: 700; font-size: 11pt; margin-bottom: 2px; }
  .hdr-right .stmt-kind { font-size: 9pt; color: #555; text-transform: uppercase; letter-spacing: 0.06em; }

  .tolabel { margin-bottom: 16px; }
  .tolabel .label { font-size: 9pt; color: #555; font-style: italic; margin-bottom: 2px; }
  .tolabel .name { font-size: 11pt; font-weight: 700; text-transform: uppercase; }
  .tolabel .sub { font-size: 10pt; color: #333; }

  table.lines { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  table.lines thead th {
    background: #E5E5E5;
    font-size: 9.5pt;
    font-weight: 700;
    text-align: left;
    padding: 4px 6px;
    border: 1px solid #000;
  }
  table.lines thead th.r { text-align: right; }
  table.lines td {
    font-size: 9.5pt;
    padding: 3px 6px;
    border: 1px solid #000;
  }
  table.lines td.r { text-align: right; }
  table.lines th:nth-child(1) { width: 12%; }
  table.lines th:nth-child(2) { width: 9%; }
  table.lines th:nth-child(3) { width: 9%; }
  table.lines th:nth-child(4) { width: 11%; }
  table.lines th:nth-child(5) { width: 11%; }
  table.lines th:nth-child(6) { width: 13%; }
  table.lines th:nth-child(7) { width: 13%; }
  table.lines th:nth-child(8) { width: 10%; }

  .summary-box { display: flex; justify-content: flex-end; margin-top: 10px; }
  .summary-inner { min-width: 340px; }
  .summary-inner .sum-row { display: flex; justify-content: space-between; padding: 3px 14px; font-size: 10pt; }
  .summary-inner .sum-row.sub { color: #444; }
  .summary-inner .total-box {
    border: 2px solid #000;
    padding: 6px 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    display: flex;
    gap: 40px;
    justify-content: space-between;
    margin-top: 4px;
    font-size: 11pt;
  }

  .range-label { font-size: 9pt; color: #444; font-style: italic; margin-bottom: 10px; }
  .filter-tag { display: inline-block; padding: 2px 8px; background: #E5E5E5; border: 1px solid #999; font-size: 9pt; margin-left: 6px; }

  .thank-you { text-align: center; font-size: 11pt; font-style: italic; margin-top: 24px; }
  .terms { text-align: center; font-size: 9pt; color: #444; margin-top: 6px; padding: 0 20px; line-height: 1.4; }
</style></head>
<body>
<button class="btn-print" onclick="window.print()">🖨 PRINT / SAVE AS PDF</button>

<div class="hdr">
  <div class="hdr-left">
    ${companyLines.map((l, i) => `<div class="${i === 0 ? 'co-name' : 'co-line'}">${esc(l)}</div>`).join("")}
  </div>
  <div class="hdr-logo">${logoSvg}</div>
  <div class="hdr-right">
    <div class="stmt-kind">CUSTOMER STATEMENT${openOnly ? " · OPEN ONLY" : ""}</div>
    <div class="stmt-num">${esc(statementNum)}</div>
    <div>Date: ${esc(fmtLongDate(statementDate))}</div>
  </div>
</div>

<div class="tolabel">
  <div class="label">To:</div>
  <div class="name">${esc(custName)}</div>
  ${custContactName ? `<div class="sub">Attn: ${esc(custContactName)}</div>` : ''}
  ${custAddress ? `<div class="sub">${esc(custAddress)}</div>` : ''}
  ${custPhone ? `<div class="sub">Phone: ${esc(custPhone)}</div>` : ''}
  ${custEmail ? `<div class="sub">Email: ${esc(custEmail)}</div>` : ''}
</div>

<div class="range-label">
  Period: ${esc(rangeLabel)}
  ${openOnly ? '<span class="filter-tag">OPEN INVOICES ONLY</span>' : '<span class="filter-tag">ALL INVOICES IN PERIOD</span>'}
</div>

<table class="lines">
  <thead>
    <tr>
      <th>Invoice #</th>
      <th>Date</th>
      <th>Due</th>
      <th class="r">Total</th>
      <th class="r">Paid</th>
      <th class="r">Balance</th>
      <th class="r">Running</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml || `<tr><td colspan="8" style="text-align:center; padding: 20px; color: #999; font-style: italic;">No invoices in the selected period.</td></tr>`}
  </tbody>
</table>

<div class="summary-box">
  <div class="summary-inner">
    <div class="sum-row sub">
      <span>Total Invoiced</span>
      <span>${money(totalInvoiced)}</span>
    </div>
    <div class="sum-row sub">
      <span>Total Paid</span>
      <span>−${money(totalPaid)}</span>
    </div>
    <div class="total-box">
      <span>Balance Due</span>
      <span>${money(totalBalance)}</span>
    </div>
  </div>
</div>

<div class="thank-you">Thank you for your business</div>
<div class="terms">Please remit payment for the balance due to ${esc(company?.name || "4 Brothers Trucking, LLC")}. Questions? Contact ${esc(company?.email || "office@4brotherstruck.com")}${company?.phone ? ` or ${esc(company.phone)}` : ""}.</div>

</body></html>`;

  const w = window.open("", "_blank", "width=850,height=1100");
  if (!w) throw new Error("Popup blocked — please allow popups to generate statement.");
  w.document.write(html);
  w.document.close();
  return { opened: true };
};

// ========== INVOICES TAB ==========

// ========== INVOICE VIEW MODAL (payment history) ==========
const InvoiceViewModal = ({ invoice, freightBills, contacts = [], dispatches = [], projects = [], editFreightBill, setInvoices, invoices = [], onJumpToPayroll, onClose, onToast }) => {
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

// ========== INVOICES TAB ==========
const InvoicesTab = ({ freightBills, dispatches, invoices, setInvoices, createInvoice, company, setCompany, contacts = [], projects = [], editFreightBill, pendingInvoice, clearPendingInvoice, onJumpToPayroll, onToast }) => {
  const [showProfile, setShowProfile] = useState(false);
  // Session C: collapse the massive inline builder into a modal. All builder logic stays the same;
  // we just hide it until the user clicks "New Invoice".
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  // v18 multi-mode: user picks one of 3 intake modes BEFORE filters are shown.
  // null = no mode selected yet (shows "Pick a mode to start" splash)
  // "select" = By Selecting — user checks individual FBs
  // "range" = By Date Range — all customer's FBs in date window auto-include
  // "project" = By Project — all FBs on a project auto-include
  const [builderMode, setBuilderMode] = useState(null);
  // FBs user has clicked to include (only used when mode==="select")
  const [selectedFbIds, setSelectedFbIds] = useState(new Set());
  // Which FBs have their billing lines expanded (click-to-toggle UI)
  const [expandedFbIds, setExpandedFbIds] = useState(new Set());
  // v18 Change B: LOCAL DRAFT per FB. Edits write here, NOT to parent state until admin clicks SAVE.
  // Shape: { [fbId]: [...billingLines] }. Presence = dirty. Absent = clean (use FB's saved lines).
  const [lineDrafts, setLineDrafts] = useState({});
  // Per-FB save status: "idle" | "saving" | "saved" | "error". Drives the button label + colors.
  const [fbSaveStatus, setFbSaveStatus] = useState({});

  // Reset builder state when modal opens/closes
  useEffect(() => {
    if (!showNewInvoice) {
      setBuilderMode(null);
      setSelectedFbIds(new Set());
      setExpandedFbIds(new Set());
      setLineDrafts({});
      setFbSaveStatus({});
    }
  }, [showNewInvoice]);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [pricingMethod, setPricingMethod] = useState("ton");
  const [rate, setRate] = useState("");
  const [billTo, setBillTo] = useState({ id: "", name: "", address: "", contact: "" });
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);

  // Auto-open invoice detail when jumping from home dashboard
  useEffect(() => {
    if (pendingInvoice) {
      const inv = invoices.find((i) => i.id === pendingInvoice || i.invoiceNumber === pendingInvoice);
      if (inv) setViewingInvoice(inv);
      if (clearPendingInvoice) clearPendingInvoice();
    }
  }, [pendingInvoice, invoices]);
  const [jobRef, setJobRef] = useState("");
  const [projectId, setProjectId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [terms, setTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [extras, setExtras] = useState([]); // [{label, amount}, ...]
  const [discount, setDiscount] = useState("");
  const [includePhotos, setIncludePhotos] = useState(true);
  const [hoursOverride, setHoursOverride] = useState({}); // fb.id -> hours for "per hour" pricing
  const [includeUnapproved, setIncludeUnapproved] = useState(false);
  const [showAlreadyInvoiced, setShowAlreadyInvoiced] = useState(false);

  useEffect(() => {
    if (company?.defaultTerms && !terms) setTerms(company.defaultTerms);
  }, [company]);

  // Helper: compute effective hours for an FB (admin-corrected takes priority)
  const effectiveHours = (fb) => {
    if (fb.hoursBilled !== null && fb.hoursBilled !== undefined && fb.hoursBilled !== "") return Number(fb.hoursBilled);
    // Fall back to pickup→dropoff
    if (fb.pickupTime && fb.dropoffTime) {
      const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
      const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
      if (!isNaN(h1) && !isNaN(h2)) {
        const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (mins > 0) return mins / 60;
      }
    }
    return 0;
  };

  // Billable hours for INVOICE — applies project minimum ONLY if admin has acknowledged
  // On the PAYROLL side we continue to use actual hours (effectiveHours).
  const billableHoursForInvoice = (fb) => {
    // v16 PREFERRED: if FB has billingLines with a HOURLY line, use that qty (admin-approved value)
    if (Array.isArray(fb.billingLines) && fb.billingLines.length > 0) {
      const hourLine = fb.billingLines.find((ln) => ln.code === "H");
      if (hourLine) return Number(hourLine.qty) || 0;
      return 0; // no hourly line on this FB — not an hour-billed FB
    }
    // LEGACY: derive from times
    const actual = effectiveHours(fb);
    if (!fb.minHoursApplied) return actual;
    const d = dispatches.find((x) => x.id === fb.dispatchId);
    const project = projects.find((p) => p.id === d?.projectId);
    const minH = Number(project?.minimumHours) || 0;
    if (minH > 0 && actual < minH) return minH;
    return actual;
  };

  // v18 Fix 2: recompute a billing line's gross + net after qty/rate/brokerage change.
  // Mirrors math.js recomputeLine but written locally here so the builder doesn't depend on it.
  const recomputeBuilderLine = (ln) => {
    const qty = Number(ln.qty) || 0;
    const rate = Number(ln.rate) || 0;
    const gross = Number((qty * rate).toFixed(2));
    const pct = Number(ln.brokeragePct) || 0;
    const net = ln.brokerable
      ? Number((gross - gross * pct / 100).toFixed(2))
      : gross;
    return { ...ln, qty, rate, gross, net };
  };

  // v18 Change B: get effective billing lines for an FB — draft if dirty, else the saved version.
  const getFbLines = (fbId) => {
    if (lineDrafts[fbId] !== undefined) return lineDrafts[fbId];
    const fb = freightBills.find((f) => f.id === fbId);
    return Array.isArray(fb?.billingLines) ? fb.billingLines : [];
  };

  // Is this FB's draft different from saved? (dirty)
  const isFbDirty = (fbId) => {
    if (lineDrafts[fbId] === undefined) return false;
    const fb = freightBills.find((f) => f.id === fbId);
    const saved = Array.isArray(fb?.billingLines) ? fb.billingLines : [];
    return JSON.stringify(saved) !== JSON.stringify(lineDrafts[fbId]);
  };

  // Mutate local draft only — no DB call. Save happens on button click.
  const builderUpdateLine = (fbId, lineId, patch) => {
    const currentLines = getFbLines(fbId);
    const next = currentLines.map((ln) => ln.id === lineId ? recomputeBuilderLine({ ...ln, ...patch }) : ln);
    setLineDrafts((prev) => ({ ...prev, [fbId]: next }));
    // Clear any stale "saved" status so user sees they have unsaved changes
    setFbSaveStatus((prev) => ({ ...prev, [fbId]: "idle" }));
  };

  const builderAddLine = (fbId, seed = {}) => {
    const fb = freightBills.find((f) => f.id === fbId);
    if (!fb) return;
    // Default brokerage ON for sub FBs (use the sub contact's %).
    // OFF for drivers + for pass-through codes (TOLL/DUMP/FUEL/OTHER are reimbursements, not revenue).
    const disp = dispatches.find((d) => d.id === fb.dispatchId);
    const assignment = disp ? (disp.assignments || []).find((a) => a.aid === fb.assignmentId) : null;
    const isSub = assignment?.kind === "sub";
    const subContact = isSub && assignment?.contactId ? contacts.find((c) => c.id === assignment.contactId) : null;
    const isPassThrough = ["TOLL", "DUMP", "FUEL"].includes(seed.code);
    const brokerableDefault = isSub && !!subContact?.brokerageApplies && !isPassThrough;
    const brokeragePctDefault = brokerableDefault ? Number(subContact?.brokeragePercent || 10) : 0;

    const newLine = recomputeBuilderLine({
      id: nextLineId(),
      code: seed.code || "OTHER",
      item: seed.item || "",
      qty: seed.qty != null ? Number(seed.qty) : 1,
      rate: seed.rate != null ? Number(seed.rate) : 0,
      brokerable: seed.brokerable != null ? !!seed.brokerable : brokerableDefault,
      brokeragePct: seed.brokeragePct != null ? Number(seed.brokeragePct) : brokeragePctDefault,
      copyToPay: false,
      isAdjustment: false,
    });
    const currentLines = getFbLines(fbId);
    setLineDrafts((prev) => ({ ...prev, [fbId]: [...currentLines, newLine] }));
    setFbSaveStatus((prev) => ({ ...prev, [fbId]: "idle" }));
  };

  const builderDeleteLine = (fbId, lineId) => {
    const currentLines = getFbLines(fbId);
    const next = currentLines.filter((ln) => ln.id !== lineId);
    setLineDrafts((prev) => ({ ...prev, [fbId]: next }));
    setFbSaveStatus((prev) => ({ ...prev, [fbId]: "idle" }));
  };

  // Commit local draft to DB via editFreightBill (full-FB spread, safe from partial-patch issue).
  const saveFbLines = async (fbId) => {
    const currentFb = freightBills.find((f) => f.id === fbId);
    if (!currentFb) {
      onToast("⚠ FB NOT FOUND");
      return;
    }
    const draft = lineDrafts[fbId];
    if (draft === undefined) {
      // Nothing to save
      return;
    }

    setFbSaveStatus((prev) => ({ ...prev, [fbId]: "saving" }));
    try {
      await editFreightBill(fbId, { ...currentFb, billingLines: draft });
      // Clear draft — FB now matches saved state
      setLineDrafts((prev) => {
        const next = { ...prev };
        delete next[fbId];
        return next;
      });
      setFbSaveStatus((prev) => ({ ...prev, [fbId]: "saved" }));
      onToast(`✓ FB#${currentFb.freightBillNumber || fbId} SAVED`);
      // Clear "saved" status after 2s
      setTimeout(() => {
        setFbSaveStatus((prev) => {
          if (prev[fbId] !== "saved") return prev;
          const next = { ...prev };
          delete next[fbId];
          return next;
        });
      }, 2000);
    } catch (e) {
      console.error("saveFbLines failed:", e);
      setFbSaveStatus((prev) => ({ ...prev, [fbId]: "error" }));
      onToast("⚠ SAVE FAILED — CHECK CONNECTION");
    }
  };

  // Discard local draft — revert to saved lines.
  const discardFbDraft = (fbId) => {
    setLineDrafts((prev) => {
      const next = { ...prev };
      delete next[fbId];
      return next;
    });
    setFbSaveStatus((prev) => {
      const next = { ...prev };
      delete next[fbId];
      return next;
    });
  };

  // Filter freight bills by date + client (dispatch sub/job) + APPROVED status + invoice binding
  const matchedBills = useMemo(() => {
    // v18: mode-aware requirements for auto-inclusion.
    // "range" mode requires customer + both dates before anything shows.
    // "project" mode requires customer + project before anything shows.
    // "select" mode shows all matching FBs the user could check (broader filters).
    // null mode = no mode chosen yet, show nothing.
    if (!builderMode) return [];
    if (builderMode === "range" && (!clientFilter || !fromDate || !toDate)) return [];
    if (builderMode === "project" && (!clientFilter || !projectId)) return [];

    const candidates = freightBills.filter((fb) => {
      const status = fb.status || "pending";
      if (!includeUnapproved && status !== "approved") return false;
      if (status === "rejected") return false;
      if (fb.invoiceId) return false;

      const fbDate = fb.submittedAt ? fb.submittedAt.slice(0, 10) : "";
      if (fromDate && fbDate < fromDate) return false;
      if (toDate && fbDate > toDate) return false;

      const disp = dispatches.find((d) => d.id === fb.dispatchId);

      if (clientFilter) {
        if (String(disp?.clientId) !== String(clientFilter)) return false;
      }

      if (projectId) {
        if (String(disp?.projectId) !== String(projectId)) return false;
      }

      return true;
    });

    // In "select" mode, only return FBs the user has explicitly selected.
    // In "range" / "project" mode, return all candidates (auto-include).
    if (builderMode === "select") {
      return candidates.filter((fb) => selectedFbIds.has(fb.id));
    }
    return candidates;
  }, [freightBills, dispatches, fromDate, toDate, clientFilter, projectId, includeUnapproved, builderMode, selectedFbIds]);

  // For "select" mode: all FBs the user could potentially select from (used for the checkbox list).
  const selectableBills = useMemo(() => {
    if (builderMode !== "select") return [];
    return freightBills.filter((fb) => {
      const status = fb.status || "pending";
      if (!includeUnapproved && status !== "approved") return false;
      if (status === "rejected") return false;
      if (fb.invoiceId) return false;

      const fbDate = fb.submittedAt ? fb.submittedAt.slice(0, 10) : "";
      if (fromDate && fbDate < fromDate) return false;
      if (toDate && fbDate > toDate) return false;

      const disp = dispatches.find((d) => d.id === fb.dispatchId);
      if (clientFilter) {
        if (String(disp?.clientId) !== String(clientFilter)) return false;
      }
      if (projectId) {
        if (String(disp?.projectId) !== String(projectId)) return false;
      }
      return true;
    }).sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  }, [freightBills, dispatches, fromDate, toDate, clientFilter, projectId, includeUnapproved, builderMode]);

  // When matchedBills change, auto-populate hoursOverride from fb.hoursBilled (if empty)
  useEffect(() => {
    setHoursOverride((prev) => {
      const next = { ...prev };
      let changed = false;
      matchedBills.forEach((fb) => {
        // Only auto-fill if user hasn't typed anything yet
        if (next[fb.id] === undefined || next[fb.id] === "") {
          const h = billableHoursForInvoice(fb);
          if (h > 0) {
            next[fb.id] = h.toFixed(2);
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [matchedBills]);

  const previewTotals = useMemo(() => {
    const r = Number(rate) || 0;
    let subtotal = 0;
    let fbExtrasSum = 0;
    let billingAdjSum = 0;

    matchedBills.forEach((fb) => {
      // v16 PREFERRED PATH: use billingLines[] sum(net) as authoritative FB billing total
      const hasLines = Array.isArray(fb.billingLines) && fb.billingLines.length > 0;

      if (hasLines) {
        // Sum the net of every billing line (already computed with brokerage if applicable)
        const linesTotal = fb.billingLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
        subtotal += linesTotal;
        // billingLines replaces extras + adjustments, so don't double-count
        return;
      }

      // LEGACY PATH: old snapshot + extras + adjustments (pre-v16 FBs)
      const hasSnapshot = fb.billedRate != null && fb.billedMethod;
      let qty = 0;
      let fbRate = r;
      const method = hasSnapshot ? fb.billedMethod : pricingMethod;

      if (hasSnapshot) {
        if (method === "ton") qty = Number(fb.billedTons) || 0;
        else if (method === "load") qty = Number(fb.billedLoads) || 0;
        else if (method === "hour") qty = Number(fb.billedHours) || 0;
        if (pricingMethod === "hour" && hoursOverride[fb.id] !== undefined && hoursOverride[fb.id] !== "") {
          qty = Number(hoursOverride[fb.id]) || 0;
        }
      } else {
        if (pricingMethod === "ton") qty = Number(fb.tonnage) || 0;
        else if (pricingMethod === "load") qty = Number(fb.loadCount) || 1;
        else if (pricingMethod === "hour") {
          const manual = hoursOverride[fb.id];
          if (manual !== undefined && manual !== "") qty = Number(manual) || 0;
          else qty = billableHoursForInvoice(fb);
        }
      }
      subtotal += qty * fbRate;

      // Legacy billing adjustments
      billingAdjSum += (fb.billingAdjustments || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);

      // Legacy reimbursable FB-level extras
      (fb.extras || []).forEach((x) => {
        if (x.reimbursable !== false) fbExtrasSum += Number(x.amount) || 0;
      });
    });

    const ef = 0;  // v18: extraFees state was removed (never written via UI). Kept at 0 for legacy total calc.
    const extrasSum = (extras || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const d = Number(discount) || 0;
    return {
      subtotal, extrasSum, fbExtrasSum, billingAdjSum,
      total: subtotal + ef + extrasSum + fbExtrasSum + billingAdjSum - d,
    };
  }, [matchedBills, rate, pricingMethod, hoursOverride, discount, extras]);

  // Reconciliation check — any source order for these FBs that isn't reconciled?
  const reconcileIssues = useMemo(() => {
    const orderIds = [...new Set(matchedBills.map((fb) => fb.dispatchId))];
    return orderIds
      .map((id) => dispatches.find((d) => d.id === id))
      .filter(Boolean)
      .filter((d) => !d.reconciledAt) // only unreconciled
      .map((d) => {
        const submitted = matchedBills.filter((fb) => fb.dispatchId === d.id).length;
        const total = freightBills.filter((fb) => fb.dispatchId === d.id).length;
        const expected = Number(d.trucksExpected) || 1;
        const noShow = Number(d.noShowCount) || 0;
        const unresolved = expected - (total + noShow);
        return { dispatch: d, submitted, total, expected, noShow, unresolved };
      });
  }, [matchedBills, dispatches, freightBills]);

  // Auto-recall rate from source orders / project
  const suggestedRateInfo = useMemo(() => {
    // Collect rates in priority: FB.customerRate > project.defaultRate > order.ratePerHour/ratePerTon
    const perFbRates = matchedBills.map((fb) => {
      // 1. Per-FB snapshot (set after last invoice)
      if (fb.customerRate && fb.customerRateMethod === pricingMethod) {
        return { rate: Number(fb.customerRate), source: `Previous invoice snapshot`, fbNum: fb.freightBillNumber };
      }
      // 2. Project default
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      const project = projects.find((p) => p.id === d?.projectId);
      if (project?.defaultRate) {
        return { rate: Number(project.defaultRate), source: `Project "${project.name}"`, fbNum: fb.freightBillNumber };
      }
      // 3. Order rate
      const orderRate = pricingMethod === "hour" ? d?.ratePerHour : d?.ratePerTon;
      if (orderRate) {
        return { rate: Number(orderRate), source: `Order #${d.code}`, fbNum: fb.freightBillNumber };
      }
      return null;
    }).filter(Boolean);

    if (perFbRates.length === 0) return { rates: [], suggested: null, mixed: false };
    const uniqueRates = [...new Set(perFbRates.map((s) => s.rate))];
    return {
      rates: perFbRates,
      suggested: uniqueRates.length === 1 ? uniqueRates[0] : null,
      mixed: uniqueRates.length > 1,
      uniqueRates,
    };
  }, [matchedBills, dispatches, projects, pricingMethod]);

  // Auto-apply suggested rate when rate field is empty
  useEffect(() => {
    if (!rate && suggestedRateInfo.suggested) {
      setRate(String(suggestedRateInfo.suggested));
    }
  }, [suggestedRateInfo.suggested]);

  // Auto-detect pricing method from the matched FBs: if most have tonnage, default to ton; else hour
  useEffect(() => {
    if (matchedBills.length === 0) return;
    // Only auto-set once (while user hasn't changed it)
    const withTon = matchedBills.filter((fb) => Number(fb.tonnage) > 0).length;
    const withHours = matchedBills.filter((fb) => billableHoursForInvoice(fb) > 0).length;
    // Prefer the method used in most FBs' source orders
    const methodFromOrders = new Map();
    matchedBills.forEach((fb) => {
      if (fb.customerRateMethod) methodFromOrders.set(fb.customerRateMethod, (methodFromOrders.get(fb.customerRateMethod) || 0) + 1);
    });
    if (methodFromOrders.size === 1) {
      const [m] = methodFromOrders.keys();
      setPricingMethod(m);
    } else if (withHours > withTon) {
      setPricingMethod("hour");
    } else if (withTon > 0) {
      setPricingMethod("ton");
    }
  }, [matchedBills.length]);

  // v18 fix: invoice number collisions. Local `invoices` array may be stale if prior inserts
  // succeeded on server but didn't flow back. Query server for max and use that as baseline.
  // If a concurrent insert still collides (23505 unique constraint), the retry loop in
  // generate() bumps the number and tries again.
  const makeInvoiceNumber = async () => {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Fetch the live max from the DB
    let serverMax = 0;
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("invoice_number")
        .like("invoice_number", `${prefix}%`);
      if (!error && Array.isArray(data)) {
        serverMax = data.reduce((m, row) => {
          const n = parseInt(String(row.invoice_number).split("-")[2], 10);
          return isNaN(n) ? m : Math.max(m, n);
        }, 0);
      }
    } catch (e) {
      console.warn("Could not fetch invoice numbers from server, falling back to local:", e);
    }

    // Also check local state (in case of just-inserted-not-yet-subscribed)
    const localMax = invoices
      .filter((i) => i.invoiceNumber?.startsWith(prefix))
      .reduce((m, i) => {
        const n = parseInt(i.invoiceNumber.split("-")[2], 10);
        return isNaN(n) ? m : Math.max(m, n);
      }, 0);

    const maxN = Math.max(serverMax, localMax);
    return `${prefix}${String(maxN + 1).padStart(4, "0")}`;
  };

  // Helper: bump the numeric portion of an invoice number by 1. Used by retry loop.
  const bumpInvoiceNumber = (num) => {
    const parts = String(num || "").split("-");
    if (parts.length !== 3) return num;
    const n = parseInt(parts[2], 10);
    if (isNaN(n)) return num;
    return `${parts[0]}-${parts[1]}-${String(n + 1).padStart(4, "0")}`;
  };

  const generate = async () => {
    if (matchedBills.length === 0) { onToast("NO FREIGHT BILLS MATCH FILTERS"); return; }
    if (!billTo.name) { onToast("PICK A CUSTOMER"); return; }

    // HARD GUARD: drop any FB that's already invoiced (belt-and-suspenders — filter should have excluded them)
    const billsToInvoice = matchedBills.filter((fb) => !fb.invoiceId);
    if (billsToInvoice.length === 0) {
      onToast("ALL MATCHED FBs ARE ALREADY INVOICED");
      return;
    }
    if (billsToInvoice.length !== matchedBills.length) {
      const skipped = matchedBills.length - billsToInvoice.length;
      const ok = confirm(`${skipped} FB${skipped !== 1 ? "s" : ""} already invoiced and will be SKIPPED. Proceed with the ${billsToInvoice.length} remaining?`);
      if (!ok) return;
    }

    let invoiceNumber = await makeInvoiceNumber();
    const invoiceDate = todayISO();

    const billsWithHours = billsToInvoice.map((fb) => {
      const manual = hoursOverride[fb.id];
      const qty = (manual !== undefined && manual !== "") ? Number(manual) : billableHoursForInvoice(fb);
      return { ...fb, hoursOverride: qty };
    });

    const buildInvoice = (invNum) => ({
      invoiceNumber: invNum,
      invoiceDate,
      dueDate,
      billToName: billTo.name,
      billToAddress: billTo.address,
      billToContact: billTo.contact,
      billToId: billTo.id || null,
      projectId: projectId || null,
      poNumber: poNumber || null,
      jobReference: jobRef,
      terms,
      notes,
      extraFees: 0,  // v18: removed from UI
      extraFeesLabel: "",  // v18: removed from UI
      extras: (extras || []).filter((x) => (x.label || x.amount) && Number(x.amount) !== 0),
      discount,
      includePhotos,
      pricingMethod,
      rate,
      freightBillIds: billsToInvoice.map((fb) => fb.id),
      subtotal: previewTotals.subtotal,
      total: previewTotals.total,
      createdAt: new Date().toISOString(),
    });

    let invoice = buildInvoice(invoiceNumber);

    try {
      // v18 Fix #2: Save invoice to DB FIRST, then generate PDF.
      // v18 duplicate-key fix: on 23505, retry with bumped number (up to 8 attempts).
      let savedInvoice;
      if (createInvoice) {
        let attempts = 0;
        const maxAttempts = 8;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          try {
            savedInvoice = await createInvoice(invoice);
            break;
          } catch (insertErr) {
            const isDup = insertErr?.code === "23505" || String(insertErr?.message || "").includes("invoices_invoice_number_key");
            attempts++;
            if (isDup && attempts < maxAttempts) {
              invoiceNumber = bumpInvoiceNumber(invoiceNumber);
              invoice = buildInvoice(invoiceNumber);
              console.warn(`[invoice] duplicate key, retrying with ${invoiceNumber} (attempt ${attempts + 1}/${maxAttempts})`);
              continue;
            }
            throw insertErr;
          }
        }
      } else {
        await setInvoices([invoice, ...invoices]);
        savedInvoice = invoice;
      }

      const realId = savedInvoice?.id;
      if (!realId) {
        onToast("⚠ INVOICE SAVED BUT FB LOCK FAILED — PLEASE REFRESH AND CHECK");
        return;
      }

      // Flow-back: lock each FB to this invoice + save rate/hours snapshots
      let hoursChanged = 0;
      let rateChanged = 0;
      const newRate = Number(rate);
      const lockStamp = new Date().toISOString();
      for (const fb of billsToInvoice) {
        const patch = { ...fb, invoiceId: realId, billingLockedAt: lockStamp };

        // Per-FB customer rate snapshot (legacy — still useful for audit)
        if (newRate > 0 && (Number(fb.customerRate) !== newRate || fb.customerRateMethod !== pricingMethod)) {
          patch.customerRate = newRate;
          patch.customerRateMethod = pricingMethod;
          rateChanged++;
        }

        // Billing snapshot — stamp from current invoice values (if not already set at approval)
        // This ensures even FBs approved before snapshot model get their billing locked in
        if (!fb.billedRate) patch.billedRate = newRate;
        if (!fb.billedMethod) patch.billedMethod = pricingMethod;
        if (pricingMethod === "hour" && fb.billedHours == null) {
          const manual = hoursOverride[fb.id];
          patch.billedHours = (manual !== undefined && manual !== "") ? Number(manual) : (Number(fb.hoursBilled) || 0);
        }
        if (pricingMethod === "ton" && fb.billedTons == null) patch.billedTons = Number(fb.tonnage) || 0;
        if (pricingMethod === "load" && fb.billedLoads == null) patch.billedLoads = Number(fb.loadCount) || 1;

        // Flow edited hours back to fb.hoursBilled (affects payroll for hour-paid subs)
        if (pricingMethod === "hour") {
          const manual = hoursOverride[fb.id];
          if (manual !== undefined && manual !== "") {
            const newHours = Number(manual);
            const oldHours = Number(fb.hoursBilled) || 0;
            if (Math.abs(newHours - oldHours) > 0.001) {
              patch.hoursBilled = newHours;
              patch.billedHours = newHours; // keep snapshot consistent
              hoursChanged++;
            }
          }
        }

        try {
          await editFreightBill(fb.id, patch);
        } catch (e) {
          console.warn("Could not update FB", fb.id, e);
        }
      }

      const msgs = [`✓ ${invoiceNumber} SAVED · ${billsToInvoice.length} FB${billsToInvoice.length !== 1 ? "S" : ""} LOCKED`];
      if (rateChanged > 0) msgs.push(`${rateChanged} RATE${rateChanged !== 1 ? "S" : ""} UPDATED`);
      if (hoursChanged > 0) msgs.push(`${hoursChanged} HOURS → PAYROLL`);
      onToast(msgs.join(" · "));

      // Now open the PDF window. If popup is blocked, invoice is already in the list
      // and the user can re-download from the invoice row.
      try {
        await generateInvoicePDF(invoice, company, billsWithHours, { method: pricingMethod, rate });
      } catch (pdfErr) {
        console.warn("PDF open failed:", pdfErr);
        onToast("⚠ INVOICE SAVED BUT POPUP BLOCKED — CLICK 'RE-DOWNLOAD' ON THE INVOICE ROW");
      }
    } catch (e) {
      console.error("Invoice generation failed:", e);
      onToast(e.message || "INVOICE SAVE FAILED");
    }
  };

  const reDownload = async (inv) => {
    const bills = inv.freightBillIds.map((id) => freightBills.find((fb) => fb.id === id)).filter(Boolean);
    if (bills.length === 0) { onToast("ORIGINAL FREIGHT BILLS NOT FOUND"); return; }
    try {
      await generateInvoicePDF(inv, company, bills, { method: inv.pricingMethod, rate: inv.rate });
      onToast("INVOICE REOPENED");
    } catch (e) {
      console.error(e);
      onToast(e.message || "FAILED — ALLOW POPUPS");
    }
  };

  const removeInvoice = async (invNum) => {
    const inv = invoices.find((i) => i.invoiceNumber === invNum);
    if (!inv) return;
    const affectedFbs = freightBills.filter((fb) => fb.invoiceId === inv.id);

    // STRICT CASCADE: block if invoice has been paid OR if any FB is customer-paid
    const blockers = [];
    if (Number(inv.amountPaid) > 0) {
      blockers.push(`• Payment recorded on this invoice ($${Number(inv.amountPaid).toFixed(2)}) — reverse the payment first`);
    }
    const custPaidFbs = affectedFbs.filter((fb) => fb.customerPaidAt);
    if (custPaidFbs.length > 0) {
      blockers.push(`• ${custPaidFbs.length} FB${custPaidFbs.length !== 1 ? "s" : ""} on this invoice marked customer-paid — unmark them first`);
    }

    if (blockers.length > 0) {
      alert([
        `✗ Cannot delete invoice ${invNum}.`,
        ``,
        `This invoice has downstream records:`,
        ...blockers,
        ``,
        `Clear these first, then try again.`,
      ].join("\n"));
      return;
    }

    const unlockMsg = affectedFbs.length > 0
      ? `\n\nThis will UNLOCK ${affectedFbs.length} freight bill${affectedFbs.length !== 1 ? "s" : ""} so they can be invoiced again.`
      : "";
    if (!confirm(`Delete invoice ${invNum}?${unlockMsg}\n\nThis is a SOFT delete. The invoice stays recoverable for 30 days in the Recovery tab.`)) return;
    const reason = prompt('Reason for deletion (optional):') || "";

    try {
      // 1. Unlock affected FBs — clear invoiceId and billingLockedAt so they can be invoiced again
      const unlockFailures = [];
      for (const fb of affectedFbs) {
        try {
          await editFreightBill(fb.id, {
            ...fb,
            invoiceId: null,
            billingLockedAt: null,
          });
        } catch (e) {
          console.error("Could not unlock FB", fb.id, e);
          unlockFailures.push({ fbNum: fb.freightBillNumber || fb.id, err: e?.message || String(e) });
        }
      }

      if (unlockFailures.length > 0) {
        alert(
          `⚠ Unlocked ${affectedFbs.length - unlockFailures.length} of ${affectedFbs.length} FBs.\n\nThese failed and are still locked:\n` +
          unlockFailures.map((f) => `  • FB #${f.fbNum}: ${f.err}`).join("\n") +
          "\n\nTry re-opening those FBs to force unlock manually."
        );
      }

      // 2. Soft-delete the invoice
      await deleteInvoice(inv.id, { deletedBy: "admin", reason });

      // 3. Update local state
      const next = invoices.filter((i) => i.invoiceNumber !== invNum);
      setInvoices(next);

      // v20 Session O: audit log
      logAudit({
        actionType: "invoice.soft_delete",
        entityType: "invoice", entityId: inv.id,
        entityLabel: invNum,
        metadata: {
          reason,
          total: inv.total,
          billToName: inv.billToName,
          fbsUnlocked: affectedFbs.length - unlockFailures.length,
          unlockFailures: unlockFailures.length,
        },
      });

      // Undo: recover the invoice. Note: unlocked FBs do NOT auto-relock —
      // user will need to re-invoice them manually. That's an acceptable
      // tradeoff since re-locking would silently change FB state.
      const shortMsg = affectedFbs.length > 0
        ? `INVOICE DELETED · ${affectedFbs.length - unlockFailures.length} FB${(affectedFbs.length - unlockFailures.length) !== 1 ? "S" : ""} UNLOCKED`
        : "INVOICE DELETED";
      onToast({
        msg: shortMsg,
        action: {
          label: "UNDO",
          onClick: async () => {
            try {
              await recoverInvoice(inv.id);
              onToast("INVOICE RESTORED — RE-INVOICE UNLOCKED FBs MANUALLY");
            } catch (err) {
              console.error("Undo restore failed:", err);
              onToast("⚠ UNDO FAILED — CHECK RECOVERY TAB");
            }
          },
        },
      });
    } catch (e) {
      console.error("Soft delete invoice failed:", e);
      alert("Delete failed: " + (e?.message || String(e)));
    }
  };

  // v18 Change B: editable billing-line panel shown inside each expanded FB row in the invoice builder.
  // Edits go to local lineDrafts only. Admin must click SAVE in the bottom banner to commit to DB.
  // Disabled (read-only) when FB is locked to another invoice.
  const renderEditableLines = (fb, indent = 14) => {
    const lines = getFbLines(fb.id);
    const locked = !!fb.invoiceId;  // already on another invoice → read-only here
    const dirty = isFbDirty(fb.id);
    const status = fbSaveStatus[fb.id] || "idle";

    if (lines.length === 0 && !locked) {
      return (
        <div style={{ padding: `8px 10px 10px ${indent}px`, background: "#FAFAF9", borderTop: "1px dashed var(--concrete)" }}>
          <div style={{ fontSize: 10, color: "var(--concrete)", fontStyle: "italic", marginBottom: 6 }}>
            Legacy FB — no billing lines yet. Click ADD LINE to bill it.
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: "4px 10px", fontSize: 10 }}
            onClick={(e) => { e.stopPropagation(); builderAddLine(fb.id, { code: "H", item: "HOURLY" }); }}
          >
            <Plus size={11} style={{ marginRight: 4 }} /> ADD LINE
          </button>
        </div>
      );
    }

    return (
      <div style={{ padding: `8px 10px 10px ${indent}px`, background: "#FAFAF9", borderTop: "1px dashed var(--concrete)" }}>
        {/* Header row for alignment */}
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 70px 80px 60px 90px 28px", gap: 6, alignItems: "center", fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)", letterSpacing: "0.08em", marginBottom: 4, paddingRight: 4 }}>
          <div>CODE</div>
          <div>DESCRIPTION</div>
          <div style={{ textAlign: "right" }}>QTY</div>
          <div style={{ textAlign: "right" }}>RATE</div>
          <div style={{ textAlign: "center" }}>BROK%</div>
          <div style={{ textAlign: "right" }}>NET</div>
          <div></div>
        </div>
        {lines.map((ln) => {
          const gross = Number(ln.gross) || ((Number(ln.qty) || 0) * (Number(ln.rate) || 0));
          const brokAmt = ln.brokerable ? gross * (Number(ln.brokeragePct) || 0) / 100 : 0;
          const net = Number(ln.net) || (gross - brokAmt);
          return (
            <div
              key={ln.id}
              onClick={(e) => e.stopPropagation()}
              style={{ display: "grid", gridTemplateColumns: "60px 1fr 70px 80px 60px 90px 28px", gap: 6, alignItems: "center", padding: "4px 4px", borderBottom: "1px dotted var(--concrete)", background: "transparent" }}
            >
              <select
                disabled={locked}
                value={ln.code || "OTHER"}
                onChange={(e) => builderUpdateLine(fb.id, ln.id, { code: e.target.value, item: (
                  e.target.value === "H" ? "HOURLY" :
                  e.target.value === "T" ? "TONS" :
                  e.target.value === "L" ? "LOAD" :
                  e.target.value === "TOLL" ? "Tolls" :
                  e.target.value === "DUMP" ? "Dump Fees" :
                  e.target.value === "FUEL" ? "Fuel Surcharge" :
                  (ln.item || "")
                ) })}
                style={{ padding: "3px 4px", fontSize: 11, fontFamily: "JetBrains Mono, monospace", border: "1px solid var(--concrete)", background: locked ? "#F5F5F4" : "#FFF" }}
              >
                <option value="H">H</option>
                <option value="T">T</option>
                <option value="L">L</option>
                <option value="TOLL">TOLL</option>
                <option value="DUMP">DUMP</option>
                <option value="FUEL">FUEL</option>
                <option value="OTHER">OTHER</option>
              </select>
              <input
                disabled={locked}
                type="text"
                value={ln.item || ""}
                onChange={(e) => builderUpdateLine(fb.id, ln.id, { item: e.target.value })}
                style={{ padding: "3px 6px", fontSize: 11, fontFamily: "JetBrains Mono, monospace", border: "1px solid var(--concrete)", background: locked ? "#F5F5F4" : "#FFF", width: "100%" }}
              />
              <input
                disabled={locked}
                type="number"
                step="0.01"
                value={ln.qty ?? ""}
                onChange={(e) => builderUpdateLine(fb.id, ln.id, { qty: e.target.value })}
                style={{ padding: "3px 6px", fontSize: 11, fontFamily: "JetBrains Mono, monospace", border: "1px solid var(--concrete)", background: locked ? "#F5F5F4" : "#FFF", textAlign: "right", width: "100%" }}
              />
              <input
                disabled={locked}
                type="number"
                step="0.01"
                value={ln.rate ?? ""}
                onChange={(e) => builderUpdateLine(fb.id, ln.id, { rate: e.target.value })}
                style={{ padding: "3px 6px", fontSize: 11, fontFamily: "JetBrains Mono, monospace", border: "1px solid var(--concrete)", background: locked ? "#F5F5F4" : "#FFF", textAlign: "right", width: "100%" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "center" }}>
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={!!ln.brokerable}
                  onChange={(e) => builderUpdateLine(fb.id, ln.id, { brokerable: e.target.checked, brokeragePct: e.target.checked ? (ln.brokeragePct || 10) : 0 })}
                  style={{ width: 13, height: 13 }}
                />
                {ln.brokerable && (
                  <input
                    disabled={locked}
                    type="number"
                    step="1"
                    value={ln.brokeragePct ?? ""}
                    onChange={(e) => builderUpdateLine(fb.id, ln.id, { brokeragePct: e.target.value })}
                    style={{ padding: "2px 4px", fontSize: 10, fontFamily: "JetBrains Mono, monospace", border: "1px solid var(--concrete)", background: locked ? "#F5F5F4" : "#FFF", width: 38, textAlign: "right" }}
                  />
                )}
              </div>
              <div style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "var(--good)", textAlign: "right" }}>
                ${net.toFixed(2)}
              </div>
              <button
                type="button"
                disabled={locked}
                onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${ln.code} · ${ln.item} line?`)) builderDeleteLine(fb.id, ln.id); }}
                style={{ padding: "2px 4px", background: "transparent", border: "1px solid var(--safety)", color: "var(--safety)", cursor: locked ? "not-allowed" : "pointer", fontSize: 10, opacity: locked ? 0.4 : 1 }}
                title={locked ? "FB is locked (already on invoice)" : "Delete line"}
              >
                <Trash2 size={9} />
              </button>
            </div>
          );
        })}
        {!locked && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <button type="button" className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }} onClick={(e) => { e.stopPropagation(); builderAddLine(fb.id, { code: "H", item: "HOURLY" }); }}>
              <Plus size={11} style={{ marginRight: 3 }} /> HOURLY
            </button>
            <button type="button" className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }} onClick={(e) => { e.stopPropagation(); builderAddLine(fb.id, { code: "TOLL", item: "Tolls" }); }}>
              <Plus size={11} style={{ marginRight: 3 }} /> TOLL
            </button>
            <button type="button" className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }} onClick={(e) => { e.stopPropagation(); builderAddLine(fb.id, { code: "DUMP", item: "Dump Fees" }); }}>
              <Plus size={11} style={{ marginRight: 3 }} /> DUMP
            </button>
            <button type="button" className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }} onClick={(e) => { e.stopPropagation(); builderAddLine(fb.id, { code: "FUEL", item: "Fuel Surcharge" }); }}>
              <Plus size={11} style={{ marginRight: 3 }} /> FUEL
            </button>
            <button type="button" className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }} onClick={(e) => { e.stopPropagation(); builderAddLine(fb.id, { code: "OTHER", item: "" }); }}>
              <Plus size={11} style={{ marginRight: 3 }} /> OTHER
            </button>
          </div>
        )}
        {/* v18 Change B: SAVE + DISCARD row — only shown when there are unsaved edits or an active status */}
        {!locked && (dirty || status === "saving" || status === "saved" || status === "error") && (
          <div style={{
            display: "flex", gap: 8, alignItems: "center", marginTop: 10, padding: "8px 10px",
            background: dirty ? "#FEF3C7" : status === "saved" ? "#D1FAE5" : status === "error" ? "#FEE2E2" : "#F5F5F4",
            border: `1.5px solid ${dirty ? "var(--hazard-deep)" : status === "saved" ? "var(--good)" : status === "error" ? "var(--safety)" : "var(--concrete)"}`,
            flexWrap: "wrap",
          }}>
            <span className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.08em", fontWeight: 700, color: dirty ? "var(--hazard-deep)" : status === "saved" ? "var(--good)" : status === "error" ? "var(--safety)" : "var(--concrete)" }}>
              {status === "saving" ? "▸ SAVING…" :
               status === "saved" ? "✓ SAVED" :
               status === "error" ? "⚠ SAVE FAILED — TRY AGAIN" :
               dirty ? "▸ UNSAVED CHANGES" : ""}
            </span>
            {dirty && (
              <>
                <button
                  type="button"
                  disabled={status === "saving"}
                  onClick={(e) => { e.stopPropagation(); saveFbLines(fb.id); }}
                  className="btn-primary"
                  style={{ padding: "4px 14px", fontSize: 11, marginLeft: "auto" }}
                >
                  SAVE
                </button>
                <button
                  type="button"
                  disabled={status === "saving"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Discard unsaved changes to this FB's billing lines?")) discardFbDraft(fb.id);
                  }}
                  className="btn-ghost"
                  style={{ padding: "4px 10px", fontSize: 10 }}
                >
                  DISCARD
                </button>
              </>
            )}
          </div>
        )}
        {locked && (
          <div style={{ fontSize: 9, color: "var(--concrete)", fontStyle: "italic", marginTop: 6 }}>
            ⚑ Read-only — FB is locked to another invoice.
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {payingInvoice && (
        <RecordPaymentModal
          invoice={payingInvoice}
          freightBills={freightBills}
          editFreightBill={editFreightBill}
          setInvoices={setInvoices}
          invoices={invoices}
          onClose={() => setPayingInvoice(null)}
          onToast={onToast}
        />
      )}
      {viewingInvoice && (
        <InvoiceViewModal
          invoice={viewingInvoice}
          freightBills={freightBills}
          contacts={contacts}
          dispatches={dispatches}
          editFreightBill={editFreightBill}
          setInvoices={setInvoices}
          invoices={invoices}
          onJumpToPayroll={(subId) => {
            setViewingInvoice(null);
            if (onJumpToPayroll) onJumpToPayroll(subId);
          }}
          onClose={() => setViewingInvoice(null)}
          onToast={onToast}
        />
      )}
      {showProfile && <CompanyProfileModal company={company} onSave={setCompany} onClose={() => setShowProfile(false)} onToast={onToast} generateCapabilityStatementPDF={generateCapabilityStatementPDF} />}

      {/* Company profile summary */}
      <div className="fbt-card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        {company.logoDataUrl ? (
          <img src={company.logoDataUrl} alt="logo" style={{ width: 54, height: 54, objectFit: "contain", border: "2px solid var(--steel)", background: "#FFF" }} />
        ) : (
          <div style={{ width: 54, height: 54, border: "2px dashed var(--concrete)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--concrete)" }}><Building2 size={20} /></div>
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="fbt-display" style={{ fontSize: 18 }}>{company.name || "SET COMPANY NAME"}</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
            {[company.address, company.phone, company.email].filter(Boolean).join("  ·  ") || "CLICK EDIT TO ADD YOUR BUSINESS INFO"}
          </div>
        </div>
        <button className="btn-ghost" onClick={() => setShowProfile(true)}>
          <Settings size={14} style={{ marginRight: 6 }} /> EDIT PROFILE
        </button>
      </div>

      {/* NEW INVOICE launcher bar (session C: replaces the always-visible builder with a modal) */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>INVOICES</h3>
        <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em" }}>
          · {invoices.length} TOTAL · {invoices.filter((i) => (i.amountPaid || 0) > 0 && (i.amountPaid || 0) < (i.total || 0)).length} PARTIAL · {invoices.filter((i) => (i.amountPaid || 0) >= (i.total || 0) && (i.total || 0) > 0).length} PAID
        </span>
        <button onClick={() => setShowNewInvoice(true)} className="btn-primary" style={{ marginLeft: "auto" }}>
          <Plus size={14} style={{ marginRight: 6 }} /> NEW INVOICE
        </button>
      </div>

      {/* Builder — hidden by default, opens as a modal when user clicks NEW INVOICE */}
      {showNewInvoice && (() => {
        const closeModal = () => {
          const dirtyCount = Object.keys(lineDrafts).length;
          if (dirtyCount > 0) {
            if (!confirm(`You have unsaved edits on ${dirtyCount} FB${dirtyCount !== 1 ? "s" : ""}. Close anyway? (edits will be discarded)`)) return;
          }
          setShowNewInvoice(false);
        };
        return (
      <div className="modal-bg" onClick={closeModal}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1040, maxHeight: "95vh", overflowY: "auto" }}>
      <div className="fbt-card" style={{ padding: 24, margin: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 8, height: 24, background: "var(--hazard)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>NEW INVOICE</h3>
          <button onClick={closeModal} className="btn-ghost" style={{ marginLeft: "auto", padding: "6px 12px", fontSize: 12 }}>
            <X size={14} style={{ marginRight: 4 }} /> CLOSE
          </button>
        </div>

        {/* v18 Multi-mode intake — pick one of 3 intake modes before filters show */}
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ HOW WOULD YOU LIKE TO BUILD THIS INVOICE?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 22 }}>
          {[
            { k: "select",  t: "BY SELECTING",  d: "Cherry-pick individual FBs",          ico: <ClipboardList size={18} /> },
            { k: "range",   t: "BY DATE RANGE", d: "All customer FBs in a window",         ico: <Calendar size={18} /> },
            { k: "project", t: "BY PROJECT",    d: "All FBs on one job / project",         ico: <Briefcase size={18} /> },
          ].map((m) => {
            const active = builderMode === m.k;
            return (
              <button
                key={m.k}
                onClick={() => {
                  setBuilderMode(m.k);
                  // Reset anything stale from previous mode
                  setSelectedFbIds(new Set());
                  setExpandedFbIds(new Set());
                  // Project mode: clear project filter to force a fresh pick
                  if (m.k !== "project") setProjectId("");
                  if (m.k === "project") setFromDate("");
                  if (m.k === "project") setToDate("");
                }}
                style={{
                  padding: "14px 16px",
                  background: active ? "var(--hazard)" : "var(--cream)",
                  border: `2px solid ${active ? "var(--steel)" : "var(--concrete)"}`,
                  color: "var(--steel)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  {m.ico}
                  <span className="fbt-display" style={{ fontSize: 14 }}>{m.t}</span>
                </div>
                <div className="fbt-mono" style={{ fontSize: 10, color: active ? "var(--steel)" : "var(--concrete)", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                  {m.d}
                </div>
              </button>
            );
          })}
        </div>

        {!builderMode && (
          <div style={{ padding: 32, background: "#F5F5F4", border: "2px dashed var(--concrete)", textAlign: "center" }}>
            <FileText size={28} style={{ color: "var(--concrete)", marginBottom: 10 }} />
            <div className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)", letterSpacing: "0.1em" }}>
              ▸ PICK A MODE ABOVE TO START BUILDING THIS INVOICE
            </div>
          </div>
        )}

        {builderMode && (<>
        {/* Filters */}
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>
          ▸ 01 / {builderMode === "select" ? "FILTERS (OPTIONAL) — THEN CHECK FBS BELOW" :
                   builderMode === "range"  ? "PICK CUSTOMER + DATE RANGE (REQUIRED)" :
                                              "PICK CUSTOMER + PROJECT (REQUIRED)"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
          {builderMode !== "project" && (<>
          <div><label className="fbt-label">From Date{builderMode === "range" ? " *" : ""}</label><input className="fbt-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
          <div><label className="fbt-label">To Date{builderMode === "range" ? " *" : ""}</label><input className="fbt-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
          </>)}
          <div>
            <label className="fbt-label">Customer{builderMode === "range" || builderMode === "project" ? " *" : ""}</label>
            <select
              className="fbt-select"
              value={clientFilter || ""}
              onChange={(e) => {
                const id = e.target.value;
                setClientFilter(id);
                // Auto-fill Bill-To from selected customer
                if (id) {
                  const c = contacts.find((x) => String(x.id) === id);
                  if (c) {
                    setBillTo({
                      id: c.id,
                      name: c.companyName || c.contactName || "",
                      address: c.address || "",
                      contact: c.contactName || "",
                    });
                  }
                } else {
                  setBillTo({ id: "", name: "", address: "", contact: "" });
                }
                // Reset project when customer changes
                setProjectId("");
              }}
            >
              <option value="">— All customers —</option>
              {contacts.filter((c) => c.type === "customer").map((c) => (
                <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fbt-label">Project{builderMode === "project" ? " *" : ""} {clientFilter ? "(auto-fills PO# + Ref)" : "(pick customer first)"}</label>
            <select
              className="fbt-select"
              value={projectId || ""}
              onChange={(e) => {
                const id = e.target.value;
                setProjectId(id);
                if (id) {
                  const p = projects.find((x) => String(x.id) === id);
                  if (p) {
                    if (p.poNumber) setPoNumber(p.poNumber);
                    if (p.name) setJobRef(`${p.contractNumber ? p.contractNumber + " — " : ""}${p.name}`);
                  }
                }
              }}
              disabled={!clientFilter}
            >
              <option value="">— All projects —</option>
              {projects.filter((p) => !clientFilter || String(p.customerId) === String(clientFilter)).map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.poNumber ? ` · PO ${p.poNumber}` : ""}{p.defaultRate ? ` · $${p.defaultRate}/hr` : ""}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Approval filter */}
        <div style={{ padding: 10, background: includeUnapproved ? "#FEF2F2" : "#F0FDF4", border: "2px solid " + (includeUnapproved ? "var(--safety)" : "var(--good)"), marginBottom: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
            <input
              type="checkbox"
              checked={!includeUnapproved}
              onChange={(e) => setIncludeUnapproved(!e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <ShieldCheck size={14} style={{ color: includeUnapproved ? "var(--concrete)" : "var(--good)" }} />
            <strong>APPROVED FREIGHT BILLS ONLY</strong>
          </label>
          {includeUnapproved && (
            <span className="fbt-mono" style={{ fontSize: 10, color: "var(--safety)", letterSpacing: "0.1em", marginLeft: "auto" }}>
              ⚠ INCLUDING PENDING FBs
            </span>
          )}
        </div>

        {/* Locked FBs reference — already on another invoice (read-only view) */}
        {(() => {
          // Find FBs that would match filters EXCEPT they're already invoiced
          const lockedFbs = freightBills.filter((fb) => {
            if (!fb.invoiceId) return false;
            const status = fb.status || "pending";
            if (!includeUnapproved && status !== "approved") return false;
            if (status === "rejected") return false;
            const fbDate = fb.submittedAt ? fb.submittedAt.slice(0, 10) : "";
            if (fromDate && fbDate < fromDate) return false;
            if (toDate && fbDate > toDate) return false;
            const disp = dispatches.find((d) => d.id === fb.dispatchId);
            if (clientFilter && String(disp?.clientId) !== String(clientFilter)) return false;
            if (projectId && String(disp?.projectId) !== String(projectId)) return false;
            return true;
          });
          if (lockedFbs.length === 0) return null;
          return (
            <div style={{ padding: 10, background: "#F5F5F4", border: "2px dashed var(--concrete)", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em" }}
                onClick={() => setShowAlreadyInvoiced(!showAlreadyInvoiced)}>
                <Lock size={14} style={{ color: "var(--concrete)" }} />
                <strong>{lockedFbs.length} FB{lockedFbs.length !== 1 ? "S" : ""} ALREADY ON ANOTHER INVOICE (BLOCKED)</strong>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--concrete)" }}>{showAlreadyInvoiced ? "▲ HIDE" : "▼ SHOW"}</span>
              </div>
              {showAlreadyInvoiced && (
                <div style={{ display: "grid", gap: 4, marginTop: 8, maxHeight: 180, overflowY: "auto" }}>
                  {lockedFbs.map((fb) => {
                    const inv = invoices.find((i) => i.id === fb.invoiceId);
                    return (
                      <div key={fb.id} style={{
                        padding: 6,
                        background: "#FFF",
                        border: "1px solid var(--concrete)",
                        fontSize: 11,
                        fontFamily: "JetBrains Mono, monospace",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        opacity: 0.7,
                      }}>
                        <span>
                          <Lock size={10} style={{ color: "var(--concrete)", marginRight: 4 }} />
                          FB#{fb.freightBillNumber || "—"} · {fb.driverName || "—"}
                        </span>
                        <span className="chip" style={{ background: "var(--steel)", color: "var(--cream)", fontSize: 9, padding: "2px 6px" }}>
                          🔒 ON {inv?.invoiceNumber || "INVOICE"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* v18: FB selection list with click-to-expand billing lines */}
        {builderMode === "select" && selectableBills.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>
              ▸ CHECK FBs TO INCLUDE · {selectedFbIds.size} OF {selectableBills.length} SELECTED
              {selectableBills.length > 0 && (
                <button
                  onClick={() => {
                    if (selectedFbIds.size === selectableBills.length) {
                      setSelectedFbIds(new Set());
                    } else {
                      setSelectedFbIds(new Set(selectableBills.map((fb) => fb.id)));
                    }
                  }}
                  style={{ marginLeft: 12, background: "transparent", border: "none", color: "var(--hazard-deep)", fontSize: 10, letterSpacing: "0.08em", cursor: "pointer", fontWeight: 700, textTransform: "uppercase" }}
                >
                  {selectedFbIds.size === selectableBills.length ? "UNCHECK ALL" : "CHECK ALL"}
                </button>
              )}
            </div>
            <div style={{ display: "grid", gap: 6, maxHeight: 380, overflowY: "auto", padding: 4, background: "#F5F5F4", border: "1.5px solid var(--concrete)" }}>
              {selectableBills.map((fb) => {
                const checked = selectedFbIds.has(fb.id);
                const expanded = expandedFbIds.has(fb.id);
                const disp = dispatches.find((d) => d.id === fb.dispatchId);
                const lines = getFbLines(fb.id);  // v18 Change B: use draft if dirty
                const fbTotal = lines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
                const dirty = isFbDirty(fb.id);
                return (
                  <div key={fb.id} style={{ background: checked ? "#FEF3C7" : "#FFF", border: `1.5px solid ${checked ? "var(--hazard-deep)" : "var(--concrete)"}` }}>
                    <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                         onClick={(e) => {
                           // Let checkbox click handle checking; otherwise toggle expand
                           if (e.target.type === "checkbox") return;
                           const next = new Set(expandedFbIds);
                           if (expanded) next.delete(fb.id); else next.add(fb.id);
                           setExpandedFbIds(next);
                         }}>
                      <input type="checkbox" checked={checked} onChange={(e) => {
                        e.stopPropagation();
                        const next = new Set(selectedFbIds);
                        if (e.target.checked) next.add(fb.id); else next.delete(fb.id);
                        setSelectedFbIds(next);
                      }} style={{ width: 16, height: 16 }} />
                      <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "auto auto auto 1fr auto", gap: 12, alignItems: "center", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                        <span style={{ fontWeight: 700 }}>
                          FB#{fb.freightBillNumber || "—"}
                          {dirty && <span title="Unsaved changes" style={{ marginLeft: 4, color: "var(--hazard-deep)" }}>●</span>}
                        </span>
                        <span>{fb.submittedAt ? fb.submittedAt.slice(0, 10) : "—"}</span>
                        <span>T{fb.truckNumber || "—"}</span>
                        <span style={{ color: "var(--concrete)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {disp?.jobName || "—"} · {fb.driverName || "—"}
                        </span>
                        <span style={{ fontWeight: 700 }}>${fbTotal.toFixed(2)}</span>
                      </div>
                      <ChevronDown size={14} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s", color: "var(--concrete)" }} />
                    </div>
                    {expanded && renderEditableLines(fb, 38)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Auto-include preview for range + project modes */}
        {(builderMode === "range" || builderMode === "project") && matchedBills.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>
              ▸ {matchedBills.length} FBs AUTO-INCLUDED · CLICK ANY ROW TO SEE LINE BREAKDOWN
            </div>
            <div style={{ display: "grid", gap: 6, maxHeight: 340, overflowY: "auto", padding: 4, background: "#F5F5F4", border: "1.5px solid var(--concrete)" }}>
              {matchedBills.map((fb) => {
                const expanded = expandedFbIds.has(fb.id);
                const disp = dispatches.find((d) => d.id === fb.dispatchId);
                const lines = getFbLines(fb.id);
                const fbTotal = lines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
                const dirty = isFbDirty(fb.id);
                return (
                  <div key={fb.id} style={{ background: dirty ? "#FEF3C7" : "#FFF", border: `1.5px solid ${dirty ? "var(--hazard-deep)" : "var(--concrete)"}` }}>
                    <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                         onClick={() => {
                           const next = new Set(expandedFbIds);
                           if (expanded) next.delete(fb.id); else next.add(fb.id);
                           setExpandedFbIds(next);
                         }}>
                      <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "auto auto auto 1fr auto", gap: 12, alignItems: "center", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                        <span style={{ fontWeight: 700 }}>
                          FB#{fb.freightBillNumber || "—"}
                          {dirty && <span title="Unsaved changes" style={{ marginLeft: 4, color: "var(--hazard-deep)" }}>●</span>}
                        </span>
                        <span>{fb.submittedAt ? fb.submittedAt.slice(0, 10) : "—"}</span>
                        <span>T{fb.truckNumber || "—"}</span>
                        <span style={{ color: "var(--concrete)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {disp?.jobName || "—"} · {fb.driverName || "—"}
                        </span>
                        <span style={{ fontWeight: 700 }}>${fbTotal.toFixed(2)}</span>
                      </div>
                      <ChevronDown size={14} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s", color: "var(--concrete)" }} />
                    </div>
                    {expanded && renderEditableLines(fb, 14)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ padding: 12, background: matchedBills.length > 0 ? "#FEF3C7" : "#F5F5F4", border: "2px solid var(--steel)", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {matchedBills.length === 0 ? "NO MATCHES" : `${matchedBills.length} FREIGHT BILL${matchedBills.length !== 1 ? "S" : ""} MATCHED`}
          </div>
          {matchedBills.length > 0 && (
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
              TOTAL TONS: {matchedBills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0).toFixed(1)}
              {" · "}TOTAL LOADS: {matchedBills.reduce((s, fb) => s + (Number(fb.loadCount) || 0), 0)}
              {" · "}TOTAL HRS: {matchedBills.reduce((s, fb) => s + effectiveHours(fb), 0).toFixed(2)}
            </div>
          )}
        </div>

        {/* v18 Fix 2b: Removed 02 / PRICING section (Method + Rate). Billing lines on each FB
            are the single source of truth now — edit them in the expanded row above. Legacy
            FBs without billing lines will get their totals from whatever's in the billing lines
            the user creates there. */}

        {/* Reconciliation warning banner — lists any unreconciled orders */}
        {matchedBills.length > 0 && reconcileIssues.length > 0 && (
          <div style={{ padding: 14, background: "#FEF3C7", border: "2px solid var(--hazard)", marginBottom: 18 }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>
              ⚠ {reconcileIssues.length} UNRECONCILED ORDER{reconcileIssues.length !== 1 ? "S" : ""} — REVIEW BEFORE INVOICING
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {reconcileIssues.map((r) => (
                <div key={r.dispatch.id} style={{ padding: 8, background: "#FFF", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                  <strong>ORDER #{r.dispatch.code}</strong> · {r.dispatch.jobName}
                  <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 3 }}>
                    Expected: {r.expected} · Submitted: {r.total} · No-show: {r.noShow}
                    {r.unresolved > 0 && <span style={{ color: "var(--safety)", fontWeight: 700 }}> · {r.unresolved} UNRESOLVED</span>}
                    {r.unresolved === 0 && <span style={{ color: "var(--hazard-deep)", fontWeight: 700 }}> · NEEDS MARK RECONCILED CLICK</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8 }}>
              ▸ GO TO THE ORDER TAB TO RESOLVE NO-SHOWS AND CLICK MARK RECONCILED · YOU CAN STILL PROCEED BELOW
            </div>
          </div>
        )}

        {/* v18 Fix #1: REMOVED the duplicate "HOURS PER FREIGHT BILL" editable panel.
            That panel showed each matched FB with an editable hours input, but edits didn't
            sync back to the underlying FB — admin confusion. Per spec, billing lines on the
            FB itself (edited in Review) are the single source of truth. The expandable FB list
            above already shows the breakdown read-only. */}

        {/* Bill-to — read-only display of auto-pulled customer + PO/ref fields */}
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ 03 / BILL TO (AUTO-PULLED FROM CUSTOMER PICKED ABOVE)</div>
        <div style={{ display: "grid", gap: 14, marginBottom: 18 }}>
          {!billTo.name ? (
            <div style={{ padding: 14, background: "#F5F5F4", border: "2px dashed var(--concrete)", textAlign: "center", fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)" }}>
              PICK A CUSTOMER IN SECTION 01 TO AUTO-FILL BILL-TO
            </div>
          ) : (
            <div style={{ padding: 12, background: "#F0FDF4", border: "2px solid var(--good)", display: "grid", gap: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{billTo.name}</div>
              {billTo.contact && <div style={{ fontSize: 12, color: "var(--concrete)" }}>Attn: {billTo.contact}</div>}
              {billTo.address && <div style={{ fontSize: 12, color: "var(--concrete)" }}>{billTo.address}</div>}
              <div style={{ fontSize: 10, color: "var(--good)", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em", marginTop: 4 }}>
                ▸ AUTO-PULLED FROM CONTACT · EDIT IN CONTACTS TAB IF NEEDED
              </div>
            </div>
          )}
          {/* PO# and Job Reference — auto-populate from project but editable */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">PO # {projectId ? "(from project)" : ""}</label>
              <input className="fbt-input" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO-2026-0045" />
            </div>
            <div>
              <label className="fbt-label">Job Reference {projectId ? "(from project)" : ""}</label>
              <input className="fbt-input" value={jobRef} onChange={(e) => setJobRef(e.target.value)} placeholder="MCI #91684 — Salinas Stormwater 2A" />
            </div>
          </div>
        </div>

        {/* Terms / notes */}
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ 04 / DETAILS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 14 }}>
          <div><label className="fbt-label">Due Date</label><input className="fbt-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <div><label className="fbt-label">Discount $</label><input className="fbt-input" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
        </div>

        {/* Multi-row extras (tolls / dump fees / fuel surcharge / other) */}
        <div style={{ marginBottom: 14, padding: 12, background: "#FEF3C7", border: "2px solid var(--hazard)" }}>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700 }}>
            ▸ ADDITIONAL LINE ITEMS (TOLLS · DUMP FEES · FUEL · OTHER)
          </div>
          {(extras || []).length > 0 && (
            <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
              {extras.map((x, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "150px 1fr 110px auto", gap: 6, alignItems: "center" }}>
                  <select
                    className="fbt-select"
                    style={{ padding: "6px 8px", fontSize: 11 }}
                    value={["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? x.label : "Other"}
                    onChange={(e) => {
                      const v = e.target.value;
                      const next = [...extras];
                      next[idx] = { ...next[idx], label: v === "Other" ? (next[idx].label || "") : v };
                      setExtras(next);
                    }}
                  >
                    <option value="Tolls">Tolls</option>
                    <option value="Dump Fees">Dump Fees</option>
                    <option value="Fuel Surcharge">Fuel Surcharge</option>
                    <option value="Other">Other (custom)</option>
                  </select>
                  <input
                    className="fbt-input"
                    style={{ padding: "6px 10px", fontSize: 12 }}
                    placeholder={["Tolls", "Dump Fees", "Fuel Surcharge"].includes(x.label) ? `Description for ${x.label}` : "Custom label (shows on invoice)"}
                    value={x.label || ""}
                    onChange={(e) => {
                      const next = [...extras];
                      next[idx] = { ...next[idx], label: e.target.value };
                      setExtras(next);
                    }}
                  />
                  <input
                    className="fbt-input"
                    type="number" step="0.01"
                    placeholder="0.00"
                    style={{ padding: "6px 10px", fontSize: 12 }}
                    value={x.amount || ""}
                    onChange={(e) => {
                      const next = [...extras];
                      next[idx] = { ...next[idx], amount: e.target.value };
                      setExtras(next);
                    }}
                  />
                  <button
                    onClick={() => setExtras(extras.filter((_, i) => i !== idx))}
                    className="btn-danger"
                    style={{ padding: "6px 10px", fontSize: 11 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setExtras([...(extras || []), { label: "Tolls", amount: "" }])}
              style={{ padding: "5px 10px", fontSize: 10 }}
            >
              <Plus size={11} style={{ marginRight: 3 }} /> TOLLS
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setExtras([...(extras || []), { label: "Dump Fees", amount: "" }])}
              style={{ padding: "5px 10px", fontSize: 10 }}
            >
              <Plus size={11} style={{ marginRight: 3 }} /> DUMP FEES
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setExtras([...(extras || []), { label: "Fuel Surcharge", amount: "" }])}
              style={{ padding: "5px 10px", fontSize: 10 }}
            >
              <Plus size={11} style={{ marginRight: 3 }} /> FUEL SURCHARGE
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setExtras([...(extras || []), { label: "", amount: "" }])}
              style={{ padding: "5px 10px", fontSize: 10 }}
            >
              <Plus size={11} style={{ marginRight: 3 }} /> CUSTOM
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 14 }}>
          <div><label className="fbt-label">Notes / Memo</label><textarea className="fbt-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional internal note shown on invoice" /></div>
        </div>
        {/* v18 Fix 2b: Removed per-invoice Payment Terms field. Terms come from Company Profile
            → Default Terms, which applies to all invoices. Edit it once there. */}

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)", cursor: "pointer", marginBottom: 18 }}>
          <input type="checkbox" checked={includePhotos} onChange={(e) => setIncludePhotos(e.target.checked)} />
          INCLUDE SCALE TICKET THUMBNAILS ON INVOICE
        </label>

        {/* Preview totals */}
        <div style={{ marginTop: 10, border: "2px solid var(--steel)" }}>
          <table className="fbt-table">
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>SUBTOTAL · {matchedBills.length} FREIGHT BILLS</td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt$(previewTotals.subtotal)}</td>
              </tr>
              {previewTotals.fbExtrasSum > 0 && (
                <tr>
                  <td style={{ fontWeight: 600 }}>FB EXTRAS (TOLLS · DUMP · FUEL · OTHER)</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt$(previewTotals.fbExtrasSum)}</td>
                </tr>
              )}
              {(extras || []).filter((x) => Number(x.amount) !== 0).map((x, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{(x.label || "ADDITIONAL").toUpperCase()}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt$(x.amount)}</td>
                </tr>
              ))}
              {Number(discount) !== 0 && (
                <tr>
                  <td style={{ fontWeight: 600 }}>DISCOUNT</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>-{fmt$(discount)}</td>
                </tr>
              )}
              <tr style={{ background: "var(--hazard)" }}>
                <td style={{ fontWeight: 700, fontSize: 16, fontFamily: "Archivo Black, sans-serif" }}>TOTAL DUE</td>
                <td style={{ textAlign: "right", fontWeight: 700, fontSize: 16, fontFamily: "Archivo Black, sans-serif" }}>{fmt$(previewTotals.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
          {/* Visible hints if button can't be clicked */}
          {(() => {
            // v18 Fix 2b: rate is gone. Validation only checks for FBs + bill-to + that each FB has
            // at least one billing line (user must have edited legacy FBs via the expand panel).
            const legacyFbs = matchedBills.filter((fb) => !Array.isArray(fb.billingLines) || fb.billingLines.length === 0);
            const dirtyFbs = matchedBills.filter((fb) => isFbDirty(fb.id));
            const issues = [];
            if (matchedBills.length === 0) issues.push("No freight bills match your filters (date range / approved / invoice status)");
            if (legacyFbs.length > 0) issues.push(`${legacyFbs.length} FB${legacyFbs.length !== 1 ? "s have" : " has"} no billing lines — expand each and add at least one line (HOURLY / LOAD / etc.)`);
            if (dirtyFbs.length > 0) issues.push(`${dirtyFbs.length} FB${dirtyFbs.length !== 1 ? "s have" : " has"} unsaved edits — click SAVE on each before generating`);
            if (!billTo.name) issues.push("Select a customer — its bill-to info auto-fills");
            if (issues.length === 0) return null;
            return (
              <div style={{ padding: 10, background: "#FEF2F2", border: "2px solid var(--safety)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--safety)" }}>
                <strong>⚠ FIX BEFORE GENERATING:</strong>
                <ul style={{ margin: "6px 0 0 20px", padding: 0 }}>
                  {issues.map((i, idx) => <li key={idx}>{i}</li>)}
                </ul>
              </div>
            );
          })()}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                if (matchedBills.length === 0) { onToast("NO FBs MATCH — CHECK FILTERS"); return; }
                const legacyFbs = matchedBills.filter((fb) => !Array.isArray(fb.billingLines) || fb.billingLines.length === 0);
                if (legacyFbs.length > 0) {
                  onToast(`${legacyFbs.length} FB${legacyFbs.length !== 1 ? "s need" : " needs"} billing lines — expand to add`);
                  return;
                }
                const dirtyFbs = matchedBills.filter((fb) => isFbDirty(fb.id));
                if (dirtyFbs.length > 0) {
                  onToast(`${dirtyFbs.length} FB${dirtyFbs.length !== 1 ? "s have" : " has"} unsaved edits — click SAVE first`);
                  return;
                }
                if (!billTo.name) { onToast("SELECT CUSTOMER OR BILL-TO NAME"); return; }
                generate();
                setShowNewInvoice(false);
              }}
              className="btn-primary"
            >
              <FileDown size={16} /> OPEN INVOICE (PRINT / SAVE AS PDF)
            </button>
          </div>
        </div>
        </>)}
      </div>
      </div>
      </div>
      );
      })()}

      {/* Invoice payment stats */}
      {invoices.length > 0 && (() => {
        const getStatus = (inv) => {
          if (inv.statusOverride) return inv.statusOverride;
          const paid = Number(inv.amountPaid || 0);
          const total = Number(inv.total || 0);
          if (total === 0) return "outstanding";
          if (paid >= total - 0.01) return "paid";
          if (paid > 0) return "partial";
          // Check overdue
          if (inv.dueDate) {
            const due = new Date(inv.dueDate);
            if (!isNaN(due) && due < new Date()) return "overdue";
          }
          return "outstanding";
        };
        const outstanding = invoices.filter((i) => getStatus(i) === "outstanding");
        const partial = invoices.filter((i) => getStatus(i) === "partial");
        const overdue = invoices.filter((i) => getStatus(i) === "overdue");
        const paidThisMonth = invoices.filter((i) => {
          if (getStatus(i) !== "paid") return false;
          const lastPay = (i.paymentHistory || [])[i.paymentHistory?.length - 1];
          if (!lastPay?.date) return false;
          const d = new Date(lastPay.date);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const outstandingAmt = [...outstanding, ...partial, ...overdue].reduce((s, i) => s + (Number(i.total) || 0) - (Number(i.amountPaid) || 0), 0);
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
            <div className="fbt-card" style={{ padding: 16, background: "var(--hazard)", color: "var(--steel)" }}>
              <div className="stat-num" style={{ color: "var(--steel)" }}>{fmt$(outstandingAmt).slice(0, 10)}</div>
              <div className="stat-label">Total Outstanding</div>
            </div>
            <div className="fbt-card" style={{ padding: 16 }}>
              <div className="stat-num">{outstanding.length}</div>
              <div className="stat-label">Outstanding</div>
            </div>
            <div className="fbt-card" style={{ padding: 16, background: "#FEF3C7" }}>
              <div className="stat-num">{partial.length}</div>
              <div className="stat-label">Partial Pay</div>
            </div>
            <div className="fbt-card" style={{ padding: 16, background: overdue.length > 0 ? "var(--safety)" : undefined, color: overdue.length > 0 ? "#FFF" : undefined }}>
              <div className="stat-num" style={{ color: overdue.length > 0 ? "#FFF" : undefined }}>{overdue.length}</div>
              <div className="stat-label" style={{ color: overdue.length > 0 ? "#FFF" : undefined }}>Overdue</div>
            </div>
            <div className="fbt-card" style={{ padding: 16, background: "var(--good)", color: "#FFF" }}>
              <div className="stat-num" style={{ color: "#FFF" }}>{paidThisMonth.length}</div>
              <div className="stat-label" style={{ color: "#FFF" }}>Paid This Month</div>
            </div>
          </div>
        );
      })()}

      {/* Invoice history */}
      <div className="fbt-card" style={{ padding: 0 }}>
        <div style={{ padding: "18px 24px", borderBottom: "2px solid var(--steel)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 24, background: "var(--hazard)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>INVOICE HISTORY</h3>
        </div>
        {invoices.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
            <Receipt size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div className="fbt-mono" style={{ fontSize: 13 }}>NO INVOICES GENERATED YET</div>
          </div>
        ) : (
          <div className="scroll-x">
            <table className="fbt-table">
              <thead><tr><th>Invoice #</th><th>Date</th><th>Bill To</th><th>FBs</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {invoices.map((inv) => {
                  const getStatus = (i) => {
                    if (i.statusOverride) return i.statusOverride;
                    const paid = Number(i.amountPaid || 0);
                    const total = Number(i.total || 0);
                    if (total === 0) return "outstanding";
                    if (paid >= total - 0.01) return "paid";
                    if (paid > 0) return "partial";
                    if (i.dueDate) {
                      const due = new Date(i.dueDate);
                      if (!isNaN(due) && due < new Date()) return "overdue";
                    }
                    return "outstanding";
                  };
                  const status = getStatus(inv);
                  const paid = Number(inv.amountPaid || 0);
                  const balance = (Number(inv.total) || 0) - paid;
                  const statusBg = {
                    paid: "var(--good)", partial: "var(--hazard)",
                    overdue: "var(--safety)", outstanding: "var(--concrete)",
                  }[status];
                  return (
                    <tr key={inv.invoiceNumber}>
                      <td><strong>{inv.invoiceNumber}</strong></td>
                      <td>{inv.invoiceDate}</td>
                      <td>{inv.billToName}</td>
                      <td>{inv.freightBillIds?.length || 0}</td>
                      <td style={{ color: "var(--hazard-deep)", fontWeight: 700 }}>{fmt$(inv.total)}</td>
                      <td style={{ color: "var(--good)", fontWeight: 600 }}>{paid > 0 ? fmt$(paid) : "—"}</td>
                      <td style={{ color: balance > 0 ? "var(--safety)" : "var(--concrete)", fontWeight: 600 }}>{balance > 0 ? fmt$(balance) : "✓"}</td>
                      <td>
                        <span className="chip" style={{ background: statusBg, color: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                          {status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {status !== "paid" && (
                          <button
                            className="btn-primary"
                            style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)", padding: "4px 10px", fontSize: 11 }}
                            onClick={() => setPayingInvoice(inv)}
                          >
                            <DollarSign size={12} /> PAY
                          </button>
                        )}
                        <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setViewingInvoice(inv)}>
                          <Eye size={12} style={{ marginRight: 4 }} /> VIEW
                        </button>
                        <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => reDownload(inv)}>
                          <FileDown size={12} style={{ marginRight: 4 }} /> OPEN
                        </button>
                        <button className="btn-danger" onClick={() => removeInvoice(inv.invoiceNumber)}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== BACKUP / RESTORE ==========
const BACKUP_VERSION = 1;

const buildBackupPayload = (state, { includePhotos = true } = {}) => {
  let freightBills = state.freightBills || [];
  if (!includePhotos) {
    freightBills = freightBills.map((fb) => ({ ...fb, photos: (fb.photos || []).map((p) => ({ id: p.id, name: p.name, stripped: true })) }));
  }
  return {
    _format: "4brothers-backup",
    _version: BACKUP_VERSION,
    _exportedAt: new Date().toISOString(),
    _includesPhotos: includePhotos,
    logs: state.logs || [],
    quotes: state.quotes || [],
    fleet: state.fleet || [],
    dispatches: state.dispatches || [],
    freightBills,
    invoices: state.invoices || [],
    contacts: state.contacts || [],
    quarries: state.quarries || [],
    company: state.company || {},
  };
};

const downloadJSONBackup = (state, { includePhotos = true, filenameSuffix = "" } = {}) => {
  const payload = buildBackupPayload(state, { includePhotos });
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `4brothers-backup-${ts}${filenameSuffix}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return { size: blob.size, payload };
};

const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const rowsToCSV = (rows) => rows.map((r) => r.map(csvEscape).join(",")).join("\n");
const downloadCSV = (filename, rows) => {
  const csv = rowsToCSV(rows);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const exportAllCSVs = (state) => {
  const ts = new Date().toISOString().slice(0, 10);
  const { dispatches = [], freightBills = [], invoices = [], logs = [] } = state;
  const dispMap = {};
  dispatches.forEach((d) => { dispMap[d.id] = d; });

  // Dispatches
  downloadCSV(`4brothers-dispatches-${ts}.csv`, [
    ["Code", "Date", "Job", "Sub-Contractor", "Pickup", "Dropoff", "Material", "Trucks Expected", "Trucks Submitted", "Rate $/hr", "Rate $/ton", "Status", "Notes", "Created"],
    ...dispatches.map((d) => [
      d.code, d.date, d.jobName, d.subContractor || "", d.pickup || "", d.dropoff || "",
      d.material || "", d.trucksExpected, freightBills.filter((fb) => fb.dispatchId === d.id).length,
      d.ratePerHour || "", d.ratePerTon || "", d.status, d.notes || "", d.createdAt || "",
    ]),
  ]);

  // Freight bills
  downloadCSV(`4brothers-freightbills-${ts}.csv`, [
    ["Freight Bill #", "Submitted", "Dispatch Code", "Job", "Sub", "Driver", "Truck", "Material", "Tonnage", "Load Count", "Pickup Time", "Dropoff Time", "Photos", "Notes"],
    ...freightBills.map((fb) => {
      const d = dispMap[fb.dispatchId];
      return [
        fb.freightBillNumber || "", fb.submittedAt || "",
        d?.code || "", d?.jobName || "", d?.subContractor || "",
        fb.driverName || "", fb.truckNumber || "", fb.material || "",
        fb.tonnage || "", fb.loadCount || "", fb.pickupTime || "", fb.dropoffTime || "",
        (fb.photos || []).length, fb.notes || "",
      ];
    }),
  ]);

  // Invoices
  if (invoices.length > 0) {
    downloadCSV(`4brothers-invoices-${ts}.csv`, [
      ["Invoice #", "Date", "Due Date", "Bill To", "Job Reference", "Pricing Method", "Rate", "FB Count", "Subtotal", "Total"],
      ...invoices.map((inv) => [
        inv.invoiceNumber, inv.invoiceDate, inv.dueDate || "",
        inv.billToName || "", inv.jobReference || "",
        inv.pricingMethod || "", inv.rate || "",
        (inv.freightBillIds || []).length, inv.subtotal || 0, inv.total || 0,
      ]),
    ]);
  }

  // Hours logs
  if (logs.length > 0) {
    downloadCSV(`4brothers-hours-${ts}.csv`, [
      ["Date", "Truck", "Driver", "Job", "Start", "End", "Hours", "Billable Hours", "Rate", "Amount", "Notes"],
      ...logs.map((l) => [
        l.date, l.truck, l.driver, l.job || "", l.startTime || "", l.endTime || "",
        l.hours || "", l.billableHours || "", l.rate || "", l.amount || 0, l.notes || "",
      ]),
    ]);
  }
};

const validateBackup = (obj) => {
  if (!obj || typeof obj !== "object") return "Not a valid backup file (not JSON object)";
  if (obj._format !== "4brothers-backup") return "This doesn't look like a 4 Brothers backup file";
  if (typeof obj._version !== "number") return "Backup file is missing version info";
  if (obj._version > BACKUP_VERSION) return `Backup is from a newer app version (v${obj._version}) — update the app first`;
  const arrays = ["logs", "quotes", "fleet", "dispatches", "freightBills", "invoices", "contacts", "quarries"];
  for (const k of arrays) {
    if (obj[k] !== undefined && !Array.isArray(obj[k])) return `Backup field '${k}' is corrupted (not an array)`;
  }
  return null;
};

// ========== CONTACT HELPERS ==========

// ========== CONTACT MODAL ==========
const ContactModal = ({ contact, contacts = [], onSave, onClose, onToast }) => {
  const [draft, setDraft] = useState(contact || {
    type: "sub", companyName: "", contactName: "", phone: "", phone2: "",
    email: "", address: "", typicalTrucks: "", rateNotes: "",
    usdot: "", insurance: "", notes: "", favorite: false, drivesForId: null,
    brokerageApplies: false, brokeragePercent: 8,
    defaultPayRate: "", defaultPayMethod: "hour", defaultTruckNumber: "",
    taxId: "", taxIdType: "", legalName: "", is1099Eligible: false,
  });
  const [showTaxId, setShowTaxId] = useState(false); // masked by default

  const save = async () => {
    if (!draft.companyName && !draft.contactName) {
      alert("Add at least a company name or contact name.");
      return;
    }
    await onSave({
      ...draft,
      id: draft.id || ("temp-" + Date.now()),
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onToast(contact ? "CONTACT UPDATED" : "CONTACT ADDED");
    onClose();
  };

  const typeLabel = { sub: "Sub-Contractor", driver: "Driver", customer: "Customer", broker: "Broker" }[draft.type] || "Contact";
  const companyLabel = draft.type === "driver" ? "Full Name" : "Company Name";
  const companyPlaceholder = {
    sub: "ACME Trucking Inc.",
    driver: "John Smith",
    customer: "Mountain Cascade, Inc.",
    broker: "Regional Freight Brokers LLC",
  }[draft.type];

  const subContacts = contacts.filter((c) => c.type === "sub");

  // v18 Batch 2: Escape closes modal
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={18} /> {contact ? `EDIT ${typeLabel.toUpperCase()}` : `NEW ${typeLabel.toUpperCase()}`}
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "end" }}>
            <div>
              <label className="fbt-label">Type</label>
              <select className="fbt-select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                <option value="sub">Sub-Contractor</option>
                <option value="driver">Driver</option>
                <option value="customer">Customer</option>
                <option value="broker">Broker</option>
              </select>
            </div>
            <div>
              <label className="fbt-label">{companyLabel}</label>
              <input className="fbt-input" value={draft.companyName} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} placeholder={companyPlaceholder} />
            </div>
            <button
              onClick={() => setDraft({ ...draft, favorite: !draft.favorite })}
              className="btn-ghost"
              style={{ padding: "10px 14px", background: draft.favorite ? "var(--hazard)" : "transparent" }}
              title={draft.favorite ? "Preferred contact" : "Mark as preferred"}
            >
              <Star size={16} fill={draft.favorite ? "var(--steel)" : "none"} />
            </button>
          </div>

          {(draft.type === "sub" || draft.type === "customer") && (
            <div>
              <label className="fbt-label">Primary Contact Person</label>
              <input className="fbt-input" value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} placeholder="Who to ask for" />
            </div>
          )}

          {draft.type === "driver" && subContacts.length > 0 && (
            <div>
              <label className="fbt-label">Drives For (Sub-Contractor, optional)</label>
              <select
                className="fbt-select"
                value={draft.drivesForId || ""}
                onChange={(e) => setDraft({ ...draft, drivesForId: e.target.value || null })}
              >
                <option value="">— Independent / Not linked —</option>
                {subContacts.map((s) => (
                  <option key={s.id} value={s.id}>{s.companyName || s.contactName}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Phone (Primary)</label>
              <input className="fbt-input" type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className="fbt-label">Phone (Alt)</label>
              <input className="fbt-input" type="tel" value={draft.phone2} onChange={(e) => setDraft({ ...draft, phone2: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="fbt-label">Email</label>
            <input className="fbt-input" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          </div>

          <div>
            <label className="fbt-label">{draft.type === "customer" ? "Billing Address" : "Address / Office Location"}</label>
            <input className="fbt-input" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Street, City, State ZIP" />
          </div>

          {draft.type === "sub" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
              <div>
                <label className="fbt-label">Typical Truck Count</label>
                <input className="fbt-input" type="number" min="0" value={draft.typicalTrucks} onChange={(e) => setDraft({ ...draft, typicalTrucks: e.target.value })} placeholder="e.g. 3" />
              </div>
              <div>
                <label className="fbt-label">Rate / Pricing Notes</label>
                <input className="fbt-input" value={draft.rateNotes} onChange={(e) => setDraft({ ...draft, rateNotes: e.target.value })} placeholder="$135/hr, 8-hr min" />
              </div>
            </div>
          )}

          {/* Driver defaults — auto-fill when assigned to orders */}
          {draft.type === "driver" && (
            <div style={{ padding: 12, background: "#F0FDF4", border: "2px solid var(--good)" }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>
                ▸ DRIVER DEFAULTS · AUTO-FILL WHEN ASSIGNED TO ORDER
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                <div>
                  <label className="fbt-label">Default Pay Rate $</label>
                  <input
                    className="fbt-input"
                    type="number"
                    step="0.01"
                    value={draft.defaultPayRate ?? ""}
                    onChange={(e) => setDraft({ ...draft, defaultPayRate: e.target.value })}
                    placeholder="e.g. 35.00"
                  />
                </div>
                <div>
                  <label className="fbt-label">Pay Method</label>
                  <select
                    className="fbt-select"
                    value={draft.defaultPayMethod || "hour"}
                    onChange={(e) => setDraft({ ...draft, defaultPayMethod: e.target.value })}
                  >
                    <option value="hour">Per Hour</option>
                    <option value="ton">Per Ton</option>
                    <option value="load">Per Load</option>
                  </select>
                </div>
                <div>
                  <label className="fbt-label">Default Truck #</label>
                  <input
                    className="fbt-input"
                    value={draft.defaultTruckNumber || ""}
                    onChange={(e) => setDraft({ ...draft, defaultTruckNumber: e.target.value })}
                    placeholder="e.g. 12"
                  />
                </div>
              </div>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8, lineHeight: 1.5 }}>
                ▸ THESE AUTO-FILL WHEN YOU ADD THIS DRIVER TO AN ORDER. EDITABLE PER-ORDER IF NEEDED.
              </div>
            </div>
          )}

          {/* Brokerage section — ONLY for subs (drivers are never brokered) */}
          {draft.type === "sub" && (
            <div style={{ padding: 12, background: draft.brokerageApplies ? "#FEF3C7" : "#F5F5F4", border: "2px solid " + (draft.brokerageApplies ? "var(--hazard)" : "var(--concrete)") }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!draft.brokerageApplies}
                  onChange={(e) => setDraft({ ...draft, brokerageApplies: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span className="fbt-mono" style={{ fontSize: 12, letterSpacing: "0.05em", fontWeight: 700 }}>
                  DEDUCT BROKERAGE WHEN PAYING
                </span>
              </label>
              {draft.brokerageApplies && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
                  <label className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>BROKERAGE %:</label>
                  <input
                    className="fbt-input"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={draft.brokeragePercent ?? 8}
                    onChange={(e) => setDraft({ ...draft, brokeragePercent: e.target.value })}
                    style={{ width: 90, padding: "6px 10px" }}
                  />
                  <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
                    (DEFAULT 8%)
                  </span>
                </div>
              )}
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8, lineHeight: 1.5 }}>
                ▸ WHEN WE PAY THIS SUB, WE'LL SUBTRACT THIS % FROM THEIR GROSS PAY (NOT FROM REIMBURSEMENTS). LEAVE OFF IF BROKERAGE ISN'T INVOLVED.
              </div>
            </div>
          )}

          {/* 1099 / Tax section — for subs and drivers */}
          {(draft.type === "sub" || draft.type === "driver") && (
            <div style={{ padding: 12, background: draft.is1099Eligible ? "#F0FDF4" : "#F5F5F4", border: "2px solid " + (draft.is1099Eligible ? "var(--good)" : "var(--concrete)") }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!draft.is1099Eligible}
                  onChange={(e) => setDraft({ ...draft, is1099Eligible: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span className="fbt-mono" style={{ fontSize: 12, letterSpacing: "0.05em", fontWeight: 700 }}>
                  1099 ELIGIBLE — ISSUE 1099-NEC AT YEAR-END
                </span>
              </label>
              {draft.is1099Eligible && (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <div>
                    <label className="fbt-label">Legal Name (on 1099)</label>
                    <input
                      className="fbt-input"
                      value={draft.legalName || ""}
                      onChange={(e) => setDraft({ ...draft, legalName: e.target.value })}
                      placeholder={draft.companyName || draft.contactName || "Full legal name"}
                    />
                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>
                      ▸ LEAVE BLANK TO USE CONTACT NAME · PUT DBA OR REGISTERED NAME IF DIFFERENT
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px", gap: 10, alignItems: "end" }}>
                    <div>
                      <label className="fbt-label">Tax ID Type</label>
                      <select
                        className="fbt-select"
                        value={draft.taxIdType || ""}
                        onChange={(e) => setDraft({ ...draft, taxIdType: e.target.value })}
                      >
                        <option value="">—</option>
                        <option value="ein">EIN</option>
                        <option value="ssn">SSN</option>
                      </select>
                    </div>
                    <div>
                      <label className="fbt-label">
                        Tax ID {draft.taxIdType === "ssn" ? "(SSN)" : draft.taxIdType === "ein" ? "(EIN)" : ""}
                      </label>
                      <input
                        className="fbt-input"
                        type={showTaxId ? "text" : "password"}
                        value={draft.taxId || ""}
                        onChange={(e) => setDraft({ ...draft, taxId: e.target.value })}
                        placeholder={draft.taxIdType === "ein" ? "XX-XXXXXXX" : draft.taxIdType === "ssn" ? "XXX-XX-XXXX" : "Select type first"}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTaxId(!showTaxId)}
                      className="btn-ghost"
                      style={{ padding: "8px 10px", fontSize: 10 }}
                    >
                      {showTaxId ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", padding: 8, background: "#FEF3C7", border: "1px solid var(--hazard)", lineHeight: 1.5 }}>
                    ⚠ SENSITIVE — STORED IN YOUR DATABASE, MASKED ON SCREEN BY DEFAULT · COLLECT VIA W-9 FROM THE CONTRACTOR · DO NOT SHARE THIS CONTACT EXPORT PUBLICLY
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Broker-specific fields */}
          {draft.type === "broker" && (
            <div style={{ padding: 12, background: "#F0FDF4", border: "2px solid var(--good)" }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700 }}>
                ▸ BROKER — PAYS US, NOT WE PAY THEM
              </div>
              <div style={{ fontSize: 12, color: "var(--steel)", lineHeight: 1.5 }}>
                Brokers bring you work and pay you directly. Track their contact info here. Future payroll module will show the brokerage income per broker.
              </div>
            </div>
          )}

          {(draft.type === "sub" || draft.type === "driver") && (
            <>
              <div>
                <label className="fbt-label">USDOT / MC # / CA MCP</label>
                <input className="fbt-input" value={draft.usdot} onChange={(e) => setDraft({ ...draft, usdot: e.target.value })} placeholder="USDOT 1234567 · MC 000000" />
              </div>
              <div>
                <label className="fbt-label">Insurance Info</label>
                <input className="fbt-input" value={draft.insurance} onChange={(e) => setDraft({ ...draft, insurance: e.target.value })} placeholder="Carrier · Policy # · Expires" />
              </div>
            </>
          )}

          <div>
            <label className="fbt-label">Internal Notes</label>
            <textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Reliability, strengths, quirks, preferences..." />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <button onClick={save} className="btn-primary"><CheckCircle2 size={16} /> SAVE</button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ========== CONTACTS TAB ==========
const ContactsTab = ({ contacts, setContacts, dispatches, freightBills, invoices = [], company, onToast }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const save = async (contact) => {
    const exists = contacts.find((c) => c.id === contact.id);
    const next = exists ? contacts.map((c) => c.id === contact.id ? contact : c) : [contact, ...contacts];
    setContacts(next);

  };

  const remove = async (id) => {
    const c = contacts.find((x) => x.id === id);
    if (!c) return;
    if (!confirm(`Delete contact "${c.companyName || c.contactName}"? This won't affect past dispatches.`)) return;
    const next = contacts.filter((x) => x.id !== id);
    setContacts(next);

    onToast("CONTACT DELETED");
    setViewing(null);
  };

  const toggleFavorite = async (id) => {
    const next = contacts.map((c) => c.id === id ? { ...c, favorite: !c.favorite } : c);
    setContacts(next);

  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return contacts
      .filter((c) => typeFilter === "all" || c.type === typeFilter)
      .filter((c) => {
        if (!s) return true;
        return `${c.companyName || ""} ${c.contactName || ""} ${c.phone || ""} ${c.email || ""} ${c.notes || ""}`.toLowerCase().includes(s);
      })
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return (a.companyName || a.contactName || "").localeCompare(b.companyName || b.contactName || "");
      });
  }, [contacts, search, typeFilter]);

  const subsCount = contacts.filter((c) => c.type === "sub").length;
  const driversCount = contacts.filter((c) => c.type === "driver").length;
  const customersCount = contacts.filter((c) => c.type === "customer").length;
  const brokersCount = contacts.filter((c) => c.type === "broker").length;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {showModal && (
        <ContactModal
          contact={editing}
          contacts={contacts}
          onSave={save}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onToast={onToast}
        />
      )}
      {viewing && !showModal && (
        <ContactDetailModal
          contact={viewing}
          dispatches={dispatches}
          freightBills={freightBills}
          company={company}
          onEdit={() => { setEditing(viewing); setShowModal(true); }}
          onDelete={() => remove(viewing.id)}
          onClose={() => setViewing(null)}
          onToast={onToast}
          onSaveContact={async (updated) => {
            await save(updated);
            setViewing(updated);  // refresh the modal with updated data
          }}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{contacts.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{customersCount}</div>
          <div className="stat-label">Customers</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{subsCount}</div>
          <div className="stat-label">Sub-Contractors</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{driversCount}</div>
          <div className="stat-label">Drivers</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{brokersCount}</div>
          <div className="stat-label">Brokers</div>
        </div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--hazard)" }}>
          <div className="stat-num">{contacts.filter((c) => c.favorite).length}</div>
          <div className="stat-label">Preferred ★</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search name, phone, notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="fbt-select" style={{ width: "auto" }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="customer">Customers Only</option>
          <option value="sub">Subs Only</option>
          <option value="driver">Drivers Only</option>
          <option value="broker">Brokers Only</option>
        </select>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
          <UserPlus size={16} /> NEW CONTACT
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <Users size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {search || typeFilter !== "all" ? "NO MATCHES" : "NO CONTACTS YET — ADD YOUR FIRST SUB OR DRIVER"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map((c) => {
            const jobCount = dispatches.filter((d) => d.subContractorId === c.id || (d.subContractor && c.companyName && d.subContractor.toLowerCase() === c.companyName.toLowerCase())).length;
            return (
              <div key={c.id} className="fbt-card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => setViewing(c)}>
                <div className="hazard-stripe-thin" style={{ height: 6 }} />
                <div style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span className="chip" style={{
                          background: c.type === "sub" ? "var(--hazard)"
                            : c.type === "customer" ? "var(--good)"
                            : c.type === "broker" ? "var(--steel)"
                            : "#FFF",
                          color: (c.type === "customer" || c.type === "broker") ? "#FFF" : undefined,
                          fontSize: 9, padding: "2px 8px"
                        }}>
                          {c.type === "sub" ? "SUB"
                            : c.type === "customer" ? "CUSTOMER"
                            : c.type === "broker" ? "BROKER"
                            : "DRIVER"}
                        </span>
                        {jobCount > 0 && <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>{jobCount} job{jobCount !== 1 ? "s" : ""}</span>}
                      </div>
                      <div className="fbt-display" style={{ fontSize: 18, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.companyName || c.contactName}
                      </div>
                      {c.contactName && c.companyName && (
                        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>c/o {c.contactName}</div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(c.id); }}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: c.favorite ? "var(--hazard-deep)" : "var(--concrete)", padding: 4 }}
                      title="Toggle preferred"
                    >
                      <Star size={18} fill={c.favorite ? "var(--hazard-deep)" : "none"} />
                    </button>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)", lineHeight: 1.6 }}>
                    {c.phone && <div>▸ {c.phone}</div>}
                    {c.email && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>▸ {c.email}</div>}
                    {c.typicalTrucks && <div>▸ {c.typicalTrucks} typical trucks</div>}
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                    {c.phone && (
                      <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                        <Phone size={11} style={{ marginRight: 4 }} /> CALL
                      </a>
                    )}
                    {c.phone && (
                      <a href={buildSMSLink(c.phone, `Hi ${c.contactName || ""}, this is ${company?.name || "4 Brothers Trucking"}.`)} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                        <MessageSquare size={11} style={{ marginRight: 4 }} /> TEXT
                      </a>
                    )}
                    {c.email && (
                      <a href={buildEmailLink(c.email, "4 Brothers Trucking", "")} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                        <Mail size={11} style={{ marginRight: 4 }} /> EMAIL
                      </a>
                    )}
                    {/* v18: Statement button for customers only — defaults to all-time, open-only */}
                    {c.type === "customer" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            generateCustomerStatementPDF({
                              customer: c,
                              invoices,
                              company,
                              fromDate: "",
                              toDate: "",
                              openOnly: true,
                            });
                            onToast("✓ STATEMENT OPENED");
                          } catch (err) {
                            console.error("Statement failed:", err);
                            onToast("⚠ POPUP BLOCKED — ALLOW POPUPS");
                          }
                        }}
                        className="btn-primary"
                        style={{ padding: "6px 10px", fontSize: 10, flex: 1, justifyContent: "center", display: "flex", alignItems: "center", background: "var(--good)", color: "#FFF" }}
                        title="Generate open-balance statement for this customer"
                      >
                        <FileDown size={11} style={{ marginRight: 4 }} /> STATEMENT
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ========== QUARRY / MATERIAL HELPERS ==========
const newQuarryDraft = () => ({
  id: null,
  name: "", address: "", contactName: "", phone: "", email: "",
  hours: "", deliveryTerms: "", scaleInfo: "", notes: "",
  materials: [], // [{ id, name, pricePerTon, updatedAt, history: [{price, date}] }]
});

const newMaterialRow = (name = "", price = "") => ({
  id: Date.now() + Math.random(),
  name,
  pricePerTon: price,
  updatedAt: new Date().toISOString(),
  history: [],
});

// ========== QUARRY MODAL ==========
const QuarryModal = ({ quarry, onSave, onClose, onToast }) => {
  const [draft, setDraft] = useState(quarry ? JSON.parse(JSON.stringify(quarry)) : newQuarryDraft());

  const updateMaterial = (idx, field, value) => {
    const next = [...draft.materials];
    next[idx] = { ...next[idx], [field]: value };
    setDraft({ ...draft, materials: next });
  };

  const addMaterial = () => {
    setDraft({ ...draft, materials: [...draft.materials, newMaterialRow()] });
  };

  const removeMaterial = (idx) => {
    setDraft({ ...draft, materials: draft.materials.filter((_, i) => i !== idx) });
  };

  const save = async () => {
    if (!draft.name) { alert("Quarry name is required."); return; }

    // For existing quarry, detect price changes and log history
    const now = new Date().toISOString();
    const changes = [];
    let updatedMaterials = draft.materials.map((m) => ({ ...m }));

    if (quarry) {
      updatedMaterials = updatedMaterials.map((m) => {
        const prev = quarry.materials.find((pm) => pm.id === m.id);
        const newPrice = Number(m.pricePerTon);
        if (prev && Number(prev.pricePerTon) !== newPrice && !isNaN(newPrice)) {
          const entry = { price: Number(prev.pricePerTon), date: prev.updatedAt || now };
          changes.push({ name: m.name, old: Number(prev.pricePerTon), new: newPrice });
          return {
            ...m,
            history: [entry, ...(prev.history || [])].slice(0, 50),
            updatedAt: now,
          };
        }
        if (!prev && !isNaN(newPrice) && newPrice > 0) {
          return { ...m, updatedAt: now, history: [] };
        }
        return m;
      });
    } else {
      updatedMaterials = updatedMaterials.map((m) => ({
        ...m, updatedAt: now, history: m.history || [],
      }));
    }

    const saved = {
      ...draft,
      materials: updatedMaterials.filter((m) => m.name.trim()),
      id: draft.id || ("temp-" + Date.now()),
      createdAt: draft.createdAt || now,
      updatedAt: now,
    };

    await onSave(saved);

    // Toast for price changes
    if (changes.length > 0) {
      const first = changes[0];
      const diff = first.new - first.old;
      const dir = diff > 0 ? "↑" : "↓";
      const verb = diff > 0 ? "INCREASE" : "SAVINGS";
      onToast(`${dir} ${first.name.toUpperCase()}: $${Math.abs(diff).toFixed(2)} ${verb}${changes.length > 1 ? ` (+${changes.length - 1} more)` : ""}`);
    } else {
      onToast(quarry ? "QUARRY UPDATED" : "QUARRY ADDED");
    }
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Mountain size={18} /> {quarry ? "EDIT QUARRY" : "NEW QUARRY / SUPPLIER"}
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div>
            <label className="fbt-label">Quarry / Supplier Name *</label>
            <input className="fbt-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Vulcan Materials — Napa" />
          </div>
          <div>
            <label className="fbt-label">Address / Location</label>
            <input className="fbt-input" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Street, City, State ZIP" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Contact Person</label>
              <input className="fbt-input" value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Phone</label>
              <input className="fbt-input" type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Email</label>
              <input className="fbt-input" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="fbt-label">Hours of Operation / Loading Hours</label>
            <input className="fbt-input" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} placeholder="M-F 6am-5pm · Sat 7am-12pm · Loading until 4:30pm" />
          </div>
          <div>
            <label className="fbt-label">Delivery Terms</label>
            <input className="fbt-input" value={draft.deliveryTerms} onChange={(e) => setDraft({ ...draft, deliveryTerms: e.target.value })} placeholder="FOB yard · min 22 tons · delivery quoted separately" />
          </div>
          <div>
            <label className="fbt-label">Scale Info</label>
            <input className="fbt-input" value={draft.scaleInfo} onChange={(e) => setDraft({ ...draft, scaleInfo: e.target.value })} placeholder="Certified scales · tickets emailed + paper copy" />
          </div>
          <div>
            <label className="fbt-label">Internal Notes</label>
            <textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Quality, reliability, special deals, quirks…" />
          </div>

          {/* Materials section */}
          <div style={{ borderTop: "2px solid var(--steel)", paddingTop: 16, marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Package size={18} style={{ color: "var(--hazard-deep)" }} />
              <div className="fbt-display" style={{ fontSize: 16 }}>MATERIALS & PRICING</div>
            </div>
            {draft.materials.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", border: "2px dashed var(--concrete)", color: "var(--concrete)" }}>
                <Package size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div className="fbt-mono" style={{ fontSize: 11 }}>NO MATERIALS YET — ADD ONE BELOW</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {draft.materials.map((m, idx) => {
                  const originalPrice = quarry?.materials.find((pm) => pm.id === m.id)?.pricePerTon;
                  const hasChanged = originalPrice !== undefined && Number(originalPrice) !== Number(m.pricePerTon) && m.pricePerTon !== "";
                  const diff = hasChanged ? Number(m.pricePerTon) - Number(originalPrice) : 0;
                  return (
                    <div key={m.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10, alignItems: "end", padding: 10, border: "1.5px solid var(--steel)", background: hasChanged ? "#FEF3C7" : "#FFF" }}>
                      <div>
                        <label className="fbt-label" style={{ marginBottom: 4 }}>Material</label>
                        <input className="fbt-input" style={{ padding: "8px 10px", fontSize: 13 }} value={m.name} onChange={(e) => updateMaterial(idx, "name", e.target.value)} placeholder="Basalt 3/4 chip" />
                      </div>
                      <div>
                        <label className="fbt-label" style={{ marginBottom: 4 }}>$ / ton</label>
                        <input className="fbt-input" style={{ padding: "8px 10px", fontSize: 13 }} type="number" step="0.01" value={m.pricePerTon} onChange={(e) => updateMaterial(idx, "pricePerTon", e.target.value)} placeholder="28.50" />
                        {hasChanged && (
                          <div className="fbt-mono" style={{ fontSize: 9, marginTop: 3, color: diff > 0 ? "var(--safety)" : "var(--good)" }}>
                            {diff > 0 ? "↑" : "↓"} ${Math.abs(diff).toFixed(2)} from ${Number(originalPrice).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <button className="btn-danger" onClick={() => removeMaterial(idx)}><Trash2 size={12} /></button>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={addMaterial} className="btn-ghost" style={{ marginTop: 12 }}>
              <Plus size={14} style={{ marginRight: 6 }} /> ADD MATERIAL
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <button onClick={save} className="btn-primary"><CheckCircle2 size={16} /> SAVE QUARRY</button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ========== FREIGHT BILL EDIT / APPROVE MODAL ==========

// ========== REVIEW TAB (End-of-day approval screen) ==========
const ReviewTab = ({ freightBills, dispatches, setDispatches, contacts, editFreightBill, invoices = [], pendingFB, clearPendingFB, onToast }) => {
  const [filter, setFilter] = useState("pending");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

  // Auto-open FB editor when jumping from home dashboard
  useEffect(() => {
    if (pendingFB) {
      const fb = freightBills.find((x) => x.id === pendingFB);
      if (fb) {
        setFilter("all"); // make sure it's visible in filtering
        setEditing(fb);
      }
      if (clearPendingFB) clearPendingFB();
    }
  }, [pendingFB, freightBills]);

  const pendingCount = freightBills.filter((fb) => (fb.status || "pending") === "pending").length;
  const approvedCount = freightBills.filter((fb) => fb.status === "approved").length;
  const rejectedCount = freightBills.filter((fb) => fb.status === "rejected").length;

  const filtered = useMemo(() => {
    let list = freightBills;
    if (filter !== "all") list = list.filter((fb) => (fb.status || "pending") === filter);
    if (dateFrom) list = list.filter((fb) => (fb.submittedAt || "").slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter((fb) => (fb.submittedAt || "").slice(0, 10) <= dateTo);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((fb) => {
        const d = dispatches.find((x) => x.id === fb.dispatchId);
        const hay = `${fb.freightBillNumber} ${fb.driverName} ${fb.truckNumber} ${fb.material} ${d?.jobName || ""} ${d?.code || ""}`.toLowerCase();
        return hay.includes(s);
      });
    }
    return list.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  }, [freightBills, filter, dateFrom, dateTo, search, dispatches]);

  const approveAll = async () => {
    const pending = filtered.filter((fb) => (fb.status || "pending") === "pending");
    if (pending.length === 0) { onToast("NOTHING TO APPROVE"); return; }
    if (!confirm(`Approve ${pending.length} pending freight bill${pending.length !== 1 ? "s" : ""}? Customers will be able to see them.`)) return;
    try {
      for (const fb of pending) {
        await editFreightBill(fb.id, {
          ...fb,
          status: "approved",
          approvedAt: new Date().toISOString(),
          approvedBy: "admin",
        });
      }
      onToast(`✓ ${pending.length} APPROVED`);
    } catch (e) {
      console.error(e);
      onToast("BATCH APPROVE FAILED");
    }
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {editing && (
        <FBEditModal
          fb={editing}
          dispatches={dispatches}
          setDispatches={setDispatches}
          contacts={contacts}
          freightBills={freightBills}
          editFreightBill={editFreightBill}
          invoices={invoices}
          onClose={() => setEditing(null)}
          onToast={onToast}
          currentUser="admin"
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <div className="fbt-card" style={{ padding: 18, background: "var(--hazard)", color: "var(--steel)" }}>
          <div className="stat-num" style={{ color: "var(--steel)" }}>{pendingCount}</div>
          <div className="stat-label">Pending Review</div>
        </div>
        <div className="fbt-card" style={{ padding: 18, background: "var(--good)", color: "#FFF" }}>
          <div className="stat-num" style={{ color: "#FFF" }}>{approvedCount}</div>
          <div className="stat-label" style={{ color: "#FFF" }}>Approved</div>
        </div>
        <div className="fbt-card" style={{ padding: 18 }}>
          <div className="stat-num">{rejectedCount}</div>
          <div className="stat-label">Rejected</div>
        </div>
        <div className="fbt-card" style={{ padding: 18 }}>
          <div className="stat-num">{freightBills.length}</div>
          <div className="stat-label">Total</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search FB#, driver, truck, job…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="fbt-select" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="pending">Pending Only</option>
          <option value="approved">Approved Only</option>
          <option value="rejected">Rejected Only</option>
          <option value="all">All</option>
        </select>
        <input className="fbt-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: "auto" }} title="From" />
        <input className="fbt-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: "auto" }} title="To" />
        {filter === "pending" && pendingCount > 0 && (
          <button onClick={approveAll} className="btn-primary" style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}>
            <ShieldCheck size={14} /> APPROVE ALL ({filtered.filter(fb => (fb.status || "pending") === "pending").length})
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <ShieldCheck size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {filter === "pending" ? "NO PENDING FREIGHT BILLS — ALL CAUGHT UP" : "NO MATCHES"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map((fb) => {
            const d = dispatches.find((x) => x.id === fb.dispatchId);
            const status = fb.status || "pending";
            const bg = status === "approved" ? "#F0FDF4" : status === "rejected" ? "#FEF2F2" : "#FEF3C7";
            const border = status === "approved" ? "var(--good)" : status === "rejected" ? "var(--safety)" : "var(--hazard)";
            const photos = fb.photos || [];
            return (
              <div key={fb.id} className="fbt-card" style={{ padding: 14, background: bg, borderLeft: `4px solid ${border}`, cursor: "pointer" }} onClick={() => setEditing(fb)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                      <span className="chip" style={{ background: border, color: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                        {status.toUpperCase()}
                      </span>
                      <span className="chip" style={{ background: "var(--hazard)", fontSize: 9, padding: "2px 8px" }}>FB #{fb.freightBillNumber || "—"}</span>
                      {d && <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>Order #{d.code}</span>}
                      {photos.length > 0 && (
                        <span className="chip" style={{ background: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                          <Camera size={10} style={{ marginRight: 3 }} /> {photos.length}
                        </span>
                      )}
                    </div>
                    <div className="fbt-display" style={{ fontSize: 15, lineHeight: 1.2 }}>
                      {fb.driverName || "Unknown driver"} · Truck {fb.truckNumber || "—"}
                    </div>
                    <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
                      {d?.jobName || "—"} · {fb.tonnage ? `${fb.tonnage}T` : ""}{fb.hoursBilled ? ` · ${fb.hoursBilled}hrs` : fb.pickupTime && fb.dropoffTime ? ` · ${fb.pickupTime}→${fb.dropoffTime}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {photos.slice(0, 3).map((p, idx) => (
                      <img key={idx} src={p.dataUrl} alt="" style={{ width: 44, height: 44, objectFit: "cover", border: "1px solid var(--steel)" }} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ========== PAYROLL: MARK PAID MODAL ==========
// ========== PAY STATEMENT PDF GENERATOR (v18 Session 3) ==========
// Clean invoice-style layout: centered SVG logo · 3-col header · Pay To block · sparse table ·
// per-FB brokerage deduction · boxed total · thank you + notes footer.
const generatePayStubPDF = ({ subName, subKind, subId, fbs, payRecord, allDispatches, company, contact, statementNumber = null }) => {
  const esc = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
  const fmtQty = (n) => Number(n || 0).toFixed(2);
  const methodLabel = { check: "Check", ach: "ACH / Bank Transfer", cash: "Cash", zelle: "Zelle", venmo: "Venmo", other: "Other" };
  const fmtFullDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" }) : "";
  const fmtLongDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "";

  // Inline SVG logo — matches invoice PDF exactly.
  const logoSvg = `<svg viewBox="0 0 120 120" width="88" height="88" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" fill="#FFF" stroke="#1C1917" stroke-width="3"/>
    <circle cx="60" cy="60" r="48" fill="none" stroke="#1C1917" stroke-width="1"/>
    <path d="M 10 56 L 110 56 L 110 74 L 10 74 Z" fill="#1C1917"/>
    <path d="M 2 58 L 10 56 L 10 74 L 2 76 Z" fill="#1C1917"/>
    <path d="M 118 58 L 110 56 L 110 74 L 118 76 Z" fill="#1C1917"/>
    <text x="60" y="69" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="10" font-weight="900" fill="#FFF" letter-spacing="0.5">4 BROTHERS</text>
    <text x="60" y="38" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="22" font-weight="900" fill="#1C1917" letter-spacing="-1">4B</text>
    <path d="M 22 44 Q 60 32 98 44" fill="none" stroke="#1C1917" stroke-width="1.2"/>
    <text x="60" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" font-weight="700" fill="#1C1917" letter-spacing="1">TRUCKING, LLC</text>
  </svg>`;

  // Build table rows: for each FB, emit pay lines with date/fb#/truck on first row.
  // If any pay line is brokerable, emit a separate "BROKERAGE" deduction row right after that FB.
  const rowsHtml = fbs.map((fb) => {
    const dispatch = allDispatches.find((d) => d.id === fb.dispatchId);
    const fbDate = fb.submittedAt ? fmtFullDate(fb.submittedAt) : "";
    const payLines = Array.isArray(fb.payingLines) ? fb.payingLines : [];

    if (payLines.length === 0) {
      // Legacy / unfilled FB — fall back to paid snapshot or skip
      const method = fb.paidMethodSnapshot || (dispatch?.ratePerHour ? "hour" : "hour");
      const qty = method === "hour" ? Number(fb.paidHours || 0)
                : method === "ton" ? Number(fb.paidTons || 0)
                : Number(fb.paidLoads || 0);
      const rate = Number(fb.paidRate || 0);
      const gross = qty * rate;
      const desc = method === "hour" ? "HOURLY" : method === "ton" ? "TONS" : "LOADS";
      if (qty === 0 && gross === 0) return "";
      return `<tr class="line line-first">
        <td>${esc(fbDate)}</td>
        <td>${esc(fb.freightBillNumber || '—')}</td>
        <td>${esc(fb.truckNumber || '')}</td>
        <td>${desc}</td>
        <td class="r">${fmtQty(qty)}</td>
        <td class="r">${money(rate)}</td>
        <td class="r">${money(gross)}</td>
      </tr>`;
    }

    // v23 Session CC: Emit each pay line with inline Gross | Fee% | Fee$ | Net columns.
    // (Previously: Gross in "Amount" column + separate "BROKERAGE DEDUCTION" row below.)
    const lineRows = payLines.map((ln, lnIdx) => {
      const isFirst = lnIdx === 0;
      const desc = (ln.item || ln.code || "").toUpperCase();
      const qty = Number(ln.qty) || 0;
      const rate = Number(ln.rate) || 0;
      const gross = Number(ln.gross) || (qty * rate);
      const feePct = ln.brokerable ? (Number(ln.brokeragePct) || 0) : 0;
      const feeAmt = ln.brokerable ? gross * feePct / 100 : 0;
      const net = gross - feeAmt;
      return `<tr class="line ${isFirst ? 'line-first' : 'line-sub'}">
        <td>${isFirst ? esc(fbDate) : ''}</td>
        <td>${isFirst ? esc(fb.freightBillNumber || '—') : ''}</td>
        <td>${isFirst ? esc(fb.truckNumber || '') : ''}</td>
        <td>${esc(desc)}</td>
        <td class="r">${fmtQty(qty)}</td>
        <td class="r">${money(rate)}</td>
        <td class="r">${money(gross)}</td>
        <td class="r" style="${feePct > 0 ? 'color: #92400E;' : 'color: #999;'}">${feePct > 0 ? feePct.toFixed(1) + '%' : '—'}</td>
        <td class="r" style="${feeAmt > 0 ? 'color: #92400E;' : 'color: #999;'}">${feeAmt > 0 ? '−' + money(feeAmt) : '—'}</td>
        <td class="r" style="font-weight: 700;">${money(net)}</td>
      </tr>`;
    }).join("");

    // No separate deduction row needed — fee is inline on each line now.
    return lineRows;
  }).join("");

  // Total Due = sum of all NET values across all pay lines
  const subtotalGross = fbs.reduce((s, fb) => {
    const lines = Array.isArray(fb.payingLines) ? fb.payingLines : [];
    if (lines.length === 0) {
      // Legacy fallback
      const method = fb.paidMethodSnapshot || "hour";
      const qty = method === "hour" ? Number(fb.paidHours || 0)
                : method === "ton" ? Number(fb.paidTons || 0)
                : Number(fb.paidLoads || 0);
      return s + qty * Number(fb.paidRate || 0);
    }
    return s + lines.reduce((ss, ln) => ss + ((Number(ln.gross) || ((Number(ln.qty) || 0) * (Number(ln.rate) || 0)))), 0);
  }, 0);

  const totalBrokerage = fbs.reduce((s, fb) => {
    const lines = Array.isArray(fb.payingLines) ? fb.payingLines : [];
    return s + lines.reduce((ss, ln) => {
      if (!ln.brokerable) return ss;
      const gross = Number(ln.gross) || ((Number(ln.qty) || 0) * (Number(ln.rate) || 0));
      return ss + gross * (Number(ln.brokeragePct) || 0) / 100;
    }, 0);
  }, 0);

  const totalDue = subtotalGross - totalBrokerage;
  const statementDate = payRecord?.paidAt || new Date().toISOString();
  const statementNum = statementNumber || `PS-${new Date(statementDate).getFullYear()}-${String(subId || "DRAFT").slice(0, 8)}`;

  // Pay To block (left-aligned, mirrors invoice's Bill To)
  const payToCompany = contact?.companyName || "";
  const payToPerson = contact?.contactName || subName || "";
  const payToAddress = contact?.address || "";

  // Company header info (left column — mirrors invoice)
  const companyAddr = company?.address ? company.address.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const companyLines = [
    company?.name || "4 BROTHERS TRUCKING, LLC",
    ...companyAddr,
    company?.phone ? `Office: ${company.phone}` : "",
    company?.email || "",
  ].filter(Boolean);

  // Optional payment info block (shows check # / method if already paid)
  const paidInfoHtml = payRecord?.paidAt ? `
    <div class="paid-info">
      <div><strong>PAID:</strong> ${esc(fmtLongDate(payRecord.paidAt))}
        ${payRecord.paidMethod ? ` · <strong>${esc(methodLabel[payRecord.paidMethod] || payRecord.paidMethod)}</strong>` : ""}
        ${payRecord.paidCheckNumber ? ` · Check #${esc(payRecord.paidCheckNumber)}` : ""}
      </div>
      ${payRecord.paidNotes ? `<div style="font-style: italic; color: #666; margin-top: 4px;">"${esc(payRecord.paidNotes)}"</div>` : ""}
    </div>` : "";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Pay Statement ${esc(statementNum)} — ${esc(payToPerson)}</title>
<style>
  @page { margin: 0.5in; size: letter; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 18px; font-family: 'Times New Roman', Times, serif; color: #000; font-size: 10pt; line-height: 1.35; }
  .btn-print { position: fixed; top: 10px; right: 10px; padding: 10px 20px; background: #F59E0B; color: #000; border: 2px solid #000; font-weight: 900; cursor: pointer; font-size: 11pt; letter-spacing: 0.06em; box-shadow: 3px 3px 0 #000; z-index: 999; font-family: Arial, sans-serif; }
  @media print { .btn-print { display: none; } body { padding: 0; } }

  .hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 26px; }
  .hdr-left { flex: 1; }
  .hdr-left .co-name { font-weight: 700; font-size: 11pt; text-transform: uppercase; letter-spacing: 0.02em; }
  .hdr-left .co-line { font-size: 10pt; color: #000; }
  .hdr-logo { flex-shrink: 0; padding: 0 20px; }
  .hdr-right { flex: 1; text-align: right; font-size: 10pt; }
  .hdr-right .stmt-num { font-weight: 700; font-size: 11pt; margin-bottom: 2px; }
  .hdr-right .stmt-kind { font-size: 9pt; color: #555; text-transform: uppercase; letter-spacing: 0.06em; }

  .payto { margin-bottom: 16px; }
  .payto .label { font-size: 9pt; color: #555; font-style: italic; margin-bottom: 2px; }
  .payto .name { font-size: 11pt; font-weight: 700; text-transform: uppercase; }
  .payto .sub { font-size: 10pt; color: #333; }

  table.lines { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  table.lines thead th {
    background: #E5E5E5;
    font-size: 9.5pt;
    font-weight: 700;
    text-align: left;
    padding: 4px 6px;
    border: 1px solid #000;
  }
  table.lines thead th.r { text-align: right; }
  table.lines td {
    font-size: 9.5pt;
    padding: 2px 6px;
    border: 1px solid #000;
    vertical-align: top;
  }
  table.lines td.r { text-align: right; }
  table.lines tr.line-sub td:nth-child(-n+3) { border-top: none; border-bottom: none; }
  table.lines tr.brokerage-row td { background: #FFFBEB; }
  table.lines th:nth-child(1), table.lines td:nth-child(1) { width: 7%; }
  table.lines th:nth-child(2), table.lines td:nth-child(2) { width: 8%; }
  table.lines th:nth-child(3), table.lines td:nth-child(3) { width: 7%; }
  table.lines th:nth-child(4), table.lines td:nth-child(4) { width: 24%; }
  table.lines th:nth-child(5), table.lines td:nth-child(5) { width: 7%; }
  table.lines th:nth-child(6), table.lines td:nth-child(6) { width: 9%; }
  table.lines th:nth-child(7), table.lines td:nth-child(7) { width: 10%; }
  table.lines th:nth-child(8), table.lines td:nth-child(8) { width: 7%; }
  table.lines th:nth-child(9), table.lines td:nth-child(9) { width: 10%; }
  table.lines th:nth-child(10), table.lines td:nth-child(10) { width: 11%; }

  .summary-box { display: flex; justify-content: flex-end; margin-top: 6px; }
  .summary-inner { min-width: 340px; }
  .summary-inner .sum-row { display: flex; justify-content: space-between; padding: 3px 14px; font-size: 10pt; }
  .summary-inner .sum-row.sub { color: #444; }
  .summary-inner .sum-row.ded { color: #92400E; font-style: italic; }
  .summary-inner .total-box {
    border: 2px solid #000;
    padding: 6px 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    display: flex;
    gap: 40px;
    justify-content: space-between;
    margin-top: 4px;
    font-size: 11pt;
  }

  .paid-info { margin-top: 14px; padding: 10px 14px; border: 1.5px solid #047857; background: #F0FDF4; font-size: 10pt; }

  .thank-you { text-align: center; font-size: 11pt; font-style: italic; margin-top: 24px; }
  .terms { text-align: center; font-size: 9pt; color: #444; margin-top: 6px; padding: 0 20px; line-height: 1.4; }
</style></head>
<body>
<button class="btn-print" onclick="window.print()">🖨 PRINT / SAVE AS PDF</button>

<div class="hdr">
  <div class="hdr-left">
    ${companyLines.map((l, i) => `<div class="${i === 0 ? 'co-name' : 'co-line'}">${esc(l)}</div>`).join("")}
  </div>
  <div class="hdr-logo">${logoSvg}</div>
  <div class="hdr-right">
    <div class="stmt-kind">${subKind === "sub" ? "SUB / 1099" : "DRIVER"} PAY STATEMENT</div>
    <div class="stmt-num">${esc(statementNum)}</div>
    <div>Date: ${esc(fmtLongDate(statementDate))}</div>
    ${fbs.length > 0 && fbs[0].submittedAt ? `<div>Period: ${esc(fmtLongDate(fbs[fbs.length - 1].submittedAt))} — ${esc(fmtLongDate(fbs[0].submittedAt))}</div>` : ''}
  </div>
</div>

<div class="payto">
  <div class="label">Pay To:</div>
  <div class="name">${esc(payToCompany || payToPerson)}</div>
  ${payToCompany && payToPerson ? `<div class="sub">Attn: ${esc(payToPerson)}</div>` : ''}
  ${payToAddress ? `<div class="sub">${esc(payToAddress)}</div>` : ''}
  ${contact?.phone ? `<div class="sub">Phone: ${esc(contact.phone)}</div>` : ''}
  ${contact?.email ? `<div class="sub">Email: ${esc(contact.email)}</div>` : ''}
</div>

<table class="lines">
  <thead>
    <tr>
      <th>Date</th>
      <th>Ft Bill</th>
      <th>Truck</th>
      <th>Description</th>
      <th class="r">Qty</th>
      <th class="r">Rate</th>
      <th class="r">Gross</th>
      <th class="r">Fee%</th>
      <th class="r">Fee $</th>
      <th class="r">Net</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml || `<tr><td colspan="10" style="text-align:center; padding: 20px; color: #999; font-style: italic;">No pay lines on statement.</td></tr>`}
  </tbody>
</table>

<div class="summary-box">
  <div class="summary-inner">
    ${totalBrokerage > 0 ? `
      <div class="sum-row sub">
        <span>Gross Pay</span>
        <span>${money(subtotalGross)}</span>
      </div>
      <div class="sum-row ded">
        <span>Total Fees Deducted</span>
        <span>−${money(totalBrokerage)}</span>
      </div>
    ` : ''}
    <div class="total-box">
      <span>Total Due</span>
      <span>${money(totalDue)}</span>
    </div>
  </div>
</div>

${paidInfoHtml}

<div class="thank-you">Thank you for your work</div>
<div class="terms">Questions about this pay statement? Contact ${esc(company?.email || "office@4brotherstruck.com")} or call ${esc(company?.phone || "")}.</div>

</body></html>`;

  const w = window.open("", "_blank", "width=850,height=1100");
  if (!w) throw new Error("Popup blocked — please allow popups to generate pay statements.");
  w.document.write(html);
  w.document.close();
  return { opened: true };
};

// ========== PAY STUB MODAL (offered after marking paid) ==========
const PayStubOfferModal = ({ target, onPrint, onClose }) => {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ padding: "18px 22px", background: "var(--good)", color: "#FFF" }}>
          <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em" }}>PAYMENT RECORDED</div>
          <h3 className="fbt-display" style={{ fontSize: 18, margin: "4px 0 0" }}>Print Pay Stub?</h3>
        </div>
        <div style={{ padding: 22 }}>
          <p style={{ fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
            Payment to <strong>{target.subName}</strong> of <strong>{fmt$(target.net)}</strong> has been recorded.
            Would you like to generate a pay stub now?
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => { onPrint(); onClose(); }}
              className="btn-primary"
              style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}
            >
              <Printer size={16} /> PRINT STUB
            </button>
            <button onClick={onClose} className="btn-ghost">SKIP</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaidModal = ({ target, fbs, editFreightBill, allFreightBills = [], onClose, onToast, onPaidSuccess, currentUser }) => {
  // target = { projectName, subName, subId, gross, brokeragePct, brokerageAmt, net, fbs }
  const defaultAmt = target.net.toFixed(2);
  const [form, setForm] = useState({
    amount: defaultAmt,
    method: "check",
    checkNumber: "",
    paidAt: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const proceed = async () => {
    if (!form.amount || Number(form.amount) <= 0) { onToast("ENTER AMOUNT"); return; }
    if (form.method === "check" && !form.checkNumber) {
      if (!confirm("No check number entered. Mark paid anyway?")) return;
    }

    // DOUBLE-PAY BACKSTOP — warn if any FB in this batch is already paid
    const alreadyPaid = fbs.filter((x) => x.fb.paidAt);
    if (alreadyPaid.length > 0) {
      const names = alreadyPaid.map((x) => `FB#${x.fb.freightBillNumber || "—"} (paid ${new Date(x.fb.paidAt).toLocaleDateString()})`).join(", ");
      const ok = confirm(
        `⚠ WARNING: ${alreadyPaid.length} FB${alreadyPaid.length !== 1 ? "S" : ""} ALREADY MARKED PAID:\n\n${names}\n\nPaying again will OVERWRITE the existing payment record. Continue?`
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      // v19b Session J: Generate a pay statement number for this pay run.
      // Format: PS-YYYY-NNNN (year + zero-padded sequence). Each pay RUN gets one number,
      // shared across all FBs in the run (matches physical check reality).
      // We scan existing FBs for the highest number in the current year and +1.
      const year = new Date(form.paidAt).getFullYear();
      const prefix = `PS-${year}-`;
      let maxNum = 0;
      (allFreightBills || []).forEach((f) => {
        if (f.payStatementNumber && f.payStatementNumber.startsWith(prefix)) {
          const suffix = f.payStatementNumber.slice(prefix.length);
          const n = parseInt(suffix, 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      });
      const nextNum = maxNum + 1;
      const payStatementNumber = `${prefix}${String(nextNum).padStart(4, "0")}`;

      const stamp = {
        paidAt: new Date(form.paidAt).toISOString(),
        paidBy: currentUser || "admin",
        paidMethod: form.method,
        paidCheckNumber: form.checkNumber || "",
        paidNotes: form.notes || "",
        payStatementNumber,  // v19b Session J: shared across all FBs in this pay run
      };

      // Distribute the amount across each FB proportionally to its gross
      const grossByFb = fbs.map((x) => x.adjustedGross !== undefined ? x.adjustedGross : x.gross);
      const grossSum = grossByFb.reduce((s, v) => s + v, 0) || 1;
      const totalAmt = Number(form.amount);
      const lockStamp = new Date().toISOString();

      const paidFbs = [];
      for (let i = 0; i < fbs.length; i++) {
        const entry = fbs[i];
        const share = grossSum > 0 ? (entry.gross / grossSum) * totalAmt : totalAmt / fbs.length;
        const updatedFb = {
          ...entry.fb,
          ...stamp,
          paidAmount: Number(share.toFixed(2)),
          // Lock pay snapshot — pay statement generated, no more editing hours/rate directly
          payStatementLockedAt: entry.fb.payStatementLockedAt || lockStamp,
          // Ensure snapshot exists for FBs that were approved pre-v15
          paidRate: entry.fb.paidRate != null ? entry.fb.paidRate : entry.rate,
          paidMethodSnapshot: entry.fb.paidMethodSnapshot || entry.method,
          paidHours: entry.fb.paidHours != null ? entry.fb.paidHours : (entry.method === "hour" ? entry.qty : null),
          paidTons: entry.fb.paidTons != null ? entry.fb.paidTons : (entry.method === "ton" ? entry.qty : null),
          paidLoads: entry.fb.paidLoads != null ? entry.fb.paidLoads : (entry.method === "load" ? entry.qty : null),
        };
        await editFreightBill(entry.fb.id, updatedFb);
        paidFbs.push(updatedFb);
      }
      // v20 Session O: audit log — one entry per pay run (not per FB)
      logAudit({
        actionType: "fb.paid",
        entityType: "pay_run",
        entityId: payStatementNumber,  // use PS number as the "pay run" identifier
        entityLabel: payStatementNumber,
        actor: currentUser || "admin",
        metadata: {
          payStatementNumber,
          subName: target.subName,
          subKind: target.subKind,
          fbCount: fbs.length,
          fbIds: paidFbs.map((f) => f.id),
          fbNumbers: paidFbs.map((f) => f.freightBillNumber).filter(Boolean),
          totalAmount: Number(form.amount),
          method: form.method,
          checkNumber: form.checkNumber || "",
          paidAt: stamp.paidAt,
        },
      });
      onToast(`✓ PAID ${target.subName} — ${fbs.length} FB${fbs.length !== 1 ? "S" : ""} · ${payStatementNumber}`);

      // Trigger stub offer BEFORE closing so parent can show the PayStubOfferModal
      if (onPaidSuccess) {
        onPaidSuccess({ paidFbs, payRecord: stamp });
      }
      onClose();
    } catch (e) {
      console.error(e);
      onToast("MARK PAID FAILED");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", letterSpacing: "0.1em" }}>MARK PAID</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>{target.subName}</h3>
            <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1", marginTop: 2 }}>
              {target.projectName || "(No project)"} · {fbs.length} FB{fbs.length !== 1 ? "S" : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 22, display: "grid", gap: 12 }}>

          {/* Advance-pay warning */}
          {target.includeAdvance && target.hasAdvance && (
            <div style={{ padding: 10, background: "#FEF2F2", border: "2px solid var(--safety)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--safety)" }}>
              ⚠ <strong>ADVANCE PAY WARNING:</strong> Some FBs here haven't been paid by customer yet. You're fronting the cash.
            </div>
          )}

          {/* Short-pay notice */}
          {(() => {
            const shortFbs = fbs.filter((x) => x.custStatus === "short");
            if (shortFbs.length === 0) return null;
            return (
              <div style={{ padding: 10, background: "#FEF3C7", border: "2px solid var(--hazard)", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                ⚠ <strong>{shortFbs.length} SHORT-PAID FB{shortFbs.length !== 1 ? "S" : ""}:</strong> Sub will be paid proportionally to what customer paid.
              </div>
            );
          })()}

          {/* Breakdown */}
          <div style={{ padding: 12, background: "#F5F5F4", border: "1.5px solid var(--steel)", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span>GROSS (adjusted for short-pay):</span><strong>{fmt$(target.gross)}</strong>
            </div>
            {target.brokerageAmt > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "var(--hazard-deep)" }}>
                <span>BROKERAGE ({target.brokeragePct}%):</span><strong>−{fmt$(target.brokerageAmt)}</strong>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--steel)", fontWeight: 700 }}>
              <span>NET:</span><span style={{ color: "var(--good)" }}>{fmt$(target.net)}</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Date Paid</label>
              <input className="fbt-input" type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Amount Paid $</label>
              <input className="fbt-input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="fbt-label">Method</label>
            <select className="fbt-select" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="check">Check</option>
              <option value="ach">ACH / Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="zelle">Zelle</option>
              <option value="venmo">Venmo</option>
              <option value="other">Other</option>
            </select>
          </div>

          {form.method === "check" && (
            <div>
              <label className="fbt-label">Check #</label>
              <input className="fbt-input" value={form.checkNumber} onChange={(e) => setForm({ ...form, checkNumber: e.target.value })} placeholder="e.g. 1024" />
            </div>
          )}

          <div>
            <label className="fbt-label">Notes (optional)</label>
            <textarea className="fbt-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Payment reference, memo, etc." style={{ minHeight: 50 }} />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={proceed} disabled={saving} className="btn-primary" style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}>
              <CheckCircle2 size={16} /> MARK PAID
            </button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PayrollTab = ({ freightBills, dispatches, setDispatches, contacts, projects, invoices = [], editFreightBill, company, pendingPaySubId, clearPendingPaySubId, onJumpToInvoice, onToast }) => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [paidFilter, setPaidFilter] = useState("unpaid"); // unpaid | paid | all
  const [subFilter, setSubFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [expanded, setExpanded] = useState({});
  const [payTarget, setPayTarget] = useState(null);
  const [editingFB, setEditingFB] = useState(null);
  const [customerPaidOnly, setCustomerPaidOnly] = useState(true); // NEW: default ON (safer)
  const [traceFB, setTraceFB] = useState(null); // NEW: for traceability modal
  const [stubOffer, setStubOffer] = useState(null); // {target, fbs, payRecord} for auto-offer after pay

  // ══════════════════════════════════════════════════════════════════
  // v18 SESSION 1 (Pay Builder scaffolding): two separate builders for DRIVERS and SUBS.
  // Each has its own contact picker + date range + FB list.
  // v18 SESSION 2: pay lines editable inline with per-FB SAVE (same pattern as invoice builder).
  // v23 Session BB: merged into a single toggle-switched panel (was 2 side-by-side).
  // ══════════════════════════════════════════════════════════════════
  const [payScope, setPayScope] = useState("drivers"); // "drivers" | "subs"
  const [drvContactId, setDrvContactId] = useState("");
  const [drvFromDate, setDrvFromDate] = useState("");
  const [drvToDate, setDrvToDate] = useState("");
  const [drvExpandedFbIds, setDrvExpandedFbIds] = useState(new Set());
  // v23 Session DD: user can check/uncheck which FBs to include in pay statement.
  // null = "all selected" (default); Set = explicit selection
  const [drvSelectedFbIds, setDrvSelectedFbIds] = useState(null);

  const [subContactId, setSubContactId] = useState("");
  const [subFromDate, setSubFromDate] = useState("");
  const [subToDate, setSubToDate] = useState("");
  const [subExpandedFbIds, setSubExpandedFbIds] = useState(new Set());
  // v23 Session DD: FB selection for subs (parallel to drvSelectedFbIds)
  const [subSelectedFbIds, setSubSelectedFbIds] = useState(null);

  // v18 Session 2: per-FB draft state for pay lines. Shared across drivers/subs builders.
  // Shape: { [fbId]: [...payingLines] }. Presence = dirty.
  const [payLineDrafts, setPayLineDrafts] = useState({});
  const [fbPaySaveStatus, setFbPaySaveStatus] = useState({});

  const getPayLines = (fbId) => {
    if (payLineDrafts[fbId] !== undefined) return payLineDrafts[fbId];
    const fb = freightBills.find((f) => f.id === fbId);
    return Array.isArray(fb?.payingLines) ? fb.payingLines : [];
  };
  const isPayDirty = (fbId) => {
    if (payLineDrafts[fbId] === undefined) return false;
    const fb = freightBills.find((f) => f.id === fbId);
    const saved = Array.isArray(fb?.payingLines) ? fb.payingLines : [];
    return JSON.stringify(saved) !== JSON.stringify(payLineDrafts[fbId]);
  };
  const recomputePayLine = (ln) => {
    const qty = Number(ln.qty) || 0;
    const rate = Number(ln.rate) || 0;
    const gross = Number((qty * rate).toFixed(2));
    const pct = Number(ln.brokeragePct) || 0;
    const net = ln.brokerable ? Number((gross - gross * pct / 100).toFixed(2)) : gross;
    return { ...ln, qty, rate, gross, net };
  };
  const updatePayLineLocal = (fbId, lineId, patch) => {
    const currentLines = getPayLines(fbId);
    const next = currentLines.map((ln) => ln.id === lineId ? recomputePayLine({ ...ln, ...patch }) : ln);
    setPayLineDrafts((prev) => ({ ...prev, [fbId]: next }));
    setFbPaySaveStatus((prev) => ({ ...prev, [fbId]: "idle" }));
  };
  const addPayLineLocal = (fbId, seed = {}) => {
    const fb = freightBills.find((f) => f.id === fbId);
    if (!fb) return;
    const disp = dispatches.find((d) => d.id === fb.dispatchId);
    const assignment = disp ? (disp.assignments || []).find((a) => a.aid === fb.assignmentId) : null;
    const isSub = assignment?.kind === "sub";
    const subContact = isSub && assignment?.contactId ? contacts.find((c) => c.id === assignment.contactId) : null;
    const isPassThrough = ["TOLL", "DUMP", "FUEL"].includes(seed.code);
    const brokerableDefault = isSub && !!subContact?.brokerageApplies && !isPassThrough;
    const brokeragePctDefault = brokerableDefault ? Number(subContact?.brokeragePercent || 10) : 0;

    const newLine = recomputePayLine({
      id: nextLineId(),
      code: seed.code || "OTHER",
      item: seed.item || "",
      qty: seed.qty != null ? Number(seed.qty) : 1,
      rate: seed.rate != null ? Number(seed.rate) : Number(assignment?.payRate) || 0,
      brokerable: seed.brokerable != null ? !!seed.brokerable : brokerableDefault,
      brokeragePct: seed.brokeragePct != null ? Number(seed.brokeragePct) : brokeragePctDefault,
    });
    const currentLines = getPayLines(fbId);
    setPayLineDrafts((prev) => ({ ...prev, [fbId]: [...currentLines, newLine] }));
    setFbPaySaveStatus((prev) => ({ ...prev, [fbId]: "idle" }));
  };
  const deletePayLineLocal = (fbId, lineId) => {
    const currentLines = getPayLines(fbId);
    const next = currentLines.filter((ln) => ln.id !== lineId);
    setPayLineDrafts((prev) => ({ ...prev, [fbId]: next }));
    setFbPaySaveStatus((prev) => ({ ...prev, [fbId]: "idle" }));
  };
  const savePayLines = async (fbId) => {
    const currentFb = freightBills.find((f) => f.id === fbId);
    if (!currentFb) { onToast("⚠ FB NOT FOUND"); return; }
    const draft = payLineDrafts[fbId];
    if (draft === undefined) return;

    setFbPaySaveStatus((prev) => ({ ...prev, [fbId]: "saving" }));
    try {
      // Full-FB spread to avoid partial-patch data loss
      await editFreightBill(fbId, { ...currentFb, payingLines: draft });
      setPayLineDrafts((prev) => {
        const next = { ...prev }; delete next[fbId]; return next;
      });
      setFbPaySaveStatus((prev) => ({ ...prev, [fbId]: "saved" }));
      onToast(`✓ FB#${currentFb.freightBillNumber || fbId} PAY SAVED`);
      setTimeout(() => {
        setFbPaySaveStatus((prev) => {
          if (prev[fbId] !== "saved") return prev;
          const next = { ...prev }; delete next[fbId]; return next;
        });
      }, 2000);
    } catch (e) {
      console.error("savePayLines failed:", e);
      setFbPaySaveStatus((prev) => ({ ...prev, [fbId]: "error" }));
      onToast("⚠ PAY SAVE FAILED — CHECK CONNECTION");
    }
  };
  const discardPayDraft = (fbId) => {
    setPayLineDrafts((prev) => {
      const next = { ...prev }; delete next[fbId]; return next;
    });
    setFbPaySaveStatus((prev) => {
      const next = { ...prev }; delete next[fbId]; return next;
    });
  };

  // Contact lists filtered by type
  const driverContacts = useMemo(() => (contacts || []).filter((c) => c.type === "driver"), [contacts]);
  const subContactsList = useMemo(() => (contacts || []).filter((c) => c.type === "sub"), [contacts]);

  // FB matching helper — filters by contact (via assignment), date range, approved, customer-paid (only include billable),
  // and NOT already part of a prior pay statement (i.e. not yet paid).
  const fbsForContact = (contactId, fromD, toD) => {
    if (!contactId) return [];
    return (freightBills || []).filter((fb) => {
      if (fb.status !== "approved") return false;       // only approved FBs go on pay statements
      if (fb.paidAt || fb.payStatementLockedAt) return false; // not already paid/locked
      const fbDate = fb.submittedAt ? fb.submittedAt.slice(0, 10) : "";
      if (fromD && fbDate < fromD) return false;
      if (toD && fbDate > toD) return false;

      const disp = dispatches.find((d) => d.id === fb.dispatchId);
      const assignment = disp ? (disp.assignments || []).find((a) => a.aid === fb.assignmentId) : null;
      if (!assignment) return false;
      return String(assignment.contactId) === String(contactId);
    }).sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  };

  const drvFbs = useMemo(() => fbsForContact(drvContactId, drvFromDate, drvToDate),
    [drvContactId, drvFromDate, drvToDate, freightBills, dispatches]);
  const subFbs = useMemo(() => fbsForContact(subContactId, subFromDate, subToDate),
    [subContactId, subFromDate, subToDate, freightBills, dispatches]);


  // Auto-expand a sub's row when jumped from home dashboard
  useEffect(() => {
    if (pendingPaySubId) {
      // We don't know the projectKey here; expand ALL rows matching this sub across all projects
      // The payroll tree uses keys like `p_{projectKey}` and `s_{projectKey}_{subKey}` where subKey is subId.
      // Safest: expand whatever we find after render. Use setTimeout to do scroll after.
      setTimeout(() => {
        const el = document.getElementById(`payroll-sub-${pendingPaySubId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // Click the row's header to expand it if collapsed
          const header = el.querySelector('[style*="cursor: pointer"]');
          if (header && !el.querySelector('.fb-list')) header.click();
        }
      }, 250);
      if (clearPendingPaySubId) clearPendingPaySubId();
    }
  }, [pendingPaySubId]);

  // helper: approved + within date range + filters
  const filteredFbs = useMemo(() => {
    return freightBills.filter((fb) => {
      if ((fb.status || "pending") !== "approved") return false;
      const isPaid = !!fb.paidAt;
      if (paidFilter === "unpaid" && isPaid) return false;
      if (paidFilter === "paid" && !isPaid) return false;
      const fbDate = fb.submittedAt ? fb.submittedAt.slice(0, 10) : "";
      if (fromDate && fbDate < fromDate) return false;
      if (toDate && fbDate > toDate) return false;
      return true;
    });
  }, [freightBills, paidFilter, fromDate, toDate]);

  // Calculate gross for an FB based on its assignment's pay rate + method
  const calcGross = (fb, dispatch) => {
    const assignment = (dispatch?.assignments || []).find((a) => a.aid === fb.assignmentId);

    // v16 PREFERRED PATH: payingLines[] are the authoritative pay values
    // Each line already has gross + net (with brokerage applied) pre-computed
    const hasLines = Array.isArray(fb.payingLines) && fb.payingLines.length > 0;

    if (hasLines) {
      // Split lines into brokerable vs not — brokerage applies only to flagged lines
      const brokerableLines = fb.payingLines.filter((ln) => ln.brokerable);
      const nonBrokerableLines = fb.payingLines.filter((ln) => !ln.brokerable);

      const brokerableGross = brokerableLines.reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
      const nonBrokerableGross = nonBrokerableLines.reduce((s, ln) => s + (Number(ln.gross) || 0), 0);

      // Sum of each line's individual net (line already deducted its own brokerage)
      const totalNet = fb.payingLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);

      // Derive a "weighted avg" method + rate + qty for display purposes (pick the first or dominant)
      const primary = fb.payingLines.find((ln) => ln.code === "H" || ln.code === "T" || ln.code === "L") || fb.payingLines[0];
      const displayMethod = primary?.code === "H" ? "hour" : primary?.code === "T" ? "ton" : primary?.code === "L" ? "load" : "hour";
      const displayRate = Number(primary?.rate) || 0;
      const displayQty = Number(primary?.qty) || 0;

      return {
        gross: brokerableGross + nonBrokerableGross,         // total gross before any brokerage deduction
        // grossForBrokerage = amount that brokerage % applies to (sum of brokerable line gross)
        grossForBrokerage: brokerableGross,
        // nonBrokerableAdj = amount that passes through at 100% (reimbursements + non-brokerable lines)
        nonBrokerableAdj: nonBrokerableGross,
        qty: displayQty, method: displayMethod, rate: displayRate,
        assignment,
        extrasSum: 0, grossBeforeExtras: brokerableGross,
        adjustmentsSum: 0, adjustmentsBrokerable: 0, adjustmentsNonBrokerable: 0,
        billingAdjCopiedToPay: 0,
        // New: pre-computed net from lines (gold-standard — already includes per-line brokerage)
        netFromLines: totalNet,
      };
    }

    // LEGACY PATH: snapshot + extras + adjustments (pre-v16 FBs)
    const hasSnapshot = fb.paidRate != null && fb.paidMethodSnapshot;
    const rate = hasSnapshot ? Number(fb.paidRate) : (Number(assignment?.payRate) || 0);
    const method = hasSnapshot ? fb.paidMethodSnapshot : (assignment?.payMethod || "hour");

    if (!hasSnapshot && (!assignment || !assignment.payRate)) {
      return { gross: 0, qty: 0, method: "?", rate: 0, assignment, extrasSum: 0, grossBeforeExtras: 0, adjustmentsSum: 0 };
    }

    let qty = 0;
    if (hasSnapshot) {
      if (method === "hour") qty = Number(fb.paidHours) || 0;
      else if (method === "ton") qty = Number(fb.paidTons) || 0;
      else if (method === "load") qty = Number(fb.paidLoads) || 0;
    } else {
      if (method === "hour") {
        if (fb.hoursBilled !== null && fb.hoursBilled !== undefined && fb.hoursBilled !== "") qty = Number(fb.hoursBilled);
        else if (fb.pickupTime && fb.dropoffTime) {
          const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
          const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
          if (!isNaN(h1) && !isNaN(h2)) {
            const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (mins > 0) qty = mins / 60;
          }
        }
      } else if (method === "ton") qty = Number(fb.tonnage) || 0;
      else if (method === "load") qty = Number(fb.loadCount) || 1;
    }

    const grossBeforeExtras = qty * rate;

    const adjustmentsBrokerable = (fb.payingAdjustments || [])
      .filter((a) => a.applyBrokerage !== false)
      .reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const adjustmentsNonBrokerable = (fb.payingAdjustments || [])
      .filter((a) => a.applyBrokerage === false)
      .reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const adjustmentsSum = adjustmentsBrokerable + adjustmentsNonBrokerable;

    const extrasSum = (fb.extras || [])
      .filter((x) => x.copyToPay === true)
      .reduce((s, x) => s + (Number(x.amount) || 0), 0);

    const billingAdjCopiedToPay = (fb.billingAdjustments || [])
      .filter((a) => a.copyToPay === true)
      .reduce((s, a) => s + (Number(a.amount) || 0), 0);

    return {
      gross: grossBeforeExtras + extrasSum + adjustmentsSum + billingAdjCopiedToPay,
      grossForBrokerage: grossBeforeExtras + adjustmentsBrokerable,
      nonBrokerableAdj: adjustmentsNonBrokerable + extrasSum + billingAdjCopiedToPay,
      qty, method, rate, assignment, extrasSum, grossBeforeExtras,
      adjustmentsSum, adjustmentsBrokerable, adjustmentsNonBrokerable,
      billingAdjCopiedToPay,
    };
  };

  // Helper: compute what customer WAS billed for this FB on its invoice (estimated)
  // Includes reimbursable per-FB extras that pass through to the customer
  const fbInvoiceBilled = (fb) => {
    const invoice = invoices.find((inv) => inv.id === fb.invoiceId);
    if (!invoice) return 0;
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
    // Reimbursable FB extras also appear on customer invoice
    const extrasSum = (fb.extras || [])
      .filter((x) => x.reimbursable !== false)
      .reduce((s, x) => s + (Number(x.amount) || 0), 0);
    return qty * rate + extrasSum;
  };

  // Customer payment ratio (1.0 = paid in full, 0.85 = 85% paid, 0 = unpaid)
  const customerPaidRatio = (fb) => {
    if (!fb.customerPaidAt) return 0;
    const billed = fbInvoiceBilled(fb);
    const paid = Number(fb.customerPaidAmount) || 0;
    if (billed <= 0) return paid > 0 ? 1 : 0;
    return Math.min(1, paid / billed);
  };

  // Returns customer payment status: 'paid' | 'short' | 'unpaid' | 'no_invoice'
  const customerPayStatus = (fb) => {
    if (!fb.invoiceId) return "no_invoice";
    if (!fb.customerPaidAt) return "unpaid";
    const ratio = customerPaidRatio(fb);
    if (ratio >= 0.999) return "paid";
    return "short";
  };

  // Build grouped data: project -> sub/driver -> [fbs with calcs]
  const grouped = useMemo(() => {
    const byProject = new Map(); // projectKey -> { projectName, projectId, subs: Map<subKey, {subName, subId, type, fbs, gross, ...}> }
    filteredFbs.forEach((fb) => {
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      if (!d) return;
      const calc = calcGross(fb, d);
      if (!calc.assignment) return; // skip unassigned FBs (can't pay without a rate)

      // Apply filters
      if (projectFilter && String(d.projectId || "none") !== projectFilter) return;
      if (subFilter && String(calc.assignment.contactId) !== subFilter) return;

      // Customer-paid filter: if ON, only show FBs where customer has paid (safe to pay subs)
      const custStatus = customerPayStatus(fb);
      // If "customerPaidOnly" is on, we hide unpaid-by-customer FBs UNLESS they're already paid to sub
      if (customerPaidOnly && !fb.paidAt && custStatus !== "paid" && custStatus !== "short") return;

      const project = projects.find((p) => p.id === d.projectId);
      const projectKey = d.projectId || "none";
      const projectName = project?.name || "(No project)";

      if (!byProject.has(projectKey)) {
        byProject.set(projectKey, { projectKey, projectId: d.projectId || null, projectName, subs: new Map() });
      }
      const projectData = byProject.get(projectKey);

      const subKey = calc.assignment.contactId || `anon_${calc.assignment.aid}`;
      const contact = contacts.find((c) => c.id === calc.assignment.contactId);
      // IMPORTANT: Drivers never get brokerage applied, only subs.
      // Force-ignore brokerage flag if this is a driver (belt-and-suspenders beyond UI hiding).
      const isSub = calc.assignment.kind === "sub";
      const brokerageApplies = isSub && !!contact?.brokerageApplies;
      const brokeragePct = Number(contact?.brokeragePercent ?? 8);

      if (!projectData.subs.has(subKey)) {
        projectData.subs.set(subKey, {
          subKey,
          subId: calc.assignment.contactId,
          subName: calc.assignment.name,
          kind: calc.assignment.kind,
          brokerageApplies: !!brokerageApplies,
          brokeragePct,
          fbs: [],
          gross: 0,
          paidSum: 0,
        });
      }
      const subData = projectData.subs.get(subKey);

      // Compute proportional gross for short-pay handling
      const ratio = customerPaidRatio(fb);
      const billed = fbInvoiceBilled(fb);
      const customerPaidAmt = Number(fb.customerPaidAmount) || 0;
      // Short-pay proportions: apply ratio to brokerable portion, pass nonBrokerable through as-is
      const brokerableAdjusted = custStatus === "short" ? calc.grossForBrokerage * ratio : calc.grossForBrokerage;
      const adjustedGross = brokerableAdjusted + calc.nonBrokerableAdj;

      subData.fbs.push({
        fb,
        gross: calc.gross,              // full gross based on agreement
        adjustedGross,                  // what we'll actually pay (proportional for short-pay)
        grossForBrokerage: brokerableAdjusted, // what brokerage % applies to
        nonBrokerableAdj: calc.nonBrokerableAdj, // bypasses brokerage
        qty: calc.qty,
        method: calc.method,
        rate: calc.rate,
        dispatch: d,
        custStatus,                     // paid | short | unpaid | no_invoice
        customerRatio: ratio,
        customerBilled: billed,
        customerPaid: customerPaidAmt,
      });
      subData.gross += adjustedGross;
      if (fb.paidAmount) subData.paidSum += Number(fb.paidAmount);
    });
    // Compute net, brokerage + ready/advance splits per sub
    const asArray = Array.from(byProject.values()).map((pd) => {
      const subs = Array.from(pd.subs.values()).map((s) => {
        // Brokerage only applies to the grossForBrokerage portion, not non-brokerable adjustments
        const brokerableGross = s.fbs.reduce((sum, x) => sum + (x.grossForBrokerage || 0), 0);
        const nonBrokerableSum = s.fbs.reduce((sum, x) => sum + (x.nonBrokerableAdj || 0), 0);
        const brokerageAmt = s.brokerageApplies ? brokerableGross * (s.brokeragePct / 100) : 0;

        // Split: ready-to-pay vs advance-risk
        const unpaidEntries = s.fbs.filter((x) => !x.fb.paidAt);
        const readyEntries = unpaidEntries.filter((x) => x.custStatus === "paid" || x.custStatus === "short");
        const advanceEntries = unpaidEntries.filter((x) => x.custStatus !== "paid" && x.custStatus !== "short");
        const readyBrokerableGross = readyEntries.reduce((sum, x) => sum + (x.grossForBrokerage || 0), 0);
        const advanceBrokerableGross = advanceEntries.reduce((sum, x) => sum + (x.grossForBrokerage || 0), 0);
        const readyGross = readyEntries.reduce((sum, x) => sum + x.adjustedGross, 0);
        const advanceGross = advanceEntries.reduce((sum, x) => sum + x.adjustedGross, 0);
        const readyBrok = s.brokerageApplies ? readyBrokerableGross * (s.brokeragePct / 100) : 0;
        const advanceBrok = s.brokerageApplies ? advanceBrokerableGross * (s.brokeragePct / 100) : 0;

        return {
          ...s,
          brokerageAmt,
          nonBrokerableSum,
          net: s.gross - brokerageAmt,
          readyGross, readyNet: readyGross - readyBrok, readyCount: readyEntries.length,
          advanceGross, advanceNet: advanceGross - advanceBrok, advanceCount: advanceEntries.length,
        };
      }).sort((a, b) => a.subName.localeCompare(b.subName));
      const projGross = subs.reduce((s, x) => s + x.gross, 0);
      const projNet = subs.reduce((s, x) => s + x.net, 0);
      const projBrok = subs.reduce((s, x) => s + x.brokerageAmt, 0);
      return { ...pd, subs, projGross, projNet, projBrok };
    });
    // Sort: active projects first (by name), "No project" last
    asArray.sort((a, b) => {
      if (a.projectKey === "none") return 1;
      if (b.projectKey === "none") return -1;
      return a.projectName.localeCompare(b.projectName);
    });
    return asArray;
  }, [filteredFbs, dispatches, projects, contacts, projectFilter, subFilter, customerPaidOnly, invoices]);

  const allUnpaidSubs = useMemo(() => grouped.flatMap((p) => p.subs.filter((s) => s.fbs.some((x) => !x.fb.paidAt))), [grouped]);
  const totalUnpaidGross = grouped.reduce((s, p) => s + p.subs.reduce((ss, sub) => ss + sub.fbs.filter((x) => !x.fb.paidAt).reduce((sss, x) => sss + x.gross, 0), 0), 0);
  const totalBrokerageUnpaid = grouped.reduce((s, p) => s + p.subs.reduce((ss, sub) => {
    const unpaidGross = sub.fbs.filter((x) => !x.fb.paidAt).reduce((g, x) => g + x.gross, 0);
    return ss + (sub.brokerageApplies ? unpaidGross * (sub.brokeragePct / 100) : 0);
  }, 0), 0);
  const totalNetUnpaid = totalUnpaidGross - totalBrokerageUnpaid;
  const unpaidFBCount = grouped.reduce((s, p) => s + p.subs.reduce((ss, sub) => ss + sub.fbs.filter((x) => !x.fb.paidAt).length, 0), 0);

  const toggleProject = (key) => setExpanded((e) => ({ ...e, [`p_${key}`]: !e[`p_${key}`] }));
  const toggleSub = (pkey, skey) => setExpanded((e) => ({ ...e, [`s_${pkey}_${skey}`]: !e[`s_${pkey}_${skey}`] }));

  // Bulk pay all subs on a project
  const openPaySub = (pd, sub, includeAdvance = false) => {
    const unpaidFbs = sub.fbs.filter((x) => !x.fb.paidAt);
    if (unpaidFbs.length === 0) { onToast("ALL PAID"); return; }
    // Default: only pay ready FBs (customer has paid). If includeAdvance, include all.
    const fbsToPay = includeAdvance
      ? unpaidFbs
      : unpaidFbs.filter((x) => x.custStatus === "paid" || x.custStatus === "short");
    if (fbsToPay.length === 0) {
      onToast("NO CUSTOMER-PAID FBs — ENABLE ADVANCE PAY TO PAY ANYWAY");
      return;
    }
    const gross = fbsToPay.reduce((s, x) => s + x.adjustedGross, 0);
    const brokerageAmt = sub.brokerageApplies ? gross * (sub.brokeragePct / 100) : 0;
    setPayTarget({
      projectName: pd.projectName,
      subName: sub.subName,
      subId: sub.subId,
      subKind: sub.kind,
      brokerageApplies: sub.brokerageApplies,
      gross, brokeragePct: sub.brokeragePct, brokerageAmt, net: gross - brokerageAmt,
      fbs: fbsToPay,
      includeAdvance,
      hasAdvance: unpaidFbs.some((x) => x.custStatus !== "paid" && x.custStatus !== "short"),
      advanceAvailable: unpaidFbs.filter((x) => x.custStatus !== "paid" && x.custStatus !== "short").length,
    });
  };

  // Unmark paid (soft lock release)
  const unmarkPaid = async (fb) => {
    if (!confirm(`Un-mark FB #${fb.freightBillNumber || "(no #)"} as paid?\n\nThis removes the payment record AND unlocks the pay side so you can edit pay lines again.`)) return;
    try {
      await editFreightBill(fb.id, {
        ...fb,
        paidAt: null, paidBy: "", paidMethod: "", paidCheckNumber: "",
        paidAmount: null, paidNotes: "",
        // v17 fix: also clear the pay statement lock so admin can edit pay lines + regenerate stub
        payStatementLockedAt: null,
      });
      // v20 Session O: audit log
      logAudit({
        actionType: "fb.unpaid",
        entityType: "freight_bill", entityId: fb.id,
        entityLabel: `FB#${fb.freightBillNumber || "—"}`,
        metadata: {
          previousPaidAt: fb.paidAt,
          previousAmount: fb.paidAmount,
          previousMethod: fb.paidMethod,
          previousStatementNumber: fb.payStatementNumber,
        },
      });
      onToast("PAYMENT REMOVED · PAY SIDE UNLOCKED");
    } catch (e) { console.error(e); onToast("FAILED"); }
  };

  // CSV export for a project's payroll
  const exportProjectCSV = (pd) => {
    const rows = [["Sub/Driver", "FB#", "Date", "Order", "Driver", "Truck", "Method", "Qty", "Rate", "Gross", "Brok%", "Brokerage", "Net Due", "Paid Date", "Paid Amount", "Check #"]];
    pd.subs.forEach((sub) => {
      sub.fbs.forEach((entry) => {
        const brok = sub.brokerageApplies ? entry.gross * (sub.brokeragePct / 100) : 0;
        rows.push([
          sub.subName,
          entry.fb.freightBillNumber || "",
          entry.fb.submittedAt ? entry.fb.submittedAt.slice(0, 10) : "",
          entry.dispatch?.code || "",
          entry.fb.driverName || "",
          entry.fb.truckNumber || "",
          entry.method,
          entry.qty.toFixed(2),
          entry.rate.toFixed(2),
          entry.gross.toFixed(2),
          sub.brokerageApplies ? sub.brokeragePct : "",
          brok.toFixed(2),
          (entry.gross - brok).toFixed(2),
          entry.fb.paidAt ? entry.fb.paidAt.slice(0, 10) : "",
          entry.fb.paidAmount != null ? Number(entry.fb.paidAmount).toFixed(2) : "",
          entry.fb.paidCheckNumber || "",
        ]);
      });
    });
    const csv = rows.map((r) => r.map((v) => {
      const s = String(v).replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${pd.projectName.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("CSV EXPORTED");
  };

  const subContactOptions = contacts.filter((c) => c.type === "sub" || c.type === "driver");
  const methodLabel = { check: "Check", ach: "ACH", cash: "Cash", zelle: "Zelle", venmo: "Venmo", other: "Other" };

  // v18 Session 2: editable pay-lines panel shared by both drivers/subs builders.
  // Renders the RIGHT side of the side-by-side expand view. Uses local drafts; persists on SAVE click.
  const renderPayLinesEditor = (fb, kindColor) => {
    const lines = getPayLines(fb.id);
    const dirty = isPayDirty(fb.id);
    const status = fbPaySaveStatus[fb.id] || "idle";
    const locked = !!fb.payStatementLockedAt || !!fb.paidAt;

    return (
      <div style={{ padding: 8, background: "#FFF", border: "1.5px solid " + kindColor, display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="fbt-mono" style={{ fontSize: 9, color: kindColor, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 2 }}>
          🚚 PAYING · EDITABLE
          {locked && <span style={{ marginLeft: 6, color: "var(--concrete)", fontWeight: 400 }}>⚑ locked</span>}
        </div>

        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 60px 70px 50px 70px 22px", gap: 4, alignItems: "center", fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)", letterSpacing: "0.05em" }}>
          <div>CODE</div><div>ITEM</div><div style={{ textAlign: "right" }}>QTY</div>
          <div style={{ textAlign: "right" }}>RATE</div><div style={{ textAlign: "center" }}>BR?</div>
          <div style={{ textAlign: "right" }}>NET</div><div></div>
        </div>

        {lines.length === 0 && (
          <div style={{ padding: 8, fontSize: 10, color: "var(--concrete)", fontStyle: "italic", textAlign: "center" }}>
            No pay lines — use quick-add below
          </div>
        )}

        {lines.map((ln) => {
          const rowLocked = locked && !ln.isAdjustment;
          const rowBg = ln.isAdjustment ? "#FEF3C7" : "transparent";
          const gross = Number(ln.gross) || ((Number(ln.qty) || 0) * (Number(ln.rate) || 0));
          const brokAmt = ln.brokerable ? gross * (Number(ln.brokeragePct) || 0) / 100 : 0;
          const net = Number(ln.net) || (gross - brokAmt);
          return (
            <div key={ln.id} onClick={(e) => e.stopPropagation()}
              style={{ display: "grid", gridTemplateColumns: "50px 1fr 60px 70px 50px 70px 22px", gap: 4, alignItems: "center", padding: "3px 0", borderBottom: "1px dotted var(--concrete)", background: rowBg }}>
              <select disabled={rowLocked} value={ln.code || "OTHER"}
                onChange={(e) => updatePayLineLocal(fb.id, ln.id, { code: e.target.value, item: (
                  e.target.value === "H" ? "HOURLY" : e.target.value === "T" ? "TONS" : e.target.value === "L" ? "LOAD" :
                  e.target.value === "TOLL" ? "Tolls" : e.target.value === "DUMP" ? "Dump" : e.target.value === "FUEL" ? "Fuel" : (ln.item || "")
                ) })}
                style={{ padding: "2px 3px", fontSize: 10, fontFamily: "JetBrains Mono, monospace", border: "1px solid var(--concrete)", background: rowLocked ? "#F5F5F4" : "#FFF", width: "100%" }}
              >
                <option value="H">H</option><option value="T">T</option><option value="L">L</option>
                <option value="TOLL">TOLL</option><option value="DUMP">DUMP</option><option value="FUEL">FUEL</option><option value="OTHER">OTHER</option>
              </select>
              <input disabled={rowLocked} type="text" value={ln.item || ""}
                onChange={(e) => updatePayLineLocal(fb.id, ln.id, { item: e.target.value })}
                style={{ padding: "2px 4px", fontSize: 10, fontFamily: "JetBrains Mono, monospace", border: "1px solid var(--concrete)", background: rowLocked ? "#F5F5F4" : "#FFF", width: "100%" }} />
              <input disabled={rowLocked} type="number" step="0.01" value={ln.qty ?? ""}
                onChange={(e) => updatePayLineLocal(fb.id, ln.id, { qty: e.target.value })}
                style={{ padding: "2px 4px", fontSize: 10, fontFamily: "JetBrains Mono, monospace", border: "1px solid var(--concrete)", background: rowLocked ? "#F5F5F4" : "#FFF", width: "100%", textAlign: "right" }} />
              <input disabled={rowLocked} type="number" step="0.01" value={ln.rate ?? ""}
                onChange={(e) => updatePayLineLocal(fb.id, ln.id, { rate: e.target.value })}
                style={{ padding: "2px 4px", fontSize: 10, fontFamily: "JetBrains Mono, monospace", border: "1px solid var(--concrete)", background: rowLocked ? "#F5F5F4" : "#FFF", width: "100%", textAlign: "right" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }}>
                <input type="checkbox" disabled={rowLocked} checked={!!ln.brokerable}
                  onChange={(e) => updatePayLineLocal(fb.id, ln.id, { brokerable: e.target.checked, brokeragePct: e.target.checked ? (ln.brokeragePct || 10) : 0 })}
                  style={{ width: 12, height: 12 }} />
                {ln.brokerable && (
                  <input disabled={rowLocked} type="number" step="1" value={ln.brokeragePct ?? ""}
                    onChange={(e) => updatePayLineLocal(fb.id, ln.id, { brokeragePct: e.target.value })}
                    style={{ padding: "1px 2px", fontSize: 9, border: "1px solid var(--concrete)", background: rowLocked ? "#F5F5F4" : "#FFF", width: 28, textAlign: "right" }} />
                )}
              </div>
              <div style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: kindColor, textAlign: "right" }}>
                ${net.toFixed(2)}
              </div>
              <button type="button" disabled={rowLocked}
                onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${ln.code} line?`)) deletePayLineLocal(fb.id, ln.id); }}
                style={{ padding: "1px 3px", background: "transparent", border: "1px solid var(--safety)", color: "var(--safety)", cursor: rowLocked ? "not-allowed" : "pointer", fontSize: 9, opacity: rowLocked ? 0.4 : 1 }}
                title={rowLocked ? "Pay is locked" : "Delete line"}>
                <Trash2 size={8} />
              </button>
            </div>
          );
        })}

        {/* Quick-add */}
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>
          <button type="button" onClick={(e) => { e.stopPropagation(); addPayLineLocal(fb.id, { code: "H", item: locked ? "HOURLY (adj)" : "HOURLY" }); }}
            className="btn-ghost" style={{ padding: "3px 7px", fontSize: 9 }}>+ HR</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); addPayLineLocal(fb.id, { code: "TOLL", item: "Tolls" }); }}
            className="btn-ghost" style={{ padding: "3px 7px", fontSize: 9 }}>+ TOLL</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); addPayLineLocal(fb.id, { code: "DUMP", item: "Dump" }); }}
            className="btn-ghost" style={{ padding: "3px 7px", fontSize: 9 }}>+ DUMP</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); addPayLineLocal(fb.id, { code: "FUEL", item: "Fuel" }); }}
            className="btn-ghost" style={{ padding: "3px 7px", fontSize: 9 }}>+ FUEL</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); addPayLineLocal(fb.id, { code: "OTHER", item: "" }); }}
            className="btn-ghost" style={{ padding: "3px 7px", fontSize: 9 }}>+ OTHER</button>
        </div>

        {/* Save/Discard banner */}
        {(dirty || status === "saving" || status === "saved" || status === "error") && (
          <div style={{
            display: "flex", gap: 6, alignItems: "center", marginTop: 4, padding: "4px 8px",
            background: dirty ? "#FEF3C7" : status === "saved" ? "#D1FAE5" : status === "error" ? "#FEE2E2" : "#F5F5F4",
            border: `1px solid ${dirty ? "var(--hazard-deep)" : status === "saved" ? "var(--good)" : status === "error" ? "var(--safety)" : "var(--concrete)"}`,
            flexWrap: "wrap",
          }}>
            <span className="fbt-mono" style={{ fontSize: 9, letterSpacing: "0.08em", fontWeight: 700, color: dirty ? "var(--hazard-deep)" : status === "saved" ? "var(--good)" : status === "error" ? "var(--safety)" : "var(--concrete)" }}>
              {status === "saving" ? "SAVING…" :
               status === "saved" ? "SAVED ✓" :
               status === "error" ? "ERROR" :
               dirty ? "UNSAVED" : ""}
            </span>
            {dirty && (
              <>
                <button type="button" disabled={status === "saving"}
                  onClick={(e) => { e.stopPropagation(); savePayLines(fb.id); }}
                  className="btn-primary" style={{ padding: "3px 10px", fontSize: 10, marginLeft: "auto" }}>SAVE</button>
                <button type="button" disabled={status === "saving"}
                  onClick={(e) => { e.stopPropagation(); if (confirm("Discard unsaved pay edits?")) discardPayDraft(fb.id); }}
                  className="btn-ghost" style={{ padding: "3px 7px", fontSize: 9 }}>DISCARD</button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* v23 Session BB: merged into a single panel with DRIVERS/SUBS toggle.
          Was two side-by-side panels. Toggle at top picks which builder to show. */}

      {/* Toggle header */}
      <div className="fbt-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", border: "2px solid var(--steel)" }}>
          <button
            type="button"
            onClick={() => setPayScope("drivers")}
            style={{
              padding: "10px 22px", fontSize: 12, fontFamily: "Oswald, sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
              background: payScope === "drivers" ? "#0369A1" : "#FFF",
              color: payScope === "drivers" ? "#FFF" : "var(--steel)",
              border: "none", cursor: "pointer",
            }}
          >
            <User size={13} style={{ marginRight: 6, marginBottom: -2 }} /> DRIVERS ({driverContacts.length})
          </button>
          <button
            type="button"
            onClick={() => setPayScope("subs")}
            style={{
              padding: "10px 22px", fontSize: 12, fontFamily: "Oswald, sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
              background: payScope === "subs" ? "#9A3412" : "#FFF",
              color: payScope === "subs" ? "#FFF" : "var(--steel)",
              border: "none", borderLeft: "2px solid var(--steel)", cursor: "pointer",
            }}
          >
            <Building2 size={13} style={{ marginRight: 6, marginBottom: -2 }} /> SUBS ({subContactsList.length})
          </button>
        </div>
        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", flex: 1 }}>
          ▸ BUILDING PAY STATEMENT FOR {payScope === "drivers" ? "EMPLOYEE DRIVERS" : "SUBCONTRACTORS"}
        </div>
      </div>

      <div style={{ display: payScope === "drivers" ? "grid" : "none", gridTemplateColumns: "1fr", gap: 14 }}>
        {/* DRIVERS BUILDER */}
        <div className="fbt-card" style={{ padding: 18, background: "#F0F9FF", border: "2px solid #0369A1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 6, height: 22, background: "#0369A1" }} />
            <h3 className="fbt-display" style={{ fontSize: 16, margin: 0, color: "#0369A1" }}>PAY STATEMENT · DRIVERS</h3>
          </div>

          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            <div>
              <label className="fbt-label" style={{ fontSize: 10 }}>Select Driver</label>
              <select
                className="fbt-select"
                value={drvContactId}
                onChange={(e) => { setDrvContactId(e.target.value); setDrvExpandedFbIds(new Set()); }}
              >
                <option value="">— Pick a driver —</option>
                {driverContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.favorite ? "★ " : ""}{c.contactName || c.companyName}
                    {c.defaultPayRate ? ` · $${c.defaultPayRate}/${c.defaultPayMethod || "hr"}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label className="fbt-label" style={{ fontSize: 10 }}>From Date</label>
                <input type="date" className="fbt-input" value={drvFromDate} onChange={(e) => setDrvFromDate(e.target.value)} />
              </div>
              <div>
                <label className="fbt-label" style={{ fontSize: 10 }}>To Date</label>
                <input type="date" className="fbt-input" value={drvToDate} onChange={(e) => setDrvToDate(e.target.value)} />
              </div>
            </div>
          </div>

          {drvContactId ? (
            drvFbs.length === 0 ? (
              <div style={{ padding: 16, background: "#FFF", border: "1.5px dashed var(--concrete)", textAlign: "center" }}>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
                  ▸ NO UNPAID APPROVED FBs FOR THIS DRIVER IN SELECTED RANGE
                </div>
              </div>
            ) : (
              <div>
                <div className="fbt-mono" style={{ fontSize: 10, color: "#0369A1", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>
                  ▸ {drvFbs.length} FB{drvFbs.length !== 1 ? "S" : ""} · CLICK TO EXPAND · EDIT PAY LINES ON RIGHT
                </div>
                {drvFbs.length > 0 && (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 10px", background: "#FFF", border: "1px dashed var(--concrete)", marginBottom: 6, fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={drvSelectedFbIds === null || drvSelectedFbIds.size === drvFbs.length}
                        onChange={(e) => setDrvSelectedFbIds(e.target.checked ? null : new Set())}
                      />
                      SELECT ALL
                    </label>
                    <span style={{ color: "var(--concrete)", marginLeft: "auto" }}>
                      {drvSelectedFbIds === null ? drvFbs.length : drvSelectedFbIds.size} of {drvFbs.length} selected
                    </span>
                  </div>
                )}
                <div style={{ display: "grid", gap: 6, maxHeight: 340, overflowY: "auto" }}>
                  {drvFbs.map((fb) => {
                    const expanded = drvExpandedFbIds.has(fb.id);
                    const isSelected = drvSelectedFbIds === null || drvSelectedFbIds.has(fb.id);
                    const disp = dispatches.find((d) => d.id === fb.dispatchId);
                    const payLines = getPayLines(fb.id);  // v18 Session 2: draft-aware
                    const payTotal = payLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
                    const billLines = Array.isArray(fb.billingLines) ? fb.billingLines : [];
                    const billTotal = billLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
                    const dirty = isPayDirty(fb.id);
                    return (
                      <div key={fb.id} style={{ background: !isSelected ? "#F5F5F4" : dirty ? "#FEF3C7" : "#FFF", border: `1.5px solid ${!isSelected ? "#D6D3D1" : dirty ? "var(--hazard-deep)" : "var(--concrete)"}`, opacity: !isSelected ? 0.6 : 1 }}>
                        <div
                          style={{ padding: "8px 10px", display: "grid", gridTemplateColumns: "auto auto auto 1fr auto auto", gap: 10, alignItems: "center", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              // Switch to explicit selection mode on first interaction
                              const current = drvSelectedFbIds === null ? new Set(drvFbs.map((f) => f.id)) : new Set(drvSelectedFbIds);
                              if (e.target.checked) current.add(fb.id); else current.delete(fb.id);
                              setDrvSelectedFbIds(current);
                            }}
                            title="Include this FB in the pay statement"
                          />
                          <span
                            onClick={() => {
                              const next = new Set(drvExpandedFbIds);
                              if (expanded) next.delete(fb.id); else next.add(fb.id);
                              setDrvExpandedFbIds(next);
                            }}
                            style={{ cursor: "pointer", fontWeight: 700 }}
                          >
                            FB#{fb.freightBillNumber || "—"}
                            {dirty && <span title="Unsaved pay edits" style={{ marginLeft: 4, color: "var(--hazard-deep)" }}>●</span>}
                          </span>
                          <span>{fb.submittedAt ? fb.submittedAt.slice(0, 10) : "—"}</span>
                          <span style={{ color: "var(--concrete)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {disp?.jobName || "—"} · T{fb.truckNumber || "—"}
                          </span>
                          <span style={{ fontWeight: 700, color: "#0369A1" }}>${payTotal.toFixed(2)}</span>
                          <ChevronDown
                            size={12}
                            onClick={() => {
                              const next = new Set(drvExpandedFbIds);
                              if (expanded) next.delete(fb.id); else next.add(fb.id);
                              setDrvExpandedFbIds(next);
                            }}
                            style={{ cursor: "pointer", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s", color: "var(--concrete)" }}
                          />
                        </div>
                        {expanded && (
                          <div style={{ padding: "10px 14px", background: "#FAFAF9", borderTop: "1px dashed var(--concrete)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {/* LEFT: Billed to customer (read-only) */}
                            <div style={{ padding: 8, background: "#FFF", border: "1.5px solid var(--concrete)" }}>
                              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--hazard-deep)", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>
                                💰 BILLED TO CUSTOMER (READ-ONLY)
                              </div>
                              {billLines.length === 0 ? (
                                <div style={{ fontSize: 10, color: "var(--concrete)", fontStyle: "italic" }}>No billing lines</div>
                              ) : (
                                billLines.map((ln) => (
                                  <div key={ln.id} style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", padding: "2px 0", display: "flex", justifyContent: "space-between", gap: 6, borderBottom: "1px dotted var(--concrete)" }}>
                                    <span style={{ fontWeight: 700, minWidth: 42 }}>{ln.code}</span>
                                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ln.item}</span>
                                    <span>{Number(ln.qty || 0).toFixed(2)}×${Number(ln.rate || 0).toFixed(2)}</span>
                                    <span style={{ fontWeight: 700 }}>${Number(ln.net || 0).toFixed(2)}</span>
                                  </div>
                                ))
                              )}
                              <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1.5px solid var(--hazard-deep)", display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>
                                <span>BILL TOTAL</span>
                                <span style={{ color: "var(--hazard-deep)" }}>${billTotal.toFixed(2)}</span>
                              </div>
                            </div>

                            {/* RIGHT: Paying to driver — editable */}
                            <div>
                              {renderPayLinesEditor(fb, "#0369A1")}
                              {(() => {
                                const livePayLines = getPayLines(fb.id);
                                const livePayTotal = livePayLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
                                return (
                                  <>
                                    <div style={{ marginTop: 6, padding: "6px 10px", border: "1.5px solid #0369A1", display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, background: "#FFF" }}>
                                      <span>PAY TOTAL</span>
                                      <span style={{ color: "#0369A1" }}>${livePayTotal.toFixed(2)}</span>
                                    </div>
                                    {billTotal > 0 && livePayTotal > 0 && (
                                      <div style={{ marginTop: 4, padding: "4px 10px", background: "#D1FAE5", fontSize: 10, fontFamily: "JetBrains Mono, monospace", display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontWeight: 700 }}>MARGIN</span>
                                        <span style={{ fontWeight: 700, color: "var(--good)" }}>
                                          ${(billTotal - livePayTotal).toFixed(2)} ({billTotal > 0 ? ((billTotal - livePayTotal) / billTotal * 100).toFixed(0) : "0"}%)
                                        </span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* v18 Session 3: GENERATE PAY STATEMENT button */}
                {(() => {
                  const dirtyCount = drvFbs.filter((fb) => isPayDirty(fb.id)).length;
                  const driverContact = contacts.find((c) => String(c.id) === String(drvContactId));
                  const grossTotal = drvFbs.reduce((s, fb) => {
                    const lines = Array.isArray(fb.payingLines) ? fb.payingLines : [];
                    return s + lines.reduce((ss, ln) => ss + (Number(ln.net) || 0), 0);
                  }, 0);
                  return (
                    <div style={{ marginTop: 10, padding: 10, background: "#FFF", border: "2px solid #0369A1", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div className="fbt-mono" style={{ fontSize: 11 }}>
                        <span style={{ color: "var(--concrete)" }}>TOTAL DUE: </span>
                        <span style={{ fontWeight: 700, color: "#0369A1", fontSize: 14 }}>${grossTotal.toFixed(2)}</span>
                        {dirtyCount > 0 && (
                          <span style={{ marginLeft: 10, color: "var(--hazard-deep)", fontSize: 10, fontWeight: 700 }}>
                            ⚠ {dirtyCount} UNSAVED
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={dirtyCount > 0}
                        onClick={() => {
                          if (dirtyCount > 0) {
                            onToast(`${dirtyCount} FB${dirtyCount !== 1 ? "s have" : " has"} unsaved pay edits — click SAVE first`);
                            return;
                          }
                          try {
                            const selectedFbs = drvSelectedFbIds === null
                              ? drvFbs
                              : drvFbs.filter((fb) => drvSelectedFbIds.has(fb.id));
                            if (selectedFbs.length === 0) {
                              onToast("⚠ NO FBs SELECTED — CHECK AT LEAST ONE");
                              return;
                            }
                            generatePayStubPDF({
                              subName: driverContact?.contactName || driverContact?.companyName || "Driver",
                              subKind: "driver",
                              subId: drvContactId,
                              fbs: selectedFbs,
                              payRecord: null,
                              brokeragePct: 0,
                              brokerageApplies: false,
                              allFreightBills: freightBills,
                              allDispatches: dispatches,
                              company,
                              contact: driverContact,
                              isHistorical: false,
                            });
                            onToast(`✓ PAY STATEMENT OPENED · ${selectedFbs.length} FB${selectedFbs.length !== 1 ? "s" : ""}`);
                          } catch (err) {
                            console.error("Pay statement PDF failed:", err);
                            onToast("⚠ POPUP BLOCKED — ALLOW POPUPS");
                          }
                        }}
                        className="btn-primary"
                        style={{ padding: "6px 16px", fontSize: 12, background: dirtyCount > 0 ? "var(--concrete)" : "#0369A1", color: "#FFF" }}
                      >
                        <FileDown size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
                        GENERATE PAY STATEMENT
                      </button>
                    </div>
                  );
                })()}
              </div>
            )
          ) : (
            <div style={{ padding: 20, background: "#FFF", border: "1.5px dashed var(--concrete)", textAlign: "center" }}>
              <User size={22} style={{ color: "var(--concrete)", marginBottom: 6 }} />
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>▸ PICK A DRIVER TO START</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: payScope === "subs" ? "grid" : "none", gridTemplateColumns: "1fr", gap: 14 }}>
        {/* SUBS BUILDER */}
        <div className="fbt-card" style={{ padding: 18, background: "#FEF3C7", border: "2px solid #9A3412" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 6, height: 22, background: "#9A3412" }} />
            <h3 className="fbt-display" style={{ fontSize: 16, margin: 0, color: "#9A3412" }}>PAY STATEMENT · SUBS</h3>
          </div>

          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            <div>
              <label className="fbt-label" style={{ fontSize: 10 }}>Select Subcontractor</label>
              <select
                className="fbt-select"
                value={subContactId}
                onChange={(e) => { setSubContactId(e.target.value); setSubExpandedFbIds(new Set()); }}
              >
                <option value="">— Pick a sub —</option>
                {subContactsList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.favorite ? "★ " : ""}{c.companyName || c.contactName}
                    {c.brokerageApplies ? ` · ${c.brokeragePercent || 10}% brok` : ""}
                    {c.defaultPayRate ? ` · $${c.defaultPayRate}/${c.defaultPayMethod || "hr"}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label className="fbt-label" style={{ fontSize: 10 }}>From Date</label>
                <input type="date" className="fbt-input" value={subFromDate} onChange={(e) => setSubFromDate(e.target.value)} />
              </div>
              <div>
                <label className="fbt-label" style={{ fontSize: 10 }}>To Date</label>
                <input type="date" className="fbt-input" value={subToDate} onChange={(e) => setSubToDate(e.target.value)} />
              </div>
            </div>
          </div>

          {subContactId ? (
            subFbs.length === 0 ? (
              <div style={{ padding: 16, background: "#FFF", border: "1.5px dashed var(--concrete)", textAlign: "center" }}>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
                  ▸ NO UNPAID APPROVED FBs FOR THIS SUB IN SELECTED RANGE
                </div>
              </div>
            ) : (
              <div>
                <div className="fbt-mono" style={{ fontSize: 10, color: "#9A3412", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>
                  ▸ {subFbs.length} FB{subFbs.length !== 1 ? "S" : ""} · CLICK TO EXPAND · EDIT PAY LINES ON RIGHT
                </div>
                {subFbs.length > 0 && (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 10px", background: "#FFF", border: "1px dashed var(--concrete)", marginBottom: 6, fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={subSelectedFbIds === null || subSelectedFbIds.size === subFbs.length}
                        onChange={(e) => setSubSelectedFbIds(e.target.checked ? null : new Set())}
                      />
                      SELECT ALL
                    </label>
                    <span style={{ color: "var(--concrete)", marginLeft: "auto" }}>
                      {subSelectedFbIds === null ? subFbs.length : subSelectedFbIds.size} of {subFbs.length} selected
                    </span>
                  </div>
                )}
                <div style={{ display: "grid", gap: 6, maxHeight: 340, overflowY: "auto" }}>
                  {subFbs.map((fb) => {
                    const expanded = subExpandedFbIds.has(fb.id);
                    const isSelected = subSelectedFbIds === null || subSelectedFbIds.has(fb.id);
                    const disp = dispatches.find((d) => d.id === fb.dispatchId);
                    const payLines = getPayLines(fb.id);  // v18 Session 2: draft-aware
                    const payTotal = payLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
                    const billLines = Array.isArray(fb.billingLines) ? fb.billingLines : [];
                    const billTotal = billLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
                    const dirty = isPayDirty(fb.id);
                    return (
                      <div key={fb.id} style={{ background: !isSelected ? "#F5F5F4" : dirty ? "#FEF3C7" : "#FFF", border: `1.5px solid ${!isSelected ? "#D6D3D1" : dirty ? "var(--hazard-deep)" : "var(--concrete)"}`, opacity: !isSelected ? 0.6 : 1 }}>
                        <div
                          style={{ padding: "8px 10px", display: "grid", gridTemplateColumns: "auto auto auto 1fr auto auto", gap: 10, alignItems: "center", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              const current = subSelectedFbIds === null ? new Set(subFbs.map((f) => f.id)) : new Set(subSelectedFbIds);
                              if (e.target.checked) current.add(fb.id); else current.delete(fb.id);
                              setSubSelectedFbIds(current);
                            }}
                            title="Include this FB in the pay statement"
                          />
                          <span
                            onClick={() => {
                              const next = new Set(subExpandedFbIds);
                              if (expanded) next.delete(fb.id); else next.add(fb.id);
                              setSubExpandedFbIds(next);
                            }}
                            style={{ cursor: "pointer", fontWeight: 700 }}
                          >
                            FB#{fb.freightBillNumber || "—"}
                            {dirty && <span title="Unsaved pay edits" style={{ marginLeft: 4, color: "var(--hazard-deep)" }}>●</span>}
                          </span>
                          <span>{fb.submittedAt ? fb.submittedAt.slice(0, 10) : "—"}</span>
                          <span style={{ color: "var(--concrete)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {disp?.jobName || "—"} · T{fb.truckNumber || "—"}
                          </span>
                          <span style={{ fontWeight: 700, color: "#9A3412" }}>${payTotal.toFixed(2)}</span>
                          <ChevronDown
                            size={12}
                            onClick={() => {
                              const next = new Set(subExpandedFbIds);
                              if (expanded) next.delete(fb.id); else next.add(fb.id);
                              setSubExpandedFbIds(next);
                            }}
                            style={{ cursor: "pointer", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s", color: "var(--concrete)" }}
                          />
                        </div>
                        {expanded && (
                          <div style={{ padding: "10px 14px", background: "#FAFAF9", borderTop: "1px dashed var(--concrete)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {/* LEFT: Billed to customer (read-only) */}
                            <div style={{ padding: 8, background: "#FFF", border: "1.5px solid var(--concrete)" }}>
                              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--hazard-deep)", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>
                                💰 BILLED TO CUSTOMER (READ-ONLY)
                              </div>
                              {billLines.length === 0 ? (
                                <div style={{ fontSize: 10, color: "var(--concrete)", fontStyle: "italic" }}>No billing lines</div>
                              ) : (
                                billLines.map((ln) => (
                                  <div key={ln.id} style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", padding: "2px 0", display: "flex", justifyContent: "space-between", gap: 6, borderBottom: "1px dotted var(--concrete)" }}>
                                    <span style={{ fontWeight: 700, minWidth: 42 }}>{ln.code}</span>
                                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ln.item}</span>
                                    <span>{Number(ln.qty || 0).toFixed(2)}×${Number(ln.rate || 0).toFixed(2)}</span>
                                    <span style={{ fontWeight: 700 }}>${Number(ln.net || 0).toFixed(2)}</span>
                                  </div>
                                ))
                              )}
                              <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1.5px solid var(--hazard-deep)", display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>
                                <span>BILL TOTAL</span>
                                <span style={{ color: "var(--hazard-deep)" }}>${billTotal.toFixed(2)}</span>
                              </div>
                            </div>

                            {/* RIGHT: Paying to sub — editable */}
                            <div>
                              {renderPayLinesEditor(fb, "#9A3412")}
                              {(() => {
                                const livePayLines = getPayLines(fb.id);
                                const livePayTotal = livePayLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
                                return (
                                  <>
                                    <div style={{ marginTop: 6, padding: "6px 10px", border: "1.5px solid #9A3412", display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, background: "#FFF" }}>
                                      <span>PAY TOTAL</span>
                                      <span style={{ color: "#9A3412" }}>${livePayTotal.toFixed(2)}</span>
                                    </div>
                                    {billTotal > 0 && livePayTotal > 0 && (
                                      <div style={{ marginTop: 4, padding: "4px 10px", background: "#D1FAE5", fontSize: 10, fontFamily: "JetBrains Mono, monospace", display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontWeight: 700 }}>MARGIN</span>
                                        <span style={{ fontWeight: 700, color: "var(--good)" }}>
                                          ${(billTotal - livePayTotal).toFixed(2)} ({billTotal > 0 ? ((billTotal - livePayTotal) / billTotal * 100).toFixed(0) : "0"}%)
                                        </span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* v18 Session 3: GENERATE PAY STATEMENT button (subs) */}
                {(() => {
                  const dirtyCount = subFbs.filter((fb) => isPayDirty(fb.id)).length;
                  const subContactRec = contacts.find((c) => String(c.id) === String(subContactId));
                  const grossTotal = subFbs.reduce((s, fb) => {
                    const lines = Array.isArray(fb.payingLines) ? fb.payingLines : [];
                    return s + lines.reduce((ss, ln) => ss + (Number(ln.net) || 0), 0);
                  }, 0);
                  return (
                    <div style={{ marginTop: 10, padding: 10, background: "#FFF", border: "2px solid #9A3412", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div className="fbt-mono" style={{ fontSize: 11 }}>
                        <span style={{ color: "var(--concrete)" }}>TOTAL DUE: </span>
                        <span style={{ fontWeight: 700, color: "#9A3412", fontSize: 14 }}>${grossTotal.toFixed(2)}</span>
                        {dirtyCount > 0 && (
                          <span style={{ marginLeft: 10, color: "var(--hazard-deep)", fontSize: 10, fontWeight: 700 }}>
                            ⚠ {dirtyCount} UNSAVED
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={dirtyCount > 0}
                        onClick={() => {
                          if (dirtyCount > 0) {
                            onToast(`${dirtyCount} FB${dirtyCount !== 1 ? "s have" : " has"} unsaved pay edits — click SAVE first`);
                            return;
                          }
                          try {
                            const selectedFbs = subSelectedFbIds === null
                              ? subFbs
                              : subFbs.filter((fb) => subSelectedFbIds.has(fb.id));
                            if (selectedFbs.length === 0) {
                              onToast("⚠ NO FBs SELECTED — CHECK AT LEAST ONE");
                              return;
                            }
                            generatePayStubPDF({
                              subName: subContactRec?.companyName || subContactRec?.contactName || "Subcontractor",
                              subKind: "sub",
                              subId: subContactId,
                              fbs: selectedFbs,
                              payRecord: null,
                              brokeragePct: Number(subContactRec?.brokeragePercent || 10),
                              brokerageApplies: !!subContactRec?.brokerageApplies,
                              allFreightBills: freightBills,
                              allDispatches: dispatches,
                              company,
                              contact: subContactRec,
                              isHistorical: false,
                            });
                            onToast(`✓ PAY STATEMENT OPENED · ${selectedFbs.length} FB${selectedFbs.length !== 1 ? "s" : ""}`);
                          } catch (err) {
                            console.error("Pay statement PDF failed:", err);
                            onToast("⚠ POPUP BLOCKED — ALLOW POPUPS");
                          }
                        }}
                        className="btn-primary"
                        style={{ padding: "6px 16px", fontSize: 12, background: dirtyCount > 0 ? "var(--concrete)" : "#9A3412", color: "#FFF" }}
                      >
                        <FileDown size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
                        GENERATE PAY STATEMENT
                      </button>
                    </div>
                  );
                })()}
              </div>
            )
          ) : (
            <div style={{ padding: 20, background: "#FFF", border: "1.5px dashed var(--concrete)", textAlign: "center" }}>
              <Building2 size={22} style={{ color: "var(--concrete)", marginBottom: 6 }} />
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>▸ PICK A SUB TO START</div>
            </div>
          )}
        </div>
      </div>

      {/* Section divider before existing payroll UI */}
      <div style={{ padding: "10px 0", borderTop: "2px solid var(--concrete)", marginTop: 8 }}>
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", fontWeight: 700 }}>
          ▸ RECENT STATEMENTS · GROUPED BY SUB/DRIVER
        </div>
      </div>

      {payTarget && (
        <PaidModal
          target={payTarget}
          fbs={payTarget.fbs}
          editFreightBill={editFreightBill}
          allFreightBills={freightBills}
          onClose={() => setPayTarget(null)}
          onToast={onToast}
          onPaidSuccess={({ paidFbs, payRecord }) => {
            setStubOffer({
              target: payTarget,
              paidFbs,
              payRecord,
            });
          }}
          currentUser="admin"
        />
      )}
      {stubOffer && (
        <PayStubOfferModal
          target={stubOffer.target}
          fbs={stubOffer.paidFbs}
          payRecord={stubOffer.payRecord}
          allFreightBills={freightBills}
          allDispatches={dispatches}
          company={company}
          onPrint={() => {
            try {
              generatePayStubPDF({
                subName: stubOffer.target.subName,
                subKind: stubOffer.target.subKind,
                subId: stubOffer.target.subId,
                fbs: stubOffer.paidFbs,
                payRecord: stubOffer.payRecord,
                brokeragePct: stubOffer.target.brokeragePct || 8,
                brokerageApplies: (stubOffer.target.brokerageAmt || 0) > 0,
                allFreightBills: freightBills,
                allDispatches: dispatches,
                company,
                contact: contacts.find((c) => c.id === stubOffer.target.subId) || null,
                statementNumber: stubOffer.paidFbs?.[0]?.payStatementNumber || null,  // v19b
              });
              onToast("STUB OPENED — PRINT / SAVE AS PDF");
            } catch (e) {
              onToast(e.message || "POPUP BLOCKED");
            }
          }}
          onClose={() => setStubOffer(null)}
        />
      )}
      {editingFB && (
        <FBEditModal
          fb={editingFB}
          dispatches={dispatches}
          setDispatches={setDispatches}
          contacts={contacts}
          projects={projects}
          freightBills={freightBills}
          editFreightBill={editFreightBill}
          invoices={invoices}
          onClose={() => setEditingFB(null)}
          onToast={onToast}
          currentUser="admin"
        />
      )}
      {traceFB && (
        <FBTraceModal
          entry={traceFB}
          invoices={invoices}
          contacts={contacts}
          onClose={() => setTraceFB(null)}
        />
      )}

      {/* v18: Old CREATE PAY STATEMENT modal + button removed — superseded by the two dedicated
          DRIVERS/SUBS builders at the top of PayrollTab. */}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <div className="fbt-card" style={{ padding: 16, background: "var(--hazard)", color: "var(--steel)" }}>
          <div className="stat-num" style={{ color: "var(--steel)" }}>{unpaidFBCount}</div>
          <div className="stat-label">Unpaid FBs</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{fmt$(totalUnpaidGross).replace("$", "$").slice(0, 10)}</div>
          <div className="stat-label">Unpaid Gross</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num" style={{ color: "var(--hazard-deep)" }}>−{fmt$(totalBrokerageUnpaid).replace("$", "$").slice(0, 10)}</div>
          <div className="stat-label">Brokerage</div>
        </div>
        <div className="fbt-card" style={{ padding: 16, background: "var(--good)", color: "#FFF" }}>
          <div className="stat-num" style={{ color: "#FFF" }}>{fmt$(totalNetUnpaid).replace("$", "$").slice(0, 10)}</div>
          <div className="stat-label" style={{ color: "#FFF" }}>Total Net Due</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{allUnpaidSubs.length}</div>
          <div className="stat-label">Subs/Drivers Owed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="fbt-card" style={{ padding: 16, display: "grid", gap: 12 }}>
        {/* Customer-paid filter (prominent) */}
        <div style={{ padding: 12, background: customerPaidOnly ? "#F0FDF4" : "#FEF2F2", border: "2px solid " + (customerPaidOnly ? "var(--good)" : "var(--safety)"), display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontFamily: "JetBrains Mono, monospace", flex: 1, minWidth: 240 }}>
            <input
              type="checkbox"
              checked={customerPaidOnly}
              onChange={(e) => setCustomerPaidOnly(e.target.checked)}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <Banknote size={16} style={{ color: customerPaidOnly ? "var(--good)" : "var(--safety)" }} />
            <strong>{customerPaidOnly ? "PAY ONLY WHEN CUSTOMER PAID" : "⚠ ADVANCE PAY MODE — PAYING BEFORE CUSTOMER PAYS"}</strong>
          </label>
          {!customerPaidOnly && (
            <span className="fbt-mono" style={{ fontSize: 10, color: "var(--safety)", letterSpacing: "0.1em" }}>
              RISK: YOUR CASH FIRST
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <div>
            <label className="fbt-label">Status</label>
            <select className="fbt-select" value={paidFilter} onChange={(e) => setPaidFilter(e.target.value)}>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="all">All</option>
            </select>
          </div>
          <div>
            <label className="fbt-label">From</label>
            <input className="fbt-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="fbt-label">To</label>
            <input className="fbt-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div>
            <label className="fbt-label">Project</label>
            <select className="fbt-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value="none">(No project)</option>
            </select>
          </div>
          <div>
            <label className="fbt-label">Sub / Driver</label>
            <select className="fbt-select" value={subFilter} onChange={(e) => setSubFilter(e.target.value)}>
              <option value="">All</option>
              {subContactOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grouped results */}
      {grouped.length === 0 ? (
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", color: "var(--concrete)" }}>
          <DollarSign size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {paidFilter === "unpaid" ? "NO UNPAID FREIGHT BILLS — ALL PAID" : "NO MATCHING FREIGHT BILLS"}
          </div>
          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8, lineHeight: 1.5 }}>
            FBs must be APPROVED and have a PAY RATE set on their order assignment to appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {grouped.map((pd) => {
            const pExp = expanded[`p_${pd.projectKey}`] !== false; // default expanded
            return (
              <div key={pd.projectKey} className="fbt-card" style={{ padding: 0, overflow: "hidden" }}>
                {/* Project header */}
                <div
                  style={{
                    padding: "12px 16px", background: "var(--steel)", color: "var(--cream)",
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
                    cursor: "pointer",
                  }}
                  onClick={() => toggleProject(pd.projectKey)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 200 }}>
                    <ChevronDown size={16} style={{ transform: pExp ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
                    <Briefcase size={16} style={{ color: "var(--hazard)" }} />
                    <div>
                      <div className="fbt-display" style={{ fontSize: 16 }}>{pd.projectName}</div>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1", marginTop: 2 }}>
                        {pd.subs.length} SUB{pd.subs.length !== 1 ? "S" : ""} · {pd.subs.reduce((s, x) => s + x.fbs.length, 0)} FB{pd.subs.reduce((s, x) => s + x.fbs.length, 0) !== 1 ? "S" : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "right" }}>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1" }}>GROSS</div>
                      <div className="fbt-display" style={{ fontSize: 14 }}>{fmt$(pd.projGross)}</div>
                    </div>
                    {pd.projBrok > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1" }}>BROK</div>
                        <div className="fbt-display" style={{ fontSize: 14, color: "var(--hazard)" }}>−{fmt$(pd.projBrok)}</div>
                      </div>
                    )}
                    <div style={{ textAlign: "right" }}>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)" }}>NET</div>
                      <div className="fbt-display" style={{ fontSize: 16, color: "var(--hazard)" }}>{fmt$(pd.projNet)}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); exportProjectCSV(pd); }}
                      className="btn-ghost"
                      style={{ padding: "5px 10px", fontSize: 10, color: "var(--cream)", borderColor: "var(--cream)" }}
                    >
                      <Download size={11} style={{ marginRight: 3 }} /> CSV
                    </button>
                  </div>
                </div>

                {/* Subs under this project */}
                {pExp && (
                  <div style={{ padding: 12, display: "grid", gap: 10 }}>
                    {pd.subs.map((sub) => {
                      const sExp = expanded[`s_${pd.projectKey}_${sub.subKey}`];
                      const unpaidFbs = sub.fbs.filter((x) => !x.fb.paidAt);
                      const paidFbs = sub.fbs.filter((x) => !!x.fb.paidAt);
                      const isAllPaid = unpaidFbs.length === 0 && paidFbs.length > 0;
                      // Missing-rate detection: any FB whose assignment has no payRate configured
                      const missingRateFbs = sub.fbs.filter((x) => {
                        const d = x.dispatch;
                        const a = (d?.assignments || []).find((ax) => ax.aid === x.fb.assignmentId);
                        return !a || !a.payRate || Number(a.payRate) <= 0;
                      });
                      return (
                        <div key={sub.subKey} id={`payroll-sub-${sub.subId}`} style={{ border: "1.5px solid var(--steel)", background: isAllPaid ? "#F0FDF4" : "#FFF" }}>
                          <div
                            style={{ padding: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, cursor: "pointer" }}
                            onClick={() => toggleSub(pd.projectKey, sub.subKey)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 180 }}>
                              <ChevronDown size={14} style={{ transform: sExp ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
                              <span className="chip" style={{ background: sub.kind === "driver" ? "#FFF" : "var(--hazard)", fontSize: 9, padding: "2px 7px" }}>
                                {sub.kind === "driver" ? "DRIVER" : "SUB"}
                              </span>
                              {sub.brokerageApplies && (
                                <span className="chip" style={{ background: "var(--hazard-deep)", color: "#FFF", fontSize: 9, padding: "2px 7px" }}>
                                  −{sub.brokeragePct}% BROK
                                </span>
                              )}
                              {isAllPaid && (
                                <span className="chip" style={{ background: "var(--good)", color: "#FFF", fontSize: 9, padding: "2px 7px" }}>
                                  ✓ PAID
                                </span>
                              )}
                              <div className="fbt-display" style={{ fontSize: 14 }}>{sub.subName}</div>
                              <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
                                {unpaidFbs.length > 0 ? `${unpaidFbs.length} UNPAID` : ""}
                                {paidFbs.length > 0 ? ` ${paidFbs.length} PAID` : ""}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                              {unpaidFbs.length > 0 ? (
                                <>
                                  {/* Ready block */}
                                  {sub.readyCount > 0 && (
                                    <div style={{ textAlign: "right", padding: "4px 8px", background: "#F0FDF4", border: "1.5px solid var(--good)" }}>
                                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--good)", fontWeight: 700 }}>READY · {sub.readyCount} FB</div>
                                      <div className="fbt-display" style={{ fontSize: 14, color: "var(--good)" }}>{fmt$(sub.readyNet)}</div>
                                    </div>
                                  )}
                                  {/* Advance block */}
                                  {sub.advanceCount > 0 && (
                                    <div style={{ textAlign: "right", padding: "4px 8px", background: "#FEF2F2", border: "1.5px solid var(--safety)" }}>
                                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--safety)", fontWeight: 700 }}>⚠ ADVANCE · {sub.advanceCount} FB</div>
                                      <div className="fbt-display" style={{ fontSize: 14, color: "var(--safety)" }}>{fmt$(sub.advanceNet)}</div>
                                    </div>
                                  )}
                                  {/* Smart PAY button */}
                                  {sub.readyCount > 0 ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openPaySub(pd, sub, false); }}
                                      className="btn-primary"
                                      style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)", padding: "6px 14px", fontSize: 11 }}
                                      title={`Pay ${sub.readyCount} FBs the customer already paid for`}
                                    >
                                      <DollarSign size={12} /> PAY READY
                                    </button>
                                  ) : sub.advanceCount > 0 ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); if (confirm("No customer payments received for these FBs yet.\n\nPay sub anyway (ADVANCE PAY — your cash at risk)?")) openPaySub(pd, sub, true); }}
                                      className="btn-ghost"
                                      style={{ background: "var(--safety)", color: "#FFF", borderColor: "var(--safety)", padding: "6px 14px", fontSize: 11 }}
                                      title="Customer hasn't paid yet — advance pay is at your risk"
                                    >
                                      <AlertTriangle size={12} /> ADVANCE PAY
                                    </button>
                                  ) : null}
                                  {/* If both ready AND advance — optional secondary button */}
                                  {sub.readyCount > 0 && sub.advanceCount > 0 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); if (confirm(`Pay all ${unpaidFbs.length} FBs including ${sub.advanceCount} advance (customer not paid)?`)) openPaySub(pd, sub, true); }}
                                      className="btn-ghost"
                                      style={{ padding: "6px 10px", fontSize: 10, color: "var(--safety)", borderColor: "var(--safety)" }}
                                      title="Pay everything including advance-risk FBs"
                                    >
                                      +ADV
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="fbt-mono" style={{ fontSize: 11, color: "var(--good)", fontWeight: 700 }}>
                                  ✓ ALL PAID
                                </span>
                              )}
                              {/* Print Stub — visible when sub has any paid FBs */}
                              {paidFbs.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    try {
                                      // Group paid FBs by paidAt date to find the most recent pay run
                                      const paidByDate = new Map();
                                      paidFbs.forEach((x) => {
                                        const key = x.fb.paidAt ? x.fb.paidAt.slice(0, 10) : "unknown";
                                        if (!paidByDate.has(key)) paidByDate.set(key, []);
                                        paidByDate.get(key).push(x.fb);
                                      });
                                      // Most recent pay run
                                      const sortedDates = Array.from(paidByDate.keys()).sort().reverse();
                                      const latestDate = sortedDates[0];
                                      const latestRunFbs = paidByDate.get(latestDate);
                                      const payRecord = {
                                        paidAt: latestRunFbs[0].paidAt,
                                        paidMethod: latestRunFbs[0].paidMethod,
                                        paidCheckNumber: latestRunFbs[0].paidCheckNumber,
                                        paidNotes: latestRunFbs[0].paidNotes,
                                      };
                                      generatePayStubPDF({
                                        subName: sub.subName,
                                        subKind: sub.kind,
                                        subId: sub.subId,
                                        fbs: latestRunFbs,
                                        payRecord,
                                        brokeragePct: sub.brokeragePct,
                                        brokerageApplies: sub.brokerageApplies,
                                        allFreightBills: freightBills,
                                        allDispatches: dispatches,
                                        company,
                                        contact: contacts.find((c) => c.id === sub.subId) || null,
                                        isHistorical: true,
                                        statementNumber: latestRunFbs[0].payStatementNumber || null,  // v19b: use persistent number
                                      });
                                      onToast(`STUB FOR ${sub.subName} (${latestDate})`);
                                    } catch (err) {
                                      onToast(err.message || "POPUP BLOCKED");
                                    }
                                  }}
                                  className="btn-ghost"
                                  style={{ padding: "6px 10px", fontSize: 10, color: "var(--steel)" }}
                                  title="Print pay stub for most recent pay run"
                                >
                                  <Printer size={11} style={{ marginRight: 3 }} /> STUB
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Individual FBs */}
                          {sExp && (
                            <div style={{ padding: "0 10px 10px", display: "grid", gap: 4 }}>
                              {/* Missing-rate warning — sub-level */}
                              {missingRateFbs.length > 0 && (
                                <div style={{ padding: 10, background: "#FEE2E2", border: "2px solid var(--safety)", marginBottom: 6 }}>
                                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--safety)", fontWeight: 700, marginBottom: 4, letterSpacing: "0.08em" }}>
                                    ⚠ {missingRateFbs.length} FB{missingRateFbs.length !== 1 ? "s" : ""} MISSING PAY RATE — SHOWING $0
                                  </div>
                                  <div style={{ fontSize: 10, color: "var(--concrete)", lineHeight: 1.5 }}>
                                    The order assignment for {sub.subName} has no pay rate set. To fix: open the order (click FB# link), find the assignment row, and enter the pay rate. Future orders will auto-fill from this contact's default pay rate (set in Contacts tab).
                                  </div>
                                  {missingRateFbs.length > 0 && missingRateFbs[0].dispatch && (
                                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>
                                      AFFECTED ORDERS: {[...new Set(missingRateFbs.map((x) => `#${x.dispatch.code}`))].join(", ")}
                                    </div>
                                  )}
                                </div>
                              )}
                              {sub.fbs.map((entry) => {
                                const fb = entry.fb;
                                const isPaid = !!fb.paidAt;
                                return (
                                  <div
                                    key={fb.id}
                                    style={{
                                      padding: 8, fontSize: 11, fontFamily: "JetBrains Mono, monospace",
                                      background: isPaid ? "#F0FDF4" : (entry.custStatus === "paid" || entry.custStatus === "short" ? "#FEF3C7" : "#FEE2E2"),
                                      borderLeft: `3px solid ${isPaid ? "var(--good)" : (entry.custStatus === "paid" || entry.custStatus === "short" ? "var(--hazard)" : "var(--safety)")}`,
                                      display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "center",
                                    }}
                                  >
                                    <div style={{ minWidth: 0, overflow: "hidden" }}>
                                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                        <strong style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setEditingFB(fb)}>
                                          FB#{fb.freightBillNumber || "—"}
                                        </strong>
                                        <span style={{ color: "var(--concrete)" }}>
                                          {fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : ""} · Order #{entry.dispatch?.code}
                                        </span>
                                        {/* Customer-pay status chip */}
                                        {entry.custStatus === "paid" && (
                                          <span
                                            className="chip"
                                            style={{ background: "var(--good)", color: "#FFF", fontSize: 9, padding: "2px 6px", cursor: "pointer" }}
                                            onClick={() => setTraceFB(entry)}
                                            title="Click to trace invoice + customer payment"
                                          >
                                            ✓ CUST PAID
                                          </span>
                                        )}
                                        {entry.custStatus === "short" && (
                                          <span
                                            className="chip"
                                            style={{ background: "var(--hazard)", fontSize: 9, padding: "2px 6px", cursor: "pointer" }}
                                            onClick={() => setTraceFB(entry)}
                                            title="Click to trace invoice + customer payment"
                                          >
                                            ⚠ SHORT-PAID {Math.round(entry.customerRatio * 100)}%
                                          </span>
                                        )}
                                        {entry.custStatus === "unpaid" && (
                                          <span
                                            className="chip"
                                            style={{ background: "var(--safety)", color: "#FFF", fontSize: 9, padding: "2px 6px", cursor: "pointer" }}
                                            onClick={() => setTraceFB(entry)}
                                            title="Click to trace invoice"
                                          >
                                            ○ CUST UNPAID
                                          </span>
                                        )}
                                        {entry.custStatus === "no_invoice" && (
                                          <span className="chip" style={{ background: "var(--concrete)", color: "#FFF", fontSize: 9, padding: "2px 6px" }}>
                                            NO INVOICE
                                          </span>
                                        )}
                                        {/* Direct link to invoice — if FB is on one */}
                                        {fb.invoiceId && onJumpToInvoice && (() => {
                                          const inv = invoices.find((i) => i.id === fb.invoiceId);
                                          if (!inv) return null;
                                          return (
                                            <span
                                              className="chip"
                                              style={{ background: "var(--steel)", color: "var(--cream)", fontSize: 9, padding: "2px 6px", cursor: "pointer", fontWeight: 700 }}
                                              onClick={(e) => { e.stopPropagation(); onJumpToInvoice(inv.id); }}
                                              title="Jump to this invoice"
                                            >
                                              → INV {inv.invoiceNumber}
                                            </span>
                                          );
                                        })()}
                                        {isPaid && (
                                          <span style={{ color: "var(--good)", fontWeight: 700 }}>
                                            ✓ {fb.paidAt.slice(0, 10)} · {methodLabel[fb.paidMethod] || "Paid"}{fb.paidCheckNumber ? ` #${fb.paidCheckNumber}` : ""} · {fmt$(fb.paidAmount || 0)}
                                            {fb.payStatementNumber && (
                                              <span style={{ marginLeft: 6, padding: "1px 5px", background: "var(--steel)", color: "var(--cream)", fontSize: 9, letterSpacing: "0.05em" }}>
                                                {fb.payStatementNumber}
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ color: "var(--concrete)", fontSize: 10, marginTop: 2 }}>
                                        {fb.driverName || "—"}{fb.truckNumber ? ` · T${fb.truckNumber}` : ""} · {entry.qty.toFixed(2)} {entry.method} × ${entry.rate.toFixed(2)} = <strong style={{ color: "var(--steel)" }}>{fmt$(entry.gross)}</strong>
                                        {entry.custStatus === "short" && (
                                          <span style={{ color: "var(--safety)", marginLeft: 8 }}>
                                            → PAY {fmt$(entry.adjustedGross)} ({Math.round(entry.customerRatio * 100)}%)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 4 }}>
                                      {(entry.custStatus === "paid" || entry.custStatus === "short" || entry.custStatus === "unpaid") && (
                                        <button onClick={() => setTraceFB(entry)} className="btn-ghost" style={{ padding: "3px 8px", fontSize: 10 }} title="Trace to invoice / payment">
                                          <Search size={10} />
                                        </button>
                                      )}
                                      <button onClick={() => setEditingFB(fb)} className="btn-ghost" style={{ padding: "3px 8px", fontSize: 10 }}>
                                        <Edit2 size={10} />
                                      </button>
                                      {isPaid && (
                                        <button onClick={() => unmarkPaid(fb)} className="btn-ghost" style={{ padding: "3px 8px", fontSize: 10, color: "var(--safety)" }} title="Un-mark paid">
                                          <RefreshCw size={10} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ========== PROJECT MODAL ==========
const ProjectModal = ({ project, contacts, onSave, onClose, onToast }) => {
  const [draft, setDraft] = useState(project || {
    customerId: null, name: "", description: "", contractNumber: "", poNumber: "",
    location: "", status: "active", startDate: "", endDate: "",
    tonnageGoal: "", budget: "", bidAmount: "",
    primeContractor: "", fundingSource: "", certifiedPayroll: false, notes: "",
    defaultRate: "", minimumHours: "",
  });

  const customers = contacts.filter((c) => c.type === "customer");

  const save = async () => {
    if (!draft.name) { alert("Project name is required."); return; }
    await onSave({
      ...draft,
      id: draft.id || ("temp-" + Date.now()),
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onToast(project ? "PROJECT UPDATED" : "PROJECT CREATED");
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Briefcase size={18} /> {project ? "EDIT PROJECT" : "NEW PROJECT"}
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div>
            <label className="fbt-label">Customer</label>
            {customers.length > 0 ? (
              <select className="fbt-select" value={draft.customerId || ""} onChange={(e) => setDraft({ ...draft, customerId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— Choose customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.favorite ? "★ " : ""}{c.companyName || c.contactName}</option>
                ))}
              </select>
            ) : (
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", padding: "8px 10px", border: "1px dashed var(--concrete)", background: "#F5F5F4" }}>
                ADD A CUSTOMER IN CONTACTS FIRST
              </div>
            )}
          </div>

          <div>
            <label className="fbt-label">Project Name *</label>
            <input className="fbt-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Salinas Stormwater Phase 2A" />
          </div>

          <div>
            <label className="fbt-label">Description</label>
            <textarea className="fbt-textarea" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Brief summary of the work..." />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Contract #</label>
              <input className="fbt-input" value={draft.contractNumber} onChange={(e) => setDraft({ ...draft, contractNumber: e.target.value })} placeholder="MCI #91684" />
            </div>
            <div>
              <label className="fbt-label">PO # (for invoices)</label>
              <input className="fbt-input" value={draft.poNumber} onChange={(e) => setDraft({ ...draft, poNumber: e.target.value })} placeholder="PO-2026-0045" />
            </div>
            <div>
              <label className="fbt-label">Status</label>
              <select className="fbt-select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="complete">Complete</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="fbt-label">Location</label>
            <input className="fbt-input" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Hitchcock Rd, Salinas, CA" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Start Date</label>
              <input className="fbt-input" type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">End Date</label>
              <input className="fbt-input" type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
            </div>
          </div>

          {/* Project Billing Defaults — inherited by orders under this project */}
          <div style={{ padding: 14, background: "#F0FDF4", border: "2px solid var(--good)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>
              ▸ BILLING DEFAULTS · APPLIED TO ORDERS + INVOICES UNDER THIS PROJECT
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
              <div>
                <label className="fbt-label">Default Rate $/hr</label>
                <input
                  className="fbt-input"
                  type="number"
                  step="0.01"
                  value={draft.defaultRate ?? ""}
                  onChange={(e) => setDraft({ ...draft, defaultRate: e.target.value })}
                  placeholder="142.00"
                />
              </div>
              <div>
                <label className="fbt-label">Minimum Hours</label>
                <input
                  className="fbt-input"
                  type="number"
                  step="0.25"
                  value={draft.minimumHours ?? ""}
                  onChange={(e) => setDraft({ ...draft, minimumHours: e.target.value })}
                  placeholder="8"
                />
              </div>
            </div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8, lineHeight: 1.5 }}>
              ▸ INVOICE USES max(ACTUAL_HOURS, MINIMUM) × RATE · SUB PAYROLL USES ACTUAL HOURS
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Tonnage Goal</label>
              <input className="fbt-input" type="number" value={draft.tonnageGoal} onChange={(e) => setDraft({ ...draft, tonnageGoal: e.target.value })} placeholder="5000" />
            </div>
            <div>
              <label className="fbt-label">Bid Amount $</label>
              <input className="fbt-input" type="number" step="0.01" value={draft.bidAmount} onChange={(e) => setDraft({ ...draft, bidAmount: e.target.value })} placeholder="125000.00" />
            </div>
            <div>
              <label className="fbt-label">Budget $</label>
              <input className="fbt-input" type="number" step="0.01" value={draft.budget} onChange={(e) => setDraft({ ...draft, budget: e.target.value })} placeholder="118000.00" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Prime Contractor</label>
              <input className="fbt-input" value={draft.primeContractor} onChange={(e) => setDraft({ ...draft, primeContractor: e.target.value })} placeholder="MCI (if we're the sub)" />
            </div>
            <div>
              <label className="fbt-label">Funding Source</label>
              <select className="fbt-select" value={draft.fundingSource} onChange={(e) => setDraft({ ...draft, fundingSource: e.target.value })}>
                <option value="">— Select —</option>
                <option value="public_works">Public Works</option>
                <option value="federal">Federal</option>
                <option value="state">State</option>
                <option value="local">Local / Municipal</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, border: "2px solid var(--steel)", background: draft.certifiedPayroll ? "#FEF3C7" : "#FFF", cursor: "pointer" }}>
            <input type="checkbox" checked={draft.certifiedPayroll} onChange={(e) => setDraft({ ...draft, certifiedPayroll: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer" }} />
            <span className="fbt-mono" style={{ fontSize: 12, letterSpacing: "0.08em" }}>CERTIFIED PAYROLL REQUIRED (Prevailing Wage)</span>
          </label>

          <div>
            <label className="fbt-label">Notes</label>
            <textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Internal notes, quirks, special requirements..." />
          </div>

          {/* v21 Session S: Public portfolio section */}
          <div style={{ padding: 14, border: "2px dashed var(--steel)", background: "#FAFAF9" }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 10 }}>
              ▸ PUBLIC WEBSITE PORTFOLIO
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 10, border: "2px solid var(--steel)", background: draft.showOnWebsite ? "#DCFCE7" : "#FFF", cursor: "pointer" }}>
              <input type="checkbox" checked={!!draft.showOnWebsite} onChange={(e) => setDraft({ ...draft, showOnWebsite: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer", marginTop: 2 }} />
              <div>
                <div className="fbt-mono" style={{ fontSize: 12, letterSpacing: "0.08em", fontWeight: 700 }}>SHOW ON PUBLIC WEBSITE</div>
                <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4, fontFamily: "JetBrains Mono, monospace" }}>
                  Displays project name + customer name on 4brotherstruck.com portfolio section. Nothing else (no rates, no tonnage, no contract info) is ever shown publicly.
                </div>
              </div>
            </label>
            {draft.showOnWebsite && (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div>
                  <label className="fbt-label">Customer Display Name (optional)</label>
                  <input
                    className="fbt-input"
                    value={draft.publicCustomer || ""}
                    onChange={(e) => setDraft({ ...draft, publicCustomer: e.target.value })}
                    placeholder={
                      draft.customerId
                        ? `Default: "${(customers.find((c) => c.id === draft.customerId)?.companyName || customers.find((c) => c.id === draft.customerId)?.contactName) || ""}" — leave blank to use this`
                        : "e.g. City of Salinas, Caltrans, Graniterock"
                    }
                  />
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4, letterSpacing: "0.05em" }}>
                    ▸ USE IF YOU WANT A CLEANER PUBLIC NAME (E.G. "CITY OF SALINAS" INSTEAD OF THE FULL ENTITY NAME)
                  </div>
                </div>
                <div>
                  <label className="fbt-label">Completion Year (optional)</label>
                  <input
                    className="fbt-input"
                    type="number"
                    min="2015" max="2099"
                    value={draft.completionYear || ""}
                    onChange={(e) => setDraft({ ...draft, completionYear: e.target.value ? Number(e.target.value) : null })}
                    placeholder="e.g. 2025"
                    style={{ width: 140 }}
                  />
                </div>
                <div>
                  <label className="fbt-label">Display Order (optional)</label>
                  <input
                    className="fbt-input"
                    type="number"
                    value={draft.publicOrder || 0}
                    onChange={(e) => setDraft({ ...draft, publicOrder: Number(e.target.value) || 0 })}
                    style={{ width: 140 }}
                  />
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4, letterSpacing: "0.05em" }}>
                    ▸ LOWER NUMBERS SHOW FIRST. LEAVE AT 0 TO SORT BY COMPLETION YEAR.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <button onClick={save} className="btn-primary"><CheckCircle2 size={16} /> SAVE PROJECT</button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== PROJECT DETAIL MODAL ==========
const ProjectDetailModal = ({ project, contacts, dispatches, freightBills, invoices, onEdit, onDelete, onClose }) => {
  const customer = contacts.find((c) => c.id === project.customerId);
  const projectDispatches = dispatches.filter((d) => d.projectId === project.id);
  const projectBills = freightBills.filter((fb) => projectDispatches.some((d) => d.id === fb.dispatchId));
  const projectInvoices = invoices.filter((i) => i.projectId === project.id);

  const totalTons = projectBills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
  const totalInvoiced = projectInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);

  const statusColor = {
    active: "var(--good)", complete: "var(--concrete)",
    on_hold: "var(--hazard-deep)", cancelled: "var(--safety)",
  }[project.status] || "var(--concrete)";

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.1em" }}>
              PROJECT · {project.status?.toUpperCase().replace("_", " ")}
            </div>
            <h3 className="fbt-display" style={{ fontSize: 22, margin: "4px 0 0" }}>{project.name}</h3>
            {customer && <div className="fbt-mono" style={{ fontSize: 12, color: "#D6D3D1", marginTop: 4 }}>for {customer.companyName}</div>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onEdit} className="btn-ghost" style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "6px 12px", fontSize: 11 }}><Edit2 size={12} /></button>
            <button onClick={onDelete} className="btn-danger" style={{ color: "var(--hazard)", borderColor: "var(--hazard)" }}><Trash2 size={12} /></button>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* Key stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
            <div className="fbt-card" style={{ padding: 14, background: statusColor, color: "#FFF" }}>
              <div className="stat-num" style={{ fontSize: 22, color: "#FFF" }}>{project.status?.replace("_", " ").toUpperCase()}</div>
              <div className="stat-label" style={{ color: "#FFF" }}>Status</div>
            </div>
            <div className="fbt-card" style={{ padding: 14 }}>
              <div className="stat-num" style={{ fontSize: 28 }}>{projectDispatches.length}</div>
              <div className="stat-label">Orders</div>
            </div>
            <div className="fbt-card" style={{ padding: 14 }}>
              <div className="stat-num" style={{ fontSize: 28 }}>{totalTons.toFixed(1)}</div>
              <div className="stat-label">Tons Hauled</div>
            </div>
            <div className="fbt-card" style={{ padding: 14, background: "var(--hazard)" }}>
              <div className="stat-num" style={{ fontSize: 22 }}>{fmt$(totalInvoiced)}</div>
              <div className="stat-label">Invoiced</div>
            </div>
          </div>

          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ PROJECT INFO</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 20, fontSize: 13, fontFamily: "JetBrains Mono, monospace" }}>
            {project.contractNumber && <div><strong>CONTRACT:</strong> {project.contractNumber}</div>}
            {project.poNumber && <div><strong>PO #:</strong> {project.poNumber}</div>}
            {project.location && <div style={{ gridColumn: "1 / -1" }}><strong>LOCATION:</strong> {project.location}</div>}
            {project.startDate && <div><strong>START:</strong> {fmtDate(project.startDate)}</div>}
            {project.endDate && <div><strong>END:</strong> {fmtDate(project.endDate)}</div>}
            {project.primeContractor && <div><strong>PRIME:</strong> {project.primeContractor}</div>}
            {project.fundingSource && <div><strong>FUNDING:</strong> {project.fundingSource.replace("_", " ").toUpperCase()}</div>}
            {project.bidAmount && <div><strong>BID:</strong> {fmt$(project.bidAmount)}</div>}
            {project.budget && <div><strong>BUDGET:</strong> {fmt$(project.budget)}</div>}
            {project.tonnageGoal && <div><strong>TONNAGE GOAL:</strong> {Number(project.tonnageGoal).toFixed(0)}</div>}
            {project.certifiedPayroll && <div style={{ gridColumn: "1 / -1", color: "var(--hazard-deep)" }}><strong>⚠ CERTIFIED PAYROLL REQUIRED</strong></div>}
          </div>

          {project.description && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ DESCRIPTION</div>
              <div style={{ padding: 12, background: "#F5F5F4", fontSize: 13, marginBottom: 20, whiteSpace: "pre-wrap" }}>{project.description}</div>
            </>
          )}

          {project.notes && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ INTERNAL NOTES</div>
              <div style={{ padding: 12, background: "#FEF3C7", borderLeft: "3px solid var(--hazard)", fontSize: 13, marginBottom: 20, whiteSpace: "pre-wrap" }}>{project.notes}</div>
            </>
          )}

          {/* Progress bar if tonnage goal set */}
          {project.tonnageGoal > 0 && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>
                ▸ PROGRESS · {totalTons.toFixed(1)} / {Number(project.tonnageGoal).toFixed(0)} TONS
              </div>
              <div style={{ height: 14, background: "#E7E5E4", border: "1px solid var(--steel)", marginBottom: 20 }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, (totalTons / Number(project.tonnageGoal)) * 100)}%`,
                  background: totalTons >= Number(project.tonnageGoal) ? "var(--good)" : "var(--hazard)",
                }} />
              </div>
            </>
          )}

          {projectDispatches.length > 0 && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ ORDERS ON THIS PROJECT ({projectDispatches.length})</div>
              <div style={{ display: "grid", gap: 6 }}>
                {projectDispatches.slice(0, 15).map((d) => {
                  const bills = freightBills.filter((fb) => fb.dispatchId === d.id);
                  return (
                    <div key={d.id} style={{ padding: 10, border: "1px solid var(--steel)", background: "#FFF", fontSize: 12, fontFamily: "JetBrains Mono, monospace", display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <div><strong>#{d.code}</strong> · {d.jobName}</div>
                      <div style={{ color: "var(--concrete)" }}>{fmtDate(d.date)} · {bills.length}/{d.trucksExpected} FB</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ========== PROJECTS TAB ==========
const ProjectsTab = ({ projects, setProjects, contacts, dispatches, freightBills, invoices, onToast }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const save = async (p) => {
    const exists = projects.find((x) => x.id === p.id);
    const next = exists ? projects.map((x) => x.id === p.id ? p : x) : [p, ...projects];
    setProjects(next);
  };

  const remove = async (id) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`Delete project "${p.name}"? Orders linked to it will keep their project reference (but the project won't exist anymore).`)) return;
    const next = projects.filter((x) => x.id !== id);
    setProjects(next);
    onToast("PROJECT DELETED");
    setViewing(null);
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return projects
      .filter((p) => statusFilter === "all" || p.status === statusFilter)
      .filter((p) => {
        if (!s) return true;
        const customer = contacts.find((c) => c.id === p.customerId);
        const hay = `${p.name} ${p.contractNumber} ${p.poNumber} ${p.location} ${customer?.companyName || ""}`.toLowerCase();
        return hay.includes(s);
      })
      .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  }, [projects, contacts, search, statusFilter]);

  const activeCount = projects.filter((p) => p.status === "active").length;
  const completeCount = projects.filter((p) => p.status === "complete").length;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {showModal && (
        <ProjectModal
          project={editing}
          contacts={contacts}
          onSave={save}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onToast={onToast}
        />
      )}
      {viewing && !showModal && (
        <ProjectDetailModal
          project={viewing}
          contacts={contacts}
          dispatches={dispatches}
          freightBills={freightBills}
          invoices={invoices}
          onEdit={() => { setEditing(viewing); setShowModal(true); }}
          onDelete={() => remove(viewing.id)}
          onClose={() => setViewing(null)}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{projects.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--good)", color: "#FFF" }}>
          <div className="stat-num" style={{ color: "#FFF" }}>{activeCount}</div>
          <div className="stat-label" style={{ color: "#FFF" }}>Active</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{completeCount}</div>
          <div className="stat-label">Complete</div>
        </div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--hazard)" }}>
          <div className="stat-num">{projects.filter((p) => p.certifiedPayroll).length}</div>
          <div className="stat-label">Cert Payroll</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search name, contract, PO, location…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="fbt-select" style={{ width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="complete">Complete</option>
          <option value="on_hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> NEW PROJECT
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <Briefcase size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {search || statusFilter !== "all" ? "NO MATCHES" : "NO PROJECTS YET — ADD YOUR FIRST ONE"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map((p) => {
            const customer = contacts.find((c) => c.id === p.customerId);
            const orders = dispatches.filter((d) => d.projectId === p.id);
            const bills = freightBills.filter((fb) => orders.some((d) => d.id === fb.dispatchId));
            const tons = bills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
            const statusBg = {
              active: "var(--good)", complete: "var(--concrete)",
              on_hold: "var(--hazard-deep)", cancelled: "var(--safety)",
            }[p.status] || "var(--concrete)";
            return (
              <div key={p.id} className="fbt-card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => setViewing(p)}>
                <div className="hazard-stripe-thin" style={{ height: 6 }} />
                <div style={{ padding: 18 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                    <Briefcase size={18} style={{ color: "var(--hazard-deep)", flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
                        <span className="chip" style={{ background: statusBg, color: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                          {p.status?.replace("_", " ").toUpperCase()}
                        </span>
                        {p.certifiedPayroll && <span className="chip" style={{ background: "var(--hazard)", fontSize: 9, padding: "2px 8px" }}>CERT PAYROLL</span>}
                      </div>
                      <div className="fbt-display" style={{ fontSize: 17, lineHeight: 1.15 }}>{p.name}</div>
                      {customer && <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 3 }}>for {customer.companyName}</div>}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)", lineHeight: 1.6, marginTop: 8 }}>
                    {p.contractNumber && <div>CONTRACT ▸ {p.contractNumber}</div>}
                    {p.poNumber && <div>PO ▸ {p.poNumber}</div>}
                    {p.location && <div style={{ display: "flex", gap: 4, alignItems: "flex-start" }}><MapPin size={11} style={{ marginTop: 2, flexShrink: 0 }} /> {p.location}</div>}
                  </div>

                  <div style={{ marginTop: 12, padding: 10, background: "#F5F5F4", borderRadius: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, textAlign: "center" }}>
                    <div>
                      <div className="fbt-display" style={{ fontSize: 16, lineHeight: 1 }}>{orders.length}</div>
                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>ORDERS</div>
                    </div>
                    <div>
                      <div className="fbt-display" style={{ fontSize: 16, lineHeight: 1 }}>{tons.toFixed(0)}</div>
                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>TONS</div>
                    </div>
                    <div>
                      <div className="fbt-display" style={{ fontSize: 16, lineHeight: 1, color: "var(--hazard-deep)" }}>{p.bidAmount ? fmt$(p.bidAmount).replace("$", "$").slice(0, 8) : "—"}</div>
                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>BID</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ========== MATERIALS TAB ==========
const MaterialsTab = ({ quarries, setQuarries, dispatches, onToast }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");
  const [showCompare, setShowCompare] = useState(false);

  const save = async (quarry) => {
    const exists = quarries.find((q) => q.id === quarry.id);
    const next = exists ? quarries.map((q) => q.id === quarry.id ? quarry : q) : [quarry, ...quarries];
    setQuarries(next);

  };

  const remove = async (id) => {
    const q = quarries.find((x) => x.id === id);
    if (!q) return;
    if (!confirm(`Delete quarry "${q.name}"? Linked dispatches will lose their quarry reference.`)) return;
    const next = quarries.filter((x) => x.id !== id);
    setQuarries(next);

    onToast("QUARRY DELETED");
    setViewing(null);
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return quarries
      .filter((q) => {
        if (!s) return true;
        const hay = `${q.name} ${q.address || ""} ${q.contactName || ""} ${q.notes || ""} ${(q.materials || []).map((m) => m.name).join(" ")}`.toLowerCase();
        return hay.includes(s);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [quarries, search]);

  const totalMaterials = quarries.reduce((s, q) => s + (q.materials?.length || 0), 0);
  const uniqueMaterials = new Set(quarries.flatMap((q) => q.materials.map((m) => m.name.toLowerCase()))).size;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {showModal && (
        <QuarryModal
          quarry={editing}
          onSave={save}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onToast={onToast}
        />
      )}
      {viewing && !showModal && (
        <QuarryDetailModal
          quarry={viewing}
          dispatches={dispatches}
          onEdit={() => { setEditing(viewing); setShowModal(true); }}
          onDelete={() => remove(viewing.id)}
          onClose={() => setViewing(null)}
        />
      )}
      {showCompare && (
        <ComparisonModal quarries={quarries} materialSearch={materialSearch} onClose={() => setShowCompare(false)} />
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{quarries.length}</div>
          <div className="stat-label">Quarries</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{totalMaterials}</div>
          <div className="stat-label">Material Listings</div>
        </div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--hazard)" }}>
          <div className="stat-num">{uniqueMaterials}</div>
          <div className="stat-label">Unique Materials</div>
        </div>
      </div>

      {/* Material search / comparison */}
      <div className="fbt-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <BarChart3 size={20} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 18, margin: 0 }}>COMPARE PRICES</h3>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Package size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
            <input
              className="fbt-input"
              style={{ paddingLeft: 38 }}
              placeholder="Find material (e.g. basalt, rock, sand…)"
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && materialSearch.trim() && setShowCompare(true)}
            />
          </div>
          <button onClick={() => setShowCompare(true)} className="btn-primary" disabled={!materialSearch.trim()}>
            <Search size={14} /> FIND CHEAPEST
          </button>
        </div>
        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 10, letterSpacing: "0.05em" }}>
          ▸ SEARCHES ACROSS ALL QUARRIES · RANKED BY CURRENT $/TON
        </div>
      </div>

      {/* Quarry list controls */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search quarries, location, material…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> NEW QUARRY
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <Mountain size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {search ? "NO MATCHES" : "NO QUARRIES YET — ADD YOUR FIRST SUPPLIER"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map((q) => (
            <div key={q.id} className="fbt-card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => setViewing(q)}>
              <div className="hazard-stripe-thin" style={{ height: 6 }} />
              <div style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Mountain size={20} style={{ color: "var(--hazard-deep)" }} />
                  <div className="fbt-display" style={{ fontSize: 18, lineHeight: 1.15, flex: 1 }}>{q.name}</div>
                </div>
                {q.address && <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10, display: "flex", alignItems: "flex-start", gap: 4 }}>
                  <MapPin size={11} style={{ flexShrink: 0, marginTop: 2 }} /> {q.address}
                </div>}

                {q.materials && q.materials.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--concrete)", paddingTop: 10 }}>
                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 6 }}>
                      {q.materials.length} MATERIAL{q.materials.length !== 1 ? "S" : ""}
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      {q.materials.slice(0, 4).map((m) => (
                        <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                          <span style={{ color: "var(--concrete)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 6 }}>{m.name}</span>
                          <strong style={{ color: "var(--hazard-deep)" }}>{fmt$(m.pricePerTon)}</strong>
                        </div>
                      ))}
                      {q.materials.length > 4 && (
                        <div style={{ fontSize: 11, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace" }}>+ {q.materials.length - 4} more</div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 12, display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                  {q.phone && (
                    <a href={`tel:${q.phone.replace(/[^\d+]/g, "")}`} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                      <Phone size={11} style={{ marginRight: 4 }} /> CALL
                    </a>
                  )}
                  {q.email && (
                    <a href={`mailto:${q.email}`} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                      <Mail size={11} style={{ marginRight: 4 }} /> EMAIL
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ========== REPORT HELPERS ==========
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const lastWeekRange = () => {
  const now = new Date();
  // Last week = Monday through Sunday, prior to this week
  const day = now.getDay(); // 0=Sun, 1=Mon
  const thisMon = new Date(now);
  thisMon.setDate(now.getDate() - ((day + 6) % 7));
  const lastMon = new Date(thisMon);
  lastMon.setDate(thisMon.getDate() - 7);
  const lastSun = new Date(lastMon);
  lastSun.setDate(lastMon.getDate() + 6);
  return { from: startOfDay(lastMon), to: endOfDay(lastSun) };
};
const thisWeekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const thisMon = new Date(now);
  thisMon.setDate(now.getDate() - ((day + 6) % 7));
  const thisSun = new Date(thisMon);
  thisSun.setDate(thisMon.getDate() + 6);
  return { from: startOfDay(thisMon), to: endOfDay(thisSun) };
};
const daysAgoRange = (days) => {
  const to = endOfDay(new Date());
  const from = startOfDay(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
  return { from, to };
};
const toISODate = (d) => d.toISOString().slice(0, 10);

// Core computation — returns a full report object
const computeReport = ({ from, to, dispatches, freightBills, logs, invoices, quotes, quarries }) => {
  const fromT = from.getTime();
  const toT = to.getTime();

  const inRange = (iso) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= fromT && t <= toT;
  };
  const inRangeDate = (ymd) => {
    if (!ymd) return false;
    const t = new Date(ymd + "T12:00:00").getTime();
    return t >= fromT && t <= toT;
  };

  // Dispatches opened in range
  const openedInRange = dispatches.filter((d) => inRange(d.createdAt) || inRangeDate(d.date));
  // Dispatches closed in range
  const closedInRange = dispatches.filter((d) => d.status === "closed" && inRange(d.updatedAt || d.createdAt));

  // Freight bills received in range
  const billsInRange = freightBills.filter((fb) => inRange(fb.submittedAt));

  // Total tonnage
  const totalTons = billsInRange.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);

  // Hours logs → revenue
  const logsInRange = logs.filter((l) => inRangeDate(l.date));
  const laborRevenue = logsInRange.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  // Top clients by tonnage (across all bills in range)
  const clientTons = {};
  billsInRange.forEach((fb) => {
    const d = dispatches.find((x) => x.id === fb.dispatchId);
    if (!d) return;
    const client = d.clientName || d.subContractor || "Internal / Unassigned";
    clientTons[client] = (clientTons[client] || 0) + (Number(fb.tonnage) || 0);
  });
  const topClients = Object.entries(clientTons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, tons]) => ({ name, tons }));

  // Top subs by dispatches opened
  const subCounts = {};
  openedInRange.forEach((d) => {
    if (d.subContractor) subCounts[d.subContractor] = (subCounts[d.subContractor] || 0) + 1;
  });
  const topSubs = Object.entries(subCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Quarry usage — total tons from each quarry
  const quarryTons = {};
  billsInRange.forEach((fb) => {
    const d = dispatches.find((x) => x.id === fb.dispatchId);
    if (!d || !d.quarryId) return;
    const q = quarries.find((qq) => qq.id === d.quarryId);
    const name = q?.name || "Unknown Quarry";
    quarryTons[name] = (quarryTons[name] || 0) + (Number(fb.tonnage) || 0);
  });
  const quarryUsage = Object.entries(quarryTons)
    .sort((a, b) => b[1] - a[1])
    .map(([name, tons]) => ({ name, tons }));

  // Quote requests
  const quotesInRange = quotes.filter((q) => inRange(q.submittedAt));

  // Invoices
  const invoicesInRange = invoices.filter((inv) => inRangeDate(inv.invoiceDate));
  const invoiceTotal = invoicesInRange.reduce((s, inv) => s + (Number(inv.total) || 0), 0);

  // Incomplete dispatches (opened or dated in range, but not all trucks accounted for)
  const incomplete = openedInRange.filter((d) => {
    const bills = freightBills.filter((fb) => fb.dispatchId === d.id);
    return d.status !== "closed" && bills.length < Number(d.trucksExpected || 0);
  }).map((d) => ({
    code: d.code,
    jobName: d.jobName,
    date: d.date,
    submitted: freightBills.filter((fb) => fb.dispatchId === d.id).length,
    expected: Number(d.trucksExpected || 0),
  }));

  return {
    from: toISODate(from),
    to: toISODate(to),
    generatedAt: new Date().toISOString(),
    openedCount: openedInRange.length,
    closedCount: closedInRange.length,
    billsCount: billsInRange.length,
    totalTons,
    logsCount: logsInRange.length,
    laborRevenue,
    topClients,
    topSubs,
    quarryUsage,
    quotesCount: quotesInRange.length,
    quotesList: quotesInRange.map((q) => ({ name: q.name, company: q.company, service: q.service, submittedAt: q.submittedAt })),
    invoicesCount: invoicesInRange.length,
    invoiceTotal,
    invoicesList: invoicesInRange.map((i) => ({ num: i.invoiceNumber, billTo: i.billToName, total: i.total, date: i.invoiceDate })),
    incomplete,
  };
};

// HTML report for print-to-PDF
const openReportPrintWindow = (report, company, onToast) => {
  const esc = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

  const rangeLabel = `${report.from} → ${report.to}`;
  const logoHtml = company?.logoDataUrl ? `<img src="${company.logoDataUrl}" class="logo" />` : "";

  const section = (title, bodyHtml) => `<div class="section"><h2>${esc(title)}</h2>${bodyHtml}</div>`;

  const metricsHtml = `
    <div class="metrics">
      <div class="metric"><div class="num">${report.openedCount}</div><div class="lbl">Opened</div></div>
      <div class="metric"><div class="num">${report.closedCount}</div><div class="lbl">Closed</div></div>
      <div class="metric"><div class="num">${report.billsCount}</div><div class="lbl">Freight Bills</div></div>
      <div class="metric"><div class="num">${report.totalTons.toFixed(1)}</div><div class="lbl">Total Tons</div></div>
      <div class="metric accent"><div class="num">${money(report.laborRevenue)}</div><div class="lbl">Labor Revenue</div></div>
      <div class="metric"><div class="num">${report.quotesCount}</div><div class="lbl">New Quotes</div></div>
      <div class="metric"><div class="num">${report.invoicesCount}</div><div class="lbl">Invoices</div></div>
      <div class="metric accent"><div class="num">${money(report.invoiceTotal)}</div><div class="lbl">Invoiced</div></div>
    </div>`;

  const listTable = (rows, cols) => rows.length === 0
    ? `<div class="empty">Nothing in this range.</div>`
    : `<table><thead><tr>${cols.map((c) => `<th${c.r ? ' class="r"' : ""}>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td${c.r ? ' class="r"' : ""}>${esc(c.fmt ? c.fmt(r[c.key]) : r[c.key])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Weekly Report ${rangeLabel}</title>
<style>
  @page { margin: 0.5in; size: letter; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px; font-family: -apple-system, Arial, sans-serif; color: #1C1917; font-size: 10.5pt; }
  .hazard-top { height: 8px; background: #F59E0B; margin: -20px -20px 0; }
  .steel-top { height: 2px; background: #1C1917; margin: 0 -20px 22px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 24px; }
  .logo { width: 60px; height: 60px; object-fit: contain; border: 2px solid #1C1917; background: #FFF; }
  h1 { font-size: 26pt; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 4px; }
  .subtitle { font-family: Menlo, Consolas, monospace; font-size: 10pt; color: #D97706; letter-spacing: 0.12em; margin-bottom: 8px; }
  .meta { font-family: Menlo, monospace; font-size: 9pt; color: #44403C; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 28px; }
  .metric { border: 2px solid #1C1917; padding: 10px 12px; background: #FAFAF9; }
  .metric.accent { background: #F59E0B; }
  .metric .num { font-size: 20pt; font-weight: 900; letter-spacing: -0.02em; line-height: 1; }
  .metric .lbl { font-family: Menlo, monospace; font-size: 8pt; color: #44403C; letter-spacing: 0.1em; margin-top: 4px; text-transform: uppercase; }
  .section { margin-bottom: 24px; page-break-inside: avoid; }
  h2 { font-size: 11pt; letter-spacing: 0.05em; margin: 0 0 10px; font-weight: 900; border-bottom: 2px solid #1C1917; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  table th { background: #1C1917; color: #F59E0B; text-align: left; padding: 6px 8px; font-size: 8pt; letter-spacing: 0.08em; font-weight: 700; }
  table th.r, table td.r { text-align: right; }
  table td { padding: 6px 8px; border-bottom: 1px solid #E7E5E4; }
  tbody tr:nth-child(odd) td { background: #FAFAF9; }
  .empty { font-family: Menlo, monospace; font-size: 9pt; color: #78716C; padding: 12px; text-align: center; background: #F5F5F4; border: 1px dashed #A8A29E; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 2px solid #1C1917; font-family: Menlo, monospace; font-size: 8pt; color: #44403C; letter-spacing: 0.08em; display: flex; justify-content: space-between; }
  .btn-print { position: fixed; top: 10px; right: 10px; padding: 12px 20px; background: #F59E0B; color: #1C1917; border: 3px solid #1C1917; font-weight: 900; cursor: pointer; font-size: 11pt; letter-spacing: 0.06em; box-shadow: 4px 4px 0 #1C1917; }
  .instructions { background: #FEF3C7; border: 2px solid #F59E0B; padding: 10px 14px; margin-bottom: 18px; font-size: 10pt; color: #44403C; }
  @media print { .btn-print, .instructions { display: none; } body { padding: 0; } }
</style></head>
<body>
<button class="btn-print" onclick="window.print()">🖨 PRINT / SAVE AS PDF</button>
<div class="instructions"><strong>📋 How to save as PDF:</strong> Tap PRINT. In the print dialog, change destination to <strong>"Save as PDF"</strong> (desktop) or <strong>"Save to Files"</strong> (mobile).</div>
<div class="hazard-top"></div>
<div class="steel-top"></div>
<div class="header">
  <div style="display:flex; gap:14px; align-items:flex-start;">
    ${logoHtml}
    <div>
      <div class="subtitle">▸ WEEKLY SUMMARY REPORT</div>
      <h1>${esc(company?.name || "4 Brothers Trucking, LLC").toUpperCase()}</h1>
      <div class="meta">${esc(rangeLabel)}  ·  GENERATED ${new Date(report.generatedAt).toLocaleString()}</div>
    </div>
  </div>
</div>
${metricsHtml}
${section("Top Clients by Tonnage", listTable(report.topClients, [{ key: "name", label: "Client" }, { key: "tons", label: "Tons", r: true, fmt: (v) => v.toFixed(2) }]))}
${section("Top Sub-Contractors by Dispatches", listTable(report.topSubs, [{ key: "name", label: "Sub-Contractor" }, { key: "count", label: "Dispatches", r: true }]))}
${section("Quarry Usage", listTable(report.quarryUsage, [{ key: "name", label: "Quarry" }, { key: "tons", label: "Tons Sourced", r: true, fmt: (v) => v.toFixed(2) }]))}
${section("New Quote Requests", listTable(report.quotesList, [{ key: "name", label: "Name" }, { key: "company", label: "Company" }, { key: "service", label: "Service" }, { key: "submittedAt", label: "Received", fmt: (v) => v ? new Date(v).toLocaleDateString() : "—" }]))}
${section("Invoices Generated", listTable(report.invoicesList, [{ key: "num", label: "Invoice #" }, { key: "billTo", label: "Bill To" }, { key: "date", label: "Date" }, { key: "total", label: "Total", r: true, fmt: (v) => money(v) }]))}
${section(`Incomplete Dispatches (${report.incomplete.length})`, report.incomplete.length === 0 ? `<div class="empty" style="color:#65A30D;">✓ All dispatches complete!</div>` : listTable(report.incomplete, [{ key: "code", label: "Code" }, { key: "jobName", label: "Job" }, { key: "date", label: "Date" }, { key: "submitted", label: "Submitted", r: true }, { key: "expected", label: "Expected", r: true }]))}
<div class="footer"><span>${esc(company?.name || "4 Brothers Trucking, LLC")}</span><span>WEEKLY REPORT · ${esc(rangeLabel)}</span></div>
</body></html>`;

  const w = window.open("", "_blank", "width=850,height=1100");
  if (!w) { onToast?.("ALLOW POPUPS TO GENERATE REPORT"); return; }
  w.document.write(html);
  w.document.close();
  onToast?.("REPORT OPENED — HIT PRINT TO SAVE");
};

const downloadReportCSV = (report) => {
  const lines = [];
  const push = (row) => lines.push(row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","));

  push(["Weekly Summary Report"]);
  push(["Date Range", `${report.from} to ${report.to}`]);
  push(["Generated", new Date(report.generatedAt).toLocaleString()]);
  push([]);
  push(["METRIC", "VALUE"]);
  push(["Dispatches Opened", report.openedCount]);
  push(["Dispatches Closed", report.closedCount]);
  push(["Freight Bills Received", report.billsCount]);
  push(["Total Tonnage", report.totalTons.toFixed(2)]);
  push(["Hours Logs", report.logsCount]);
  push(["Labor Revenue", report.laborRevenue.toFixed(2)]);
  push(["New Quote Requests", report.quotesCount]);
  push(["Invoices Generated", report.invoicesCount]);
  push(["Total Invoiced", report.invoiceTotal.toFixed(2)]);
  push(["Incomplete Dispatches", report.incomplete.length]);
  push([]);

  push(["TOP CLIENTS BY TONNAGE"]);
  push(["Client", "Tons"]);
  report.topClients.forEach((c) => push([c.name, c.tons.toFixed(2)]));
  push([]);

  push(["TOP SUB-CONTRACTORS"]);
  push(["Sub-Contractor", "Dispatches"]);
  report.topSubs.forEach((s) => push([s.name, s.count]));
  push([]);

  push(["QUARRY USAGE"]);
  push(["Quarry", "Tons Sourced"]);
  report.quarryUsage.forEach((q) => push([q.name, q.tons.toFixed(2)]));
  push([]);

  push(["QUOTE REQUESTS"]);
  push(["Name", "Company", "Service", "Received"]);
  report.quotesList.forEach((q) => push([q.name, q.company || "", q.service, q.submittedAt ? new Date(q.submittedAt).toLocaleDateString() : ""]));
  push([]);

  push(["INVOICES"]);
  push(["Invoice #", "Bill To", "Date", "Total"]);
  report.invoicesList.forEach((i) => push([i.num, i.billTo, i.date, Number(i.total).toFixed(2)]));
  push([]);

  push(["INCOMPLETE DISPATCHES"]);
  push(["Code", "Job", "Date", "Submitted", "Expected"]);
  report.incomplete.forEach((d) => push([d.code, d.jobName, d.date, d.submitted, d.expected]));

  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `4brothers-report-${report.from}-to-${report.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ========== REPORTS TAB ==========
// ========== FREIGHT BILL SEARCH PANEL ==========
const FBSearchPanel = ({ freightBills, dispatches, setDispatches, contacts, projects, editFreightBill, invoices = [], onToast, company }) => {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const customers = contacts.filter((c) => c.type === "customer");

  // Projects filtered by selected customer
  const availableProjects = useMemo(() => {
    if (!customerId) return projects;
    return projects.filter((p) => String(p.customerId) === String(customerId));
  }, [projects, customerId]);

  // If customer changes, reset project if it doesn't belong
  useEffect(() => {
    if (customerId && projectId) {
      const match = availableProjects.find((p) => String(p.id) === String(projectId));
      if (!match) setProjectId("");
    }
  }, [customerId, projectId, availableProjects]);

  const hasAnyFilter = search.trim() || fromDate || toDate || customerId || projectId || statusFilter !== "all";

  const results = useMemo(() => {
    if (!hasAnyFilter) return [];
    let list = freightBills.slice();

    // Status filter
    if (statusFilter !== "all") list = list.filter((fb) => (fb.status || "pending") === statusFilter);

    // Date range — on submitted_at
    if (fromDate) list = list.filter((fb) => (fb.submittedAt || "").slice(0, 10) >= fromDate);
    if (toDate) list = list.filter((fb) => (fb.submittedAt || "").slice(0, 10) <= toDate);

    // Customer / project filter — via the linked order
    if (customerId || projectId) {
      list = list.filter((fb) => {
        const d = dispatches.find((x) => x.id === fb.dispatchId);
        if (!d) return false;
        if (customerId && String(d.clientId) !== String(customerId)) return false;
        if (projectId && String(d.projectId) !== String(projectId)) return false;
        return true;
      });
    }

    // Text search — FB#, driver name, truck #, job name, order code
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((fb) => {
        const d = dispatches.find((x) => x.id === fb.dispatchId);
        const hay = `${fb.freightBillNumber || ""} ${fb.driverName || ""} ${fb.truckNumber || ""} ${fb.material || ""} ${fb.description || ""} ${fb.notes || ""} ${fb.adminNotes || ""} ${d?.jobName || ""} ${d?.code || ""} ${d?.clientName || ""}`.toLowerCase();
        return hay.includes(s);
      });
    }

    return list.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  }, [hasAnyFilter, freightBills, dispatches, search, fromDate, toDate, customerId, projectId, statusFilter]);

  const resetFilters = () => {
    setSearch(""); setFromDate(""); setToDate("");
    setCustomerId(""); setProjectId(""); setStatusFilter("all");
  };

  // Quick date presets
  const setPreset = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setFromDate(from.toISOString().slice(0, 10));
    setToDate(to.toISOString().slice(0, 10));
  };

  // CSV export
  const exportCSV = () => {
    if (results.length === 0) { onToast("NO RESULTS TO EXPORT"); return; }
    const rows = [
      ["FB #", "Submitted", "Status", "Driver", "Truck", "Material", "Tonnage", "Loads", "Hours", "Order #", "Job", "Customer", "Description"],
    ];
    results.forEach((fb) => {
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      const customer = contacts.find((c) => c.id === d?.clientId);
      rows.push([
        fb.freightBillNumber || "",
        fb.submittedAt ? new Date(fb.submittedAt).toLocaleString() : "",
        fb.status || "pending",
        fb.driverName || "",
        fb.truckNumber || "",
        fb.material || "",
        fb.tonnage || "",
        fb.loadCount || "",
        fb.hoursBilled || "",
        d?.code || "",
        d?.jobName || "",
        customer?.companyName || d?.clientName || "",
        fb.description || "",
      ]);
    });
    const csv = rows.map((r) => r.map((v) => {
      const s = String(v).replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fb-search-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`EXPORTED ${results.length} ROWS`);
  };

  // Print-to-PDF view (opens new window)
  const printReport = () => {
    if (results.length === 0) { onToast("NO RESULTS TO PRINT"); return; }
    const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const now = new Date().toLocaleString();
    const totalTons = results.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
    const totalHours = results.reduce((s, fb) => s + (Number(fb.hoursBilled) || 0), 0);
    const totalLoads = results.reduce((s, fb) => s + (Number(fb.loadCount) || 0), 0);

    const rows = results.map((fb) => {
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      const customer = contacts.find((c) => c.id === d?.clientId);
      const photos = (fb.photos || []).slice(0, 3).map((p) => `<img src="${p.dataUrl}" style="width:60px;height:60px;object-fit:cover;border:1px solid #ccc;margin-right:3px;" />`).join("");
      return `
        <tr>
          <td>${esc(fb.freightBillNumber)}</td>
          <td>${fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : ""}</td>
          <td>${esc(fb.status)}</td>
          <td>${esc(fb.driverName)}</td>
          <td>${esc(fb.truckNumber)}</td>
          <td>${esc(d?.code)}</td>
          <td>${esc(d?.jobName)}</td>
          <td>${esc(customer?.companyName || d?.clientName)}</td>
          <td style="text-align:right;">${fb.tonnage || ""}</td>
          <td style="text-align:right;">${fb.hoursBilled || ""}</td>
          <td>${photos}</td>
        </tr>
      `;
    }).join("");

    const html = `<!doctype html><html><head><title>Freight Bill Search Report</title>
      <style>
        body{font-family:Arial,sans-serif;margin:20px;color:#1C1917;}
        h1{font-size:18px;margin:0 0 6px;}
        .sub{color:#666;font-size:11px;margin-bottom:14px;}
        table{width:100%;border-collapse:collapse;font-size:11px;}
        th,td{border:1px solid #ccc;padding:5px 6px;text-align:left;vertical-align:top;}
        th{background:#1C1917;color:#FAFAF9;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;}
        tr:nth-child(even) td{background:#F5F5F4;}
        .totals{margin-top:12px;padding:10px;background:#FEF3C7;border:2px solid #F59E0B;font-size:12px;}
        .filters{margin-bottom:12px;padding:8px;background:#F5F5F4;font-size:11px;}
        @media print{body{margin:10px;} th{background:#333;}}
      </style></head><body>
      <h1>${esc(company?.name || "4 Brothers Trucking, LLC")} — Freight Bill Report</h1>
      <div class="sub">Generated ${now} · ${results.length} records</div>
      <div class="filters">
        <strong>Filters:</strong>
        ${search ? ` Search="${esc(search)}"` : ""}
        ${fromDate ? ` From=${esc(fromDate)}` : ""}
        ${toDate ? ` To=${esc(toDate)}` : ""}
        ${customerId ? ` Customer=${esc(customers.find(c => String(c.id) === String(customerId))?.companyName || "")}` : ""}
        ${projectId ? ` Project=${esc(projects.find(p => String(p.id) === String(projectId))?.name || "")}` : ""}
        ${statusFilter !== "all" ? ` Status=${esc(statusFilter)}` : ""}
      </div>
      <table>
        <thead>
          <tr><th>FB #</th><th>Date</th><th>Status</th><th>Driver</th><th>Truck</th><th>Order</th><th>Job</th><th>Customer</th><th>Tons</th><th>Hrs</th><th>Photos</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <strong>Totals:</strong> ${results.length} freight bills · ${totalTons.toFixed(2)} tons · ${totalHours.toFixed(2)} hours · ${totalLoads} loads
      </div>
      </body></html>`;
    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) { onToast("POP-UP BLOCKED"); return; }
    w.document.write(html);
    w.document.close();
    onToast("REPORT OPENED — PRINT OR SAVE AS PDF");
  };

  // Download FULL PACKET — one full page per FB with full-size photos
  const downloadPacket = () => {
    if (results.length === 0) { onToast("NO RESULTS"); return; }
    const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const now = new Date().toLocaleString();
    const totalTons = results.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
    const totalHours = results.reduce((s, fb) => s + (Number(fb.hoursBilled) || 0), 0);
    const totalLoads = results.reduce((s, fb) => s + (Number(fb.loadCount) || 0), 0);

    // Build filter summary
    const filterSummary = [];
    if (fromDate) filterSummary.push(`From ${fromDate}`);
    if (toDate) filterSummary.push(`To ${toDate}`);
    if (customerId) {
      const c = customers.find((x) => String(x.id) === String(customerId));
      if (c) filterSummary.push(`Customer: ${c.companyName}`);
    }
    if (projectId) {
      const p = projects.find((x) => String(x.id) === String(projectId));
      if (p) filterSummary.push(`Project: ${p.name}`);
    }
    if (search) filterSummary.push(`Search: "${search}"`);
    if (statusFilter !== "all") filterSummary.push(`Status: ${statusFilter}`);

    // Cover page
    const coverHtml = `
      <div class="page cover">
        <div class="letterhead">
          <h1>${esc(company?.name || "4 Brothers Trucking, LLC")}</h1>
          <div class="sub">${esc(company?.address || "Bay Point, CA")}${company?.phone ? ` · ${esc(company.phone)}` : ""}</div>
        </div>
        <h2>FREIGHT BILL PACKET</h2>
        <div class="meta">
          <div><strong>Generated:</strong> ${esc(now)}</div>
          <div><strong>Records:</strong> ${results.length} freight bill${results.length !== 1 ? "s" : ""}</div>
          ${filterSummary.length > 0 ? `<div><strong>Filters:</strong> ${esc(filterSummary.join(" · "))}</div>` : ""}
        </div>
        <div class="totals-box">
          <div class="totals-row"><span>Total Tons</span><strong>${totalTons.toFixed(2)}</strong></div>
          <div class="totals-row"><span>Total Loads</span><strong>${totalLoads}</strong></div>
          <div class="totals-row"><span>Total Hours</span><strong>${totalHours.toFixed(2)}</strong></div>
        </div>

        <h3>Index</h3>
        <table class="index">
          <thead><tr><th>#</th><th>FB #</th><th>Date</th><th>Driver · Truck</th><th>Order / Job</th><th>Customer</th><th>Tons</th><th>Hrs</th><th>Status</th></tr></thead>
          <tbody>
            ${results.map((fb, idx) => {
              const d = dispatches.find((x) => x.id === fb.dispatchId);
              const customer = contacts.find((c) => c.id === d?.clientId);
              return `<tr>
                <td>${idx + 1}</td>
                <td>${esc(fb.freightBillNumber) || "—"}</td>
                <td>${fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : ""}</td>
                <td>${esc(fb.driverName || "—")}${fb.truckNumber ? ` · T${esc(fb.truckNumber)}` : ""}</td>
                <td>${esc(d?.code || "")} — ${esc(d?.jobName || "")}</td>
                <td>${esc(customer?.companyName || d?.clientName || "")}</td>
                <td style="text-align:right;">${fb.tonnage || ""}</td>
                <td style="text-align:right;">${fb.hoursBilled || ""}</td>
                <td>${esc(fb.status || "pending")}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    // One page per FB with full-size photos
    const fbPages = results.map((fb, idx) => {
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      const customer = contacts.find((c) => c.id === d?.clientId);
      const project = projects.find((p) => p.id === d?.projectId);
      const photos = fb.photos || [];
      const hrsDisplay = fb.hoursBilled || (fb.pickupTime && fb.dropoffTime ? `${fb.pickupTime}→${fb.dropoffTime}` : "—");
      return `
        <div class="page fb-page">
          <div class="fb-header">
            <div class="fb-num">FREIGHT BILL #${esc(fb.freightBillNumber) || "—"}</div>
            <div class="fb-status status-${esc(fb.status || "pending")}">${esc((fb.status || "pending").toUpperCase())}</div>
            <div class="fb-seq">Page ${idx + 2} / ${results.length + 1}</div>
          </div>
          <div class="fb-grid">
            <div class="fb-field"><span>DATE</span><strong>${fb.submittedAt ? new Date(fb.submittedAt).toLocaleString() : "—"}</strong></div>
            <div class="fb-field"><span>DRIVER</span><strong>${esc(fb.driverName || "—")}</strong></div>
            <div class="fb-field"><span>TRUCK #</span><strong>${esc(fb.truckNumber || "—")}</strong></div>
            <div class="fb-field"><span>MATERIAL</span><strong>${esc(fb.material || "—")}</strong></div>
            <div class="fb-field"><span>TONNAGE</span><strong>${fb.tonnage ? `${fb.tonnage}T` : "—"}</strong></div>
            <div class="fb-field"><span>LOADS</span><strong>${fb.loadCount || 1}</strong></div>
            <div class="fb-field"><span>HOURS</span><strong>${esc(String(hrsDisplay))}</strong></div>
            <div class="fb-field"><span>PICKUP → DROPOFF</span><strong>${esc(fb.pickupTime || "—")} → ${esc(fb.dropoffTime || "—")}</strong></div>
            <div class="fb-field wide"><span>ORDER</span><strong>#${esc(d?.code || "—")} — ${esc(d?.jobName || "—")}</strong></div>
            <div class="fb-field wide"><span>CUSTOMER</span><strong>${esc(customer?.companyName || d?.clientName || "—")}</strong></div>
            ${project ? `<div class="fb-field wide"><span>PROJECT</span><strong>${esc(project.name)}${project.contractNumber ? ` (${esc(project.contractNumber)})` : ""}</strong></div>` : ""}
            ${d?.pickup ? `<div class="fb-field wide"><span>PICKUP LOC</span><strong>${esc(d.pickup)}</strong></div>` : ""}
            ${d?.dropoff ? `<div class="fb-field wide"><span>DROPOFF LOC</span><strong>${esc(d.dropoff)}</strong></div>` : ""}
          </div>
          ${fb.description ? `<div class="fb-desc"><div class="label">DESCRIPTION</div>${esc(fb.description)}</div>` : ""}
          ${fb.notes ? `<div class="fb-desc"><div class="label">DRIVER NOTES</div>${esc(fb.notes)}</div>` : ""}
          ${fb.adminNotes ? `<div class="fb-desc admin"><div class="label">ADMIN NOTES</div>${esc(fb.adminNotes)}</div>` : ""}
          ${photos.length > 0 ? `
            <div class="fb-photos-header">SCALE TICKETS (${photos.length})</div>
            <div class="fb-photos">
              ${photos.map((p, pidx) => `
                <div class="photo-wrap">
                  <img src="${p.dataUrl}" alt="Scale ticket ${pidx + 1}" />
                  <div class="photo-caption">Ticket ${pidx + 1} of ${photos.length}</div>
                </div>
              `).join("")}
            </div>
          ` : '<div class="no-photos">No scale tickets attached</div>'}
          <div class="fb-footer">
            ${esc(company?.name || "4 Brothers Trucking, LLC")} · FB #${esc(fb.freightBillNumber) || "—"} · ${fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : ""}
          </div>
        </div>
      `;
    }).join("");

    const html = `<!doctype html><html><head><title>FB Packet — ${esc(now)}</title>
      <style>
        @page { size: letter; margin: 0.5in; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #1C1917; }
        .page { page-break-after: always; padding: 0; }
        .page:last-child { page-break-after: auto; }

        /* Cover */
        .cover { padding: 20px 0; }
        .letterhead { border-bottom: 3px solid #F59E0B; padding-bottom: 10px; margin-bottom: 20px; }
        .letterhead h1 { font-size: 22px; margin: 0; letter-spacing: 0.02em; }
        .letterhead .sub { font-size: 11px; color: #666; margin-top: 4px; }
        .cover h2 { font-size: 28px; margin: 0 0 14px; color: #1C1917; letter-spacing: 0.05em; }
        .meta { font-size: 12px; line-height: 1.7; padding: 10px 14px; background: #F5F5F4; margin-bottom: 14px; }
        .totals-box { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .totals-row { padding: 12px; background: #FEF3C7; border: 2px solid #F59E0B; text-align: center; font-size: 11px; text-transform: uppercase; }
        .totals-row strong { display: block; font-size: 22px; color: #1C1917; margin-top: 4px; }
        .cover h3 { font-size: 14px; margin: 10px 0; border-bottom: 2px solid #1C1917; padding-bottom: 4px; }
        .index { width: 100%; border-collapse: collapse; font-size: 10px; }
        .index th, .index td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
        .index th { background: #1C1917; color: #FAFAF9; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
        .index tr:nth-child(even) td { background: #F5F5F4; }

        /* FB page */
        .fb-page { display: flex; flex-direction: column; min-height: 10in; }
        .fb-header { border-bottom: 3px solid #F59E0B; padding-bottom: 8px; margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }
        .fb-num { font-size: 20px; font-weight: 700; letter-spacing: 0.02em; flex: 1; }
        .fb-status { padding: 4px 10px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; border: 2px solid #1C1917; }
        .fb-status.status-approved { background: #16A34A; color: #FFF; border-color: #16A34A; }
        .fb-status.status-pending { background: #F59E0B; color: #1C1917; }
        .fb-status.status-rejected { background: #DC2626; color: #FFF; border-color: #DC2626; }
        .fb-seq { font-size: 10px; color: #999; }
        .fb-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 14px; }
        .fb-field { padding: 6px 10px; background: #F5F5F4; border-left: 3px solid #1C1917; }
        .fb-field.wide { grid-column: 1 / -1; }
        .fb-field span { display: block; font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
        .fb-field strong { font-size: 12px; display: block; margin-top: 2px; }
        .fb-desc { padding: 10px 12px; background: #FEF3C7; border-left: 3px solid #F59E0B; margin-bottom: 10px; font-size: 12px; white-space: pre-wrap; }
        .fb-desc.admin { background: #FFEDD5; border-color: #EA580C; }
        .fb-desc .label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
        .fb-photos-header { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 14px 0 8px; border-bottom: 2px solid #1C1917; padding-bottom: 4px; }
        .fb-photos { display: flex; flex-direction: column; gap: 10px; }
        .photo-wrap { page-break-inside: avoid; border: 2px solid #1C1917; padding: 4px; background: #FFF; }
        .photo-wrap img { width: 100%; max-height: 7in; object-fit: contain; display: block; }
        .photo-caption { font-size: 10px; color: #666; text-align: center; padding: 4px; background: #F5F5F4; }
        .no-photos { padding: 20px; text-align: center; background: #F5F5F4; color: #999; font-size: 12px; border: 2px dashed #ccc; }
        .fb-footer { margin-top: auto; padding-top: 10px; border-top: 1px solid #ccc; font-size: 9px; color: #999; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; }

        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .fb-header { border-bottom-color: #F59E0B !important; }
        }
        .print-btn { position: fixed; top: 10px; right: 10px; padding: 10px 20px; background: #F59E0B; color: #1C1917; border: 3px solid #1C1917; font-weight: 700; cursor: pointer; z-index: 100; font-size: 14px; }
        @media print { .print-btn { display: none; } }
      </style></head><body>
      <button class="print-btn" onclick="window.print()">🖨 PRINT / SAVE AS PDF</button>
      ${coverHtml}
      ${fbPages}
      </body></html>`;

    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) { onToast("POP-UP BLOCKED — ALLOW POPUPS & RETRY"); return; }
    w.document.write(html);
    w.document.close();
    onToast(`PACKET OPENED — ${results.length} FB${results.length !== 1 ? "S" : ""} · HIT PRINT TO SAVE PDF`);
  };

  return (
    <div className="fbt-card" style={{ padding: 0, overflow: "hidden" }}>
      {editing && (
        <FBEditModal
          fb={editing}
          dispatches={dispatches}
          setDispatches={setDispatches}
          contacts={contacts}
          projects={projects}
          freightBills={freightBills}
          editFreightBill={editFreightBill}
          invoices={invoices}
          onClose={() => setEditing(null)}
          onToast={onToast}
          currentUser="admin"
        />
      )}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "zoom-out" }}>
          <img src={lightbox} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} alt="" />
        </div>
      )}

      {/* Header */}
      <div
        style={{
          padding: "14px 20px", background: "var(--steel)", color: "var(--cream)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Search size={18} />
          <div>
            <div className="fbt-display" style={{ fontSize: 16, lineHeight: 1 }}>SEARCH FREIGHT BILLS</div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", marginTop: 2, letterSpacing: "0.1em" }}>
              ▸ BY FB# · DATE · CUSTOMER · PROJECT · STATUS — WITH PHOTOS
            </div>
          </div>
        </div>
        <ChevronDown size={18} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </div>

      {expanded && (
        <div style={{ padding: 20 }}>
          {/* Filters */}
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
              <input
                className="fbt-input"
                style={{ paddingLeft: 38 }}
                placeholder="Search FB#, driver, truck, job name, order code, description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <div>
                <label className="fbt-label">From</label>
                <input className="fbt-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="fbt-label">To</label>
                <input className="fbt-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div>
                <label className="fbt-label">Customer</label>
                <select className="fbt-select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">— All —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="fbt-label">Project</label>
                <select className="fbt-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">— All —</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="fbt-label">Status</label>
                <select className="fbt-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Quick presets */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>QUICK:</span>
              <button onClick={() => setPreset(7)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>LAST 7D</button>
              <button onClick={() => setPreset(14)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>LAST 14D</button>
              <button onClick={() => setPreset(30)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>LAST 30D</button>
              <button onClick={() => setPreset(90)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>LAST 90D</button>
              {hasAnyFilter && (
                <button onClick={resetFilters} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10, marginLeft: "auto", color: "var(--safety)" }}>
                  <X size={11} style={{ marginRight: 3 }} /> CLEAR ALL
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {!hasAnyFilter ? (
            <div style={{ marginTop: 20, padding: 32, textAlign: "center", background: "#F5F5F4", border: "2px dashed var(--concrete)" }}>
              <Search size={32} style={{ opacity: 0.4, marginBottom: 8, color: "var(--concrete)" }} />
              <div className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)" }}>
                ENTER A SEARCH TERM OR PICK A FILTER TO SEE RESULTS
              </div>
            </div>
          ) : (
            <>
              {/* Result summary + exports */}
              <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "10px 14px", background: "var(--hazard)", color: "var(--steel)" }}>
                <div className="fbt-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                  ▸ {results.length} FREIGHT BILL{results.length !== 1 ? "S" : ""}
                  {results.length > 0 && ` · ${results.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0).toFixed(1)}T · ${results.reduce((s, fb) => s + (Number(fb.hoursBilled) || 0), 0).toFixed(1)}HRS`}
                </div>
                {results.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={exportCSV} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10, background: "var(--steel)", color: "var(--cream)", borderColor: "var(--steel)" }}>
                      <Download size={11} style={{ marginRight: 3 }} /> CSV
                    </button>
                    <button onClick={printReport} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10, background: "var(--steel)", color: "var(--cream)", borderColor: "var(--steel)" }}>
                      <Printer size={11} style={{ marginRight: 3 }} /> SUMMARY PDF
                    </button>
                    <button onClick={downloadPacket} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 10, background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }} title="Full packet: one page per FB with full-size scale tickets">
                      <FileDown size={11} style={{ marginRight: 3 }} /> FULL PACKET PDF
                    </button>
                  </div>
                )}
              </div>

              {results.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--concrete)", background: "#F5F5F4" }}>
                  <div className="fbt-mono" style={{ fontSize: 12 }}>NO FREIGHT BILLS MATCH YOUR FILTERS</div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {results.map((fb) => {
                    const d = dispatches.find((x) => x.id === fb.dispatchId);
                    const customer = contacts.find((c) => c.id === d?.clientId);
                    const status = fb.status || "pending";
                    const statusBg = status === "approved" ? "var(--good)" : status === "rejected" ? "var(--safety)" : "var(--hazard)";
                    const photos = fb.photos || [];
                    return (
                      <div
                        key={fb.id}
                        style={{
                          padding: 12, border: "1.5px solid var(--steel)", background: "#FFF",
                          borderLeft: `4px solid ${statusBg}`,
                          display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{ flex: 1, minWidth: 200, cursor: "pointer" }}
                          onClick={() => setEditing(fb)}
                        >
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                            <span className="chip" style={{ background: statusBg, color: "#FFF", fontSize: 9, padding: "2px 7px" }}>
                              {status.toUpperCase()}
                            </span>
                            <span className="chip" style={{ background: "var(--hazard)", fontSize: 9, padding: "2px 7px" }}>
                              FB #{fb.freightBillNumber || "—"}
                            </span>
                            {d && <span className="chip" style={{ background: "#FFF", fontSize: 9, padding: "2px 7px" }}>ORDER #{d.code}</span>}
                            <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
                              {fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                          <div className="fbt-display" style={{ fontSize: 14, lineHeight: 1.2 }}>
                            {fb.driverName || "—"} · Truck {fb.truckNumber || "—"}
                          </div>
                          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 3 }}>
                            {d?.jobName || ""}
                            {customer && ` · ${customer.companyName}`}
                          </div>
                          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--steel)", marginTop: 3, fontWeight: 700 }}>
                            {fb.tonnage ? `${fb.tonnage}T` : ""}
                            {fb.loadCount ? ` · ${fb.loadCount} LOAD${fb.loadCount !== 1 ? "S" : ""}` : ""}
                            {fb.hoursBilled ? ` · ${fb.hoursBilled}HRS` : fb.pickupTime && fb.dropoffTime ? ` · ${fb.pickupTime}→${fb.dropoffTime}` : ""}
                            {fb.material ? ` · ${fb.material}` : ""}
                          </div>
                          {fb.description && (
                            <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 4, fontStyle: "italic" }}>"{fb.description}"</div>
                          )}
                        </div>

                        {/* Photo thumbnails */}
                        {photos.length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                            {photos.slice(0, 4).map((p, idx) => (
                              <img
                                key={p.id || idx}
                                src={p.dataUrl}
                                alt=""
                                style={{ width: 56, height: 56, objectFit: "cover", border: "1px solid var(--steel)", cursor: "pointer" }}
                                onClick={(e) => { e.stopPropagation(); setLightbox(p.dataUrl); }}
                              />
                            ))}
                            {photos.length > 4 && (
                              <div
                                style={{
                                  width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center",
                                  background: "var(--steel)", color: "var(--cream)", fontSize: 12, fontWeight: 700,
                                  cursor: "pointer", fontFamily: "JetBrains Mono, monospace",
                                }}
                                onClick={() => setEditing(fb)}
                                title="Open to see all photos"
                              >
                                +{photos.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ========== REPORTS TAB ==========
// ========== FB ARCHIVE PDF (Reports tab) ==========
// Generate a PDF where each FB is one page with a compact metadata strip at top,
// and each scale ticket photo becomes its own linked page (with the same metadata strip).
// Filters: customer, project, date range, status (checkbox group).
// Include fields: user picks which fields appear in the metadata strip (localStorage persisted).

const FB_ARCHIVE_FIELD_DEFAULTS = {
  date: true, fbNumber: true, loads: true, tons: true,
  startTime: true, endTime: true, hours: false,
  driver: true, truck: true, description: true, notes: true,
  customer: false, pickup: false, dropoff: false,
};
const FB_ARCHIVE_STATUS_DEFAULTS = { pending: false, approved: true, invoiced: true, paid: true };
const FB_ARCHIVE_LS_KEY = "fbt:fbArchivePrefs";

// ========== CAPABILITY STATEMENT PDF (v22 Session V) ==========
// Generates a 1-page PDF suitable for emailing to contracting officers, primes,
// and government agencies. Opens in new window for print-to-PDF.
//
// Data source: `company` settings + publicly-flagged projects.
// If a company field is missing, the section either omits gracefully or shows
// a placeholder note.
const generateCapabilityStatementPDF = ({ company, publicProjects = [], testimonials = [] }) => {
  const esc = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));

  // Safe accessors — all optional. Anything missing just gets omitted from the doc.
  const c = company || {};
  const name = c.name || "4 Brothers Trucking, LLC";
  const tagline = c.tagline || "Bay Area Dump Truck Hauling · DBE · MBE · SB-PW Certified";
  const address = c.address || "Bay Point, CA 94565";
  const phone = c.phone || "";
  const email = c.email || "";
  const website = c.website || "4brotherstruck.com";
  const ein = c.ein || "";
  const uei = c.uei || "";
  const cage = c.cage || "";
  const duns = c.duns || "";
  const usdot = c.usdot || "";
  const mcNumber = c.mcNumber || "";
  const caMcp = c.caMcp || "";
  const naicsCodes = c.naicsCodes || "484220, 484230, 237310";  // Specialized freight trucking + highway/street construction
  const bondingCapacity = c.bondingCapacity || "";
  const yearFounded = c.yearFounded || "";
  const employeeCount = c.employeeCount || "";
  const insuranceCarrier = c.insuranceCarrier || "";
  const competencies = c.competencies || [
    "Construction material hauling (aggregate, dirt, asphalt, base rock)",
    "Public works / prevailing wage project support",
    "Certified payroll reporting & compliance documentation",
    "Transfer truck & super-10 dump truck fleet operations",
    "Bay Area & Central Valley delivery coverage",
    "Fuel surcharge tracking tied to DOE/EIA California diesel index",
  ];
  const differentiators = c.differentiators || [
    "DBE, MBE, and SB-PW certified — helps primes hit participation goals",
    "Family-run with responsive dispatch — you call, a human answers",
    "Clean paperwork: digital freight bills with scale tickets attached",
    "USDOT registered, CA Motor Carrier Permit, fully insured & bonded",
  ];

  // SVG logo (reuse the one from other PDFs for consistency)
  const logoSvg = `<svg viewBox="0 0 120 120" width="88" height="88" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" fill="#FFF" stroke="#1C1917" stroke-width="3"/>
    <circle cx="60" cy="60" r="48" fill="none" stroke="#1C1917" stroke-width="1"/>
    <path d="M 10 56 L 110 56 L 110 74 L 10 74 Z" fill="#1C1917"/>
    <path d="M 2 58 L 10 56 L 10 74 L 2 76 Z" fill="#1C1917"/>
    <path d="M 118 58 L 110 56 L 110 74 L 118 76 Z" fill="#1C1917"/>
    <text x="60" y="69" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="10" font-weight="900" fill="#FFF" letter-spacing="0.5">4 BROTHERS</text>
    <text x="60" y="38" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="22" font-weight="900" fill="#1C1917" letter-spacing="-1">4B</text>
    <path d="M 22 44 Q 60 32 98 44" fill="none" stroke="#1C1917" stroke-width="1.2"/>
    <text x="60" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" font-weight="700" fill="#1C1917" letter-spacing="1">TRUCKING, LLC</text>
  </svg>`;

  // Past performance — up to 6 public projects, sorted by completionYear desc
  const projectList = (publicProjects || [])
    .slice()
    .sort((a, b) => (b.completionYear || 0) - (a.completionYear || 0))
    .slice(0, 6);

  // Pick a featured testimonial (if any public ones exist)
  const featuredTestimonial = (testimonials || []).find((t) => t.showOnWebsite);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Capability Statement — ${esc(name)}</title>
<style>
  @page { size: letter; margin: 0.5in; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #1C1917; font-size: 10pt; line-height: 1.35; }
  .page { max-width: 7.5in; margin: 0 auto; padding: 0; }

  /* Header */
  .hdr { display: flex; gap: 16px; align-items: flex-start; padding-bottom: 14px; border-bottom: 3px solid #1C1917; margin-bottom: 14px; }
  .hdr .logo { flex-shrink: 0; }
  .hdr .txt { flex: 1; min-width: 0; }
  .hdr .name { font-size: 22pt; font-weight: 900; letter-spacing: -0.02em; line-height: 1; margin: 4px 0 6px; color: #1C1917; }
  .hdr .tagline { font-size: 10.5pt; color: #44403C; margin-bottom: 10px; font-weight: 600; }
  .hdr .contact { display: flex; gap: 14px; flex-wrap: wrap; font-size: 9pt; color: #292524; }
  .hdr .contact span { white-space: nowrap; }
  .hdr .contact strong { color: #1C1917; }

  /* Cert ribbon */
  .certs { background: #1C1917; color: #F59E0B; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 9pt; font-weight: 700; letter-spacing: 0.1em; }
  .certs .cert-item { padding: 0 8px; border-right: 1px solid #44403C; }
  .certs .cert-item:last-child { border-right: none; }

  /* Section */
  .sec { margin-bottom: 14px; }
  .sec-title { font-size: 10pt; font-weight: 900; letter-spacing: 0.12em; color: #F59E0B; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1.5px solid #1C1917; text-transform: uppercase; }
  .sec-body { font-size: 9.5pt; color: #1C1917; }
  .sec-body ul { margin: 0; padding-left: 18px; list-style-type: disc; }
  .sec-body li { margin-bottom: 3px; line-height: 1.4; }

  /* Two-column layout for competencies + differentiators */
  .two-col { display: flex; gap: 20px; margin-bottom: 14px; }
  .two-col .col { flex: 1; }

  /* Past Performance table */
  .perf { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .perf th { background: #1C1917; color: #F59E0B; text-align: left; padding: 5px 7px; font-size: 8.5pt; letter-spacing: 0.08em; font-weight: 700; }
  .perf td { padding: 5px 7px; border-bottom: 1px solid #E7E5E4; }
  .perf tr:nth-child(even) td { background: #FAFAF9; }

  /* Company data grid */
  .cd { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 16px; font-size: 9pt; }
  .cd .label { color: #78716C; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.08em; font-weight: 700; }
  .cd .val { color: #1C1917; font-weight: 600; margin-bottom: 5px; word-break: break-word; }
  .cd .val.empty { color: #A8A29E; font-weight: 400; font-style: italic; }

  /* Quote */
  .quote-box { background: #FAFAF9; border-left: 4px solid #F59E0B; padding: 10px 14px; margin: 10px 0; font-size: 9.5pt; font-style: italic; color: #292524; }
  .quote-box .attrib { font-style: normal; font-weight: 700; color: #1C1917; font-size: 8.5pt; margin-top: 6px; letter-spacing: 0.05em; }

  /* Footer */
  .foot { margin-top: 18px; padding-top: 10px; border-top: 2px solid #1C1917; font-size: 8pt; color: #78716C; text-align: center; letter-spacing: 0.05em; }
  .foot strong { color: #1C1917; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="hdr">
      <div class="logo">${logoSvg}</div>
      <div class="txt">
        <div style="font-size: 8pt; color: #78716C; letter-spacing: 0.18em; font-weight: 700; margin-bottom: 2px;">CAPABILITY STATEMENT</div>
        <div class="name">${esc(name).toUpperCase()}</div>
        <div class="tagline">${esc(tagline)}</div>
        <div class="contact">
          ${address ? `<span><strong>📍</strong> ${esc(address)}</span>` : ""}
          ${phone ? `<span><strong>📞</strong> ${esc(phone)}</span>` : ""}
          ${email ? `<span><strong>✉</strong> ${esc(email)}</span>` : ""}
          ${website ? `<span><strong>🌐</strong> ${esc(website)}</span>` : ""}
        </div>
      </div>
    </div>

    <!-- Cert ribbon -->
    <div class="certs">
      <span class="cert-item">DBE CERTIFIED</span>
      <span class="cert-item">MBE CERTIFIED</span>
      <span class="cert-item">SB-PW CERTIFIED</span>
      ${usdot ? `<span class="cert-item">USDOT ${esc(usdot)}</span>` : `<span class="cert-item">USDOT REGISTERED</span>`}
      <span class="cert-item">CA MCP</span>
    </div>

    <!-- Core Competencies + Differentiators (side by side) -->
    <div class="two-col">
      <div class="col">
        <div class="sec">
          <div class="sec-title">▸ CORE COMPETENCIES</div>
          <div class="sec-body">
            <ul>
              ${competencies.map((item) => `<li>${esc(item)}</li>`).join("")}
            </ul>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="sec">
          <div class="sec-title">▸ DIFFERENTIATORS</div>
          <div class="sec-body">
            <ul>
              ${differentiators.map((item) => `<li>${esc(item)}</li>`).join("")}
            </ul>
          </div>
        </div>
      </div>
    </div>

    ${featuredTestimonial ? `
    <!-- Featured testimonial -->
    <div class="quote-box">
      "${esc(featuredTestimonial.quoteText)}"
      <div class="attrib">
        — ${esc(featuredTestimonial.authorName)}${featuredTestimonial.authorRole ? `, ${esc(featuredTestimonial.authorRole)}` : ""}${featuredTestimonial.authorCompany ? `, ${esc(featuredTestimonial.authorCompany)}` : ""}
      </div>
    </div>
    ` : ""}

    <!-- Past Performance -->
    ${projectList.length > 0 ? `
    <div class="sec">
      <div class="sec-title">▸ PAST PERFORMANCE</div>
      <table class="perf">
        <thead>
          <tr>
            <th style="width: 50%">Project</th>
            <th style="width: 35%">Agency / Prime</th>
            <th style="width: 15%; text-align: right;">Year</th>
          </tr>
        </thead>
        <tbody>
          ${projectList.map((p) => `
          <tr>
            <td>${esc(p.name || "—")}</td>
            <td>${esc(p.publicCustomer || "—")}</td>
            <td style="text-align: right;">${p.completionYear || "—"}</td>
          </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ` : `
    <div class="sec">
      <div class="sec-title">▸ PAST PERFORMANCE</div>
      <div class="sec-body" style="color: #78716C; font-style: italic; font-size: 9pt;">
        Available upon request. Contact us for project references.
      </div>
    </div>
    `}

    <!-- Company Data -->
    <div class="sec">
      <div class="sec-title">▸ COMPANY DATA</div>
      <div class="cd">
        ${yearFounded ? `<div><div class="label">Year Founded</div><div class="val">${esc(yearFounded)}</div></div>` : ""}
        ${employeeCount ? `<div><div class="label">Employees</div><div class="val">${esc(employeeCount)}</div></div>` : ""}
        ${ein ? `<div><div class="label">EIN</div><div class="val">${esc(ein)}</div></div>` : ""}
        ${uei ? `<div><div class="label">UEI (SAM.gov)</div><div class="val">${esc(uei)}</div></div>` : `<div><div class="label">UEI (SAM.gov)</div><div class="val empty">on file</div></div>`}
        ${cage ? `<div><div class="label">CAGE Code</div><div class="val">${esc(cage)}</div></div>` : ""}
        ${duns ? `<div><div class="label">DUNS</div><div class="val">${esc(duns)}</div></div>` : ""}
        ${usdot ? `<div><div class="label">USDOT</div><div class="val">${esc(usdot)}</div></div>` : ""}
        ${mcNumber ? `<div><div class="label">MC Number</div><div class="val">${esc(mcNumber)}</div></div>` : ""}
        ${caMcp ? `<div><div class="label">CA MCP</div><div class="val">${esc(caMcp)}</div></div>` : ""}
        ${naicsCodes ? `<div><div class="label">NAICS Codes</div><div class="val">${esc(naicsCodes)}</div></div>` : ""}
        ${bondingCapacity ? `<div><div class="label">Bonding Capacity</div><div class="val">${esc(bondingCapacity)}</div></div>` : ""}
        ${insuranceCarrier ? `<div><div class="label">Insurance</div><div class="val">${esc(insuranceCarrier)}</div></div>` : ""}
      </div>
    </div>

    <!-- Footer -->
    <div class="foot">
      <strong>${esc(name).toUpperCase()}</strong> · ${esc(address)} · ${esc(phone)} · ${esc(email)}<br>
      Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · ${esc(website)}
    </div>

  </div>
  <script>
    // Auto-open print dialog after layout settles
    window.onload = function() { setTimeout(function(){ window.print(); }, 350); };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Popup blocked. Please allow popups and try again.");
  }
  win.document.write(html);
  win.document.close();
};

const generateFBArchivePDF = async ({ fbs, dispatches, contacts, projects, company, fieldsInclude }) => {
  const esc = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  // Build metadata strip HTML for one FB — compact, ~40-60px tall, readable
  const stripHtml = (fb) => {
    const d = dispatches.find((x) => x.id === fb.dispatchId);
    const proj = projects.find((p) => p.id === d?.projectId);
    const customer = contacts.find((c) => c.id === d?.clientId);
    const hoursCalc = (() => {
      if (fb.pickupTime && fb.dropoffTime) {
        const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
        const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
        if (!isNaN(h1) && !isNaN(h2)) {
          const mins = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
          return mins > 0 ? (mins / 60).toFixed(2) : "";
        }
      }
      return fb.hoursBilled != null ? String(fb.hoursBilled) : "";
    })();

    const parts = [];
    // Row 1 — always shows core identifiers for linking to the FB
    if (fieldsInclude.date) parts.push(`<span class="kv"><b>DATE</b> ${esc(fmtDate(fb.submittedAt))}</span>`);
    if (fieldsInclude.fbNumber) parts.push(`<span class="kv"><b>FB #</b> ${esc(fb.freightBillNumber || "—")}</span>`);
    if (fieldsInclude.customer) parts.push(`<span class="kv"><b>CUSTOMER</b> ${esc(customer?.companyName || customer?.contactName || d?.clientName || "—")}</span>`);
    if (d?.code) parts.push(`<span class="kv"><b>ORDER</b> #${esc(d.code)}</span>`);
    if (proj?.name) parts.push(`<span class="kv"><b>PROJECT</b> ${esc(proj.name)}</span>`);
    if (fieldsInclude.driver) parts.push(`<span class="kv"><b>DRIVER</b> ${esc(fb.driverName || "—")}</span>`);
    if (fieldsInclude.truck) parts.push(`<span class="kv"><b>TRUCK</b> ${esc(fb.truckNumber || "—")}</span>`);
    if (fieldsInclude.startTime) parts.push(`<span class="kv"><b>IN</b> ${esc(fb.pickupTime || "—")}</span>`);
    if (fieldsInclude.endTime) parts.push(`<span class="kv"><b>OUT</b> ${esc(fb.dropoffTime || "—")}</span>`);
    if (fieldsInclude.hours && hoursCalc) parts.push(`<span class="kv"><b>HRS</b> ${esc(hoursCalc)}</span>`);
    if (fieldsInclude.tons && fb.tonnage) parts.push(`<span class="kv"><b>TONS</b> ${esc(String(fb.tonnage))}</span>`);
    if (fieldsInclude.loads && fb.loadCount) parts.push(`<span class="kv"><b>LOADS</b> ${esc(String(fb.loadCount))}</span>`);
    if (fieldsInclude.pickup && d?.pickup) parts.push(`<span class="kv"><b>FROM</b> ${esc(d.pickup)}</span>`);
    if (fieldsInclude.dropoff && d?.dropoff) parts.push(`<span class="kv"><b>TO</b> ${esc(d.dropoff)}</span>`);

    const description = fieldsInclude.description && (fb.description || fb.material)
      ? `<div class="desc"><b>DESCRIPTION:</b> ${esc(fb.description || fb.material || "")}</div>` : "";
    const notes = fieldsInclude.notes && fb.notes
      ? `<div class="notes"><b>NOTES:</b> ${esc(fb.notes)}</div>` : "";

    return `<div class="strip">
      <div class="kv-row">${parts.join("")}</div>
      ${description}
      ${notes}
    </div>`;
  };

  // Build pages. For each FB:
  //   1. A "summary page" = big strip + list of photo count
  //   2. One "photo page" per scale ticket photo (same strip + large image)
  const pagesHtml = fbs.map((fb) => {
    const photos = fb.photos || [];
    const summary = `
      <div class="page">
        ${stripHtml(fb)}
        <div class="photo-count">${photos.length} scale ticket${photos.length !== 1 ? "s" : ""} attached</div>
      </div>
    `;
    const photoPages = photos.map((p, i) => `
      <div class="page">
        ${stripHtml(fb)}
        <div class="photo-wrap">
          <img src="${p.dataUrl || p.url || ""}" alt="Scale ticket ${i + 1}" />
          <div class="photo-label">TICKET ${i + 1} OF ${photos.length}</div>
        </div>
      </div>
    `).join("");
    return summary + photoPages;
  }).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>FB Archive — ${esc(company?.name || "4 Brothers Trucking")}</title>
<style>
  @page { margin: 0.35in; size: letter; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 10px; font-family: -apple-system, Arial, sans-serif; color: #1C1917; font-size: 10pt; }
  .btn-print { position: fixed; top: 10px; right: 10px; padding: 12px 24px; background: #F59E0B; color: #1C1917; border: 3px solid #1C1917; font-weight: 900; cursor: pointer; font-size: 12pt; letter-spacing: 0.08em; box-shadow: 4px 4px 0 #1C1917; z-index: 1000; }
  .instructions { background: #FEF3C7; border: 2px solid #F59E0B; padding: 10px 14px; margin-bottom: 20px; font-size: 10pt; }
  .page { page-break-after: always; padding: 4px; min-height: 9.5in; display: flex; flex-direction: column; }
  .page:last-child { page-break-after: auto; }
  .strip { border: 2px solid #1C1917; background: #F5F5F4; padding: 8px 12px; margin-bottom: 10px; }
  .strip .kv-row { display: flex; flex-wrap: wrap; gap: 14px; font-size: 9.5pt; line-height: 1.4; }
  .strip .kv { white-space: nowrap; }
  .strip .kv b { color: #78716C; font-size: 7.5pt; letter-spacing: 0.08em; margin-right: 4px; }
  .strip .desc, .strip .notes { margin-top: 6px; font-size: 9pt; line-height: 1.4; padding-top: 5px; border-top: 1px dotted #A8A29E; }
  .strip .desc b, .strip .notes b { color: #78716C; font-size: 7.5pt; letter-spacing: 0.08em; margin-right: 4px; }
  .photo-count { color: #78716C; font-size: 9pt; letter-spacing: 0.08em; text-align: center; padding: 40px 0; font-style: italic; }
  .photo-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
  .photo-wrap img { max-width: 100%; max-height: 8.5in; object-fit: contain; border: 1.5px solid #1C1917; }
  .photo-label { font-family: Menlo, monospace; font-size: 8pt; color: #78716C; margin-top: 6px; letter-spacing: 0.1em; }
  .footer-summary { padding-top: 20px; border-top: 2px solid #1C1917; font-size: 8pt; color: #78716C; font-family: Menlo, monospace; letter-spacing: 0.08em; }
  @media print {
    .btn-print, .instructions { display: none; }
    body { padding: 0; }
  }
</style></head>
<body>
<button class="btn-print" onclick="window.print()">🖨 PRINT / SAVE AS PDF</button>
<div class="instructions">
  <strong>📋 FB Archive:</strong> ${fbs.length} freight bill${fbs.length !== 1 ? "s" : ""} · ${fbs.reduce((s, fb) => s + (fb.photos?.length || 0), 0)} scale ticket page${fbs.reduce((s, fb) => s + (fb.photos?.length || 0), 0) !== 1 ? "s" : ""}. Click PRINT then choose "Save as PDF".
</div>
${pagesHtml}
<div class="footer-summary">ARCHIVE GENERATED ${new Date().toLocaleString()} · ${esc(company?.name || "4 BROTHERS TRUCKING")} · ${fbs.length} FB${fbs.length !== 1 ? "S" : ""}</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Popup blocked. Please allow popups and try again."); return; }
  w.document.write(html);
  w.document.close();
};

const FBArchiveModal = ({ freightBills, dispatches, contacts, projects, company, onClose, onToast }) => {
  // Load saved prefs from localStorage
  const savedPrefs = (() => {
    try { return JSON.parse(localStorage.getItem(FB_ARCHIVE_LS_KEY) || "{}"); } catch { return {}; }
  })();

  const [fromDate, setFromDate] = useState(savedPrefs.fromDate || "");
  const [toDate, setToDate] = useState(savedPrefs.toDate || "");
  const [customerId, setCustomerId] = useState(savedPrefs.customerId || "");
  const [projectId, setProjectId] = useState(savedPrefs.projectId || "");
  const [statusFilter, setStatusFilter] = useState(savedPrefs.statusFilter || FB_ARCHIVE_STATUS_DEFAULTS);
  const [fieldsInclude, setFieldsInclude] = useState(savedPrefs.fieldsInclude || FB_ARCHIVE_FIELD_DEFAULTS);

  // Customers are contacts of type customer or broker
  const customerList = useMemo(() =>
    (contacts || []).filter((c) => c.type === "customer" || c.type === "broker")
      .sort((a, b) => (a.companyName || a.contactName || "").localeCompare(b.companyName || b.contactName || "")),
    [contacts]);

  // Matched FBs based on filters
  const matchedFbs = useMemo(() => {
    return (freightBills || []).filter((fb) => {
      const status = fb.status || "pending";
      const isInvoiced = !!fb.invoiceId;
      const isPaid = !!fb.paidAt || !!fb.customerPaidAt;
      if (status === "rejected") return false;
      // Status group mapping
      if (status === "pending" && !statusFilter.pending) return false;
      if (status === "approved" && !isInvoiced && !isPaid && !statusFilter.approved) return false;
      if (isInvoiced && !isPaid && !statusFilter.invoiced) return false;
      if (isPaid && !statusFilter.paid) return false;

      const fbDate = fb.submittedAt ? fb.submittedAt.slice(0, 10) : "";
      if (fromDate && fbDate < fromDate) return false;
      if (toDate && fbDate > toDate) return false;

      const d = dispatches.find((x) => x.id === fb.dispatchId);
      if (customerId && String(d?.clientId) !== String(customerId)) return false;
      if (projectId && String(d?.projectId) !== String(projectId)) return false;

      return true;
    }).sort((a, b) => (a.submittedAt || "").localeCompare(b.submittedAt || ""));
  }, [freightBills, dispatches, statusFilter, fromDate, toDate, customerId, projectId]);

  const totalPhotos = matchedFbs.reduce((s, fb) => s + (fb.photos?.length || 0), 0);

  const savePrefs = () => {
    try {
      localStorage.setItem(FB_ARCHIVE_LS_KEY, JSON.stringify({
        fromDate, toDate, customerId, projectId, statusFilter, fieldsInclude,
      }));
    } catch { /* noop: localStorage can fail in private mode */ }
  };

  const handleGenerate = async () => {
    if (matchedFbs.length === 0) { onToast("NO FBs MATCH FILTERS"); return; }
    savePrefs();
    try {
      await generateFBArchivePDF({
        fbs: matchedFbs, dispatches, contacts, projects, company, fieldsInclude,
      });
      onToast(`✓ ARCHIVE GENERATED · ${matchedFbs.length} FB${matchedFbs.length !== 1 ? "S" : ""}`);
    } catch (e) {
      console.error(e); onToast("GENERATION FAILED");
    }
  };

  const toggleField = (key) => setFieldsInclude((s) => ({ ...s, [key]: !s[key] }));
  const toggleStatus = (key) => setStatusFilter((s) => ({ ...s, [key]: !s[key] }));

  const fieldCheckbox = (key, label) => (
    <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: fieldsInclude[key] ? "#FEF3C7" : "#F5F5F4", border: "1.5px solid " + (fieldsInclude[key] ? "var(--hazard-deep)" : "var(--concrete)"), cursor: "pointer", fontSize: 11 }}>
      <input type="checkbox" checked={!!fieldsInclude[key]} onChange={() => toggleField(key)} />
      <span className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.05em" }}>{label}</span>
    </label>
  );

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 820 }}>
        <div style={{ padding: "16px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.12em" }}>▸ REPORTS</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "3px 0 0" }}>FB ARCHIVE PDF</h3>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ borderColor: "var(--cream)", color: "var(--cream)" }}>
            <X size={14} style={{ marginRight: 4 }} /> CLOSE
          </button>
        </div>

        <div style={{ padding: 20, display: "grid", gap: 16 }}>
          {/* Filters */}
          <div className="fbt-card" style={{ padding: 14, background: "#F5F5F4" }}>
            <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--concrete)", marginBottom: 10, fontWeight: 700 }}>▸ FILTERS</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
              <div>
                <label className="fbt-label">From date</label>
                <input type="date" className="fbt-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="fbt-label">To date</label>
                <input type="date" className="fbt-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
              <div>
                <label className="fbt-label">Customer</label>
                <select className="fbt-select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">All customers</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="fbt-label">Project</label>
                <select className="fbt-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">All projects</option>
                  {(projects || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="fbt-label" style={{ marginBottom: 6 }}>Status include</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { k: "pending",   l: "PENDING" },
                  { k: "approved",  l: "APPROVED" },
                  { k: "invoiced",  l: "INVOICED" },
                  { k: "paid",      l: "PAID" },
                ].map(({ k, l }) => (
                  <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: statusFilter[k] ? "#FEF3C7" : "#FFF", border: "1.5px solid " + (statusFilter[k] ? "var(--hazard-deep)" : "var(--concrete)"), cursor: "pointer", fontSize: 11 }}>
                    <input type="checkbox" checked={!!statusFilter[k]} onChange={() => toggleStatus(k)} />
                    <span className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.05em" }}>{l}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Field checkboxes */}
          <div className="fbt-card" style={{ padding: 14, background: "#F5F5F4" }}>
            <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--concrete)", marginBottom: 10, fontWeight: 700 }}>▸ INCLUDE IN HEADER STRIP</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {fieldCheckbox("date", "DATE")}
              {fieldCheckbox("fbNumber", "FB #")}
              {fieldCheckbox("customer", "CUSTOMER")}
              {fieldCheckbox("driver", "DRIVER")}
              {fieldCheckbox("truck", "TRUCK")}
              {fieldCheckbox("startTime", "IN (TIME)")}
              {fieldCheckbox("endTime", "OUT (TIME)")}
              {fieldCheckbox("hours", "HOURS")}
              {fieldCheckbox("tons", "TONS")}
              {fieldCheckbox("loads", "LOADS")}
              {fieldCheckbox("pickup", "FROM")}
              {fieldCheckbox("dropoff", "TO")}
              {fieldCheckbox("description", "DESCRIPTION")}
              {fieldCheckbox("notes", "NOTES")}
            </div>
          </div>

          {/* Preview count */}
          <div style={{ padding: "12px 14px", background: matchedFbs.length > 0 ? "#F0FDF4" : "#FEE2E2", border: "2px solid " + (matchedFbs.length > 0 ? "var(--good)" : "var(--safety)"), display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div className="fbt-display" style={{ fontSize: 20 }}>
                {matchedFbs.length} FB{matchedFbs.length !== 1 ? "s" : ""} MATCH
              </div>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.08em", marginTop: 2 }}>
                {matchedFbs.length + totalPhotos} TOTAL PAGE{(matchedFbs.length + totalPhotos) !== 1 ? "S" : ""} · {totalPhotos} SCALE TICKET{totalPhotos !== 1 ? "S" : ""}
              </div>
            </div>
            <button onClick={handleGenerate} className="btn-primary" disabled={matchedFbs.length === 0} style={{ padding: "10px 18px" }}>
              <FileDown size={14} style={{ marginRight: 6 }} /> GENERATE PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================================================================
// RECOVERY TAB (v17/v18) — browse and restore soft-deleted items
// ========================================================================
// Shows soft-deleted dispatches, freight bills, invoices, and quotes.
// Items past the 30-day recovery window are flagged as "will auto-purge soon."
// Admin can RECOVER (restore to active) or DELETE PERMANENTLY (bypass auto-purge).
// ========================================================================

const RecoveryTab = ({ onToast }) => {
  const [deletedDispatches, setDeletedDispatches] = useState([]);
  const [deletedFBs, setDeletedFBs] = useState([]);
  const [deletedInvoices, setDeletedInvoices] = useState([]);
  const [deletedQuotes, setDeletedQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [d, f, i, q] = await Promise.all([
        fetchDeletedDispatches(),
        fetchDeletedFreightBills(),
        fetchDeletedInvoices(),
        fetchDeletedQuotes(),
      ]);
      setDeletedDispatches(d);
      setDeletedFBs(f);
      setDeletedInvoices(i);
      setDeletedQuotes(q);
    } catch (e) {
      console.error("Recovery fetch failed:", e);
      onToast("COULDN'T LOAD DELETED ITEMS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshAll(); }, []);

  // Past the 30-day recovery window? Helpers live in utils to avoid the
  // react-hooks/purity warning that fires on Date.now() in render bodies.
  const isExpired = (deletedAt) => isPastRecoveryWindow(deletedAt, 30);

  const fmtDeletedAt = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const handleRecover = async (type, id, label) => {
    if (!confirm(`Recover ${label}?\n\nThis will restore it to active records.`)) return;
    setBusyId(`${type}-${id}`);
    try {
      if (type === "dispatch") await recoverDispatch(id);
      else if (type === "fb") await recoverFreightBill(id);
      else if (type === "invoice") await recoverInvoice(id);
      else if (type === "quote") await recoverQuote(id);
      onToast(`✓ RECOVERED ${label.toUpperCase()}`);
      await refreshAll();
    } catch (e) {
      console.error("Recover failed:", e);
      alert("Recover failed: " + (e?.message || String(e)));
    } finally {
      setBusyId(null);
    }
  };

  const handleHardDelete = async (type, id, label) => {
    if (!confirm(`⚠ PERMANENTLY delete ${label}?\n\nThis CANNOT be undone. Usually auto-purge handles this after 30 days.\n\nContinue?`)) return;
    const confirm2 = prompt(`Type DELETE (all caps) to confirm permanent deletion of ${label}:`);
    if (confirm2 !== "DELETE") { onToast("CANCELLED"); return; }
    setBusyId(`${type}-${id}`);
    try {
      if (type === "dispatch") await hardDeleteDispatch(id);
      else if (type === "fb") await hardDeleteFreightBill(id);
      else if (type === "invoice") await hardDeleteInvoice(id);
      else if (type === "quote") await hardDeleteQuote(id);
      onToast(`✓ PERMANENTLY DELETED`);
      await refreshAll();
    } catch (e) {
      console.error("Hard delete failed:", e);
      alert("Permanent delete failed: " + (e?.message || String(e)));
    } finally {
      setBusyId(null);
    }
  };

  // Row renderer: one item in a group
  const renderRow = ({ type, id, title, sub, deletedAt, deletedBy, deleteReason, label }) => {
    const expired = isExpired(deletedAt);
    const days = daysUntilPurge(deletedAt);
    const busy = busyId === `${type}-${id}`;
    return (
      <div key={`${type}-${id}`} style={{ padding: "12px 14px", background: expired ? "#FEF2F2" : "#FAFAF9", border: `1.5px solid ${expired ? "var(--safety)" : "var(--concrete)"}`, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="fbt-display" style={{ fontSize: 14, margin: 0 }}>{title}</div>
          {sub && <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 3, letterSpacing: "0.04em" }}>{sub}</div>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10, color: "var(--concrete)", letterSpacing: "0.06em", marginTop: 6, textTransform: "uppercase" }}>
            <span>DELETED {fmtDeletedAt(deletedAt)}</span>
            {deletedBy && <span>· BY {deletedBy}</span>}
            {deleteReason && <span>· "{deleteReason}"</span>}
          </div>
          {expired ? (
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--safety)", letterSpacing: "0.1em", marginTop: 6, fontWeight: 700 }}>
              ⚠ EXPIRED — WILL AUTO-PURGE ON NEXT APP BOOT
            </div>
          ) : days !== null && days <= 7 && (
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard-deep)", letterSpacing: "0.1em", marginTop: 6, fontWeight: 700 }}>
              ⏱ PURGES IN {days} DAY{days !== 1 ? "S" : ""}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={() => handleRecover(type, id, label)} disabled={busy} className="btn-primary" style={{ padding: "6px 12px", fontSize: 11, background: "var(--good)", color: "#FFF" }}>
            <RefreshCw size={11} style={{ marginRight: 4 }} /> RECOVER
          </button>
          <button onClick={() => handleHardDelete(type, id, label)} disabled={busy} className="btn-ghost" style={{ padding: "6px 12px", fontSize: 11, borderColor: "var(--safety)", color: "var(--safety)" }}>
            <Trash2 size={11} style={{ marginRight: 4 }} /> PURGE
          </button>
        </div>
      </div>
    );
  };

  const groupCard = (title, items, renderItem) => (
    <div className="fbt-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid var(--steel)" }}>
        <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>{title}</h3>
        <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", fontWeight: 700 }}>
          {items.length} ITEM{items.length !== 1 ? "S" : ""}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.08em", padding: "16px 0", fontStyle: "italic" }}>
          NOTHING HERE — NO {title.replace("DELETED ", "")} DELETED
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map(renderItem)}
        </div>
      )}
    </div>
  );

  const totalDeleted = deletedDispatches.length + deletedFBs.length + deletedInvoices.length + deletedQuotes.length;
  const totalExpired = [...deletedDispatches, ...deletedFBs, ...deletedInvoices, ...deletedQuotes].filter((x) => isExpired(x.deletedAt)).length;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <h2 className="fbt-display" style={{ fontSize: 22, margin: 0 }}>RECOVERY</h2>
        <span className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)", letterSpacing: "0.08em" }}>
          SOFT-DELETED ITEMS · RECOVERABLE FOR 30 DAYS
        </span>
        <button onClick={refreshAll} disabled={loading} className="btn-ghost" style={{ marginLeft: "auto", fontSize: 11, padding: "6px 12px" }}>
          <RefreshCw size={11} style={{ marginRight: 4 }} /> REFRESH
        </button>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{totalDeleted}</div>
          <div className="stat-label">TOTAL DELETED</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{deletedDispatches.length}</div>
          <div className="stat-label">DISPATCHES</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{deletedFBs.length}</div>
          <div className="stat-label">FREIGHT BILLS</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{deletedInvoices.length + deletedQuotes.length}</div>
          <div className="stat-label">INVOICES + QUOTES</div>
        </div>
        {totalExpired > 0 && (
          <div className="fbt-card" style={{ padding: 16, background: "#FEF2F2", border: "2px solid var(--safety)" }}>
            <div className="stat-num" style={{ color: "var(--safety)" }}>{totalExpired}</div>
            <div className="stat-label" style={{ color: "var(--safety)" }}>EXPIRED · WILL PURGE</div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <div className="fbt-mono anim-roll" style={{ fontSize: 13, letterSpacing: "0.2em", color: "var(--hazard-deep)" }}>▸ LOADING RECOVERY DATA…</div>
        </div>
      ) : totalDeleted === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <CheckCircle2 size={32} style={{ opacity: 0.4, marginBottom: 8, color: "var(--good)" }} />
          <div className="fbt-display" style={{ fontSize: 14 }}>NOTHING IN RECOVERY</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.08em", marginTop: 6 }}>
            WHEN YOU DELETE DISPATCHES, FBS, INVOICES, OR QUOTES, THEY'LL APPEAR HERE FOR 30 DAYS
          </div>
        </div>
      ) : (
        <>
          {groupCard("DELETED DISPATCHES", deletedDispatches, (d) => renderRow({
            type: "dispatch",
            id: d.id,
            title: `Order #${d.code || d.id.slice(0, 8)} — ${d.jobName || "—"}`,
            sub: `${d.pickup || "—"} → ${d.dropoff || "—"} · ${d.trucksExpected || 0} truck${d.trucksExpected !== 1 ? "s" : ""}`,
            deletedAt: d.deletedAt,
            deletedBy: d.deletedBy,
            deleteReason: d.deleteReason,
            label: `Order #${d.code || d.id.slice(0, 8)}`,
          }))}

          {groupCard("DELETED FREIGHT BILLS", deletedFBs, (fb) => renderRow({
            type: "fb",
            id: fb.id,
            title: `FB #${fb.freightBillNumber || fb.id.slice(0, 8)}`,
            sub: `${fb.driverName || "—"} · Truck ${fb.truckNumber || "—"}${fb.tonnage ? ` · ${fb.tonnage} tons` : ""}${fb.loadCount ? ` · ${fb.loadCount} loads` : ""}`,
            deletedAt: fb.deletedAt,
            deletedBy: fb.deletedBy,
            deleteReason: fb.deleteReason,
            label: `FB #${fb.freightBillNumber || fb.id.slice(0, 8)}`,
          }))}

          {groupCard("DELETED INVOICES", deletedInvoices, (inv) => renderRow({
            type: "invoice",
            id: inv.id,
            title: `Invoice ${inv.invoiceNumber || inv.id.slice(0, 8)}`,
            sub: `${inv.clientName || "—"}${inv.totalAmount ? ` · $${Number(inv.totalAmount).toFixed(2)}` : ""}${inv.fbIds ? ` · ${inv.fbIds.length} FB${inv.fbIds.length !== 1 ? "s" : ""}` : ""}`,
            deletedAt: inv.deletedAt,
            deletedBy: inv.deletedBy,
            deleteReason: inv.deleteReason,
            label: `Invoice ${inv.invoiceNumber || inv.id.slice(0, 8)}`,
          }))}

          {groupCard("DELETED QUOTES", deletedQuotes, (q) => renderRow({
            type: "quote",
            id: q.id,
            title: `${q.name || "—"}${q.company ? ` — ${q.company}` : ""}`,
            sub: `${q.email || "—"}${q.phone ? ` · ${q.phone}` : ""}${q.service ? ` · ${q.service}` : ""}`,
            deletedAt: q.deletedAt,
            deletedBy: q.deletedBy,
            deleteReason: q.deleteReason,
            label: `quote from ${q.name || "—"}`,
          }))}
        </>
      )}
    </div>
  );
};

// ========== PHOTO GALLERY (v18 Batch 2 Session D) ==========
// Filterable list of FB photos: order, date range, driver/sub, project.
// Reusable as a standalone panel (in Reports) OR a modal (from dispatch/invoice detail).
const PhotoGalleryPanel = ({
  freightBills = [], dispatches = [], contacts = [], projects = [],
  // Pre-filter hints — if passed, those filters are locked
  lockedDispatchId = null,   // Pin to a specific dispatch
  lockedFbIds = null,        // Pin to a specific set of FBs (e.g. an invoice's FBs)
  onToast,
}) => {
  const [dispatchFilter, setDispatchFilter] = useState(lockedDispatchId || "");
  const [contactFilter, setContactFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [lightbox, setLightbox] = useState(null);

  // Filter FBs based on all active filters
  const fbsWithPhotos = useMemo(() => {
    return (freightBills || []).filter((fb) => {
      if (!Array.isArray(fb.photos) || fb.photos.length === 0) return false;

      // Locked scope (takes priority)
      if (lockedFbIds && !lockedFbIds.includes(fb.id)) return false;
      if (lockedDispatchId && String(fb.dispatchId) !== String(lockedDispatchId)) return false;

      // Date range (submittedAt)
      const fbDate = fb.submittedAt ? fb.submittedAt.slice(0, 10) : "";
      if (fromDate && fbDate < fromDate) return false;
      if (toDate && fbDate > toDate) return false;

      // Dispatch
      if (dispatchFilter && !lockedDispatchId && String(fb.dispatchId) !== String(dispatchFilter)) return false;

      // Contact (match assignment.contactId)
      if (contactFilter) {
        const disp = dispatches.find((d) => d.id === fb.dispatchId);
        const a = disp ? (disp.assignments || []).find((x) => x.aid === fb.assignmentId) : null;
        if (!a || String(a.contactId) !== String(contactFilter)) return false;
      }

      // Project (via dispatch)
      if (projectFilter) {
        const disp = dispatches.find((d) => d.id === fb.dispatchId);
        if (!disp || String(disp.projectId) !== String(projectFilter)) return false;
      }

      return true;
    }).sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  }, [freightBills, dispatches, dispatchFilter, contactFilter, projectFilter, fromDate, toDate, lockedFbIds, lockedDispatchId]);

  const totalPhotos = fbsWithPhotos.reduce((s, fb) => s + (fb.photos?.length || 0), 0);

  // Download helper — downloads a single photo
  const downloadPhoto = (photo, fb) => {
    try {
      const link = document.createElement("a");
      link.href = photo.dataUrl;
      const filename = `FB-${fb.freightBillNumber || fb.id}-${photo.name || photo.id}.jpg`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Download failed:", e);
      onToast?.("⚠ DOWNLOAD FAILED");
    }
  };

  // Print all photos — simple print window with img grid
  const printAll = () => {
    try {
      const w = window.open("", "_blank", "width=850,height=1100");
      if (!w) { onToast?.("⚠ POPUP BLOCKED"); return; }
      const rows = fbsWithPhotos.map((fb) => {
        const disp = dispatches.find((d) => d.id === fb.dispatchId);
        const label = `FB#${fb.freightBillNumber || "—"} · ${fb.driverName || "—"}${fb.truckNumber ? ` · T${fb.truckNumber}` : ""} · ${disp?.jobName || ""} · ${disp?.code || ""} · ${fb.submittedAt ? fb.submittedAt.slice(0, 10) : ""}`;
        const imgs = fb.photos.map((p) => `<img src="${p.dataUrl}" style="max-width: 100%; max-height: 420px; border: 1px solid #000; margin: 4px;" alt="${p.name || ""}" />`).join("");
        return `<div style="page-break-inside: avoid; margin-bottom: 18px; border-bottom: 2px solid #000; padding-bottom: 12px;">
          <div style="font-family: Arial; font-size: 10pt; margin-bottom: 6px; font-weight: 700;">${label}</div>
          ${imgs}
        </div>`;
      }).join("");
      w.document.write(`<!DOCTYPE html><html><head><title>FB Photos</title>
        <style>@page { margin: 0.4in; size: letter; } body { font-family: Arial; padding: 12px; } .btn { position: fixed; top: 10px; right: 10px; padding: 8px 16px; background: #F59E0B; border: 2px solid #000; font-weight: 700; cursor: pointer; box-shadow: 3px 3px 0 #000; } @media print { .btn { display: none; } }</style>
        </head><body>
        <button class="btn" onclick="window.print()">🖨 PRINT</button>
        <h2>FB PHOTOS · ${fbsWithPhotos.length} FB${fbsWithPhotos.length !== 1 ? "s" : ""} · ${totalPhotos} photo${totalPhotos !== 1 ? "s" : ""}</h2>
        ${rows}
        </body></html>`);
      w.document.close();
    } catch (e) {
      console.error("Print failed:", e);
      onToast?.("⚠ PRINT FAILED");
    }
  };

  const customersAndSubs = (contacts || []).filter((c) => c.type === "driver" || c.type === "sub");

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      {/* Filter row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, padding: 12, background: "#F5F5F4", border: "1.5px solid var(--concrete)" }}>
        {!lockedDispatchId && !lockedFbIds && (
          <div>
            <label className="fbt-label" style={{ fontSize: 10 }}>Order</label>
            <select className="fbt-select" value={dispatchFilter} onChange={(e) => setDispatchFilter(e.target.value)}>
              <option value="">All orders</option>
              {dispatches.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code || "—"} · {d.jobName || "—"} · {d.date || ""}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="fbt-label" style={{ fontSize: 10 }}>Driver / Sub</label>
          <select className="fbt-select" value={contactFilter} onChange={(e) => setContactFilter(e.target.value)}>
            <option value="">All drivers / subs</option>
            {customersAndSubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.type === "sub" ? "SUB · " : "DRV · "}{c.companyName || c.contactName}
              </option>
            ))}
          </select>
        </div>
        {!lockedFbIds && (
          <div>
            <label className="fbt-label" style={{ fontSize: 10 }}>Project</label>
            <select className="fbt-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="">All projects</option>
              {(projects || []).map((p) => (
                <option key={p.id} value={p.id}>{p.name || p.code || "—"}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="fbt-label" style={{ fontSize: 10 }}>From Date</label>
          <input type="date" className="fbt-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="fbt-label" style={{ fontSize: 10 }}>To Date</label>
          <input type="date" className="fbt-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      {/* Summary + print */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.05em" }}>
          ▸ {fbsWithPhotos.length} FB{fbsWithPhotos.length !== 1 ? "s" : ""} · {totalPhotos} photo{totalPhotos !== 1 ? "s" : ""}
        </div>
        {totalPhotos > 0 && (
          <button type="button" onClick={printAll} className="btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>
            <Printer size={12} style={{ marginRight: 4 }} /> PRINT ALL
          </button>
        )}
      </div>

      {/* FB list with photos */}
      {fbsWithPhotos.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "#FFF", border: "1.5px dashed var(--concrete)" }}>
          <Camera size={32} style={{ color: "var(--concrete)", opacity: 0.4 }} />
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 8 }}>
            NO PHOTOS MATCH CURRENT FILTERS
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {fbsWithPhotos.map((fb) => {
            const disp = dispatches.find((d) => d.id === fb.dispatchId);
            const project = disp ? projects.find((p) => p.id === disp.projectId) : null;
            const a = disp ? (disp.assignments || []).find((x) => x.aid === fb.assignmentId) : null;
            const kindColor = a?.kind === "sub" ? "#9A3412" : "#0369A1";
            return (
              <div key={fb.id} style={{ background: "#FFF", border: "1.5px solid var(--concrete)", padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div className="fbt-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                      FB#{fb.freightBillNumber || "—"}
                      <span className="chip" style={{ background: kindColor, color: "#FFF", fontSize: 9, padding: "1px 6px", marginLeft: 6 }}>
                        {a?.kind === "sub" ? "SUB" : "DRV"}
                      </span>
                    </div>
                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 3 }}>
                      {fb.driverName || "—"}{fb.truckNumber ? ` · T${fb.truckNumber}` : ""} · {disp?.code || "—"} · {disp?.jobName || "—"}
                      {project ? ` · ${project.name || project.code}` : ""}
                    </div>
                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                      Submitted: {fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", fontWeight: 700 }}>
                    {fb.photos.length} photo{fb.photos.length !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Thumbnail grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 6 }}>
                  {fb.photos.map((photo) => (
                    <div key={photo.id} style={{ position: "relative", background: "#FAFAF9", border: "1px solid var(--concrete)" }}>
                      <img
                        src={photo.dataUrl}
                        alt={photo.name || "scale ticket"}
                        onClick={() => setLightbox(photo.dataUrl)}
                        style={{ width: "100%", height: 110, objectFit: "cover", cursor: "pointer", display: "block" }}
                        title="Click to expand"
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); downloadPhoto(photo, fb); }}
                        style={{ position: "absolute", top: 4, right: 4, padding: "3px 6px", background: "rgba(0,0,0,0.6)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                        title="Download"
                      >
                        <Download size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ========== PHOTO GALLERY MODAL (wrapper for contextual use) ==========
const PhotoGalleryModal = ({ title, onClose, ...galleryProps }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 980, maxHeight: "95vh", overflowY: "auto" }}>
        <div style={{ padding: "16px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", letterSpacing: "0.1em" }}>PHOTO GALLERY</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 18 }}>
          <PhotoGalleryPanel {...galleryProps} />
        </div>
      </div>
    </div>
  );
};


// ========== FB PHOTO GALLERY (v18 Batch 2 Session D) ==========
// List view with filters: order, date range, driver/sub, project.
// Can be used standalone in Reports tab OR constrained to one dispatch/invoice.
// Props:
//   - freightBills, dispatches, contacts, projects, invoices  (data)
//   - initialDispatchId / initialInvoiceId  (optional: lock filter to a specific context)
//   - onClose  (optional: present as a modal if provided)
//   - title  (optional: custom heading when used contextually)
const FBPhotoGallery = ({
  freightBills = [],
  dispatches = [],
  contacts = [],
  projects = [],
  invoices = [],
  initialDispatchId = "",
  initialInvoiceId = "",
  onClose,
  title,
}) => {
  const [filterDispatchId, setFilterDispatchId] = useState(initialDispatchId);
  const [filterInvoiceId, setFilterInvoiceId] = useState(initialInvoiceId);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterDriverSubId, setFilterDriverSubId] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest"); // newest | oldest

  // Escape closes lightbox or modal
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      if (lightbox) { setLightbox(null); return; }
      if (onClose) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [lightbox]);

  // Filter FBs by the full filter set
  const filteredFBs = useMemo(() => {
    const fromMs = filterFrom ? new Date(filterFrom + "T00:00:00").getTime() : null;
    const toMs = filterTo ? new Date(filterTo + "T23:59:59").getTime() : null;
    return freightBills
      .filter((fb) => {
        // Must have photos to be in gallery
        if (!fb.photos || fb.photos.length === 0) return false;
        // Dispatch (Order) filter
        if (filterDispatchId && fb.dispatchId !== filterDispatchId) return false;
        // Invoice filter
        if (filterInvoiceId && fb.invoiceId !== filterInvoiceId) return false;
        // Project filter — via the fb's dispatch
        if (filterProjectId) {
          const d = dispatches.find((x) => x.id === fb.dispatchId);
          if (!d || d.projectId !== filterProjectId) return false;
        }
        // Driver/Sub filter — look up the fb's assignment contactId
        if (filterDriverSubId) {
          const d = dispatches.find((x) => x.id === fb.dispatchId);
          const a = d ? (d.assignments || []).find((x) => x.aid === fb.assignmentId) : null;
          if (!a || String(a.contactId) !== String(filterDriverSubId)) return false;
        }
        // Date range — use submittedAt (or approvedAt fallback)
        const ts = fb.submittedAt || fb.approvedAt || fb.createdAt || null;
        if (!ts) {
          // If filtering by date, FBs without a date should be excluded
          if (fromMs || toMs) return false;
        } else {
          const fbMs = new Date(ts).getTime();
          if (fromMs && fbMs < fromMs) return false;
          if (toMs && fbMs > toMs) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aMs = new Date(a.submittedAt || a.approvedAt || a.createdAt || 0).getTime();
        const bMs = new Date(b.submittedAt || b.approvedAt || b.createdAt || 0).getTime();
        return sortOrder === "newest" ? bMs - aMs : aMs - bMs;
      });
  }, [freightBills, dispatches, filterDispatchId, filterInvoiceId, filterProjectId, filterDriverSubId, filterFrom, filterTo, sortOrder]);

  const totalPhotoCount = filteredFBs.reduce((s, fb) => s + (fb.photos?.length || 0), 0);

  // Build dropdown options — only contacts that are drivers/subs
  const driverSubContacts = contacts.filter((c) => c.type === "driver" || c.type === "sub");

  const clearFilters = () => {
    setFilterDispatchId(initialDispatchId);
    setFilterInvoiceId(initialInvoiceId);
    setFilterFrom("");
    setFilterTo("");
    setFilterDriverSubId("");
    setFilterProjectId("");
  };

  const anyFilterActive = (
    (filterDispatchId && filterDispatchId !== initialDispatchId) ||
    (filterInvoiceId && filterInvoiceId !== initialInvoiceId) ||
    filterFrom || filterTo || filterDriverSubId || filterProjectId
  );

  const body = (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header with contextual title */}
      {title && (
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em" }}>▸ {title}</div>
      )}

      {/* Filter bar */}
      <div className="fbt-card" style={{ padding: 14, display: "grid", gap: 10 }}>
        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em" }}>▸ FILTERS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {!initialDispatchId && (
            <div>
              <label className="fbt-label">Order</label>
              <select className="fbt-select" value={filterDispatchId} onChange={(e) => setFilterDispatchId(e.target.value)}>
                <option value="">All orders</option>
                {dispatches.slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 100).map((d) => (
                  <option key={d.id} value={d.id}>#{d.code || d.id.slice(0, 6)} {d.customerName ? ` · ${d.customerName}` : ""}</option>
                ))}
              </select>
            </div>
          )}
          {!initialInvoiceId && (
            <div>
              <label className="fbt-label">Invoice</label>
              <select className="fbt-select" value={filterInvoiceId} onChange={(e) => setFilterInvoiceId(e.target.value)}>
                <option value="">All invoices</option>
                {invoices.slice(0, 100).map((i) => (
                  <option key={i.id} value={i.id}>{i.invoiceNumber} · {i.billToName}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="fbt-label">Driver / Sub</label>
            <select className="fbt-select" value={filterDriverSubId} onChange={(e) => setFilterDriverSubId(e.target.value)}>
              <option value="">All drivers/subs</option>
              {driverSubContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.type === "sub" ? "S" : "D"} · {c.companyName || c.contactName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="fbt-label">Project</label>
            <select className="fbt-select" value={filterProjectId} onChange={(e) => setFilterProjectId(e.target.value)}>
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fbt-label">From</label>
            <input type="date" className="fbt-input" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          </div>
          <div>
            <label className="fbt-label">To</label>
            <input type="date" className="fbt-input" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
          </div>
          <div>
            <label className="fbt-label">Sort</label>
            <select className="fbt-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
        {anyFilterActive && (
          <button type="button" onClick={clearFilters} className="btn-ghost" style={{ padding: "6px 12px", fontSize: 11, alignSelf: "start" }}>
            <X size={12} /> CLEAR FILTERS
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.05em" }}>
        ▸ {filteredFBs.length} FB{filteredFBs.length !== 1 ? "S" : ""} · {totalPhotoCount} PHOTO{totalPhotoCount !== 1 ? "S" : ""} MATCHING
      </div>

      {/* List view — each FB gets a row with its photo thumbnails */}
      {filteredFBs.length === 0 ? (
        <div style={{ padding: 28, textAlign: "center", background: "#F5F5F4", border: "1px solid var(--steel)", fontSize: 12, color: "var(--concrete)" }}>
          No photos match these filters. Try broadening the range or clearing filters.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filteredFBs.map((fb) => {
            const d = dispatches.find((x) => x.id === fb.dispatchId);
            const a = d ? (d.assignments || []).find((x) => x.aid === fb.assignmentId) : null;
            const contact = a?.contactId ? contacts.find((c) => c.id === a.contactId) : null;
            const project = d?.projectId ? projects.find((p) => p.id === d.projectId) : null;
            const inv = fb.invoiceId ? invoices.find((i) => i.id === fb.invoiceId) : null;
            const ts = fb.submittedAt || fb.approvedAt || fb.createdAt || null;
            return (
              <div key={fb.id} className="fbt-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10, fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                    <strong style={{ color: "var(--steel)", fontSize: 13 }}>FB#{fb.freightBillNumber || "—"}</strong>
                    <span style={{ color: "var(--concrete)" }}>
                      {fb.driverName || contact?.contactName || contact?.companyName || "—"}
                      {fb.truckNumber ? ` · T${fb.truckNumber}` : ""}
                    </span>
                    {d && <span style={{ color: "var(--concrete)" }}>· Order #{d.code || d.id.slice(0, 6)}</span>}
                    {project && <span style={{ color: "var(--concrete)" }}>· {project.name}</span>}
                    {inv && <span style={{ color: "var(--good)", fontWeight: 700 }}>· INV {inv.invoiceNumber}</span>}
                  </div>
                  <div style={{ color: "var(--concrete)", fontSize: 11 }}>
                    {ts ? new Date(ts).toLocaleDateString() : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {fb.photos.map((p) => (
                    <img
                      key={p.id}
                      src={p.dataUrl}
                      alt={p.name || "photo"}
                      onClick={() => setLightbox(p.dataUrl)}
                      style={{
                        width: 96, height: 96, objectFit: "cover",
                        border: "1.5px solid var(--steel)", cursor: "pointer",
                      }}
                      title={p.name || ""}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );

  // If onClose is provided, render as a modal. Otherwise render inline (for Reports tab)
  if (onClose) {
    return (
      <div className="modal-bg" onClick={onClose}>
        <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 960 }}>
          <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <Camera size={16} /> {title || "PHOTO GALLERY"}
            </h3>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
          </div>
          <div style={{ padding: 22 }}>
            {body}
          </div>
        </div>
      </div>
    );
  }
  return body;
};

// ========== BIDS / RFP TRACKER (v19 Batch 3 Session F) ==========
// Pipeline: discovered → researching → preparing → submitted → awarded | rejected | abandoned
// Daily value: surface deadlines, reduce missed submissions, track pursuit history.


// ========== BIDS TAB ==========
const BidsTab = ({ bids = [], setBids, onToast }) => {
  const [editingBid, setEditingBid] = useState(null);  // null | bid object | {} for new
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return bids.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (q) {
        const hay = [b.rfbNumber, b.title, b.agency, (b.tags || []).join(" ")].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bids, statusFilter, search]);

  // Status counts for filter chips
  const counts = useMemo(() => {
    const c = { all: bids.length };
    BID_STATUSES.forEach((s) => { c[s.value] = bids.filter((b) => b.status === s.value).length; });
    return c;
  }, [bids]);

  // Stats
  const totalPipelineValue = bids
    .filter((b) => ["discovered", "researching", "preparing", "submitted"].includes(b.status))
    .reduce((s, b) => s + (Number(b.estimatedValue) || Number(b.ourBidAmount) || 0), 0);
  const submittedCount = bids.filter((b) => b.status === "submitted").length;
  const awardedCount = bids.filter((b) => b.status === "awarded").length;
  const rejectedCount = bids.filter((b) => b.status === "rejected").length;
  const winRate = (awardedCount + rejectedCount) > 0 ? Math.round((awardedCount / (awardedCount + rejectedCount)) * 100) : null;

  const handleSaveBid = async (draft) => {
    const isNew = !draft.id;
    try {
      if (isNew) {
        const saved = await insertBid(draft);
        setBids([saved, ...bids]);
        // v20 Session O: audit log
        logAudit({
          actionType: "bid.create",
          entityType: "bid", entityId: saved.id,
          entityLabel: saved.rfbNumber || saved.title?.slice(0, 40),
          metadata: { title: saved.title, agency: saved.agency, status: saved.status },
        });
        onToast("✓ BID CREATED");
      } else {
        // v19c Session N: pass bids-list's current updatedAt as optimistic lock
        const current = bids.find((b) => b.id === draft.id);
        const saved = await updateBid(draft.id, draft, current?.updatedAt || null);
        setBids(bids.map((b) => b.id === saved.id ? saved : b));
        // v20 Session O: log status transition (only when status actually changed)
        if (current && current.status !== saved.status) {
          logAudit({
            actionType: "bid.status_change",
            entityType: "bid", entityId: saved.id,
            entityLabel: saved.rfbNumber || saved.title?.slice(0, 40),
            before: { status: current.status },
            after: { status: saved.status },
            metadata: {
              title: saved.title,
              agency: saved.agency,
              ourBidAmount: saved.ourBidAmount,
              winningBidder: saved.winningBidder,
              winningBidAmount: saved.winningBidAmount,
            },
          });
        }
        onToast("✓ BID UPDATED");
      }
    } catch (e) {
      if (e?.code === "CONCURRENT_EDIT") {
        onToast("⚠ SOMEONE ELSE EDITED THIS BID — CLOSE + REOPEN TO RETRY");
        throw e;  // keep modal open
      }
      console.error("saveBid:", e);
      onToast("⚠ SAVE FAILED — CHECK CONNECTION");
      throw e;
    }
  };

  const handleDeleteBid = async (bid) => {
    if (!confirm(`Delete bid "${bid.rfbNumber || bid.title}"?\n\nThis is a soft-delete. The bid stays recoverable for 30 days.`)) return;
    const reason = prompt("Reason (optional):") || "";
    try {
      await deleteBid(bid.id, { deletedBy: "admin", reason });
      setBids(bids.filter((b) => b.id !== bid.id));
      setEditingBid(null);
      // v20 Session O: audit log
      logAudit({
        actionType: "bid.soft_delete",
        entityType: "bid", entityId: bid.id,
        entityLabel: bid.rfbNumber || bid.title?.slice(0, 40),
        metadata: { reason, title: bid.title, agency: bid.agency, status: bid.status },
      });
      onToast("✓ BID DELETED (RECOVERABLE 30 DAYS)");
    } catch (e) {
      console.error("deleteBid:", e);
      onToast("⚠ DELETE FAILED");
    }
  };

  // Sort: active deadlines first (soonest), then awarded/rejected at bottom
  const sorted = [...filtered].sort((a, b) => {
    const aActive = !["awarded", "rejected", "abandoned"].includes(a.status);
    const bActive = !["awarded", "rejected", "abandoned"].includes(b.status);
    if (aActive !== bActive) return aActive ? -1 : 1;
    const aDue = a.submissionDueAt ? new Date(a.submissionDueAt).getTime() : Infinity;
    const bDue = b.submissionDueAt ? new Date(b.submissionDueAt).getTime() : Infinity;
    return aDue - bDue;
  });

  // v19a Session H: Analytics
  const [showAnalytics, setShowAnalytics] = useState(false);

  const analytics = useMemo(() => {
    const decided = bids.filter((b) => b.status === "awarded" || b.status === "rejected");
    const awarded = bids.filter((b) => b.status === "awarded");
    const rejected = bids.filter((b) => b.status === "rejected");
    const abandoned = bids.filter((b) => b.status === "abandoned");

    // Win rate
    const winRatePct = decided.length > 0 ? (awarded.length / decided.length) * 100 : null;

    // Money won / lost / abandoned
    const revenueWon = awarded.reduce((s, b) => s + (Number(b.ourBidAmount) || 0), 0);
    const revenueLost = rejected.reduce((s, b) => s + (Number(b.ourBidAmount) || 0), 0);
    const ourCostOnWins = awarded.reduce((s, b) => s + (Number(b.ourCostEstimate) || 0), 0);
    const marginOnWins = revenueWon - ourCostOnWins;
    const avgMarginPct = revenueWon > 0 ? (marginOnWins / revenueWon) * 100 : null;

    // Avg gap between our bid and winning bid (when we lost)
    const rejectedWithPrices = rejected.filter((b) => b.ourBidAmount && b.winningBidAmount);
    const avgLossGap = rejectedWithPrices.length > 0
      ? rejectedWithPrices.reduce((s, b) => s + (Number(b.ourBidAmount) - Number(b.winningBidAmount)), 0) / rejectedWithPrices.length
      : null;
    const avgLossGapPct = rejectedWithPrices.length > 0
      ? rejectedWithPrices.reduce((s, b) => {
          const gap = Number(b.ourBidAmount) - Number(b.winningBidAmount);
          return s + (gap / Number(b.winningBidAmount)) * 100;
        }, 0) / rejectedWithPrices.length
      : null;

    // Win rate by agency (min 2 decided bids to be meaningful)
    const byAgency = new Map();
    decided.forEach((b) => {
      const key = b.agency || "(no agency)";
      if (!byAgency.has(key)) byAgency.set(key, { agency: key, awarded: 0, rejected: 0, total: 0, revenueWon: 0 });
      const r = byAgency.get(key);
      if (b.status === "awarded") { r.awarded++; r.revenueWon += Number(b.ourBidAmount) || 0; }
      else if (b.status === "rejected") r.rejected++;
      r.total++;
    });
    const agencyStats = Array.from(byAgency.values())
      .filter((a) => a.total >= 1)
      .map((a) => ({ ...a, winRatePct: a.total > 0 ? (a.awarded / a.total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);

    // Pipeline conversion funnel (counts per stage)
    const funnel = {
      discovered: bids.filter((b) => b.status === "discovered").length,
      researching: bids.filter((b) => b.status === "researching").length,
      preparing: bids.filter((b) => b.status === "preparing").length,
      submitted: bids.filter((b) => b.status === "submitted").length,
      awarded: awarded.length,
      rejected: rejected.length,
      abandoned: abandoned.length,
    };
    // Conversion: submitted → awarded
    const submissionToAwardPct = (funnel.submitted + funnel.awarded + funnel.rejected) > 0
      ? (funnel.awarded / (funnel.submitted + funnel.awarded + funnel.rejected)) * 100
      : null;

    return {
      decidedCount: decided.length,
      awardedCount: awarded.length,
      rejectedCount: rejected.length,
      abandonedCount: abandoned.length,
      winRatePct, revenueWon, revenueLost, marginOnWins, avgMarginPct,
      avgLossGap, avgLossGapPct, rejectedWithPricesCount: rejectedWithPrices.length,
      agencyStats, funnel, submissionToAwardPct,
    };
  }, [bids]);

  // CSV export of all bids (active + closed, ignoring filters)
  const exportCSV = () => {
    const rows = [[
      "RFB#", "Title", "Agency", "Status", "Priority",
      "Submission Due", "Our Submitted At", "Outcome At",
      "Agency Estimate", "Our Bid", "Our Cost", "Margin",
      "Winning Bidder", "Winning Bid", "Gap %",
      "Bond Required", "Bond Type", "Bond Amount",
      "Checklist Progress", "Tags",
      "Rejection Reason", "Lessons Learned", "Notes",
    ]];
    bids.forEach((b) => {
      const margin = b.ourBidAmount && b.ourCostEstimate
        ? Number(b.ourBidAmount) - Number(b.ourCostEstimate)
        : "";
      const gapPct = b.ourBidAmount && b.winningBidAmount
        ? (((Number(b.ourBidAmount) - Number(b.winningBidAmount)) / Number(b.winningBidAmount)) * 100).toFixed(1) + "%"
        : "";
      const checklistTotal = (b.checklistItems || []).length;
      const checklistDone = (b.checklistItems || []).filter((x) => x.done).length;
      rows.push([
        b.rfbNumber || "",
        b.title || "",
        b.agency || "",
        (b.status || "").toUpperCase(),
        (b.priority || "").toUpperCase(),
        b.submissionDueAt ? new Date(b.submissionDueAt).toLocaleDateString() : "",
        b.ourSubmittedAt ? new Date(b.ourSubmittedAt).toLocaleDateString() : "",
        b.outcomeAt ? new Date(b.outcomeAt).toLocaleDateString() : "",
        b.estimatedValue ?? "",
        b.ourBidAmount ?? "",
        b.ourCostEstimate ?? "",
        margin,
        b.winningBidder || "",
        b.winningBidAmount ?? "",
        gapPct,
        b.bondRequired ? "yes" : "no",
        b.bondType || "",
        b.bondAmount ?? "",
        checklistTotal > 0 ? `${checklistDone}/${checklistTotal}` : "",
        (b.tags || []).join("; "),
        b.rejectionReason || "",
        b.lessonsLearned || "",
        b.notes || "",
      ]);
    });
    const csv = rowsToCSV(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bids-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast(`✓ EXPORTED ${bids.length} BID${bids.length !== 1 ? "S" : ""} TO CSV`);
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {(showNew || editingBid) && (
        <BidModal
          bid={editingBid}
          onClose={() => { setShowNew(false); setEditingBid(null); }}
          onSave={handleSaveBid}
          onDelete={handleDeleteBid}
          onToast={onToast}
        />
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{bids.length}</div>
          <div className="stat-label">Total Bids</div>
        </div>
        <div className="fbt-card" style={{ padding: 16, background: "var(--hazard)" }}>
          <div className="stat-num" style={{ color: "var(--steel)" }}>{submittedCount}</div>
          <div className="stat-label">Submitted</div>
        </div>
        <div className="fbt-card" style={{ padding: 16, background: "#DCFCE7" }}>
          <div className="stat-num" style={{ color: "#166534" }}>{awardedCount}</div>
          <div className="stat-label" style={{ color: "#166534" }}>Awarded</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num">{winRate !== null ? `${winRate}%` : "—"}</div>
          <div className="stat-label">Win Rate</div>
        </div>
        <div className="fbt-card" style={{ padding: 16 }}>
          <div className="stat-num" style={{ fontSize: "clamp(18px, 3.2vw, 30px)" }}>{fmt$(totalPipelineValue)}</div>
          <div className="stat-label">Pipeline Value</div>
        </div>
      </div>

      {/* v19a Session H: Analytics toggle + CSV export */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="btn-ghost"
          style={{ padding: "8px 14px", fontSize: 11 }}
        >
          <BarChart3 size={14} /> {showAnalytics ? "HIDE ANALYTICS" : "SHOW ANALYTICS"}
        </button>
        <button type="button" onClick={exportCSV} disabled={bids.length === 0} className="btn-ghost" style={{ padding: "8px 14px", fontSize: 11 }}>
          <Download size={14} /> EXPORT CSV ({bids.length})
        </button>
      </div>

      {/* Analytics panel */}
      {showAnalytics && (
        <div className="fbt-card" style={{ padding: 20, background: "linear-gradient(135deg, #FFF, #F5F5F4)", border: "2px solid var(--steel)" }}>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", letterSpacing: "0.15em", marginBottom: 14, fontWeight: 700 }}>
            ▸ PURSUIT ANALYTICS
          </div>

          {analytics.decidedCount === 0 ? (
            <div className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)", padding: 20, textAlign: "center", background: "#FFF" }}>
              NO DECIDED BIDS YET · ANALYTICS UPDATE AS YOU RECORD OUTCOMES
            </div>
          ) : (
            <>
              {/* Headline metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
                <div style={{ padding: 12, background: "#FFF", border: "1.5px solid var(--good)", borderLeft: "4px solid var(--good)" }}>
                  <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.1em" }}>WIN RATE</div>
                  <div className="fbt-display" style={{ fontSize: 26, color: "var(--good)", marginTop: 4 }}>
                    {analytics.winRatePct != null ? `${analytics.winRatePct.toFixed(0)}%` : "—"}
                  </div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                    {analytics.awardedCount} WON · {analytics.rejectedCount} LOST
                  </div>
                </div>

                <div style={{ padding: 12, background: "#FFF", border: "1.5px solid var(--steel)", borderLeft: "4px solid var(--steel)" }}>
                  <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.1em" }}>REVENUE WON</div>
                  <div className="fbt-display" style={{ fontSize: 22, color: "var(--steel)", marginTop: 4 }}>
                    {fmt$(analytics.revenueWon)}
                  </div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                    REJECTED: {fmt$(analytics.revenueLost)}
                  </div>
                </div>

                <div style={{ padding: 12, background: "#FFF", border: "1.5px solid var(--hazard-deep)", borderLeft: "4px solid var(--hazard-deep)" }}>
                  <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.1em" }}>MARGIN CAPTURED</div>
                  <div className="fbt-display" style={{ fontSize: 22, color: "var(--hazard-deep)", marginTop: 4 }}>
                    {fmt$(analytics.marginOnWins)}
                  </div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                    AVG MARGIN: {analytics.avgMarginPct != null ? `${analytics.avgMarginPct.toFixed(1)}%` : "—"}
                  </div>
                </div>

                {analytics.avgLossGap != null && (
                  <div style={{ padding: 12, background: "#FFF", border: "1.5px solid var(--safety)", borderLeft: "4px solid var(--safety)" }}>
                    <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.1em" }}>AVG LOSS GAP</div>
                    <div className="fbt-display" style={{ fontSize: 20, color: "var(--safety)", marginTop: 4 }}>
                      {fmt$(analytics.avgLossGap)}
                    </div>
                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                      {analytics.avgLossGapPct != null ? `${analytics.avgLossGapPct > 0 ? "+" : ""}${analytics.avgLossGapPct.toFixed(1)}%` : ""} VS WINNER ({analytics.rejectedWithPricesCount} bids)
                    </div>
                  </div>
                )}
              </div>

              {/* Pipeline funnel */}
              <div style={{ marginBottom: 20 }}>
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ PIPELINE FUNNEL</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 2 }}>
                  {BID_STATUSES.map((s) => {
                    const count = analytics.funnel[s.value] || 0;
                    return (
                      <div key={s.value} style={{ padding: 8, background: s.bg, borderLeft: `3px solid ${s.color}`, textAlign: "center" }}>
                        <div style={{ fontSize: 18, color: s.color, fontWeight: 700, fontFamily: "Archivo Black, sans-serif" }}>{count}</div>
                        <div className="fbt-mono" style={{ fontSize: 9, color: s.color, letterSpacing: "0.05em", fontWeight: 700, marginTop: 2 }}>{s.label}</div>
                      </div>
                    );
                  })}
                </div>
                {analytics.submissionToAwardPct != null && (
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 8, letterSpacing: "0.05em" }}>
                    ▸ SUBMISSION → AWARD CONVERSION: <strong style={{ color: "var(--good)" }}>{analytics.submissionToAwardPct.toFixed(0)}%</strong>
                  </div>
                )}
              </div>

              {/* Agency performance breakdown */}
              {analytics.agencyStats.length > 0 && (
                <div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ PERFORMANCE BY AGENCY</div>
                  <div style={{ background: "#FFF", border: "1px solid var(--steel)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                      <thead>
                        <tr style={{ background: "var(--steel)", color: "var(--cream)" }}>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, letterSpacing: "0.05em" }}>AGENCY</th>
                          <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10, letterSpacing: "0.05em" }}>DECIDED</th>
                          <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10, letterSpacing: "0.05em" }}>WON</th>
                          <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10, letterSpacing: "0.05em" }}>WIN %</th>
                          <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10, letterSpacing: "0.05em" }}>REVENUE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.agencyStats.map((a) => (
                          <tr key={a.agency} style={{ borderTop: "1px solid #E7E5E4" }}>
                            <td style={{ padding: "8px 12px" }}>{a.agency}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right" }}>{a.total}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--good)", fontWeight: 700 }}>{a.awarded}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: a.winRatePct >= 50 ? "var(--good)" : a.winRatePct >= 25 ? "var(--hazard-deep)" : "var(--safety)" }}>
                              {a.winRatePct.toFixed(0)}%
                            </td>
                            <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt$(a.revenueWon)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Actions bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search bids by RFB#, title, agency, tags…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setEditingBid(null); setShowNew(true); }} className="btn-primary"><Plus size={16} /> NEW BID</button>
      </div>

      {/* Status filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          style={{
            padding: "6px 12px", fontSize: 11, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, letterSpacing: "0.05em",
            background: statusFilter === "all" ? "var(--steel)" : "#FFF",
            color: statusFilter === "all" ? "var(--cream)" : "var(--steel)",
            border: "1.5px solid var(--steel)",
            cursor: "pointer",
          }}
        >
          ALL ({counts.all})
        </button>
        {BID_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatusFilter(s.value)}
            style={{
              padding: "6px 12px", fontSize: 11, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, letterSpacing: "0.05em",
              background: statusFilter === s.value ? s.color : "#FFF",
              color: statusFilter === s.value ? "#FFF" : s.color,
              border: `1.5px solid ${s.color}`,
              cursor: "pointer",
              opacity: counts[s.value] === 0 ? 0.5 : 1,
            }}
          >
            {s.label} ({counts[s.value] || 0})
          </button>
        ))}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="fbt-card" style={{ padding: 40, textAlign: "center" }}>
          <FileText size={40} style={{ color: "var(--concrete)", margin: "0 auto 12px", display: "block" }} />
          <div className="fbt-display" style={{ fontSize: 16, marginBottom: 6 }}>NO BIDS YET</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.05em" }}>
            {bids.length === 0 ? "CLICK 'NEW BID' TO TRACK YOUR FIRST RFP" : "NO BIDS MATCH THESE FILTERS"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {sorted.map((b) => {
            const s = BID_STATUS_MAP[b.status] || BID_STATUSES[0];
            const isActive = !["awarded", "rejected", "abandoned"].includes(b.status);
            const projMargin = b.ourBidAmount && b.ourCostEstimate
              ? Number(b.ourBidAmount) - Number(b.ourCostEstimate)
              : null;
            return (
              <div
                key={b.id}
                onClick={() => setEditingBid(b)}
                className="fbt-card"
                style={{
                  padding: 14,
                  cursor: "pointer",
                  borderLeft: `6px solid ${s.color}`,
                  opacity: isActive ? 1 : 0.75,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span className="fbt-mono" style={{ fontSize: 10, padding: "2px 6px", background: s.color, color: "#FFF", fontWeight: 700, letterSpacing: "0.05em" }}>
                        {s.label}
                      </span>
                      {b.priority === "high" && (
                        <span className="fbt-mono" style={{ fontSize: 10, padding: "2px 6px", background: "var(--safety)", color: "#FFF", fontWeight: 700, letterSpacing: "0.05em" }}>
                          ★ HIGH
                        </span>
                      )}
                      {b.rfbNumber && (
                        <span className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", fontWeight: 700, letterSpacing: "0.05em" }}>
                          {b.rfbNumber}
                        </span>
                      )}
                      {isActive && b.submissionDueAt && (
                        <BidDeadlineChip dueAt={b.submissionDueAt} />
                      )}
                    </div>
                    <div className="fbt-display" style={{ fontSize: 16, marginBottom: 2 }}>{b.title}</div>
                    {b.agency && <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>▸ {b.agency}</div>}
                  </div>
                  <div style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
                    {b.ourBidAmount ? (
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--steel)" }}>{fmt$(b.ourBidAmount)}</div>
                    ) : b.estimatedValue ? (
                      <div style={{ color: "var(--concrete)" }}>est {fmt$(b.estimatedValue)}</div>
                    ) : null}
                    {projMargin !== null && isActive && (
                      <div style={{ color: projMargin > 0 ? "var(--good)" : "var(--safety)", marginTop: 2 }}>
                        margin {fmt$(projMargin)}
                      </div>
                    )}
                    {b.status === "rejected" && b.winningBidder && (
                      <div style={{ color: "var(--safety)", marginTop: 2 }}>lost to {b.winningBidder}</div>
                    )}
                  </div>
                </div>
                {/* v19a Session G: Checklist progress for active bids */}
                {isActive && (b.checklistItems || []).length > 0 && (() => {
                  const items = b.checklistItems;
                  const done = items.filter((x) => x.done).length;
                  const pct = Math.round((done / items.length) * 100);
                  const allDone = done === items.length;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                      <div style={{ flex: 1, maxWidth: 140, height: 4, background: "#E7E5E4", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: allDone ? "var(--good)" : "var(--hazard)" }} />
                      </div>
                      <span style={{ color: allDone ? "var(--good)" : "var(--concrete)", fontWeight: 700 }}>
                        {done}/{items.length} DOCS{allDone ? " ✓" : ""}
                      </span>
                    </div>
                  );
                })()}
                {(b.tags || []).length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                    {b.tags.map((t) => (
                      <span key={t} style={{ padding: "1px 6px", background: "#F5F5F4", color: "var(--concrete)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ========== MONTHLY P&L PANEL (v19b Session I) ==========
// Calculates monthly profit & loss from existing invoice + FB pay data.
// Both accrual (invoice date) and cash (payment date) views.
// Data sources:
//   - Revenue (accrual): invoice.total grouped by invoice.invoiceDate
//   - Revenue (cash):    invoice.paymentHistory[].amount grouped by payment.date
//   - Direct costs:      fb.paidAmount grouped by fb.paidAt
//   - Brokerage captured: sum of (fb gross * brok%) on paid-to-sub FBs for sub contacts with brokerageApplies
const MonthlyPLPanel = ({ invoices = [], freightBills = [], dispatches = [], contacts = [], onToast }) => {
  const [basis, setBasis] = useState("accrual"); // 'accrual' | 'cash'
  const [monthCount, setMonthCount] = useState(12);
  const [expandedMonth, setExpandedMonth] = useState(null); // "YYYY-MM" or null

  // Helper: get a "YYYY-MM" key from any date-like value
  const monthKey = (dateLike) => {
    if (!dateLike) return null;
    const d = new Date(dateLike);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };
  const monthLabel = (key) => {
    if (!key) return "—";
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
  };

  // Build last N months in descending order (newest first), including the current month
  const months = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = 0; i < monthCount; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      arr.push(`${y}-${m}`);
    }
    return arr;
  }, [monthCount]);

  // Compute metrics per month
  const monthlyData = useMemo(() => {
    const data = {};
    months.forEach((k) => {
      data[k] = {
        monthKey: k,
        accrualRevenue: 0,
        cashRevenue: 0,
        directCosts: 0,
        brokerageCaptured: 0,
        invoiceCount: 0,
        paymentCount: 0,
        fbPaidCount: 0,
        invoiceIds: [],
        fbIds: [],
      };
    });

    // Accrual revenue: invoices with invoiceDate in each month
    invoices.forEach((inv) => {
      const key = monthKey(inv.invoiceDate || inv.createdAt);
      if (!key || !data[key]) return;
      data[key].accrualRevenue += Number(inv.total) || 0;
      data[key].invoiceCount++;
      data[key].invoiceIds.push(inv.id);

      // Cash revenue: each payment in paymentHistory grouped by its own date
      (inv.paymentHistory || []).forEach((p) => {
        const payKey = monthKey(p.date);
        if (!payKey || !data[payKey]) return;
        data[payKey].cashRevenue += Number(p.amount) || 0;
        data[payKey].paymentCount++;
      });
    });

    // Direct costs: FB paidAmount grouped by paidAt
    // Brokerage captured: for sub assignments where contact.brokerageApplies, compute fb.gross * brok%
    freightBills.forEach((fb) => {
      if (!fb.paidAt || !fb.paidAmount) return;
      const key = monthKey(fb.paidAt);
      if (!key || !data[key]) return;
      data[key].directCosts += Number(fb.paidAmount) || 0;
      data[key].fbPaidCount++;
      data[key].fbIds.push(fb.id);

      // Brokerage captured — only on subs with brokerageApplies flag
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      const a = d ? (d.assignments || []).find((x) => x.aid === fb.assignmentId) : null;
      if (a && a.kind === "sub" && a.contactId) {
        const contact = contacts.find((c) => c.id === a.contactId);
        if (contact?.brokerageApplies) {
          // Compute gross from billing lines (v16) or fall back to estimate from paidAmount + brokerage
          const gross = (fb.billingLines || []).reduce((s, ln) => s + (Number(ln.gross) || 0), 0);
          if (gross > 0) {
            const brokPct = Number(contact.brokeragePercent) || 8;
            data[key].brokerageCaptured += gross * (brokPct / 100);
          }
        }
      }
    });

    return data;
  }, [months, invoices, freightBills, dispatches, contacts]);

  // Grand totals across all months shown
  const totals = useMemo(() => {
    const t = { accrualRevenue: 0, cashRevenue: 0, directCosts: 0, brokerageCaptured: 0, invoiceCount: 0, fbPaidCount: 0 };
    Object.values(monthlyData).forEach((m) => {
      t.accrualRevenue += m.accrualRevenue;
      t.cashRevenue += m.cashRevenue;
      t.directCosts += m.directCosts;
      t.brokerageCaptured += m.brokerageCaptured;
      t.invoiceCount += m.invoiceCount;
      t.fbPaidCount += m.fbPaidCount;
    });
    return t;
  }, [monthlyData]);

  const exportCSV = () => {
    const rows = [[
      "Month",
      "Revenue (Accrual)",
      "Revenue (Cash)",
      "Direct Costs",
      "Gross Margin (Accrual)",
      "Margin %",
      "Brokerage Captured",
      "Invoices",
      "FBs Paid",
    ]];
    months.forEach((k) => {
      const m = monthlyData[k];
      const margin = m.accrualRevenue - m.directCosts;
      const marginPct = m.accrualRevenue > 0 ? (margin / m.accrualRevenue) * 100 : 0;
      rows.push([
        monthLabel(k),
        m.accrualRevenue.toFixed(2),
        m.cashRevenue.toFixed(2),
        m.directCosts.toFixed(2),
        margin.toFixed(2),
        marginPct.toFixed(1) + "%",
        m.brokerageCaptured.toFixed(2),
        m.invoiceCount,
        m.fbPaidCount,
      ]);
    });
    // Totals row
    const totalMargin = totals.accrualRevenue - totals.directCosts;
    const totalMarginPct = totals.accrualRevenue > 0 ? (totalMargin / totals.accrualRevenue) * 100 : 0;
    rows.push([
      "TOTALS",
      totals.accrualRevenue.toFixed(2),
      totals.cashRevenue.toFixed(2),
      totals.directCosts.toFixed(2),
      totalMargin.toFixed(2),
      totalMarginPct.toFixed(1) + "%",
      totals.brokerageCaptured.toFixed(2),
      totals.invoiceCount,
      totals.fbPaidCount,
    ]);
    const csv = rowsToCSV(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pl-${monthCount}mo-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast(`✓ P&L EXPORTED · ${monthCount} MONTHS`);
  };

  // Show the invoices + FB pays for an expanded month
  const expandedDetail = expandedMonth ? monthlyData[expandedMonth] : null;
  const expandedInvoices = expandedDetail ? invoices.filter((i) => expandedDetail.invoiceIds.includes(i.id)) : [];
  const expandedFBs = expandedDetail ? freightBills.filter((f) => expandedDetail.fbIds.includes(f.id)) : [];

  return (
    <div className="fbt-card" style={{ padding: 20, background: "linear-gradient(135deg, #FFF, #F5F5F4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <BarChart3 size={22} style={{ color: "var(--steel)" }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="fbt-display" style={{ fontSize: 18 }}>MONTHLY P&L</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
            REVENUE · DIRECT COSTS · MARGIN · {basis === "accrual" ? "ACCRUAL BASIS (INVOICE DATE)" : "CASH BASIS (PAYMENT DATE)"}
          </div>
        </div>
        <button onClick={exportCSV} className="btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>
          <Download size={12} /> CSV
        </button>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", border: "1.5px solid var(--steel)" }}>
          <button
            type="button"
            onClick={() => setBasis("accrual")}
            style={{
              padding: "6px 12px", fontSize: 10, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, letterSpacing: "0.05em",
              background: basis === "accrual" ? "var(--steel)" : "#FFF",
              color: basis === "accrual" ? "var(--cream)" : "var(--steel)",
              border: "none", cursor: "pointer",
            }}
            title="Revenue counted when invoice is issued"
          >ACCRUAL</button>
          <button
            type="button"
            onClick={() => setBasis("cash")}
            style={{
              padding: "6px 12px", fontSize: 10, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, letterSpacing: "0.05em",
              background: basis === "cash" ? "var(--steel)" : "#FFF",
              color: basis === "cash" ? "var(--cream)" : "var(--steel)",
              border: "none", borderLeft: "1.5px solid var(--steel)", cursor: "pointer",
            }}
            title="Revenue counted when customer pays"
          >CASH</button>
        </div>
        <select className="fbt-select" style={{ padding: "6px 10px", fontSize: 11, width: "auto" }} value={monthCount} onChange={(e) => setMonthCount(Number(e.target.value))}>
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
          <option value={24}>Last 24 months</option>
        </select>
      </div>

      {/* Summary row */}
      {(() => {
        const totalRevenue = basis === "accrual" ? totals.accrualRevenue : totals.cashRevenue;
        const totalMargin = totalRevenue - totals.directCosts;
        const totalMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
            <div style={{ padding: 12, background: "#FFF", border: "1.5px solid var(--good)", borderLeft: "4px solid var(--good)" }}>
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.1em" }}>REVENUE · {monthCount}MO</div>
              <div className="fbt-display" style={{ fontSize: 22, color: "var(--good)", marginTop: 4 }}>{fmt$(totalRevenue)}</div>
            </div>
            <div style={{ padding: 12, background: "#FFF", border: "1.5px solid var(--safety)", borderLeft: "4px solid var(--safety)" }}>
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.1em" }}>DIRECT COSTS</div>
              <div className="fbt-display" style={{ fontSize: 22, color: "var(--safety)", marginTop: 4 }}>{fmt$(totals.directCosts)}</div>
            </div>
            <div style={{ padding: 12, background: "#FFF", border: "1.5px solid var(--steel)", borderLeft: `4px solid ${totalMargin >= 0 ? "var(--steel)" : "var(--safety)"}` }}>
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.1em" }}>GROSS MARGIN</div>
              <div className="fbt-display" style={{ fontSize: 22, color: totalMargin >= 0 ? "var(--steel)" : "var(--safety)", marginTop: 4 }}>{fmt$(totalMargin)}</div>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>{totalMarginPct.toFixed(1)}%</div>
            </div>
            {totals.brokerageCaptured > 0 && (
              <div style={{ padding: 12, background: "#FFF", border: "1.5px solid var(--hazard-deep)", borderLeft: "4px solid var(--hazard-deep)" }}>
                <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", letterSpacing: "0.1em" }}>BROKERAGE KEPT</div>
                <div className="fbt-display" style={{ fontSize: 22, color: "var(--hazard-deep)", marginTop: 4 }}>{fmt$(totals.brokerageCaptured)}</div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Monthly table */}
      <div style={{ background: "#FFF", border: "1.5px solid var(--steel)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "JetBrains Mono, monospace", minWidth: 600 }}>
          <thead>
            <tr style={{ background: "var(--steel)", color: "var(--cream)" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, letterSpacing: "0.05em" }}>MONTH</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10, letterSpacing: "0.05em" }}>REVENUE</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10, letterSpacing: "0.05em" }}>COSTS</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10, letterSpacing: "0.05em" }}>MARGIN</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10, letterSpacing: "0.05em" }}>%</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10, letterSpacing: "0.05em" }}>BROK</th>
              <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 10, letterSpacing: "0.05em", width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {months.map((k) => {
              const m = monthlyData[k];
              const revenue = basis === "accrual" ? m.accrualRevenue : m.cashRevenue;
              const margin = revenue - m.directCosts;
              const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
              const hasActivity = m.invoiceCount > 0 || m.fbPaidCount > 0;
              const isExpanded = expandedMonth === k;
              return (
                <React.Fragment key={k}>
                  <tr
                    style={{ borderTop: "1px solid #E7E5E4", cursor: hasActivity ? "pointer" : "default", background: isExpanded ? "#FEF3C7" : undefined }}
                    onClick={() => hasActivity && setExpandedMonth(isExpanded ? null : k)}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: 700 }}>{monthLabel(k)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: revenue > 0 ? "var(--good)" : "var(--concrete)" }}>
                      {revenue > 0 ? fmt$(revenue) : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: m.directCosts > 0 ? "var(--safety)" : "var(--concrete)" }}>
                      {m.directCosts > 0 ? fmt$(m.directCosts) : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: margin > 0 ? "var(--good)" : margin < 0 ? "var(--safety)" : "var(--concrete)" }}>
                      {revenue > 0 || m.directCosts > 0 ? fmt$(margin) : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: marginPct >= 20 ? "var(--good)" : marginPct >= 10 ? "var(--hazard-deep)" : marginPct > 0 ? "var(--safety)" : "var(--concrete)" }}>
                      {revenue > 0 ? `${marginPct.toFixed(1)}%` : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--hazard-deep)" }}>
                      {m.brokerageCaptured > 0 ? fmt$(m.brokerageCaptured) : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "var(--concrete)", fontSize: 10 }}>
                      {hasActivity ? (isExpanded ? "▲" : "▼") : ""}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0, background: "#FFFBEB" }}>
                        <div style={{ padding: 14, borderTop: "1px dashed var(--hazard-deep)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <div>
                              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 6 }}>
                                ▸ {expandedInvoices.length} INVOICE{expandedInvoices.length !== 1 ? "S" : ""} (ACCRUAL)
                              </div>
                              {expandedInvoices.length === 0 ? (
                                <div style={{ fontSize: 11, color: "var(--concrete)" }}>No invoices this month</div>
                              ) : (
                                <div style={{ display: "grid", gap: 3, fontSize: 11 }}>
                                  {expandedInvoices.slice(0, 20).map((i) => (
                                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px dotted #E7E5E4" }}>
                                      <span>{i.invoiceNumber} · {i.billToName?.slice(0, 30) || "—"}</span>
                                      <strong style={{ color: "var(--good)" }}>{fmt$(i.total)}</strong>
                                    </div>
                                  ))}
                                  {expandedInvoices.length > 20 && (
                                    <div style={{ fontSize: 10, color: "var(--concrete)", padding: "3px 0" }}>+ {expandedInvoices.length - 20} more…</div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 6 }}>
                                ▸ {expandedFBs.length} FB PAYMENT{expandedFBs.length !== 1 ? "S" : ""}
                              </div>
                              {expandedFBs.length === 0 ? (
                                <div style={{ fontSize: 11, color: "var(--concrete)" }}>No FB payments this month</div>
                              ) : (
                                <div style={{ display: "grid", gap: 3, fontSize: 11 }}>
                                  {expandedFBs.slice(0, 20).map((fb) => (
                                    <div key={fb.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px dotted #E7E5E4" }}>
                                      <span>FB#{fb.freightBillNumber || "—"} · {fb.driverName?.slice(0, 24) || "—"}</span>
                                      <strong style={{ color: "var(--safety)" }}>{fmt$(fb.paidAmount || 0)}</strong>
                                    </div>
                                  ))}
                                  {expandedFBs.length > 20 && (
                                    <div style={{ fontSize: 10, color: "var(--concrete)", padding: "3px 0" }}>+ {expandedFBs.length - 20} more…</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid var(--steel)", background: "#F5F5F4" }}>
              <td style={{ padding: "12px", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em" }}>TOTALS</td>
              <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "var(--good)" }}>
                {fmt$(basis === "accrual" ? totals.accrualRevenue : totals.cashRevenue)}
              </td>
              <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "var(--safety)" }}>
                {fmt$(totals.directCosts)}
              </td>
              <td style={{ padding: "12px", textAlign: "right", fontWeight: 700 }}>
                {(() => {
                  const r = basis === "accrual" ? totals.accrualRevenue : totals.cashRevenue;
                  const m = r - totals.directCosts;
                  return <span style={{ color: m >= 0 ? "var(--good)" : "var(--safety)" }}>{fmt$(m)}</span>;
                })()}
              </td>
              <td style={{ padding: "12px", textAlign: "right", fontWeight: 700 }}>
                {(() => {
                  const r = basis === "accrual" ? totals.accrualRevenue : totals.cashRevenue;
                  if (r === 0) return "—";
                  const pct = ((r - totals.directCosts) / r) * 100;
                  return `${pct.toFixed(1)}%`;
                })()}
              </td>
              <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "var(--hazard-deep)" }}>
                {fmt$(totals.brokerageCaptured)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 10, letterSpacing: "0.05em", lineHeight: 1.6 }}>
        ▸ ACCRUAL = INVOICE DATE · CASH = CUSTOMER PAYMENT DATE<br/>
        ▸ DIRECT COSTS = SUMS OF FB PAID AMOUNTS (WHAT YOU PAID SUBS/DRIVERS)<br/>
        ▸ BROKERAGE KEPT = MARGIN CAPTURED FROM SUBS WITH BROKERAGE APPLIED · APPROXIMATE<br/>
        ▸ CLICK ANY MONTH FOR INVOICE + PAYMENT DETAIL
      </div>
    </div>
  );
};

// ========== AUDIT LOG TAB (v20 Session O) ==========
// Global browsable feed of high-value actions with filters.
// Data source: audit_log table via fetchAuditLog().
// Retention: 90 days (enforced by purge_old_audit_logs SQL function).

const AUDIT_ACTION_LABELS = {
  "fb.approve":                "FB Approved",
  "fb.reject":                 "FB Rejected",
  "fb.paid":                   "Pay Run Executed",
  "fb.unpaid":                 "FB Un-marked Paid",
  "fb.soft_delete":            "FB Deleted",
  "invoice.create":            "Invoice Created",
  "invoice.payment_recorded":  "Payment Recorded",
  "invoice.payment_deleted":   "Payment Deleted",
  "invoice.soft_delete":       "Invoice Deleted",
  "dispatch.status_toggle":    "Dispatch Status Changed",
  "bid.create":                "Bid Created",
  "bid.status_change":         "Bid Status Changed",
  "bid.soft_delete":           "Bid Deleted",
  "quote.status_change":       "Quote Status Changed",
  "quote.convert":             "Quote Converted to Order",
};

const AUDIT_ACTION_COLORS = {
  "fb.approve":                { bg: "#DCFCE7", color: "#166534" },
  "fb.reject":                 { bg: "#FEE2E2", color: "#991B1B" },
  "fb.paid":                   { bg: "#FEF3C7", color: "#92400E" },
  "fb.unpaid":                 { bg: "#FEE2E2", color: "#991B1B" },
  "fb.soft_delete":            { bg: "#FEE2E2", color: "#991B1B" },
  "invoice.create":            { bg: "#E0F2FE", color: "#075985" },
  "invoice.payment_recorded":  { bg: "#DCFCE7", color: "#166534" },
  "invoice.payment_deleted":   { bg: "#FEE2E2", color: "#991B1B" },
  "invoice.soft_delete":       { bg: "#FEE2E2", color: "#991B1B" },
  "dispatch.status_toggle":    { bg: "#EDE9FE", color: "#6D28D9" },
  "bid.create":                { bg: "#E0F2FE", color: "#075985" },
  "bid.status_change":         { bg: "#FEF3C7", color: "#92400E" },
  "bid.soft_delete":           { bg: "#FEE2E2", color: "#991B1B" },
  "quote.status_change":       { bg: "#FEF3C7", color: "#92400E" },
  "quote.convert":             { bg: "#DCFCE7", color: "#166534" },
};

// Formats action-specific metadata for display. Returns a short string.
const formatAuditMetadata = (entry) => {
  const m = entry.metadata || {};
  switch (entry.actionType) {
    case "fb.paid":
      return `${m.subName || "—"} · ${m.fbCount || 0} FB${m.fbCount !== 1 ? "s" : ""} · ${m.method?.toUpperCase() || ""}${m.checkNumber ? ` #${m.checkNumber}` : ""} · ${fmt$(m.totalAmount || 0)}`;
    case "fb.unpaid":
      return `Reverted ${fmt$(m.previousAmount || 0)} · was ${m.previousMethod?.toUpperCase() || ""}${m.previousStatementNumber ? ` · ${m.previousStatementNumber}` : ""}`;
    case "fb.soft_delete":
      return m.reason ? `Reason: ${m.reason}` : "";
    case "invoice.create":
      return `${m.billToName || "—"} · ${m.fbCount || 0} FB${m.fbCount !== 1 ? "s" : ""} · ${fmt$(m.total || 0)}`;
    case "invoice.payment_recorded":
      return `${fmt$(m.amount || 0)} · ${m.method?.toUpperCase() || ""}${m.checkNumber ? ` #${m.checkNumber}` : ""} · now ${m.newStatus?.toUpperCase() || ""}`;
    case "invoice.payment_deleted":
      return `Removed ${fmt$(m.deletedAmount || 0)} · was ${m.deletedMethod?.toUpperCase() || ""}`;
    case "invoice.soft_delete":
      return `${fmt$(m.total || 0)} · ${m.fbsUnlocked || 0} FB${m.fbsUnlocked !== 1 ? "s" : ""} unlocked${m.reason ? ` · ${m.reason}` : ""}`;
    case "dispatch.status_toggle":
      return `${entry.before?.status?.toUpperCase() || ""} → ${entry.after?.status?.toUpperCase() || ""}`;
    case "bid.create":
      return `${m.agency || "—"} · ${m.status?.toUpperCase() || ""}`;
    case "bid.status_change":
      return `${entry.before?.status?.toUpperCase() || ""} → ${entry.after?.status?.toUpperCase() || ""}${m.agency ? ` · ${m.agency}` : ""}`;
    case "bid.soft_delete":
      return `${m.agency || ""}${m.reason ? ` · ${m.reason}` : ""}`;
    case "quote.status_change":
      return `${entry.before?.status?.toUpperCase() || ""} → ${entry.after?.status?.toUpperCase() || ""}`;
    case "quote.convert":
      return `→ Order #${m.newOrderCode}`;
    default:
      return "";
  }
};

const AuditLogRow = ({ entry, showEntity = true }) => {
  const colors = AUDIT_ACTION_COLORS[entry.actionType] || { bg: "#F5F5F4", color: "var(--steel)" };
  const label = AUDIT_ACTION_LABELS[entry.actionType] || entry.actionType;
  const meta = formatAuditMetadata(entry);
  const when = new Date(entry.happenedAt);
  return (
    <div className="fbt-card" style={{ padding: "10px 12px", borderLeft: `4px solid ${colors.color}` }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ padding: "2px 8px", background: colors.bg, color: colors.color, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>
          {label.toUpperCase()}
        </span>
        {showEntity && entry.entityLabel && (
          <span style={{ fontWeight: 700, fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>{entry.entityLabel}</span>
        )}
        <span style={{ fontSize: 11, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace", marginLeft: "auto" }}>
          {when.toLocaleDateString()} {when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          {entry.actor && entry.actor !== "admin" && <span> · {entry.actor}</span>}
        </span>
      </div>
      {meta && (
        <div style={{ fontSize: 11, color: "var(--steel)", fontFamily: "JetBrains Mono, monospace", marginTop: 6, paddingLeft: 2 }}>
          ▸ {meta}
        </div>
      )}
    </div>
  );
};

// ========== TESTIMONIALS TAB (v22 Session T) ==========
// Admin UI to manage customer/partner testimonials that appear on the public site.

const TestimonialModal = ({ testimonial, onSave, onClose, onToast }) => {
  const [draft, setDraft] = useState(testimonial || {
    quoteText: "", authorName: "", authorCompany: "", authorRole: "",
    rating: null, showOnWebsite: false, displayOrder: 0,
    source: "", collectedAt: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.quoteText.trim() || !draft.authorName.trim()) {
      alert("Quote and author name are required.");
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      onToast(testimonial ? "TESTIMONIAL UPDATED" : "TESTIMONIAL ADDED");
      onClose();
    } catch (e) {
      console.error("saveTestimonial:", e);
      onToast("⚠ SAVE FAILED");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <MessageSquare size={18} /> {testimonial ? "EDIT TESTIMONIAL" : "NEW TESTIMONIAL"}
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div>
            <label className="fbt-label">Quote</label>
            <textarea
              className="fbt-textarea"
              value={draft.quoteText}
              onChange={(e) => setDraft({ ...draft, quoteText: e.target.value })}
              placeholder="What the customer said. E.g. 'Clean paperwork, on-time delivery, never an excuse.'"
              rows={4}
              autoFocus
            />
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4, letterSpacing: "0.05em" }}>
              ▸ KEEP IT CONCISE — 1-3 SENTENCES READS BEST ON CARDS
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="fbt-label">Author Name *</label>
              <input className="fbt-input" value={draft.authorName} onChange={(e) => setDraft({ ...draft, authorName: e.target.value })} placeholder="e.g. Jim Morales" />
            </div>
            <div>
              <label className="fbt-label">Role / Title</label>
              <input className="fbt-input" value={draft.authorRole} onChange={(e) => setDraft({ ...draft, authorRole: e.target.value })} placeholder="e.g. Project Manager" />
            </div>
          </div>

          <div>
            <label className="fbt-label">Company</label>
            <input className="fbt-input" value={draft.authorCompany} onChange={(e) => setDraft({ ...draft, authorCompany: e.target.value })} placeholder="e.g. Mountain Cascade, Inc." />
          </div>

          <div>
            <label className="fbt-label">Rating (optional)</label>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDraft({ ...draft, rating: draft.rating === n ? null : n })}
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 24, color: draft.rating != null && n <= draft.rating ? "var(--hazard-deep)" : "var(--concrete)", padding: 2 }}
                >★</button>
              ))}
              <button
                type="button"
                onClick={() => setDraft({ ...draft, rating: null })}
                className="btn-ghost"
                style={{ padding: "4px 10px", fontSize: 10, marginLeft: 8 }}
              >CLEAR</button>
            </div>
          </div>

          <div style={{ padding: 14, border: "2px dashed var(--steel)", background: "#FAFAF9" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={!!draft.showOnWebsite} onChange={(e) => setDraft({ ...draft, showOnWebsite: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer", marginTop: 2 }} />
              <div>
                <div className="fbt-mono" style={{ fontSize: 12, letterSpacing: "0.08em", fontWeight: 700 }}>SHOW ON PUBLIC WEBSITE</div>
                <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4, fontFamily: "JetBrains Mono, monospace" }}>
                  Uncheck to keep private (draft mode).
                </div>
              </div>
            </label>
            {draft.showOnWebsite && (
              <div style={{ marginTop: 12 }}>
                <label className="fbt-label">Display Order</label>
                <input
                  className="fbt-input"
                  type="number"
                  value={draft.displayOrder || 0}
                  onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) || 0 })}
                  style={{ width: 140 }}
                />
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4, letterSpacing: "0.05em" }}>
                  ▸ LOWER NUMBERS SHOW FIRST
                </div>
              </div>
            )}
          </div>

          <details>
            <summary style={{ cursor: "pointer", fontFamily: "Oswald, sans-serif", fontSize: 12, letterSpacing: "0.1em", color: "var(--concrete)", textTransform: "uppercase", fontWeight: 600 }}>▸ INTERNAL NOTES (admin only)</summary>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="fbt-label">Source</label>
                  <input className="fbt-input" value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} placeholder="e.g. Email from 4/12" />
                </div>
                <div>
                  <label className="fbt-label">Date Collected</label>
                  <input className="fbt-input" type="date" value={draft.collectedAt || ""} onChange={(e) => setDraft({ ...draft, collectedAt: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="fbt-label">Notes</label>
                <textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Internal context, permission details, etc." rows={2} />
              </div>
            </div>
          </details>

          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <button onClick={save} className="btn-primary" disabled={saving}>
              <CheckCircle2 size={16} /> {saving ? "SAVING…" : "SAVE"}
            </button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TestimonialsTab = ({ onToast }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);  // null | {} (new) | existing row
  const [filter, setFilter] = useState("all");   // all | public | private

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchTestimonials();
      setItems(data);
    } catch (e) {
      console.error("fetchTestimonials:", e);
      onToast("⚠ COULDN'T LOAD TESTIMONIALS — TABLE MAY NOT EXIST YET");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (draft) => {
    if (draft.id) {
      // Update existing
      const current = items.find((i) => i.id === draft.id);
      const saved = await updateTestimonial(draft.id, draft, current?.updatedAt);
      setItems((prev) => prev.map((i) => i.id === saved.id ? saved : i));
    } else {
      const saved = await insertTestimonial(draft);
      setItems((prev) => [saved, ...prev]);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete testimonial from ${item.authorName}?\n\nThis is permanent.`)) return;
    try {
      await deleteTestimonial(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      onToast("TESTIMONIAL DELETED");
    } catch (e) {
      console.error("deleteTestimonial:", e);
      onToast("⚠ DELETE FAILED");
    }
  };

  const toggleVisibility = async (item) => {
    try {
      const saved = await updateTestimonial(item.id, { ...item, showOnWebsite: !item.showOnWebsite }, item.updatedAt);
      setItems((prev) => prev.map((i) => i.id === saved.id ? saved : i));
      onToast(saved.showOnWebsite ? "NOW VISIBLE ON WEBSITE" : "HIDDEN FROM WEBSITE");
    } catch (e) {
      console.error("toggle visibility:", e);
      onToast("⚠ UPDATE FAILED");
    }
  };

  const filtered = items.filter((i) => {
    if (filter === "public") return i.showOnWebsite;
    if (filter === "private") return !i.showOnWebsite;
    return true;
  });

  const publicCount = items.filter((i) => i.showOnWebsite).length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <MessageSquare size={22} style={{ color: "var(--steel)" }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="fbt-display" style={{ fontSize: 18 }}>TESTIMONIALS</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
            CUSTOMER + PARTNER QUOTES · {items.length} TOTAL · {publicCount} ON WEBSITE
          </div>
        </div>
        <button onClick={() => setEditing({})} className="btn-primary" style={{ padding: "8px 14px", fontSize: 12 }}>
          <Plus size={14} /> NEW
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[
          { v: "all", label: `All (${items.length})` },
          { v: "public", label: `On Website (${publicCount})` },
          { v: "private", label: `Drafts (${items.length - publicCount})` },
        ].map((opt) => (
          <button
            key={opt.v}
            onClick={() => setFilter(opt.v)}
            className="btn-ghost"
            style={{ padding: "6px 12px", fontSize: 11, background: filter === opt.v ? "var(--steel)" : "transparent", color: filter === opt.v ? "var(--cream)" : "var(--steel)" }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--concrete)" }}>
          LOADING...
        </div>
      ) : filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 40, textAlign: "center" }}>
          <MessageSquare size={40} style={{ color: "var(--concrete)", margin: "0 auto 12px", display: "block" }} />
          <div className="fbt-display" style={{ fontSize: 16, marginBottom: 6 }}>
            {items.length === 0 ? "NO TESTIMONIALS YET" : "NO MATCHES"}
          </div>
          {items.length === 0 && (
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.05em" }}>
              CLICK NEW TO ADD A CUSTOMER QUOTE
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((t) => (
            <div key={t.id} className="fbt-card" style={{ padding: 16, borderLeft: t.showOnWebsite ? "4px solid var(--good)" : "4px solid var(--concrete)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                    {t.showOnWebsite ? (
                      <span style={{ padding: "2px 8px", background: "#DCFCE7", color: "#166534", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "JetBrains Mono, monospace" }}>ON WEBSITE</span>
                    ) : (
                      <span style={{ padding: "2px 8px", background: "#F5F5F4", color: "var(--concrete)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "JetBrains Mono, monospace" }}>DRAFT</span>
                    )}
                    {t.rating > 0 && (
                      <span style={{ fontSize: 12, color: "var(--hazard-deep)", letterSpacing: "0.5px" }}>
                        {"★".repeat(t.rating)}<span style={{ color: "var(--concrete)" }}>{"★".repeat(5 - t.rating)}</span>
                      </span>
                    )}
                  </div>
                  <blockquote style={{ margin: 0, fontSize: 13, color: "var(--steel)", fontStyle: "italic", lineHeight: 1.5 }}>
                    "{t.quoteText.length > 180 ? t.quoteText.slice(0, 180) + "…" : t.quoteText}"
                  </blockquote>
                  <div style={{ marginTop: 8, fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)" }}>
                    ▸ <strong style={{ color: "var(--steel)" }}>{t.authorName}</strong>
                    {t.authorRole && <span> · {t.authorRole}</span>}
                    {t.authorCompany && <span> · {t.authorCompany}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    onClick={() => toggleVisibility(t)}
                    className="btn-ghost"
                    style={{ padding: "6px 10px", fontSize: 10 }}
                    title={t.showOnWebsite ? "Hide from website" : "Show on website"}
                  >
                    {t.showOnWebsite ? <><EyeOff size={12} /> HIDE</> : <><Eye size={12} /> SHOW</>}
                  </button>
                  <button onClick={() => setEditing(t)} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10 }}>
                    <Edit2 size={12} /> EDIT
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="btn-ghost"
                    style={{ padding: "6px 10px", fontSize: 10, color: "var(--safety)", borderColor: "var(--safety)" }}
                  >
                    <Trash2 size={12} /> DELETE
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <TestimonialModal
          testimonial={editing.id ? editing : null}
          onSave={handleSave}
          onClose={() => setEditing(null)}
          onToast={onToast}
        />
      )}
    </div>
  );
};

const AuditTab = ({ onToast }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchAuditLog({ limit: 500 });
        setEntries(data);
      } catch (e) {
        console.error("AuditTab load:", e);
        onToast("⚠ COULDN'T LOAD AUDIT LOG — TABLE MAY NOT EXIST YET");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (actionFilter !== "all" && e.actionType !== actionFilter) return false;
      if (dateFrom && e.happenedAt < new Date(dateFrom + "T00:00:00").toISOString()) return false;
      if (dateTo && e.happenedAt > new Date(dateTo + "T23:59:59").toISOString()) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = [
          e.entityLabel, e.actor, e.actionType,
          JSON.stringify(e.metadata || {}),
          formatAuditMetadata(e),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [entries, search, actionFilter, dateFrom, dateTo]);

  const counts = useMemo(() => {
    const c = { all: entries.length };
    entries.forEach((e) => { c[e.actionType] = (c[e.actionType] || 0) + 1; });
    return c;
  }, [entries]);

  const uniqueActions = Object.keys(AUDIT_ACTION_LABELS).filter((k) => counts[k] > 0);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <FileText size={22} style={{ color: "var(--steel)" }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="fbt-display" style={{ fontSize: 18 }}>AUDIT LOG</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
            HIGH-VALUE ACTIONS · 90-DAY RETENTION · {entries.length} TOTAL ENTRIES
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="fbt-card" style={{ padding: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div>
            <label className="fbt-label">Search</label>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
              <input className="fbt-input" style={{ paddingLeft: 36 }} placeholder="FB#, invoice#, customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="fbt-label">Action</label>
            <select className="fbt-select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="all">All actions ({counts.all || 0})</option>
              {uniqueActions.map((k) => (
                <option key={k} value={k}>{AUDIT_ACTION_LABELS[k]} ({counts[k] || 0})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fbt-label">From</label>
            <input type="date" className="fbt-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="fbt-label">To</label>
            <input type="date" className="fbt-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        {(search || actionFilter !== "all" || dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => { setSearch(""); setActionFilter("all"); setDateFrom(""); setDateTo(""); }}
            className="btn-ghost"
            style={{ padding: "4px 12px", fontSize: 10, alignSelf: "start" }}
          >
            <X size={10} /> CLEAR FILTERS
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
        ▸ {filtered.length} {filtered.length !== entries.length ? `OF ${entries.length} ` : ""}ENTR{filtered.length !== 1 ? "IES" : "Y"} SHOWN
      </div>

      {/* Feed */}
      {loading ? (
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--concrete)" }}>
          LOADING AUDIT LOG...
        </div>
      ) : filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 40, textAlign: "center" }}>
          <FileText size={40} style={{ color: "var(--concrete)", margin: "0 auto 12px", display: "block" }} />
          <div className="fbt-display" style={{ fontSize: 16, marginBottom: 6 }}>NO AUDIT ENTRIES</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.05em" }}>
            {entries.length === 0 ? "ACTIONS WILL SHOW HERE AS YOU USE THE APP" : "NO ENTRIES MATCH FILTERS"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {filtered.map((e) => <AuditLogRow key={e.id} entry={e} />)}
        </div>
      )}
    </div>
  );
};

// ========== DRIVER PERFORMANCE PANEL (v23 Session Z) ==========
// Per-driver and per-sub performance metrics from existing FB + dispatch data.
// Only uses data we can verify — no fake on-time % or synthetic scores.
//
// Metrics:
//   - Tons hauled (sum of fb.tonnage on approved/paid FBs)
//   - Loads completed (count of approved/paid FBs)
//   - Hours worked (sum of fb.hoursBilled)
//   - Revenue contributed (sum of fb billingLines gross — what customer was billed)
//   - Direct pay cost (sum of fb.paidAmount)
//   - Photo compliance (% FBs with photos)
//   - Reliability (submitted ÷ expected trucks across dispatches they were on)
const DriverPerformancePanel = ({ freightBills = [], dispatches = [], contacts = [], onToast }) => {
  const [scope, setScope] = useState("drivers"); // 'drivers' | 'subs'
  const [dateRange, setDateRange] = useState("90"); // '30' | '90' | '365' | 'all'
  const [expanded, setExpanded] = useState(null);
  const [sortBy, setSortBy] = useState("tons"); // tons | loads | revenue | reliability

  const cutoff = useMemo(() => {
    if (dateRange === "all") return null;
    const days = Number(dateRange);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  }, [dateRange]);

  const performance = useMemo(() => {
    const targetType = scope === "drivers" ? "driver" : "sub";
    const people = contacts.filter((c) => c.type === targetType);

    return people.map((person) => {
      // Find all dispatches where this contact is on an assignment
      const relatedDispatches = dispatches.filter((d) => {
        if (d.deletedAt) return false;
        return (d.assignments || []).some((a) => a.contactId === person.id);
      });

      // Find FBs — tied to this person via assignment OR via driverId (for drivers)
      const personFBs = freightBills.filter((fb) => {
        if (fb.deletedAt) return false;
        if (fb.status === "rejected") return false;
        if (cutoff && fb.submittedAt && fb.submittedAt < cutoff) return false;
        // Match by assignment
        const d = dispatches.find((x) => x.id === fb.dispatchId);
        if (d) {
          const assignment = (d.assignments || []).find((a) => a.aid === fb.assignmentId);
          if (assignment?.contactId === person.id) return true;
        }
        // Fallback: driverId match (for drivers)
        if (targetType === "driver" && fb.driverId === person.id) return true;
        return false;
      });

      // Calculate metrics
      const loadCount = personFBs.length;
      const totalTons = personFBs.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
      const totalHours = personFBs.reduce((s, fb) => s + (Number(fb.hoursBilled) || 0), 0);
      const revenueContributed = personFBs.reduce((s, fb) => {
        const lines = Array.isArray(fb.billingLines) ? fb.billingLines : [];
        return s + lines.reduce((ls, ln) => ls + (Number(ln.gross) || 0), 0);
      }, 0);
      const directPayCost = personFBs.reduce((s, fb) => s + (Number(fb.paidAmount) || 0), 0);
      const fbsWithPhotos = personFBs.filter((fb) => Array.isArray(fb.photos) && fb.photos.length > 0).length;
      const photoCompliance = loadCount > 0 ? (fbsWithPhotos / loadCount) * 100 : 0;

      // Reliability: did they submit for all expected trucks on dispatches they were assigned to?
      let totalExpected = 0;
      let totalSubmitted = 0;
      relatedDispatches.forEach((d) => {
        // Filter by date if cutoff active
        if (cutoff && d.createdAt && d.createdAt < cutoff) return;
        const theirAssignments = (d.assignments || []).filter((a) => a.contactId === person.id);
        theirAssignments.forEach((a) => {
          const expected = Number(a.trucks) || 1;
          const submitted = personFBs.filter((fb) => fb.dispatchId === d.id && fb.assignmentId === a.aid).length;
          totalExpected += expected;
          totalSubmitted += submitted;
        });
      });
      const reliability = totalExpected > 0 ? Math.min(100, (totalSubmitted / totalExpected) * 100) : null;

      return {
        person,
        loadCount,
        totalTons,
        totalHours,
        revenueContributed,
        directPayCost,
        photoCompliance,
        reliability,
        totalExpected,
        totalSubmitted,
        fbs: personFBs,
      };
    }).filter((row) => row.loadCount > 0 || row.totalExpected > 0);
  }, [scope, dateRange, cutoff, contacts, dispatches, freightBills]);

  const sorted = useMemo(() => {
    const list = [...performance];
    list.sort((a, b) => {
      if (sortBy === "tons") return b.totalTons - a.totalTons;
      if (sortBy === "loads") return b.loadCount - a.loadCount;
      if (sortBy === "revenue") return b.revenueContributed - a.revenueContributed;
      if (sortBy === "reliability") return (b.reliability ?? 0) - (a.reliability ?? 0);
      return 0;
    });
    return list;
  }, [performance, sortBy]);

  const totals = useMemo(() => {
    return performance.reduce((acc, r) => ({
      loadCount: acc.loadCount + r.loadCount,
      totalTons: acc.totalTons + r.totalTons,
      totalHours: acc.totalHours + r.totalHours,
      revenueContributed: acc.revenueContributed + r.revenueContributed,
      directPayCost: acc.directPayCost + r.directPayCost,
    }), { loadCount: 0, totalTons: 0, totalHours: 0, revenueContributed: 0, directPayCost: 0 });
  }, [performance]);

  const exportCSV = () => {
    const rows = [[
      scope === "drivers" ? "Driver" : "Subcontractor",
      "Loads", "Tons", "Hours",
      "Revenue Contributed", "Direct Pay Cost", "Margin",
      "Expected Trucks", "Submitted", "Reliability %",
      "Photo Compliance %",
    ]];
    sorted.forEach((r) => {
      const margin = r.revenueContributed - r.directPayCost;
      rows.push([
        r.person.contactName || r.person.companyName || "—",
        r.loadCount,
        r.totalTons.toFixed(2),
        r.totalHours.toFixed(2),
        r.revenueContributed.toFixed(2),
        r.directPayCost.toFixed(2),
        margin.toFixed(2),
        r.totalExpected,
        r.totalSubmitted,
        r.reliability != null ? r.reliability.toFixed(1) : "",
        r.photoCompliance.toFixed(1),
      ]);
    });
    const csv = rowsToCSV(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scope}-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast(`✓ ${scope.toUpperCase()} PERFORMANCE EXPORTED`);
  };

  return (
    <div className="fbt-card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <BarChart3 size={22} style={{ color: "var(--steel)" }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="fbt-display" style={{ fontSize: 18 }}>
            {scope === "drivers" ? "DRIVER" : "SUBCONTRACTOR"} PERFORMANCE
          </div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
            {performance.length} {scope === "drivers" ? "DRIVER" : "SUB"}{performance.length !== 1 ? "S" : ""} · {totals.loadCount} LOAD{totals.loadCount !== 1 ? "S" : ""} · {totals.totalTons.toFixed(0)} TONS
          </div>
        </div>
        <button onClick={exportCSV} disabled={sorted.length === 0} className="btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>
          <Download size={12} /> CSV
        </button>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", border: "1.5px solid var(--steel)" }}>
          <button
            type="button"
            onClick={() => setScope("drivers")}
            style={{
              padding: "6px 14px", fontSize: 10, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, letterSpacing: "0.05em",
              background: scope === "drivers" ? "var(--steel)" : "#FFF",
              color: scope === "drivers" ? "var(--cream)" : "var(--steel)",
              border: "none", cursor: "pointer",
            }}
          >DRIVERS</button>
          <button
            type="button"
            onClick={() => setScope("subs")}
            style={{
              padding: "6px 14px", fontSize: 10, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, letterSpacing: "0.05em",
              background: scope === "subs" ? "var(--steel)" : "#FFF",
              color: scope === "subs" ? "var(--cream)" : "var(--steel)",
              border: "none", borderLeft: "1.5px solid var(--steel)", cursor: "pointer",
            }}
          >SUBS</button>
        </div>

        <select className="fbt-select" style={{ padding: "6px 10px", fontSize: 11, width: "auto" }} value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
          <option value="all">All time</option>
        </select>

        <select className="fbt-select" style={{ padding: "6px 10px", fontSize: 11, width: "auto" }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="tons">Sort: Tons</option>
          <option value="loads">Sort: Loads</option>
          <option value="revenue">Sort: Revenue</option>
          <option value="reliability">Sort: Reliability</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "#FAFAF9", border: "1px dashed var(--concrete)" }}>
          <div className="fbt-display" style={{ fontSize: 14, marginBottom: 6, color: "var(--concrete)" }}>NO DATA</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
            NO {scope.toUpperCase()} ACTIVITY IN THIS DATE RANGE
          </div>
        </div>
      ) : (
        <div style={{ background: "#FFF", border: "1.5px solid var(--steel)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "JetBrains Mono, monospace", minWidth: 720 }}>
            <thead>
              <tr style={{ background: "var(--steel)", color: "var(--cream)" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, letterSpacing: "0.05em" }}>{scope === "drivers" ? "DRIVER" : "SUBCONTRACTOR"}</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10, letterSpacing: "0.05em" }}>LOADS</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10, letterSpacing: "0.05em" }}>TONS</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10, letterSpacing: "0.05em" }}>REVENUE</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10, letterSpacing: "0.05em" }}>MARGIN</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 10, letterSpacing: "0.05em" }}>RELIABILITY</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 10, letterSpacing: "0.05em" }}>PHOTOS</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 10, letterSpacing: "0.05em", width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const name = r.person.contactName || r.person.companyName || "—";
                const margin = r.revenueContributed - r.directPayCost;
                const marginPct = r.revenueContributed > 0 ? (margin / r.revenueContributed) * 100 : 0;
                const isExpanded = expanded === r.person.id;
                const relColor = r.reliability == null ? "var(--concrete)"
                  : r.reliability >= 95 ? "var(--good)"
                  : r.reliability >= 80 ? "var(--hazard-deep)"
                  : "var(--safety)";
                const photoColor = r.photoCompliance >= 90 ? "var(--good)"
                  : r.photoCompliance >= 70 ? "var(--hazard-deep)"
                  : "var(--safety)";

                return (
                  <React.Fragment key={r.person.id}>
                    <tr
                      style={{ borderTop: "1px solid #E7E5E4", cursor: "pointer", background: isExpanded ? "#FEF3C7" : undefined }}
                      onClick={() => setExpanded(isExpanded ? null : r.person.id)}
                    >
                      <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                        {name}
                        {r.person.companyName && r.person.contactName && (
                          <div style={{ fontSize: 10, color: "var(--concrete)", fontWeight: 400, marginTop: 2 }}>{r.person.companyName}</div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>{r.loadCount}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>{r.totalTons.toFixed(1)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: r.revenueContributed > 0 ? "var(--good)" : "var(--concrete)" }}>
                        {r.revenueContributed > 0 ? fmt$(r.revenueContributed) : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: margin >= 0 ? "var(--steel)" : "var(--safety)", fontWeight: 700 }}>
                        {r.revenueContributed > 0 || r.directPayCost > 0 ? fmt$(margin) : "—"}
                        {marginPct !== 0 && r.revenueContributed > 0 && (
                          <div style={{ fontSize: 10, color: "var(--concrete)", fontWeight: 400, marginTop: 2 }}>{marginPct.toFixed(0)}%</div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: relColor, fontWeight: 700 }}>
                        {r.reliability != null ? `${r.reliability.toFixed(0)}%` : "—"}
                        {r.totalExpected > 0 && (
                          <div style={{ fontSize: 10, color: "var(--concrete)", fontWeight: 400, marginTop: 2 }}>
                            {r.totalSubmitted}/{r.totalExpected}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: photoColor, fontWeight: 700 }}>
                        {r.photoCompliance.toFixed(0)}%
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "var(--concrete)", fontSize: 10 }}>
                        {isExpanded ? "▲" : "▼"}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={8} style={{ padding: 0, background: "#FFFBEB" }}>
                          <div style={{ padding: 14, borderTop: "1px dashed var(--hazard-deep)" }}>
                            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>
                              ▸ RECENT LOADS ({Math.min(r.fbs.length, 15)} OF {r.fbs.length})
                            </div>
                            <div style={{ display: "grid", gap: 4, fontSize: 11 }}>
                              {r.fbs.slice(0, 15).map((fb) => {
                                const d = dispatches.find((x) => x.id === fb.dispatchId);
                                const grossFromBilling = Array.isArray(fb.billingLines)
                                  ? fb.billingLines.reduce((s, ln) => s + (Number(ln.gross) || 0), 0)
                                  : 0;
                                return (
                                  <div key={fb.id} style={{ display: "flex", gap: 10, padding: "4px 0", borderBottom: "1px dotted #E7E5E4", flexWrap: "wrap", alignItems: "center" }}>
                                    <span style={{ fontWeight: 700, minWidth: 70 }}>FB #{fb.freightBillNumber || "—"}</span>
                                    <span style={{ color: "var(--concrete)", minWidth: 80 }}>
                                      {fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : "—"}
                                    </span>
                                    <span style={{ flex: 1, minWidth: 140 }}>{d?.jobName?.slice(0, 40) || "—"}</span>
                                    {fb.tonnage > 0 && <span style={{ color: "var(--steel)" }}>{Number(fb.tonnage).toFixed(1)} tn</span>}
                                    {grossFromBilling > 0 && <span style={{ color: "var(--good)", fontWeight: 700, minWidth: 80, textAlign: "right" }}>{fmt$(grossFromBilling)}</span>}
                                    <span style={{ padding: "1px 6px", fontSize: 9, background: fb.status === "approved" ? "#DCFCE7" : "#FEF3C7", color: fb.status === "approved" ? "#166534" : "#92400E", fontWeight: 700, letterSpacing: "0.05em" }}>
                                      {fb.status?.toUpperCase()}
                                    </span>
                                  </div>
                                );
                              })}
                              {r.fbs.length > 15 && (
                                <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>+ {r.fbs.length - 15} older loads…</div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 10, letterSpacing: "0.05em", lineHeight: 1.6 }}>
        ▸ REVENUE = WHAT CUSTOMER WAS BILLED FOR THIS {scope === "drivers" ? "DRIVER'S" : "SUB'S"} WORK (FROM BILLING LINES)<br/>
        ▸ MARGIN = REVENUE − DIRECT PAY COST (NOT INCLUDING OVERHEAD OR FUEL)<br/>
        ▸ RELIABILITY = SUBMITTED ÷ EXPECTED TRUCKS ON DISPATCHES THEY WERE ASSIGNED TO<br/>
        ▸ PHOTOS = % OF FBs WITH AT LEAST ONE SCALE TICKET OR LOAD PHOTO ATTACHED<br/>
        ▸ CLICK ANY ROW FOR RECENT LOAD DETAIL
      </div>
    </div>
  );
};

const ReportsTab = ({ dispatches, setDispatches, freightBills, logs, invoices, quotes, quarries, contacts, projects = [], company, editFreightBill, onToast, lastViewedMondayReport, setLastViewedMondayReport }) => {
  const [rangePreset, setRangePreset] = useState("lastweek");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // v18: Customer statement builder state
  const [stmtCustomerId, setStmtCustomerId] = useState("");
  const [stmtFromDate, setStmtFromDate] = useState("");
  const [stmtToDate, setStmtToDate] = useState("");
  const [stmtOpenOnly, setStmtOpenOnly] = useState(true);
  const customers = useMemo(() => (contacts || []).filter((c) => c.type === "customer"), [contacts]);

  const { from, to } = useMemo(() => {
    if (rangePreset === "lastweek") {
      const r = lastWeekRange();
      return { ...r, label: "Last week (Mon–Sun)" };
    }
    if (rangePreset === "thisweek") {
      const r = thisWeekRange();
      return { ...r, label: "This week" };
    }
    if (rangePreset === "last14") {
      return { ...daysAgoRange(14), label: "Last 14 days" };
    }
    if (rangePreset === "last30") {
      return { ...daysAgoRange(30), label: "Last 30 days" };
    }
    if (rangePreset === "custom" && customFrom && customTo) {
      return { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)), label: "Custom range" };
    }
    const r = lastWeekRange();
    return { ...r, label: "Last week (Mon–Sun)" };
  }, [rangePreset, customFrom, customTo]);

  const report = useMemo(
    () => computeReport({ from, to, dispatches, freightBills, logs, invoices, quotes, quarries, contacts }),
    [from, to, dispatches, freightBills, logs, invoices, quotes, quarries, contacts]
  );

  // Monday morning banner — show if today is Monday (5am-noon) and user hasn't viewed last week's report
  const now = new Date();
  const isMondayMorning = now.getDay() === 1 && now.getHours() >= 5 && now.getHours() < 12;
  const lwRange = lastWeekRange();
  const lwKey = toISODate(lwRange.from);
  const mondayPending = isMondayMorning && lastViewedMondayReport !== lwKey;

  useEffect(() => {
    // When viewing last week's report, mark it as viewed
    if (rangePreset === "lastweek" && isMondayMorning) {
      setLastViewedMondayReport(lwKey);
    }
  }, [rangePreset, isMondayMorning, lwKey]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {showArchiveModal && (
        <FBArchiveModal
          freightBills={freightBills}
          dispatches={dispatches}
          contacts={contacts}
          projects={projects}
          company={company}
          onClose={() => setShowArchiveModal(false)}
          onToast={onToast}
        />
      )}

      {/* FB Archive PDF card */}
      <div className="fbt-card" style={{ padding: 18, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "linear-gradient(135deg, var(--cream), #FEF3C7)", border: "2px solid var(--hazard-deep)" }}>
        <FileDown size={28} style={{ color: "var(--hazard-deep)" }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="fbt-display" style={{ fontSize: 18 }}>📂 FB ARCHIVE PDF</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4, letterSpacing: "0.05em" }}>
            EXPORT FREIGHT BILLS + SCALE TICKETS BY CUSTOMER · DATE · PROJECT
          </div>
        </div>
        <button onClick={() => setShowArchiveModal(true)} className="btn-primary" style={{ padding: "10px 18px" }}>
          <FileDown size={14} style={{ marginRight: 6 }} /> OPEN
        </button>
      </div>

      {/* v18: CUSTOMER STATEMENT BUILDER */}
      <div className="fbt-card" style={{ padding: 18, border: "2px solid var(--good)", background: "linear-gradient(135deg, #FFF, #F0FDF4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <Receipt size={24} style={{ color: "var(--good)" }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="fbt-display" style={{ fontSize: 18 }}>📄 CUSTOMER STATEMENT</div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4, letterSpacing: "0.05em" }}>
              EXPORT A/R STATEMENT FOR A CUSTOMER · RUNNING BALANCE · OPEN OR ALL INVOICES
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <label className="fbt-label" style={{ fontSize: 10 }}>Customer</label>
            <select className="fbt-select" value={stmtCustomerId} onChange={(e) => setStmtCustomerId(e.target.value)}>
              <option value="">— Pick a customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.favorite ? "★ " : ""}{c.companyName || c.contactName}
                  {c.companyName && c.contactName ? ` (${c.contactName})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="fbt-label" style={{ fontSize: 10 }}>From (Optional)</label>
            <input type="date" className="fbt-input" value={stmtFromDate} onChange={(e) => setStmtFromDate(e.target.value)} />
          </div>
          <div>
            <label className="fbt-label" style={{ fontSize: 10 }}>To (Optional)</label>
            <input type="date" className="fbt-input" value={stmtToDate} onChange={(e) => setStmtToDate(e.target.value)} />
          </div>
          <button
            type="button"
            disabled={!stmtCustomerId}
            onClick={() => {
              const cust = customers.find((c) => String(c.id) === String(stmtCustomerId));
              if (!cust) { onToast("PICK A CUSTOMER"); return; }
              try {
                generateCustomerStatementPDF({
                  customer: cust,
                  invoices,
                  company,
                  fromDate: stmtFromDate,
                  toDate: stmtToDate,
                  openOnly: stmtOpenOnly,
                });
                onToast("✓ STATEMENT OPENED");
              } catch (err) {
                console.error("Statement failed:", err);
                onToast("⚠ POPUP BLOCKED — ALLOW POPUPS");
              }
            }}
            className="btn-primary"
            style={{ padding: "8px 16px", whiteSpace: "nowrap", background: stmtCustomerId ? "var(--good)" : "var(--concrete)", color: "#FFF" }}
          >
            <FileDown size={13} style={{ marginRight: 4 }} /> GENERATE
          </button>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12 }}>
            <input type="checkbox" checked={stmtOpenOnly} onChange={(e) => setStmtOpenOnly(e.target.checked)} />
            <span className="fbt-mono" style={{ fontSize: 11 }}>Open invoices only (hide fully-paid)</span>
          </label>
          <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
            ▸ Leave both dates blank for all-time statement
          </span>
        </div>
      </div>

      {/* FB Search Panel at top */}
      <FBSearchPanel
        freightBills={freightBills}
        dispatches={dispatches}
        setDispatches={setDispatches}
        contacts={contacts}
        projects={projects}
        editFreightBill={editFreightBill}
        invoices={invoices}
        onToast={onToast}
        company={company}
      />

      {/* v19b Session I: Monthly P&L */}
      <MonthlyPLPanel
        invoices={invoices || []}
        freightBills={freightBills || []}
        dispatches={dispatches || []}
        contacts={contacts || []}
        onToast={onToast}
      />

      {/* v23 Session Z: Driver / Sub Performance */}
      <DriverPerformancePanel
        freightBills={freightBills || []}
        dispatches={dispatches || []}
        contacts={contacts || []}
        onToast={onToast}
      />

      {/* v18 Batch 2 Session D: FB Photo Gallery */}
      <div className="fbt-card" style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <Camera size={22} style={{ color: "var(--steel)" }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="fbt-display" style={{ fontSize: 18 }}>PHOTO GALLERY</div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
              SCALE TICKETS · LOAD PHOTOS · FIELD DOCUMENTATION · ALL FBs
            </div>
          </div>
        </div>
        <FBPhotoGallery
          freightBills={freightBills}
          dispatches={dispatches}
          contacts={contacts}
          projects={projects}
          invoices={invoices || []}
        />
      </div>

      {mondayPending && (
        <div className="fbt-card" style={{ padding: 18, background: "var(--hazard)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Calendar size={28} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="fbt-display" style={{ fontSize: 16 }}>📊 MONDAY MORNING RECAP</div>
            <div className="fbt-mono" style={{ fontSize: 12, color: "var(--steel)", marginTop: 4 }}>
              LAST WEEK'S REPORT IS READY ({toISODate(lwRange.from)} → {toISODate(lwRange.to)})
            </div>
          </div>
          <button onClick={() => setRangePreset("lastweek")} className="btn-ghost" style={{ borderColor: "var(--steel)" }}>
            VIEW NOW <ArrowRight size={14} style={{ marginLeft: 6 }} />
          </button>
        </div>
      )}

      {/* Range selector */}
      <div className="fbt-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Calendar size={18} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>REPORT RANGE</h3>
          <span className="fbt-mono" style={{ marginLeft: "auto", fontSize: 12, color: "var(--concrete)", letterSpacing: "0.08em" }}>
            {toISODate(from)} → {toISODate(to)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { k: "lastweek", l: "Last Week" },
            { k: "thisweek", l: "This Week" },
            { k: "last14", l: "Last 14 Days" },
            { k: "last30", l: "Last 30 Days" },
            { k: "custom", l: "Custom" },
          ].map((p) => (
            <button
              key={p.k}
              onClick={() => setRangePreset(p.k)}
              className="btn-ghost"
              style={{
                padding: "8px 14px", fontSize: 11,
                background: rangePreset === p.k ? "var(--steel)" : "transparent",
                color: rangePreset === p.k ? "var(--cream)" : "var(--steel)",
              }}
            >
              {p.l}
            </button>
          ))}
        </div>
        {rangePreset === "custom" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 14 }}>
            <div><label className="fbt-label">From</label><input className="fbt-input" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></div>
            <div><label className="fbt-label">To</label><input className="fbt-input" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></div>
          </div>
        )}
      </div>

      {/* Core metrics */}
      <div>
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ HEADLINE METRICS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div className="fbt-card" style={{ padding: 18 }}><div className="stat-num" style={{ fontSize: 36 }}>{report.openedCount}</div><div className="stat-label">Opened</div></div>
          <div className="fbt-card" style={{ padding: 18 }}><div className="stat-num" style={{ fontSize: 36 }}>{report.closedCount}</div><div className="stat-label">Closed</div></div>
          <div className="fbt-card" style={{ padding: 18 }}><div className="stat-num" style={{ fontSize: 36 }}>{report.billsCount}</div><div className="stat-label">Freight Bills</div></div>
          <div className="fbt-card" style={{ padding: 18 }}><div className="stat-num" style={{ fontSize: 36 }}>{report.totalTons.toFixed(1)}</div><div className="stat-label">Total Tons</div></div>
          <div className="fbt-card" style={{ padding: 18, background: "var(--hazard)" }}><div className="stat-num" style={{ fontSize: 32 }}>{fmt$(report.laborRevenue)}</div><div className="stat-label">Labor Revenue</div></div>
          <div className="fbt-card" style={{ padding: 18 }}><div className="stat-num" style={{ fontSize: 36 }}>{report.quotesCount}</div><div className="stat-label">New Quotes</div></div>
          <div className="fbt-card" style={{ padding: 18, background: "#D1FAE5" }}><div className="stat-num" style={{ fontSize: 32 }}>{fmt$(report.invoiceTotal)}</div><div className="stat-label">Invoiced ({report.invoicesCount})</div></div>
          <div className="fbt-card" style={{ padding: 18, background: report.incomplete.length > 0 ? "#FEE2E2" : "#FFF" }}><div className="stat-num" style={{ fontSize: 36, color: report.incomplete.length > 0 ? "var(--safety)" : "var(--good)" }}>{report.incomplete.length}</div><div className="stat-label">Incomplete</div></div>
        </div>
      </div>

      {/* Top clients */}
      <div className="fbt-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Award size={18} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>TOP CLIENTS BY TONNAGE</h3>
        </div>
        {report.topClients.length === 0 ? (
          <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace", textAlign: "center" }}>No data in this range</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {(() => {
              const max = report.topClients[0].tons || 1;
              return report.topClients.map((c, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr auto", gap: 10, alignItems: "center" }}>
                  <div className="fbt-display" style={{ fontSize: 16, color: i === 0 ? "var(--hazard-deep)" : "var(--concrete)" }}>{i + 1}</div>
                  <div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, marginBottom: 3 }}>{c.name}</div>
                    <div style={{ height: 6, background: "#E7E5E4" }}>
                      <div style={{ width: `${(c.tons / max) * 100}%`, height: "100%", background: i === 0 ? "var(--hazard)" : "var(--concrete)" }} />
                    </div>
                  </div>
                  <div className="fbt-display" style={{ fontSize: 14 }}>{c.tons.toFixed(1)}t</div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Two-col: Subs + Quarries */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Users size={18} style={{ color: "var(--hazard-deep)" }} />
            <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>TOP SUB-CONTRACTORS</h3>
          </div>
          {report.topSubs.length === 0 ? (
            <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace", textAlign: "center" }}>No sub-contractor activity</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {report.topSubs.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i === report.topSubs.length - 1 ? "none" : "1px solid #E7E5E4", fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>
                  <span>{s.name}</span>
                  <strong>{s.count} dispatches</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fbt-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Mountain size={18} style={{ color: "var(--hazard-deep)" }} />
            <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>QUARRY USAGE</h3>
          </div>
          {report.quarryUsage.length === 0 ? (
            <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace", textAlign: "center" }}>No quarry-sourced jobs</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {report.quarryUsage.map((q, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i === report.quarryUsage.length - 1 ? "none" : "1px solid #E7E5E4", fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>
                  <span>{q.name}</span>
                  <strong>{q.tons.toFixed(1)} tons</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quotes + Invoices */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Mail size={18} style={{ color: "var(--hazard-deep)" }} />
            <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>NEW QUOTES ({report.quotesCount})</h3>
          </div>
          {report.quotesList.length === 0 ? (
            <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace", textAlign: "center" }}>No new quotes</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {report.quotesList.slice(0, 8).map((q, i) => (
                <div key={i} style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", padding: "6px 0", borderBottom: "1px solid #E7E5E4" }}>
                  <strong>{q.name}</strong>{q.company && ` · ${q.company}`}
                  <div style={{ color: "var(--concrete)", fontSize: 11, marginTop: 2 }}>{q.service} · {new Date(q.submittedAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fbt-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Receipt size={18} style={{ color: "var(--hazard-deep)" }} />
            <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>INVOICES ({report.invoicesCount})</h3>
          </div>
          {report.invoicesList.length === 0 ? (
            <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace", textAlign: "center" }}>No invoices generated</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {report.invoicesList.map((inv, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "JetBrains Mono, monospace", padding: "6px 0", borderBottom: "1px solid #E7E5E4" }}>
                  <div><strong>{inv.num}</strong> · {inv.billTo}</div>
                  <div style={{ color: "var(--hazard-deep)", fontWeight: 700 }}>{fmt$(inv.total)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Incomplete dispatches */}
      <div className="fbt-card" style={{ padding: 20, borderLeft: `6px solid ${report.incomplete.length > 0 ? "var(--safety)" : "var(--good)"}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <AlertCircle size={18} style={{ color: report.incomplete.length > 0 ? "var(--safety)" : "var(--good)" }} />
          <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>INCOMPLETE DISPATCHES</h3>
        </div>
        {report.incomplete.length === 0 ? (
          <div style={{ padding: 14, background: "#D1FAE5", fontSize: 13, color: "var(--good)", fontFamily: "JetBrains Mono, monospace", textAlign: "center", fontWeight: 700 }}>✓ ALL DISPATCHES ACCOUNTED FOR</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {report.incomplete.map((d, i) => (
              <div key={i} style={{ padding: 10, border: "1.5px solid var(--safety)", background: "#FEE2E2", fontFamily: "JetBrains Mono, monospace", fontSize: 12, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <strong>#{d.code}</strong> · {d.jobName} · <span style={{ color: "var(--concrete)" }}>{fmtDate(d.date)}</span>
                </div>
                <div>MISSING {d.expected - d.submitted} / {d.expected}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export buttons */}
      <div className="fbt-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <FileDown size={18} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>EXPORT THIS REPORT</h3>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => openReportPrintWindow(report, company, onToast)} className="btn-primary">
            <Printer size={14} /> PRINT / SAVE AS PDF
          </button>
          <button onClick={() => { downloadReportCSV(report); onToast("CSV DOWNLOADED"); }} className="btn-ghost">
            <Download size={14} style={{ marginRight: 6 }} /> DOWNLOAD CSV
          </button>
        </div>
      </div>
    </div>
  );
};

// ========== DATA TAB ==========
const DataTab = ({ state, setters, onToast }) => {
  const [includePhotos, setIncludePhotos] = useState(true);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const ts = await storageGet("fbt:lastBackupAt");
      if (ts) setLastBackup(ts);
    })();
  }, []);

  const photosCount = (state.freightBills || []).reduce((s, fb) => s + (fb.photos?.length || 0), 0);
  const totalItems =
    (state.dispatches?.length || 0) +
    (state.freightBills?.length || 0) +
    (state.invoices?.length || 0) +
    (state.logs?.length || 0) +
    (state.quotes?.length || 0) +
    (state.fleet?.length || 0);

  const handleJsonExport = async () => {
    try {
      const { size } = downloadJSONBackup(state, { includePhotos });
      const now = new Date().toISOString();
      await storageSet("fbt:lastBackupAt", now);
      setLastBackup(now);
      const kb = Math.round(size / 1024);
      onToast(`JSON BACKUP DOWNLOADED · ${kb}KB`);
    } catch (e) {
      console.error(e);
      onToast("EXPORT FAILED");
    }
  };

  const handleCSVExport = () => {
    try {
      exportAllCSVs(state);
      onToast("CSVS DOWNLOADED");
    } catch (e) {
      console.error(e);
      onToast("CSV EXPORT FAILED");
    }
  };

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result;
        const obj = JSON.parse(text);
        const err = validateBackup(obj);
        if (err) {
          alert("Import failed:\n\n" + err);
          setImporting(false);
          e.target.value = "";
          return;
        }
        const counts = {
          dispatches: obj.dispatches?.length || 0,
          freightBills: obj.freightBills?.length || 0,
          invoices: obj.invoices?.length || 0,
          contacts: obj.contacts?.length || 0,
          quarries: obj.quarries?.length || 0,
          logs: obj.logs?.length || 0,
          quotes: obj.quotes?.length || 0,
          fleet: obj.fleet?.length || 0,
        };
        const msg =
          `Restore backup from ${obj._exportedAt?.slice(0, 10) || "unknown date"}?\n\n` +
          `This will REPLACE all current data with:\n` +
          `• ${counts.dispatches} dispatches\n` +
          `• ${counts.freightBills} freight bills${obj._includesPhotos ? " (with photos)" : " (photos stripped)"}\n` +
          `• ${counts.invoices} invoices\n` +
          `• ${counts.contacts} contacts\n` +
          `• ${counts.quarries} quarries\n` +
          `• ${counts.logs} hours logs\n` +
          `• ${counts.quotes} quote requests\n` +
          `• ${counts.fleet} fleet units\n\n` +
          `Current data will be permanently overwritten.`;
        if (!confirm(msg)) {
          setImporting(false);
          e.target.value = "";
          return;
        }
        // Apply
        await setters.setLogs(obj.logs || []);
        await setters.setQuotes(obj.quotes || []);
        await setters.setFleet(obj.fleet || []);
        await setters.setDispatches(obj.dispatches || []);
        await setters.setFreightBills(obj.freightBills || []);
        await setters.setInvoices(obj.invoices || []);
        if (setters.setContacts) await setters.setContacts(obj.contacts || []);
        if (setters.setQuarries) await setters.setQuarries(obj.quarries || []);
        if (obj.company) await setters.setCompany(obj.company);
        onToast("BACKUP RESTORED");
      } catch (err) {
        console.error(err);
        alert("Import failed:\n\nThe file is not valid JSON or is corrupted.");
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };
    reader.onerror = () => {
      alert("Couldn't read the file.");
      setImporting(false);
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const daysSinceBackup = daysSince(lastBackup);
  const backupStale = daysSinceBackup === null || daysSinceBackup >= 7;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Backup status */}
      <div className="fbt-card" style={{ padding: 20, background: backupStale ? "#FEF3C7" : "#FFF", borderLeft: `6px solid ${backupStale ? "var(--safety)" : "var(--good)"}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ width: 48, height: 48, background: backupStale ? "var(--safety)" : "var(--good)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF" }}>
            {backupStale ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="fbt-display" style={{ fontSize: 18 }}>
              {lastBackup ? (backupStale ? "BACKUP OVERDUE" : "BACKUP CURRENT") : "NO BACKUP YET"}
            </div>
            <div className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)", marginTop: 4 }}>
              {lastBackup
                ? `LAST BACKUP ▸ ${fmtDateTime(lastBackup)}${daysSinceBackup >= 1 ? ` · ${daysSinceBackup} DAY${daysSinceBackup !== 1 ? "S" : ""} AGO` : " · TODAY"}`
                : "▸ BACK UP NOW BEFORE YOU LOSE DATA"}
            </div>
          </div>
        </div>
      </div>

      {/* Data summary */}
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Database size={22} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>YOUR DATA</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
          {[
            { l: "Dispatches", v: state.dispatches?.length || 0 },
            { l: "Freight Bills", v: state.freightBills?.length || 0 },
            { l: "Photos", v: photosCount },
            { l: "Invoices", v: state.invoices?.length || 0 },
            { l: "Contacts", v: state.contacts?.length || 0 },
            { l: "Quarries", v: state.quarries?.length || 0 },
            { l: "Hours Logs", v: state.logs?.length || 0 },
            { l: "Quotes", v: state.quotes?.length || 0 },
            { l: "Fleet Units", v: state.fleet?.length || 0 },
          ].map((s, i) => (
            <div key={i} style={{ padding: 14, border: "2px solid var(--steel)", background: "#FFF" }}>
              <div className="fbt-display" style={{ fontSize: 28, lineHeight: 1 }}>{s.v}</div>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <HardDrive size={22} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>EXPORT BACKUP</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {/* JSON */}
          <div style={{ border: "2px solid var(--steel)", padding: 20, background: "#FFF" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <FileDown size={18} />
              <h4 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>FULL BACKUP (.JSON)</h4>
            </div>
            <p style={{ fontSize: 13, color: "var(--concrete)", margin: "0 0 14px", lineHeight: 1.5 }}>
              Everything in one file — can be restored later to bring all your data back exactly as it was.
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)", cursor: "pointer", marginBottom: 14 }}>
              <input type="checkbox" checked={includePhotos} onChange={(e) => setIncludePhotos(e.target.checked)} />
              INCLUDE {photosCount} SCALE TICKET PHOTOS {!includePhotos && photosCount > 0 && <span style={{ color: "var(--safety)" }}>(WILL BE LOST)</span>}
            </label>
            <button onClick={handleJsonExport} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              <Download size={16} /> DOWNLOAD BACKUP
            </button>
          </div>

          {/* CSV */}
          <div style={{ border: "2px solid var(--steel)", padding: 20, background: "#FFF" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <FileText size={18} />
              <h4 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>SPREADSHEETS (.CSV)</h4>
            </div>
            <p style={{ fontSize: 13, color: "var(--concrete)", margin: "0 0 14px", lineHeight: 1.5 }}>
              Separate CSV files for dispatches, freight bills, invoices, and hours. Open in Excel or Google Sheets.
            </p>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 14, lineHeight: 1.5 }}>
              ▸ NOTE: PHOTOS NOT INCLUDED (SPREADSHEETS CAN'T HOLD IMAGES). USE JSON IF YOU NEED TO RESTORE LATER.
            </div>
            <button onClick={handleCSVExport} className="btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
              <Download size={14} style={{ marginRight: 6 }} /> DOWNLOAD CSVS
            </button>
          </div>
        </div>
      </div>

      {/* Import */}
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <RefreshCw size={22} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>RESTORE FROM BACKUP</h3>
        </div>
        <p style={{ fontSize: 13, color: "var(--concrete)", margin: "0 0 16px", lineHeight: 1.5 }}>
          Load a <code style={{ background: "#F5F5F4", padding: "1px 6px", fontFamily: "JetBrains Mono, monospace" }}>.json</code> backup file to restore all data. Your current data will be <strong>replaced</strong>.
        </p>
        <div style={{ padding: 12, background: "#FEE2E2", border: "1px solid var(--safety)", color: "var(--safety)", fontSize: 12, fontFamily: "JetBrains Mono, monospace", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={14} /> WARNING: THIS OVERWRITES EVERYTHING. BACK UP CURRENT DATA FIRST IF YOU WANT TO KEEP IT.
        </div>
        <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleFilePick} />
        <button onClick={() => fileInputRef.current?.click()} className="btn-ghost" disabled={importing}>
          <Upload size={14} style={{ marginRight: 6 }} /> {importing ? "PROCESSING…" : "SELECT BACKUP FILE"}
        </button>
      </div>

      {/* Info */}
      <div className="fbt-card" style={{ padding: 20, background: "#F5F5F4" }}>
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 10 }}>▸ HOW BACKUPS WORK</div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.8, color: "var(--concrete)" }}>
          <li>A backup <strong>auto-downloads every time you tap Log Out</strong> — so you always have a recent copy</li>
          <li>Save backup files to <strong>Google Drive, iCloud, or Dropbox</strong> for off-device safety</li>
          <li>Keep the last 3-5 backups in case one gets corrupted</li>
          <li>Total { totalItems } record{ totalItems !== 1 ? "s" : "" } in your dataset right now</li>
        </ul>
      </div>
    </div>
  );
};

// ========== NOTIFICATION BELL ==========
const NotificationBell = ({ unreadIds, freightBills, dispatches, onJumpToDispatch, onMarkAllRead, onToggleSound, soundEnabled, onToggleBrowser, browserEnabled }) => {
  const [open, setOpen] = useState(false);
  const unreadBills = useMemo(() => {
    const set = new Set(unreadIds);
    return freightBills
      .filter((fb) => set.has(fb.id))
      .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""))
      .slice(0, 20);
  }, [unreadIds, freightBills]);

  const count = unreadIds.length;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost"
        style={{ color: count > 0 ? "var(--hazard)" : "var(--cream)", borderColor: count > 0 ? "var(--hazard)" : "var(--cream)", padding: "8px 12px", fontSize: 11, position: "relative" }}
        title={count > 0 ? `${count} new upload${count !== 1 ? "s" : ""}` : "No new notifications"}
      >
        <Bell size={14} fill={count > 0 ? "var(--hazard)" : "none"} />
        {count > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "var(--safety)", color: "#FFF",
            minWidth: 18, height: 18, padding: "0 5px",
            borderRadius: 9, fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--steel)", fontFamily: "JetBrains Mono, monospace",
          }}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 91,
            width: 360, maxWidth: "90vw", maxHeight: 500,
            background: "var(--cream)", border: "2px solid var(--steel)",
            boxShadow: "6px 6px 0 var(--hazard)", display: "flex", flexDirection: "column",
          }}>
            <div className="hazard-stripe-thin" style={{ height: 5 }} />
            <div style={{ padding: "14px 16px", borderBottom: "2px solid var(--steel)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--steel)", color: "var(--cream)" }}>
              <div className="fbt-display" style={{ fontSize: 14, letterSpacing: "0.05em" }}>NOTIFICATIONS</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={onToggleSound}
                  title={soundEnabled ? "Sound on" : "Sound off"}
                  style={{ background: "transparent", border: "1px solid var(--cream)", color: "var(--cream)", padding: "4px 6px", cursor: "pointer" }}
                >
                  {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                </button>
                <button
                  onClick={onToggleBrowser}
                  title={browserEnabled ? "Browser alerts on" : "Browser alerts off"}
                  style={{ background: "transparent", border: "1px solid var(--cream)", color: "var(--cream)", padding: "4px 6px", cursor: "pointer" }}
                >
                  {browserEnabled ? <Bell size={12} /> : <BellOff size={12} />}
                </button>
              </div>
            </div>

            {count === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--concrete)" }}>
                <Bell size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
                <div className="fbt-mono" style={{ fontSize: 11, letterSpacing: "0.1em" }}>ALL CAUGHT UP</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>You'll be notified when subs upload freight bills.</div>
              </div>
            ) : (
              <>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {unreadBills.map((fb) => {
                    const d = dispatches.find((x) => x.id === fb.dispatchId);
                    return (
                      <button
                        key={fb.id}
                        onClick={() => {
                          onJumpToDispatch(fb.dispatchId);
                          setOpen(false);
                        }}
                        style={{
                          width: "100%", textAlign: "left", padding: "12px 14px",
                          background: "transparent", border: "none",
                          borderBottom: "1px solid #E7E5E4", cursor: "pointer",
                          display: "flex", gap: 10, alignItems: "flex-start",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF3C7"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ width: 8, height: 8, background: "var(--safety)", borderRadius: "50%", marginTop: 6, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "Archivo Black, sans-serif", fontSize: 13 }}>
                            FB #{fb.freightBillNumber}
                            {fb.photos?.length > 0 && <span style={{ color: "var(--good)", fontSize: 11, marginLeft: 6 }}>📎{fb.photos.length}</span>}
                          </div>
                          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
                            {fb.driverName} · Truck {fb.truckNumber}
                          </div>
                          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                            {d ? `#${d.code} · ${d.jobName.slice(0, 32)}${d.jobName.length > 32 ? "…" : ""}` : "Dispatch deleted"}
                          </div>
                          <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginTop: 3, opacity: 0.7 }}>
                            {fmtDateTime(fb.submittedAt)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ padding: 10, borderTop: "2px solid var(--steel)", background: "#FAFAF9" }}>
                  <button onClick={() => { onMarkAllRead(); setOpen(false); }} className="btn-ghost" style={{ width: "100%", justifyContent: "center", padding: "8px", fontSize: 11 }}>
                    <CheckCircle2 size={12} style={{ marginRight: 6 }} /> MARK ALL AS READ
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ========== CUSTOMER PORTAL (public, token-based access) ==========
// ========== DRIVER / SUB PAY PORTAL (v23 Session Y) ==========
// Public page — sub/driver taps /#/pay/:token to see their pay activity.
// 90-day window enforced server-side. Privacy-first: only their own FBs.


// ========== DRIVER / SUB PAY PORTAL (v23 Session Y) ==========
// Public page at /#/pay/:token. Sub/driver sees their own pay activity only.
// Privacy: never shows other subs, customer amounts, or company margins.

const Dashboard = ({ state, setters, onToast, onExit, onLogout, onChangePassword }) => {
  const [tab, setTab] = useState("home");
  const { logs, quotes, bids, fleet, dispatches, freightBills, invoices, company, contacts, unreadIds, soundEnabled, browserNotifsEnabled, quarries, lastViewedMondayReport, projects } = state;
  const { setLogs, setQuotes, setBids, setFleet, setDispatches, setFreightBills, setInvoices, createInvoice, setCompany, setContacts, markAllRead, markDispatchRead, toggleSound, toggleBrowserNotifs, setQuarries, setLastViewedMondayReport, setProjects, editFreightBill } = setters;
  const [pendingDispatch, setPendingDispatch] = useState(null);
  const [pendingFB, setPendingFB] = useState(null); // FB id for Review tab to open
  const [pendingInvoice, setPendingInvoice] = useState(null); // Invoice id for Invoices tab
  const [pendingPaySubId, setPendingPaySubId] = useState(null); // Sub/driver id for Payroll tab
  const tabs = [
    { k: "home", l: "Home", ico: <Activity size={16} /> },
    { k: "dispatches", l: "Orders", ico: <ClipboardList size={16} /> },
    { k: "review", l: "Review", ico: <ShieldCheck size={16} /> },
    { k: "payroll", l: "Payroll", ico: <DollarSign size={16} /> },
    { k: "projects", l: "Projects", ico: <Briefcase size={16} /> },
    { k: "invoices", l: "Invoices", ico: <Receipt size={16} /> },
    { k: "contacts", l: "Contacts", ico: <Users size={16} /> },
    { k: "hours", l: "Hours", ico: <FileText size={16} /> },
    { k: "billing", l: "Billing", ico: <Fuel size={16} /> },
    { k: "quotes", l: "Quotes", ico: <Mail size={16} /> },
    { k: "bids", l: "Bids", ico: <FileText size={16} /> },
    { k: "fleet", l: "Fleet", ico: <Truck size={16} /> },
    { k: "materials", l: "Materials", ico: <Mountain size={16} /> },
    { k: "reports", l: "Reports", ico: <BarChart3 size={16} /> },
    { k: "recovery", l: "Recovery", ico: <History size={16} /> },
    { k: "audit", l: "Audit", ico: <FileText size={16} /> },
    { k: "testimonials", l: "Reviews", ico: <MessageSquare size={16} /> },
    { k: "data", l: "Data", ico: <Database size={16} /> },
  ];

  return (
    <div>
      <div style={{ background: "var(--steel)", color: "var(--cream)", borderBottom: "3px solid var(--hazard)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Logo size="sm" />
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", letterSpacing: "0.15em", borderLeft: "1px solid var(--concrete)", paddingLeft: 16 }}>▸ INTERNAL CONSOLE · LIVE</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <NotificationBell
              unreadIds={unreadIds || []}
              freightBills={freightBills}
              dispatches={dispatches}
              onJumpToDispatch={(did) => { setTab("dispatches"); setPendingDispatch(did); }}
              onMarkAllRead={markAllRead}
              onToggleSound={toggleSound}
              soundEnabled={soundEnabled}
              onToggleBrowser={toggleBrowserNotifs}
              browserEnabled={browserNotifsEnabled}
            />
            <button onClick={onChangePassword} className="btn-ghost" style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "8px 14px", fontSize: 11 }} title="Change password">
              <KeyRound size={12} style={{ marginRight: 4 }} /> PASSWORD
            </button>
            <button onClick={onExit} className="btn-ghost" style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "8px 14px", fontSize: 11 }}>
              ← PUBLIC SITE
            </button>
            <button onClick={onLogout} className="btn-ghost" style={{ color: "var(--hazard)", borderColor: "var(--hazard)", padding: "8px 14px", fontSize: 11 }}>
              <LogOut size={12} style={{ marginRight: 4 }} /> LOG OUT
            </button>
          </div>
        </div>
        <div className="fbt-nav-row" style={{ maxWidth: 1400, margin: "0 auto", padding: "0 12px 14px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tabs.map((t) => <button key={t.k} onClick={() => setTab(t.k)} className={`nav-tab ${tab === t.k ? "active" : ""}`}>{t.ico} {t.l}</button>)}
        </div>
      </div>
      <div className="fbt-page-content" style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 12px 80px" }}>
        {tab === "home" && <HomeTab freightBills={freightBills} dispatches={dispatches} contacts={contacts} projects={projects || []} invoices={invoices || []} quotes={quotes || []} bids={bids || []} company={company} onJumpTab={(k, payload) => {
          setTab(k);
          if (!payload) return;
          if (k === "dispatches") setPendingDispatch(payload);
          else if (k === "review") setPendingFB(payload);
          else if (k === "invoices") setPendingInvoice(payload);
          else if (k === "payroll") setPendingPaySubId(payload);
        }} onToast={onToast} />}
        {tab === "dispatches" && <DispatchesTab dispatches={dispatches} setDispatches={setDispatches} freightBills={freightBills} setFreightBills={setFreightBills} contacts={contacts} setContacts={setContacts} company={company} unreadIds={unreadIds || []} markDispatchRead={markDispatchRead} pendingDispatch={pendingDispatch} clearPendingDispatch={() => setPendingDispatch(null)} quarries={quarries || []} projects={projects || []} fleet={fleet || []} invoices={invoices || []} onToast={onToast} />}
        {tab === "projects" && <ProjectsTab projects={projects || []} setProjects={setProjects} contacts={contacts} dispatches={dispatches} freightBills={freightBills} invoices={invoices} onToast={onToast} />}
        {tab === "review" && <ReviewTab freightBills={freightBills} dispatches={dispatches} setDispatches={setDispatches} contacts={contacts} projects={projects || []} editFreightBill={editFreightBill} invoices={invoices || []} pendingFB={pendingFB} clearPendingFB={() => setPendingFB(null)} onToast={onToast} />}
        {tab === "payroll" && <PayrollTab freightBills={freightBills} dispatches={dispatches} setDispatches={setDispatches} contacts={contacts} projects={projects || []} invoices={invoices || []} editFreightBill={editFreightBill} company={company} pendingPaySubId={pendingPaySubId} clearPendingPaySubId={() => setPendingPaySubId(null)} onJumpToInvoice={(invId) => { setTab("invoices"); setPendingInvoice(invId); }} onToast={onToast} />}
        {tab === "invoices" && <InvoicesTab freightBills={freightBills} dispatches={dispatches} invoices={invoices} setInvoices={setInvoices} createInvoice={createInvoice} company={company} setCompany={setCompany} contacts={contacts || []} projects={projects || []} editFreightBill={editFreightBill} pendingInvoice={pendingInvoice} clearPendingInvoice={() => setPendingInvoice(null)} onJumpToPayroll={(subId) => { setTab("payroll"); setPendingPaySubId(subId); }} onToast={onToast} />}
        {tab === "contacts" && <ContactsTab contacts={contacts} setContacts={setContacts} dispatches={dispatches} freightBills={freightBills} invoices={invoices || []} company={company} onToast={onToast} />}
        {tab === "hours" && <HoursTab logs={logs} setLogs={setLogs} onToast={onToast} />}
        {tab === "billing" && <BillingTab logs={logs} onToast={onToast} />}
        {tab === "quotes" && <QuotesTab quotes={quotes} setQuotes={setQuotes} dispatches={dispatches} setDispatches={setDispatches} contacts={contacts} projects={projects || []} onJumpTab={(k, orderId) => { setTab(k); if (orderId) setPendingDispatch(orderId); }} onToast={onToast} />}
        {tab === "bids" && <BidsTab bids={bids || []} setBids={setBids} onToast={onToast} />}
        {tab === "fleet" && <FleetTab fleet={fleet} setFleet={setFleet} contacts={contacts} onToast={onToast} />}
        {tab === "materials" && <MaterialsTab quarries={quarries || []} setQuarries={setQuarries} dispatches={dispatches} onToast={onToast} />}
        {tab === "reports" && <ReportsTab dispatches={dispatches} setDispatches={setDispatches} freightBills={freightBills} logs={logs} invoices={invoices} quotes={quotes} quarries={quarries || []} contacts={contacts || []} projects={projects || []} company={company} editFreightBill={editFreightBill} onToast={onToast} lastViewedMondayReport={lastViewedMondayReport} setLastViewedMondayReport={setLastViewedMondayReport} />}
        {tab === "recovery" && <RecoveryTab onToast={onToast} />}
        {tab === "audit" && <AuditTab onToast={onToast} />}
        {tab === "testimonials" && <TestimonialsTab onToast={onToast} />}
        {tab === "data" && <DataTab state={state} setters={setters} onToast={onToast} />}
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState("public");
  const [logs, setLogs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  // v19 Batch 3 Session F: bids/RFP tracker
  const [bids, setBids] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [freightBills, setFreightBills] = useState([]);
  const [invoices, setInvoicesState] = useState([]);
  const [contacts, setContactsState] = useState([]);
  const [quarries, setQuarriesState] = useState([]);
  const [projects, setProjectsState] = useState([]);
  const [lastViewedMondayReport, setLastViewedMondayReportState] = useState(null);
  const [company, setCompanyState] = useState({ name: "4 Brothers Trucking, LLC", address: "Bay Point, CA", phone: "", email: "", usdot: "", logoDataUrl: null, defaultTerms: "Net 30. Remit by check or ACH." });
  const [toast, setToast] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [route, setRoute] = useState(() => window.location.hash);

  // Auth state
  // Auth state (Supabase)
  const [authed, setAuthed] = useState(false);
  // v20 Session Q: Idle session timeout
  // After 30 min of inactivity, show a 60-second warning dialog. If user doesn't respond, log out.
  const [idleWarning, setIdleWarning] = useState(false);   // true = warning dialog showing
  const [idleCountdown, setIdleCountdown] = useState(60);  // seconds remaining on warning
  // useRef initializer runs on every render; passing 0 then setting in effect
  // sidesteps the react-hooks/purity warning while preserving semantics.
  const lastActivityRef = useRef(0);
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;   // 30 min until warning
  const IDLE_WARNING_SEC = 60;              // 60 sec from warning until forced logout
  const [showChangePw, setShowChangePw] = useState(false);

  // Notification state
  const [seenFbIds, setSeenFbIds] = useState([]); // ids of freight bills the user has already seen
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [browserNotifsEnabled, setBrowserNotifsEnabled] = useState(false);
  const prevFbIdsRef = useRef(new Set());
  const firstLoadRef = useRef(true);
  // v17 fix: ref holds latest dispatches for subscription callbacks without re-triggering the effect.
  // Reading from state inside a subscription closure gives stale data; using a ref keeps it fresh
  // without forcing the subscription to tear down + rebuild on every change.
  const dispatchesRef = useRef([]);
  const soundEnabledRef = useRef(true);
  const browserNotifsEnabledRef = useRef(false);

  useEffect(() => {
    const handler = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  useEffect(() => {
    (async () => {
      // Check Supabase session first
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setAuthed(true);
        // v17 fix: if we have a valid session on page load, go straight to dashboard.
        // Don't send authed users to the public page — that was the "refresh dumps me to login" bug.
        setView("dashboard");
      }

      // Listen for auth changes (login/logout from other tabs)
      supabase.auth.onAuthStateChange((event, _sess) => {
        if (event === "SIGNED_IN") { setAuthed(true); setView("dashboard"); }
        if (event === "SIGNED_OUT") { setAuthed(false); setView("public"); }
      });

      // v20 Session Q: Idle session detection
      // Seed lastActivityRef now (initial useRef value is 0; setting Date.now()
      // here keeps render-side state pure for react-hooks/purity).
      lastActivityRef.current = Date.now();
      // Track user activity via common events. Reset lastActivityRef on any interaction.
      const markActive = () => {
        lastActivityRef.current = Date.now();
        // If warning dialog was showing, user has returned — dismiss it.
        if (idleWarning) {
          setIdleWarning(false);
          setIdleCountdown(IDLE_WARNING_SEC);
        }
      };
      const activityEvents = ["mousedown", "keydown", "scroll", "touchstart", "click"];
      activityEvents.forEach((evt) => window.addEventListener(evt, markActive, { passive: true }));

      // Check for idle every 10 seconds. We intentionally don't clear this:
      // Dashboard is the top-level view so the interval lives for the app's lifetime.
      setInterval(() => {
        const idleMs = Date.now() - lastActivityRef.current;
        if (idleMs >= IDLE_TIMEOUT_MS) {
          setIdleWarning(true);
        }
      }, 10000);

      // Cleanup
      // (note: we can't easily return cleanup from inside the async IIFE above, so the listeners
      //  persist for the app's lifetime — that's fine since Dashboard is the top-level view)

      // Load dispatches + freight bills + contacts + quarries + invoices + projects + quotes + bids from Supabase
      const [cloudDispatches, cloudFreightBills, cloudContacts, cloudQuarries, cloudInvoices, cloudProjects, cloudQuotes, cloudBids] = await Promise.all([
        fetchDispatches(),
        fetchFreightBills(),
        fetchContacts(),
        fetchQuarries(),
        fetchInvoices(),
        fetchProjects(),
        fetchQuotes(),
        fetchBids(),  // v19 Session F
      ]);
      setDispatches(cloudDispatches);
      setFreightBills(cloudFreightBills);
      setContactsState(cloudContacts);
      setQuarriesState(cloudQuarries);
      setInvoicesState(cloudInvoices);
      setProjectsState(cloudProjects);
      setQuotes(cloudQuotes);
      setBids(cloudBids);  // v19 Session F
      prevFbIdsRef.current = new Set(cloudFreightBills.map((x) => x.id));

      // v17: Auto-purge soft-deleted rows older than 30 days (fire-and-forget).
      // Runs once on app load. Safe to run multiple times — idempotent.
      autoPurgeDeleted(30).then((r) => {
        const total = (r.dispatches || 0) + (r.freightBills || 0) + (r.invoices || 0) + (r.quotes || 0);
        if (total > 0) {
          console.log(`[auto-purge] Removed ${total} old soft-deleted row(s):`, r);
        }
        if (r.errors?.length) console.warn("[auto-purge] errors:", r.errors);
      }).catch((e) => console.warn("[auto-purge] failed:", e));

      // Load local-cached preferences (these don't need cloud sync)
      const [seen, notifPrefs, lvmr] = await Promise.all([
        storageGet("fbt:seenFbIds"), storageGet("fbt:notifPrefs"),
        storageGet("fbt:lastViewedMondayReport"),
      ]);
      if (seen) setSeenFbIds(seen);
      if (notifPrefs) {
        if (typeof notifPrefs.soundEnabled === "boolean") setSoundEnabled(notifPrefs.soundEnabled);
        if (typeof notifPrefs.browserNotifsEnabled === "boolean") setBrowserNotifsEnabled(notifPrefs.browserNotifsEnabled);
      }
      if (lvmr) setLastViewedMondayReportState(lvmr);

      // Hours + fleet + company still use local storage (not critical to sync across devices)
      // v18: quotes moved to Supabase — no longer loaded from localStorage
      const [l, f, co] = await Promise.all([
        storageGet("fbt:logs"), storageGet("fbt:fleet"),
        storageGet("fbt:company"),
      ]);
      if (l) setLogs(l); if (f) setFleet(f);
      if (co) setCompanyState((prev) => ({ ...prev, ...co }));

      setLoaded(true);
    })();
  }, []);

  // v17 fix: keep refs synced to latest state so subscription callbacks see fresh values
  // without triggering subscription tear-down.
  useEffect(() => { dispatchesRef.current = dispatches; }, [dispatches]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { browserNotifsEnabledRef.current = browserNotifsEnabled; }, [browserNotifsEnabled]);

  // Supabase realtime subscriptions — fire when data changes from ANY device
  useEffect(() => {
    if (!authed || !loaded) return;

    firstLoadRef.current = true;
    setTimeout(() => { firstLoadRef.current = false; }, 2000);

    const unsubFB = subscribeToFreightBills(async (_payload) => {
      // Refetch to get fresh data
      const fresh = await fetchFreightBills();
      const freshIds = new Set(fresh.map((x) => x.id));
      const newOnes = fresh.filter((fb) => !prevFbIdsRef.current.has(fb.id));

      if (newOnes.length > 0 && !firstLoadRef.current) {
        newOnes.forEach((fb) => {
          // Read latest dispatches from ref, not stale closure
          const d = dispatchesRef.current.find((x) => x.id === fb.dispatchId);
          const title = `New freight bill: FB #${fb.freightBillNumber}`;
          const body = `${fb.driverName || "Driver"} · Truck ${fb.truckNumber || "?"}${d ? ` · ${d.jobName}` : ""}`;
          if (browserNotifsEnabledRef.current) fireBrowserNotif(title, body, `fb-${fb.id}`);
        });
        if (soundEnabledRef.current) playDing();
      }
      setFreightBills(fresh);
      prevFbIdsRef.current = freshIds;
    });

    const unsubD = subscribeToDispatches(async () => {
      const fresh = await fetchDispatches();
      setDispatches(fresh);
    });

    const unsubC = subscribeToContacts(async () => {
      const fresh = await fetchContacts();
      setContactsState(fresh);
    });

    const unsubQ = subscribeToQuarries(async () => {
      const fresh = await fetchQuarries();
      setQuarriesState(fresh);
    });

    const unsubI = subscribeToInvoices(async () => {
      const fresh = await fetchInvoices();
      setInvoicesState(fresh);
    });

    const unsubP = subscribeToProjects(async () => {
      const fresh = await fetchProjects();
      setProjectsState(fresh);
    });

    // v18: Quotes subscription — admin sees new quote requests instantly
    const unsubQuotes = subscribeToQuotes(async () => {
      const fresh = await fetchQuotes();
      setQuotes(fresh);
    });

    // v19 Session F: Bids subscription
    const unsubBids = subscribeToBids(async () => {
      const fresh = await fetchBids();
      setBids(fresh);
    });

    return () => {
      unsubFB?.();
      unsubD?.();
      unsubC?.();
      unsubQ?.();
      unsubI?.();
      unsubP?.();
      unsubQuotes?.();
      unsubBids?.();
    };
    // v17 FIX: only re-subscribe when auth/load state changes.
    // Previously depended on [dispatches, soundEnabled, browserNotifsEnabled] which caused
    // the subscriptions to tear down + rebuild on every state change — dropping realtime events
    // during the gap. Using refs (above) keeps callbacks seeing fresh data without churn.
  }, [authed, loaded]);

  // Keep seenFbIds storage in sync
  useEffect(() => {
    if (loaded) storageSet("fbt:seenFbIds", seenFbIds);
  }, [seenFbIds, loaded]);

  useEffect(() => {
    if (loaded) storageSet("fbt:notifPrefs", { soundEnabled, browserNotifsEnabled });
  }, [soundEnabled, browserNotifsEnabled, loaded]);

  // Unread = freight bills that exist but aren't in seen set
  const unreadIds = useMemo(() => {
    const seen = new Set(seenFbIds);
    return freightBills.filter((fb) => !seen.has(fb.id)).map((fb) => fb.id);
  }, [freightBills, seenFbIds]);

  const markAllRead = () => {
    setSeenFbIds(freightBills.map((fb) => fb.id));
  };
  const markDispatchRead = (dispatchId) => {
    const dispatchFbIds = freightBills.filter((fb) => fb.dispatchId === dispatchId).map((fb) => fb.id);
    setSeenFbIds((prev) => Array.from(new Set([...prev, ...dispatchFbIds])));
  };

  const toggleSound = () => {
    setSoundEnabled((v) => !v);
    if (!soundEnabled) playDing(); // preview
  };

  const toggleBrowserNotifs = async () => {
    if (!browserNotifsEnabled) {
      const perm = await requestBrowserNotif();
      if (perm === "granted") {
        setBrowserNotifsEnabled(true);
        showToast("BROWSER ALERTS ON");
      } else if (perm === "denied") {
        showToast("PERMISSION DENIED — CHECK BROWSER SETTINGS");
      } else if (perm === "unsupported") {
        showToast("BROWSER DOESN'T SUPPORT NOTIFICATIONS");
      }
    } else {
      setBrowserNotifsEnabled(false);
      showToast("BROWSER ALERTS OFF");
    }
  };

  const setCompany = async (val) => { setCompanyState(val); await storageSet("fbt:company", val); };
  const setLastViewedMondayReport = async (val) => { setLastViewedMondayReportState(val); await storageSet("fbt:lastViewedMondayReport", val); };

  // Dispatch & freight bill operations — now go through Supabase.
  // The setter receives the NEW FULL ARRAY (how the UI calls it today).
  // We diff against current state to figure out insert/update/delete.
  // Optimistic: update local state immediately, then reconcile with server
  // truth (real IDs / updatedAt) when the API calls finish. On failure
  // we roll back to `previous` so the UI doesn't lie about what's saved.
  const setDispatchesShared = async (val) => {
    const previous = dispatches;
    setDispatches(val);  // optimistic — UI reflects change instantly

    const currentMap = new Map(previous.map((d) => [d.id, d]));
    const newMap = new Map(val.map((d) => [d.id, d]));

    try {
      // Deletes: in current but not in new
      for (const [id] of currentMap) {
        if (!newMap.has(id) && !String(id).startsWith("temp-")) {
          await deleteDispatch(id);
        }
      }
      // Inserts & updates
      const saved = [];
      for (const d of val) {
        if (!currentMap.has(d.id) || String(d.id).startsWith("temp-")) {
          // New — insert
          const { id: _drop, ...rest } = d;
          const newRow = await insertDispatch(rest);
          saved.push(newRow);
        } else {
          // Possibly update — only if it actually changed
          const prev = currentMap.get(d.id);
          const fieldsChanged = JSON.stringify(prev) !== JSON.stringify(d);
          if (fieldsChanged) {
            const updated = await updateDispatch(d.id, d);
            saved.push(updated);
          } else {
            saved.push(d);
          }
        }
      }
      setDispatches(saved);
    } catch (e) {
      console.error("setDispatchesShared failed:", e);
      setDispatches(previous);  // roll back the optimistic update
      showToast("⚠ SAVE FAILED — REVERTED LOCAL CHANGES. CHECK CONNECTION.");
    }
  };

  const setFreightBillsShared = async (val) => {
    const previous = freightBills;
    setFreightBills(val);  // optimistic
    prevFbIdsRef.current = new Set(val.map((x) => x.id));

    const currentMap = new Map(previous.map((fb) => [fb.id, fb]));
    const newMap = new Map(val.map((fb) => [fb.id, fb]));

    try {
      for (const [id] of currentMap) {
        if (!newMap.has(id) && !String(id).startsWith("temp-")) {
          await deleteFreightBill(id);
        }
      }
      const saved = [];
      for (const fb of val) {
        if (!currentMap.has(fb.id) || String(fb.id).startsWith("temp-")) {
          const { id: _drop, ...rest } = fb;
          const newRow = await insertFreightBill(rest);
          saved.push(newRow);
        } else {
          saved.push(fb);
        }
      }
      setFreightBills(saved);
      prevFbIdsRef.current = new Set(saved.map((x) => x.id));
    } catch (e) {
      console.error("setFreightBillsShared failed:", e);
      setFreightBills(previous);  // roll back
      prevFbIdsRef.current = new Set(previous.map((x) => x.id));
      showToast("⚠ SAVE FAILED — REVERTED FB CHANGES. CHECK CONNECTION.");
    }
  };

  const showToast = (msg) => setToast(msg);

  // --- Contacts (Supabase) ---
  const setContacts = async (val) => {
    const previous = contacts;
    setContactsState(val);  // optimistic
    const currentMap = new Map(previous.map((c) => [c.id, c]));
    const newMap = new Map(val.map((c) => [c.id, c]));
    try {
      for (const [id] of currentMap) {
        if (!newMap.has(id) && !String(id).startsWith("temp-")) {
          await deleteContact(id);
        }
      }
      const saved = [];
      for (const c of val) {
        if (!currentMap.has(c.id) || String(c.id).startsWith("temp-")) {
          const { id: _drop, ...rest } = c;
          const newRow = await insertContact(rest);
          saved.push(newRow);
        } else {
          const prev = currentMap.get(c.id);
          if (JSON.stringify(prev) !== JSON.stringify(c)) {
            // v19c Session N: pass prev.updatedAt for optimistic lock.
            // If another writer modified this contact since we loaded it, throw ConcurrentEditError.
            const updated = await updateContact(c.id, c, prev.updatedAt);
            saved.push(updated);
          } else {
            saved.push(c);
          }
        }
      }
      setContactsState(saved);
    } catch (e) {
      // Roll back the optimistic update in either failure mode.
      setContactsState(previous);
      if (e?.code === "CONCURRENT_EDIT") {
        showToast("⚠ SOMEONE ELSE EDITED A CONTACT — RELOAD");
        return;
      }
      console.error("setContacts failed:", e);
      showToast("⚠ SAVE FAILED — REVERTED CONTACT CHANGES. CHECK CONNECTION.");
    }
  };

  // --- Quarries (Supabase) ---
  const setQuarries = async (val) => {
    const previous = quarries;
    setQuarriesState(val);  // optimistic
    const currentMap = new Map(previous.map((q) => [q.id, q]));
    const newMap = new Map(val.map((q) => [q.id, q]));
    try {
      for (const [id] of currentMap) {
        if (!newMap.has(id) && !String(id).startsWith("temp-")) {
          await deleteQuarry(id);
        }
      }
      const saved = [];
      for (const q of val) {
        if (!currentMap.has(q.id) || String(q.id).startsWith("temp-")) {
          const { id: _drop, ...rest } = q;
          const newRow = await insertQuarry(rest);
          saved.push(newRow);
        } else {
          const prev = currentMap.get(q.id);
          if (JSON.stringify(prev) !== JSON.stringify(q)) {
            // v19c Session N: optimistic lock
            const updated = await updateQuarry(q.id, q, prev.updatedAt);
            saved.push(updated);
          } else {
            saved.push(q);
          }
        }
      }
      setQuarriesState(saved);
    } catch (e) {
      setQuarriesState(previous);  // roll back
      if (e?.code === "CONCURRENT_EDIT") {
        showToast("⚠ SOMEONE ELSE EDITED A QUARRY — RELOAD");
        return;
      }
      console.error("setQuarries failed:", e);
      showToast("⚠ SAVE FAILED — REVERTED QUARRY CHANGES. CHECK CONNECTION.");
    }
  };

  // --- Invoices (Supabase) ---
  // Invoices are append-only mostly — we just insert new ones
  const setInvoices = async (val) => {
    const previous = invoices;
    setInvoicesState(val);  // optimistic
    const currentIds = new Set(previous.map((i) => i.id));
    try {
      // Find deleted ones
      const newIds = new Set(val.map((i) => i.id));
      for (const id of currentIds) {
        if (!newIds.has(id) && !String(id).startsWith("temp-")) {
          await deleteInvoice(id);
        }
      }
      // Insert new ones
      const saved = [];
      for (const inv of val) {
        if (!currentIds.has(inv.id) || String(inv.id).startsWith("temp-")) {
          const { id: _drop, ...rest } = inv;
          const newRow = await insertInvoice(rest);
          saved.push(newRow);
        } else {
          saved.push(inv);
        }
      }
      setInvoicesState(saved);
    } catch (e) {
      console.error("setInvoices failed:", e);
      setInvoicesState(previous);  // roll back
      showToast("⚠ SAVE FAILED — REVERTED INVOICE CHANGES. CHECK CONNECTION.");
    }
  };

  // Create one invoice and return the saved row (with real id) synchronously.
  // Use this from the invoice generate flow so we can immediately lock FBs to the real invoice id.
  const createInvoice = async (invoice) => {
    try {
      const { id: _drop, ...rest } = invoice;
      const saved = await insertInvoice(rest);
      setInvoicesState((prev) => [saved, ...prev]);
      // v20 Session O: audit log
      logAudit({
        actionType: "invoice.create",
        entityType: "invoice", entityId: saved.id,
        entityLabel: saved.invoiceNumber || "—",
        metadata: {
          billToName: saved.billToName || "",
          total: saved.total || 0,
          fbCount: (saved.freightBillIds || []).length,
          invoiceDate: saved.invoiceDate || null,
        },
      });
      return saved;
    } catch (e) {
      console.error("createInvoice failed:", e);
      throw e;
    }
  };

  // --- Projects (Supabase) ---
  const setProjects = async (val) => {
    const previous = projects;
    setProjectsState(val);  // optimistic
    const currentMap = new Map(previous.map((p) => [p.id, p]));
    const newMap = new Map(val.map((p) => [p.id, p]));
    try {
      for (const [id] of currentMap) {
        if (!newMap.has(id) && !String(id).startsWith("temp-")) {
          await deleteProject(id);
        }
      }
      const saved = [];
      for (const p of val) {
        if (!currentMap.has(p.id) || String(p.id).startsWith("temp-")) {
          const { id: _drop, ...rest } = p;
          const newRow = await insertProject(rest);
          saved.push(newRow);
        } else {
          const prev = currentMap.get(p.id);
          if (JSON.stringify(prev) !== JSON.stringify(p)) {
            // v19c Session N: optimistic lock
            const updated = await updateProject(p.id, p, prev.updatedAt);
            saved.push(updated);
          } else {
            saved.push(p);
          }
        }
      }
      setProjectsState(saved);
    } catch (e) {
      setProjectsState(previous);  // roll back
      if (e?.code === "CONCURRENT_EDIT") {
        showToast("⚠ SOMEONE ELSE EDITED A PROJECT — RELOAD");
        return;
      }
      console.error("setProjects failed:", e);
      showToast("⚠ SAVE FAILED — REVERTED PROJECT CHANGES. CHECK CONNECTION.");
    }
  };

  const handleQuoteSubmit = async (quote) => {
    try {
      // v18: write to Supabase (was localStorage-only and silently dropping all submissions)
      const saved = await insertQuote(quote);
      // Update local state so admin UI shows it immediately (realtime will also push to other tabs)
      setQuotes((prev) => [saved, ...prev]);
      return saved;
    } catch (e) {
      console.error("handleQuoteSubmit failed:", e);
      throw e;
    }
  };

  // Admin edits/approves an FB
  const editFreightBill = async (id, patch, expectedUpdatedAt = null) => {
    try {
      const updated = await updateFreightBill(id, patch, expectedUpdatedAt);
      setFreightBills((prev) => prev.map((x) => x.id === id ? updated : x));
      return updated;
    } catch (e) {
      // Re-throw ConcurrentEditError so caller can display conflict UI.
      // All other errors logged + rethrown as before.
      if (e?.code !== "CONCURRENT_EDIT") console.error("editFreightBill failed:", e);
      throw e;
    }
  };
  // Driver upload — insert directly to Supabase (public insert allowed, bypasses the diff logic).
  // Returns { status: "submitted" | "queued", queueId? } so DriverUploadPage can render
  // the right confirmation. Falls back to local queue when offline or on network error;
  // App-level flusher (see useEffect below) replays queued submissions once we're back online.
  const buildSubmittedFb = (fb) => {
    const { id: _drop, ...rest } = fb;
    // v18 Fix: convert driver-reported extras into billing lines immediately so admin sees
    // them in the normal review workflow (instead of a separate yellow panel).
    // Pay lines are NOT auto-created — admin stays in control of what gets paid to the driver/sub.
    // PRESERVE qty AND rate from driver input — don't collapse to qty=1, rate=total.
    const extras = Array.isArray(rest.extras) ? rest.extras : [];
    const extraBillingLines = extras
      .filter((x) => Number(x.amount) > 0)
      .map((x, idx) => {
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
          id: Date.now() + idx + Math.floor(Math.random() * 1000),
          code, item, qty, rate, gross,
          brokerable: false,  // tolls/dump/fuel pass-through are not brokered
          brokeragePct: 0,
          net: gross,
          copyToPay: false,
          isAdjustment: false,
          sourceExtra: true,  // audit: this line came from driver-submitted extras
          note: x.note || "",
          createdAt: new Date().toISOString(),
          createdBy: "driver",
        };
      });
    // Driver/sub-submitted FBs always start as "pending" — admin must approve.
    // Preserve any existing billingLines (shouldn't be any on submit), then append extras as lines.
    const submittedLines = [...(rest.billingLines || []), ...extraBillingLines];
    return { ...rest, status: "pending", billingLines: submittedLines };
  };

  const handleTruckSubmit = async (fb) => {
    const finalFb = buildSubmittedFb(fb);
    // Definitively offline — don't even try, just queue.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const queueId = enqueueUpload(finalFb);
      return { status: "queued", queueId };
    }
    try {
      const newRow = await insertFreightBill(finalFb);
      // Realtime subscription will pick this up on dispatcher's devices, but also update our own state
      setFreightBills((prev) => [newRow, ...prev.filter((x) => x.id !== newRow.id)]);
      return { status: "submitted", id: newRow.id };
    } catch (e) {
      console.error("handleTruckSubmit failed:", e);
      // Network-shaped errors → queue for retry. Keep the original throw for
      // anything else (validation, auth) so the caller still surfaces it.
      const msg = String(e?.message || e || "").toLowerCase();
      const looksTransient = msg.includes("network") || msg.includes("fetch")
        || msg.includes("timeout") || msg.includes("failed to") || e?.name === "TypeError";
      if (looksTransient) {
        const queueId = enqueueUpload(finalFb);
        return { status: "queued", queueId, error: e };
      }
      throw e;
    }
  };

  // Periodically (and on `online` events) try to flush any queued FB submissions.
  // Replays them through insertFreightBill in arrival order; stops as soon as one fails.
  useEffect(() => {
    let running = false;
    const flush = async () => {
      if (running) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      const queue = readUploadQueue();
      if (queue.length === 0) return;
      running = true;
      try {
        for (const entry of queue) {
          try {
            await insertFreightBill(entry.fb);
            removeFromUploadQueue(entry.id);
          } catch (err) {
            console.warn("[upload-queue] retry failed, will try again later:", err);
            // Stop on first failure — preserve order, retry whole queue next tick.
            break;
          }
        }
      } finally {
        running = false;
      }
    };
    flush();  // try immediately on mount in case we have leftovers
    const onOnline = () => flush();
    window.addEventListener("online", onOnline);
    const t = setInterval(flush, 30000);  // periodic retry every 30s as a safety net
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(t);
    };
  }, []);

  // Auth handlers
  const handleLoginSuccess = () => {
    setAuthed(true);
    setView("dashboard");
    showToast("LOGGED IN");
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) { console.warn("logout failed", e); }
    setAuthed(false);
    setView("public");
    showToast("LOGGED OUT");
  };

  // v20 Session Q: Idle warning countdown
  // When warning appears, seed countdown and tick it down. If it hits 0, force logout.
  // The non-warning reset is handled wherever we call setIdleWarning(false), so this
  // effect only runs its interval while the warning is active.
  useEffect(() => {
    if (!idleWarning) return;
    const countdownInterval = setInterval(() => {
      setIdleCountdown((s) => {
        if (s <= 1) {
          clearInterval(countdownInterval);
          // Force logout
          handleLogout();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(countdownInterval);
  }, [idleWarning]);

  const tryEnterDashboard = () => {
    if (authed) { setView("dashboard"); }
    else { setView("login"); }
  };

  const submitMatch = route.match(/^#\/submit\/([A-Z0-9]+)(?:\/a\/([A-Za-z0-9]+))?/i);
  const trackMatch = route.match(/^#\/track\/([A-Z0-9]+)/i);
  const customerMatch = route.match(/^#\/customer\/([a-f0-9]+)/i);
  const clientMatch = route.match(/^#\/client\/([A-Z0-9]+)/i);
  const payMatch = route.match(/^#\/pay\/([a-f0-9]+)/i);  // v23 Session Y

  if (!loaded) {
    return (
      <div className="fbt-root texture-paper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <GlobalStyles />
        <div className="fbt-mono anim-roll" style={{ color: "var(--hazard-deep)", letterSpacing: "0.2em" }}>▸ LOADING…</div>
      </div>
    );
  }

  // Driver upload link route — public, bypasses all auth
  if (submitMatch) {
    const code = submitMatch[1].toUpperCase();
    const aid = submitMatch[2] || null;
    const d = dispatches.find((x) => x.code.toUpperCase() === code);
    const assignment = d && aid ? (d.assignments || []).find((a) => a.aid === aid) : null;

    // Freight bills for this specific assignment (or the whole dispatch if no aid)
    const scopedFBs = d
      ? freightBills.filter((fb) => {
          if (fb.dispatchId !== d.id) return false;
          if (aid) return fb.assignmentId === aid;
          return true;
        })
      : [];
    const expectedTrucks = assignment ? Number(assignment.trucks) || 1 : (d?.trucksExpected || 1);
    const enriched = d ? {
      ...d,
      submittedCount: scopedFBs.length,
      trucksExpected: expectedTrucks,
      // Override job name header with assignment-specific info if using a sublink
      _assignmentLabel: assignment ? assignment.name : null,
      _assignmentKind: assignment?.kind || null,
      _assignmentAid: aid,
    } : null;

    const availableDrivers = (d?.assignedDriverIds || []).map((id, idx) => ({
      id,
      companyName: (d.assignedDriverNames || [])[idx] || `Driver ${idx + 1}`,
    }));

    // Look up the full contact object for the assignment (for prefill: default truck, etc.)
    const assignmentContact = assignment?.contactId
      ? (contacts || []).find((c) => c.id === assignment.contactId)
      : null;

    // Check if order is closed — show closed message
    if (d && d.status === "closed") {
      return (
        <div className="fbt-root texture-paper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <GlobalStyles />
          <div className="fbt-card" style={{ padding: 40, textAlign: "center", maxWidth: 440 }}>
            <CheckCircle2 size={48} style={{ color: "var(--good)", marginBottom: 16 }} />
            <h2 className="fbt-display" style={{ fontSize: 22, margin: "0 0 10px" }}>JOB COMPLETE</h2>
            <p style={{ color: "var(--concrete)", margin: "0 0 16px" }}>
              This dispatch has been closed. If you have a freight bill for this job, contact dispatch.
            </p>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em" }}>▸ #{code}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="fbt-root">
        <GlobalStyles />
        <Suspense fallback={<RouteLoading />}>
          <DriverUploadPage
            dispatch={enriched}
            onSubmitTruck={(fb) => handleTruckSubmit({ ...fb, assignmentId: aid })}
            onBack={() => { window.location.hash = ""; }}
            availableDrivers={availableDrivers}
            assignment={assignment}
            assignmentContact={assignmentContact}
          />
        </Suspense>
      </div>
    );
  }

  // Single-dispatch tracking page — public (lazy-loaded chunk)
  if (trackMatch) {
    const code = trackMatch[1].toUpperCase();
    const d = dispatches.find((x) => x.code.toUpperCase() === code);
    return (
      <div className="fbt-root">
        <GlobalStyles />
        <Suspense fallback={<RouteLoading />}>
          <DispatchTrackingPage dispatch={d} freightBills={freightBills} company={company} onBack={() => { window.location.hash = ""; }} />
        </Suspense>
      </div>
    );
  }

  // Customer portal — token-based, public, view-only (lazy-loaded chunk)
  if (customerMatch) {
    const token = customerMatch[1];
    return (
      <Suspense fallback={<RouteLoading />}>
        <CustomerPortal token={token} onBack={() => { window.location.hash = ""; }} />
      </Suspense>
    );
  }

  // v23 Session Y: Driver/sub pay portal — token-based, public, view-only (lazy-loaded chunk)
  if (payMatch) {
    const token = payMatch[1];
    return (
      <Suspense fallback={<RouteLoading />}>
        <DriverPayPortalPage token={token} onBack={() => { window.location.hash = ""; }} />
      </Suspense>
    );
  }

  // Client-wide tracking page — public (lazy-loaded chunk)
  if (clientMatch) {
    const token = clientMatch[1].toUpperCase();
    return (
      <div className="fbt-root">
        <GlobalStyles />
        <Suspense fallback={<RouteLoading />}>
          <ClientTrackingPage token={token} dispatches={dispatches} freightBills={freightBills} company={company} onBack={() => { window.location.hash = ""; }} />
        </Suspense>
      </div>
    );
  }

  // Setup flow removed — we now use Supabase user accounts created via dashboard

  // Login flow (lazy-loaded chunk)
  if (view === "login") {
    return (
      <div className="fbt-root">
        <GlobalStyles />
        <Suspense fallback={<RouteLoading />}>
          <LoginScreen onSuccess={handleLoginSuccess} onCancel={() => setView("public")} />
        </Suspense>
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="fbt-root">
      <GlobalStyles />
      {view === "public" ? (
        <Suspense fallback={<RouteLoading />}>
          <PublicSite onQuoteSubmit={handleQuoteSubmit} onStaffLogin={tryEnterDashboard} />
        </Suspense>
      ) : (
        <>
          <Dashboard
            state={{ logs, quotes, bids, fleet, dispatches, freightBills, invoices, company, contacts, unreadIds, soundEnabled, browserNotifsEnabled, quarries, lastViewedMondayReport, projects }}
            setters={{ setLogs, setQuotes, setBids, setFleet, setDispatches: setDispatchesShared, setFreightBills: setFreightBillsShared, setInvoices, createInvoice, setCompany, setContacts, markAllRead, markDispatchRead, toggleSound, toggleBrowserNotifs, setQuarries, setLastViewedMondayReport, setProjects, editFreightBill }}
            onToast={showToast}
            onExit={() => setView("public")}
            onLogout={handleLogout}
            onChangePassword={() => setShowChangePw(true)}
          />
          {showChangePw && (
            <ChangePasswordModal
              onClose={() => setShowChangePw(false)}
              onToast={showToast}
            />
          )}
        </>
      )}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* v20 Session Q: Idle session warning */}
      {idleWarning && authed && (
        <div className="modal-bg" style={{ zIndex: 9999 }} onClick={() => { /* require explicit button click */ }}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ padding: "16px 20px", background: "var(--safety)", color: "#FFF", display: "flex", alignItems: "center", gap: 10 }}>
              <AlertCircle size={22} />
              <h3 className="fbt-display" style={{ fontSize: 17, margin: 0, letterSpacing: "0.05em" }}>SESSION IDLE</h3>
            </div>
            <div style={{ padding: 20, display: "grid", gap: 14 }}>
              <p style={{ fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                You've been inactive for 30 minutes. For security, we'll log you out in:
              </p>
              <div style={{ textAlign: "center", padding: "14px 0" }}>
                <div style={{ fontFamily: "Archivo Black, sans-serif", fontSize: 56, color: idleCountdown <= 10 ? "var(--safety)" : "var(--steel)", lineHeight: 1 }}>
                  {idleCountdown}
                </div>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em", marginTop: 4 }}>
                  SECONDS
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button
                  onClick={handleLogout}
                  className="btn-ghost"
                  style={{ padding: "8px 14px", fontSize: 11, color: "var(--safety)", borderColor: "var(--safety)" }}
                >
                  <LogOut size={12} style={{ marginRight: 4 }} /> LOG OUT NOW
                </button>
                <button
                  onClick={() => {
                    lastActivityRef.current = Date.now();
                    setIdleWarning(false);
                    setIdleCountdown(IDLE_WARNING_SEC);
                  }}
                  className="btn-primary"
                  autoFocus
                >
                  <CheckCircle2 size={14} style={{ marginRight: 4 }} /> I'M STILL HERE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
