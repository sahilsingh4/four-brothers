import { useState, useEffect } from "react";
import { X, CheckCircle2 } from "lucide-react";

// Lightweight inline contact creator for the dispatch assignment picker.
// Skips the full Contacts modal — just the essentials (kind, name/company,
// phone, email, brokerage %, default pay rate). On save, calls onSave with
// the constructed contact draft; the parent inserts it and chooses what to
// do next (e.g. auto-pick it in the assignment row).
export const QuickAddContactModal = ({ kind, onSave, onCancel, onToast }) => {
  const [draft, setDraft] = useState({
    type: kind,
    companyName: "",
    contactName: "",
    phone: "",
    email: "",
    defaultPayRate: "",
    defaultPayMethod: "hour",
    brokerageApplies: kind === "sub",
    brokeragePercent: kind === "sub" ? 10 : 0,
    actsAsBroker: false,
    favorite: false,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.companyName && !draft.contactName) {
      onToast("ENTER A NAME");
      return;
    }
    setSaving(true);
    try {
      const contact = {
        ...draft,
        defaultPayRate: draft.defaultPayRate ? Number(draft.defaultPayRate) : null,
        brokeragePercent: draft.brokerageApplies ? Number(draft.brokeragePercent) || 10 : 0,
        createdAt: new Date().toISOString(),
      };
      await onSave(contact);
    } catch (e) {
      console.error("QuickAdd save failed:", e);
      onToast("⚠ SAVE FAILED");
    } finally {
      setSaving(false);
    }
  };

  // v18 Batch 2 Session C: keyboard shortcuts — Escape to cancel, Enter to save
  useEffect(() => {
    const handler = (e) => {
      const tgt = e.target;
      const isTextArea = tgt && tgt.tagName === "TEXTAREA";
      if (e.key === "Escape" && !saving) { onCancel(); }
      if (e.key === "Enter" && !saving && !isTextArea) { e.preventDefault(); save(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, draft]);

  return (
    // Stacks above the NewOrder modal that opened it (NewOrder's modal-bg
    // renders LATER in the DOM, so equal z-index would put NewOrder on top
    // and bury this picker behind it). Bumped to 200 (base modal-bg is 100).
    <div className="modal-bg" onClick={onCancel} style={{ zIndex: 200 }}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ padding: "16px 20px", background: kind === "sub" ? "#9A3412" : "#0369A1", color: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, opacity: 0.8 }}>QUICK ADD</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>NEW {kind === "sub" ? "SUB HAULER" : "DRIVER"}</h3>
          </div>
          <button onClick={onCancel} style={{ background: "transparent", border: "none", color: "#FFF", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 20, display: "grid", gap: 12 }}>
          {kind === "sub" && (
            <div>
              <label htmlFor="qac-company" className="fbt-label">Company Name</label>
              <input id="qac-company" className="fbt-input" value={draft.companyName} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} placeholder="ABC Trucking LLC" autoFocus />
            </div>
          )}
          <div>
            <label htmlFor="qac-contact" className="fbt-label">{kind === "sub" ? "Contact Person (optional)" : "Driver Name"}</label>
            <input id="qac-contact" className="fbt-input" value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} placeholder={kind === "sub" ? "John Smith" : "Driver name"} autoFocus={kind === "driver"} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label htmlFor="qac-phone" className="fbt-label">Phone</label>
              <input id="qac-phone" className="fbt-input" type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="555-123-4567" />
            </div>
            <div>
              <label htmlFor="qac-email" className="fbt-label">Email</label>
              <input id="qac-email" className="fbt-input" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="driver@example.com" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label htmlFor="qac-rate" className="fbt-label">Default Pay Rate $</label>
              <input id="qac-rate" className="fbt-input" type="number" step="0.01" value={draft.defaultPayRate} onChange={(e) => setDraft({ ...draft, defaultPayRate: e.target.value })} placeholder="75.00" />
            </div>
            <div>
              <label htmlFor="qac-method" className="fbt-label">Pay Method</label>
              <select id="qac-method" className="fbt-select" value={draft.defaultPayMethod} onChange={(e) => setDraft({ ...draft, defaultPayMethod: e.target.value })}>
                <option value="hour">Per Hour</option>
                <option value="ton">Per Ton</option>
                <option value="load">Per Load</option>
                <option value="flat">Flat</option>
              </select>
            </div>
          </div>

          {kind === "sub" && (
            <>
              <div style={{ padding: 10, background: "#FEF3C7", border: "1.5px solid var(--hazard-deep)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12 }}>
                  <input type="checkbox" checked={draft.brokerageApplies} onChange={(e) => setDraft({ ...draft, brokerageApplies: e.target.checked })} />
                  <span style={{ fontWeight: 700 }}>Apply brokerage</span>
                </label>
                {draft.brokerageApplies && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <label className="fbt-mono" style={{ fontSize: 10 }}>Brokerage %:</label>
                    <input className="fbt-input" type="number" step="0.5" value={draft.brokeragePercent} onChange={(e) => setDraft({ ...draft, brokeragePercent: e.target.value })} style={{ width: 80 }} />
                  </div>
                )}
              </div>
              <div style={{ padding: 10, background: draft.actsAsBroker ? "#EFF6FF" : "#F5F5F4", border: "1.5px solid " + (draft.actsAsBroker ? "var(--hazard-deep)" : "var(--concrete)") }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12 }}>
                  <input type="checkbox" checked={!!draft.actsAsBroker} onChange={(e) => setDraft({ ...draft, actsAsBroker: e.target.checked })} />
                  <span style={{ fontWeight: 700 }}>Also brokers work back to us</span>
                </label>
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 6, lineHeight: 1.4 }}>
                  ▸ Check when this same company also gives us work — they'll show up in the order-form customer picker.
                </div>
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button onClick={save} disabled={saving} className="btn-primary">
              <CheckCircle2 size={15} /> {saving ? "SAVING..." : "SAVE + USE"}
            </button>
            <button onClick={onCancel} className="btn-ghost">CANCEL</button>
          </div>
          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
            ▸ For full contact details (insurance, USDOT, address, notes), edit in the Contacts tab after saving.
          </div>
        </div>
      </div>
    </div>
  );
};
