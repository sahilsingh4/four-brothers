import { useState, useEffect, useMemo } from "react";
import { Camera, Search, ShieldCheck } from "lucide-react";
import { FBEditModal } from "./FBEditModal";

export const ReviewTab = ({ freightBills, dispatches, setDispatches, contacts, editFreightBill, invoices = [], pendingFB, clearPendingFB, onToast }) => {
  const [filter, setFilter] = useState("pending");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  // Bulk-select: per-row checkboxes feed this Set; user can approve a subset.
  const [selectedIds, setSelectedIds] = useState(new Set());
  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Auto-open FB editor when jumping from home dashboard.
  // Consume-trigger pattern: parent passes pendingFB once, we read it and
  // immediately call clearPendingFB() so the next render sees null. Bounded.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (pendingFB) {
      const fb = freightBills.find((x) => x.id === pendingFB);
      if (fb) {
        setFilter("all"); // make sure it's visible in filtering
        setEditing(fb);
      }
      if (clearPendingFB) clearPendingFB();
    }
  }, [pendingFB, freightBills]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const pendingCount = freightBills.filter((fb) => (fb.status || "pending") === "pending").length;
  const approvedCount = freightBills.filter((fb) => fb.status === "approved").length;
  const rejectedCount = freightBills.filter((fb) => fb.status === "rejected").length;

  const filtered = useMemo(() => {
    let list = freightBills;
    if (filter !== "all") list = list.filter((fb) => (fb.status || "pending") === filter);
    if (dateFrom) list = list.filter((fb) => (fb.submittedAt || "").slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter((fb) => (fb.submittedAt || "").slice(0, 10) <= dateTo);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((fb) => {
        const d = dispatches.find((x) => x.id === fb.dispatchId);
        const hay = `${fb.freightBillNumber} ${fb.driverName} ${fb.truckNumber} ${fb.material} ${d?.jobName || ""} ${d?.code || ""}`.toLowerCase();
        return hay.includes(s);
      });
    }
    return list.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  }, [freightBills, filter, dateFrom, dateTo, search, dispatches]);

  const approveBatch = async (fbs) => {
    if (fbs.length === 0) { onToast("NOTHING TO APPROVE"); return; }
    if (!confirm(`Approve ${fbs.length} pending freight bill${fbs.length !== 1 ? "s" : ""}? Customers will be able to see them.`)) return;
    try {
      for (const fb of fbs) {
        await editFreightBill(fb.id, {
          ...fb,
          status: "approved",
          approvedAt: new Date().toISOString(),
          approvedBy: "admin",
        });
      }
      setSelectedIds(new Set());
      onToast(`✓ ${fbs.length} APPROVED`);
    } catch (e) {
      console.error(e);
      onToast("BATCH APPROVE FAILED");
    }
  };

  const approveAll = () => {
    const pending = filtered.filter((fb) => (fb.status || "pending") === "pending");
    return approveBatch(pending);
  };

  const approveSelected = () => {
    const pending = filtered.filter((fb) => selectedIds.has(fb.id) && (fb.status || "pending") === "pending");
    return approveBatch(pending);
  };

  // Currently-visible pending FBs that the user could mass-select
  const visiblePending = filtered.filter((fb) => (fb.status || "pending") === "pending");
  const allVisibleSelected = visiblePending.length > 0 && visiblePending.every((fb) => selectedIds.has(fb.id));
  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visiblePending.forEach((fb) => next.delete(fb.id));
      } else {
        visiblePending.forEach((fb) => next.add(fb.id));
      }
      return next;
    });
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {editing && (
        <FBEditModal
          fb={editing}
          dispatches={dispatches}
          setDispatches={setDispatches}
          contacts={contacts}
          freightBills={freightBills}
          editFreightBill={editFreightBill}
          invoices={invoices}
          onClose={() => setEditing(null)}
          onToast={onToast}
          currentUser="admin"
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <div className="fbt-card" style={{ padding: 18, background: "var(--hazard)", color: "var(--steel)" }}>
          <div className="stat-num" style={{ color: "var(--steel)" }}>{pendingCount}</div>
          <div className="stat-label">Pending Review</div>
        </div>
        <div className="fbt-card" style={{ padding: 18, background: "var(--good)", color: "#FFF" }}>
          <div className="stat-num" style={{ color: "#FFF" }}>{approvedCount}</div>
          <div className="stat-label" style={{ color: "#FFF" }}>Approved</div>
        </div>
        <div className="fbt-card" style={{ padding: 18 }}>
          <div className="stat-num">{rejectedCount}</div>
          <div className="stat-label">Rejected</div>
        </div>
        <div className="fbt-card" style={{ padding: 18 }}>
          <div className="stat-num">{freightBills.length}</div>
          <div className="stat-label">Total</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search FB#, driver, truck, job…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="fbt-select" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="pending">Pending Only</option>
          <option value="approved">Approved Only</option>
          <option value="rejected">Rejected Only</option>
          <option value="all">All</option>
        </select>
        <input className="fbt-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: "auto" }} title="From" />
        <input className="fbt-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: "auto" }} title="To" />
        {visiblePending.length > 0 && (
          <>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, cursor: "pointer", background: "#FFF" }}>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                style={{ cursor: "pointer" }}
              />
              Select all ({visiblePending.length})
            </label>
            {selectedIds.size > 0 && (
              <button onClick={approveSelected} className="btn-primary" style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}>
                <ShieldCheck size={14} /> Approve selected ({Array.from(selectedIds).filter((id) => visiblePending.some((fb) => fb.id === id)).length})
              </button>
            )}
            {selectedIds.size === 0 && (
              <button onClick={approveAll} className="btn-primary" style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}>
                <ShieldCheck size={14} /> Approve all ({visiblePending.length})
              </button>
            )}
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="fbt-card" style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
          <ShieldCheck size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div className="fbt-mono" style={{ fontSize: 13 }}>
            {filter === "pending" ? "NO PENDING FREIGHT BILLS — ALL CAUGHT UP" : "NO MATCHES"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map((fb) => {
            const d = dispatches.find((x) => x.id === fb.dispatchId);
            const status = fb.status || "pending";
            const bg = status === "approved" ? "#F0FDF4" : status === "rejected" ? "#FEF2F2" : "#FEF3C7";
            const border = status === "approved" ? "var(--good)" : status === "rejected" ? "var(--safety)" : "var(--hazard)";
            const photos = fb.photos || [];
            return (
              <div key={fb.id} className="fbt-card" style={{ padding: 14, background: bg, borderLeft: `4px solid ${border}`, cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }} onClick={() => setEditing(fb)}>
                {status === "pending" && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(fb.id)}
                    onChange={() => toggleSelected(fb.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginTop: 4, cursor: "pointer", width: 16, height: 16, flexShrink: 0 }}
                    title="Select for bulk approve"
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                      <span className="chip" style={{ background: border, color: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                        {status.toUpperCase()}
                      </span>
                      <span className="chip" style={{ background: "var(--hazard)", fontSize: 9, padding: "2px 8px" }}>FB #{fb.freightBillNumber || "—"}</span>
                      {d && <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>Order #{d.code}</span>}
                      {photos.length > 0 ? (
                        <span className="chip" style={{ background: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                          <Camera size={10} style={{ marginRight: 3 }} /> {photos.length}
                        </span>
                      ) : (
                        <span className="chip" title="No proof-of-haul photos — review carefully" style={{ background: "var(--safety)", color: "#FFF", fontSize: 9, padding: "2px 8px", borderColor: "var(--safety)" }}>
                          ⚠ NO PHOTOS
                        </span>
                      )}
                      {/* F6: tonnage overage chip — flag when submitted tonnage is >20% over the dispatch's expected tons/truck. */}
                      {(() => {
                        const expected = Number(d?.expectedTonnagePerTruck);
                        const actual = Number(fb.tonnage);
                        if (!expected || !actual || actual <= expected * 1.2) return null;
                        const pctOver = Math.round(((actual / expected) - 1) * 100);
                        return (
                          <span className="chip" title={`Submitted ${actual}T vs expected ${expected}T per truck — ${pctOver}% over. Verify with driver / scale ticket.`} style={{ background: "var(--hazard-deep)", color: "#FFF", fontSize: 9, padding: "2px 8px", borderColor: "var(--hazard-deep)" }}>
                            ⚠ OVERAGE +{pctOver}%
                          </span>
                        );
                      })()}
                      {fb.pretripInspection && (() => {
                        const defects = (fb.pretripInspection.items || []).filter((i) => i.result === "defect").length;
                        const bg = defects > 0 ? "var(--hazard-deep)" : "var(--good)";
                        return (
                          <span className="chip" title={`DOT pre-trip ${defects > 0 ? `with ${defects} defect${defects !== 1 ? "s" : ""}` : "(all OK)"} signed by ${fb.pretripInspection.signedBy || "driver"}`} style={{ background: bg, color: "#FFF", fontSize: 9, padding: "2px 8px", borderColor: bg }}>
                            ✓ PRE-TRIP{defects > 0 ? ` · ${defects} DEF` : ""}
                          </span>
                        );
                      })()}
                      {fb.incidentReport && (
                        <span className="chip" title={`Incident: ${fb.incidentReport.kind || "—"} · ${fb.incidentReport.drivable === "no" ? "NOT drivable" : fb.incidentReport.drivable === "yes" ? "drivable" : "drivable unsure"}`} style={{ background: "var(--safety)", color: "#FFF", fontSize: 9, padding: "2px 8px", borderColor: "var(--safety)" }}>
                          ⚠ INCIDENT
                        </span>
                      )}
                    </div>
                    <div className="fbt-display" style={{ fontSize: 15, lineHeight: 1.2 }}>
                      {fb.driverName || "Unknown driver"} · Truck {fb.truckNumber || "—"}
                    </div>
                    <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
                      {d?.jobName || "—"} · {fb.tonnage ? `${fb.tonnage}T` : ""}{fb.hoursBilled ? ` · ${fb.hoursBilled}hrs` : fb.pickupTime && fb.dropoffTime ? ` · ${fb.pickupTime}→${fb.dropoffTime}` : ""}
                    </div>
                    {fb.signedOutStatus && fb.signedOutAt && (
                      <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                        Signed out {fb.signedOutStatus} at {fb.signedOutAt}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {photos.slice(0, 3).map((p, idx) => (
                      <img key={idx} src={p.dataUrl} alt="" style={{ width: 44, height: 44, objectFit: "cover", border: "1px solid var(--steel)" }} />
                    ))}
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
