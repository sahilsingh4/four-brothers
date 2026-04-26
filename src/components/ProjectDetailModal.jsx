import { Edit2, Trash2, X } from "lucide-react";
import { fmt$, fmtDate } from "../utils";

export const ProjectDetailModal = ({ project, contacts, dispatches, freightBills, invoices, onEdit, onDelete, onClose, onJumpToDispatch }) => {
  const customer = contacts.find((c) => c.id === project.customerId);
  const projectDispatches = dispatches.filter((d) => d.projectId === project.id);
  const projectBills = freightBills.filter((fb) => projectDispatches.some((d) => d.id === fb.dispatchId));
  const projectInvoices = invoices.filter((i) => i.projectId === project.id);

  const totalTons = projectBills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
  const totalInvoiced = projectInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);

  const statusColor = {
    active: "var(--good)", complete: "var(--concrete)",
    on_hold: "var(--hazard-deep)", cancelled: "var(--safety)",
  }[project.status] || "var(--concrete)";

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)" }}>
              PROJECT · {project.status?.toUpperCase().replace("_", " ")}
            </div>
            <h3 className="fbt-display" style={{ fontSize: 22, margin: "4px 0 0" }}>{project.name}</h3>
            {customer && <div className="fbt-mono" style={{ fontSize: 12, color: "#D6D3D1", marginTop: 4 }}>for {customer.companyName}</div>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onEdit} className="btn-ghost" style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "6px 12px", fontSize: 11 }}><Edit2 size={12} /></button>
            <button onClick={onDelete} className="btn-danger" style={{ color: "var(--hazard)", borderColor: "var(--hazard)" }}><Trash2 size={12} /></button>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* Key stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
            <div className="fbt-card" style={{ padding: 14, background: statusColor, color: "#FFF" }}>
              <div className="stat-num" style={{ fontSize: 22, color: "#FFF" }}>{project.status?.replace("_", " ").toUpperCase()}</div>
              <div className="stat-label" style={{ color: "#FFF" }}>Status</div>
            </div>
            <div className="fbt-card" style={{ padding: 14 }}>
              <div className="stat-num" style={{ fontSize: 28 }}>{projectDispatches.length}</div>
              <div className="stat-label">Orders</div>
            </div>
            <div className="fbt-card" style={{ padding: 14 }}>
              <div className="stat-num" style={{ fontSize: 28 }}>{totalTons.toFixed(1)}</div>
              <div className="stat-label">Tons Hauled</div>
            </div>
            <div className="fbt-card" style={{ padding: 14, background: "var(--hazard)" }}>
              <div className="stat-num" style={{ fontSize: 22 }}>{fmt$(totalInvoiced)}</div>
              <div className="stat-label">Invoiced</div>
            </div>
          </div>

          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ PROJECT INFO</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 20, fontSize: 13 }}>
            {project.contractNumber && <div><strong>CONTRACT:</strong> {project.contractNumber}</div>}
            {project.poNumber && <div><strong>PO #:</strong> {project.poNumber}</div>}
            {project.location && <div style={{ gridColumn: "1 / -1" }}><strong>LOCATION:</strong> {project.location}</div>}
            {project.startDate && <div><strong>START:</strong> {fmtDate(project.startDate)}</div>}
            {project.endDate && <div><strong>END:</strong> {fmtDate(project.endDate)}</div>}
            {project.primeContractor && <div><strong>PRIME:</strong> {project.primeContractor}</div>}
            {project.fundingSource && <div><strong>FUNDING:</strong> {project.fundingSource.replace("_", " ").toUpperCase()}</div>}
            {project.bidAmount && <div><strong>BID:</strong> {fmt$(project.bidAmount)}</div>}
            {project.budget && <div><strong>BUDGET:</strong> {fmt$(project.budget)}</div>}
            {project.tonnageGoal && <div><strong>TONNAGE GOAL:</strong> {Number(project.tonnageGoal).toFixed(0)}</div>}
            {project.certifiedPayroll && <div style={{ gridColumn: "1 / -1", color: "var(--hazard-deep)" }}><strong>⚠ CERTIFIED PAYROLL REQUIRED</strong></div>}
          </div>

          {project.description && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ DESCRIPTION</div>
              <div style={{ padding: 12, background: "#F5F5F4", fontSize: 13, marginBottom: 20, whiteSpace: "pre-wrap" }}>{project.description}</div>
            </>
          )}

          {project.notes && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ INTERNAL NOTES</div>
              <div style={{ padding: 12, background: "#FEF3C7", borderLeft: "3px solid var(--hazard)", fontSize: 13, marginBottom: 20, whiteSpace: "pre-wrap" }}>{project.notes}</div>
            </>
          )}

          {/* Progress bar if tonnage goal set */}
          {project.tonnageGoal > 0 && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>
                ▸ PROGRESS · {totalTons.toFixed(1)} / {Number(project.tonnageGoal).toFixed(0)} TONS
              </div>
              <div style={{ height: 14, background: "#E7E5E4", border: "1px solid var(--steel)", marginBottom: 20 }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, (totalTons / Number(project.tonnageGoal)) * 100)}%`,
                  background: totalTons >= Number(project.tonnageGoal) ? "var(--good)" : "var(--hazard)",
                }} />
              </div>
            </>
          )}

          {projectDispatches.length > 0 && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ ORDERS ON THIS PROJECT ({projectDispatches.length})</div>
              <div style={{ display: "grid", gap: 6 }}>
                {projectDispatches.slice(0, 15).map((d) => {
                  const bills = freightBills.filter((fb) => fb.dispatchId === d.id);
                  // Audit #8: each dispatch row jumps to that dispatch in
                  // the Dispatches tab when the parent threaded the
                  // onJumpToDispatch callback. Falls back to a static row
                  // (existing behavior) if the prop isn't passed.
                  const clickable = !!onJumpToDispatch;
                  return (
                    <div
                      key={d.id}
                      onClick={clickable ? () => { onClose(); onJumpToDispatch(d.id); } : undefined}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      title={clickable ? `Open ${d.code} in Dispatches tab` : ""}
                      style={{ padding: 10, border: "1px solid var(--steel)", background: "#FFF", fontSize: 12, display: "flex", justifyContent: "space-between", gap: 8, cursor: clickable ? "pointer" : "default" }}
                    >
                      <div><strong>#{d.code}</strong> · {d.jobName}</div>
                      <div style={{ color: "var(--concrete)" }}>{fmtDate(d.date)} · {bills.length}/{d.trucksExpected} FB</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
