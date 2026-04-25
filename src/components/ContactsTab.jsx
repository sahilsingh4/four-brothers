import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, FileDown, Mail, MessageSquare, Phone, Search, Star, UserPlus, Users, X } from "lucide-react";
import { buildSMSLink, buildEmailLink } from "../utils";
import { ContactDetailModal } from "./ContactDetailModal";

export const ContactModal = ({ contact, contacts = [], onSave, onClose, onToast }) => {
  const [draft, setDraft] = useState(contact || {
    type: "sub", companyName: "", contactName: "", phone: "", phone2: "",
    email: "", address: "", typicalTrucks: "", rateNotes: "",
    usdot: "", insurance: "", notes: "", favorite: false, drivesForId: null,
    brokerageApplies: false, brokeragePercent: 8,
    defaultPayRate: "", defaultPayMethod: "hour", defaultTruckNumber: "",
    taxId: "", taxIdType: "", legalName: "", is1099Eligible: false,
  });
  const [showTaxId, setShowTaxId] = useState(false); // masked by default

  const save = async () => {
    if (!draft.companyName && !draft.contactName) {
      alert("Add at least a company name or contact name.");
      return;
    }
    await onSave({
      ...draft,
      id: draft.id || ("temp-" + Date.now()),
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onToast(contact ? "CONTACT UPDATED" : "CONTACT ADDED");
    onClose();
  };

  const typeLabel = { sub: "Sub-Contractor", driver: "Driver", customer: "Customer", broker: "Broker" }[draft.type] || "Contact";
  const companyLabel = draft.type === "driver" ? "Full Name" : "Company Name";
  const companyPlaceholder = {
    sub: "ACME Trucking Inc.",
    driver: "John Smith",
    customer: "Mountain Cascade, Inc.",
    broker: "Regional Freight Brokers LLC",
  }[draft.type];

  const subContacts = contacts.filter((c) => c.type === "sub");

  // v18 Batch 2: Escape closes modal
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // onClose is a stable callback from the parent; not including it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={18} /> {contact ? `EDIT ${typeLabel.toUpperCase()}` : `NEW ${typeLabel.toUpperCase()}`}
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "end" }}>
            <div>
              <label className="fbt-label">Type</label>
              <select className="fbt-select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                <option value="sub">Sub-Contractor</option>
                <option value="driver">Driver</option>
                <option value="customer">Customer</option>
                <option value="broker">Broker</option>
              </select>
            </div>
            <div>
              <label className="fbt-label">{companyLabel}</label>
              <input className="fbt-input" value={draft.companyName} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} placeholder={companyPlaceholder} />
            </div>
            <button
              onClick={() => setDraft({ ...draft, favorite: !draft.favorite })}
              className="btn-ghost"
              style={{ padding: "10px 14px", background: draft.favorite ? "var(--hazard)" : "transparent" }}
              title={draft.favorite ? "Preferred contact" : "Mark as preferred"}
            >
              <Star size={16} fill={draft.favorite ? "var(--steel)" : "none"} />
            </button>
          </div>

          {(draft.type === "sub" || draft.type === "customer") && (
            <div>
              <label className="fbt-label">Primary Contact Person</label>
              <input className="fbt-input" value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} placeholder="Who to ask for" />
            </div>
          )}

          {draft.type === "driver" && subContacts.length > 0 && (
            <div>
              <label className="fbt-label">Drives For (Sub-Contractor, optional)</label>
              <select
                className="fbt-select"
                value={draft.drivesForId || ""}
                onChange={(e) => setDraft({ ...draft, drivesForId: e.target.value || null })}
              >
                <option value="">— Independent / Not linked —</option>
                {subContacts.map((s) => (
                  <option key={s.id} value={s.id}>{s.companyName || s.contactName}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Phone (Primary)</label>
              <input className="fbt-input" type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className="fbt-label">Phone (Alt)</label>
              <input className="fbt-input" type="tel" value={draft.phone2} onChange={(e) => setDraft({ ...draft, phone2: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="fbt-label">Email</label>
            <input className="fbt-input" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          </div>

          <div>
            <label className="fbt-label">{draft.type === "customer" ? "Billing Address" : "Address / Office Location"}</label>
            <input className="fbt-input" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Street, City, State ZIP" />
          </div>

          {draft.type === "sub" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
              <div>
                <label className="fbt-label">Typical Truck Count</label>
                <input className="fbt-input" type="number" min="0" value={draft.typicalTrucks} onChange={(e) => setDraft({ ...draft, typicalTrucks: e.target.value })} placeholder="e.g. 3" />
              </div>
              <div>
                <label className="fbt-label">Rate / Pricing Notes</label>
                <input className="fbt-input" value={draft.rateNotes} onChange={(e) => setDraft({ ...draft, rateNotes: e.target.value })} placeholder="$135/hr, 8-hr min" />
              </div>
            </div>
          )}

          {/* Driver defaults — auto-fill when assigned to orders */}
          {draft.type === "driver" && (
            <div style={{ padding: 12, background: "#F0FDF4", border: "2px solid var(--good)" }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", fontWeight: 700, marginBottom: 8 }}>
                ▸ DRIVER DEFAULTS · AUTO-FILL WHEN ASSIGNED TO ORDER
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                <div>
                  <label className="fbt-label">Default Pay Rate $</label>
                  <input
                    className="fbt-input"
                    type="number"
                    step="0.01"
                    value={draft.defaultPayRate ?? ""}
                    onChange={(e) => setDraft({ ...draft, defaultPayRate: e.target.value })}
                    placeholder="e.g. 35.00"
                  />
                </div>
                <div>
                  <label className="fbt-label">Pay Method</label>
                  <select
                    className="fbt-select"
                    value={draft.defaultPayMethod || "hour"}
                    onChange={(e) => setDraft({ ...draft, defaultPayMethod: e.target.value })}
                  >
                    <option value="hour">Per Hour</option>
                    <option value="ton">Per Ton</option>
                    <option value="load">Per Load</option>
                  </select>
                </div>
                <div>
                  <label className="fbt-label">Default Truck #</label>
                  <input
                    className="fbt-input"
                    value={draft.defaultTruckNumber || ""}
                    onChange={(e) => setDraft({ ...draft, defaultTruckNumber: e.target.value })}
                    placeholder="e.g. 12"
                  />
                </div>
              </div>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8, lineHeight: 1.5 }}>
                ▸ THESE AUTO-FILL WHEN YOU ADD THIS DRIVER TO AN ORDER. EDITABLE PER-ORDER IF NEEDED.
              </div>
              {/* Compliance expiration tracking — surfaced on the home dashboard
                  when within 30 days of expiring. Optional. */}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--concrete)" }}>
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", fontWeight: 700, marginBottom: 6 }}>
                  ▸ COMPLIANCE EXPIRATIONS (optional)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                  <div>
                    <label className="fbt-label">CDL expiration</label>
                    <input
                      className="fbt-input"
                      type="date"
                      value={draft.cdlExpiry || ""}
                      onChange={(e) => setDraft({ ...draft, cdlExpiry: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="fbt-label">Medical card expiration</label>
                    <input
                      className="fbt-input"
                      type="date"
                      value={draft.medicalCardExpiry || ""}
                      onChange={(e) => setDraft({ ...draft, medicalCardExpiry: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Brokerage section — ONLY for subs (drivers are never brokered) */}
          {draft.type === "sub" && (
            <div style={{ padding: 12, background: draft.brokerageApplies ? "#FEF3C7" : "#F5F5F4", border: "2px solid " + (draft.brokerageApplies ? "var(--hazard)" : "var(--concrete)") }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!draft.brokerageApplies}
                  onChange={(e) => setDraft({ ...draft, brokerageApplies: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span className="fbt-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                  DEDUCT BROKERAGE WHEN PAYING
                </span>
              </label>
              {draft.brokerageApplies && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
                  <label className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>BROKERAGE %:</label>
                  <input
                    className="fbt-input"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={draft.brokeragePercent ?? 8}
                    onChange={(e) => setDraft({ ...draft, brokeragePercent: e.target.value })}
                    style={{ width: 90, padding: "6px 10px" }}
                  />
                  <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
                    (DEFAULT 8%)
                  </span>
                </div>
              )}
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8, lineHeight: 1.5 }}>
                ▸ WHEN WE PAY THIS SUB, WE'LL SUBTRACT THIS % FROM THEIR GROSS PAY (NOT FROM REIMBURSEMENTS). LEAVE OFF IF BROKERAGE ISN'T INVOLVED.
              </div>
            </div>
          )}

          {/* 1099 / Tax section — for subs and drivers */}
          {(draft.type === "sub" || draft.type === "driver") && (
            <div style={{ padding: 12, background: draft.is1099Eligible ? "#F0FDF4" : "#F5F5F4", border: "2px solid " + (draft.is1099Eligible ? "var(--good)" : "var(--concrete)") }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!draft.is1099Eligible}
                  onChange={(e) => setDraft({ ...draft, is1099Eligible: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span className="fbt-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                  1099 ELIGIBLE — ISSUE 1099-NEC AT YEAR-END
                </span>
              </label>
              {draft.is1099Eligible && (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <div>
                    <label className="fbt-label">Legal Name (on 1099)</label>
                    <input
                      className="fbt-input"
                      value={draft.legalName || ""}
                      onChange={(e) => setDraft({ ...draft, legalName: e.target.value })}
                      placeholder={draft.companyName || draft.contactName || "Full legal name"}
                    />
                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>
                      ▸ LEAVE BLANK TO USE CONTACT NAME · PUT DBA OR REGISTERED NAME IF DIFFERENT
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px", gap: 10, alignItems: "end" }}>
                    <div>
                      <label className="fbt-label">Tax ID Type</label>
                      <select
                        className="fbt-select"
                        value={draft.taxIdType || ""}
                        onChange={(e) => setDraft({ ...draft, taxIdType: e.target.value })}
                      >
                        <option value="">—</option>
                        <option value="ein">EIN</option>
                        <option value="ssn">SSN</option>
                      </select>
                    </div>
                    <div>
                      <label className="fbt-label">
                        Tax ID {draft.taxIdType === "ssn" ? "(SSN)" : draft.taxIdType === "ein" ? "(EIN)" : ""}
                      </label>
                      <input
                        className="fbt-input"
                        type={showTaxId ? "text" : "password"}
                        value={draft.taxId || ""}
                        onChange={(e) => setDraft({ ...draft, taxId: e.target.value })}
                        placeholder={draft.taxIdType === "ein" ? "XX-XXXXXXX" : draft.taxIdType === "ssn" ? "XXX-XX-XXXX" : "Select type first"}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTaxId(!showTaxId)}
                      className="btn-ghost"
                      style={{ padding: "8px 10px", fontSize: 10 }}
                    >
                      {showTaxId ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", padding: 8, background: "#FEF3C7", border: "1px solid var(--hazard)", lineHeight: 1.5 }}>
                    ⚠ SENSITIVE — STORED IN YOUR DATABASE, MASKED ON SCREEN BY DEFAULT · COLLECT VIA W-9 FROM THE CONTRACTOR · DO NOT SHARE THIS CONTACT EXPORT PUBLICLY
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Broker-specific fields */}
          {draft.type === "broker" && (
            <div style={{ padding: 12, background: "#F0FDF4", border: "2px solid var(--good)" }}>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", marginBottom: 8, fontWeight: 700 }}>
                ▸ BROKER — PAYS US, NOT WE PAY THEM
              </div>
              <div style={{ fontSize: 12, color: "var(--steel)", lineHeight: 1.5 }}>
                Brokers bring you work and pay you directly. Track their contact info here. Future payroll module will show the brokerage income per broker.
              </div>
            </div>
          )}

          {(draft.type === "sub" || draft.type === "driver") && (
            <>
              <div>
                <label className="fbt-label">USDOT / MC # / CA MCP</label>
                <input className="fbt-input" value={draft.usdot} onChange={(e) => setDraft({ ...draft, usdot: e.target.value })} placeholder="USDOT 1234567 · MC 000000" />
              </div>
              <div>
                <label className="fbt-label">Insurance Info</label>
                <input className="fbt-input" value={draft.insurance} onChange={(e) => setDraft({ ...draft, insurance: e.target.value })} placeholder="Carrier · Policy # · Expires" />
              </div>
            </>
          )}

          <div>
            <label className="fbt-label">Internal Notes</label>
            <textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Reliability, strengths, quirks, preferences..." />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <button onClick={save} className="btn-primary"><CheckCircle2 size={16} /> SAVE</button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ========== CONTACTS TAB ==========
// generateCustomerStatementPDF is injected as a prop so this module doesn't
// have to carry the ~300-line PDF generator. App.jsx still owns it;
// extracting the PDF helper is a future refactor.
export const ContactsTab = ({ contacts, setContacts, dispatches, freightBills, invoices = [], company, onToast, generateCustomerStatementPDF }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const save = async (contact) => {
    const exists = contacts.find((c) => c.id === contact.id);
    const next = exists ? contacts.map((c) => c.id === contact.id ? contact : c) : [contact, ...contacts];
    setContacts(next);

  };

  const remove = async (id) => {
    const c = contacts.find((x) => x.id === id);
    if (!c) return;
    if (!confirm(`Delete contact "${c.companyName || c.contactName}"? This won't affect past dispatches.`)) return;
    const next = contacts.filter((x) => x.id !== id);
    setContacts(next);

    onToast("CONTACT DELETED");
    setViewing(null);
  };

  const toggleFavorite = async (id) => {
    const next = contacts.map((c) => c.id === id ? { ...c, favorite: !c.favorite } : c);
    setContacts(next);

  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return contacts
      .filter((c) => typeFilter === "all" || c.type === typeFilter)
      .filter((c) => {
        if (!s) return true;
        return `${c.companyName || ""} ${c.contactName || ""} ${c.phone || ""} ${c.email || ""} ${c.notes || ""}`.toLowerCase().includes(s);
      })
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return (a.companyName || a.contactName || "").localeCompare(b.companyName || b.contactName || "");
      });
  }, [contacts, search, typeFilter]);

  const subsCount = contacts.filter((c) => c.type === "sub").length;
  const driversCount = contacts.filter((c) => c.type === "driver").length;
  const customersCount = contacts.filter((c) => c.type === "customer").length;
  const brokersCount = contacts.filter((c) => c.type === "broker").length;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {showModal && (
        <ContactModal
          contact={editing}
          contacts={contacts}
          onSave={save}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onToast={onToast}
        />
      )}
      {viewing && !showModal && (
        <ContactDetailModal
          contact={viewing}
          dispatches={dispatches}
          freightBills={freightBills}
          company={company}
          onEdit={() => { setEditing(viewing); setShowModal(true); }}
          onDelete={() => remove(viewing.id)}
          onClose={() => setViewing(null)}
          onToast={onToast}
          onSaveContact={async (updated) => {
            await save(updated);
            setViewing(updated);  // refresh the modal with updated data
          }}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{contacts.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{customersCount}</div>
          <div className="stat-label">Customers</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{subsCount}</div>
          <div className="stat-label">Sub-Contractors</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{driversCount}</div>
          <div className="stat-label">Drivers</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{brokersCount}</div>
          <div className="stat-label">Brokers</div>
        </div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--hazard)" }}>
          <div className="stat-num">{contacts.filter((c) => c.favorite).length}</div>
          <div className="stat-label">Preferred ★</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search name, phone, notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="fbt-select" style={{ width: "auto" }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="customer">Customers Only</option>
          <option value="sub">Subs Only</option>
          <option value="driver">Drivers Only</option>
          <option value="broker">Brokers Only</option>
        </select>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
          <UserPlus size={16} /> NEW CONTACT
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <Users size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {search || typeFilter !== "all" ? "NO MATCHES" : "NO CONTACTS YET — ADD YOUR FIRST SUB OR DRIVER"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map((c) => {
            const jobCount = dispatches.filter((d) => d.subContractorId === c.id || (d.subContractor && c.companyName && d.subContractor.toLowerCase() === c.companyName.toLowerCase())).length;
            return (
              <div key={c.id} className="fbt-card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => setViewing(c)}>
                <div className="hazard-stripe-thin" style={{ height: 6 }} />
                <div style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span className="chip" style={{
                          background: c.type === "sub" ? "var(--hazard)"
                            : c.type === "customer" ? "var(--good)"
                            : c.type === "broker" ? "var(--steel)"
                            : "#FFF",
                          color: (c.type === "customer" || c.type === "broker") ? "#FFF" : undefined,
                          fontSize: 9, padding: "2px 8px"
                        }}>
                          {c.type === "sub" ? "SUB"
                            : c.type === "customer" ? "CUSTOMER"
                            : c.type === "broker" ? "BROKER"
                            : "DRIVER"}
                        </span>
                        {jobCount > 0 && <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>{jobCount} job{jobCount !== 1 ? "s" : ""}</span>}
                      </div>
                      <div className="fbt-display" style={{ fontSize: 18, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.companyName || c.contactName}
                      </div>
                      {c.contactName && c.companyName && (
                        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>c/o {c.contactName}</div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(c.id); }}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: c.favorite ? "var(--hazard-deep)" : "var(--concrete)", padding: 4 }}
                      title="Toggle preferred"
                    >
                      <Star size={18} fill={c.favorite ? "var(--hazard-deep)" : "none"} />
                    </button>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, color: "var(--concrete)", lineHeight: 1.6 }}>
                    {c.phone && <div>▸ {c.phone}</div>}
                    {c.email && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>▸ {c.email}</div>}
                    {c.typicalTrucks && <div>▸ {c.typicalTrucks} typical trucks</div>}
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                    {c.phone && (
                      <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                        <Phone size={11} style={{ marginRight: 4 }} /> CALL
                      </a>
                    )}
                    {c.phone && (
                      <a href={buildSMSLink(c.phone, `Hi ${c.contactName || ""}, this is ${company?.name || "4 Brothers Trucking"}.`)} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                        <MessageSquare size={11} style={{ marginRight: 4 }} /> TEXT
                      </a>
                    )}
                    {c.email && (
                      <a href={buildEmailLink(c.email, "4 Brothers Trucking", "")} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 10, textDecoration: "none", flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}>
                        <Mail size={11} style={{ marginRight: 4 }} /> EMAIL
                      </a>
                    )}
                    {/* v18: Statement button for customers only — defaults to all-time, open-only */}
                    {c.type === "customer" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            generateCustomerStatementPDF({
                              customer: c,
                              invoices,
                              company,
                              fromDate: "",
                              toDate: "",
                              openOnly: true,
                            });
                            onToast("✓ STATEMENT OPENED");
                          } catch (err) {
                            console.error("Statement failed:", err);
                            onToast("⚠ POPUP BLOCKED — ALLOW POPUPS");
                          }
                        }}
                        className="btn-primary"
                        style={{ padding: "6px 10px", fontSize: 10, flex: 1, justifyContent: "center", display: "flex", alignItems: "center", background: "var(--good)", color: "#FFF" }}
                        title="Generate open-balance statement for this customer"
                      >
                        <FileDown size={11} style={{ marginRight: 4 }} /> STATEMENT
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
