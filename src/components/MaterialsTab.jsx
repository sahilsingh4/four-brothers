import { useState, useMemo } from "react";
import {
  BarChart3, CheckCircle2, Mail, MapPin, Mountain, Package, Phone, Plus,
  Search, Trash2, X,
} from "lucide-react";
import { fmt$ } from "../utils";
import { ComparisonModal } from "./ComparisonModal";
import { QuarryDetailModal } from "./QuarryDetailModal";

const newQuarryDraft = () => ({
  id: null,
  name: "", address: "", contactName: "", phone: "", email: "",
  hours: "", deliveryTerms: "", scaleInfo: "", notes: "",
  materials: [], // [{ id, name, pricePerTon, updatedAt, history: [{price, date}] }]
});

const newMaterialRow = (name = "", price = "") => ({
  id: Date.now() + Math.random(),
  name,
  pricePerTon: price,
  updatedAt: new Date().toISOString(),
  history: [],
});

const QuarryModal = ({ quarry, onSave, onClose, onToast }) => {
  const [draft, setDraft] = useState(quarry ? JSON.parse(JSON.stringify(quarry)) : newQuarryDraft());

  const updateMaterial = (idx, field, value) => {
    const next = [...draft.materials];
    next[idx] = { ...next[idx], [field]: value };
    setDraft({ ...draft, materials: next });
  };

  const addMaterial = () => {
    setDraft({ ...draft, materials: [...draft.materials, newMaterialRow()] });
  };

  const removeMaterial = (idx) => {
    setDraft({ ...draft, materials: draft.materials.filter((_, i) => i !== idx) });
  };

  const save = async () => {
    if (!draft.name) { alert("Quarry name is required."); return; }

    // For existing quarry, detect price changes and log history
    const now = new Date().toISOString();
    const changes = [];
    let updatedMaterials = draft.materials.map((m) => ({ ...m }));

    if (quarry) {
      updatedMaterials = updatedMaterials.map((m) => {
        const prev = quarry.materials.find((pm) => pm.id === m.id);
        const newPrice = Number(m.pricePerTon);
        if (prev && Number(prev.pricePerTon) !== newPrice && !isNaN(newPrice)) {
          const entry = { price: Number(prev.pricePerTon), date: prev.updatedAt || now };
          changes.push({ name: m.name, old: Number(prev.pricePerTon), new: newPrice });
          return {
            ...m,
            history: [entry, ...(prev.history || [])].slice(0, 50),
            updatedAt: now,
          };
        }
        if (!prev && !isNaN(newPrice) && newPrice > 0) {
          return { ...m, updatedAt: now, history: [] };
        }
        return m;
      });
    } else {
      updatedMaterials = updatedMaterials.map((m) => ({
        ...m, updatedAt: now, history: m.history || [],
      }));
    }

    const saved = {
      ...draft,
      materials: updatedMaterials.filter((m) => m.name.trim()),
      id: draft.id || ("temp-" + Date.now()),
      createdAt: draft.createdAt || now,
      updatedAt: now,
    };

    await onSave(saved);

    // Toast for price changes
    if (changes.length > 0) {
      const first = changes[0];
      const diff = first.new - first.old;
      const dir = diff > 0 ? "↑" : "↓";
      const verb = diff > 0 ? "INCREASE" : "SAVINGS";
      onToast(`${dir} ${first.name.toUpperCase()}: $${Math.abs(diff).toFixed(2)} ${verb}${changes.length > 1 ? ` (+${changes.length - 1} more)` : ""}`);
    } else {
      onToast(quarry ? "QUARRY UPDATED" : "QUARRY ADDED");
    }
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Mountain size={18} /> {quarry ? "EDIT QUARRY" : "NEW QUARRY / SUPPLIER"}
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div>
            <label className="fbt-label">Quarry / Supplier Name *</label>
            <input className="fbt-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Vulcan Materials — Napa" />
          </div>
          <div>
            <label className="fbt-label">Address / Location</label>
            <input className="fbt-input" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Street, City, State ZIP" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Contact Person</label>
              <input className="fbt-input" value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Phone</label>
              <input className="fbt-input" type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Email</label>
              <input className="fbt-input" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="fbt-label">Hours of Operation / Loading Hours</label>
            <input className="fbt-input" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} placeholder="M-F 6am-5pm · Sat 7am-12pm · Loading until 4:30pm" />
          </div>
          <div>
            <label className="fbt-label">Delivery Terms</label>
            <input className="fbt-input" value={draft.deliveryTerms} onChange={(e) => setDraft({ ...draft, deliveryTerms: e.target.value })} placeholder="FOB yard · min 22 tons · delivery quoted separately" />
          </div>
          <div>
            <label className="fbt-label">Scale Info</label>
            <input className="fbt-input" value={draft.scaleInfo} onChange={(e) => setDraft({ ...draft, scaleInfo: e.target.value })} placeholder="Certified scales · tickets emailed + paper copy" />
          </div>
          <div>
            <label className="fbt-label">Internal Notes</label>
            <textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Quality, reliability, special deals, quirks…" />
          </div>

          {/* Materials section */}
          <div style={{ borderTop: "2px solid var(--steel)", paddingTop: 16, marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Package size={18} style={{ color: "var(--hazard-deep)" }} />
              <div className="fbt-display" style={{ fontSize: 16 }}>MATERIALS & PRICING</div>
            </div>
            {draft.materials.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", border: "2px dashed var(--concrete)", color: "var(--concrete)" }}>
                <Package size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div className="fbt-mono" style={{ fontSize: 11 }}>NO MATERIALS YET — ADD ONE BELOW</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {draft.materials.map((m, idx) => {
                  const originalPrice = quarry?.materials.find((pm) => pm.id === m.id)?.pricePerTon;
                  const hasChanged = originalPrice !== undefined && Number(originalPrice) !== Number(m.pricePerTon) && m.pricePerTon !== "";
                  const diff = hasChanged ? Number(m.pricePerTon) - Number(originalPrice) : 0;
                  return (
                    <div key={m.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10, alignItems: "end", padding: 10, border: "1.5px solid var(--steel)", background: hasChanged ? "#FEF3C7" : "#FFF" }}>
                      <div>
                        <label className="fbt-label" style={{ marginBottom: 4 }}>Material</label>
                        <input className="fbt-input" style={{ padding: "8px 10px", fontSize: 13 }} value={m.name} onChange={(e) => updateMaterial(idx, "name", e.target.value)} placeholder="Basalt 3/4 chip" />
                      </div>
                      <div>
                        <label className="fbt-label" style={{ marginBottom: 4 }}>$ / ton</label>
                        <input className="fbt-input" style={{ padding: "8px 10px", fontSize: 13 }} type="number" step="0.01" value={m.pricePerTon} onChange={(e) => updateMaterial(idx, "pricePerTon", e.target.value)} placeholder="28.50" />
                        {hasChanged && (
                          <div className="fbt-mono" style={{ fontSize: 9, marginTop: 3, color: diff > 0 ? "var(--safety)" : "var(--good)" }}>
                            {diff > 0 ? "↑" : "↓"} ${Math.abs(diff).toFixed(2)} from ${Number(originalPrice).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <button className="btn-danger" onClick={() => removeMaterial(idx)}><Trash2 size={12} /></button>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={addMaterial} className="btn-ghost" style={{ marginTop: 12 }}>
              <Plus size={14} style={{ marginRight: 6 }} /> ADD MATERIAL
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <button onClick={save} className="btn-primary"><CheckCircle2 size={16} /> SAVE QUARRY</button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};
export const MaterialsTab = ({ quarries, setQuarries, dispatches, onToast }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");
  const [showCompare, setShowCompare] = useState(false);

  const save = async (quarry) => {
    const exists = quarries.find((q) => q.id === quarry.id);
    const next = exists ? quarries.map((q) => q.id === quarry.id ? quarry : q) : [quarry, ...quarries];
    setQuarries(next);

  };

  const remove = async (id) => {
    const q = quarries.find((x) => x.id === id);
    if (!q) return;
    if (!confirm(`Delete quarry "${q.name}"? Linked dispatches will lose their quarry reference.`)) return;
    const next = quarries.filter((x) => x.id !== id);
    setQuarries(next);

    onToast("QUARRY DELETED");
    setViewing(null);
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return quarries
      .filter((q) => {
        if (!s) return true;
        const hay = `${q.name} ${q.address || ""} ${q.contactName || ""} ${q.notes || ""} ${(q.materials || []).map((m) => m.name).join(" ")}`.toLowerCase();
        return hay.includes(s);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [quarries, search]);

  const totalMaterials = quarries.reduce((s, q) => s + (q.materials?.length || 0), 0);
  const uniqueMaterials = new Set(quarries.flatMap((q) => q.materials.map((m) => m.name.toLowerCase()))).size;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {showModal && (
        <QuarryModal
          quarry={editing}
          onSave={save}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onToast={onToast}
        />
      )}
      {viewing && !showModal && (
        <QuarryDetailModal
          quarry={viewing}
          dispatches={dispatches}
          onEdit={() => { setEditing(viewing); setShowModal(true); }}
          onDelete={() => remove(viewing.id)}
          onClose={() => setViewing(null)}
        />
      )}
      {showCompare && (
        <ComparisonModal quarries={quarries} materialSearch={materialSearch} onClose={() => setShowCompare(false)} />
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{quarries.length}</div>
          <div className="stat-label">Quarries</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{totalMaterials}</div>
          <div className="stat-label">Material Listings</div>
        </div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--hazard)" }}>
          <div className="stat-num">{uniqueMaterials}</div>
          <div className="stat-label">Unique Materials</div>
        </div>
      </div>

      {/* Material search / comparison */}
      <div className="fbt-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <BarChart3 size={20} style={{ color: "var(--hazard-deep)" }} />
          <h3 className="fbt-display" style={{ fontSize: 18, margin: 0 }}>COMPARE PRICES</h3>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Package size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
            <input
              className="fbt-input"
              style={{ paddingLeft: 38 }}
              placeholder="Find material (e.g. basalt, rock, sand…)"
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && materialSearch.trim() && setShowCompare(true)}
            />
          </div>
          <button onClick={() => setShowCompare(true)} className="btn-primary" disabled={!materialSearch.trim()}>
            <Search size={14} /> FIND CHEAPEST
          </button>
        </div>
        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 10, letterSpacing: "0.05em" }}>
          ▸ SEARCHES ACROSS ALL QUARRIES · RANKED BY CURRENT $/TON
        </div>
      </div>

      {/* Quarry list controls */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search quarries, location, material…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> NEW QUARRY
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <Mountain size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {search ? "NO MATCHES" : "NO QUARRIES YET — ADD YOUR FIRST SUPPLIER"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map((q) => (
            <div key={q.id} className="fbt-card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => setViewing(q)}>
              <div className="hazard-stripe-thin" style={{ height: 6 }} />
              <div style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Mountain size={20} style={{ color: "var(--hazard-deep)" }} />
                  <div className="fbt-display" style={{ fontSize: 18, lineHeight: 1.15, flex: 1 }}>{q.name}</div>
                </div>
                {q.address && <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10, display: "flex", alignItems: "flex-start", gap: 4 }}>
                  <MapPin size={11} style={{ flexShrink: 0, marginTop: 2 }} /> {q.address}
                </div>}

                {q.materials && q.materials.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--concrete)", paddingTop: 10 }}>
                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 6 }}>
                      {q.materials.length} MATERIAL{q.materials.length !== 1 ? "S" : ""}
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      {q.materials.slice(0, 4).map((m) => (
                        <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                          <span style={{ color: "var(--concrete)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 6 }}>{m.name}</span>
                          <strong style={{ color: "var(--hazard-deep)" }}>{fmt$(m.pricePerTon)}</strong>
                        </div>
                      ))}
                      {q.materials.length > 4 && (
                        <div style={{ fontSize: 11, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace" }}>+ {q.materials.length - 4} more</div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 12, display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                  {q.phone && (
                    <a href={`tel:${q.phone.replace(/[^\d+]/g, "")}`} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                      <Phone size={11} style={{ marginRight: 4 }} /> CALL
                    </a>
                  )}
                  {q.email && (
                    <a href={`mailto:${q.email}`} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                      <Mail size={11} style={{ marginRight: 4 }} /> EMAIL
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
