import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, FileDown } from "lucide-react";
import { fetchSubPayByToken } from "../db";
import { fmt$ } from "../utils";
import { GlobalStyles } from "./GlobalStyles";

// Portal-specific pay stub PDF generator — standalone, no admin state needed.
// Uses hardcoded company info (matches public site) so it works anonymously.
const generatePortalPayStubPDF = ({ payRun, contact }) => {
  const esc = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

  const logoSvg = `<svg viewBox="0 0 120 120" width="72" height="72" xmlns="http://www.w3.org/2000/svg">
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

  const fbsRows = payRun.fbs.map((fb) => `
    <tr>
      <td>${esc(fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : "—")}</td>
      <td><strong>#${esc(fb.freightBillNumber || "—")}</strong></td>
      <td>${esc(fb.jobName || "—")}${fb.dispatchCode ? ` <span style="color:#78716C">· Order #${esc(fb.dispatchCode)}</span>` : ""}</td>
      <td>${fb.truckNumber ? `T${esc(fb.truckNumber)}` : "—"}</td>
      <td style="text-align:right">${money(fb.paidAmount)}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Pay Statement ${esc(payRun.statementNumber || "")}</title>
<style>
  @page { size: letter; margin: 0.6in; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #1C1917; font-size: 11pt; line-height: 1.4; }
  .page { max-width: 7.3in; margin: 0 auto; }
  .hdr { display: flex; gap: 16px; align-items: flex-start; padding-bottom: 14px; border-bottom: 3px solid #1C1917; margin-bottom: 16px; }
  .hdr .txt { flex: 1; }
  .hdr .label { font-size: 8pt; color: #78716C; letter-spacing: 0.2em; font-weight: 700; }
  .hdr .co { font-size: 18pt; font-weight: 900; letter-spacing: -0.02em; margin: 4px 0 2px; }
  .hdr .contact { font-size: 9pt; color: #57534E; }
  .pay-to { background: #FAFAF9; padding: 12px 16px; border-left: 4px solid #F59E0B; margin-bottom: 16px; }
  .pay-to .lbl { font-size: 8pt; color: #78716C; letter-spacing: 0.15em; font-weight: 700; }
  .pay-to .name { font-size: 15pt; font-weight: 800; margin-top: 2px; }
  .pay-to .sub { font-size: 10pt; color: #57534E; margin-top: 2px; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; font-size: 10pt; }
  .meta .cell .lbl { font-size: 8pt; color: #78716C; letter-spacing: 0.1em; font-weight: 700; }
  .meta .cell .val { font-size: 12pt; font-weight: 700; margin-top: 2px; }
  .sec-title { font-size: 9pt; font-weight: 900; letter-spacing: 0.12em; color: #78716C; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #1C1917; text-transform: uppercase; }
  table.fbs { width: 100%; border-collapse: collapse; font-size: 10pt; }
  table.fbs th { background: #1C1917; color: #F59E0B; text-align: left; padding: 6px 8px; font-size: 9pt; letter-spacing: 0.08em; font-weight: 700; }
  table.fbs td { padding: 6px 8px; border-bottom: 1px solid #E7E5E4; }
  table.fbs tr:nth-child(even) td { background: #FAFAF9; }
  .total { background: #1C1917; color: #F59E0B; padding: 14px 18px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center; font-weight: 900; font-size: 14pt; letter-spacing: 0.05em; }
  .foot { margin-top: 24px; padding-top: 12px; border-top: 2px solid #1C1917; font-size: 8pt; color: #78716C; text-align: center; letter-spacing: 0.05em; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="page">
    <div class="hdr">
      ${logoSvg}
      <div class="txt">
        <div class="label">PAY STATEMENT</div>
        <div class="co">4 BROTHERS TRUCKING, LLC</div>
        <div class="contact">Bay Point, CA · (626) 814-5541 · office@4brotherstruck.com</div>
      </div>
    </div>
    <div class="pay-to">
      <div class="lbl">PAY TO</div>
      <div class="name">${esc(contact.name)}</div>
      ${contact.companyName && contact.companyName !== contact.name ? `<div class="sub">${esc(contact.companyName)}</div>` : ""}
    </div>
    <div class="meta">
      <div class="cell"><div class="lbl">STATEMENT #</div><div class="val">${esc(payRun.statementNumber || "—")}</div></div>
      <div class="cell"><div class="lbl">PAY DATE</div><div class="val">${esc(payRun.paidAt ? new Date(payRun.paidAt).toLocaleDateString() : "—")}</div></div>
      <div class="cell"><div class="lbl">METHOD</div><div class="val">${esc((payRun.method || "—").toUpperCase())}</div></div>
      <div class="cell"><div class="lbl">CHECK #</div><div class="val">${esc(payRun.checkNumber || "—")}</div></div>
    </div>
    <div style="margin-bottom:16px">
      <div class="sec-title">▸ FREIGHT BILLS PAID</div>
      <table class="fbs">
        <thead><tr><th>Date</th><th>FB #</th><th>Job</th><th>Truck</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${fbsRows}</tbody>
      </table>
    </div>
    <div class="total"><span>TOTAL PAID</span><span>${money(payRun.total)}</span></div>
    <div class="foot">Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · Questions? Contact dispatch at (626) 814-5541</div>
  </div>
  <script>window.onload = function() { setTimeout(function(){ window.print(); }, 350); };</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) throw new Error("Popup blocked — allow popups and try again");
  win.document.write(html);
  win.document.close();
};

export const DriverPayPortalPage = ({ token, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("unpaid");

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchSubPayByToken(token);
        if (!result) { setError("Invalid or expired portal link — ask dispatch for a new one"); }
        else { setData(result); }
      } catch (e) {
        console.error("pay portal load:", e);
        setError("Failed to load — please try again");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="fbt-root texture-paper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <GlobalStyles />
        <div className="fbt-mono anim-roll" style={{ color: "var(--hazard-deep)" }}>▸ LOADING YOUR PAY…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fbt-root texture-paper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
        <GlobalStyles />
        <div className="fbt-card" style={{ padding: 40, maxWidth: 440, textAlign: "center" }}>
          <AlertCircle size={40} style={{ color: "var(--safety)", margin: "0 auto 14px", display: "block" }} />
          <div className="fbt-display" style={{ fontSize: 18, marginBottom: 8 }}>PORTAL UNAVAILABLE</div>
          <div className="fbt-mono" style={{ fontSize: 12, color: "var(--concrete)", marginBottom: 16 }}>{error}</div>
          <button onClick={onBack} className="btn-ghost">← BACK</button>
        </div>
      </div>
    );
  }

  const { contact, freightBills = [], windowDays = 90 } = data;

  const fbsWithPay = freightBills.map((fb) => {
    const linesTotal = Array.isArray(fb.payingLines)
      ? fb.payingLines.reduce((s, ln) => s + (Number(ln.gross) || 0), 0)
      : 0;
    const expectedPay = linesTotal > 0 ? linesTotal : (Number(fb.paidAmount) || 0);
    const isPaid = !!fb.paidAt;
    return { ...fb, expectedPay, isPaid };
  });

  const unpaid = fbsWithPay.filter((fb) => !fb.isPaid);
  const paid = fbsWithPay.filter((fb) => fb.isPaid);

  const payRuns = new Map();
  paid.forEach((fb) => {
    const key = fb.payStatementNumber || `one-off-${fb.id}`;
    if (!payRuns.has(key)) {
      payRuns.set(key, {
        statementNumber: fb.payStatementNumber,
        paidAt: fb.paidAt,
        method: fb.paidMethod,
        checkNumber: fb.paidCheckNumber,
        fbs: [],
        total: 0,
      });
    }
    const run = payRuns.get(key);
    run.fbs.push(fb);
    run.total += Number(fb.paidAmount) || 0;
  });
  const payRunsList = Array.from(payRuns.values()).sort((a, b) => {
    const da = a.paidAt ? new Date(a.paidAt).getTime() : 0;
    const db = b.paidAt ? new Date(b.paidAt).getTime() : 0;
    return db - da;
  });

  const totalUnpaid = unpaid.reduce((s, fb) => s + fb.expectedPay, 0);
  const totalPaidWindow = paid.reduce((s, fb) => s + (Number(fb.paidAmount) || 0), 0);

  const downloadPayStub = (payRun) => {
    try {
      generatePortalPayStubPDF({ payRun, contact });
    } catch (e) {
      alert(e.message || "Couldn't open PDF — check popup blocker");
    }
  };

  return (
    <div className="fbt-root texture-paper" style={{ minHeight: "100vh", padding: "20px 16px 60px" }}>
      <GlobalStyles />
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ background: "var(--steel)", color: "var(--cream)", padding: "24px", marginBottom: 16, border: "2px solid var(--hazard-deep)" }}>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)", marginBottom: 6 }}>▸ PAY PORTAL · LAST {windowDays} DAYS</div>
          <div className="fbt-display" style={{ fontSize: 24, letterSpacing: "-0.01em" }}>{contact.name}</div>
          {contact.companyName && contact.companyName !== contact.name && (
            <div className="fbt-mono" style={{ fontSize: 12, color: "#D6D3D1", marginTop: 4 }}>{contact.companyName}</div>
          )}
          <div className="fbt-mono" style={{ fontSize: 10, color: "#A8A29E", marginTop: 10 }}>
            {(contact.type === "subcontractor" || contact.type === "sub") ? "SUBCONTRACTOR" : "DRIVER"} · VIEWED {new Date().toLocaleDateString()}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div className="fbt-card" style={{ padding: 16, borderLeft: "6px solid var(--hazard-deep)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>UNPAID · DUE TO YOU</div>
            <div className="stat-num" style={{ color: "var(--hazard-deep)", marginTop: 4 }}>{fmt$(totalUnpaid)}</div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>{unpaid.length} FB{unpaid.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="fbt-card" style={{ padding: 16, borderLeft: "6px solid var(--good)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>PAID · LAST {windowDays} DAYS</div>
            <div className="stat-num" style={{ color: "var(--good)", marginTop: 4 }}>{fmt$(totalPaidWindow)}</div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>{payRunsList.length} PAY RUN{payRunsList.length !== 1 ? "S" : ""}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          {[{ k: "unpaid", label: `UNPAID (${unpaid.length})` }, { k: "paid", label: `PAID HISTORY (${payRunsList.length})` }].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{ padding: "10px 18px", fontSize: 12, fontWeight: 700, background: tab === t.k ? "var(--steel)" : "transparent", color: tab === t.k ? "var(--cream)" : "var(--steel)", border: "2px solid var(--steel)", cursor: "pointer" }}
            >{t.label}</button>
          ))}
        </div>

        {tab === "unpaid" && (
          unpaid.length === 0 ? (
            <div className="fbt-card" style={{ padding: 40, textAlign: "center" }}>
              <CheckCircle2 size={36} style={{ color: "var(--good)", margin: "0 auto 12px", display: "block" }} />
              <div className="fbt-display" style={{ fontSize: 16, marginBottom: 6 }}>ALL CAUGHT UP</div>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>NOTHING OUTSTANDING IN THE LAST {windowDays} DAYS.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {unpaid.map((fb) => (
                <div key={fb.id} className="fbt-card" style={{ padding: 14, borderLeft: "4px solid var(--hazard-deep)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        <span className="chip" style={{ fontSize: 9, padding: "2px 8px", background: fb.status === "approved" ? "var(--good)" : "var(--concrete)", color: "#FFF" }}>{fb.status?.toUpperCase()}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>FB #{fb.freightBillNumber || "—"}</span>
                      </div>
                      <div className="fbt-display" style={{ fontSize: 14, margin: "4px 0 2px" }}>{fb.jobName || "—"}</div>
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", lineHeight: 1.5 }}>
                        Order #{fb.dispatchCode} · {fb.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : "—"}
                        {fb.truckNumber && <span> · Truck {fb.truckNumber}</span>}
                        {fb.material && <span> · {fb.material}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>EXPECTED</div>
                      <div className="fbt-display" style={{ fontSize: 20, color: "var(--hazard-deep)" }}>{fmt$(fb.expectedPay)}</div>
                      {fb.status === "pending" && <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginTop: 2 }}>PENDING REVIEW</div>}
                    </div>
                  </div>
                  {Array.isArray(fb.payingLines) && fb.payingLines.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--concrete)" }}>
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 6 }}>▸ PAY BREAKDOWN</div>
                      {fb.payingLines.map((ln, idx) => (
                        <div key={idx} style={{ fontSize: 11, display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                          <span>{ln.description || ln.code || "Line"} · {Number(ln.qty || 0).toFixed(2)} @ {fmt$(ln.rate || 0)}</span>
                          <strong>{fmt$(ln.gross || 0)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {tab === "paid" && (
          payRunsList.length === 0 ? (
            <div className="fbt-card" style={{ padding: 40, textAlign: "center" }}>
              <div className="fbt-display" style={{ fontSize: 16, marginBottom: 6 }}>NO PAY HISTORY IN {windowDays} DAYS</div>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>NEW PAYMENTS WILL APPEAR HERE.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {payRunsList.map((run, i) => (
                <div key={run.statementNumber || i} className="fbt-card" style={{ padding: 14, borderLeft: "4px solid var(--good)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      {run.statementNumber && <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard-deep)", fontWeight: 700, marginBottom: 2 }}>▸ {run.statementNumber}</div>}
                      <div className="fbt-display" style={{ fontSize: 14 }}>Pay Run · {run.paidAt ? new Date(run.paidAt).toLocaleDateString() : "—"}</div>
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
                        {(run.method || "—").toUpperCase()}{run.checkNumber ? ` · Check #${run.checkNumber}` : ""} · {run.fbs.length} FB{run.fbs.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>PAID</div>
                      <div className="fbt-display" style={{ fontSize: 20, color: "var(--good)" }}>{fmt$(run.total)}</div>
                    </div>
                  </div>
                  <div style={{ paddingTop: 10, borderTop: "1px dashed var(--concrete)", marginBottom: 10 }}>
                    {run.fbs.map((fb) => (
                      <div key={fb.id} style={{ fontSize: 11, display: "flex", justifyContent: "space-between", padding: "3px 0", gap: 8 }}>
                        <span style={{ flex: 1 }}>
                          FB #{fb.freightBillNumber} · {fb.jobName?.slice(0, 40) || "—"}
                          {fb.dispatchDate && <span style={{ color: "var(--concrete)" }}> · {new Date(fb.dispatchDate).toLocaleDateString()}</span>}
                        </span>
                        <strong>{fmt$(fb.paidAmount || 0)}</strong>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => downloadPayStub(run)}
                    className="btn-ghost"
                    style={{ padding: "6px 12px", fontSize: 11, borderColor: "var(--hazard-deep)", color: "var(--hazard-deep)" }}
                  >
                    <FileDown size={12} /> DOWNLOAD PAY STUB PDF
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 24, textAlign: "center", lineHeight: 1.6 }}>
          ▸ QUESTIONS ABOUT PAY? CONTACT DISPATCH.<br/>
          ▸ THIS PORTAL IS PRIVATE — DON'T SHARE YOUR LINK.<br/>
          ▸ SHOWING LAST {windowDays} DAYS ONLY. OLDER RECORDS AVAILABLE ON REQUEST.
        </div>
      </div>
    </div>
  );
};
