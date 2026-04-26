// Read-only viewer for inline-filled compliance forms (I-9, W-4, Driver
// Application, Direct Deposit). Renders the same spec the InlineFormFiller
// uses, but displays the captured values as a printable list instead of a
// raw JSON download. Includes a "Print" button so the admin can save as
// PDF or print on paper for files.

import { useEffect, useState } from "react";
import { Download, Printer, X } from "lucide-react";
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
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  const downloadOfficialPdf = async () => {
    setPdfBusy(true);
    setPdfError(null);
    try {
      const bytes = await fillOfficialPdf(formKey, values);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formKey}-${(contactName || "form").replace(/\s+/g, "_")}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("Official PDF fill failed:", e);
      setPdfError(e.message || "Couldn't fill PDF");
    } finally {
      setPdfBusy(false);
    }
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!spec) return null;

  const handlePrint = () => {
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

  return (
    <div className="modal-bg" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1100, padding: 12, overflowY: "auto" }} onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ background: "#FFF", maxWidth: 720, width: "100%", borderRadius: 10, padding: 0, boxShadow: "0 8px 24px rgba(15,23,42,0.18)" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--steel)", color: "var(--cream)" }}>
          <div>
            <div className="fbt-display" style={{ fontSize: 16 }}>{spec.title}</div>
            {(contactName || completedAt) && (
              <div className="fbt-mono" style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                {contactName || ""}{completedAt ? ` · signed ${new Date(completedAt).toLocaleString()}` : ""}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {OFFICIAL_PDF_AVAILABLE.includes(formKey) && (
              <button
                onClick={downloadOfficialPdf}
                className="btn-ghost"
                disabled={pdfBusy}
                style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "4px 10px", fontSize: 11 }}
                title={`Fill the official IRS/USCIS ${formKey.toUpperCase()} PDF with this data and download it`}
              >
                <Download size={14} /> {pdfBusy ? "Filling…" : `OFFICIAL ${formKey.toUpperCase()} PDF`}
              </button>
            )}
            <button onClick={handlePrint} className="btn-ghost" style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "4px 10px", fontSize: 11 }} title="Print or save the data summary as PDF">
              <Printer size={14} /> PRINT
            </button>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer", padding: 4 }}>
              <X size={20} />
            </button>
          </div>
        </div>
        {pdfError && (
          <div className="fbt-mono" style={{ padding: 10, fontSize: 11, color: "var(--safety)", background: "#FEF2F2", borderBottom: "1px solid var(--safety)" }}>
            ⚠ {pdfError}
          </div>
        )}
        <div style={{ padding: 16, display: "grid", gap: 14 }}>
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
  );
};
