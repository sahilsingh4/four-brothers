import { useState } from "react";
import { Plus, Trash2, Truck } from "lucide-react";
import { storageSet } from "../utils";

export const FleetTab = ({ fleet, setFleet, contacts = [], onToast }) => {
  const [draft, setDraft] = useState({ unit: "", type: "Super Dump", driver: "", driverId: null, status: "available", notes: "" });
  const driverContacts = contacts.filter((c) => c.type === "driver");

  const add = async () => {
    if (!draft.unit) { onToast("UNIT # REQUIRED"); return; }
    const next = [...fleet, { ...draft, id: Date.now() }];
    setFleet(next); await storageSet("fbt:fleet", next);
    setDraft({ unit: "", type: "Super Dump", driver: "", driverId: null, status: "available", notes: "" });
    onToast("UNIT ADDED");
  };
  const update = async (id, field, value) => { const next = fleet.map((f) => f.id === id ? { ...f, [field]: value } : f); setFleet(next); await storageSet("fbt:fleet", next); };
  const updateDriver = async (id, driverId) => {
    const contact = driverId ? contacts.find((c) => c.id === Number(driverId) || c.id === driverId) : null;
    const next = fleet.map((f) => f.id === id ? { ...f, driverId: driverId || null, driver: contact ? (contact.companyName || contact.contactName) : "" } : f);
    setFleet(next); await storageSet("fbt:fleet", next);
  };
  const remove = async (id) => { const next = fleet.filter((f) => f.id !== id); setFleet(next); await storageSet("fbt:fleet", next); onToast("UNIT REMOVED"); };
  const statusColor = (s) => ({ available: "var(--good)", dispatched: "var(--hazard-deep)", maintenance: "var(--safety)", offline: "var(--concrete)" }[s] || "var(--concrete)");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="fbt-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>ADD FLEET UNIT</h3></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <div><label className="fbt-label">Unit #</label><input className="fbt-input" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="T-01" /></div>
          <div><label className="fbt-label">Type</label><select className="fbt-select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}><option>Super Dump</option><option>Transfer End Dump</option><option>Truck & Trailer</option><option>End Dump</option><option>Other</option></select></div>
          <div>
            <label className="fbt-label">Driver</label>
            {driverContacts.length > 0 ? (
              <select
                className="fbt-select"
                value={draft.driverId || ""}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) { setDraft({ ...draft, driverId: null, driver: "" }); return; }
                  const c = contacts.find((x) => String(x.id) === id);
                  if (c) setDraft({ ...draft, driverId: c.id, driver: c.companyName || c.contactName });
                }}
              >
                <option value="">— Unassigned —</option>
                {driverContacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>
                ))}
              </select>
            ) : (
              <input className="fbt-input" value={draft.driver} onChange={(e) => setDraft({ ...draft, driver: e.target.value })} placeholder="Add driver contacts for a picker" />
            )}
          </div>
          <div><label className="fbt-label">Status</label><select className="fbt-select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="available">Available</option><option value="dispatched">Dispatched</option><option value="maintenance">Maintenance</option><option value="offline">Offline</option></select></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="fbt-label">Notes</label><input className="fbt-input" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
        </div>
        <button onClick={add} className="btn-primary" style={{ marginTop: 18 }}><Plus size={16} /> ADD UNIT</button>
      </div>
      <div className="fbt-card" style={{ padding: 0 }}>
        <div style={{ padding: "18px 24px", borderBottom: "2px solid var(--steel)", display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 8, height: 24, background: "var(--hazard)" }} /><h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>FLEET ROSTER</h3></div>
        {fleet.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
            <Truck size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div className="fbt-mono" style={{ fontSize: 13 }}>NO UNITS ON ROSTER</div>
          </div>
        ) : (
          <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {fleet.map((f) => (
              <div key={f.id} style={{ border: "2px solid var(--steel)", background: "#FFF", position: "relative" }}>
                <div className="hazard-stripe-thin" style={{ height: 6 }} />
                <div style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div className="fbt-display" style={{ fontSize: 24 }}>{f.unit}</div>
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{f.type}</div>
                    </div>
                    <div style={{ padding: "4px 10px", background: statusColor(f.status), color: "#FFF", fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>● {f.status}</div>
                  </div>
                  <div style={{ marginTop: 14, fontSize: 13, fontFamily: "JetBrains Mono, monospace", color: "var(--concrete)" }}>DRIVER ▸ {f.driver || "unassigned"}{f.driverId ? " · LINKED" : ""}</div>
                  {driverContacts.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <select
                        className="fbt-select"
                        style={{ padding: "4px 8px", fontSize: 10 }}
                        value={f.driverId || ""}
                        onChange={(e) => updateDriver(f.id, e.target.value)}
                      >
                        <option value="">— Unassigned —</option>
                        {driverContacts.map((c) => (
                          <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {f.notes && <div style={{ marginTop: 8, fontSize: 12, color: "var(--concrete)" }}>{f.notes}</div>}
                  <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
                    <select className="fbt-select" style={{ padding: "6px 8px", fontSize: 11 }} value={f.status} onChange={(e) => update(f.id, "status", e.target.value)}>
                      <option value="available">Available</option><option value="dispatched">Dispatched</option><option value="maintenance">Maintenance</option><option value="offline">Offline</option>
                    </select>
                    <button className="btn-danger" onClick={() => remove(f.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
