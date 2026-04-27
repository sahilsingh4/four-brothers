// Read-only viewer for inline-filled compliance forms (I-9, W-4, W-9,
// Driver Application, Direct Deposit). For forms with an OFFICIAL IRS /
// USCIS PDF on disk (i9 / w4 / w9), the viewer fills that PDF in the
// background and embeds it as an iframe so the admin sees the actual
// completed government form, not a data table. The captured-data table
// drops below the preview as a quick-scan reference.
//
// For forms without an official PDF (driver_app, direct_deposit, future
// IC agreement before its mapping is wired), the data table is the only
// view. The "PRINT" button generates a clean printable HTML page.

import { useEffect, useState } from "react";
import { Download, FileText, Printer, X } from "lucide-react";
import { FORM_SPECS } from "./formSpecs";
import { fillOfficialPdf } from "../utils/officialPdfFiller";

// Form keys that have an official IRS / USCIS PDF available in /public/forms/.
const OFFICIAL_PDF_AVAILABLE = ["i9", "w4", "w9"];

const formatValue = (field, raw) => {
  if (raw === undefined || raw === null || raw === "") return <span style={{ color: "var(--concrete)" }}>—</span>;
  if (field.type === "checkbox") return raw ? "Yes" : "No";
  if (field.type === "radio") {
    const opt = (field.options || []).find((o) => o.v === raw);
    return opt ? opt.label : String(raw);
  }
  return String(raw);
};

export const FilledFormViewer = ({ formKey, values, onClose, contactName, completedAt }) => {
  const spec = FORM_SPECS[formKey];
  const hasOfficialPdf = OFFICIAL_PDF_AVAILABLE.includes(formKey);

  // Inline PDF state — built once on mount, kept around for re-use by both
  // the iframe preview and the Download / Print buttons (so we don't fill
  // the PDF twice).
  const [pdfState, setPdfState] = useState({ url: null, bytes: null, loading: hasOfficialPdf, error: null });

  useEffect(() => {
    if (!hasOfficialPdf) return;
    let cancelled = false;
    let activeUrl = null;
    (async () => {
      try {
        const bytes = await fillOfficialPdf(formKey, values);
        if (cancelled) return;
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        activeUrl = url;
        setPdfState({ url, bytes, loading: false, error: null });
      } catch (e) {
        if (cancelled) return;
        console.error("Official PDF fill failed:", e);
        setPdfState({ url: null, bytes: null, loading: false, error: e?.message || "Couldn't fill PDF — check the console for details." });
      }
    })();
    return () => {
      cancelled = true;
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [formKey, values, hasOfficialPdf]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!spec) return null;

  // Download the same filled PDF the iframe is showing.
  const downloadOfficialPdf = () => {
    if (!pdfState.bytes) return;
    const blob = new Blob([pdfState.bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formKey}-${(contactName || "form").replace(/\s+/g, "_")}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Open the filled PDF in a new tab for printing — browsers handle PDF
  // print better than embedded iframe print() does.
  const printOfficialPdf = () => {
    if (!pdfState.url) return;
    const w = window.open(pdfState.url, "_blank");
    if (!w) alert("Pop-up blocked — allow pop-ups to print.");
  };

  // Fallback for non-official forms: print the data table.
  const printDataTable = () => {
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) { alert("Pop-up blocked — allow pop-ups to print."); return; }
    const sectionsHtml = spec.sections.map((section) => {
      const rowsHtml = section.fields.map((f) => {
        const v = values?.[f.id];
        const display = v === undefined || v === null || v === ""
          ? "—"
          : f.type === "checkbox" ? (v ? "Yes" : "No")
          : f.type === "radio" ? ((f.options || []).find((o) => o.v === v)?.label || String(v))
          : String(v);
        return `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee;color:#475569;width:40%">${f.label}</td><td style="padding:4px 8px;border-bottom:1px solid #eee">${display.replace(/[<>&]/g, (c) => ({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]))}</td></tr>`;
      }).join("");
      return `<h3 style="margin:18px 0 6px;font-size:13px;color:#0F172A;border-bottom:2px solid #0F172A;padding-bottom:3px">${section.title}</h3><table style="width:100%;border-collapse:collapse;font-size:12px">${rowsHtml}</table>`;
    }).join("");
    win.document.write(`<!doctype html><html><head><title>${spec.title}</title><style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0F172A;max-width:720px;margin:24px auto;padding:0 24px}.header{margin-bottom:18px}.header h1{font-size:18px;margin:0 0 4px}.header .meta{font-size:11px;color:#64748B}@media print{body{margin:0;padding:0 12px}}</style></head><body><div class="header"><h1>${spec.title}</h1><div class="meta">${contactName || ""}${completedAt ? " · " + new Date(completedAt).toLocaleString() : ""}</div></div>${sectionsHtml}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 200);
  };

  const handlePrint = hasOfficialPdf ? printOfficialPdf : printDataTable;

  return (
    <div className="modal-bg" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1100, padding: 12, overflowY: "auto" }} onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ background: "#FFF", maxWidth: 920, width: "100%", borderRadius: 10, padding: 0, boxShadow: "0 8px 24px rgba(15,23,42,0.18)" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--steel)", color: "var(--cream)", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div className="fbt-display" style={{ fontSize: 16 }}>{spec.title}</div>
            {(contactName || completedAt) && (
              <div className="fbt-mono" style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                {contactName || ""}{completedAt ? ` · signed ${new Date(completedAt).toLocaleString()}` : ""}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {hasOfficialPdf && (
              <button
                onClick={downloadOfficialPdf}
                className="btn-ghost"
                disabled={!pdfState.bytes}
                style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "4px 10px", fontSize: 11 }}
                title={`Download the filled official ${formKey.toUpperCase()} PDF`}
              >
                <Download size={14} /> {pdfState.loading ? "FILLING…" : `DOWNLOAD ${formKey.toUpperCase()} PDF`}
              </button>
            )}
            <button onClick={handlePrint} className="btn-ghost" disabled={hasOfficialPdf && !pdfState.url} style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "4px 10px", fontSize: 11 }} title={hasOfficialPdf ? "Open the filled PDF in a new tab to print or save" : "Print or save the data summary"}>
              <Printer size={14} /> PRINT
            </button>
            <button onClick={onClose} className="btn-icon-on-dark" title="Close"><X size={20} /></button>
          </div>
        </div>

        {/* Inline filled-PDF preview (only for forms with an official PDF on disk).
            Iframe height is roughly Letter aspect ratio so admin can read the form
            without horizontal scroll. Scrollbar inside iframe handles long pages. */}
        {hasOfficialPdf && (
          <div style={{ padding: "12px 16px 0", background: "#F1F5F9" }}>
            {pdfState.loading && (
              <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--concrete)", fontSize: 13 }}>
                Filling official PDF…
              </div>
            )}
            {pdfState.error && (
              <div style={{ padding: 12, background: "#FEF2F2", border: "1.5px solid var(--safety)", color: "var(--safety)", fontSize: 12, lineHeight: 1.5 }}>
                ⚠ {pdfState.error}
                <div style={{ fontSize: 10, color: "var(--concrete)", marginTop: 6 }}>
                  The data table below still has all captured values. Try downloading separately, or check your network.
                </div>
              </div>
            )}
            {pdfState.url && (
              <iframe
                src={pdfState.url}
                title={`${spec.title} (filled)`}
                style={{ width: "100%", height: "70vh", minHeight: 520, border: "1px solid var(--line)", background: "#FFF", borderRadius: 6 }}
              />
            )}
          </div>
        )}

        {/* Data table — captured values, useful as a quick-scan reference and
            as the primary view for forms without an official PDF. */}
        <div style={{ padding: 16 }}>
          {hasOfficialPdf && (
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={12} /> CAPTURED VALUES (REFERENCE)
            </div>
          )}
          <div style={{ display: "grid", gap: 14 }}>
            {spec.sections.map((section) => (
              <div key={section.title} style={{ display: "grid", gap: 4 }}>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--steel)", fontWeight: 700, borderBottom: "1.5px solid var(--steel)", paddingBottom: 4 }}>
                  ▸ {section.title.toUpperCase()}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <tbody>
                    {section.fields.map((f) => (
                      <tr key={f.id}>
                        <td style={{ padding: "5px 8px", color: "var(--concrete)", verticalAlign: "top", width: "45%", borderBottom: "1px solid var(--line)" }}>
                          {f.label}
                        </td>
                        <td style={{ padding: "5px 8px", color: "var(--steel)", borderBottom: "1px solid var(--line)" }}>
                          {formatValue(f, values?.[f.id])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
