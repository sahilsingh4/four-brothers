// Renderer for the inline-fillable compliance forms (I-9 Section 1, W-4,
// Direct Deposit). Form specs live in ./formSpecs.js.
//
// Each spec is a list of sections + fields. Submitting captures the values
// as a JSON blob saved on the contact's documents array (kind:
// "<formKey>_form"). Admin sees the filled data in the contact view.

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { FORM_SPECS } from "./formSpecs";

export const InlineFormFiller = ({ formKey, defaults = {}, onCancel, onSubmit }) => {
  const spec = FORM_SPECS[formKey];
  const [values, setValues] = useState(() => ({
    ...defaults,
    signatureDate: defaults.signatureDate || new Date().toISOString().slice(0, 10),
  }));
  const [submitting, setSubmitting] = useState(false);

  if (!spec) return null;

  const setField = (id, v) => setValues((prev) => ({ ...prev, [id]: v }));

  const allFields = spec.sections.flatMap((s) => s.fields);
  const missing = allFields.filter((f) => f.required && !String(values[f.id] || "").trim());

  const submit = async () => {
    if (missing.length > 0) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-bg" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1100, padding: 12, overflowY: "auto" }}>
      <div className="modal-body" style={{ background: "#FFF", maxWidth: 640, width: "100%", borderRadius: 10, padding: 0, boxShadow: "0 8px 24px rgba(15,23,42,0.18)" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--steel)", color: "var(--cream)" }}>
          <div className="fbt-display" style={{ fontSize: 16 }}>{spec.title}</div>
          <button onClick={onCancel} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 16 }}>
          {spec.legalNote && (
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", padding: 8, background: "#FEF3C7", border: "1px solid var(--hazard)", borderRadius: 4 }}>
              ▸ {spec.legalNote}
            </div>
          )}

          {spec.sections.map((section) => (
            <div key={section.title} style={{ display: "grid", gap: 8 }}>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--steel)", fontWeight: 700 }}>
                ▸ {section.title.toUpperCase()}
              </div>
              {section.fields.map((f) => (
                <div key={f.id}>
                  <label className="fbt-label" htmlFor={`form-${formKey}-${f.id}`}>
                    {f.label}{f.required && <span style={{ color: "var(--safety)" }}> *</span>}
                  </label>
                  {f.type === "radio" ? (
                    <div style={{ display: "grid", gap: 4 }}>
                      {f.options.map((opt) => (
                        <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                          <input
                            type="radio"
                            name={`form-${formKey}-${f.id}`}
                            value={opt.v}
                            checked={values[f.id] === opt.v}
                            onChange={(e) => setField(f.id, e.target.value)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  ) : f.type === "checkbox" ? (
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input
                        id={`form-${formKey}-${f.id}`}
                        type="checkbox"
                        checked={!!values[f.id]}
                        onChange={(e) => setField(f.id, e.target.checked)}
                      />
                      {f.checkboxLabel || f.label}
                    </label>
                  ) : (
                    <input
                      id={`form-${formKey}-${f.id}`}
                      className="fbt-input"
                      type={f.type || "text"}
                      maxLength={f.maxLength}
                      placeholder={f.placeholder || ""}
                      value={values[f.id] || ""}
                      onChange={(e) => setField(f.id, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}

          {missing.length > 0 && (
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--safety)" }}>
              ▸ Required: {missing.map((f) => f.label).join(", ")}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} className="btn-ghost" disabled={submitting}>Cancel</button>
          <button onClick={submit} className="btn-primary" disabled={missing.length > 0 || submitting}>
            <CheckCircle2 size={14} /> {submitting ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
};
