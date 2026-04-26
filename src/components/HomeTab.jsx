import { useState, useMemo } from "react";
import {
  Activity, AlertTriangle, ClipboardList, Clock, DollarSign,
  Mail, Receipt, Search, ShieldCheck, Truck,
} from "lucide-react";
import { fmt$, bidDaysUntil, daysSince, hoursSince, minutesSince, computeProjectProfitability } from "../utils";
import { BidDeadlineChip } from "./BidDeadlineChip";
import { SectionCard, Row } from "./SectionCard";

// daysUntil helper for fleet expiry chips (mirrors FleetTab's helper).
const daysUntilDate = (dateStr) => {
  if (!dateStr) return null;
  const t = new Date(dateStr + "T12:00:00").getTime();
  if (isNaN(t)) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((t - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const HomeTab = ({
  freightBills, dispatches, contacts, setContacts, projects, invoices, quotes, bids = [], fleet = [], company,
  onJumpTab, onToast,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Day view state — which day's orders admin is looking at
  const [viewDate, setViewDate] = useState(todayStr);
  const [searchTerm, setSearchTerm] = useState("");

  // Orders for the currently-viewed day (ignore search)
  const ordersForDay = useMemo(() => {
    return dispatches
      .filter((d) => d.date === viewDate)
      .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [dispatches, viewDate]);

  // Search results — global across ALL dispatches, ignoring day filter
  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return dispatches
      .filter((d) => {
        const hay = [
          d.code, d.jobName, d.clientName, d.pickup, d.dropoff, d.material, d.notes,
          d.date,
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")) // newest first
      .slice(0, 30);
  }, [dispatches, searchTerm]);

  // Date nav helpers
  const shiftDate = (days) => {
    const d = new Date(viewDate + "T12:00:00"); // noon to dodge DST edge cases
    d.setDate(d.getDate() + days);
    setViewDate(d.toISOString().slice(0, 10));
  };
  const dateLabel = (() => {
    const d = new Date(viewDate + "T12:00:00");
    if (isNaN(d)) return viewDate;
    const isToday = viewDate === todayStr;
    return (isToday ? "TODAY · " : "") + d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase();
  })();

  // SECTION 1: Pending FB reviews
  const pendingFbs = useMemo(() =>
    freightBills.filter((fb) => (fb.status || "pending") === "pending")
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)),
    [freightBills]);

  // SECTION 2: Below-minimum FBs needing admin confirmation
  const belowMinFbs = useMemo(() => {
    return freightBills.filter((fb) => {
      if (fb.minHoursApplied) return false;
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      const p = projects.find((pp) => pp.id === d?.projectId);
      const minH = Number(p?.minimumHours) || 0;
      if (minH <= 0) return false;
      let h = Number(fb.hoursBilled) || 0;
      if (!h && fb.pickupTime && fb.dropoffTime) {
        const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
        const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
        const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (mins > 0) h = mins / 60;
      }
      return h > 0 && h < minH;
    });
  }, [freightBills, dispatches, projects]);

  // SECTION 3 & 4: Invoice statuses
  const invoiceStatus = (inv) => {
    if (inv.statusOverride) return inv.statusOverride;
    const paid = Number(inv.amountPaid || 0);
    const total = Number(inv.total || 0);
    if (total === 0) return "outstanding";
    if (paid >= total - 0.01) return "paid";
    if (paid > 0) return "partial";
    if (inv.dueDate) {
      const due = new Date(inv.dueDate);
      if (!isNaN(due) && due < new Date()) return "overdue";
    }
    return "outstanding";
  };
  const unpaidInvoices = useMemo(() =>
    invoices.filter((i) => ["outstanding", "partial", "overdue"].includes(invoiceStatus(i)))
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")),
    [invoices]);
  const overdueInvoices = useMemo(() =>
    invoices.filter((i) => invoiceStatus(i) === "overdue")
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")),
    [invoices]);

  // SECTION 5: Ready-to-pay subs (customer paid FBs waiting for payroll)
  const readyToPay = useMemo(() => {
    const bySub = new Map();
    freightBills.forEach((fb) => {
      if (fb.status !== "approved") return;
      if (fb.paidAt) return; // already paid to sub
      if (!fb.customerPaidAt) return; // customer hasn't paid yet
      const d = dispatches.find((x) => x.id === fb.dispatchId);
      const assignment = (d?.assignments || []).find((a) => a.aid === fb.assignmentId);
      if (!assignment || !assignment.payRate) return;

      let qty = 0;
      const method = assignment.payMethod || "hour";
      if (method === "hour") {
        if (fb.hoursBilled) qty = Number(fb.hoursBilled);
        else if (fb.pickupTime && fb.dropoffTime) {
          const [h1, m1] = String(fb.pickupTime).split(":").map(Number);
          const [h2, m2] = String(fb.dropoffTime).split(":").map(Number);
          const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (mins > 0) qty = mins / 60;
        }
      } else if (method === "ton") qty = Number(fb.tonnage) || 0;
      else if (method === "load") qty = Number(fb.loadCount) || 1;

      const key = assignment.contactId || `anon_${assignment.aid}`;
      const contact = contacts.find((c) => c.id === assignment.contactId);
      const brokPct = Number(contact?.brokeragePercent ?? 8);
      const brokApplies = !!contact?.brokerageApplies;
      const rawGross = qty * Number(assignment.payRate);
      const extraSum = (fb.extras || []).filter((x) => x.reimbursable !== false).reduce((s, x) => s + (Number(x.amount) || 0), 0);
      const gross = rawGross + extraSum;
      const net = brokApplies ? gross * (1 - brokPct / 100) : gross;

      if (!bySub.has(key)) {
        bySub.set(key, { name: assignment.name, count: 0, net: 0, kind: assignment.kind, subId: assignment.contactId });
      }
      const entry = bySub.get(key);
      entry.count += 1;
      entry.net += net;
    });
    return Array.from(bySub.values()).sort((a, b) => b.net - a.net);
  }, [freightBills, dispatches, contacts]);

  // SECTION 6: Open orders today
  const todaysOrders = useMemo(() =>
    dispatches.filter((d) => {
      if ((d.status || "open") === "closed") return false;
      const dd = (d.date || "").slice(0, 10);
      return dd === todayStr;
    }).sort((a, b) => (a.code || "").localeCompare(b.code || "")),
    [dispatches, todayStr]);

  const activeOrdersCount = useMemo(() =>
    dispatches.filter((d) => (d.status || "open") !== "closed").length,
    [dispatches]);

  // SECTION 7: Active quotes (not accepted/rejected)
  const activeQuotes = useMemo(() =>
    (quotes || []).filter((q) => {
      const s = (q.status || "pending").toLowerCase();
      return s !== "accepted" && s !== "rejected" && s !== "closed";
    }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [quotes]);

  // SECTION 8: MTD stats
  const mtd = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const startMonth = new Date(y, m, 1);
    let invoicedTotal = 0;
    let paidTotal = 0;
    invoices.forEach((i) => {
      const d = new Date(i.invoiceDate || i.createdAt || 0);
      if (d >= startMonth) {
        invoicedTotal += Number(i.total) || 0;
        paidTotal += Number(i.amountPaid) || 0;
      }
    });
    const activeProjectsCount = projects.filter((p) => (p.status || "active") === "active").length;
    return { invoicedTotal, paidTotal, activeProjectsCount };
  }, [invoices, projects]);

  // Totals
  const totalUnpaid = unpaidInvoices.reduce((s, i) => s + ((Number(i.total) || 0) - (Number(i.amountPaid) || 0)), 0);
  const totalOverdue = overdueInvoices.reduce((s, i) => s + ((Number(i.total) || 0) - (Number(i.amountPaid) || 0)), 0);
  const totalReadyToPay = readyToPay.reduce((s, x) => s + x.net, 0);

  // A/R aging mini-breakdown — same buckets the Reports tab uses, surfaced here
  // as quick chips on the unpaid invoices card.
  const arBuckets = useMemo(() => {
    const acc = { current: 0, "30": 0, "60": 0, "90+": 0 };
    invoices.forEach((inv) => {
      const bal = (Number(inv.total) || 0) - (Number(inv.amountPaid) || 0);
      if (bal <= 0.01) return;
      const days = inv.invoiceDate ? daysSince(inv.invoiceDate) || 0 : 0;
      const k = days <= 30 ? "current" : days <= 60 ? "30" : days <= 90 ? "60" : "90+";
      acc[k] += bal;
    });
    return acc;
  }, [invoices]);

  // Fleet alerts — units with insurance / registration / DOT / preventive
  // maintenance expired or due within 30 days. Sorted worst first.
  const fleetAlerts = useMemo(() => {
    return (fleet || [])
      .map((f) => {
        const labels = [];
        const days = (key) => daysUntilDate(f[key]);
        const ins = days("insuranceExpiry");
        const reg = days("registrationExpiry");
        const dot = days("dotInspectionExpiry");
        const oil = days("nextOilChange");
        const brake = days("nextBrakeService");
        const smog = days("nextSmogCheck");
        if (ins !== null && ins <= 30) labels.push({ kind: "INS", days: ins });
        if (reg !== null && reg <= 30) labels.push({ kind: "REG", days: reg });
        if (dot !== null && dot <= 30) labels.push({ kind: "DOT", days: dot });
        if (oil !== null && oil <= 30) labels.push({ kind: "OIL", days: oil });
        if (brake !== null && brake <= 30) labels.push({ kind: "BRAKE", days: brake });
        if (smog !== null && smog <= 30) labels.push({ kind: "SMOG", days: smog });
        if (labels.length === 0) return null;
        const worst = Math.min(...labels.map((l) => l.days));
        return { unit: f, labels, worst };
      })
      .filter(Boolean)
      .sort((a, b) => a.worst - b.worst);
  }, [fleet]);

  // Project profitability — billed (invoice totals) - paid out (FB pay) - fees
  // (FB extras like tolls/dump). Surfaces top winners + losers so the owner can
  // see at a glance which jobs are making money and which are bleeding.
  const projectMargins = useMemo(() => {
    return (projects || [])
      .filter((p) => p.status !== "archived")
      .map((p) => computeProjectProfitability(p, dispatches, freightBills, invoices))
      .filter((m) => m && (m.billed > 0 || m.paidOut > 0))
      .sort((a, b) => b.margin - a.margin);
  }, [projects, dispatches, freightBills, invoices]);

  // Driver compliance alerts — drivers/subs with CDL or medical card expiring
  // within 30 days. Same shape as fleetAlerts so the panel can render either.
  const driverDocAlerts = useMemo(() => {
    return (contacts || [])
      .filter((c) => c.type === "driver" || c.type === "sub")
      .map((c) => {
        const labels = [];
        const cdl = daysUntilDate(c.cdlExpiry);
        const med = daysUntilDate(c.medicalCardExpiry);
        if (cdl !== null && cdl <= 30) labels.push({ kind: "CDL", days: cdl });
        if (med !== null && med <= 30) labels.push({ kind: "MED", days: med });
        if (labels.length === 0) return null;
        const worst = Math.min(...labels.map((l) => l.days));
        return { contact: c, labels, worst };
      })
      .filter(Boolean)
      .sort((a, b) => a.worst - b.worst);
  }, [contacts]);

  // Compliance packet completeness — for each driver/sub, count which of
  // the configured required-doc kinds are present in their documents[]
  // array. Surfaces the laggards so the dispatcher can chase them. The
  // required-kinds list lives in localStorage on the admin device (set via
  // ContactModal's "Configure required" panel); falls back to "all kinds
  // except 'other'" when nothing's been configured yet.
  const complianceMissing = useMemo(() => {
    const driverKinds = (() => {
      try {
        const raw = localStorage.getItem("fbt:requiredDocs:driver");
        if (raw) return JSON.parse(raw);
      } catch { /* noop */ }
      return ["cdl", "medical_card", "mvr", "i9", "w4", "driver_app", "direct_deposit", "drug_test"];
    })();
    const subKinds = (() => {
      try {
        const raw = localStorage.getItem("fbt:requiredDocs:sub");
        if (raw) return JSON.parse(raw);
      } catch { /* noop */ }
      return ["w9", "coi", "operating_authority", "ic_agreement", "workers_comp"];
    })();
    return (contacts || [])
      .filter((c) => c.type === "driver" || c.type === "sub")
      .map((c) => {
        const required = c.type === "driver" ? driverKinds : subKinds;
        if (required.length === 0) return null;
        const docs = Array.isArray(c.documents) ? c.documents : [];
        const have = required.filter((k) => docs.some((d) => d.kind === k || d.kind === `${k}_form`));
        const missing = required.filter((k) => !have.includes(k));
        if (missing.length === 0) return null; // fully compliant
        return { contact: c, total: required.length, have: have.length, missing };
      })
      .filter(Boolean)
      .sort((a, b) => b.missing.length - a.missing.length);
  }, [contacts]);

  // v18 Dashboard rebuild: Money Out = approved + not-yet-paid FBs' pay nets by driver/sub.
  // Uses payingLines when available, falls back to paid snapshot.
  const moneyOut = useMemo(() => {
    const unpaidFbs = freightBills.filter((fb) => {
      if (fb.status !== "approved") return false;
      if (fb.paidAt || fb.payStatementLockedAt) return false;
      return true;
    });
    const total = unpaidFbs.reduce((s, fb) => {
      const lines = Array.isArray(fb.payingLines) ? fb.payingLines : [];
      if (lines.length === 0) {
        // Legacy fallback
        const method = fb.paidMethodSnapshot || "hour";
        const qty = method === "hour" ? Number(fb.paidHours || 0)
                  : method === "ton" ? Number(fb.paidTons || 0)
                  : Number(fb.paidLoads || 0);
        return s + qty * Number(fb.paidRate || 0);
      }
      return s + lines.reduce((ss, ln) => ss + (Number(ln.net) || 0), 0);
    }, 0);
    return { total, count: unpaidFbs.length };
  }, [freightBills]);

  // v18: Missing FBs — dispatches approved + scheduled date in past, but one or more
  // assignments haven't submitted an FB. Each row = { dispatch, assignment, contact, daysLate }.
  const missingFbs = useMemo(() => {
    const out = [];
    const nowStr = todayStr;
    for (const d of dispatches) {
      if (d.status !== "approved" && d.status !== "open") continue;  // must be approved/open
      if (!d.date || d.date > nowStr) continue;  // scheduled date must be today or in past

      // Calc days late (0 if today, 1+ if past)
      const dispatchDate = new Date(d.date);
      const now = new Date(nowStr);
      const daysLate = Math.max(0, Math.floor((now - dispatchDate) / (1000 * 60 * 60 * 24)));

      const assignments = Array.isArray(d.assignments) ? d.assignments : [];
      for (const a of assignments) {
        // Has this assignment submitted an FB?
        const submittedFb = freightBills.find((fb) => fb.dispatchId === d.id && fb.assignmentId === a.aid);
        if (submittedFb) continue;  // submitted, skip

        const contact = a.contactId ? contacts.find((c) => c.id === a.contactId) : null;
        out.push({
          dispatch: d,
          assignment: a,
          contact,
          daysLate,
          name: a.name || contact?.contactName || contact?.companyName || "Unnamed",
        });
      }
    }
    return out.sort((x, y) => y.daysLate - x.daysLate);
  }, [dispatches, freightBills, contacts, todayStr]);

  // Open quotes count (unconverted)
  const openQuotesCount = useMemo(() => {
    return (quotes || []).filter((q) => !q.convertedToDispatchId && q.status !== "rejected").length;
  }, [quotes]);

  // Reusable card wrapper
  return (
    <div style={{ display: "grid", gap: 20 }}>

      {/* Welcome header */}
      <div className="fbt-card" style={{ padding: "18px 22px", background: "linear-gradient(135deg, var(--steel), #3F3B38)", color: "var(--cream)" }}>
        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)" }}>
          ▸ COMMAND CENTER · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </div>
        <h2 className="fbt-display" style={{ fontSize: 22, margin: "4px 0 0" }}>
          {company?.name || "4 BROTHERS TRUCKING"}
        </h2>
      </div>

      {/* v18 Dashboard rebuild: 6 business-health stat cards (click to jump to tab) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <div className="fbt-card" style={{ padding: 14, cursor: "pointer", borderLeft: "4px solid var(--good)" }}
             onClick={() => onJumpTab("invoices")}>
          <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>💰 MONEY DUE IN</div>
          <div className="stat-num" style={{ color: "var(--good)", marginTop: 4 }}>{fmt$(totalUnpaid)}</div>
          <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
            {unpaidInvoices.length} invoice{unpaidInvoices.length !== 1 ? "s" : ""}
            {overdueInvoices.length > 0 && <span style={{ color: "var(--safety)", fontWeight: 700 }}> · {overdueInvoices.length} OVERDUE</span>}
          </div>
        </div>

        <div className="fbt-card" style={{ padding: 14, cursor: "pointer", borderLeft: "4px solid #9A3412" }}
             onClick={() => onJumpTab("payroll")}>
          <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>💸 MONEY OUT</div>
          <div className="stat-num" style={{ color: "#9A3412", marginTop: 4 }}>{fmt$(moneyOut.total)}</div>
          <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
            {moneyOut.count} unpaid FB{moneyOut.count !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="fbt-card" style={{ padding: 14, cursor: "pointer", borderLeft: "4px solid var(--hazard-deep)" }}
             onClick={() => onJumpTab("review")}>
          <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>✅ FBs PENDING REVIEW</div>
          <div className="stat-num" style={{ color: "var(--hazard-deep)", marginTop: 4 }}>{pendingFbs.length}</div>
          <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
            {pendingFbs.length === 0 ? "all caught up ✓" : "awaiting approval"}
          </div>
        </div>

        <div className="fbt-card" style={{ padding: 14, cursor: "pointer", borderLeft: "4px solid #0369A1" }}
             onClick={() => onJumpTab("dispatches")}>
          <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>🚚 TODAY'S ORDERS</div>
          <div className="stat-num" style={{ color: "#0369A1", marginTop: 4 }}>{ordersForDay.filter((d) => d.date === todayStr).length || dispatches.filter((d) => d.date === todayStr).length}</div>
          <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>running today</div>
        </div>

        <div className="fbt-card" style={{ padding: 14, cursor: "pointer", borderLeft: "4px solid var(--steel)" }}
             onClick={() => onJumpTab("quotes")}>
          <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>📋 OPEN QUOTES</div>
          <div className="stat-num" style={{ color: "var(--steel)", marginTop: 4 }}>{openQuotesCount}</div>
          <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>leads to follow up</div>
        </div>

        <div className="fbt-card" style={{ padding: 14, cursor: missingFbs.length > 0 ? "pointer" : "default", borderLeft: `4px solid ${missingFbs.length > 0 ? "var(--safety)" : "var(--good)"}` }}
             onClick={() => {
               if (missingFbs.length > 0) {
                 const el = document.getElementById("dashboard-missing-fbs");
                 if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
               }
             }}>
          <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>⚠️ MISSING FBs</div>
          <div className="stat-num" style={{ color: missingFbs.length > 0 ? "var(--safety)" : "var(--good)", marginTop: 4 }}>{missingFbs.length}</div>
          <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
            {missingFbs.length === 0 ? "all submitted ✓" : "send reminder ▸"}
          </div>
        </div>
      </div>

      {/* Missing FBs panel — shown only if any */}
      {missingFbs.length > 0 && (
        <div id="dashboard-missing-fbs" className="fbt-card" style={{ padding: 0, overflow: "hidden", border: "2px solid var(--safety)" }}>
          <div style={{ padding: "12px 16px", background: "var(--safety)", color: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div className="fbt-mono" style={{ fontSize: 11, fontWeight: 700 }}>
              ⚠️ {missingFbs.length} DRIVER{missingFbs.length !== 1 ? "S" : ""}/SUB{missingFbs.length !== 1 ? "S" : ""} HAVE NOT SUBMITTED FB
            </div>
            <span className="fbt-mono" style={{ fontSize: 10, opacity: 0.9 }}>TAP 📱 OR ✉️ TO NUDGE</span>
          </div>
          <div style={{ padding: 8, maxHeight: 320, overflowY: "auto", display: "grid", gap: 6 }}>
            {missingFbs.map((m, idx) => {
              const phone = m.contact?.phone;
              const email = m.contact?.email;
              // Include the per-assignment upload link so the driver can tap
              // straight in — pasted plain (not URL-encoded again) so iOS
              // Messages renders it as a tappable link.
              const uploadUrl = `${window.location.origin}${window.location.pathname}#/submit/${m.dispatch.code || ""}/a/${m.assignment.aid}`;
              const reminderText =
                `Hi ${m.name}, this is 4 Brothers Trucking. ` +
                `We're missing your freight bill for order ${m.dispatch.code || ""} ` +
                `on ${new Date(m.dispatch.date).toLocaleDateString()}. ` +
                `Upload here: ${uploadUrl}`;
              const smsMsg = encodeURIComponent(reminderText);
              const emailSubj = encodeURIComponent(`Missing freight bill — order ${m.dispatch.code || ""}`);
              const emailBody = encodeURIComponent(reminderText);
              return (
                <div key={`${m.dispatch.id}-${m.assignment.aid}-${idx}`} style={{ padding: 10, background: m.daysLate >= 2 ? "#FEE2E2" : "#FEF3C7", border: `1.5px solid ${m.daysLate >= 2 ? "var(--safety)" : "var(--hazard-deep)"}`, display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="fbt-mono" style={{ fontWeight: 700, fontSize: 12 }}>
                        {m.name}
                      </span>
                      <span className="chip" style={{ background: m.assignment.kind === "sub" ? "#9A3412" : "#0369A1", color: "#FFF", fontSize: 9, padding: "1px 6px" }}>
                        {m.assignment.kind === "sub" ? "SUB" : "DRV"}
                      </span>
                      <span className="chip" style={{ background: m.daysLate >= 2 ? "var(--safety)" : "var(--hazard-deep)", color: "#FFF", fontSize: 9, padding: "1px 6px" }}>
                        {m.daysLate === 0 ? "TODAY" : `${m.daysLate}d late`}
                      </span>
                    </div>
                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 3 }}>
                      Order {m.dispatch.code || "—"} · {m.dispatch.jobName || "—"} · {new Date(m.dispatch.date).toLocaleDateString()}
                      {phone && <> · 📞 {phone}</>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {phone && (
                      <a
                        href={`sms:${phone}?body=${smsMsg}`}
                        className="btn-primary"
                        style={{ padding: "5px 10px", fontSize: 10, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                        title="Text reminder"
                      >
                        📱 SMS
                      </a>
                    )}
                    {email && (
                      <a
                        href={`mailto:${email}?subject=${emailSubj}&body=${emailBody}`}
                        className="btn-ghost"
                        style={{ padding: "5px 10px", fontSize: 10, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                        title="Email reminder"
                      >
                        ✉️ EMAIL
                      </a>
                    )}
                    {!phone && !email && (
                      <span className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", fontStyle: "italic" }}>no contact info</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* v19a Session G: BIDS DUE SOON panel */}
      {(() => {
        // Active bids only (researching/preparing), sorted by submission date, with submission_due_at set
        const activeBids = bids.filter((b) =>
          (b.status === "researching" || b.status === "preparing") && b.submissionDueAt
        );
        const upcoming = activeBids
          .map((b) => ({ ...b, _daysUntil: bidDaysUntil(b.submissionDueAt) }))
          .filter((b) => b._daysUntil !== null && b._daysUntil >= -1)  // keep 1-day overdue still visible
          .sort((a, b) => a._daysUntil - b._daysUntil)
          .slice(0, 5);

        // Pre-bid meetings in the next 14 days
        const preBids = bids
          .filter((b) => b.preBidMeetingAt && (b.status === "discovered" || b.status === "researching" || b.status === "preparing"))
          .map((b) => ({ ...b, _daysUntil: bidDaysUntil(b.preBidMeetingAt) }))
          .filter((b) => b._daysUntil !== null && b._daysUntil >= 0 && b._daysUntil <= 14)
          .sort((a, b) => a._daysUntil - b._daysUntil)
          .slice(0, 3);

        if (upcoming.length === 0 && preBids.length === 0) return null;

        const mostUrgent = upcoming[0]?._daysUntil;
        const accentColor = mostUrgent !== undefined && mostUrgent <= 3 ? "var(--safety)" : mostUrgent !== undefined && mostUrgent <= 7 ? "var(--hazard-deep)" : "var(--steel)";

        return (
          <div className="fbt-card" style={{ padding: 0, overflow: "hidden", border: `2px solid ${accentColor}` }}>
            <div style={{ padding: "12px 16px", background: accentColor, color: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div className="fbt-mono" style={{ fontSize: 11, fontWeight: 700 }}>
                📋 {upcoming.length > 0 ? `${upcoming.length} BID${upcoming.length !== 1 ? "S" : ""} DUE SOON` : "UPCOMING BID ACTIVITY"}
              </div>
              <button
                type="button"
                onClick={() => onJumpTab("bids")}
                style={{ background: "rgba(255,255,255,0.2)", border: "1px solid #FFF", color: "#FFF", padding: "4px 10px", cursor: "pointer", fontSize: 10, fontWeight: 700 }}
              >
                VIEW ALL ▸
              </button>
            </div>
            <div style={{ padding: 8, display: "grid", gap: 6 }}>
              {upcoming.map((b) => {
                const checklistTotal = (b.checklistItems || []).length;
                const checklistDone = (b.checklistItems || []).filter((x) => x.done).length;
                return (
                  <div
                    key={b.id}
                    onClick={() => onJumpTab("bids")}
                    style={{
                      padding: 10,
                      background: b._daysUntil <= 1 ? "#FEE2E2" : b._daysUntil <= 3 ? "#FEF3C7" : "#FFF",
                      borderLeft: `4px solid ${b._daysUntil <= 1 ? "var(--safety)" : b._daysUntil <= 3 ? "var(--hazard-deep)" : "var(--steel)"}`,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 13 }}>{b.rfbNumber || b.title.slice(0, 40)}</strong>
                        {b.priority === "high" && (
                          <span className="fbt-mono" style={{ fontSize: 9, padding: "1px 5px", background: "var(--safety)", color: "#FFF", fontWeight: 700 }}>★ HIGH</span>
                        )}
                      </div>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                        {b.agency ? `${b.agency} · ` : ""}{b.ourBidAmount ? fmt$(b.ourBidAmount) : b.estimatedValue ? `est ${fmt$(b.estimatedValue)}` : "no $"}
                        {checklistTotal > 0 && (
                          <span style={{ marginLeft: 8, color: checklistDone === checklistTotal ? "var(--good)" : "var(--hazard-deep)", fontWeight: 700 }}>
                            · {checklistDone}/{checklistTotal} DOCS{checklistDone === checklistTotal ? " ✓" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <BidDeadlineChip dueAt={b.submissionDueAt} />
                  </div>
                );
              })}

              {/* Pre-bid meetings section */}
              {preBids.length > 0 && (
                <>
                  {upcoming.length > 0 && <div style={{ height: 1, background: "#E7E5E4", margin: "4px 0" }} />}
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", padding: "4px 4px 2px" }}>▸ PRE-BID MEETINGS</div>
                  {preBids.map((b) => (
                    <div
                      key={"pre-" + b.id}
                      onClick={() => onJumpTab("bids")}
                      style={{
                        padding: "8px 10px",
                        background: "#F1F5F9",
                        borderLeft: "4px solid #0369A1",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 12 }}>
                          <strong>{b.rfbNumber || b.title.slice(0, 40)}</strong>
                        </div>
                        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
                          {b.agency || "—"}
                        </div>
                      </div>
                      <BidDeadlineChip dueAt={b.preBidMeetingAt} label="MEET" />
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* MTD quick-glance strip (kept below the new cards — shows income/output trends) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <div className="fbt-card" style={{ padding: 12, background: "#F5F5F4" }}>
          <div className="stat-num" style={{ color: "var(--good)", fontSize: 22 }}>{fmt$(mtd.invoicedTotal).slice(0, 10)}</div>
          <div className="stat-label" style={{ fontSize: 10 }}>MTD Invoiced</div>
        </div>
        <div className="fbt-card" style={{ padding: 12, background: "var(--good)", color: "#FFF" }}>
          <div className="stat-num" style={{ color: "#FFF", fontSize: 22 }}>{fmt$(mtd.paidTotal).slice(0, 10)}</div>
          <div className="stat-label" style={{ color: "#FFF", fontSize: 10 }}>MTD Collected</div>
        </div>
        <div className="fbt-card" style={{ padding: 12, background: "#F5F5F4" }}>
          <div className="stat-num" style={{ fontSize: 22 }}>{activeOrdersCount}</div>
          <div className="stat-label" style={{ fontSize: 10 }}>Active Orders</div>
        </div>
        <div className="fbt-card" style={{ padding: 12, background: "#F5F5F4" }}>
          <div className="stat-num" style={{ fontSize: 22 }}>{mtd.activeProjectsCount}</div>
          <div className="stat-label" style={{ fontSize: 10 }}>Active Projects</div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          DAY VIEW — orders for selected day + global search
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="fbt-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", background: "var(--steel)", color: "var(--cream)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          {/* Date navigation */}
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            style={{ background: "transparent", border: "2px solid var(--cream)", color: "var(--cream)", padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
            title="Previous day"
          >
            ◀
          </button>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)" }}>
              ▸ ORDERS ON DAY
            </div>
            <div className="fbt-display" style={{ fontSize: 16, lineHeight: 1.2 }}>{dateLabel}</div>
          </div>
          <input
            type="date"
            value={viewDate}
            onChange={(e) => setViewDate(e.target.value)}
            style={{ padding: "5px 8px", border: "1.5px solid var(--cream)", background: "var(--cream)", color: "var(--steel)", fontSize: 11 }}
            title="Jump to date"
          />
          <button
            type="button"
            onClick={() => setViewDate(todayStr)}
            disabled={viewDate === todayStr}
            style={{
              background: viewDate === todayStr ? "transparent" : "var(--hazard)",
              color: viewDate === todayStr ? "var(--concrete)" : "var(--steel)",
              border: "2px solid " + (viewDate === todayStr ? "var(--concrete)" : "var(--hazard-deep)"),
              padding: "4px 12px",
              cursor: viewDate === todayStr ? "default" : "pointer",
              fontSize: 11, fontWeight: 700,
            }}
          >
            TODAY
          </button>
          <button
            type="button"
            onClick={() => shiftDate(1)}
            style={{ background: "transparent", border: "2px solid var(--cream)", color: "var(--cream)", padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
            title="Next day"
          >
            ▶
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: "10px 18px", background: "#F5F5F4", borderBottom: "1.5px solid var(--steel)", display: "flex", alignItems: "center", gap: 10 }}>
          <Search size={14} style={{ color: "var(--concrete)" }} />
          <input
            type="text"
            placeholder="Search ANY order (customer, job, code, material, date…) — ignores the day filter"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: "6px 10px", border: "1.5px solid var(--concrete)", fontSize: 12, background: "#FFF" }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="btn-ghost"
              style={{ padding: "4px 10px", fontSize: 10 }}
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Content — either search results OR day orders */}
        <div style={{ padding: "14px 18px" }}>
          {searchTerm ? (
            <>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8 }}>
                ▸ SEARCH RESULTS ({searchResults.length}{searchResults.length >= 30 ? "+" : ""}) · "{searchTerm}"
              </div>
              {searchResults.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--concrete)", fontStyle: "italic" }}>
                  No orders match "{searchTerm}". Try different keywords.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 4 }}>
                  {searchResults.map((d) => {
                    const fbCount = freightBills.filter((fb) => fb.dispatchId === d.id).length;
                    return (
                      <div
                        key={d.id}
                        onClick={() => onJumpTab("dispatches", { dispatchId: d.id })}
                        style={{
                          padding: "8px 12px", background: "#FFF", border: "1.5px solid var(--steel)",
                          cursor: "pointer", display: "grid",
                          gridTemplateColumns: "90px 70px 1fr 1fr 80px", gap: 10, alignItems: "center",
                          fontSize: 12,
                        }}
                      >
                        <strong>#{d.code}</strong>
                        <span style={{ color: "var(--concrete)", fontSize: 10 }}>{d.date}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.jobName || "—"}</span>
                        <span style={{ color: "var(--concrete)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.clientName || "—"}</span>
                        <span style={{ textAlign: "right" }}>
                          {fbCount > 0 && (
                            <span className="chip" style={{ background: "var(--steel)", color: "#FFF", fontSize: 9, padding: "1px 6px" }}>
                              {fbCount} FB{fbCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8 }}>
                ▸ ORDERS THIS DAY ({ordersForDay.length})
              </div>
              {ordersForDay.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--concrete)", fontStyle: "italic" }}>
                  No orders scheduled for this day.
                  <br />
                  <button
                    type="button"
                    onClick={() => onJumpTab("dispatches")}
                    className="btn-ghost"
                    style={{ marginTop: 8, padding: "4px 10px", fontSize: 10 }}
                  >
                    + NEW ORDER
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 4 }}>
                  {ordersForDay.map((d) => {
                    const fbs = freightBills.filter((fb) => fb.dispatchId === d.id);
                    const approvedFbCount = fbs.filter((fb) => fb.status === "approved").length;
                    const pendingFbCount = fbs.filter((fb) => (fb.status || "pending") === "pending").length;
                    const expected = Number(d.trucksExpected) || (d.assignments || []).reduce((s, a) => s + (Number(a.trucks) || 0), 0);
                    return (
                      <div
                        key={d.id}
                        onClick={() => onJumpTab("dispatches", { dispatchId: d.id })}
                        style={{
                          padding: "10px 14px", background: "#FFF", border: "2px solid var(--steel)",
                          cursor: "pointer", display: "grid",
                          gridTemplateColumns: "90px 1fr 1fr 150px", gap: 12, alignItems: "center",
                          fontSize: 12,
                        }}
                      >
                        <strong style={{ fontSize: 14, color: "var(--hazard-deep)" }}>#{d.code}</strong>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.jobName || "—"}</div>
                          <div style={{ fontSize: 10, color: "var(--concrete)" }}>{d.clientName || "—"}</div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <span style={{ color: "var(--concrete)" }}>FROM:</span> {d.pickup || "—"}
                          </div>
                          <div style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <span style={{ color: "var(--concrete)" }}>TO:</span> {d.dropoff || "—"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {expected > 0 && (
                            <span className="chip" style={{ background: "var(--steel)", color: "#FFF", fontSize: 9, padding: "2px 6px" }}>
                              {expected} TRUCK{expected !== 1 ? "S" : ""}
                            </span>
                          )}
                          {pendingFbCount > 0 && (
                            <span className="chip" style={{ background: "var(--safety)", color: "#FFF", fontSize: 9, padding: "2px 6px" }}>
                              {pendingFbCount} PEND
                            </span>
                          )}
                          {approvedFbCount > 0 && (
                            <span className="chip" style={{ background: "var(--good)", color: "#FFF", fontSize: 9, padding: "2px 6px" }}>
                              {approvedFbCount} ✓
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cards grid - priority order */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>

        {/* 1. Pending Review */}
        <SectionCard
          title="NEEDS REVIEW · FB APPROVAL"
          icon={<ShieldCheck size={18} />}
          count={pendingFbs.length}
          color={pendingFbs.length > 0 ? "var(--hazard)" : "var(--good)"}
          bg={pendingFbs.length > 0 ? "#FEF3C7" : "#F0FDF4"}
          onClick={() => onJumpTab("review")}
          empty="NO PENDING FBs ✓"
        >
          {pendingFbs.slice(0, 5).map((fb) => {
            const d = dispatches.find((x) => x.id === fb.dispatchId);
            return (
              <Row
                key={fb.id}
                left={<><strong>FB#{fb.freightBillNumber || "—"}</strong> · {fb.driverName || "—"}</>}
                sub={`Order #${d?.code || "—"} · ${fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : "—"}`}
                onClick={() => onJumpTab("review", fb.id)}
              />
            );
          })}
          {pendingFbs.length > 5 && <Row left={`+ ${pendingFbs.length - 5} more…`} />}
        </SectionCard>

        {/* 2. Below minimum hours */}
        <SectionCard
          title="BELOW MIN HOURS · NEEDS CONFIRM"
          icon={<AlertTriangle size={18} />}
          count={belowMinFbs.length}
          color={belowMinFbs.length > 0 ? "var(--safety)" : "var(--good)"}
          bg={belowMinFbs.length > 0 ? "#FEF2F2" : "#F0FDF4"}
          onClick={() => onJumpTab("review")}
          empty="NO MIN-HOUR EDGE CASES ✓"
        >
          {belowMinFbs.slice(0, 5).map((fb) => {
            const d = dispatches.find((x) => x.id === fb.dispatchId);
            const p = projects.find((pp) => pp.id === d?.projectId);
            return (
              <Row
                key={fb.id}
                left={<><strong>FB#{fb.freightBillNumber || "—"}</strong> · {fb.driverName || "—"}</>}
                sub={`${p?.name || "—"} · min ${p?.minimumHours}hr`}
                right={`${(Number(fb.hoursBilled) || 0).toFixed(1)}hr`}
                onClick={() => onJumpTab("review", fb.id)}
              />
            );
          })}
          {belowMinFbs.length > 5 && <Row left={`+ ${belowMinFbs.length - 5} more…`} />}
        </SectionCard>

        {/* Fleet alerts — units with insurance/registration/DOT expiring ≤30d */}
        <SectionCard
          title="Fleet — attention needed"
          icon={<Truck size={18} />}
          count={fleetAlerts.length}
          color={fleetAlerts.length > 0 ? "var(--safety)" : "var(--good)"}
          bg={fleetAlerts.length > 0 ? "var(--danger-soft)" : "var(--good-soft)"}
          onClick={() => onJumpTab("fleet")}
          empty="No expiring documents ✓"
        >
          {fleetAlerts.slice(0, 5).map(({ unit, labels, worst }) => (
            <Row
              key={unit.id}
              left={<><strong>{unit.unit}</strong> · {unit.type}</>}
              sub={labels.map((l) => `${l.kind} ${l.days < 0 ? `${Math.abs(l.days)}d ago` : l.days === 0 ? "today" : `in ${l.days}d`}`).join(" · ")}
              right={worst < 0 ? "EXPIRED" : worst <= 7 ? "URGENT" : "SOON"}
              onClick={() => onJumpTab("fleet", unit.id)}
            />
          ))}
          {fleetAlerts.length > 5 && <Row left={`+ ${fleetAlerts.length - 5} more…`} />}
        </SectionCard>

        {/* Driver compliance — CDL / medical card expiring ≤30 days */}
        <SectionCard
          title="Driver docs — attention needed"
          icon={<Truck size={18} />}
          count={driverDocAlerts.length}
          color={driverDocAlerts.length > 0 ? "var(--safety)" : "var(--good)"}
          bg={driverDocAlerts.length > 0 ? "var(--danger-soft)" : "var(--good-soft)"}
          onClick={() => onJumpTab("contacts")}
          empty="No expiring driver docs ✓"
        >
          {driverDocAlerts.slice(0, 5).map(({ contact, labels, worst }) => (
            <Row
              key={contact.id}
              left={<><strong>{contact.companyName || contact.contactName}</strong> · {contact.type}</>}
              sub={labels.map((l) => `${l.kind} ${l.days < 0 ? `${Math.abs(l.days)}d ago` : l.days === 0 ? "today" : `in ${l.days}d`}`).join(" · ")}
              right={worst < 0 ? "EXPIRED" : worst <= 7 ? "URGENT" : "SOON"}
              onClick={() => onJumpTab("contacts", contact.id)}
            />
          ))}
          {driverDocAlerts.length > 5 && <Row left={`+ ${driverDocAlerts.length - 5} more…`} />}
        </SectionCard>

        {/* Compliance packet — drivers/subs missing required docs. Driven
            by the same required-docs config the contact modal uses (in
            localStorage), so it lights up only the kinds the dispatcher
            cares about. Sorted by most-missing first. */}
        <SectionCard
          title="Compliance packet — missing docs"
          icon={<ClipboardList size={18} />}
          count={complianceMissing.length}
          color={complianceMissing.length > 0 ? "var(--safety)" : "var(--good)"}
          bg={complianceMissing.length > 0 ? "var(--danger-soft)" : "var(--good-soft)"}
          onClick={() => onJumpTab("contacts")}
          empty="All required docs on file ✓"
        >
          {complianceMissing.slice(0, 5).map(({ contact, total, have, missing }) => (
            <ComplianceRow
              key={contact.id}
              contact={contact}
              total={total}
              have={have}
              missing={missing}
              setContacts={setContacts}
              onJumpTab={onJumpTab}
              onToast={onToast}
              companyName={company?.name}
            />
          ))}
          {complianceMissing.length > 5 && <Row left={`+ ${complianceMissing.length - 5} more…`} />}
        </SectionCard>

        {/* Project profitability — top winners + losers by margin. Click jumps
            to ProjectsTab focused on that project. */}
        <SectionCard
          title="Project profitability"
          icon={<DollarSign size={18} />}
          count={projectMargins.length}
          color="var(--steel)"
          bg="#F8FAFC"
          onClick={() => onJumpTab("projects")}
          empty="No active projects with billed/paid activity yet"
        >
          {projectMargins.slice(0, 5).map((m) => (
            <Row
              key={m.project.id}
              left={<><strong>{m.project.name}</strong></>}
              sub={`${fmt$(m.billed)} billed · ${fmt$(m.paidOut)} pay · ${fmt$(m.fees)} fees`}
              right={
                <span style={{ color: m.margin >= 0 ? "var(--good)" : "var(--safety)", fontWeight: 700 }}>
                  {fmt$(m.margin)}{m.billed > 0 ? ` (${m.marginPct.toFixed(0)}%)` : ""}
                </span>
              }
              onClick={() => onJumpTab("projects", m.project.id)}
            />
          ))}
          {projectMargins.length > 5 && (
            <>
              <Row left={<em style={{ color: "var(--concrete)" }}>—— Lowest margin ——</em>} />
              {projectMargins.slice(-3).reverse().map((m) => (
                <Row
                  key={`bot-${m.project.id}`}
                  left={<><strong>{m.project.name}</strong></>}
                  sub={`${fmt$(m.billed)} billed · ${fmt$(m.paidOut)} pay · ${fmt$(m.fees)} fees`}
                  right={
                    <span style={{ color: m.margin >= 0 ? "var(--good)" : "var(--safety)", fontWeight: 700 }}>
                      {fmt$(m.margin)}{m.billed > 0 ? ` (${m.marginPct.toFixed(0)}%)` : ""}
                    </span>
                  }
                  onClick={() => onJumpTab("projects", m.project.id)}
                />
              ))}
            </>
          )}
        </SectionCard>

        {/* 3. Unpaid invoices (all) — with A/R aging chip strip */}
        <SectionCard
          title="UNPAID INVOICES"
          icon={<Receipt size={18} />}
          count={unpaidInvoices.length}
          total={totalUnpaid}
          color={unpaidInvoices.length > 0 ? "var(--hazard)" : "var(--good)"}
          bg={unpaidInvoices.length > 0 ? "#FEF3C7" : "#F0FDF4"}
          onClick={() => onJumpTab("invoices")}
          empty="All invoices paid ✓"
        >
          {/* A/R aging quick breakdown */}
          {totalUnpaid > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 0 8px", fontSize: 11 }}>
              {[
                { k: "current", label: "0-30d", color: "var(--good)" },
                { k: "30", label: "31-60d", color: "var(--warn-fg)" },
                { k: "60", label: "61-90d", color: "var(--hazard-deep)" },
                { k: "90+", label: "90+d", color: "var(--safety)" },
              ].filter(({ k }) => arBuckets[k] > 0).map(({ k, label, color }) => (
                <span key={k} className="chip" style={{ background: "#FFF", color, borderColor: color, fontSize: 10 }}>
                  {label} · {fmt$(arBuckets[k])}
                </span>
              ))}
            </div>
          )}
          {unpaidInvoices.slice(0, 5).map((inv) => {
            const bal = (Number(inv.total) || 0) - (Number(inv.amountPaid) || 0);
            const status = invoiceStatus(inv);
            return (
              <Row
                key={inv.id || inv.invoiceNumber}
                left={<><strong>{inv.invoiceNumber}</strong> · {inv.billToName}</>}
                sub={`${inv.invoiceDate}${inv.dueDate ? ` · due ${inv.dueDate}` : ""} · ${status}`}
                right={fmt$(bal)}
                onClick={() => onJumpTab("invoices", inv.id || inv.invoiceNumber)}
              />
            );
          })}
          {unpaidInvoices.length > 5 && <Row left={`+ ${unpaidInvoices.length - 5} more…`} />}
        </SectionCard>

        {/* 4. Overdue invoices */}
        <SectionCard
          title="OVERDUE INVOICES"
          icon={<Clock size={18} />}
          count={overdueInvoices.length}
          total={totalOverdue}
          color={overdueInvoices.length > 0 ? "var(--safety)" : "var(--good)"}
          bg={overdueInvoices.length > 0 ? "#FEE2E2" : "#F0FDF4"}
          onClick={() => onJumpTab("invoices")}
          empty="NOTHING OVERDUE ✓"
        >
          {overdueInvoices.slice(0, 5).map((inv) => {
            const bal = (Number(inv.total) || 0) - (Number(inv.amountPaid) || 0);
            const daysPast = daysSince(inv.dueDate) || 0;
            return (
              <Row
                key={inv.id || inv.invoiceNumber}
                left={<><strong>{inv.invoiceNumber}</strong> · {inv.billToName}</>}
                sub={`Due ${inv.dueDate} · ${daysPast}d past`}
                right={fmt$(bal)}
                onClick={() => onJumpTab("invoices", inv.id || inv.invoiceNumber)}
              />
            );
          })}
          {overdueInvoices.length > 5 && <Row left={`+ ${overdueInvoices.length - 5} more…`} />}
        </SectionCard>

        {/* 5. Ready to Pay */}
        <SectionCard
          title="READY TO PAY · SUBS/DRIVERS"
          icon={<DollarSign size={18} />}
          count={readyToPay.length}
          total={totalReadyToPay}
          color={readyToPay.length > 0 ? "var(--good)" : "var(--steel)"}
          bg={readyToPay.length > 0 ? "#F0FDF4" : "#F5F5F4"}
          onClick={() => onJumpTab("payroll")}
          empty="PAYROLL CAUGHT UP ✓"
        >
          {readyToPay.slice(0, 5).map((s, idx) => (
            <Row
              key={idx}
              left={<><strong>{s.name}</strong></>}
              sub={`${s.kind === "driver" ? "Driver" : "Sub"} · ${s.count} FB${s.count !== 1 ? "s" : ""}`}
              right={fmt$(s.net)}
              onClick={() => onJumpTab("payroll", s.subId)}
            />
          ))}
          {readyToPay.length > 5 && <Row left={`+ ${readyToPay.length - 5} more…`} />}
        </SectionCard>

        {/* 6. Today's orders */}
        <SectionCard
          title="OPEN ORDERS · TODAY"
          icon={<ClipboardList size={18} />}
          count={todaysOrders.length}
          color="var(--steel)"
          bg="#F5F5F4"
          onClick={() => onJumpTab("dispatches")}
          empty="NO ORDERS SCHEDULED TODAY"
        >
          {todaysOrders.slice(0, 5).map((d) => (
            <Row
              key={d.id}
              left={<><strong>#{d.code}</strong> · {d.jobName || "—"}</>}
              sub={`${d.clientName || "—"} · ${d.trucksExpected || 1} trucks`}
              onClick={() => onJumpTab("dispatches", d.id)}
            />
          ))}
          {todaysOrders.length > 5 && <Row left={`+ ${todaysOrders.length - 5} more…`} />}
        </SectionCard>

        {/* 7. Active quotes */}
        <SectionCard
          title="ACTIVE QUOTES"
          icon={<Mail size={18} />}
          count={activeQuotes.length}
          color="var(--steel)"
          bg="#F5F5F4"
          onClick={() => onJumpTab("quotes")}
          empty="NO PENDING QUOTES"
        >
          {activeQuotes.slice(0, 5).map((q) => (
            <Row
              key={q.id}
              left={<><strong>{q.companyName || q.contactName || "—"}</strong></>}
              sub={`${q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "—"} · ${q.status || "pending"}`}
              right={q.estimatedValue ? fmt$(q.estimatedValue) : ""}
            />
          ))}
          {activeQuotes.length > 5 && <Row left={`+ ${activeQuotes.length - 5} more…`} />}
        </SectionCard>

        {/* 8. Recent activity feed */}
        <SectionCard
          title="RECENT FB SUBMISSIONS"
          icon={<Activity size={18} />}
          count={freightBills.filter((fb) => fb.submittedAt && hoursSince(fb.submittedAt) < 48).length}
          color="var(--steel)"
          bg="#F5F5F4"
          empty="NO RECENT SUBMISSIONS"
        >
          {freightBills
            .filter((fb) => fb.submittedAt)
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
            .slice(0, 5)
            .map((fb) => {
              const d = dispatches.find((x) => x.id === fb.dispatchId);
              const ago = minutesSince(fb.submittedAt);
              const label = ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.round(ago / 60)}h ago` : `${Math.round(ago / 1440)}d ago`;
              return (
                <Row
                  key={fb.id}
                  left={<><strong>FB#{fb.freightBillNumber || "—"}</strong> · {fb.driverName || "—"}</>}
                  sub={`Order #${d?.code || "—"} · ${label}`}
                  right={(fb.status || "pending").slice(0, 3).toUpperCase()}
                />
              );
            })}
        </SectionCard>
      </div>
    </div>
  );
};

// One row in the "Compliance packet — missing docs" section. Displays the
// contact's status and offers a TEXT button that opens the SMS app
// pre-filled with the missing-doc list + the contact's onboarding link.
// If the contact doesn't have an upload portal token yet, the button
// generates one and persists it via setContacts before opening SMS.
const ComplianceRow = ({ contact, total, have, missing, setContacts, onJumpTab, onToast, companyName }) => {
  const phone = contact?.phone;
  const handleText = async (e) => {
    e.stopPropagation();
    if (!phone) return;
    let token = contact.portalToken;
    let needsSave = false;
    if (!token || !contact.portalEnabled) {
      // Generate a fresh URL-safe token if missing, mark portalEnabled
      const bytes = new Uint8Array(15);
      crypto.getRandomValues(bytes);
      token = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 20);
      needsSave = true;
    }
    if (needsSave && setContacts) {
      try {
        setContacts((prev) =>
          prev.map((c) => c.id === contact.id ? { ...c, portalToken: token, portalEnabled: true } : c)
        );
      } catch (err) {
        console.warn("enable portal from home compliance row:", err);
        onToast?.("⚠ Couldn't enable upload link — try from Contacts");
      }
    }
    const url = `${window.location.origin}${window.location.pathname}#/onboard/${token}`;
    const body = encodeURIComponent(
      `Hi ${contact.contactName || contact.companyName || "there"}, this is ${companyName || "4 Brothers Trucking"}. ` +
      `We still need: ${missing.join(", ")}. ` +
      `Upload here: ${url}`
    );
    window.location.href = `sms:${phone}?body=${body}`;
  };

  return (
    <div
      onClick={() => onJumpTab && onJumpTab("contacts", contact.id)}
      style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)", cursor: "pointer" }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13 }}>
          <strong>{contact.companyName || contact.contactName}</strong>
          <span style={{ color: "var(--concrete)" }}> · {contact.type}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {missing.length} missing: {missing.slice(0, 3).join(", ")}{missing.length > 3 ? `, +${missing.length - 3} more` : ""}
        </div>
      </div>
      {phone && (
        <button
          type="button"
          onClick={handleText}
          className="btn-primary"
          style={{ padding: "5px 10px", fontSize: 10 }}
          title={`Text ${contact.contactName || contact.companyName} with the upload link`}
        >
          📱 TEXT
        </button>
      )}
      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", whiteSpace: "nowrap" }}>{have} / {total}</div>
    </div>
  );
};
