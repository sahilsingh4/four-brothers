import { useState, useMemo } from "react";
import { AlertTriangle, Plus, Trash2, Truck, Wrench, X } from "lucide-react";
import { storageSet, fmtDate } from "../utils";

// Helper: days from today (negative = expired)
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const t = new Date(dateStr + "T12:00:00").getTime();
  if (isNaN(t)) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((t - today.getTime()) / (1000 * 60 * 60 * 24));
};

// "expired" | "soon" (≤30 days) | "warning" (≤60) | "ok" | null (no date)
const expiryStatus = (dateStr) => {
  const d = daysUntil(dateStr);
  if (d === null) return null;
  if (d < 0) return "expired";
  if (d <= 30) return "soon";
  if (d <= 60) return "warning";
  return "ok";
};

const expiryColor = (s) => ({
  expired: "var(--safety)",
  soon: "var(--safety)",
  warning: "var(--warn-fg)",
  ok: "var(--good)",
}[s] || "var(--concrete)");

const expiryBg = (s) => ({
  expired: "var(--danger-soft)",
  soon: "var(--danger-soft)",
  warning: "var(--warn-bg)",
  ok: "var(--good-soft)",
}[s] || "var(--surface)");

const expiryLabel = (dateStr) => {
  const d = daysUntil(dateStr);
  if (d === null) return "—";
  if (d < 0) return `${Math.abs(d)}d ago`;
  if (d === 0) return "today";
  return `${d}d`;
};

// Returns the "worst" expiry status across the unit's tracked dates.
const worstStatus = (unit) => {
  const order = { expired: 4, soon: 3, warning: 2, ok: 1 };
  const dates = [
    unit.insuranceExpiry, unit.registrationExpiry, unit.dotInspectionExpiry,
    unit.nextOilChange, unit.nextBrakeService, unit.nextSmogCheck,
  ];
  let worst = null;
  for (const d of dates) {
    const s = expiryStatus(d);
    if (!s) continue;
    if (!worst || order[s] > order[worst]) worst = s;
  }
  return worst;
};

const newDraft = () => ({
  unit: "", type: "Super Dump", driver: "", driverId: null, status: "available",
  licensePlate: "", vin: "", mileage: "",
  lastServiceDate: "", lastServiceMileage: "", nextServiceDueMileage: "",
  insuranceCarrier: "", insuranceExpiry: "",
  registrationExpiry: "", dotInspectionExpiry: "",
  // Preventive-maintenance schedule — owner stamps a target date for each
  // recurring service. UI flags chips when within 30 days of due / overdue.
  nextOilChange: "", nextBrakeService: "", nextSmogCheck: "",
  notes: "", maintenanceLog: [],
});

export const FleetTab = ({ fleet, setFleet, contacts = [], onToast }) => {
  const [draft, setDraft] = useState(newDraft());
  const [openUnitId, setOpenUnitId] = useState(null); // for maintenance log modal
  const driverContacts = contacts.filter((c) => c.type === "driver");

  const persist = async (next) => { setFleet(next); await storageSet("fbt:fleet", next); };

  const add = async () => {
    if (!draft.unit) { onToast("UNIT # REQUIRED"); return; }
    await persist([...fleet, { ...draft, id: Date.now(), maintenanceLog: [] }]);
    setDraft(newDraft());
    onToast("UNIT ADDED");
  };
  const update = async (id, field, value) => {
    await persist(fleet.map((f) => f.id === id ? { ...f, [field]: value } : f));
  };
  const updateDriver = async (id, driverId) => {
    const contact = driverId ? contacts.find((c) => c.id === Number(driverId) || c.id === driverId) : null;
    await persist(fleet.map((f) => f.id === id ? { ...f, driverId: driverId || null, driver: contact ? (contact.companyName || contact.contactName) : "" } : f));
  };
  const remove = async (id) => {
    if (!window.confirm("Remove this unit from the fleet roster? Maintenance history will be lost.")) return;
    await persist(fleet.filter((f) => f.id !== id));
    onToast("UNIT REMOVED");
  };
  const addMaintenance = async (id, entry) => {
    const next = fleet.map((f) => f.id === id ? { ...f, maintenanceLog: [{ ...entry, id: Date.now() }, ...(f.maintenanceLog || [])] } : f);
    await persist(next);
  };
  const removeMaintenance = async (unitId, entryId) => {
    const next = fleet.map((f) => f.id === unitId ? { ...f, maintenanceLog: (f.maintenanceLog || []).filter((e) => e.id !== entryId) } : f);
    await persist(next);
  };

  const statusColor = (s) => ({ available: "var(--good)", dispatched: "var(--hazard-deep)", maintenance: "var(--safety)", offline: "var(--concrete)" }[s] || "var(--concrete)");

  // Needs-attention units: expired or expiring ≤30 days
  const attentionUnits = useMemo(() => {
    return (fleet || []).filter((f) => {
      const s = worstStatus(f);
      return s === "expired" || s === "soon";
    });
  }, [fleet]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Needs-attention banner */}
      {attentionUnits.length > 0 && (
        <div className="fbt-card" style={{ padding: 14, background: "var(--danger-soft)", border: "1px solid var(--safety)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={16} style={{ color: "var(--safety)" }} />
            <div className="fbt-mono" style={{ fontSize: 12, color: "var(--safety)", fontWeight: 700 }}>
              {attentionUnits.length} UNIT{attentionUnits.length !== 1 ? "S" : ""} NEED ATTENTION
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {attentionUnits.map((f) => (
              <div key={f.id} style={{ padding: "6px 10px", background: "#FFF", border: "1px solid var(--danger-border)", borderRadius: 6, fontSize: 12 }}>
                <strong>{f.unit}</strong> · {f.type}
                {expiryStatus(f.insuranceExpiry) === "expired" || expiryStatus(f.insuranceExpiry) === "soon" ? <> · INS {expiryLabel(f.insuranceExpiry)}</> : null}
                {expiryStatus(f.registrationExpiry) === "expired" || expiryStatus(f.registrationExpiry) === "soon" ? <> · REG {expiryLabel(f.registrationExpiry)}</> : null}
                {expiryStatus(f.dotInspectionExpiry) === "expired" || expiryStatus(f.dotInspectionExpiry) === "soon" ? <> · DOT {expiryLabel(f.dotInspectionExpiry)}</> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add unit form */}
      <div className="fbt-card" style={{ padding: 24 }}>
        <h3 className="fbt-display" style={{ fontSize: 18, margin: "0 0 16px" }}>Add fleet unit</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <div><label className="fbt-label">Unit #</label><input className="fbt-input" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="T-01" /></div>
          <div><label className="fbt-label">Type</label><select className="fbt-select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}><option>Super Dump</option><option>Transfer End Dump</option><option>Truck & Trailer</option><option>End Dump</option><option>Other</option></select></div>
          <div><label className="fbt-label">License Plate</label><input className="fbt-input" value={draft.licensePlate} onChange={(e) => setDraft({ ...draft, licensePlate: e.target.value })} placeholder="6ABC123" /></div>
          <div><label className="fbt-label">VIN</label><input className="fbt-input" value={draft.vin} onChange={(e) => setDraft({ ...draft, vin: e.target.value })} placeholder="17-char VIN" /></div>
          <div>
            <label className="fbt-label">Driver</label>
            {driverContacts.length > 0 ? (
              <select className="fbt-select" value={draft.driverId || ""} onChange={(e) => {
                const id = e.target.value;
                if (!id) { setDraft({ ...draft, driverId: null, driver: "" }); return; }
                const c = contacts.find((x) => String(x.id) === id);
                if (c) setDraft({ ...draft, driverId: c.id, driver: c.companyName || c.contactName });
              }}>
                <option value="">— Unassigned —</option>
                {driverContacts.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>)}
              </select>
            ) : (
              <input className="fbt-input" value={draft.driver} onChange={(e) => setDraft({ ...draft, driver: e.target.value })} placeholder="Add driver contacts for a picker" />
            )}
          </div>
          <div><label className="fbt-label">Status</label><select className="fbt-select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="available">Available</option><option value="dispatched">Dispatched</option><option value="maintenance">Maintenance</option><option value="offline">Offline</option></select></div>
          <div><label className="fbt-label">Mileage</label><input className="fbt-input" type="number" value={draft.mileage} onChange={(e) => setDraft({ ...draft, mileage: e.target.value })} placeholder="125000" /></div>
          <div><label className="fbt-label">Insurance carrier</label><input className="fbt-input" value={draft.insuranceCarrier} onChange={(e) => setDraft({ ...draft, insuranceCarrier: e.target.value })} placeholder="Progressive Commercial" /></div>
          <div><label className="fbt-label">Insurance expires</label><input className="fbt-input" type="date" value={draft.insuranceExpiry} onChange={(e) => setDraft({ ...draft, insuranceExpiry: e.target.value })} /></div>
          <div><label className="fbt-label">Registration expires</label><input className="fbt-input" type="date" value={draft.registrationExpiry} onChange={(e) => setDraft({ ...draft, registrationExpiry: e.target.value })} /></div>
          <div><label className="fbt-label">DOT inspection expires</label><input className="fbt-input" type="date" value={draft.dotInspectionExpiry} onChange={(e) => setDraft({ ...draft, dotInspectionExpiry: e.target.value })} /></div>
          <div><label className="fbt-label">Next oil change</label><input className="fbt-input" type="date" value={draft.nextOilChange || ""} onChange={(e) => setDraft({ ...draft, nextOilChange: e.target.value })} /></div>
          <div><label className="fbt-label">Next brake service</label><input className="fbt-input" type="date" value={draft.nextBrakeService || ""} onChange={(e) => setDraft({ ...draft, nextBrakeService: e.target.value })} /></div>
          <div><label className="fbt-label">Next smog check</label><input className="fbt-input" type="date" value={draft.nextSmogCheck || ""} onChange={(e) => setDraft({ ...draft, nextSmogCheck: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="fbt-label">Notes</label><input className="fbt-input" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
        </div>
        <button onClick={add} className="btn-primary" style={{ marginTop: 18 }}><Plus size={16} /> Add unit</button>
      </div>

      {/* Roster */}
      <div className="fbt-card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 className="fbt-display" style={{ fontSize: 18, margin: 0 }}>Fleet roster</h3>
        </div>
        {fleet.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
            <Truck size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div style={{ fontSize: 13 }}>No units on roster</div>
          </div>
        ) : (
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {fleet.map((f) => {
              const ws = worstStatus(f);
              const insS = expiryStatus(f.insuranceExpiry);
              const regS = expiryStatus(f.registrationExpiry);
              const dotS = expiryStatus(f.dotInspectionExpiry);
              const oilS = expiryStatus(f.nextOilChange);
              const brakeS = expiryStatus(f.nextBrakeService);
              const smogS = expiryStatus(f.nextSmogCheck);
              return (
                <div key={f.id} style={{ border: `1px solid ${ws === "expired" || ws === "soon" ? "var(--safety)" : "var(--line)"}`, borderRadius: 10, background: "#FFF", padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <div className="fbt-display" style={{ fontSize: 22, lineHeight: 1.1 }}>{f.unit}</div>
                      <div style={{ fontSize: 12, color: "var(--concrete)", marginTop: 2 }}>{f.type}{f.licensePlate ? ` · ${f.licensePlate}` : ""}</div>
                    </div>
                    <span className="chip" style={{ background: statusColor(f.status), color: "#FFF", borderColor: statusColor(f.status) }}>● {f.status}</span>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, color: "var(--concrete)" }}>
                    Driver ▸ {f.driver || "unassigned"}
                  </div>

                  {/* Expiry chips — compliance + preventive maintenance */}
                  {(f.insuranceExpiry || f.registrationExpiry || f.dotInspectionExpiry || f.nextOilChange || f.nextBrakeService || f.nextSmogCheck) && (
                    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {f.insuranceExpiry && (
                        <span className="chip" title={`Insurance expires ${fmtDate(f.insuranceExpiry)}`} style={{ background: expiryBg(insS), color: expiryColor(insS), borderColor: expiryColor(insS) }}>
                          INS · {expiryLabel(f.insuranceExpiry)}
                        </span>
                      )}
                      {f.registrationExpiry && (
                        <span className="chip" title={`Registration expires ${fmtDate(f.registrationExpiry)}`} style={{ background: expiryBg(regS), color: expiryColor(regS), borderColor: expiryColor(regS) }}>
                          REG · {expiryLabel(f.registrationExpiry)}
                        </span>
                      )}
                      {f.dotInspectionExpiry && (
                        <span className="chip" title={`DOT inspection expires ${fmtDate(f.dotInspectionExpiry)}`} style={{ background: expiryBg(dotS), color: expiryColor(dotS), borderColor: expiryColor(dotS) }}>
                          DOT · {expiryLabel(f.dotInspectionExpiry)}
                        </span>
                      )}
                      {f.nextOilChange && (
                        <span className="chip" title={`Oil change due ${fmtDate(f.nextOilChange)}`} style={{ background: expiryBg(oilS), color: expiryColor(oilS), borderColor: expiryColor(oilS) }}>
                          OIL · {expiryLabel(f.nextOilChange)}
                        </span>
                      )}
                      {f.nextBrakeService && (
                        <span className="chip" title={`Brake service due ${fmtDate(f.nextBrakeService)}`} style={{ background: expiryBg(brakeS), color: expiryColor(brakeS), borderColor: expiryColor(brakeS) }}>
                          BRAKE · {expiryLabel(f.nextBrakeService)}
                        </span>
                      )}
                      {f.nextSmogCheck && (
                        <span className="chip" title={`Smog check due ${fmtDate(f.nextSmogCheck)}`} style={{ background: expiryBg(smogS), color: expiryColor(smogS), borderColor: expiryColor(smogS) }}>
                          SMOG · {expiryLabel(f.nextSmogCheck)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Mileage + service */}
                  {(f.mileage || f.lastServiceDate || f.nextServiceDueMileage) && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "var(--concrete)", lineHeight: 1.5 }}>
                      {f.mileage && <div>Mileage: <strong style={{ color: "var(--steel)" }}>{Number(f.mileage).toLocaleString()}</strong></div>}
                      {f.lastServiceDate && <div>Last service: {fmtDate(f.lastServiceDate)}{f.lastServiceMileage ? ` @ ${Number(f.lastServiceMileage).toLocaleString()}` : ""}</div>}
                      {f.nextServiceDueMileage && f.mileage && (
                        <div style={{ color: Number(f.mileage) >= Number(f.nextServiceDueMileage) ? "var(--safety)" : "var(--concrete)" }}>
                          Next service due at {Number(f.nextServiceDueMileage).toLocaleString()}
                          {Number(f.mileage) >= Number(f.nextServiceDueMileage) && " · OVERDUE"}
                        </div>
                      )}
                    </div>
                  )}

                  {f.notes && <div style={{ marginTop: 8, fontSize: 12, color: "var(--concrete)" }}>{f.notes}</div>}

                  {/* Driver picker */}
                  {driverContacts.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <select className="fbt-select" style={{ padding: "6px 10px", fontSize: 12 }} value={f.driverId || ""} onChange={(e) => updateDriver(f.id, e.target.value)}>
                        <option value="">— Unassigned —</option>
                        {driverContacts.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <select className="fbt-select" style={{ padding: "6px 10px", fontSize: 12, flex: "1 1 auto" }} value={f.status} onChange={(e) => update(f.id, "status", e.target.value)}>
                      <option value="available">Available</option>
                      <option value="dispatched">Dispatched</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="offline">Offline</option>
                    </select>
                    <button className="btn-ghost" onClick={() => setOpenUnitId(f.id)} style={{ fontSize: 12 }}>
                      <Wrench size={12} /> Service ({(f.maintenanceLog || []).length})
                    </button>
                    <button className="btn-danger" onClick={() => remove(f.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Maintenance log + edit modal */}
      {openUnitId && (() => {
        const unit = fleet.find((f) => f.id === openUnitId);
        if (!unit) return null;
        return (
          <UnitDetailModal
            unit={unit}
            onClose={() => setOpenUnitId(null)}
            onUpdate={(field, value) => update(unit.id, field, value)}
            onAddMaintenance={(entry) => addMaintenance(unit.id, entry)}
            onRemoveMaintenance={(entryId) => removeMaintenance(unit.id, entryId)}
          />
        );
      })()}
    </div>
  );
};

const UnitDetailModal = ({ unit, onClose, onUpdate, onAddMaintenance, onRemoveMaintenance }) => {
  const [entry, setEntry] = useState({ date: new Date().toISOString().slice(0, 10), type: "", mileage: "", cost: "", notes: "" });
  const submit = () => {
    if (!entry.type) return;
    onAddMaintenance(entry);
    setEntry({ date: new Date().toISOString().slice(0, 10), type: "", mileage: "", cost: "", notes: "" });
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-display" style={{ fontSize: 18, margin: 0 }}>{unit.unit} · service history</div>
            <div style={{ fontSize: 12, color: "var(--concrete)", marginTop: 2 }}>{unit.type}{unit.licensePlate ? ` · ${unit.licensePlate}` : ""}</div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "6px 8px" }}><X size={16} /></button>
        </div>
        <div style={{ padding: 22, display: "grid", gap: 16 }}>
          {/* Mileage + service config */}
          <div className="fbt-card" style={{ padding: 14 }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 8 }}>▸ Service planning</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <div><label className="fbt-label">Current mileage</label><input className="fbt-input" type="number" value={unit.mileage || ""} onChange={(e) => onUpdate("mileage", e.target.value)} /></div>
              <div><label className="fbt-label">Last service date</label><input className="fbt-input" type="date" value={unit.lastServiceDate || ""} onChange={(e) => onUpdate("lastServiceDate", e.target.value)} /></div>
              <div><label className="fbt-label">Last service mileage</label><input className="fbt-input" type="number" value={unit.lastServiceMileage || ""} onChange={(e) => onUpdate("lastServiceMileage", e.target.value)} /></div>
              <div><label className="fbt-label">Next service due (mi)</label><input className="fbt-input" type="number" value={unit.nextServiceDueMileage || ""} onChange={(e) => onUpdate("nextServiceDueMileage", e.target.value)} /></div>
            </div>
          </div>

          {/* New entry */}
          <div className="fbt-card" style={{ padding: 14 }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 8 }}>▸ Log a service event</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <div><label className="fbt-label">Date</label><input className="fbt-input" type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} /></div>
              <div><label className="fbt-label">Type</label><input className="fbt-input" value={entry.type} onChange={(e) => setEntry({ ...entry, type: e.target.value })} placeholder="Oil change · brakes · tires …" /></div>
              <div><label className="fbt-label">Mileage</label><input className="fbt-input" type="number" value={entry.mileage} onChange={(e) => setEntry({ ...entry, mileage: e.target.value })} /></div>
              <div><label className="fbt-label">Cost $</label><input className="fbt-input" type="number" step="0.01" value={entry.cost} onChange={(e) => setEntry({ ...entry, cost: e.target.value })} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label className="fbt-label">Notes</label><input className="fbt-input" value={entry.notes} onChange={(e) => setEntry({ ...entry, notes: e.target.value })} placeholder="Shop · invoice # · anything else" /></div>
            </div>
            <button className="btn-primary" onClick={submit} disabled={!entry.type} style={{ marginTop: 12 }}><Plus size={14} /> Add entry</button>
          </div>

          {/* History */}
          <div className="fbt-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>▸ History · {(unit.maintenanceLog || []).length} entries</div>
            </div>
            {(!unit.maintenanceLog || unit.maintenanceLog.length === 0) ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--concrete)", fontSize: 12 }}>No maintenance logged yet.</div>
            ) : (
              <div>
                {unit.maintenanceLog.map((e) => (
                  <div key={e.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{e.type} <span style={{ color: "var(--concrete)", fontWeight: 400 }}>· {fmtDate(e.date)}</span></div>
                      <div style={{ fontSize: 12, color: "var(--concrete)", marginTop: 2 }}>
                        {e.mileage ? `${Number(e.mileage).toLocaleString()} mi` : ""}{e.cost ? ` · $${Number(e.cost).toFixed(2)}` : ""}
                      </div>
                      {e.notes && <div style={{ fontSize: 12, color: "var(--concrete)", marginTop: 2 }}>{e.notes}</div>}
                    </div>
                    <button className="btn-danger" onClick={() => onRemoveMaintenance(e.id)} style={{ padding: "4px 8px" }}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
