import { useEffect, useState, useMemo } from "react";
import { AlertTriangle, Copy, Download, FileText, Link2, Lock, Plus, RefreshCw, Trash2, Truck, Upload, Wrench, X } from "lucide-react";
import { storageSet, fmtDate } from "../utils";
import {
  COMPLIANCE_DOC_TYPES,
  fetchComplianceDocs,
  insertComplianceDoc,
  updateComplianceDoc,
  deleteComplianceDoc,
  uploadComplianceFile,
  getComplianceFileUrl,
  deleteComplianceFile,
  getComplianceStatus,
  fetchTruckPortal,
  upsertTruckPortal,
  setTruckPortalEnabled,
} from "../db";

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

export const FleetTab = ({ fleet, setFleet, truckTypes = [], setTruckTypes, contacts = [], freightBills = [], onJumpToContact, onToast }) => {
  const [draft, setDraft] = useState(newDraft());
  const [openUnitId, setOpenUnitId] = useState(null); // for maintenance log modal
  const driverContacts = contacts.filter((c) => c.type === "driver");

  // Recent inspection-defect index keyed by truck number. Scans freight bills
  // from the last 30 days for any pre-trip / post-trip with at least one
  // defect item; surfaces them on the fleet card so the owner sees defects
  // that were reported but might've slipped past the daily review.
  const defectsByTruck = useMemo(() => {
    // Date.now() is technically impure for React's purity model, but the
    // per-render staleness is fine here — a 30-day cutoff doesn't need
    // millisecond accuracy and the freight bills array dependency triggers
    // the recompute when new FBs land.
    // eslint-disable-next-line react-hooks/purity
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const map = new Map(); // truckNumber → [{ when, defects, signedBy, kind }]
    (freightBills || []).forEach((fb) => {
      const ts = fb.submittedAt ? new Date(fb.submittedAt).getTime() : 0;
      if (ts < cutoff) return;
      const truck = (fb.truckNumber || "").trim();
      if (!truck) return;
      [
        ["pretrip", fb.pretripInspection],
        ["posttrip", fb.posttripInspection],
      ].forEach(([kind, insp]) => {
        if (!insp || !Array.isArray(insp.items)) return;
        const defects = insp.items.filter((i) => i.result === "defect");
        if (defects.length === 0) return;
        const arr = map.get(truck) || [];
        arr.push({ when: insp.completedAt || fb.submittedAt, defects, signedBy: insp.signedBy, kind });
        map.set(truck, arr);
      });
    });
    return map;
  }, [freightBills]);

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

      {/* Truck-type catalog — admin-defined types (Super 10, End Dump,
          Transfer, etc.) with default rate + minimum hours. Used to pre-fill
          assignment payRate when admin picks a type on an order. */}
      <TruckTypesSection
        truckTypes={truckTypes}
        setTruckTypes={setTruckTypes}
        onToast={onToast}
      />

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
                    Driver ▸ {f.driverId && onJumpToContact ? (
                      <button
                        type="button"
                        onClick={() => onJumpToContact(f.driverId)}
                        title="Open this driver in Contacts"
                        style={{ background: "transparent", border: "none", padding: 0, color: "var(--hazard-deep)", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
                      >
                        {f.driver}
                      </button>
                    ) : (
                      f.driver || "unassigned"
                    )}
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
                      {(() => {
                        // Recent inspection defects (last 30 days) on this truck.
                        const events = defectsByTruck.get((f.unit || "").trim()) || [];
                        const totalDefects = events.reduce((s, e) => s + e.defects.length, 0);
                        if (totalDefects === 0) return null;
                        const labels = [...new Set(events.flatMap((e) => e.defects.map((d) => d.label || d.id)))].slice(0, 3).join(", ");
                        const more = totalDefects > 3 ? ` (+${totalDefects - 3})` : "";
                        return (
                          <span className="chip" title={`Recent inspection defects (last 30d): ${labels}${more}`} style={{ background: "var(--safety)", color: "#FFF", borderColor: "var(--safety)" }}>
                            ⚠ {totalDefects} DEF
                          </span>
                        );
                      })()}
                    </div>
                  )}

                  {/* Recent defect detail — collapsed list when there are any. */}
                  {(() => {
                    const events = defectsByTruck.get((f.unit || "").trim()) || [];
                    if (events.length === 0) return null;
                    const flat = events.flatMap((e) => e.defects.map((d) => ({ ...d, when: e.when, signedBy: e.signedBy, kind: e.kind })));
                    return (
                      <div style={{ marginTop: 10, padding: 8, background: "#FEF2F2", border: "1px solid var(--safety)", borderRadius: 4 }}>
                        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--safety)", fontWeight: 700, marginBottom: 4 }}>
                          ▸ INSPECTION DEFECTS (LAST 30 DAYS)
                        </div>
                        <div style={{ display: "grid", gap: 3 }}>
                          {flat.slice(0, 5).map((d, idx) => (
                            <div key={idx} style={{ fontSize: 11, color: "var(--steel)" }}>
                              • <strong>{d.label || d.id}</strong>
                              {d.note ? ` — ${d.note}` : ""}
                              <span className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginLeft: 6 }}>
                                {d.kind === "posttrip" ? "post-trip" : "pre-trip"} · {new Date(d.when).toLocaleDateString()}{d.signedBy ? ` · ${d.signedBy}` : ""}
                              </span>
                            </div>
                          ))}
                          {flat.length > 5 && (
                            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>+ {flat.length - 5} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

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
          <button onClick={onClose} className="btn-ghost" style={{ padding: "10px 12px" }} title="Close"><X size={20} /></button>
        </div>
        <div style={{ padding: 22, display: "grid", gap: 16 }}>
          <TruckDocumentsSection truckUnit={unit.unit} />
          <RoadsidePortalSection truckUnit={unit.unit} />

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

// Per-truck documents — registration, insurance, loan, plate sticker, IFTA,
// smog, DOT/BIT inspection. Stored in Supabase Storage (compliance-docs
// bucket) + compliance_documents row keyed by truck_unit. The storage layer
// is the same one driver compliance docs *will* use; using it here too sets
// up the eventual public roadside portal cleanly.
const TRUCK_DOC_KINDS = COMPLIANCE_DOC_TYPES.filter((t) => t.appliesTo === "truck");

const docTypeLabel = (key) => {
  const found = COMPLIANCE_DOC_TYPES.find((t) => t.key === key);
  return found ? found.label : key;
};

const expirySeverityChipBg = (sev) => ({
  4: "var(--safety)",       // expired
  3: "var(--safety)",       // critical (≤30d)
  2: "var(--warn-fg)",      // warning (≤60d)
  1: "var(--concrete)",     // upcoming (≤90d)
  0: "var(--good)",         // current
}[sev] || "var(--concrete)");

const TruckDocumentsSection = ({ truckUnit }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingType, setPendingType] = useState(TRUCK_DOC_KINDS[0]?.key || "other");
  const [customLabel, setCustomLabel] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [issuedDate, setIssuedDate] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const all = await fetchComplianceDocs();
      // Filter to this truck. truck_unit is matched as a string — fleet
      // unit numbers are typically short (e.g. "103") and stored as text.
      setDocs(all.filter((d) => d.truckUnit === truckUnit));
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount + whenever the truck changes. The set-state inside an
  // effect is unavoidable here (fetch is async) — same pattern as
  // ReviewTab's pendingFB consume. The fetch is guarded by truckUnit so
  // it doesn't fire for unsaved/blank truck rows.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (truckUnit) refresh();
  }, [truckUnit]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const upload = async (file) => {
    if (!truckUnit) { alert("Set a unit number on this truck first."); return; }
    if (!file) return;
    setBusy(true);
    try {
      const meta = await uploadComplianceFile(file);
      if (!meta) { alert("Upload failed — try again."); return; }
      const row = await insertComplianceDoc({
        truckUnit,
        docType: pendingType,
        customTypeLabel: pendingType === "other" ? (customLabel || null) : null,
        issuedDate: issuedDate || null,
        expiryDate: expiryDate || null,
        filePath: meta.filePath,
        fileName: meta.fileName,
        fileSize: meta.fileSize,
        fileMime: meta.fileMime,
      });
      setDocs((prev) => [...prev, row]);
      setExpiryDate("");
      setIssuedDate("");
      setCustomLabel("");
    } catch (e) {
      console.error("upload truck doc:", e);
      alert("Upload failed: " + (e?.message || "unknown error"));
    } finally {
      setBusy(false);
    }
  };

  const view = async (doc) => {
    if (!doc.filePath) return;
    const url = await getComplianceFileUrl(doc.filePath);
    if (!url) { alert("Couldn't generate a view link — try again."); return; }
    window.open(url, "_blank");
  };

  const remove = async (doc) => {
    if (!confirm(`Delete ${doc.fileName || "this doc"}? Soft-deletes the record (recoverable for 30 days) and removes the file from storage.`)) return;
    try {
      // Soft-delete the row first (so list updates immediately even if
      // the storage delete is slow/fails — record is recoverable, file
      // is the easier piece to re-upload).
      await deleteComplianceDoc(doc.id);
      if (doc.filePath) await deleteComplianceFile(doc.filePath);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (e) {
      console.error("delete truck doc:", e);
      alert("Delete failed: " + (e?.message || "unknown error"));
    }
  };

  const updateExpiry = async (doc, newDate) => {
    try {
      await updateComplianceDoc(doc.id, { ...doc, expiryDate: newDate || null });
      setDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, expiryDate: newDate || null } : d));
    } catch (e) {
      console.error("update expiry:", e);
    }
  };

  return (
    <div className="fbt-card" style={{ padding: 14 }}>
      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 8 }}>
        ▸ Documents · {loading ? "loading…" : `${docs.length} on file`}
      </div>

      {/* Upload form */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, padding: 10, background: "var(--surface)", border: "1px solid var(--line)", marginBottom: 10 }}>
        <div>
          <label className="fbt-label">Type</label>
          <select className="fbt-input" value={pendingType} onChange={(e) => setPendingType(e.target.value)}>
            {TRUCK_DOC_KINDS.map((k) => (<option key={k.key} value={k.key}>{k.label}</option>))}
            <option value="other">Other</option>
          </select>
        </div>
        {pendingType === "other" && (
          <div>
            <label className="fbt-label">Label</label>
            <input className="fbt-input" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="e.g. PrePass" />
          </div>
        )}
        <div>
          <label className="fbt-label">Issued</label>
          <input className="fbt-input" type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
        </div>
        <div>
          <label className="fbt-label">Expires</label>
          <input className="fbt-input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>
            <Upload size={14} /> {busy ? "Uploading…" : "Upload file"}
            <input
              type="file"
              accept="application/pdf,image/*"
              style={{ display: "none" }}
              disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }}
            />
          </label>
        </div>
      </div>

      {/* List */}
      {loading ? null : docs.length === 0 ? (
        <div style={{ padding: 14, textAlign: "center", color: "var(--concrete)", fontSize: 12 }}>
          No documents yet. Upload registration, insurance, DOT inspection, etc.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {docs.map((d) => {
            const status = getComplianceStatus(d.expiryDate);
            return (
              <div key={d.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, padding: 10, border: "1px solid var(--line)", background: "#FFF", alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <FileText size={14} style={{ color: "var(--concrete)" }} />
                    <strong style={{ fontSize: 13 }}>
                      {d.docType === "other" ? (d.customTypeLabel || "Other") : docTypeLabel(d.docType)}
                    </strong>
                    {d.expiryDate && (
                      <span className="chip" style={{ background: expirySeverityChipBg(status.severity), color: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                        {status.status === "expired" ? "EXPIRED" : status.status === "no_date" ? "NO DATE" : `${status.daysUntilExpiry}d`}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.fileName || "—"}{d.fileSize ? ` · ${Math.round(d.fileSize / 1024)} KB` : ""}{d.expiryDate ? ` · expires ${fmtDate(d.expiryDate)}` : ""}
                  </div>
                  {/* Inline expiry edit — useful if user uploaded without a date and wants to add it */}
                  <div style={{ marginTop: 4 }}>
                    <input
                      type="date"
                      value={d.expiryDate || ""}
                      onChange={(e) => updateExpiry(d, e.target.value)}
                      style={{ padding: "2px 6px", fontSize: 11, border: "1px solid var(--line)" }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-ghost" onClick={() => view(d)} style={{ padding: "4px 10px", fontSize: 11 }} title="Open in a new tab">
                    <Download size={12} />
                  </button>
                  <button className="btn-danger" onClick={() => remove(d)} style={{ padding: "4px 10px" }} title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Roadside-share link section — admin enables a public /#/truck/<token>
// portal for one truck so a driver can show registration / insurance /
// DOT inspection to a cop without logging in. Requires the
// fleet_portals SQL migration + truck-doc-signed-url Edge Function.
const RoadsidePortalSection = ({ truckUnit }) => {
  const [loading, setLoading] = useState(true);
  const [portal, setPortal] = useState(null);  // { portalToken, portalEnabled } | null
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!truckUnit) return;
    (async () => {
      setLoading(true);
      try { setPortal(await fetchTruckPortal(truckUnit)); }
      finally { setLoading(false); }
    })();
  }, [truckUnit]);

  const generateToken = () => {
    // 24-char URL-safe hex token (longer than the doc spec's 8-min so it's
    // unguessable). Matches the regex cap on /#/truck/<...{8,64}>.
    const arr = new Uint8Array(12);
    (crypto && crypto.getRandomValues) ? crypto.getRandomValues(arr) : arr.forEach((_, i) => arr[i] = Math.floor(Math.random() * 256));
    return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const portalUrl = portal?.portalToken
    ? `${window.location.origin}${window.location.pathname}#/truck/${portal.portalToken}`
    : null;

  const enable = async () => {
    if (!truckUnit) { alert("Set the unit number first."); return; }
    setBusy(true);
    try {
      const token = portal?.portalToken || generateToken();
      await upsertTruckPortal(truckUnit, token);
      setPortal({ portalToken: token, portalEnabled: true });
    } catch (e) {
      console.error("enable truck portal:", e);
      alert("Couldn't enable: " + (e?.message || "unknown"));
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    if (!confirm("Regenerate the link? The CURRENT link will stop working immediately.")) return;
    setBusy(true);
    try {
      const token = generateToken();
      await upsertTruckPortal(truckUnit, token);
      setPortal({ portalToken: token, portalEnabled: true });
    } catch (e) {
      console.error("regenerate truck portal:", e);
      alert("Couldn't regenerate: " + (e?.message || "unknown"));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!confirm("Disable the roadside link? The driver's CURRENT link will stop working.")) return;
    setBusy(true);
    try {
      await setTruckPortalEnabled(truckUnit, false);
      setPortal((p) => p ? { ...p, portalEnabled: false } : null);
    } catch (e) {
      console.error("disable truck portal:", e);
      alert("Couldn't disable: " + (e?.message || "unknown"));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
    } catch {
      window.prompt("Copy this link:", portalUrl);
    }
  };

  return (
    <div className="fbt-card" style={{ padding: 14 }}>
      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 8 }}>
        ▸ Roadside link · for showing a cop registration + insurance
      </div>
      {loading ? (
        <div style={{ fontSize: 12, color: "var(--concrete)" }}>Loading…</div>
      ) : portal && portal.portalEnabled ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--good-soft)", border: "1.5px solid var(--good)", fontSize: 11 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--good)" }}></span>
            <strong>ACTIVE</strong>
            <span style={{ color: "var(--concrete)" }}>· anyone with the link can view this truck's docs</span>
          </div>
          <code style={{ display: "block", padding: "8px 10px", background: "#FFF", border: "1px solid var(--line)", borderRadius: 4, fontSize: 11, wordBreak: "break-all", fontFamily: "Inter, monospace" }}>
            {portalUrl}
          </code>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" className="btn-ghost" onClick={copy} disabled={busy} style={{ fontSize: 11, padding: "6px 10px" }}>
              <Copy size={12} /> COPY LINK
            </button>
            <button type="button" className="btn-ghost" onClick={regenerate} disabled={busy} style={{ fontSize: 11, padding: "6px 10px" }}>
              <RefreshCw size={12} /> NEW LINK
            </button>
            <button type="button" className="btn-danger" onClick={disable} disabled={busy} style={{ fontSize: 11, padding: "6px 10px" }}>
              <Lock size={12} /> DISABLE
            </button>
          </div>
        </div>
      ) : portal && !portal.portalEnabled ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ padding: "8px 10px", background: "var(--surface)", border: "1px solid var(--line)", fontSize: 12, color: "var(--concrete)" }}>
            Roadside link disabled. Re-enable to use the same token, or generate a new one.
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className="btn-primary" onClick={enable} disabled={busy} style={{ fontSize: 11, padding: "6px 12px" }}>
              <Link2 size={12} /> RE-ENABLE
            </button>
            <button type="button" className="btn-ghost" onClick={regenerate} disabled={busy} style={{ fontSize: 11, padding: "6px 10px" }}>
              <RefreshCw size={12} /> NEW LINK
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, color: "var(--concrete)", lineHeight: 1.5 }}>
            Generate a public link the driver can open if a cop pulls them over. The link shows this truck's registration, insurance, DOT inspection — nothing else. Driver CDLs and medical cards are kept private.
          </div>
          <button type="button" className="btn-primary" onClick={enable} disabled={busy || !truckUnit} style={{ fontSize: 12, padding: "8px 14px", justifySelf: "start" }}>
            <Link2 size={14} /> {busy ? "Generating…" : "GENERATE ROADSIDE LINK"}
          </button>
          {!truckUnit && (
            <div style={{ fontSize: 11, color: "var(--concrete)", fontStyle: "italic" }}>
              Set a unit number on this truck first.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Truck-type catalog. Admin types names ("Super 10", "End Dump", "Transfer")
// plus default rates + minimum hours. The list is small (5-15 entries)
// and rarely changes, so it lives in localStorage like fleet itself.
// Truck types feed assignment-row pickers in the order form so admin
// only types each rate once per type, not once per assignment.
const TruckTypesSection = ({ truckTypes, setTruckTypes, onToast }) => {
  const [draft, setDraft] = useState({ name: "", billRate: "", billMinimumHours: "", subPayRate: "", subMinimumHours: "" });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const persist = async (next) => {
    setTruckTypes(next);
    await storageSet("fbt:truckTypes", next);
  };

  const add = async () => {
    if (!draft.name.trim()) { onToast?.("TYPE NAME REQUIRED"); return; }
    const newType = {
      id: Date.now(),
      name: draft.name.trim(),
      billRate: draft.billRate ? Number(draft.billRate) : null,
      billMinimumHours: draft.billMinimumHours ? Number(draft.billMinimumHours) : null,
      subPayRate: draft.subPayRate ? Number(draft.subPayRate) : null,
      subMinimumHours: draft.subMinimumHours ? Number(draft.subMinimumHours) : null,
    };
    await persist([...truckTypes, newType]);
    setDraft({ name: "", billRate: "", billMinimumHours: "", subPayRate: "", subMinimumHours: "" });
    onToast?.("TYPE ADDED");
  };

  const startEdit = (t) => { setEditingId(t.id); setEditDraft({ ...t, billRate: t.billRate ?? "", billMinimumHours: t.billMinimumHours ?? "", subPayRate: t.subPayRate ?? "", subMinimumHours: t.subMinimumHours ?? "" }); };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };
  const saveEdit = async () => {
    if (!editDraft?.name?.trim()) { onToast?.("TYPE NAME REQUIRED"); return; }
    const next = truckTypes.map((t) => t.id === editingId ? {
      ...t,
      name: editDraft.name.trim(),
      billRate: editDraft.billRate !== "" ? Number(editDraft.billRate) : null,
      billMinimumHours: editDraft.billMinimumHours !== "" ? Number(editDraft.billMinimumHours) : null,
      subPayRate: editDraft.subPayRate !== "" ? Number(editDraft.subPayRate) : null,
      subMinimumHours: editDraft.subMinimumHours !== "" ? Number(editDraft.subMinimumHours) : null,
    } : t);
    await persist(next);
    cancelEdit();
    onToast?.("TYPE UPDATED");
  };

  const remove = async (id) => {
    if (!confirm("Delete this truck type? Existing dispatches that reference it stay as-is, but you can't pick this type on new orders.")) return;
    await persist(truckTypes.filter((t) => t.id !== id));
    onToast?.("TYPE DELETED");
  };

  return (
    <div className="fbt-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Truck size={18} style={{ color: "var(--hazard-deep)" }} />
        <h3 className="fbt-display" style={{ margin: 0, fontSize: 16 }}>Truck types</h3>
      </div>
      <p style={{ fontSize: 12, color: "var(--concrete)", margin: "0 0 14px", lineHeight: 1.5 }}>
        Free-form catalog of the types of trucks you dispatch (Super 10, End Dump, Transfer, etc.).
        Each type has default bill + sub-pay rates + minimum hours that pre-fill on order assignments.
      </p>
      {truckTypes.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
          {truckTypes.map((t) => editingId === t.id ? (
            <div key={t.id} style={{ padding: 10, border: "2px solid var(--hazard)", borderRadius: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, alignItems: "end" }}>
              <div><label className="fbt-label">Name</label><input className="fbt-input" value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} /></div>
              <div><label className="fbt-label">Bill $/hr</label><input className="fbt-input" type="number" step="0.01" value={editDraft.billRate} onChange={(e) => setEditDraft({ ...editDraft, billRate: e.target.value })} /></div>
              <div><label className="fbt-label">Bill min hrs</label><input className="fbt-input" type="number" step="0.5" value={editDraft.billMinimumHours} onChange={(e) => setEditDraft({ ...editDraft, billMinimumHours: e.target.value })} /></div>
              <div><label className="fbt-label">Sub pay $/hr</label><input className="fbt-input" type="number" step="0.01" value={editDraft.subPayRate} onChange={(e) => setEditDraft({ ...editDraft, subPayRate: e.target.value })} /></div>
              <div><label className="fbt-label">Sub min hrs</label><input className="fbt-input" type="number" step="0.5" value={editDraft.subMinimumHours} onChange={(e) => setEditDraft({ ...editDraft, subMinimumHours: e.target.value })} /></div>
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" className="btn-primary" onClick={saveEdit} style={{ flex: 1, fontSize: 11, padding: "6px 8px" }}>Save</button>
                <button type="button" className="btn-ghost" onClick={cancelEdit} style={{ fontSize: 11, padding: "6px 8px" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div key={t.id} style={{ padding: 10, border: "1px solid var(--line)", borderRadius: 8, display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
                  {t.billRate != null ? `Bill $${t.billRate}/hr` : "no bill rate"}
                  {t.billMinimumHours ? ` · ${t.billMinimumHours}hr min` : ""}
                  {t.subPayRate != null ? ` · Sub $${t.subPayRate}/hr` : ""}
                  {t.subMinimumHours ? ` · ${t.subMinimumHours}hr sub min` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" className="btn-ghost" onClick={() => startEdit(t)} style={{ fontSize: 11, padding: "5px 10px" }}>Edit</button>
                <button type="button" className="btn-danger" onClick={() => remove(t.id)} style={{ padding: "5px 10px" }}><Trash2 size={11} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: 12, border: "1.5px dashed var(--line)", borderRadius: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, alignItems: "end" }}>
        <div><label className="fbt-label">Name *</label><input className="fbt-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Super 10" /></div>
        <div><label className="fbt-label">Bill $/hr</label><input className="fbt-input" type="number" step="0.01" value={draft.billRate} onChange={(e) => setDraft({ ...draft, billRate: e.target.value })} placeholder="142" /></div>
        <div><label className="fbt-label">Bill min hrs</label><input className="fbt-input" type="number" step="0.5" value={draft.billMinimumHours} onChange={(e) => setDraft({ ...draft, billMinimumHours: e.target.value })} placeholder="4" /></div>
        <div><label className="fbt-label">Sub pay $/hr</label><input className="fbt-input" type="number" step="0.01" value={draft.subPayRate} onChange={(e) => setDraft({ ...draft, subPayRate: e.target.value })} placeholder="120" /></div>
        <div><label className="fbt-label">Sub min hrs</label><input className="fbt-input" type="number" step="0.5" value={draft.subMinimumHours} onChange={(e) => setDraft({ ...draft, subMinimumHours: e.target.value })} placeholder="4" /></div>
        <button type="button" className="btn-primary" onClick={add} style={{ fontSize: 12, padding: "8px 14px" }}><Plus size={14} /> Add type</button>
      </div>
    </div>
  );
};
