import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";

// FMCSA Part 396-style pre-trip inspection. Items are the core daily-vehicle
// checks for a Class B / dump truck — driver marks each OK or DEFECT, adds
// notes for any defect, signs by typing their name. Submitting stamps a
// completedAt timestamp; the FB submission picks this up so the admin can see
// "Pre-trip done at 7:14am" on the FB record.
//
// One inspection per (driver, dispatch, day) — gated by localStorage so the
// driver doesn't re-do it on a second/third FB the same day.

const ITEMS = [
  { id: "brakes", label: "Brakes (service + parking)" },
  { id: "lights", label: "Lights (head, tail, turn, clearance)" },
  { id: "tires", label: "Tires (pressure, tread, no flats)" },
  { id: "wheels", label: "Wheels & rims" },
  { id: "steering", label: "Steering & suspension" },
  { id: "mirrors", label: "Mirrors & windshield" },
  { id: "horn", label: "Horn" },
  { id: "wipers", label: "Wipers & washers" },
  { id: "coupling", label: "Coupling devices (hitch, 5th wheel)" },
  { id: "leaks", label: "No fluid leaks (oil, fuel, coolant, hydraulic)" },
  { id: "hydraulics", label: "Hydraulic bed / tailgate operation" },
  { id: "emergency", label: "Emergency equipment (triangles, fire ext)" },
];

export const PreTripModal = ({ truckNumber, driverName, onSubmit, onClose }) => {
  // Each item starts unchecked — driver must explicitly mark every one
  const [results, setResults] = useState(() => Object.fromEntries(ITEMS.map((i) => [i.id, ""])));
  const [defectNotes, setDefectNotes] = useState({});
  const [signature, setSignature] = useState(driverName || "");
  const [submitting, setSubmitting] = useState(false);

  const setItem = (id, value) => {
    setResults((prev) => ({ ...prev, [id]: value }));
    if (value !== "defect") {
      setDefectNotes((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const allChecked = ITEMS.every((i) => results[i.id]);
  const defectsMissingNotes = ITEMS.filter((i) => results[i.id] === "defect" && !defectNotes[i.id]?.trim());
  const canSubmit = allChecked && defectsMissingNotes.length === 0 && signature.trim().length >= 2;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const items = ITEMS.map((i) => ({
        id: i.id,
        label: i.label,
        result: results[i.id], // "ok" or "defect"
        note: results[i.id] === "defect" ? (defectNotes[i.id] || "").trim() : null,
      }));
      const inspection = {
        completedAt: new Date().toISOString(),
        signedBy: signature.trim(),
        truckNumber: truckNumber || "",
        items,
        defectCount: items.filter((x) => x.result === "defect").length,
      };
      await onSubmit(inspection);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-bg" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 16, overflowY: "auto" }}>
      <div className="modal-body" style={{ background: "#FFF", maxWidth: 560, width: "100%", borderRadius: 10, padding: 0, boxShadow: "0 8px 24px rgba(15,23,42,0.10)" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="fbt-display" style={{ fontSize: 16 }}>Pre-trip inspection</div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
              FMCSA Part 396 · Truck {truckNumber || "—"}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }} title="Close">
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 8 }}>
          {ITEMS.map((item) => {
            const result = results[item.id];
            return (
              <div key={item.id} style={{ padding: 8, border: "1px solid var(--line)", borderRadius: 6, background: result === "defect" ? "#FEF2F2" : result === "ok" ? "#F0FDF4" : "#FFF" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{item.label}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setItem(item.id, "ok")}
                      style={{
                        padding: "4px 10px", fontSize: 11, fontWeight: 700,
                        border: `2px solid ${result === "ok" ? "var(--good)" : "var(--line)"}`,
                        background: result === "ok" ? "var(--good)" : "#FFF",
                        color: result === "ok" ? "#FFF" : "var(--steel)",
                        cursor: "pointer", borderRadius: 4,
                      }}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setItem(item.id, "defect")}
                      style={{
                        padding: "4px 10px", fontSize: 11, fontWeight: 700,
                        border: `2px solid ${result === "defect" ? "var(--safety)" : "var(--line)"}`,
                        background: result === "defect" ? "var(--safety)" : "#FFF",
                        color: result === "defect" ? "#FFF" : "var(--steel)",
                        cursor: "pointer", borderRadius: 4,
                      }}
                    >
                      DEFECT
                    </button>
                  </div>
                </div>
                {result === "defect" && (
                  <input
                    className="fbt-input"
                    style={{ marginTop: 6, fontSize: 12 }}
                    placeholder="Describe the defect (required)"
                    value={defectNotes[item.id] || ""}
                    onChange={(e) => setDefectNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  />
                )}
              </div>
            );
          })}

          <div style={{ marginTop: 8, padding: 10, border: "1px solid var(--line)", background: "#F8FAFC", borderRadius: 6 }}>
            <label htmlFor="pretrip-signature" className="fbt-label">Driver signature (type your name)</label>
            <input
              id="pretrip-signature"
              className="fbt-input"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="First Last"
              autoComplete="name"
            />
          </div>

          {!allChecked && (
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
              ▸ Mark every item OK or DEFECT to enable Submit.
            </div>
          )}
          {defectsMissingNotes.length > 0 && (
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--safety)" }}>
              ▸ Defect notes required on: {defectsMissingNotes.map((i) => i.label).join(", ")}.
            </div>
          )}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn-ghost" disabled={submitting}>Cancel</button>
          <button onClick={submit} className="btn-primary" disabled={!canSubmit || submitting}>
            <CheckCircle2 size={14} /> {submitting ? "Submitting…" : "Submit pre-trip"}
          </button>
        </div>
      </div>
    </div>
  );
};
