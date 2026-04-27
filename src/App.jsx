/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
// File-level disables: App.jsx is the root component with 8+ intentional
// respond-to-trigger effects (subscriptions to supabase/realtime,
// idle-timeout handler, route-change consumers) and several memos whose
// deps are narrowed on purpose. New effects in here should still be
// reviewed for cascading bugs at PR time — these warnings reflect existing
// audited patterns, not new code health.
import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { supabase } from "./supabase";
import {
  fetchDispatches, insertDispatch, updateDispatch, deleteDispatch,
  fetchFreightBills, insertFreightBill, updateFreightBill, deleteFreightBill,
  subscribeToDispatches, subscribeToFreightBills,
  fetchContacts, insertContact, updateContact, deleteContact,
  fetchQuarries, insertQuarry, updateQuarry, deleteQuarry,
  fetchInvoices, insertInvoice, deleteInvoice,
  subscribeToContacts, subscribeToQuarries, subscribeToInvoices,
  fetchProjects, insertProject, updateProject, deleteProject, subscribeToProjects,
  fetchDeletedDispatches, fetchDeletedFreightBills, fetchDeletedInvoices,
  recoverDispatch, recoverFreightBill, recoverInvoice,
  hardDeleteDispatch, hardDeleteFreightBill, hardDeleteInvoice,
  autoPurgeDeleted,
  fetchQuotes, insertQuote, updateQuote, subscribeToQuotes,
  fetchDeletedQuotes, recoverQuote, hardDeleteQuote,
  fetchBids, insertBid, updateBid, deleteBid, subscribeToBids,
  logAudit, fetchAuditLog,
  fetchTestimonials,
  insertTestimonial, updateTestimonial, deleteTestimonial,
  COMPLIANCE_DOC_TYPES,
  fetchComplianceDocs, getComplianceFileUrl,
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
  fmt$, fmtDate, fmtDateTime,
  storageGet, storageSet,
  isPastRecoveryWindow, daysUntilPurge, daysSince,
  BID_STATUSES, BID_STATUS_MAP,
} from "./utils";
import { Toast } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { InstallAppButton } from "./components/InstallAppButton";
import { BottomTabNav } from "./components/BottomTabNav";
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
import { ProjectDetailModal } from "./components/ProjectDetailModal";
import { InvoiceViewModal } from "./components/InvoiceViewModal";
import { FBPhotoGallery } from "./components/FBPhotoGallery";
import { FleetTab } from "./components/FleetTab";
import { QuotesTab, QuoteDetailModal } from "./components/QuotesTab";
import { ContactsTab, ContactModal } from "./components/ContactsTab";
import { ReviewTab } from "./components/ReviewTab";
import { PayrollTab } from "./components/PayrollTab";
import { InvoicesTab, generateCustomerStatementPDF } from "./components/InvoicesTab";
import { DispatchesTab } from "./components/DispatchesTab";
import { MaterialsTab } from "./components/MaterialsTab";
import { ProjectsTab } from "./components/ProjectsTab";
import { readUploadQueue, enqueueUpload, removeFromUploadQueue } from "./hooks/uploadQueue";
import { GlobalStyles } from "./components/GlobalStyles";
const ClientTrackingPage = lazy(() => import("./components/ClientTrackingPage").then((m) => ({ default: m.ClientTrackingPage })));
const DriverPayPortalPage = lazy(() => import("./components/DriverPayPortalPage").then((m) => ({ default: m.DriverPayPortalPage })));
const DriverUploadPage = lazy(() => import("./components/DriverUploadPage").then((m) => ({ default: m.DriverUploadPage })));
const CustomerPortal = lazy(() => import("./components/CustomerPortal").then((m) => ({ default: m.CustomerPortal })));
const OnboardingPage = lazy(() => import("./components/OnboardingPage").then((m) => ({ default: m.OnboardingPage })));
const TruckPortalPage = lazy(() => import("./components/TruckPortalPage").then((m) => ({ default: m.TruckPortalPage })));
const PublicSite = lazy(() => import("./components/PublicSite").then((m) => ({ default: m.PublicSite })));

// Suspense fallback shown while a lazy chunk is in flight.
// Intentionally minimal — chunks are small enough that a heavy spinner would
// be visible longer than the load itself on most connections.
const RouteLoading = () => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div className="fbt-mono anim-roll" style={{ color: "var(--hazard-deep)", fontSize: 12 }}>▸ LOADING…</div>
  </div>
);




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
  const { dispatches = [], freightBills = [], invoices = [] } = state;
  const dispMap = {};
  dispatches.forEach((d) => { dispMap[d.id] = d; });

  // Dispatches
  downloadCSV(`4brothers-dispatches-${ts}.csv`, [
    ["Code", "Date", "Job", "Sub Hauler", "Pickup", "Dropoff", "Material", "Trucks Expected", "Trucks Submitted", "Rate $/hr", "Rate $/ton", "Status", "Notes", "Created"],
    ...dispatches.map((d) => [
      d.code, d.date, d.jobName, d.subContractor || "", d.pickup || "", d.dropoff || "",
      d.material || "", d.trucksExpected, freightBills.filter((fb) => fb.dispatchId === d.id).length,
      d.ratePerHour || "", d.ratePerTon || "", d.status, d.notes || "", d.createdAt || "",
    ]),
  ]);

  // Freight bills
  downloadCSV(`4brothers-freightbills-${ts}.csv`, [
    ["Freight Bill #", "Submitted", "Dispatch Code", "Job", "Sub", "Driver", "Truck", "Material", "Tonnage", "Load Count", "Start Time", "End Time", "Photos", "Notes"],
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
};

const validateBackup = (obj) => {
  if (!obj || typeof obj !== "object") return "Not a valid backup file (not JSON object)";
  if (obj._format !== "4brothers-backup") return "This doesn't look like a 4 Brothers backup file";
  if (typeof obj._version !== "number") return "Backup file is missing version info";
  if (obj._version > BACKUP_VERSION) return `Backup is from a newer app version (v${obj._version}) — update the app first`;
  const arrays = ["quotes", "fleet", "dispatches", "freightBills", "invoices", "contacts", "quarries"];
  for (const k of arrays) {
    if (obj[k] !== undefined && !Array.isArray(obj[k])) return `Backup field '${k}' is corrupted (not an array)`;
  }
  return null;
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
const computeReport = ({ from, to, dispatches, freightBills, invoices, quotes, quarries, contacts = [], projects = [] }) => {
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

  // Labor revenue = total of invoices issued in range. Replaces the obsolete
  // logs[]-based calc; this number now reflects what we actually billed.
  const laborRevenue = invoices
    .filter((inv) => inv.invoiceDate && inRangeDate(inv.invoiceDate))
    .reduce((s, inv) => s + (Number(inv.total) || 0), 0);

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

  // === A/R aging — based on TODAY, not the filter range ===
  // Walks every invoice with an outstanding balance and buckets by days since
  // invoiceDate. The owner's most-asked accounting view: who owes us, how long.
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const arBuckets = { current: [], "30": [], "60": [], "90+": [] };
  let arTotal = 0;
  invoices.forEach((inv) => {
    const bal = (Number(inv.total) || 0) - (Number(inv.amountPaid) || 0);
    if (bal <= 0.01) return; // paid in full
    const invDate = inv.invoiceDate ? new Date(inv.invoiceDate + "T12:00:00") : null;
    const days = invDate ? Math.floor((today.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const bucket = days <= 30 ? "current" : days <= 60 ? "30" : days <= 90 ? "60" : "90+";
    arBuckets[bucket].push({
      num: inv.invoiceNumber,
      billTo: inv.billToName,
      total: Number(inv.total) || 0,
      paid: Number(inv.amountPaid) || 0,
      balance: bal,
      days,
      date: inv.invoiceDate,
    });
    arTotal += bal;
  });
  Object.keys(arBuckets).forEach((k) => arBuckets[k].sort((a, b) => b.days - a.days));
  const arSummary = {
    total: arTotal,
    counts: {
      current: arBuckets.current.length,
      "30": arBuckets["30"].length,
      "60": arBuckets["60"].length,
      "90+": arBuckets["90+"].length,
    },
    sums: {
      current: arBuckets.current.reduce((s, x) => s + x.balance, 0),
      "30": arBuckets["30"].reduce((s, x) => s + x.balance, 0),
      "60": arBuckets["60"].reduce((s, x) => s + x.balance, 0),
      "90+": arBuckets["90+"].reduce((s, x) => s + x.balance, 0),
    },
    buckets: arBuckets,
  };

  // === Profitability rollups for invoices/payouts in range ===
  // Per FB: derive paid (sub pay) from payingLines, brokerage from those lines,
  // billed (revenue) from the FB's invoice line. Aggregate by project + by
  // customer + by sub.
  const fbStats = billsInRange.map((fb) => {
    const disp = dispatches.find((x) => x.id === fb.dispatchId);
    const inv = fb.invoiceId ? invoices.find((i) => i.id === fb.invoiceId) : null;
    const payLines = Array.isArray(fb.payingLines) ? fb.payingLines : [];
    const subPay = payLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
    const subBrokerage = payLines.reduce((s, ln) => {
      const gross = Number(ln.gross) || ((Number(ln.qty) || 0) * (Number(ln.rate) || 0));
      const net = Number(ln.net) || gross;
      return s + Math.max(0, gross - net);
    }, 0);
    // Revenue per FB: take this FB's share of the invoice (proportional to the
    // FB's total billing-line net within the invoice's freightBillIds set).
    let revenue = 0;
    if (inv && Array.isArray(fb.billingLines)) {
      revenue = fb.billingLines.reduce((s, ln) => s + (Number(ln.net) || 0), 0);
    }
    const assignment = disp ? (disp.assignments || []).find((a) => a.aid === fb.assignmentId) : null;
    return { fb, disp, inv, assignment, subPay, subBrokerage, revenue };
  });

  // Per-project rollup
  const byProject = new Map();
  fbStats.forEach(({ fb, disp, subPay, subBrokerage, revenue }) => {
    if (!disp) return;
    const projectId = disp.projectId || "_none";
    const project = projects.find((p) => p.id === projectId);
    const name = project?.name || "(no project)";
    const e = byProject.get(projectId) || { id: projectId, name, contractNumber: project?.contractNumber || "", revenue: 0, subPay: 0, subBrokerage: 0, fbCount: 0, tonnage: 0 };
    e.revenue += revenue;
    e.subPay += subPay;
    e.subBrokerage += subBrokerage;
    e.fbCount += 1;
    e.tonnage += Number(fb.tonnage) || 0;
    byProject.set(projectId, e);
  });
  const profitByProject = Array.from(byProject.values())
    .map((e) => ({ ...e, net: e.revenue - e.subPay - e.subBrokerage, marginPct: e.revenue > 0 ? ((e.revenue - e.subPay - e.subBrokerage) / e.revenue) * 100 : null }))
    .sort((a, b) => b.net - a.net);

  // Per-customer rollup
  const byCustomer = new Map();
  fbStats.forEach(({ fb, disp, subPay, subBrokerage, revenue }) => {
    if (!disp) return;
    const customerId = disp.clientId || "_none";
    const customer = contacts.find((c) => c.id === customerId);
    const name = customer?.companyName || customer?.contactName || disp.clientName || "(no customer)";
    const e = byCustomer.get(customerId) || { id: customerId, name, revenue: 0, subPay: 0, subBrokerage: 0, fbCount: 0, tonnage: 0 };
    e.revenue += revenue;
    e.subPay += subPay;
    e.subBrokerage += subBrokerage;
    e.fbCount += 1;
    e.tonnage += Number(fb.tonnage) || 0;
    byCustomer.set(customerId, e);
  });
  const profitByCustomer = Array.from(byCustomer.values())
    .map((e) => ({ ...e, net: e.revenue - e.subPay - e.subBrokerage, marginPct: e.revenue > 0 ? ((e.revenue - e.subPay - e.subBrokerage) / e.revenue) * 100 : null }))
    .sort((a, b) => b.net - a.net);

  // Per-sub rollup (drivers + subs)
  const bySub = new Map();
  fbStats.forEach(({ assignment, subPay, subBrokerage, fb }) => {
    if (!assignment || !assignment.contactId) return;
    const contact = contacts.find((c) => c.id === assignment.contactId);
    const name = contact?.companyName || contact?.contactName || assignment.name || "(unknown)";
    const e = bySub.get(assignment.contactId) || { id: assignment.contactId, name, kind: assignment.kind || contact?.type || "sub", subPay: 0, brokerage: 0, fbCount: 0, tonnage: 0 };
    e.subPay += subPay;
    e.brokerage += subBrokerage;
    e.fbCount += 1;
    e.tonnage += Number(fb.tonnage) || 0;
    bySub.set(assignment.contactId, e);
  });
  const paidBySub = Array.from(bySub.values()).sort((a, b) => b.subPay - a.subPay);

  // === Tonnage trend — one bucket per day in the range ===
  // Build a sorted [{ date, tons, fbCount }] series. The chart then bins
  // automatically (one bar per day). Empty days get zero rows so the chart
  // shows a continuous timeline instead of skipping.
  const tonnageByDay = (() => {
    const map = new Map();
    // Pre-fill every day in the range with zeros
    const dayMs = 24 * 60 * 60 * 1000;
    for (let t = startOfDay(from).getTime(); t <= endOfDay(to).getTime(); t += dayMs) {
      const key = toISODate(new Date(t));
      map.set(key, { date: key, tons: 0, fbCount: 0 });
    }
    billsInRange.forEach((fb) => {
      const d = fb.submittedAt ? toISODate(new Date(fb.submittedAt)) : null;
      if (!d || !map.has(d)) return;
      const e = map.get(d);
      e.tons += Number(fb.tonnage) || 0;
      e.fbCount += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  })();

  // === Driver utilization — drivers only (skip subs since sub utilization is
  // already in profitByCustomer/profitByProject). For each driver contact:
  // unique dispatches, FBs, tonnage, computed hours from pickup/dropoff. ===
  const driverUtilization = (() => {
    const byDriver = new Map();
    fbStats.forEach(({ fb, disp, assignment }) => {
      if (!assignment || assignment.kind !== "driver" || !assignment.contactId) return;
      const contact = contacts.find((c) => c.id === assignment.contactId);
      const name = contact?.companyName || contact?.contactName || assignment.name || "(unknown)";
      const e = byDriver.get(assignment.contactId) || { id: assignment.contactId, name, fbCount: 0, dispatchIds: new Set(), tonnage: 0, hoursBilled: 0 };
      e.fbCount += 1;
      if (disp) e.dispatchIds.add(disp.id);
      e.tonnage += Number(fb.tonnage) || 0;
      // Use hoursBilled if set, else compute from pickup/dropoff
      let hrs = Number(fb.hoursBilled) || 0;
      if (!hrs && fb.pickupTime && fb.dropoffTime) {
        const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
        const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
        if (!isNaN(h1) && !isNaN(h2)) {
          const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (mins > 0) hrs = mins / 60;
        }
      }
      e.hoursBilled += hrs;
      byDriver.set(assignment.contactId, e);
    });
    return Array.from(byDriver.values())
      .map((e) => ({ ...e, dispatchCount: e.dispatchIds.size }))
      .sort((a, b) => b.fbCount - a.fbCount);
  })();

  return {
    from: toISODate(from),
    to: toISODate(to),
    generatedAt: new Date().toISOString(),
    openedCount: openedInRange.length,
    closedCount: closedInRange.length,
    billsCount: billsInRange.length,
    totalTons,
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
    arSummary,
    profitByProject,
    profitByCustomer,
    paidBySub,
    tonnageByDay,
    driverUtilization,
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
${section("Top Sub Haulers by Dispatches", listTable(report.topSubs, [{ key: "name", label: "Sub Hauler" }, { key: "count", label: "Dispatches", r: true }]))}
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

  push(["TOP SUB HAULERS"]);
  push(["Sub Hauler", "Dispatches"]);
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
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", marginTop: 2 }}>
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
                                  cursor: "pointer",
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
  // Driver-entered + dispatch context
  date: true, fbNumber: true, loads: true, tons: true,
  startTime: true, endTime: true, hours: false,
  driver: true, truck: true, description: true, notes: true,
  customer: false, pickup: false, dropoff: false,
  // Admin-approved billing snapshot (off by default — opt in per export
  // since most invoices in Excel use the customer-facing bill from the
  // existing invoice, not the raw billed-* fields)
  material: false,
  status: false,
  billedRate: false, billedMethod: false,
  billedHours: false, billedTons: false, billedLoads: false,
  minHoursApplied: false,
};
const FB_ARCHIVE_STATUS_DEFAULTS = { pending: false, approved: true, invoiced: true, paid: true };
const FB_ARCHIVE_LS_KEY = "fbt:fbArchivePrefs";
// "Only include FBs with at least one attached photo" filter — default ON
// because the whole point of the archive is to attach the proof-of-haul
// pages to an invoice; FBs with zero photos are blank pages.
const FB_ARCHIVE_PHOTOS_ONLY_DEFAULT = true;

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
    if (fieldsInclude.material && fb.material) parts.push(`<span class="kv"><b>MATERIAL</b> ${esc(fb.material)}</span>`);
    // Admin-approved billing snapshot (post-review numbers) — opt in
    if (fieldsInclude.status) {
      const isInvoiced = !!fb.invoiceId;
      const isPaid = !!fb.paidAt || !!fb.customerPaidAt;
      const statusLabel = isPaid ? "PAID" : isInvoiced ? "INVOICED" : (fb.status || "pending").toUpperCase();
      parts.push(`<span class="kv"><b>STATUS</b> ${esc(statusLabel)}</span>`);
    }
    if (fieldsInclude.billedRate && fb.billedRate != null) {
      const methodSuffix = fb.billedMethod === "ton" ? "/ton" : fb.billedMethod === "load" ? "/load" : "/hr";
      parts.push(`<span class="kv"><b>BILL RATE</b> $${esc(String(fb.billedRate))}${methodSuffix}</span>`);
    }
    if (fieldsInclude.billedMethod && fb.billedMethod) parts.push(`<span class="kv"><b>BILL METHOD</b> ${esc(String(fb.billedMethod).toUpperCase())}</span>`);
    if (fieldsInclude.billedHours && fb.billedHours != null) parts.push(`<span class="kv"><b>BILL HRS</b> ${esc(String(fb.billedHours))}</span>`);
    if (fieldsInclude.billedTons && fb.billedTons != null) parts.push(`<span class="kv"><b>BILL TONS</b> ${esc(String(fb.billedTons))}</span>`);
    if (fieldsInclude.billedLoads && fb.billedLoads != null) parts.push(`<span class="kv"><b>BILL LOADS</b> ${esc(String(fb.billedLoads))}</span>`);
    if (fieldsInclude.minHoursApplied && fb.minHoursApplied) {
      parts.push(`<span class="kv"><b>MIN-HRS</b> APPLIED${fb.minHoursApprovedBy ? ` by ${esc(fb.minHoursApprovedBy)}` : ""}</span>`);
    }

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

const FBArchiveModal = ({ freightBills, dispatches, contacts, projects, company, onClose, onToast, initialDispatchId = null }) => {
  // Load saved prefs from localStorage
  const savedPrefs = (() => {
    try { return JSON.parse(localStorage.getItem(FB_ARCHIVE_LS_KEY) || "{}"); } catch { return {}; }
  })();

  const [fromDate, setFromDate] = useState(savedPrefs.fromDate || "");
  const [toDate, setToDate] = useState(savedPrefs.toDate || "");
  const [customerId, setCustomerId] = useState(savedPrefs.customerId || "");
  const [projectId, setProjectId] = useState(savedPrefs.projectId || "");
  const [statusFilter, setStatusFilter] = useState(savedPrefs.statusFilter || FB_ARCHIVE_STATUS_DEFAULTS);
  // Merge saved prefs onto the latest defaults so newly-added field keys
  // (admin-approved data added in a later release) appear pre-set with
  // their default rather than being silently absent for existing users.
  const [fieldsInclude, setFieldsInclude] = useState({ ...FB_ARCHIVE_FIELD_DEFAULTS, ...(savedPrefs.fieldsInclude || {}) });
  const [photosOnly, setPhotosOnly] = useState(
    savedPrefs.photosOnly !== undefined ? !!savedPrefs.photosOnly : FB_ARCHIVE_PHOTOS_ONLY_DEFAULT
  );
  // When the modal is launched from a specific dispatch card, pin the
  // export to that dispatch's FBs (overrides customer/project filters).
  // Admin can clear the pin to see other matches.
  const [pinnedDispatchId, setPinnedDispatchId] = useState(initialDispatchId || null);
  const pinnedDispatch = pinnedDispatchId ? dispatches.find((d) => d.id === pinnedDispatchId) : null;

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
      // Pinned-dispatch mode: filter to that dispatch's FBs only.
      if (pinnedDispatchId && fb.dispatchId !== pinnedDispatchId) return false;
      if (customerId && String(d?.clientId) !== String(customerId)) return false;
      if (projectId && String(d?.projectId) !== String(projectId)) return false;

      // "Only include FBs with photos" — the export attaches photos to an
      // invoice; an FB with zero photos is a blank page in the bundle.
      if (photosOnly && (!Array.isArray(fb.photos) || fb.photos.length === 0)) return false;

      return true;
    }).sort((a, b) => (a.submittedAt || "").localeCompare(b.submittedAt || ""));
  }, [freightBills, dispatches, statusFilter, fromDate, toDate, customerId, projectId, photosOnly, pinnedDispatchId]);

  const totalPhotos = matchedFbs.reduce((s, fb) => s + (fb.photos?.length || 0), 0);

  const savePrefs = () => {
    try {
      localStorage.setItem(FB_ARCHIVE_LS_KEY, JSON.stringify({
        fromDate, toDate, customerId, projectId, statusFilter, fieldsInclude, photosOnly,
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
      <span className="fbt-mono" style={{ fontSize: 10 }}>{label}</span>
    </label>
  );

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 820 }}>
        <div style={{ padding: "16px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)" }}>▸ REPORTS</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "3px 0 0" }}>FB ARCHIVE PDF</h3>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ borderColor: "var(--cream)", color: "var(--cream)" }}>
            <X size={14} style={{ marginRight: 4 }} /> CLOSE
          </button>
        </div>

        <div style={{ padding: 20, display: "grid", gap: 16 }}>
          {pinnedDispatch && (
            <div style={{ padding: "10px 12px", background: "#F0FDF4", border: "2px solid var(--good)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 12 }}>
                <strong>📌 Pinned to order #{pinnedDispatch.code}</strong>
                {pinnedDispatch.jobName ? ` · ${pinnedDispatch.jobName}` : ""}
                <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>Customer / project filters below are ignored while pinned.</div>
              </div>
              <button onClick={() => setPinnedDispatchId(null)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }}>CLEAR PIN</button>
            </div>
          )}

          {/* Filters */}
          <div className="fbt-card" style={{ padding: 14, background: "#F5F5F4" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 10, fontWeight: 700 }}>▸ FILTERS</div>

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
                  {/* Filter to selected customer's projects when one is
                      picked — otherwise the admin sees every project from
                      every customer and has to scroll past unrelated ones. */}
                  {(projects || [])
                    .filter((p) => !customerId || String(p.customerId) === String(customerId))
                    .map((p) => (
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
                    <span className="fbt-mono" style={{ fontSize: 10 }}>{l}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12, padding: "8px 10px", background: photosOnly ? "#F0FDF4" : "#FFF", border: "1.5px solid " + (photosOnly ? "var(--good)" : "var(--concrete)") }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12 }}>
                <input type="checkbox" checked={photosOnly} onChange={(e) => setPhotosOnly(e.target.checked)} />
                <span><strong>ONLY INCLUDE FBs WITH PHOTOS</strong> · skips blank-page FBs that have no scale ticket attached</span>
              </label>
            </div>
          </div>

          {/* Field checkboxes */}
          <div className="fbt-card" style={{ padding: 14, background: "#F5F5F4" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 6, fontWeight: 700 }}>▸ DRIVER-ENTERED + DISPATCH CONTEXT</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
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
              {fieldCheckbox("material", "MATERIAL")}
              {fieldCheckbox("description", "DESCRIPTION")}
              {fieldCheckbox("notes", "NOTES")}
            </div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 6, fontWeight: 700 }}>▸ ADMIN-APPROVED BILLING DATA</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {fieldCheckbox("status", "STATUS")}
              {fieldCheckbox("billedRate", "BILL RATE")}
              {fieldCheckbox("billedMethod", "BILL METHOD")}
              {fieldCheckbox("billedHours", "BILL HRS")}
              {fieldCheckbox("billedTons", "BILL TONS")}
              {fieldCheckbox("billedLoads", "BILL LOADS")}
              {fieldCheckbox("minHoursApplied", "MIN-HRS APPLIED")}
            </div>
          </div>

          {/* Preview count */}
          <div style={{ padding: "12px 14px", background: matchedFbs.length > 0 ? "#F0FDF4" : "#FEE2E2", border: "2px solid " + (matchedFbs.length > 0 ? "var(--good)" : "var(--safety)"), display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div className="fbt-display" style={{ fontSize: 20 }}>
                {matchedFbs.length} FB{matchedFbs.length !== 1 ? "s" : ""} MATCH
              </div>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
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
          {sub && <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 3 }}>{sub}</div>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10, color: "var(--concrete)", marginTop: 6 }}>
            <span>DELETED {fmtDeletedAt(deletedAt)}</span>
            {deletedBy && <span>· BY {deletedBy}</span>}
            {deleteReason && <span>· "{deleteReason}"</span>}
          </div>
          {expired ? (
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--safety)", marginTop: 6, fontWeight: 700 }}>
              ⚠ EXPIRED — WILL AUTO-PURGE ON NEXT APP BOOT
            </div>
          ) : days !== null && days <= 7 && (
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard-deep)", marginTop: 6, fontWeight: 700 }}>
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
        <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", fontWeight: 700 }}>
          {items.length} ITEM{items.length !== 1 ? "S" : ""}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", padding: "16px 0", fontStyle: "italic" }}>
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
        <span className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)" }}>
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
          <div className="fbt-mono anim-roll" style={{ fontSize: 13, color: "var(--hazard-deep)" }}>▸ LOADING RECOVERY DATA…</div>
        </div>
      ) : totalDeleted === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <CheckCircle2 size={32} style={{ opacity: 0.4, marginBottom: 8, color: "var(--good)" }} />
          <div className="fbt-display" style={{ fontSize: 14 }}>NOTHING IN RECOVERY</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 6 }}>
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
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
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
                        style={{ position: "absolute", top: 4, right: 4, padding: "3px 6px", background: "rgba(0,0,0,0.6)", border: "none", color: "#FFF", cursor: "pointer", fontSize: 10 }}
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
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)" }}>PHOTO GALLERY</div>
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
const BidsTab = ({ bids = [], setBids, onConvertToProject, onToast }) => {
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
          onConvertToProject={onConvertToProject}
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
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", marginBottom: 14, fontWeight: 700 }}>
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
                  <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>WIN RATE</div>
                  <div className="fbt-display" style={{ fontSize: 26, color: "var(--good)", marginTop: 4 }}>
                    {analytics.winRatePct != null ? `${analytics.winRatePct.toFixed(0)}%` : "—"}
                  </div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                    {analytics.awardedCount} WON · {analytics.rejectedCount} LOST
                  </div>
                </div>

                <div style={{ padding: 12, background: "#FFF", border: "1.5px solid var(--steel)", borderLeft: "4px solid var(--steel)" }}>
                  <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>REVENUE WON</div>
                  <div className="fbt-display" style={{ fontSize: 22, color: "var(--steel)", marginTop: 4 }}>
                    {fmt$(analytics.revenueWon)}
                  </div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                    REJECTED: {fmt$(analytics.revenueLost)}
                  </div>
                </div>

                <div style={{ padding: 12, background: "#FFF", border: "1.5px solid var(--hazard-deep)", borderLeft: "4px solid var(--hazard-deep)" }}>
                  <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>MARGIN CAPTURED</div>
                  <div className="fbt-display" style={{ fontSize: 22, color: "var(--hazard-deep)", marginTop: 4 }}>
                    {fmt$(analytics.marginOnWins)}
                  </div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                    AVG MARGIN: {analytics.avgMarginPct != null ? `${analytics.avgMarginPct.toFixed(1)}%` : "—"}
                  </div>
                </div>

                {analytics.avgLossGap != null && (
                  <div style={{ padding: 12, background: "#FFF", border: "1.5px solid var(--safety)", borderLeft: "4px solid var(--safety)" }}>
                    <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>AVG LOSS GAP</div>
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
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8 }}>▸ PIPELINE FUNNEL</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 2 }}>
                  {BID_STATUSES.map((s) => {
                    const count = analytics.funnel[s.value] || 0;
                    return (
                      <div key={s.value} style={{ padding: 8, background: s.bg, borderLeft: `3px solid ${s.color}`, textAlign: "center" }}>
                        <div style={{ fontSize: 18, color: s.color, fontWeight: 700 }}>{count}</div>
                        <div className="fbt-mono" style={{ fontSize: 9, color: s.color, fontWeight: 700, marginTop: 2 }}>{s.label}</div>
                      </div>
                    );
                  })}
                </div>
                {analytics.submissionToAwardPct != null && (
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 8 }}>
                    ▸ SUBMISSION → AWARD CONVERSION: <strong style={{ color: "var(--good)" }}>{analytics.submissionToAwardPct.toFixed(0)}%</strong>
                  </div>
                )}
              </div>

              {/* Agency performance breakdown */}
              {analytics.agencyStats.length > 0 && (
                <div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8 }}>▸ PERFORMANCE BY AGENCY</div>
                  <div style={{ background: "#FFF", border: "1px solid var(--steel)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "var(--steel)", color: "var(--cream)" }}>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10 }}>AGENCY</th>
                          <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10 }}>DECIDED</th>
                          <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10 }}>WON</th>
                          <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10 }}>WIN %</th>
                          <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10 }}>REVENUE</th>
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
            padding: "6px 12px", fontSize: 11, fontWeight: 700,
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
              padding: "6px 12px", fontSize: 11, fontWeight: 700,
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
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
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
                      <span className="fbt-mono" style={{ fontSize: 10, padding: "2px 6px", background: s.color, color: "#FFF", fontWeight: 700 }}>
                        {s.label}
                      </span>
                      {b.priority === "high" && (
                        <span className="fbt-mono" style={{ fontSize: 10, padding: "2px 6px", background: "var(--safety)", color: "#FFF", fontWeight: 700 }}>
                          ★ HIGH
                        </span>
                      )}
                      {b.rfbNumber && (
                        <span className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", fontWeight: 700 }}>
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
                  <div style={{ textAlign: "right", fontSize: 11 }}>
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
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontSize: 11 }}>
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
                      <span key={t} style={{ padding: "1px 6px", background: "#F5F5F4", color: "var(--concrete)", fontSize: 10 }}>
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
              padding: "6px 12px", fontSize: 10, fontWeight: 700,
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
              padding: "6px 12px", fontSize: 10, fontWeight: 700,
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
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>REVENUE · {monthCount}MO</div>
              <div className="fbt-display" style={{ fontSize: 22, color: "var(--good)", marginTop: 4 }}>{fmt$(totalRevenue)}</div>
            </div>
            <div style={{ padding: 12, background: "#FFF", border: "1.5px solid var(--safety)", borderLeft: "4px solid var(--safety)" }}>
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>DIRECT COSTS</div>
              <div className="fbt-display" style={{ fontSize: 22, color: "var(--safety)", marginTop: 4 }}>{fmt$(totals.directCosts)}</div>
            </div>
            <div style={{ padding: 12, background: "#FFF", border: "1.5px solid var(--steel)", borderLeft: `4px solid ${totalMargin >= 0 ? "var(--steel)" : "var(--safety)"}` }}>
              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>GROSS MARGIN</div>
              <div className="fbt-display" style={{ fontSize: 22, color: totalMargin >= 0 ? "var(--steel)" : "var(--safety)", marginTop: 4 }}>{fmt$(totalMargin)}</div>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>{totalMarginPct.toFixed(1)}%</div>
            </div>
            {totals.brokerageCaptured > 0 && (
              <div style={{ padding: 12, background: "#FFF", border: "1.5px solid var(--hazard-deep)", borderLeft: "4px solid var(--hazard-deep)" }}>
                <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>BROKERAGE KEPT</div>
                <div className="fbt-display" style={{ fontSize: 22, color: "var(--hazard-deep)", marginTop: 4 }}>{fmt$(totals.brokerageCaptured)}</div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Monthly table */}
      <div style={{ background: "#FFF", border: "1.5px solid var(--steel)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
          <thead>
            <tr style={{ background: "var(--steel)", color: "var(--cream)" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10 }}>MONTH</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10 }}>REVENUE</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10 }}>COSTS</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10 }}>MARGIN</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10 }}>%</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10 }}>BROK</th>
              <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 10, width: 40 }}></th>
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
                              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 6 }}>
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
                              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 6 }}>
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
              <td style={{ padding: "12px", fontWeight: 700, fontSize: 11 }}>TOTALS</td>
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

      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 10, lineHeight: 1.6 }}>
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
        <span style={{ padding: "2px 8px", background: colors.bg, color: colors.color, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
          {label.toUpperCase()}
        </span>
        {showEntity && entry.entityLabel && (
          <span style={{ fontWeight: 700, fontSize: 12 }}>{entry.entityLabel}</span>
        )}
        <span style={{ fontSize: 11, color: "var(--concrete)", marginLeft: "auto" }}>
          {when.toLocaleDateString()} {when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          {entry.actor && entry.actor !== "admin" && <span> · {entry.actor}</span>}
        </span>
      </div>
      {meta && (
        <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 6, paddingLeft: 2 }}>
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
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>
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
                <div className="fbt-mono" style={{ fontSize: 12, fontWeight: 700 }}>SHOW ON PUBLIC WEBSITE</div>
                <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
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
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>
                  ▸ LOWER NUMBERS SHOW FIRST
                </div>
              </div>
            )}
          </div>

          <details>
            <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--concrete)", fontWeight: 600 }}>▸ INTERNAL NOTES (admin only)</summary>
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
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", fontSize: 12, color: "var(--concrete)" }}>
          LOADING...
        </div>
      ) : filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 40, textAlign: "center" }}>
          <MessageSquare size={40} style={{ color: "var(--concrete)", margin: "0 auto 12px", display: "block" }} />
          <div className="fbt-display" style={{ fontSize: 16, marginBottom: 6 }}>
            {items.length === 0 ? "NO TESTIMONIALS YET" : "NO MATCHES"}
          </div>
          {items.length === 0 && (
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
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
                      <span style={{ padding: "2px 8px", background: "#DCFCE7", color: "#166534", fontSize: 9, fontWeight: 700 }}>ON WEBSITE</span>
                    ) : (
                      <span style={{ padding: "2px 8px", background: "#F5F5F4", color: "var(--concrete)", fontSize: 9, fontWeight: 700 }}>DRAFT</span>
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
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--concrete)" }}>
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
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchAuditLog({ limit: 500 });
        if (!cancelled) setEntries(data);
      } catch (e) {
        console.error("AuditTab load:", e);
        if (!cancelled) onToast("⚠ Couldn't load audit log — table may not exist yet");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [onToast]);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLog({ limit: 500 });
      setEntries(data);
    } catch (e) {
      console.error("AuditTab reload:", e);
      onToast("⚠ Couldn't load audit log");
    } finally {
      setLoading(false);
    }
  };

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

  const exportCsv = () => {
    if (filtered.length === 0) { onToast("Nothing to export"); return; }
    const header = ["When", "Actor", "Action", "Entity Type", "Entity ID", "Entity Label", "Details"];
    const rows = filtered.map((e) => [
      e.happenedAt || "",
      e.actor || "",
      AUDIT_ACTION_LABELS[e.actionType] || e.actionType || "",
      e.entityType || "",
      e.entityId || "",
      e.entityLabel || "",
      formatAuditMetadata(e) || "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`✓ EXPORTED ${filtered.length} ROW${filtered.length !== 1 ? "S" : ""}`);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <FileText size={22} style={{ color: "var(--steel)" }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="fbt-display" style={{ fontSize: 18 }}>Audit log</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
            High-value actions · 90-day retention · {entries.length} total entries
          </div>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="btn-ghost"
          style={{ fontSize: 12 }}
          title="Refresh from server"
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="btn-ghost"
          style={{ fontSize: 12 }}
          title="Download filtered entries as CSV"
        >
          ↓ Export CSV
        </button>
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
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", fontSize: 12, color: "var(--concrete)" }}>
          LOADING AUDIT LOG...
        </div>
      ) : filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 40, textAlign: "center" }}>
          <FileText size={40} style={{ color: "var(--concrete)", margin: "0 auto 12px", display: "block" }} />
          <div className="fbt-display" style={{ fontSize: 16, marginBottom: 6 }}>NO AUDIT ENTRIES</div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
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
      scope === "drivers" ? "Driver" : "Sub Hauler",
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
            {scope === "drivers" ? "DRIVER" : "SUB HAULER"} PERFORMANCE
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
              padding: "6px 14px", fontSize: 10, fontWeight: 700,
              background: scope === "drivers" ? "var(--steel)" : "#FFF",
              color: scope === "drivers" ? "var(--cream)" : "var(--steel)",
              border: "none", cursor: "pointer",
            }}
          >DRIVERS</button>
          <button
            type="button"
            onClick={() => setScope("subs")}
            style={{
              padding: "6px 14px", fontSize: 10, fontWeight: 700,
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
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 720 }}>
            <thead>
              <tr style={{ background: "var(--steel)", color: "var(--cream)" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10 }}>{scope === "drivers" ? "DRIVER" : "SUB HAULER"}</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10 }}>LOADS</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10 }}>TONS</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10 }}>REVENUE</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10 }}>MARGIN</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 10 }}>RELIABILITY</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 10 }}>PHOTOS</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 10, width: 40 }}></th>
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
                            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8 }}>
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
                                    <span style={{ padding: "1px 6px", fontSize: 9, background: fb.status === "approved" ? "#DCFCE7" : "#FEF3C7", color: fb.status === "approved" ? "#166534" : "#92400E", fontWeight: 700 }}>
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

      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 10, lineHeight: 1.6 }}>
        ▸ REVENUE = WHAT CUSTOMER WAS BILLED FOR THIS {scope === "drivers" ? "DRIVER'S" : "SUB'S"} WORK (FROM BILLING LINES)<br/>
        ▸ MARGIN = REVENUE − DIRECT PAY COST (NOT INCLUDING OVERHEAD OR FUEL)<br/>
        ▸ RELIABILITY = SUBMITTED ÷ EXPECTED TRUCKS ON DISPATCHES THEY WERE ASSIGNED TO<br/>
        ▸ PHOTOS = % OF FBs WITH AT LEAST ONE SCALE TICKET OR LOAD PHOTO ATTACHED<br/>
        ▸ CLICK ANY ROW FOR RECENT LOAD DETAIL
      </div>
    </div>
  );
};

// Inline SVG bar chart of tonnage per day. No chart-library dependency.
// `series` is [{ date: "YYYY-MM-DD", tons, fbCount }] sorted ascending.
const TonnageTrendChart = ({ series = [] }) => {
  if (!series || series.length === 0) {
    return (
      <div className="fbt-card" style={{ padding: 20 }}>
        <h3 className="fbt-display" style={{ fontSize: 16, margin: "0 0 12px" }}>Tonnage trend</h3>
        <div style={{ padding: 24, background: "var(--surface)", borderRadius: 6, fontSize: 13, color: "var(--concrete)", textAlign: "center" }}>
          No data in this range.
        </div>
      </div>
    );
  }
  const maxTons = Math.max(1, ...series.map((d) => d.tons));
  const totalTons = series.reduce((s, d) => s + d.tons, 0);
  const W = 100; // viewBox width units; bars stretch to actual width via responsive svg
  const barW = W / series.length;
  // Pick label cadence so we don't render 30 overlapping x-axis labels.
  // Show ~7 evenly-spaced labels max.
  const labelEvery = Math.max(1, Math.ceil(series.length / 7));
  return (
    <div className="fbt-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>Tonnage trend</h3>
        <div style={{ fontSize: 13, color: "var(--concrete)" }}>
          {series.length} day{series.length !== 1 ? "s" : ""} · <strong style={{ color: "var(--steel)" }}>{totalTons.toFixed(1)} tons</strong> total · peak <strong style={{ color: "var(--steel)" }}>{maxTons.toFixed(1)}</strong>
        </div>
      </div>
      <div style={{ position: "relative", paddingBottom: 24 }}>
        <svg viewBox={`0 0 ${W} 60`} preserveAspectRatio="none" style={{ width: "100%", height: 160, overflow: "visible" }}>
          {series.map((d, i) => {
            const h = (d.tons / maxTons) * 50; // leave 10 units headroom for value chip
            const x = i * barW + barW * 0.1;
            const y = 60 - h;
            const wBar = barW * 0.8;
            return (
              <g key={d.date}>
                <rect x={x} y={y} width={wBar} height={h} fill={d.tons > 0 ? "var(--accent)" : "var(--line)"} rx={0.4}>
                  <title>{`${d.date}: ${d.tons.toFixed(1)}t · ${d.fbCount} FB${d.fbCount !== 1 ? "s" : ""}`}</title>
                </rect>
              </g>
            );
          })}
        </svg>
        {/* X-axis labels */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 20, display: "flex", fontSize: 10, color: "var(--concrete)", fontFamily: "inherit" }}>
          {series.map((d, i) => (
            <div key={d.date} style={{ flex: 1, textAlign: "center", overflow: "hidden", whiteSpace: "nowrap" }}>
              {i % labelEvery === 0 ? d.date.slice(5) /* MM-DD */ : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Driver utilization — fbCount, unique dispatches, tonnage, hours per driver.
const DriverUtilizationPanel = ({ rows = [] }) => {
  if (!rows || rows.length === 0) {
    return (
      <div className="fbt-card" style={{ padding: 20 }}>
        <h3 className="fbt-display" style={{ fontSize: 16, margin: "0 0 12px" }}>Driver utilization</h3>
        <div style={{ padding: 24, background: "var(--surface)", borderRadius: 6, fontSize: 13, color: "var(--concrete)", textAlign: "center" }}>
          No driver activity in this range.
        </div>
      </div>
    );
  }
  return (
    <div className="fbt-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>Driver utilization</h3>
        <div style={{ fontSize: 13, color: "var(--concrete)" }}>{rows.length} driver{rows.length !== 1 ? "s" : ""}</div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="fbt-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Driver</th>
              <th style={{ textAlign: "right" }}>Orders</th>
              <th style={{ textAlign: "right" }}>FBs</th>
              <th style={{ textAlign: "right" }}>Tons</th>
              <th style={{ textAlign: "right" }}>Hours</th>
              <th style={{ textAlign: "right" }}>FB / day-on-job</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><div style={{ fontWeight: 500 }}>{r.name}</div></td>
                <td style={{ textAlign: "right" }}>{r.dispatchCount}</td>
                <td style={{ textAlign: "right" }}>{r.fbCount}</td>
                <td style={{ textAlign: "right" }}>{r.tonnage.toFixed(1)}</td>
                <td style={{ textAlign: "right" }}>{r.hoursBilled.toFixed(1)}</td>
                <td style={{ textAlign: "right", color: "var(--concrete)" }}>{r.dispatchCount > 0 ? (r.fbCount / r.dispatchCount).toFixed(1) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: "var(--concrete)", lineHeight: 1.5 }}>
        ▸ Hours = sum of FB hoursBilled (or computed from start/end times when blank). Orders = unique dispatches the driver had at least one FB on.
      </div>
    </div>
  );
};

// Profitability table — used by ReportsTab for the per-project, per-customer,
// and per-sub rollups. Sub-tab toggle shows one of the three at a time.
const ProfitabilityPanel = ({ report }) => {
  const [view, setView] = useState("project"); // project | customer | sub
  const rows = view === "project" ? report.profitByProject
    : view === "customer" ? report.profitByCustomer
    : report.paidBySub;
  const isSubView = view === "sub";

  return (
    <div className="fbt-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>Profitability</h3>
        <div style={{ display: "inline-flex", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", fontSize: 12 }}>
          {[
            { k: "project", label: "By project" },
            { k: "customer", label: "By customer" },
            { k: "sub", label: "By sub/driver" },
          ].map(({ k, label }) => (
            <button
              key={k}
              type="button"
              onClick={() => setView(k)}
              style={{
                padding: "6px 12px",
                background: view === k ? "var(--accent-soft)" : "#FFF",
                color: view === k ? "var(--accent)" : "var(--concrete)",
                border: "none",
                cursor: "pointer",
                fontWeight: view === k ? 600 : 500,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 24, background: "var(--surface)", borderRadius: 6, fontSize: 13, color: "var(--concrete)", textAlign: "center" }}>
          No freight-bill activity in this date range.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="fbt-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>{view === "sub" ? "Sub / driver" : view === "customer" ? "Customer" : "Project"}</th>
                <th style={{ textAlign: "right" }}>FBs</th>
                <th style={{ textAlign: "right" }}>Tons</th>
                {!isSubView && <th style={{ textAlign: "right" }}>Revenue</th>}
                <th style={{ textAlign: "right" }}>{isSubView ? "Paid" : "Sub pay"}</th>
                {!isSubView && <th style={{ textAlign: "right" }}>Brokerage</th>}
                {isSubView && <th style={{ textAlign: "right" }}>Brokerage</th>}
                {!isSubView && <th style={{ textAlign: "right" }}>Net</th>}
                {!isSubView && <th style={{ textAlign: "right" }}>Margin</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id || i}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.name}</div>
                    {r.contractNumber && <div style={{ fontSize: 11, color: "var(--concrete)" }}>{r.contractNumber}</div>}
                    {isSubView && <div style={{ fontSize: 11, color: "var(--concrete)" }}>{r.kind === "driver" ? "Driver" : "Sub"}</div>}
                  </td>
                  <td style={{ textAlign: "right" }}>{r.fbCount}</td>
                  <td style={{ textAlign: "right" }}>{r.tonnage.toFixed(1)}</td>
                  {!isSubView && <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt$(r.revenue)}</td>}
                  <td style={{ textAlign: "right", color: "var(--concrete)" }}>{fmt$(isSubView ? r.subPay : r.subPay)}</td>
                  <td style={{ textAlign: "right", color: "var(--concrete)" }}>{fmt$(isSubView ? r.brokerage : r.subBrokerage)}</td>
                  {!isSubView && (
                    <td style={{ textAlign: "right", fontWeight: 700, color: r.net >= 0 ? "var(--good)" : "var(--safety)" }}>
                      {fmt$(r.net)}
                    </td>
                  )}
                  {!isSubView && (
                    <td style={{ textAlign: "right", color: r.marginPct == null ? "var(--concrete)" : r.marginPct >= 20 ? "var(--good)" : r.marginPct >= 0 ? "var(--warn-fg)" : "var(--safety)" }}>
                      {r.marginPct == null ? "—" : `${r.marginPct.toFixed(1)}%`}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 11, color: "var(--concrete)", lineHeight: 1.5 }}>
        ▸ Revenue = sum of this entity's FB billing-line totals on invoiced FBs in range.
        Sub pay = sum of paying-line totals (post-brokerage). Net = revenue − sub pay − brokerage.
      </div>
    </div>
  );
};

const ReportsTab = ({ dispatches, setDispatches, freightBills, invoices, quotes, quarries, contacts, projects = [], company, editFreightBill, onToast, lastViewedMondayReport, setLastViewedMondayReport }) => {
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
    () => computeReport({ from, to, dispatches, freightBills, invoices, quotes, quarries, contacts, projects }),
    [from, to, dispatches, freightBills, invoices, quotes, quarries, contacts, projects]
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
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
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
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
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
          <span className="fbt-mono" style={{ marginLeft: "auto", fontSize: 12, color: "var(--concrete)" }}>
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
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ HEADLINE METRICS</div>
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

      {/* A/R aging — based on TODAY, ignores the date filter (debts don't care about your filter range) */}
      <div className="fbt-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>Accounts receivable</h3>
          <div style={{ fontSize: 13, color: "var(--concrete)" }}>
            Total outstanding: <strong style={{ color: "var(--steel)" }}>{fmt$(report.arSummary.total)}</strong>
            <span style={{ marginLeft: 6, fontSize: 11 }}>(as of today, all dates)</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {[
            { k: "current", label: "Current (0–30d)", color: "var(--good)" },
            { k: "30", label: "31–60 days", color: "var(--warn-fg)" },
            { k: "60", label: "61–90 days", color: "var(--hazard-deep)" },
            { k: "90+", label: "90+ days", color: "var(--safety)" },
          ].map(({ k, label, color }) => (
            <div key={k} style={{ padding: 14, border: `1px solid ${color}`, borderRadius: 8, background: "#FFF" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{fmt$(report.arSummary.sums[k])}</div>
              <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
                {label} · {report.arSummary.counts[k]} invoice{report.arSummary.counts[k] !== 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>
        {/* Show top 5 oldest in 90+ if any */}
        {report.arSummary.buckets["90+"].length > 0 && (
          <div style={{ marginTop: 14, padding: 12, background: "var(--danger-soft)", border: "1px solid var(--safety)", borderRadius: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--safety)", marginBottom: 6 }}>
              ⚠ Oldest debts ({report.arSummary.buckets["90+"].length} over 90 days)
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              {report.arSummary.buckets["90+"].slice(0, 5).map((inv, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "inherit" }}>
                  <span><strong>{inv.num}</strong> · {inv.billTo} · {inv.days}d old</span>
                  <span style={{ fontWeight: 600 }}>{fmt$(inv.balance)}</span>
                </div>
              ))}
              {report.arSummary.buckets["90+"].length > 5 && (
                <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>+ {report.arSummary.buckets["90+"].length - 5} more</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Profitability — per-project / per-customer / per-sub for the date range */}
      <ProfitabilityPanel report={report} />

      {/* Tonnage trend — one bar per day in the date range */}
      <TonnageTrendChart series={report.tonnageByDay} />

      {/* Driver utilization — drivers only */}
      <DriverUtilizationPanel rows={report.driverUtilization} />

      {/* Top clients */}
      <div className="fbt-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Award size={18} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>TOP CLIENTS BY TONNAGE</h3>
        </div>
        {report.topClients.length === 0 ? (
          <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", textAlign: "center" }}>No data in this range</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {(() => {
              const max = report.topClients[0].tons || 1;
              return report.topClients.map((c, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr auto", gap: 10, alignItems: "center" }}>
                  <div className="fbt-display" style={{ fontSize: 16, color: i === 0 ? "var(--hazard-deep)" : "var(--concrete)" }}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: 13, marginBottom: 3 }}>{c.name}</div>
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
            <h3 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>TOP SUB HAULERS</h3>
          </div>
          {report.topSubs.length === 0 ? (
            <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", textAlign: "center" }}>No sub hauler activity</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {report.topSubs.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i === report.topSubs.length - 1 ? "none" : "1px solid #E7E5E4", fontSize: 13 }}>
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
            <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", textAlign: "center" }}>No quarry-sourced jobs</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {report.quarryUsage.map((q, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i === report.quarryUsage.length - 1 ? "none" : "1px solid #E7E5E4", fontSize: 13 }}>
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
            <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", textAlign: "center" }}>No new quotes</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {report.quotesList.slice(0, 8).map((q, i) => (
                <div key={i} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid #E7E5E4" }}>
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
            <div style={{ padding: 14, background: "#F5F5F4", fontSize: 13, color: "var(--concrete)", textAlign: "center" }}>No invoices generated</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {report.invoicesList.map((inv, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderBottom: "1px solid #E7E5E4" }}>
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
          <div style={{ padding: 14, background: "#D1FAE5", fontSize: 13, color: "var(--good)", textAlign: "center", fontWeight: 700 }}>✓ ALL DISPATCHES ACCOUNTED FOR</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {report.incomplete.map((d, i) => (
              <div key={i} style={{ padding: 10, border: "1.5px solid var(--safety)", background: "#FEE2E2", fontSize: 12, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
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

  // Bundle every compliance file from the Supabase 'compliance-docs' bucket
  // into a single ZIP. JSON backups don't include Storage objects, so this
  // is the only way to get CDLs / med cards / drug tests onto local disk
  // for disaster recovery.
  const [complianceBusy, setComplianceBusy] = useState(false);
  const handleComplianceZip = async () => {
    setComplianceBusy(true);
    try {
      const docs = await fetchComplianceDocs();
      const withFiles = docs.filter((d) => d.filePath);
      if (withFiles.length === 0) {
        onToast("NO COMPLIANCE FILES TO BACK UP");
        return;
      }
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const manifest = [];
      let okCount = 0;
      for (const d of withFiles) {
        try {
          const url = await getComplianceFileUrl(d.filePath);
          if (!url) { manifest.push({ id: d.id, fileName: d.fileName, error: "NO_SIGNED_URL" }); continue; }
          const r = await fetch(url);
          if (!r.ok) { manifest.push({ id: d.id, fileName: d.fileName, error: `HTTP_${r.status}` }); continue; }
          const buf = await r.arrayBuffer();
          // Prefix with contact + doc type so files are sortable in the ZIP
          const safeName = (d.fileName || `${d.id}.bin`).replace(/[/\\?%*:|"<>]/g, "_");
          const folder = (d.docType || "other").toLowerCase();
          zip.file(`${folder}/${d.id}-${safeName}`, buf);
          manifest.push({ id: d.id, contactId: d.contactId, docType: d.docType, fileName: d.fileName, expiryDate: d.expiryDate });
          okCount++;
        } catch (e) {
          manifest.push({ id: d.id, fileName: d.fileName, error: e.message || "FETCH_FAILED" });
        }
      }
      zip.file("manifest.json", JSON.stringify({
        _format: "4brothers-compliance-backup",
        _version: 1,
        _exportedAt: new Date().toISOString(),
        totalDocs: withFiles.length,
        successCount: okCount,
        items: manifest,
      }, null, 2));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `4brothers-compliance-${ts}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      onToast(`COMPLIANCE ZIP DOWNLOADED · ${okCount}/${withFiles.length} FILES`);
    } catch (e) {
      console.error(e);
      onToast("COMPLIANCE ZIP FAILED");
    } finally {
      setComplianceBusy(false);
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
          `• ${counts.quotes} quote requests\n` +
          `• ${counts.fleet} fleet units\n\n` +
          `Current data will be permanently overwritten.`;
        if (!confirm(msg)) {
          setImporting(false);
          e.target.value = "";
          return;
        }
        // Apply
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
            { l: "Quotes", v: state.quotes?.length || 0 },
            { l: "Fleet Units", v: state.fleet?.length || 0 },
          ].map((s, i) => (
            <div key={i} style={{ padding: 14, border: "2px solid var(--steel)", background: "#FFF" }}>
              <div className="fbt-display" style={{ fontSize: 28, lineHeight: 1 }}>{s.v}</div>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>{s.l}</div>
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
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--concrete)", cursor: "pointer", marginBottom: 14 }}>
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

          {/* Compliance docs ZIP — CDLs, med cards, drug tests live in
              Supabase Storage, not the JSON backup. This is the only way
              to get them onto local disk in case the bucket is wiped. */}
          <div style={{ border: "2px solid var(--steel)", padding: 20, background: "#FFF" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <FileDown size={18} />
              <h4 className="fbt-display" style={{ fontSize: 16, margin: 0 }}>COMPLIANCE DOCS (.ZIP)</h4>
            </div>
            <p style={{ fontSize: 13, color: "var(--concrete)", margin: "0 0 14px", lineHeight: 1.5 }}>
              All driver CDLs, medical cards, drug tests and other compliance files in one ZIP. <strong>Not included in the JSON backup</strong> — download separately.
            </p>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 14, lineHeight: 1.5 }}>
              ▸ FILES GROUPED BY DOC TYPE; <code>manifest.json</code> INSIDE LISTS WHAT WAS BACKED UP.
            </div>
            <button onClick={handleComplianceZip} className="btn-ghost" disabled={complianceBusy} style={{ width: "100%", justifyContent: "center" }}>
              <Download size={14} style={{ marginRight: 6 }} /> {complianceBusy ? "PREPARING…" : "DOWNLOAD COMPLIANCE ZIP"}
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
          Load a <code style={{ background: "#F5F5F4", padding: "1px 6px" }}>.json</code> backup file to restore all data. Your current data will be <strong>replaced</strong>.
        </p>
        <div style={{ padding: 12, background: "#FEE2E2", border: "1px solid var(--safety)", color: "var(--safety)", fontSize: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={14} /> WARNING: THIS OVERWRITES EVERYTHING. BACK UP CURRENT DATA FIRST IF YOU WANT TO KEEP IT.
        </div>
        <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleFilePick} />
        <button onClick={() => fileInputRef.current?.click()} className="btn-ghost" disabled={importing}>
          <Upload size={14} style={{ marginRight: 6 }} /> {importing ? "PROCESSING…" : "SELECT BACKUP FILE"}
        </button>
      </div>

      {/* Info */}
      <div className="fbt-card" style={{ padding: 20, background: "#F5F5F4" }}>
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ HOW BACKUPS WORK</div>
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
            border: "2px solid var(--steel)",
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
              <div className="fbt-display" style={{ fontSize: 14 }}>NOTIFICATIONS</div>
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
                <div className="fbt-mono" style={{ fontSize: 11 }}>ALL CAUGHT UP</div>
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
                          <div style={{ fontSize: 13 }}>
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
  const { quotes, bids, fleet, truckTypes = [], dispatches, freightBills, invoices, company, contacts, unreadIds, soundEnabled, browserNotifsEnabled, quarries, lastViewedMondayReport, projects } = state;
  const { setQuotes, setBids, setFleet, setTruckTypes, setDispatches, setFreightBills, setInvoices, createInvoice, setCompany, setContacts, refreshContacts, markAllRead, markDispatchRead, toggleSound, toggleBrowserNotifs, setQuarries, setLastViewedMondayReport, setProjects, editFreightBill } = setters;
  const [pendingDispatch, setPendingDispatch] = useState(null);
  const [pendingFB, setPendingFB] = useState(null); // FB id for Review tab to open
  const [pendingInvoice, setPendingInvoice] = useState(null); // Invoice id for Invoices tab
  const [pendingPaySubId, setPendingPaySubId] = useState(null); // Sub/driver id for Payroll tab
  // FB Archive modal state — `null` closed, `{ dispatchId }` open and pinned
  // to that dispatch (or open with no pin when dispatchId is null).
  const [fbArchiveOpen, setFbArchiveOpen] = useState(null);

  // Admin-side "paper FB came in" path. Auto-approves on save because the
  // admin is the one entering it — no second review needed. Inserts via
  // the same insertFreightBill plumbing so realtime + state updates stay
  // consistent with driver submits.
  const handleAdminAddFb = async (fb) => {
    const { id: _drop, ...rest } = fb;
    const newRow = await insertFreightBill(rest);
    setFreightBills((prev) => [newRow, ...prev.filter((x) => x.id !== newRow.id)]);
    return { id: newRow.id };
  };

  // When the admin has uploaded a custom company logo, swap the browser
  // favicon + Apple home-screen icon to it. The static /favicon.svg stays
  // as the fallback (used before login + during the first paint), so the
  // brand-aligned default kicks in for new users; the custom logo takes
  // over once company state hydrates.
  useEffect(() => {
    const url = company?.logoDataUrl;
    if (!url) return;
    const setLink = (rel) => {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.href = url;
    };
    setLink("icon");
    setLink("apple-touch-icon");
  }, [company?.logoDataUrl]);
  const tabs = [
    { k: "home", l: "Home", ico: <Activity size={16} /> },
    { k: "dispatches", l: "Orders", ico: <ClipboardList size={16} /> },
    { k: "review", l: "Review", ico: <ShieldCheck size={16} /> },
    { k: "payroll", l: "Payroll", ico: <DollarSign size={16} /> },
    { k: "projects", l: "Projects", ico: <Briefcase size={16} /> },
    { k: "invoices", l: "Invoices", ico: <Receipt size={16} /> },
    { k: "contacts", l: "Contacts", ico: <Users size={16} /> },
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
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", borderLeft: "1px solid var(--concrete)", paddingLeft: 16 }}>▸ INTERNAL CONSOLE · LIVE</div>
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
            <button
              onClick={() => {
                // Build a daily briefing email body — open today's tasks at a
                // glance. Sent via mailto: so no backend dependency. Recipient
                // defaults to the company email; falls back to a blank "to:"
                // so the user picks where it goes.
                const todayStr = new Date().toISOString().slice(0, 10);
                const fmtMoney = (n) => "$" + (Number(n) || 0).toFixed(2);
                const daysFromNow = (d) => {
                  if (!d) return null;
                  const t = new Date(d + "T12:00:00").getTime();
                  if (isNaN(t)) return null;
                  const today = new Date(); today.setHours(12, 0, 0, 0);
                  return Math.round((t - today.getTime()) / (1000 * 60 * 60 * 24));
                };
                const dispatchesToday = (dispatches || []).filter((d) => d.date === todayStr && (d.status || "open") !== "closed");
                const pendingFbs = (freightBills || []).filter((fb) => (fb.status || "pending") === "pending");
                const arInvoices = (invoices || [])
                  .map((inv) => ({ inv, bal: (Number(inv.total) || 0) - (Number(inv.amountPaid) || 0), days: inv.invoiceDate ? Math.max(0, Math.floor((Date.now() - new Date(inv.invoiceDate + "T12:00:00").getTime()) / 86400000)) : 0 }))
                  .filter((x) => x.bal > 0.01);
                const arTotal = arInvoices.reduce((s, x) => s + x.bal, 0);
                const ar90 = arInvoices.filter((x) => x.days > 90);
                const expiringFleet = (fleet || []).map((f) => {
                  const ins = daysFromNow(f.insuranceExpiry);
                  const reg = daysFromNow(f.registrationExpiry);
                  const dot = daysFromNow(f.dotInspectionExpiry);
                  const items = [];
                  if (ins !== null && ins <= 30) items.push(`INS ${ins < 0 ? Math.abs(ins) + "d ago" : "in " + ins + "d"}`);
                  if (reg !== null && reg <= 30) items.push(`REG ${reg < 0 ? Math.abs(reg) + "d ago" : "in " + reg + "d"}`);
                  if (dot !== null && dot <= 30) items.push(`DOT ${dot < 0 ? Math.abs(dot) + "d ago" : "in " + dot + "d"}`);
                  return items.length > 0 ? { unit: f, items } : null;
                }).filter(Boolean);
                const bidsDueSoon = (bids || []).filter((b) => {
                  if (!b.submissionDueAt) return false;
                  if (b.status !== "researching" && b.status !== "preparing") return false;
                  const ms = new Date(b.submissionDueAt).getTime() - Date.now();
                  return ms < 7 * 86400000 && ms > -86400000;
                });

                const lines = [];
                lines.push(`${(company?.name || "4 Brothers Trucking")} — daily briefing`);
                lines.push(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
                lines.push("");
                lines.push(`▸ TODAY'S OPEN ORDERS (${dispatchesToday.length})`);
                if (dispatchesToday.length === 0) lines.push("  · (nothing scheduled)");
                else dispatchesToday.forEach((d) => lines.push(`  · #${d.code || "—"} · ${d.jobName || "—"} · ${d.clientName || "—"} · ${d.trucksExpected || 1} trucks`));
                lines.push("");
                lines.push(`▸ FBs PENDING REVIEW: ${pendingFbs.length}`);
                lines.push("");
                lines.push(`▸ A/R OUTSTANDING: ${fmtMoney(arTotal)} across ${arInvoices.length} invoices`);
                if (ar90.length > 0) {
                  lines.push(`  ⚠ ${ar90.length} 90+ DAY(S):`);
                  ar90.slice(0, 5).forEach(({ inv, bal, days }) => lines.push(`    · ${inv.invoiceNumber} · ${inv.billToName} · ${fmtMoney(bal)} · ${days}d old`));
                  if (ar90.length > 5) lines.push(`    · + ${ar90.length - 5} more`);
                }
                lines.push("");
                lines.push(`▸ FLEET EXPIRING ≤30d (${expiringFleet.length})`);
                if (expiringFleet.length === 0) lines.push("  · (no expiring docs)");
                else expiringFleet.forEach(({ unit, items }) => lines.push(`  · ${unit.unit} · ${unit.type} · ${items.join(" · ")}`));
                lines.push("");
                lines.push(`▸ BIDS DUE ≤7d (${bidsDueSoon.length})`);
                if (bidsDueSoon.length === 0) lines.push("  · (none)");
                else bidsDueSoon.forEach((b) => lines.push(`  · ${b.rfbNumber || b.title} · ${b.agency || "—"} · due ${new Date(b.submissionDueAt).toLocaleDateString()}`));

                const body = encodeURIComponent(lines.join("\n"));
                const subject = encodeURIComponent(`${company?.name || "4 Brothers"} briefing · ${todayStr}`);
                const to = company?.email || "";
                window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
              }}
              className="btn-ghost"
              style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "8px 14px", fontSize: 11 }}
              title="Email yourself today's open orders, pending reviews, A/R, and expiring fleet docs"
            >
              ☀ BRIEFING
            </button>
            <InstallAppButton compact />
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
        {tab === "home" && <HomeTab freightBills={freightBills} dispatches={dispatches} contacts={contacts} setContacts={setContacts} projects={projects || []} invoices={invoices || []} quotes={quotes || []} bids={bids || []} fleet={fleet || []} company={company} onJumpTab={(k, payload) => {
          setTab(k);
          if (!payload) return;
          if (k === "dispatches") setPendingDispatch(payload);
          else if (k === "review") setPendingFB(payload);
          else if (k === "invoices") setPendingInvoice(payload);
          else if (k === "payroll") setPendingPaySubId(payload);
        }} onToast={onToast} />}
        {tab === "dispatches" && <DispatchesTab dispatches={dispatches} setDispatches={setDispatches} freightBills={freightBills} setFreightBills={setFreightBills} contacts={contacts} setContacts={setContacts} company={company} unreadIds={unreadIds || []} markDispatchRead={markDispatchRead} pendingDispatch={pendingDispatch} clearPendingDispatch={() => setPendingDispatch(null)} quarries={quarries || []} projects={projects || []} fleet={fleet || []} truckTypes={truckTypes || []} invoices={invoices || []} onAdminAddFb={handleAdminAddFb} onExportFbBundle={(dispatchId) => setFbArchiveOpen({ dispatchId })} onToast={onToast} />}
        {tab === "projects" && <ProjectsTab projects={projects || []} setProjects={setProjects} contacts={contacts} dispatches={dispatches} freightBills={freightBills} invoices={invoices} onJumpToDispatch={(did) => { setTab("dispatches"); setPendingDispatch(did); }} onToast={onToast} />}
        {tab === "review" && <ReviewTab freightBills={freightBills} dispatches={dispatches} setDispatches={setDispatches} contacts={contacts} projects={projects || []} editFreightBill={editFreightBill} invoices={invoices || []} pendingFB={pendingFB} clearPendingFB={() => setPendingFB(null)} onJumpToInvoice={(invId) => { setTab("invoices"); setPendingInvoice(invId); }} onAdminAddFb={handleAdminAddFb} onToast={onToast} />}
        {tab === "payroll" && <PayrollTab freightBills={freightBills} dispatches={dispatches} setDispatches={setDispatches} contacts={contacts} projects={projects || []} invoices={invoices || []} editFreightBill={editFreightBill} company={company} pendingPaySubId={pendingPaySubId} clearPendingPaySubId={() => setPendingPaySubId(null)} onJumpToInvoice={(invId) => { setTab("invoices"); setPendingInvoice(invId); }} onToast={onToast} />}
        {tab === "invoices" && <InvoicesTab freightBills={freightBills} dispatches={dispatches} invoices={invoices} setInvoices={setInvoices} createInvoice={createInvoice} company={company} setCompany={setCompany} contacts={contacts || []} projects={projects || []} editFreightBill={editFreightBill} pendingInvoice={pendingInvoice} clearPendingInvoice={() => setPendingInvoice(null)} onJumpToPayroll={(subId) => { setTab("payroll"); setPendingPaySubId(subId); }} onJumpToDispatch={(did) => { setTab("dispatches"); setPendingDispatch(did); }} onToast={onToast} generateCapabilityStatementPDF={generateCapabilityStatementPDF} />}
        {tab === "contacts" && <ContactsTab contacts={contacts} setContacts={setContacts} refreshContacts={refreshContacts} dispatches={dispatches} freightBills={freightBills} invoices={invoices || []} company={company} onToast={onToast} generateCustomerStatementPDF={generateCustomerStatementPDF} />}
        {tab === "quotes" && <QuotesTab quotes={quotes} setQuotes={setQuotes} dispatches={dispatches} setDispatches={setDispatches} contacts={contacts} projects={projects || []} onJumpTab={(k, orderId) => { setTab(k); if (orderId) setPendingDispatch(orderId); }} onConvertToBid={async (quote) => {
          // Build a bid pre-filled from the quote, persist it, link the quote back, navigate to Bids tab.
          const bidDraft = {
            title: quote.company ? `${quote.company} — ${quote.material || quote.service || "Hauling"}` : (quote.service || "Untitled bid"),
            agency: quote.company || "",
            agencyContactName: quote.contactName || quote.name || "",
            agencyContactEmail: quote.email || "",
            agencyContactPhone: quote.phone || "",
            estimatedValue: quote.totalEstimate ?? quote.estimatedTotal ?? null,
            ourBidAmount: quote.totalEstimate ?? quote.estimatedTotal ?? null,
            status: "submitted",
            priority: "medium",
            tags: ["from-quote"],
            checklistItems: [],
            quoteId: quote.id,
            notes: `Created from quote ${quote.id}.${quote.notes ? "\n\nQuote notes: " + quote.notes : ""}`,
          };
          try {
            const savedBid = await insertBid(bidDraft);
            setBids((prev) => [savedBid, ...prev]);
            // Mark the quote as linked
            const patched = { ...quote, convertedToBidId: savedBid.id };
            await updateQuote(quote.id, { convertedToBidId: savedBid.id }, quote.updatedAt);
            setQuotes((prev) => prev.map((q) => q.id === quote.id ? patched : q));
            logAudit({
              actionType: "quote.convert_to_bid",
              entityType: "quote", entityId: quote.id,
              entityLabel: quote.company || quote.contactName || "Quote",
              metadata: { bidId: savedBid.id, bidTitle: savedBid.title },
            });
            onToast("✓ BID CREATED — SEE BIDS TAB");
            setTab("bids");
          } catch (e) {
            console.error("convert-to-bid failed:", e);
            onToast("⚠ CONVERT FAILED");
          }
        }} onToast={onToast} />}
        {tab === "bids" && <BidsTab bids={bids || []} setBids={setBids} onConvertToProject={async (bid) => {
          // Create a project from an awarded bid, link the bid back, navigate to Projects.
          const projectDraft = {
            customerId: null, // user can pick after — we don't have a customer link from the bid alone
            name: bid.title || "Untitled project",
            description: bid.notes || "",
            contractNumber: bid.rfbNumber || "",
            poNumber: "",
            location: "",
            status: "active",
            startDate: bid.outcomeAt ? bid.outcomeAt.slice(0, 10) : "",
            endDate: "",
            tonnageGoal: "",
            budget: bid.ourBidAmount ?? "",
            bidAmount: bid.ourBidAmount ?? "",
            primeContractor: bid.agency || "",
            fundingSource: "",
            certifiedPayroll: false,
            notes: `Created from bid ${bid.rfbNumber || bid.id}.`,
            defaultRate: "",
            minimumHours: "",
            bidId: bid.id,
            quoteId: bid.quoteId || null,
          };
          try {
            const savedProject = await insertProject(projectDraft);
            setProjects((prev) => [savedProject, ...prev]);
            const patched = { ...bid, convertedToProjectId: savedProject.id };
            await updateBid(bid.id, { convertedToProjectId: savedProject.id }, bid.updatedAt);
            setBids((prev) => prev.map((b) => b.id === bid.id ? patched : b));
            logAudit({
              actionType: "bid.convert_to_project",
              entityType: "bid", entityId: bid.id,
              entityLabel: bid.rfbNumber || bid.title?.slice(0, 40),
              metadata: { projectId: savedProject.id, projectName: savedProject.name },
            });
            onToast("✓ PROJECT CREATED — SEE PROJECTS TAB");
            setTab("projects");
          } catch (e) {
            console.error("convert-to-project failed:", e);
            onToast("⚠ CONVERT FAILED");
          }
        }} onToast={onToast} />}
        {tab === "fleet" && <FleetTab fleet={fleet} setFleet={setFleet} truckTypes={truckTypes} setTruckTypes={setTruckTypes} contacts={contacts} freightBills={freightBills} onJumpToContact={() => setTab("contacts")} onToast={onToast} />}
        {tab === "materials" && <MaterialsTab quarries={quarries || []} setQuarries={setQuarries} dispatches={dispatches} onToast={onToast} />}
        {tab === "reports" && <ReportsTab dispatches={dispatches} setDispatches={setDispatches} freightBills={freightBills} invoices={invoices} quotes={quotes} quarries={quarries || []} contacts={contacts || []} projects={projects || []} company={company} editFreightBill={editFreightBill} onToast={onToast} lastViewedMondayReport={lastViewedMondayReport} setLastViewedMondayReport={setLastViewedMondayReport} />}
        {tab === "recovery" && <RecoveryTab onToast={onToast} />}
        {tab === "audit" && <AuditTab onToast={onToast} />}
        {tab === "testimonials" && <TestimonialsTab onToast={onToast} />}
        {tab === "data" && <DataTab state={state} setters={setters} onToast={onToast} />}
      </div>
      <BottomTabNav tabs={tabs} active={tab} setTab={setTab} />

      {/* FB Archive modal — also reachable from per-dispatch EXPORT FB BUNDLE button */}
      {fbArchiveOpen && (
        <FBArchiveModal
          freightBills={freightBills}
          dispatches={dispatches}
          contacts={contacts}
          projects={projects}
          company={company}
          initialDispatchId={fbArchiveOpen.dispatchId || null}
          onClose={() => setFbArchiveOpen(null)}
          onToast={onToast}
        />
      )}
    </div>
  );
};

export default function App() {
  const [view, setView] = useState("public");
  const [quotes, setQuotes] = useState([]);
  // v19 Batch 3 Session F: bids/RFP tracker
  const [bids, setBids] = useState([]);
  const [fleet, setFleet] = useState([]);
  // Truck-type catalog: free-form admin-defined types (e.g. "Super 10",
  // "End Dump") with default rate + minimum hours. Used to pre-fill
  // assignment rates when admin picks a type on an order. Stored in
  // localStorage like fleet — local prefs, not Supabase.
  const [truckTypes, setTruckTypes] = useState([]);
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

      // Fleet + company still use local storage (not critical to sync across devices)
      // v18: quotes moved to Supabase — no longer loaded from localStorage
      const [f, co, tt] = await Promise.all([
        storageGet("fbt:fleet"),
        storageGet("fbt:company"),
        storageGet("fbt:truckTypes"),
      ]);
      if (f) setFleet(f);
      if (tt) setTruckTypes(tt);
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

    // Helper: every realtime subscription does the same thing — refetch the
    // table on any change. Wrap the body in try/catch so a network blip
    // during refresh shows a toast (so the user knows data is stale and
    // should reload) instead of silently leaving the UI out of date.
    const safeRefresh = async (label, fetcher, setter) => {
      try {
        const fresh = await fetcher();
        setter(fresh);
        return fresh;
      } catch (e) {
        console.error(`[realtime] ${label} refresh failed:`, e);
        setToast(`⚠ ${label.toUpperCase()} SYNC FAILED — RELOAD`);
        return null;
      }
    };

    const unsubFB = subscribeToFreightBills(async (_payload) => {
      // Refetch to get fresh data
      const fresh = await safeRefresh("freight bills", fetchFreightBills, setFreightBills);
      if (!fresh) return;
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
      prevFbIdsRef.current = freshIds;
    });

    const unsubD = subscribeToDispatches(() => safeRefresh("dispatches", fetchDispatches, setDispatches));
    const unsubC = subscribeToContacts(() => safeRefresh("contacts", fetchContacts, setContactsState));
    const unsubQ = subscribeToQuarries(() => safeRefresh("quarries", fetchQuarries, setQuarriesState));
    const unsubI = subscribeToInvoices(() => safeRefresh("invoices", fetchInvoices, setInvoicesState));
    const unsubP = subscribeToProjects(() => safeRefresh("projects", fetchProjects, setProjectsState));
    // v18: Quotes subscription — admin sees new quote requests instantly
    const unsubQuotes = subscribeToQuotes(() => safeRefresh("quotes", fetchQuotes, setQuotes));
    // v19 Session F: Bids subscription
    const unsubBids = subscribeToBids(() => safeRefresh("bids", fetchBids, setBids));

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

  // Length caps prevent ReDoS / pathological inputs from a crafted hash URL.
  // Real codes are 4–8 upper-alphanumeric; hex tokens are 32–64 chars;
  // onboard tokens are ~24–40 chars. Anything outside the range is rejected.
  const submitMatch = route.match(/^#\/submit\/([A-Z0-9]{4,16})(?:\/a\/([A-Za-z0-9]{1,40}))?/i);
  const trackMatch = route.match(/^#\/track\/([A-Z0-9]{4,16})/i);
  const customerMatch = route.match(/^#\/customer\/([a-f0-9]{8,64})/i);
  const clientMatch = route.match(/^#\/client\/([A-Z0-9]{4,16})/i);
  const payMatch = route.match(/^#\/pay\/([a-f0-9]{8,64})/i);  // v23 Session Y
  const onboardMatch = route.match(/^#\/onboard\/([A-Za-z0-9]{8,64})/i);
  const truckMatch = route.match(/^#\/truck\/([A-Za-z0-9]{8,64})/i);

  if (!loaded) {
    return (
      <div className="fbt-root texture-paper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <GlobalStyles />
        <div className="fbt-mono anim-roll" style={{ color: "var(--hazard-deep)" }}>▸ LOADING…</div>
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
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>▸ #{code}</div>
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
            allDispatches={dispatches}
            allFreightBills={freightBills}
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

  // Driver / sub document upload — public, token-based (lazy-loaded chunk)
  if (onboardMatch) {
    const token = onboardMatch[1];
    return (
      <Suspense fallback={<RouteLoading />}>
        <OnboardingPage token={token} />
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

  // Public truck-roadside portal — driver shows a cop registration / insurance / DOT inspection.
  // Requires fleet_portals SQL migration + truck-doc-signed-url Edge Function deployed.
  if (truckMatch) {
    const token = truckMatch[1];
    return (
      <Suspense fallback={<RouteLoading />}>
        <TruckPortalPage token={token} onBack={() => { window.location.hash = ""; }} />
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
          <ErrorBoundary>
            <Dashboard
              state={{ quotes, bids, fleet, truckTypes, dispatches, freightBills, invoices, company, contacts, unreadIds, soundEnabled, browserNotifsEnabled, quarries, lastViewedMondayReport, projects }}
              setters={{ setQuotes, setBids, setFleet, setTruckTypes, setDispatches: setDispatchesShared, setFreightBills: setFreightBillsShared, setInvoices, createInvoice, setCompany, setContacts, refreshContacts: async () => { try { const fresh = await fetchContacts(); setContactsState(fresh); return fresh; } catch (e) { console.warn("refreshContacts failed:", e); return null; } }, markAllRead, markDispatchRead, toggleSound, toggleBrowserNotifs, setQuarries, setLastViewedMondayReport, setProjects, editFreightBill }}
              onToast={showToast}
              onExit={() => setView("public")}
              onLogout={handleLogout}
              onChangePassword={() => setShowChangePw(true)}
            />
          </ErrorBoundary>
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
              <h3 className="fbt-display" style={{ fontSize: 17, margin: 0 }}>SESSION IDLE</h3>
            </div>
            <div style={{ padding: 20, display: "grid", gap: 14 }}>
              <p style={{ fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                You've been inactive for 30 minutes. For security, we'll log you out in:
              </p>
              <div style={{ textAlign: "center", padding: "14px 0" }}>
                <div style={{ fontSize: 56, color: idleCountdown <= 10 ? "var(--safety)" : "var(--steel)", lineHeight: 1 }}>
                  {idleCountdown}
                </div>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
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
