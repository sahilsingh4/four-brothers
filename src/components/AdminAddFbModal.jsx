import { useState } from "react";
import { Camera, Plus, Trash2, X } from "lucide-react";
import { compressOrReadFile } from "../utils";

// Admin-side "I have a paper freight bill in hand" entry path. Auto-approves
// on submit because the admin is the one entering it — no second review
// needed (Owner ask, followup #1).
//
// Trigger #1: per-assignment "+ ADD FB" button in DispatchesTab dispatch
// card. Caller passes initialDispatch + initialAssignment so the form is
// fully pre-filled.
//
// Trigger #2: floating "+ ADD FB MANUALLY" button in ReviewTab. Caller
// passes the dispatches + contacts lists; the modal renders a picker.
export const AdminAddFbModal = ({
  initialDispatch = null,
  initialAssignment = null,
  dispatches = [],
  contacts = [],
  onSubmit,        // async (fb) => { id }; called once validation passes
  onClose,
  onToast,
}) => {
  const [pickedDispatchId, setPickedDispatchId] = useState(initialDispatch?.id || "");
  const [pickedAssignmentAid, setPickedAssignmentAid] = useState(initialAssignment?.aid || "");

  const dispatch = initialDispatch || dispatches.find((d) => d.id === pickedDispatchId);
  const assignment = initialAssignment
    || dispatch?.assignments?.find((a) => a.aid === pickedAssignmentAid)
    || null;
  const assignmentContact = assignment?.contactId
    ? contacts.find((c) => c.id === assignment.contactId)
    : null;

  // Open dispatches sorted by date desc; only those with assignments
  const eligibleDispatches = dispatches
    .filter((d) => Array.isArray(d.assignments) && d.assignments.length > 0)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 50);

  const [form, setForm] = useState({
    freightBillNumber: "",
    driverName: "",
    truckNumber: "",
    material: "",
    tonnage: "",
    loadCount: "1",
    pickupTime: "",
    dropoffTime: "",
    notes: "",
  });
  // Repopulate name/truck/material when picker selection changes (controlled
  // refresh — only when admin picks via dropdown, not when user is typing).
  const fillFromAssignment = (d, a) => {
    const c = a?.contactId ? contacts.find((x) => x.id === a.contactId) : null;
    setForm((prev) => ({
      ...prev,
      driverName: c?.contactName || a?.name || "",
      truckNumber: a?.truckNumber || "",
      material: d?.material || "",
    }));
  };

  const [photos, setPhotos] = useState([]);  // [{ id, name, dataUrl, category }]
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handlePhotos = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setSubmitError("");
    const incoming = Array.from(fileList);
    const haveFb = photos.some((p) => p.category === "freight_bill");
    for (let i = 0; i < incoming.length; i++) {
      const file = incoming[i];
      try {
        const dataUrl = await compressOrReadFile(file, 1800, 0.8);
        // Default the first uploaded photo (when no FB photo yet) to
        // "freight_bill"; subsequent default to "scale_ticket".
        const isFirstFb = !haveFb && i === 0;
        setPhotos((prev) => [...prev, {
          id: Date.now() + i + Math.random(),
          name: file.name,
          dataUrl,
          category: isFirstFb ? "freight_bill" : "scale_ticket",
        }]);
      } catch (e) {
        console.error("compress failed:", e);
        setSubmitError(`Couldn't process ${file.name}: ${e?.message || "unknown error"}`);
      }
    }
  };
  const removePhoto = (id) => setPhotos((prev) => prev.filter((p) => p.id !== id));
  const cyclePhotoCategory = (id) => {
    setPhotos((prev) => prev.map((p) =>
      p.id === id
        ? { ...p, category: p.category === "freight_bill" ? "scale_ticket" : "freight_bill" }
        : p
    ));
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (!dispatch || !assignment) {
      setSubmitError("Pick an order and assignment first.");
      return;
    }
    if (!form.freightBillNumber.trim()) {
      setSubmitError("Freight bill # is required.");
      return;
    }
    if (!photos.some((p) => p.category === "freight_bill")) {
      setSubmitError("Attach at least one freight bill photo.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const newFb = {
        ...form,
        tonnage: form.tonnage ? Number(form.tonnage) : null,
        loadCount: Number(form.loadCount) || 1,
        dispatchId: dispatch.id,
        assignmentId: assignment.aid,
        photos: photos.map((p) => ({ id: p.id, dataUrl: p.dataUrl, name: p.name, category: p.category })),
        submittedAt: now,
        // Auto-approved — admin already reviewed the paper bill on the way in
        status: "approved",
        approvedAt: now,
        approvedBy: "admin",
        adminUploaded: true,
      };
      await onSubmit(newFb);
      onToast?.("FB ADDED — AUTO-APPROVED");
      onClose();
    } catch (e) {
      console.error("admin add FB failed:", e);
      setSubmitError(e?.message || "Save failed — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)" }}>ADMIN ENTRY</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>ADD FREIGHT BILL</h3>
          </div>
          <button onClick={onClose} className="btn-icon-on-dark" title="Close"><X size={20} /></button>
        </div>

        <div style={{ padding: 20, display: "grid", gap: 14 }}>
          {/* Pickers — only when context not preset */}
          {!initialDispatch && (
            <div>
              <label className="fbt-label">Order</label>
              <select
                className="fbt-input"
                value={pickedDispatchId}
                onChange={(e) => {
                  const id = e.target.value;
                  setPickedDispatchId(id);
                  setPickedAssignmentAid("");
                  const d = dispatches.find((x) => String(x.id) === String(id));
                  fillFromAssignment(d, null);
                }}
              >
                <option value="">— pick an order —</option>
                {eligibleDispatches.map((d) => (
                  <option key={d.id} value={d.id}>
                    #{d.code} · {d.jobName || "—"} · {d.date || "—"}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!initialAssignment && dispatch && (
            <div>
              <label className="fbt-label">Assignment</label>
              <select
                className="fbt-input"
                value={pickedAssignmentAid}
                onChange={(e) => {
                  const aid = e.target.value;
                  setPickedAssignmentAid(aid);
                  const a = dispatch.assignments?.find((x) => x.aid === aid);
                  fillFromAssignment(dispatch, a);
                }}
              >
                <option value="">— pick driver/sub —</option>
                {(dispatch.assignments || []).map((a) => {
                  const c = a.contactId ? contacts.find((x) => x.id === a.contactId) : null;
                  const name = c?.contactName || c?.companyName || a.name || "—";
                  return (
                    <option key={a.aid} value={a.aid}>
                      {name}{a.truckNumber ? ` · T${a.truckNumber}` : ""} ({a.kind})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Context summary */}
          {dispatch && assignment && (
            <div style={{ padding: 10, background: "var(--surface)", border: "1px solid var(--line)", fontSize: 12 }}>
              <strong>#{dispatch.code}</strong> · {dispatch.jobName || "—"}
              <div style={{ color: "var(--concrete)", marginTop: 2 }}>
                {assignmentContact?.contactName || assignment.name || "—"}
                {assignment.truckNumber ? ` · T${assignment.truckNumber}` : ""}
                {dispatch.date ? ` · ${dispatch.date}` : ""}
              </div>
            </div>
          )}

          {/* Form */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <div>
              <label className="fbt-label">FB # *</label>
              <input className="fbt-input" value={form.freightBillNumber} onChange={(e) => setForm({ ...form, freightBillNumber: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Driver name</label>
              <input className="fbt-input" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Truck #</label>
              <input className="fbt-input" value={form.truckNumber} onChange={(e) => setForm({ ...form, truckNumber: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Material</label>
              <input className="fbt-input" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Tonnage</label>
              <input className="fbt-input" type="number" step="0.01" value={form.tonnage} onChange={(e) => setForm({ ...form, tonnage: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Loads</label>
              <input className="fbt-input" type="number" min="1" value={form.loadCount} onChange={(e) => setForm({ ...form, loadCount: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Pickup time</label>
              <input className="fbt-input" type="time" value={form.pickupTime} onChange={(e) => setForm({ ...form, pickupTime: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Dropoff time</label>
              <input className="fbt-input" type="time" value={form.dropoffTime} onChange={(e) => setForm({ ...form, dropoffTime: e.target.value })} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="fbt-label">Notes</label>
              <input className="fbt-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          {/* Photos */}
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 6 }}>
              ▸ Photos · 1 freight bill required, scale tickets optional
            </div>
            <label className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <Camera size={14} /> ATTACH PHOTOS
              <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { handlePhotos(e.target.files); e.target.value = ""; }} />
            </label>
            {photos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginTop: 10 }}>
                {photos.map((p) => (
                  <div key={p.id} style={{ position: "relative", border: "1px solid var(--line)", padding: 4, background: "#FFF" }}>
                    <img src={p.dataUrl} alt={p.name} style={{ width: "100%", height: 90, objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => cyclePhotoCategory(p.id)}
                      title="Tap to swap freight bill / scale ticket"
                      style={{ marginTop: 4, width: "100%", padding: "3px 4px", fontSize: 10, fontWeight: 700, background: p.category === "freight_bill" ? "var(--hazard)" : "var(--surface)", color: p.category === "freight_bill" ? "#FFF" : "var(--steel)", border: "none", cursor: "pointer" }}
                    >
                      {p.category === "freight_bill" ? "FB" : "TICKET"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      title="Remove"
                      style={{ position: "absolute", top: 2, right: 2, background: "var(--safety)", color: "#FFF", border: "none", borderRadius: 4, padding: 2, cursor: "pointer", display: "flex" }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {submitError && (
            <div style={{ padding: 10, background: "var(--danger-soft)", border: "1px solid var(--safety)", color: "var(--safety)", fontSize: 12 }}>
              {submitError}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onClose} className="btn-ghost" disabled={busy}>CANCEL</button>
            <button type="button" onClick={handleSubmit} className="btn-primary" disabled={busy}>
              <Plus size={14} /> {busy ? "SAVING…" : "ADD + APPROVE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
