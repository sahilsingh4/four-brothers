/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useMemo } from "react";
import {
  Briefcase, Building2, Calendar, ChevronDown, ClipboardList, DollarSign,
  Eye, FileDown, FileText, Lock, Plus, Receipt, Settings, ShieldCheck, Trash2, X,
} from "lucide-react";
import { fmt$, todayISO, nextLineId } from "../utils";
import { logAudit, deleteInvoice, recoverInvoice } from "../db";
import { supabase } from "../supabase";
import { InvoiceViewModal } from "./InvoiceViewModal";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { CompanyProfileModal } from "./CompanyProfileModal";



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
export const generateCustomerStatementPDF = ({ customer, invoices, company, fromDate, toDate, openOnly = false }) => {
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


// ========== INVOICES TAB ==========
export const InvoicesTab = ({ freightBills, dispatches, invoices, setInvoices, createInvoice, company, setCompany, contacts = [], projects = [], editFreightBill, pendingInvoice, clearPendingInvoice, onJumpToPayroll, onToast, generateCapabilityStatementPDF }) => {
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
