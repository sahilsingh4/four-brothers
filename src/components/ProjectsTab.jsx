import { useState, useMemo } from "react";
import { Briefcase, CheckCircle2, MapPin, Plus, Search, X } from "lucide-react";
import { fmt$ } from "../utils";
import { ProjectDetailModal } from "./ProjectDetailModal";

const ProjectModal = ({ project, contacts, onSave, onClose, onToast }) => {
  const [draft, setDraft] = useState(project || {
    customerId: null, name: "", description: "", contractNumber: "", poNumber: "",
    location: "", status: "active", startDate: "", endDate: "",
    tonnageGoal: "", budget: "", bidAmount: "",
    primeContractor: "", fundingSource: "", certifiedPayroll: false, notes: "",
    defaultRate: "", minimumHours: "",
    subPayRate: "", subMinimumHours: "",
  });

  const customers = contacts.filter((c) => c.type === "customer");

  const save = async () => {
    if (!draft.name) { alert("Project name is required."); return; }
    await onSave({
      ...draft,
      id: draft.id || ("temp-" + Date.now()),
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onToast(project ? "PROJECT UPDATED" : "PROJECT CREATED");
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Briefcase size={18} /> {project ? "EDIT PROJECT" : "NEW PROJECT"}
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div>
            <label className="fbt-label">Customer</label>
            {customers.length > 0 ? (
              <select className="fbt-select" value={draft.customerId || ""} onChange={(e) => setDraft({ ...draft, customerId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— Choose customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.favorite ? "★ " : ""}{c.companyName || c.contactName}</option>
                ))}
              </select>
            ) : (
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", padding: "8px 10px", border: "1px dashed var(--concrete)", background: "#F5F5F4" }}>
                ADD A CUSTOMER IN CONTACTS FIRST
              </div>
            )}
          </div>

          <div>
            <label className="fbt-label">Project Name *</label>
            <input className="fbt-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Salinas Stormwater Phase 2A" />
          </div>

          <div>
            <label className="fbt-label">Description</label>
            <textarea className="fbt-textarea" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Brief summary of the work..." />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Contract #</label>
              <input className="fbt-input" value={draft.contractNumber} onChange={(e) => setDraft({ ...draft, contractNumber: e.target.value })} placeholder="MCI #91684" />
            </div>
            <div>
              <label className="fbt-label">PO # (for invoices)</label>
              <input className="fbt-input" value={draft.poNumber} onChange={(e) => setDraft({ ...draft, poNumber: e.target.value })} placeholder="PO-2026-0045" />
            </div>
            <div>
              <label className="fbt-label">Status</label>
              <select className="fbt-select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="complete">Complete</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="fbt-label">Location</label>
            <input className="fbt-input" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Hitchcock Rd, Salinas, CA" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Start Date</label>
              <input className="fbt-input" type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">End Date</label>
              <input className="fbt-input" type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
            </div>
          </div>

          {/* Project Billing Defaults — inherited by orders under this project */}
          <div style={{ padding: 14, background: "#F0FDF4", border: "2px solid var(--good)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", fontWeight: 700, marginBottom: 10 }}>
              ▸ BILLING DEFAULTS · APPLIED TO ORDERS + INVOICES UNDER THIS PROJECT
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
              <div>
                <label className="fbt-label">Default Rate $/hr</label>
                <input
                  className="fbt-input"
                  type="number"
                  step="0.01"
                  value={draft.defaultRate ?? ""}
                  onChange={(e) => setDraft({ ...draft, defaultRate: e.target.value })}
                  placeholder="142.00"
                />
              </div>
              <div>
                <label className="fbt-label">Minimum Hours</label>
                <input
                  className="fbt-input"
                  type="number"
                  step="0.25"
                  value={draft.minimumHours ?? ""}
                  onChange={(e) => setDraft({ ...draft, minimumHours: e.target.value })}
                  placeholder="8"
                />
              </div>
            </div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8, lineHeight: 1.5 }}>
              ▸ INVOICE USES max(ACTUAL_HOURS, BILL MINIMUM) × RATE
            </div>
          </div>

          {/* Sub Hauler Defaults — applied when adding a sub assignment on
              an order tied to this project, and used as the floor when computing
              sub pay statements. Project values win over the sub contact's
              defaultPayRate (per user's plan). */}
          <div style={{ padding: 14, background: "#EFF6FF", border: "2px solid var(--hazard-deep)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard-deep)", fontWeight: 700, marginBottom: 10 }}>
              ▸ SUB HAULER DEFAULTS · APPLIED TO ORDERS + PAYROLL UNDER THIS PROJECT
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
              <div>
                <label className="fbt-label">Sub Pay $/hr</label>
                <input
                  className="fbt-input"
                  type="number"
                  step="0.01"
                  value={draft.subPayRate ?? ""}
                  onChange={(e) => setDraft({ ...draft, subPayRate: e.target.value })}
                  placeholder="120.00"
                />
              </div>
              <div>
                <label className="fbt-label">Minimum Hours / Sub</label>
                <input
                  className="fbt-input"
                  type="number"
                  step="0.25"
                  value={draft.subMinimumHours ?? ""}
                  onChange={(e) => setDraft({ ...draft, subMinimumHours: e.target.value })}
                  placeholder="4"
                />
              </div>
            </div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8, lineHeight: 1.5 }}>
              ▸ SUB PAY = max(ACTUAL_HOURS, SUB MINIMUM) × SUB RATE · BLANK = USE SUB CONTACT'S DEFAULT
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Tonnage Goal</label>
              <input className="fbt-input" type="number" value={draft.tonnageGoal} onChange={(e) => setDraft({ ...draft, tonnageGoal: e.target.value })} placeholder="5000" />
            </div>
            <div>
              <label className="fbt-label">Bid Amount $</label>
              <input className="fbt-input" type="number" step="0.01" value={draft.bidAmount} onChange={(e) => setDraft({ ...draft, bidAmount: e.target.value })} placeholder="125000.00" />
            </div>
            <div>
              <label className="fbt-label">Budget $</label>
              <input className="fbt-input" type="number" step="0.01" value={draft.budget} onChange={(e) => setDraft({ ...draft, budget: e.target.value })} placeholder="118000.00" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Prime Contractor</label>
              <input className="fbt-input" value={draft.primeContractor} onChange={(e) => setDraft({ ...draft, primeContractor: e.target.value })} placeholder="MCI (if we're the sub)" />
            </div>
            <div>
              <label className="fbt-label">Funding Source</label>
              <select className="fbt-select" value={draft.fundingSource} onChange={(e) => setDraft({ ...draft, fundingSource: e.target.value })}>
                <option value="">— Select —</option>
                <option value="public_works">Public Works</option>
                <option value="federal">Federal</option>
                <option value="state">State</option>
                <option value="local">Local / Municipal</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, border: "2px solid var(--steel)", background: draft.certifiedPayroll ? "#FEF3C7" : "#FFF", cursor: "pointer" }}>
            <input type="checkbox" checked={draft.certifiedPayroll} onChange={(e) => setDraft({ ...draft, certifiedPayroll: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer" }} />
            <span className="fbt-mono" style={{ fontSize: 12 }}>CERTIFIED PAYROLL REQUIRED (Prevailing Wage)</span>
          </label>

          <div>
            <label className="fbt-label">Notes</label>
            <textarea className="fbt-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Internal notes, quirks, special requirements..." />
          </div>

          {/* v21 Session S: Public portfolio section */}
          <div style={{ padding: 14, border: "2px dashed var(--steel)", background: "#FAFAF9" }}>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", fontWeight: 700, marginBottom: 10 }}>
              ▸ PUBLIC WEBSITE PORTFOLIO
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 10, border: "2px solid var(--steel)", background: draft.showOnWebsite ? "#DCFCE7" : "#FFF", cursor: "pointer" }}>
              <input type="checkbox" checked={!!draft.showOnWebsite} onChange={(e) => setDraft({ ...draft, showOnWebsite: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer", marginTop: 2 }} />
              <div>
                <div className="fbt-mono" style={{ fontSize: 12, fontWeight: 700 }}>SHOW ON PUBLIC WEBSITE</div>
                <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
                  Displays project name + customer name on 4brotherstruck.com portfolio section. Nothing else (no rates, no tonnage, no contract info) is ever shown publicly.
                </div>
              </div>
            </label>
            {draft.showOnWebsite && (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div>
                  <label className="fbt-label">Customer Display Name (optional)</label>
                  <input
                    className="fbt-input"
                    value={draft.publicCustomer || ""}
                    onChange={(e) => setDraft({ ...draft, publicCustomer: e.target.value })}
                    placeholder={
                      draft.customerId
                        ? `Default: "${(customers.find((c) => c.id === draft.customerId)?.companyName || customers.find((c) => c.id === draft.customerId)?.contactName) || ""}" — leave blank to use this`
                        : "e.g. City of Salinas, Caltrans, Graniterock"
                    }
                  />
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>
                    ▸ USE IF YOU WANT A CLEANER PUBLIC NAME (E.G. "CITY OF SALINAS" INSTEAD OF THE FULL ENTITY NAME)
                  </div>
                </div>
                <div>
                  <label className="fbt-label">Completion Year (optional)</label>
                  <input
                    className="fbt-input"
                    type="number"
                    min="2015" max="2099"
                    value={draft.completionYear || ""}
                    onChange={(e) => setDraft({ ...draft, completionYear: e.target.value ? Number(e.target.value) : null })}
                    placeholder="e.g. 2025"
                    style={{ width: 140 }}
                  />
                </div>
                <div>
                  <label className="fbt-label">Display Order (optional)</label>
                  <input
                    className="fbt-input"
                    type="number"
                    value={draft.publicOrder || 0}
                    onChange={(e) => setDraft({ ...draft, publicOrder: Number(e.target.value) || 0 })}
                    style={{ width: 140 }}
                  />
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>
                    ▸ LOWER NUMBERS SHOW FIRST. LEAVE AT 0 TO SORT BY COMPLETION YEAR.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <button onClick={save} className="btn-primary"><CheckCircle2 size={16} /> SAVE PROJECT</button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ========== PROJECTS TAB ==========
export const ProjectsTab = ({ projects, setProjects, contacts, dispatches, freightBills, invoices, onToast }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const save = async (p) => {
    const exists = projects.find((x) => x.id === p.id);
    const next = exists ? projects.map((x) => x.id === p.id ? p : x) : [p, ...projects];
    setProjects(next);
  };

  const remove = async (id) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`Delete project "${p.name}"? Orders linked to it will keep their project reference (but the project won't exist anymore).`)) return;
    const next = projects.filter((x) => x.id !== id);
    setProjects(next);
    onToast("PROJECT DELETED");
    setViewing(null);
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return projects
      .filter((p) => statusFilter === "all" || p.status === statusFilter)
      .filter((p) => {
        if (!s) return true;
        const customer = contacts.find((c) => c.id === p.customerId);
        const hay = `${p.name} ${p.contractNumber} ${p.poNumber} ${p.location} ${customer?.companyName || ""}`.toLowerCase();
        return hay.includes(s);
      })
      .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  }, [projects, contacts, search, statusFilter]);

  const activeCount = projects.filter((p) => p.status === "active").length;
  const completeCount = projects.filter((p) => p.status === "complete").length;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {showModal && (
        <ProjectModal
          project={editing}
          contacts={contacts}
          onSave={save}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onToast={onToast}
        />
      )}
      {viewing && !showModal && (
        <ProjectDetailModal
          project={viewing}
          contacts={contacts}
          dispatches={dispatches}
          freightBills={freightBills}
          invoices={invoices}
          onEdit={() => { setEditing(viewing); setShowModal(true); }}
          onDelete={() => remove(viewing.id)}
          onClose={() => setViewing(null)}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{projects.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--good)", color: "#FFF" }}>
          <div className="stat-num" style={{ color: "#FFF" }}>{activeCount}</div>
          <div className="stat-label" style={{ color: "#FFF" }}>Active</div>
        </div>
        <div className="fbt-card" style={{ padding: 20 }}>
          <div className="stat-num">{completeCount}</div>
          <div className="stat-label">Complete</div>
        </div>
        <div className="fbt-card" style={{ padding: 20, background: "var(--hazard)" }}>
          <div className="stat-num">{projects.filter((p) => p.certifiedPayroll).length}</div>
          <div className="stat-label">Cert Payroll</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search name, contract, PO, location…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="fbt-select" style={{ width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="complete">Complete</option>
          <option value="on_hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> NEW PROJECT
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <Briefcase size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {search || statusFilter !== "all" ? "NO MATCHES" : "NO PROJECTS YET — ADD YOUR FIRST ONE"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map((p) => {
            const customer = contacts.find((c) => c.id === p.customerId);
            const orders = dispatches.filter((d) => d.projectId === p.id);
            const bills = freightBills.filter((fb) => orders.some((d) => d.id === fb.dispatchId));
            const tons = bills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
            const statusBg = {
              active: "var(--good)", complete: "var(--concrete)",
              on_hold: "var(--hazard-deep)", cancelled: "var(--safety)",
            }[p.status] || "var(--concrete)";
            return (
              <div key={p.id} className="fbt-card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => setViewing(p)}>
                <div className="hazard-stripe-thin" style={{ height: 6 }} />
                <div style={{ padding: 18 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                    <Briefcase size={18} style={{ color: "var(--hazard-deep)", flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
                        <span className="chip" style={{ background: statusBg, color: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                          {p.status?.replace("_", " ").toUpperCase()}
                        </span>
                        {p.certifiedPayroll && <span className="chip" style={{ background: "var(--hazard)", fontSize: 9, padding: "2px 8px" }}>CERT PAYROLL</span>}
                      </div>
                      <div className="fbt-display" style={{ fontSize: 17, lineHeight: 1.15 }}>{p.name}</div>
                      {customer && <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 3 }}>for {customer.companyName}</div>}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "var(--concrete)", lineHeight: 1.6, marginTop: 8 }}>
                    {p.contractNumber && <div>CONTRACT ▸ {p.contractNumber}</div>}
                    {p.poNumber && <div>PO ▸ {p.poNumber}</div>}
                    {p.location && <div style={{ display: "flex", gap: 4, alignItems: "flex-start" }}><MapPin size={11} style={{ marginTop: 2, flexShrink: 0 }} /> {p.location}</div>}
                  </div>

                  <div style={{ marginTop: 12, padding: 10, background: "#F5F5F4", borderRadius: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, textAlign: "center" }}>
                    <div>
                      <div className="fbt-display" style={{ fontSize: 16, lineHeight: 1 }}>{orders.length}</div>
                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>ORDERS</div>
                    </div>
                    <div>
                      <div className="fbt-display" style={{ fontSize: 16, lineHeight: 1 }}>{tons.toFixed(0)}</div>
                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>TONS</div>
                    </div>
                    <div>
                      <div className="fbt-display" style={{ fontSize: 16, lineHeight: 1, color: "var(--hazard-deep)" }}>{p.bidAmount ? fmt$(p.bidAmount).replace("$", "$").slice(0, 8) : "—"}</div>
                      <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)" }}>BID</div>
                    </div>
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
