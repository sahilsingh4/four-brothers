/* eslint-disable react-hooks/exhaustive-deps */
// File-level disable: payroll has multiple memo + effect deps that are
// intentionally narrow (fbsForContact / clearPendingPaySubId / projection
// memos that pull from outer-scope helpers). Including the suggested deps
// would re-fire on every parent render or trigger stale-data flicker.
import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, Banknote, Briefcase, Building2, CheckCircle2, ChevronDown,
  DollarSign, Download, Edit2, FileDown, Printer, RefreshCw, Search, Trash2, User, X,
} from "lucide-react";
import { fmt$, nextLineId } from "../utils";
import { logAudit } from "../db";
import { FBEditModal } from "./FBEditModal";
import { FBTraceModal } from "./FBTraceModal";




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
// ========== FREIGHT BILL EDIT / APPROVE MODAL ==========

const PayStubOfferModal = ({ target, onPrint, onClose }) => {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ padding: "18px 22px", background: "var(--good)", color: "#FFF" }}>
          <div className="fbt-mono" style={{ fontSize: 10 }}>PAYMENT RECORDED</div>
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
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)" }}>MARK PAID</div>
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
            <div style={{ padding: 10, background: "#FEF2F2", border: "2px solid var(--safety)", fontSize: 11, color: "var(--safety)" }}>
              ⚠ <strong>ADVANCE PAY WARNING:</strong> Some FBs here haven't been paid by customer yet. You're fronting the cash.
            </div>
          )}

          {/* Short-pay notice */}
          {(() => {
            const shortFbs = fbs.filter((x) => x.custStatus === "short");
            if (shortFbs.length === 0) return null;
            return (
              <div style={{ padding: 10, background: "#FEF3C7", border: "2px solid var(--hazard)", fontSize: 11 }}>
                ⚠ <strong>{shortFbs.length} SHORT-PAID FB{shortFbs.length !== 1 ? "S" : ""}:</strong> Sub will be paid proportionally to what customer paid.
              </div>
            );
          })()}

          {/* Breakdown */}
          <div style={{ padding: 12, background: "#F5F5F4", border: "1.5px solid var(--steel)", fontSize: 12 }}>
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

export const PayrollTab = ({ freightBills, dispatches, setDispatches, contacts, projects, invoices = [], editFreightBill, company, pendingPaySubId, clearPendingPaySubId, onJumpToInvoice, onToast }) => {
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

  // F4: Find subs/drivers with unpaid approved FBs that aren't reflected in any
  // pay statement yet — surfaces "orphan FBs that got approved AFTER a payroll
  // run" so the owner doesn't miss paying a sub for a late driver upload. We
  // group by contactId across both DRIVER and SUB assignment kinds.
  const orphanByContact = useMemo(() => {
    const map = new Map(); // contactId → { contact, kind, fbs[] }
    (freightBills || []).forEach((fb) => {
      if (fb.status !== "approved") return;
      if (fb.paidAt || fb.payStatementLockedAt) return;
      const disp = (dispatches || []).find((d) => d.id === fb.dispatchId);
      if (!disp) return;
      const assignment = (disp.assignments || []).find((a) => a.aid === fb.assignmentId);
      if (!assignment || !assignment.contactId) return;
      const contact = (contacts || []).find((c) => c.id === assignment.contactId);
      if (!contact) return;
      const entry = map.get(contact.id) || { contact, kind: assignment.kind || contact.type || "sub", fbs: [] };
      entry.fbs.push(fb);
      map.set(contact.id, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.fbs.length - a.fbs.length);
  }, [freightBills, dispatches, contacts]);


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
        <div className="fbt-mono" style={{ fontSize: 9, color: kindColor, fontWeight: 700, marginBottom: 2 }}>
          🚚 PAYING · EDITABLE
          {locked && <span style={{ marginLeft: 6, color: "var(--concrete)", fontWeight: 400 }}>⚑ locked</span>}
        </div>

        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 60px 70px 50px 70px 22px", gap: 4, alignItems: "center", fontSize: 9, color: "var(--concrete)" }}>
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
                style={{ padding: "2px 3px", fontSize: 10, border: "1px solid var(--concrete)", background: rowLocked ? "#F5F5F4" : "#FFF", width: "100%" }}
              >
                <option value="H">H</option><option value="T">T</option><option value="L">L</option>
                <option value="TOLL">TOLL</option><option value="DUMP">DUMP</option><option value="FUEL">FUEL</option><option value="OTHER">OTHER</option>
              </select>
              <input disabled={rowLocked} type="text" value={ln.item || ""}
                onChange={(e) => updatePayLineLocal(fb.id, ln.id, { item: e.target.value })}
                style={{ padding: "2px 4px", fontSize: 10, border: "1px solid var(--concrete)", background: rowLocked ? "#F5F5F4" : "#FFF", width: "100%" }} />
              <input disabled={rowLocked} type="number" step="0.01" value={ln.qty ?? ""}
                onChange={(e) => updatePayLineLocal(fb.id, ln.id, { qty: e.target.value })}
                style={{ padding: "2px 4px", fontSize: 10, border: "1px solid var(--concrete)", background: rowLocked ? "#F5F5F4" : "#FFF", width: "100%", textAlign: "right" }} />
              <input disabled={rowLocked} type="number" step="0.01" value={ln.rate ?? ""}
                onChange={(e) => updatePayLineLocal(fb.id, ln.id, { rate: e.target.value })}
                style={{ padding: "2px 4px", fontSize: 10, border: "1px solid var(--concrete)", background: rowLocked ? "#F5F5F4" : "#FFF", width: "100%", textAlign: "right" }} />
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
              <div style={{ fontSize: 10, fontWeight: 700, color: kindColor, textAlign: "right" }}>
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
            <span className="fbt-mono" style={{ fontSize: 9, fontWeight: 700, color: dirty ? "var(--hazard-deep)" : status === "saved" ? "var(--good)" : status === "error" ? "var(--safety)" : "var(--concrete)" }}>
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
      {/* F4: Surface unpaid approved FBs across all subs/drivers so the owner
          doesn't miss paying late driver uploads. Each chip jumps the form to
          that contact in the appropriate scope. */}
      {orphanByContact.length > 0 && (
        <div className="fbt-card" style={{ padding: 14, background: "#FEF3C7", border: "1px solid var(--hazard)" }}>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", fontWeight: 700, marginBottom: 8 }}>
            ⚠ UNPAID APPROVED FBs · {orphanByContact.reduce((s, e) => s + e.fbs.length, 0)} ACROSS {orphanByContact.length} {orphanByContact.length === 1 ? "PERSON" : "PEOPLE"}
          </div>
          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 10 }}>
            ▸ THESE WERE APPROVED AFTER THE LAST PAY STATEMENT FOR THIS PERSON. CLICK TO LOAD INTO THE PAYROLL FORM.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {orphanByContact.map((entry) => (
              <button
                key={entry.contact.id}
                type="button"
                onClick={() => {
                  const isDriver = entry.kind === "driver";
                  // Compute the smallest date window that includes every orphan FB
                  // for this contact. This way, when the form loads, the date filter
                  // shows ALL the orphan FBs (and only them) without the user needing
                  // to remember the right range.
                  const dates = entry.fbs.map((fb) => (fb.submittedAt || "").slice(0, 10)).filter(Boolean).sort();
                  const fromD = dates[0] || "";
                  const toD = dates[dates.length - 1] || "";
                  setPayScope(isDriver ? "drivers" : "subs");
                  if (isDriver) {
                    setDrvContactId(entry.contact.id);
                    setDrvFromDate(fromD);
                    setDrvToDate(toD);
                  } else {
                    setSubContactId(entry.contact.id);
                    setSubFromDate(fromD);
                    setSubToDate(toD);
                  }
                  // Scroll the builder into view so the admin can act immediately
                  // without hunting for it.
                  setTimeout(() => {
                    const el = document.getElementById(isDriver ? "payroll-builder" : "payroll-builder-subs");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 80);
                  onToast(`✓ LOADED ${entry.fbs.length} ORPHAN FB${entry.fbs.length !== 1 ? "S" : ""} FOR ${entry.contact.companyName || entry.contact.contactName}`);
                }}
                className="chip"
                style={{ background: "#FFF", color: "var(--steel)", borderColor: "var(--hazard)", cursor: "pointer", fontSize: 11 }}
                title={`${entry.fbs.length} unpaid approved FB${entry.fbs.length !== 1 ? "s" : ""} — click to load into ${entry.kind === "driver" ? "DRIVERS" : "SUBS"} form (date range auto-set, scrolls down)`}
              >
                <span style={{ fontWeight: 700 }}>{entry.contact.companyName || entry.contact.contactName}</span>
                <span style={{ marginLeft: 6, color: "var(--hazard-deep)", fontWeight: 700 }}>· {entry.fbs.length}</span>
                <span style={{ marginLeft: 4, color: "var(--concrete)", fontSize: 9 }}>{entry.kind === "driver" ? "DRV" : "SUB"}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* v23 Session BB: merged into a single panel with DRIVERS/SUBS toggle.
          Was two side-by-side panels. Toggle at top picks which builder to show. */}

      {/* Toggle header */}
      <div className="fbt-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", border: "2px solid var(--steel)" }}>
          <button
            type="button"
            onClick={() => setPayScope("drivers")}
            style={{
              padding: "10px 22px", fontSize: 12, fontWeight: 700,
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
              padding: "10px 22px", fontSize: 12, fontWeight: 700,
              background: payScope === "subs" ? "#9A3412" : "#FFF",
              color: payScope === "subs" ? "#FFF" : "var(--steel)",
              border: "none", borderLeft: "2px solid var(--steel)", cursor: "pointer",
            }}
          >
            <Building2 size={13} style={{ marginRight: 6, marginBottom: -2 }} /> SUBS ({subContactsList.length})
          </button>
        </div>
        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", flex: 1 }}>
          ▸ BUILDING PAY STATEMENT FOR {payScope === "drivers" ? "EMPLOYEE DRIVERS" : "SUBCONTRACTORS"}
        </div>
      </div>

      <div id="payroll-builder" style={{ display: payScope === "drivers" ? "grid" : "none", gridTemplateColumns: "1fr", gap: 14 }}>
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
                <div className="fbt-mono" style={{ fontSize: 10, color: "#0369A1", marginBottom: 6, fontWeight: 700 }}>
                  ▸ {drvFbs.length} FB{drvFbs.length !== 1 ? "S" : ""} · CLICK TO EXPAND · EDIT PAY LINES ON RIGHT
                </div>
                {drvFbs.length > 0 && (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 10px", background: "#FFF", border: "1px dashed var(--concrete)", marginBottom: 6, fontSize: 10 }}>
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
                          style={{ padding: "8px 10px", display: "grid", gridTemplateColumns: "auto auto auto 1fr auto auto", gap: 10, alignItems: "center", fontSize: 11 }}
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
                              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--hazard-deep)", fontWeight: 700, marginBottom: 6 }}>
                                💰 BILLED TO CUSTOMER (READ-ONLY)
                              </div>
                              {billLines.length === 0 ? (
                                <div style={{ fontSize: 10, color: "var(--concrete)", fontStyle: "italic" }}>No billing lines</div>
                              ) : (
                                billLines.map((ln) => (
                                  <div key={ln.id} style={{ fontSize: 10, padding: "2px 0", display: "flex", justifyContent: "space-between", gap: 6, borderBottom: "1px dotted var(--concrete)" }}>
                                    <span style={{ fontWeight: 700, minWidth: 42 }}>{ln.code}</span>
                                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ln.item}</span>
                                    <span>{Number(ln.qty || 0).toFixed(2)}×${Number(ln.rate || 0).toFixed(2)}</span>
                                    <span style={{ fontWeight: 700 }}>${Number(ln.net || 0).toFixed(2)}</span>
                                  </div>
                                ))
                              )}
                              <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1.5px solid var(--hazard-deep)", display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700 }}>
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
                                    <div style={{ marginTop: 6, padding: "6px 10px", border: "1.5px solid #0369A1", display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, background: "#FFF" }}>
                                      <span>PAY TOTAL</span>
                                      <span style={{ color: "#0369A1" }}>${livePayTotal.toFixed(2)}</span>
                                    </div>
                                    {billTotal > 0 && livePayTotal > 0 && (
                                      <div style={{ marginTop: 4, padding: "4px 10px", background: "#D1FAE5", fontSize: 10, display: "flex", justifyContent: "space-between" }}>
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

      <div id="payroll-builder-subs" style={{ display: payScope === "subs" ? "grid" : "none", gridTemplateColumns: "1fr", gap: 14 }}>
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
                <div className="fbt-mono" style={{ fontSize: 10, color: "#9A3412", marginBottom: 6, fontWeight: 700 }}>
                  ▸ {subFbs.length} FB{subFbs.length !== 1 ? "S" : ""} · CLICK TO EXPAND · EDIT PAY LINES ON RIGHT
                </div>
                {subFbs.length > 0 && (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 10px", background: "#FFF", border: "1px dashed var(--concrete)", marginBottom: 6, fontSize: 10 }}>
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
                          style={{ padding: "8px 10px", display: "grid", gridTemplateColumns: "auto auto auto 1fr auto auto", gap: 10, alignItems: "center", fontSize: 11 }}
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
                              <div className="fbt-mono" style={{ fontSize: 9, color: "var(--hazard-deep)", fontWeight: 700, marginBottom: 6 }}>
                                💰 BILLED TO CUSTOMER (READ-ONLY)
                              </div>
                              {billLines.length === 0 ? (
                                <div style={{ fontSize: 10, color: "var(--concrete)", fontStyle: "italic" }}>No billing lines</div>
                              ) : (
                                billLines.map((ln) => (
                                  <div key={ln.id} style={{ fontSize: 10, padding: "2px 0", display: "flex", justifyContent: "space-between", gap: 6, borderBottom: "1px dotted var(--concrete)" }}>
                                    <span style={{ fontWeight: 700, minWidth: 42 }}>{ln.code}</span>
                                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ln.item}</span>
                                    <span>{Number(ln.qty || 0).toFixed(2)}×${Number(ln.rate || 0).toFixed(2)}</span>
                                    <span style={{ fontWeight: 700 }}>${Number(ln.net || 0).toFixed(2)}</span>
                                  </div>
                                ))
                              )}
                              <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1.5px solid var(--hazard-deep)", display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700 }}>
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
                                    <div style={{ marginTop: 6, padding: "6px 10px", border: "1.5px solid #9A3412", display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, background: "#FFF" }}>
                                      <span>PAY TOTAL</span>
                                      <span style={{ color: "#9A3412" }}>${livePayTotal.toFixed(2)}</span>
                                    </div>
                                    {billTotal > 0 && livePayTotal > 0 && (
                                      <div style={{ marginTop: 4, padding: "4px 10px", background: "#D1FAE5", fontSize: 10, display: "flex", justifyContent: "space-between" }}>
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
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", fontWeight: 700 }}>
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
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, flex: 1, minWidth: 240 }}>
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
            <span className="fbt-mono" style={{ fontSize: 10, color: "var(--safety)" }}>
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
                                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--safety)", fontWeight: 700, marginBottom: 4 }}>
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
                                      padding: 8, fontSize: 11,
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
                                              <span style={{ marginLeft: 6, padding: "1px 5px", background: "var(--steel)", color: "var(--cream)", fontSize: 9 }}>
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
