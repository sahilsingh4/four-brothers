import { useState } from "react";
import { AlertCircle, X, CheckCircle2 } from "lucide-react";
import { compressImage } from "../utils";

// Driver-facing incident / accident report. Captured as a structured record
// attached to the next FB submission so the admin can see exactly what
// happened, when, and where, with photos. Lightweight enough that a driver can
// fill it in 30 seconds at the scene.
export const IncidentModal = ({ truckNumber, driverName, onSubmit, onClose }) => {
  const [kind, setKind] = useState("");
  const [drivable, setDrivable] = useState("");
  const [location, setLocation] = useState("");
  const [narrative, setNarrative] = useState("");
  const [otherParty, setOtherParty] = useState("");
  const [policeReportNumber, setPoliceReportNumber] = useState("");
  const [photos, setPhotos] = useState([]);
  const [signature, setSignature] = useState(driverName || "");
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState(false);

  const handlePhotos = async (files) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const next = [...photos];
      for (const f of Array.from(files)) {
        try {
          const dataUrl = await compressImage(f);
          next.push({ id: Date.now() + Math.random(), dataUrl, name: f.name });
        } catch (e) {
          console.warn("Incident photo compress failed:", e);
        }
      }
      setPhotos(next);
    } finally {
      setBusy(false);
    }
  };
  const removePhoto = (id) => setPhotos(photos.filter((p) => p.id !== id));

  const canSubmit = kind && drivable && narrative.trim().length >= 10 && signature.trim().length >= 2;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({
        reportedAt: new Date().toISOString(),
        kind, // collision, damage, near_miss, mechanical, other
        drivable, // yes, no, unsure
        location: location.trim(),
        narrative: narrative.trim(),
        otherParty: otherParty.trim(),
        policeReportNumber: policeReportNumber.trim(),
        photos,
        signedBy: signature.trim(),
        truckNumber: truckNumber || "",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-bg" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 16, overflowY: "auto" }}>
      <div className="modal-body" style={{ background: "#FFF", maxWidth: 580, width: "100%", borderRadius: 10, padding: 0, boxShadow: "0 8px 24px rgba(15,23,42,0.18)" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--safety)", color: "#FFF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={20} />
            <div>
              <div className="fbt-display" style={{ fontSize: 16 }}>Incident report</div>
              <div className="fbt-mono" style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                Truck {truckNumber || "—"}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#FFF", cursor: "pointer", padding: 4 }} title="Close">
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          <div>
            <label className="fbt-label">Type *</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { v: "collision", label: "Collision" },
                { v: "damage", label: "Property damage" },
                { v: "near_miss", label: "Near miss" },
                { v: "mechanical", label: "Mechanical breakdown" },
                { v: "other", label: "Other" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setKind(opt.v)}
                  style={{
                    padding: "6px 12px", fontSize: 11, fontWeight: 700,
                    border: `2px solid ${kind === opt.v ? "var(--safety)" : "var(--line)"}`,
                    background: kind === opt.v ? "var(--safety)" : "#FFF",
                    color: kind === opt.v ? "#FFF" : "var(--steel)",
                    cursor: "pointer", borderRadius: 4,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="fbt-label">Truck still drivable? *</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { v: "yes", label: "YES", c: "var(--good)" },
                { v: "no", label: "NO", c: "var(--safety)" },
                { v: "unsure", label: "Unsure", c: "var(--hazard-deep)" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setDrivable(opt.v)}
                  style={{
                    flex: 1, padding: "8px 12px", fontSize: 11, fontWeight: 700,
                    border: `2px solid ${drivable === opt.v ? opt.c : "var(--line)"}`,
                    background: drivable === opt.v ? opt.c : "#FFF",
                    color: drivable === opt.v ? "#FFF" : "var(--steel)",
                    cursor: "pointer", borderRadius: 4,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="fbt-label" htmlFor="incident-location">Location</label>
            <input
              id="incident-location"
              className="fbt-input"
              placeholder="Street + city, intersection, mile marker, etc."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="fbt-label" htmlFor="incident-narrative">What happened? * <span style={{ color: "var(--concrete)", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(at least 10 chars)</span></label>
            <textarea
              id="incident-narrative"
              className="fbt-textarea"
              placeholder="Describe what happened — sequence of events, weather, road conditions, who was involved."
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              style={{ minHeight: 80 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            <div>
              <label className="fbt-label" htmlFor="incident-other">Other party (if any)</label>
              <input
                id="incident-other"
                className="fbt-input"
                placeholder="Driver name, plate, insurance"
                value={otherParty}
                onChange={(e) => setOtherParty(e.target.value)}
              />
            </div>
            <div>
              <label className="fbt-label" htmlFor="incident-police">Police report #</label>
              <input
                id="incident-police"
                className="fbt-input"
                placeholder="If issued"
                value={policeReportNumber}
                onChange={(e) => setPoliceReportNumber(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="fbt-label">Photos</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", border: "2px dashed var(--concrete)", cursor: "pointer", fontSize: 12 }}>
              📷 ADD PHOTOS
              <input type="file" accept="image/*" multiple capture="environment" style={{ display: "none" }} onChange={(e) => handlePhotos(e.target.files)} />
            </label>
            {busy && <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginLeft: 8 }}>Compressing…</span>}
            {photos.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {photos.map((p) => (
                  <div key={p.id} style={{ position: "relative" }}>
                    <img src={p.dataUrl} alt="" style={{ width: 80, height: 80, objectFit: "cover", border: "1px solid var(--line)" }} />
                    <button onClick={() => removePhoto(p.id)} style={{ position: "absolute", top: -6, right: -6, background: "var(--safety)", color: "#FFF", border: "1px solid var(--steel)", width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, borderRadius: "50%" }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="fbt-label" htmlFor="incident-sig">Driver signature (type your name) *</label>
            <input
              id="incident-sig"
              className="fbt-input"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="First Last"
              autoComplete="name"
            />
          </div>

          {!canSubmit && (
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
              ▸ Pick a type, drivable status, write at least 10 chars about what happened, and sign.
            </div>
          )}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn-ghost" disabled={submitting}>Cancel</button>
          <button onClick={submit} className="btn-primary" disabled={!canSubmit || submitting} style={{ background: "var(--safety)", borderColor: "var(--safety)", color: "#FFF" }}>
            <CheckCircle2 size={14} /> {submitting ? "Submitting…" : "Submit incident"}
          </button>
        </div>
      </div>
    </div>
  );
};
