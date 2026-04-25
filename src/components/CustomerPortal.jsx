import { useState, useEffect, useMemo } from "react";
import {
  Activity, AlertCircle, AlertTriangle, ClipboardList, Clock,
  DollarSign, Eye, FileText, Mail, Receipt, Search, ShieldCheck, X,
} from "lucide-react";
import { fetchCustomerByToken } from "../db";
import { GlobalStyles } from "./GlobalStyles";
import { Logo } from "./Logo";
import { BidDeadlineChip } from "./BidDeadlineChip";
import { SectionCard, Row } from "./SectionCard";

export const CustomerPortal = ({ token }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFB, setSelectedFB] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [orderFilter, setOrderFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchCustomerByToken(token);
        if (!result) { setError("Invalid or expired portal link"); }
        else { setData(result); }
      } catch {
        setError("Failed to load portal — please try again");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Filter orders — must run on every render (hooks rules), so compute from data?.orders
  // and gate rendering below.
  const filteredOrders = useMemo(() => {
    const orders = data?.orders || [];
    const freightBills = data?.freightBills || [];
    let list = orders;
    if (orderFilter !== "all") list = list.filter((o) => {
      if (orderFilter === "open") return o.status === "open";
      if (orderFilter === "closed") return o.status === "closed";
      if (orderFilter !== "all") return o.projectId === Number(orderFilter);
      return true;
    });
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((o) => {
        const fbs = freightBills.filter((fb) => fb.dispatchId === o.id);
        const hay = `${o.jobName} ${o.code} ${fbs.map((fb) => `${fb.freightBillNumber} ${fb.driverName}`).join(" ")}`.toLowerCase();
        return hay.includes(s);
      });
    }
    return list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [data, orderFilter, search]);

  // A/R rollup per project — must run before early returns to keep hook order
  // consistent across render passes.
  const arByProject = useMemo(() => {
    const invs = data?.invoices || [];
    const projs = data?.projects || [];
    const balanceOf = (inv) => Math.max(0, (Number(inv.total) || 0) - (Number(inv.amountPaid) || 0));
    const map = new Map();
    invs.forEach((inv) => {
      const key = inv.projectId || "_none";
      const entry = map.get(key) || { projectId: inv.projectId, count: 0, outstanding: 0, total: 0 };
      entry.count += 1;
      entry.total += Number(inv.total) || 0;
      entry.outstanding += balanceOf(inv);
      map.set(key, entry);
    });
    return Array.from(map.values())
      .map((e) => ({ ...e, project: projs.find((p) => p.id === e.projectId) }))
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [data]);

  if (loading) {
    return (
      <div className="fbt-root texture-paper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <GlobalStyles />
        <div className="fbt-mono anim-roll" style={{ color: "var(--hazard-deep)" }}>▸ LOADING YOUR PORTAL…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fbt-root texture-paper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
        <GlobalStyles />
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", maxWidth: 440 }}>
          <AlertCircle size={48} style={{ color: "var(--safety)", marginBottom: 16 }} />
          <h2 className="fbt-display" style={{ fontSize: 22, margin: "0 0 10px" }}>ACCESS DENIED</h2>
          <p style={{ color: "var(--concrete)", margin: "0 0 16px" }}>
            {error || "This portal link is not valid."} Please contact 4 Brothers Trucking for a new link.
          </p>
        </div>
      </div>
    );
  }

  const { customer, orders, freightBills, projects } = data;
  const invoices = data.invoices || [];

  // Metrics
  const totalTons = freightBills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
  const totalLoads = freightBills.reduce((s, fb) => s + (Number(fb.loadCount) || 0), 0);
  const totalHours = freightBills.reduce((s, fb) => s + (Number(fb.hoursBilled) || 0), 0);

  // A/R rollup — sum unpaid balances + per-project breakdown
  const invoiceBalance = (inv) => {
    const total = Number(inv.total) || 0;
    const paid = Number(inv.amountPaid) || 0;
    return Math.max(0, total - paid);
  };
  const invoiceStatus = (inv) => {
    if (inv.statusOverride) return inv.statusOverride;
    if (inv.paymentStatus) return inv.paymentStatus;
    const bal = invoiceBalance(inv);
    if (bal <= 0.01) return "paid";
    if ((Number(inv.amountPaid) || 0) > 0) return "partial";
    return "outstanding";
  };
  const totalOutstanding = invoices.reduce((s, inv) => s + invoiceBalance(inv), 0);
  const outstandingCount = invoices.filter((inv) => invoiceBalance(inv) > 0.01).length;
  const totalInvoiced = invoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0);
  const totalPaid = invoices.reduce((s, inv) => s + (Number(inv.amountPaid) || 0), 0);
  const fmtMoney = (n) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fbt-root" style={{ minHeight: "100vh", background: "#F5F5F4" }}>
      <GlobalStyles />
      {selectedFB && (
        <div className="modal-bg" onClick={() => setSelectedFB(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)" }}>FREIGHT BILL</div>
                <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>#{selectedFB.freightBillNumber || "—"}</h3>
              </div>
              <button onClick={() => setSelectedFB(null)} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, fontSize: 13, marginBottom: 16 }}>
                <div><strong>DRIVER:</strong> {selectedFB.driverName || "—"}</div>
                <div><strong>TRUCK:</strong> {selectedFB.truckNumber || "—"}</div>
                <div><strong>MATERIAL:</strong> {selectedFB.material || "—"}</div>
                <div><strong>TONNAGE:</strong> {selectedFB.tonnage ? `${selectedFB.tonnage}T` : "—"}</div>
                <div><strong>LOADS:</strong> {selectedFB.loadCount || "—"}</div>
                <div><strong>HOURS:</strong> {selectedFB.hoursBilled || "—"}</div>
                {selectedFB.pickupTime && <div><strong>PICKUP:</strong> {selectedFB.pickupTime}</div>}
                {selectedFB.dropoffTime && <div><strong>DROPOFF:</strong> {selectedFB.dropoffTime}</div>}
              </div>
              {selectedFB.description && (
                <div style={{ padding: 10, background: "#F5F5F4", fontSize: 13, marginBottom: 16 }}>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 4 }}>▸ DESCRIPTION</div>
                  {selectedFB.description}
                </div>
              )}
              {selectedFB.photos && selectedFB.photos.length > 0 && (
                <div>
                  <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 8 }}>▸ SCALE TICKETS ({selectedFB.photos.length})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {selectedFB.photos.map((p, idx) => (
                      <img
                        key={p.id || idx}
                        src={p.dataUrl}
                        alt=""
                        style={{ width: 120, height: 120, objectFit: "cover", border: "2px solid var(--steel)", cursor: "pointer" }}
                        onClick={() => setLightbox(p.dataUrl)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "zoom-out" }}>
          <img src={lightbox} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} alt="" />
        </div>
      )}

      {/* Header */}
      <div style={{ background: "var(--steel)", color: "var(--cream)", borderBottom: "3px solid var(--hazard)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Logo size="sm" />
          <div style={{ flex: 1 }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)" }}>CUSTOMER PORTAL</div>
            <div className="fbt-display" style={{ fontSize: 18 }}>{customer.companyName}</div>
          </div>
          <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1" }}>VIEW-ONLY ACCESS</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
          <div className="fbt-card" style={{ padding: 16 }}>
            <div className="stat-num">{orders.length}</div>
            <div className="stat-label">Total Orders</div>
          </div>
          <div className="fbt-card" style={{ padding: 16, background: "var(--hazard)" }}>
            <div className="stat-num">{freightBills.length}</div>
            <div className="stat-label">Freight Bills</div>
          </div>
          <div className="fbt-card" style={{ padding: 16 }}>
            <div className="stat-num">{totalTons.toFixed(1)}</div>
            <div className="stat-label">Total Tons</div>
          </div>
          <div className="fbt-card" style={{ padding: 16 }}>
            <div className="stat-num">{totalLoads}</div>
            <div className="stat-label">Loads Hauled</div>
          </div>
          <div className="fbt-card" style={{ padding: 16 }}>
            <div className="stat-num">{totalHours.toFixed(1)}</div>
            <div className="stat-label">Hours Billed</div>
          </div>
        </div>

        {/* Invoices + A/R */}
        {invoices.length > 0 && (
          <div className="fbt-card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", background: outstandingCount > 0 ? "#FEF3C7" : "#F0FDF4", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Receipt size={18} style={{ color: outstandingCount > 0 ? "var(--hazard-deep)" : "var(--good)" }} />
                <div>
                  <div className="fbt-display" style={{ fontSize: 16 }}>Invoices &amp; balance</div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 2 }}>
                    {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} · {fmtMoney(totalInvoiced)} billed · {fmtMoney(totalPaid)} paid
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="fbt-display" style={{ fontSize: 22, color: outstandingCount > 0 ? "var(--hazard-deep)" : "var(--good)" }}>
                  {fmtMoney(totalOutstanding)}
                </div>
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
                  {outstandingCount > 0 ? `${outstandingCount} OUTSTANDING` : "ALL PAID"}
                </div>
              </div>
            </div>

            {/* Per-project breakdown — only shown if there are 2+ projects */}
            {arByProject.length > 1 && (
              <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--line)", background: "#F8FAFC", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {arByProject.map((entry) => (
                  <span
                    key={entry.projectId || "none"}
                    className="chip"
                    title={`${entry.count} invoice${entry.count !== 1 ? "s" : ""} · ${fmtMoney(entry.outstanding)} outstanding of ${fmtMoney(entry.total)}`}
                    style={{ background: entry.outstanding > 0.01 ? "#FEF3C7" : "#F0FDF4", color: "var(--steel)", fontSize: 10, padding: "3px 8px", borderColor: entry.outstanding > 0.01 ? "var(--hazard)" : "var(--good)" }}
                  >
                    <strong>{entry.project?.name || "(no project)"}</strong>
                    <span style={{ marginLeft: 6, color: entry.outstanding > 0.01 ? "var(--hazard-deep)" : "var(--good)" }}>{fmtMoney(entry.outstanding)}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Invoice rows */}
            <div style={{ display: "grid", gap: 0 }}>
              {invoices.map((inv) => {
                const status = invoiceStatus(inv);
                const balance = invoiceBalance(inv);
                const project = projects.find((p) => p.id === inv.projectId);
                const statusBg = status === "paid" ? "var(--good)" : status === "partial" ? "var(--hazard)" : "var(--safety)";
                const statusLabel = status === "paid" ? "PAID" : status === "partial" ? "PARTIAL" : "OUTSTANDING";
                const overdue = inv.dueDate && status !== "paid" && new Date(inv.dueDate) < new Date(new Date().toISOString().slice(0, 10) + "T23:59:59");
                return (
                  <div key={inv.id} style={{ padding: "12px 18px", borderTop: "1px solid var(--line)", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
                        <span className="chip" style={{ background: statusBg, color: "#FFF", fontSize: 9, padding: "2px 6px" }}>{statusLabel}</span>
                        <span className="fbt-display" style={{ fontSize: 14 }}>INV #{inv.invoiceNumber}</span>
                        {project && <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>· {project.name}</span>}
                        {overdue && <span className="chip" style={{ background: "var(--safety)", color: "#FFF", fontSize: 9, padding: "2px 6px" }}>OVERDUE</span>}
                      </div>
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
                        Issued {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : "—"}
                        {inv.dueDate && ` · Due ${new Date(inv.dueDate).toLocaleDateString()}`}
                        {inv.poNumber && ` · PO ${inv.poNumber}`}
                        {(inv.freightBillIds || []).length > 0 && ` · ${(inv.freightBillIds || []).length} FB${(inv.freightBillIds || []).length !== 1 ? "s" : ""}`}
                      </div>
                      {(inv.paymentHistory || []).length > 0 && (
                        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>
                          ▸ Payments: {inv.paymentHistory.map((p, i) => (
                            <span key={i}>{i > 0 ? " · " : ""}{fmtMoney(p.amount)}{p.date ? ` (${new Date(p.date).toLocaleDateString()})` : ""}{p.method ? ` ${p.method}` : ""}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="fbt-display" style={{ fontSize: 16 }}>{fmtMoney(inv.total)}</div>
                      {status !== "paid" && balance > 0.01 && (
                        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard-deep)", fontWeight: 700 }}>
                          {fmtMoney(balance)} due
                        </div>
                      )}
                      {status === "paid" && (
                        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", fontWeight: 700 }}>
                          ✓ paid in full
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
            <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search job name, FB#, driver…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="fbt-select" style={{ width: "auto" }} value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)}>
            <option value="all">All Orders</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            {projects.length > 0 && <option disabled>──── Projects ────</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Orders + FBs */}
        {filteredOrders.length === 0 ? (
          <div className="fbt-card" style={{ padding: 40, textAlign: "center", color: "var(--concrete)" }}>
            <FileText size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div className="fbt-mono" style={{ fontSize: 13 }}>NO ORDERS YET</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {filteredOrders.map((order) => {
              const orderFBs = freightBills.filter((fb) => fb.dispatchId === order.id);
              const orderTons = orderFBs.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
              const project = projects.find((p) => p.id === order.projectId);
              return (
                <div key={order.id} className="fbt-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div className="hazard-stripe-thin" style={{ height: 4 }} />
                  <div style={{ padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                          <span className="chip" style={{ background: order.status === "open" ? "var(--good)" : "var(--concrete)", color: "#FFF", fontSize: 9, padding: "2px 8px" }}>
                            ● {order.status || "open"}
                          </span>
                          <span className="chip" style={{ background: "var(--hazard)", fontSize: 9, padding: "2px 8px" }}>#{order.code}</span>
                          <span className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>{order.date ? new Date(order.date).toLocaleDateString() : ""}</span>
                          {project && <span className="chip" style={{ background: "#FFF", fontSize: 9, padding: "2px 8px" }}>{project.name}</span>}
                        </div>
                        <div className="fbt-display" style={{ fontSize: 17 }}>{order.jobName}</div>
                        {(order.pickup || order.dropoff) && (
                          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginTop: 2 }}>
                            {order.pickup && `▸ ${order.pickup}`}{order.dropoff && ` → ${order.dropoff}`}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="fbt-display" style={{ fontSize: 20 }}>{orderFBs.length}</div>
                        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>FBs · {orderTons.toFixed(1)}T</div>
                      </div>
                    </div>

                    {/* FB list */}
                    {orderFBs.length > 0 && (
                      <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                        {orderFBs.map((fb) => (
                          <div
                            key={fb.id}
                            onClick={() => setSelectedFB(fb)}
                            style={{
                              padding: 10, border: "1px solid var(--steel)", background: "#FFF",
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              cursor: "pointer", gap: 10, flexWrap: "wrap",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 150, fontSize: 12 }}>
                              <strong>FB #{fb.freightBillNumber || "—"}</strong> · {fb.driverName || "—"} · Truck {fb.truckNumber || "—"}
                              <div style={{ color: "var(--concrete)", fontSize: 10, marginTop: 2 }}>
                                {fb.tonnage ? `${fb.tonnage}T` : ""}{fb.loadCount ? ` · ${fb.loadCount} load${fb.loadCount !== 1 ? "s" : ""}` : ""}{fb.hoursBilled ? ` · ${fb.hoursBilled}hrs` : ""}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              {(fb.photos || []).slice(0, 3).map((p, idx) => (
                                <img key={idx} src={p.dataUrl} alt="" style={{ width: 32, height: 32, objectFit: "cover", border: "1px solid var(--steel)" }} />
                              ))}
                              {(fb.photos || []).length > 3 && (
                                <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>+{fb.photos.length - 3}</span>
                              )}
                              <Eye size={14} style={{ color: "var(--concrete)", marginLeft: 6 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: "center", padding: "30px 0 20px", color: "var(--concrete)", fontSize: 11 }}>
          ▸ 4 BROTHERS TRUCKING, LLC · BAY POINT, CA · QUESTIONS? CONTACT YOUR DISPATCHER
        </div>
      </div>
    </div>
  );
};

