import { useState, useEffect, useMemo } from "react";
import { Camera, X } from "lucide-react";
import { Lightbox } from "./Lightbox";

export const FBPhotoGallery = ({
  freightBills = [],
  dispatches = [],
  contacts = [],
  projects = [],
  invoices = [],
  initialDispatchId = "",
  initialInvoiceId = "",
  onClose,
  title,
}) => {
  const [filterDispatchId, setFilterDispatchId] = useState(initialDispatchId);
  const [filterInvoiceId, setFilterInvoiceId] = useState(initialInvoiceId);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterDriverSubId, setFilterDriverSubId] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest"); // newest | oldest

  // Escape closes lightbox or modal
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      if (lightbox) { setLightbox(null); return; }
      if (onClose) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [lightbox]);

  // Filter FBs by the full filter set
  const filteredFBs = useMemo(() => {
    const fromMs = filterFrom ? new Date(filterFrom + "T00:00:00").getTime() : null;
    const toMs = filterTo ? new Date(filterTo + "T23:59:59").getTime() : null;
    return freightBills
      .filter((fb) => {
        // Must have photos to be in gallery
        if (!fb.photos || fb.photos.length === 0) return false;
        // Dispatch (Order) filter
        if (filterDispatchId && fb.dispatchId !== filterDispatchId) return false;
        // Invoice filter
        if (filterInvoiceId && fb.invoiceId !== filterInvoiceId) return false;
        // Project filter — via the fb's dispatch
        if (filterProjectId) {
          const d = dispatches.find((x) => x.id === fb.dispatchId);
          if (!d || d.projectId !== filterProjectId) return false;
        }
        // Driver/Sub filter — look up the fb's assignment contactId
        if (filterDriverSubId) {
          const d = dispatches.find((x) => x.id === fb.dispatchId);
          const a = d ? (d.assignments || []).find((x) => x.aid === fb.assignmentId) : null;
          if (!a || String(a.contactId) !== String(filterDriverSubId)) return false;
        }
        // Date range — use submittedAt (or approvedAt fallback)
        const ts = fb.submittedAt || fb.approvedAt || fb.createdAt || null;
        if (!ts) {
          // If filtering by date, FBs without a date should be excluded
          if (fromMs || toMs) return false;
        } else {
          const fbMs = new Date(ts).getTime();
          if (fromMs && fbMs < fromMs) return false;
          if (toMs && fbMs > toMs) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aMs = new Date(a.submittedAt || a.approvedAt || a.createdAt || 0).getTime();
        const bMs = new Date(b.submittedAt || b.approvedAt || b.createdAt || 0).getTime();
        return sortOrder === "newest" ? bMs - aMs : aMs - bMs;
      });
  }, [freightBills, dispatches, filterDispatchId, filterInvoiceId, filterProjectId, filterDriverSubId, filterFrom, filterTo, sortOrder]);

  const totalPhotoCount = filteredFBs.reduce((s, fb) => s + (fb.photos?.length || 0), 0);

  // Build dropdown options — only contacts that are drivers/subs
  const driverSubContacts = contacts.filter((c) => c.type === "driver" || c.type === "sub");

  const clearFilters = () => {
    setFilterDispatchId(initialDispatchId);
    setFilterInvoiceId(initialInvoiceId);
    setFilterFrom("");
    setFilterTo("");
    setFilterDriverSubId("");
    setFilterProjectId("");
  };

  const anyFilterActive = (
    (filterDispatchId && filterDispatchId !== initialDispatchId) ||
    (filterInvoiceId && filterInvoiceId !== initialInvoiceId) ||
    filterFrom || filterTo || filterDriverSubId || filterProjectId
  );

  const body = (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header with contextual title */}
      {title && (
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em" }}>▸ {title}</div>
      )}

      {/* Filter bar */}
      <div className="fbt-card" style={{ padding: 14, display: "grid", gap: 10 }}>
        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em" }}>▸ FILTERS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {!initialDispatchId && (
            <div>
              <label className="fbt-label">Order</label>
              <select className="fbt-select" value={filterDispatchId} onChange={(e) => setFilterDispatchId(e.target.value)}>
                <option value="">All orders</option>
                {dispatches.slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 100).map((d) => (
                  <option key={d.id} value={d.id}>#{d.code || d.id.slice(0, 6)} {d.customerName ? ` · ${d.customerName}` : ""}</option>
                ))}
              </select>
            </div>
          )}
          {!initialInvoiceId && (
            <div>
              <label className="fbt-label">Invoice</label>
              <select className="fbt-select" value={filterInvoiceId} onChange={(e) => setFilterInvoiceId(e.target.value)}>
                <option value="">All invoices</option>
                {invoices.slice(0, 100).map((i) => (
                  <option key={i.id} value={i.id}>{i.invoiceNumber} · {i.billToName}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="fbt-label">Driver / Sub</label>
            <select className="fbt-select" value={filterDriverSubId} onChange={(e) => setFilterDriverSubId(e.target.value)}>
              <option value="">All drivers/subs</option>
              {driverSubContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.type === "sub" ? "S" : "D"} · {c.companyName || c.contactName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="fbt-label">Project</label>
            <select className="fbt-select" value={filterProjectId} onChange={(e) => setFilterProjectId(e.target.value)}>
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fbt-label">From</label>
            <input type="date" className="fbt-input" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          </div>
          <div>
            <label className="fbt-label">To</label>
            <input type="date" className="fbt-input" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
          </div>
          <div>
            <label className="fbt-label">Sort</label>
            <select className="fbt-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
        {anyFilterActive && (
          <button type="button" onClick={clearFilters} className="btn-ghost" style={{ padding: "6px 12px", fontSize: 11, alignSelf: "start" }}>
            <X size={12} /> CLEAR FILTERS
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.05em" }}>
        ▸ {filteredFBs.length} FB{filteredFBs.length !== 1 ? "S" : ""} · {totalPhotoCount} PHOTO{totalPhotoCount !== 1 ? "S" : ""} MATCHING
      </div>

      {/* List view — each FB gets a row with its photo thumbnails */}
      {filteredFBs.length === 0 ? (
        <div style={{ padding: 28, textAlign: "center", background: "#F5F5F4", border: "1px solid var(--steel)", fontSize: 12, color: "var(--concrete)" }}>
          No photos match these filters. Try broadening the range or clearing filters.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filteredFBs.map((fb) => {
            const d = dispatches.find((x) => x.id === fb.dispatchId);
            const a = d ? (d.assignments || []).find((x) => x.aid === fb.assignmentId) : null;
            const contact = a?.contactId ? contacts.find((c) => c.id === a.contactId) : null;
            const project = d?.projectId ? projects.find((p) => p.id === d.projectId) : null;
            const inv = fb.invoiceId ? invoices.find((i) => i.id === fb.invoiceId) : null;
            const ts = fb.submittedAt || fb.approvedAt || fb.createdAt || null;
            return (
              <div key={fb.id} className="fbt-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10, fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                    <strong style={{ color: "var(--steel)", fontSize: 13 }}>FB#{fb.freightBillNumber || "—"}</strong>
                    <span style={{ color: "var(--concrete)" }}>
                      {fb.driverName || contact?.contactName || contact?.companyName || "—"}
                      {fb.truckNumber ? ` · T${fb.truckNumber}` : ""}
                    </span>
                    {d && <span style={{ color: "var(--concrete)" }}>· Order #{d.code || d.id.slice(0, 6)}</span>}
                    {project && <span style={{ color: "var(--concrete)" }}>· {project.name}</span>}
                    {inv && <span style={{ color: "var(--good)", fontWeight: 700 }}>· INV {inv.invoiceNumber}</span>}
                  </div>
                  <div style={{ color: "var(--concrete)", fontSize: 11 }}>
                    {ts ? new Date(ts).toLocaleDateString() : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {fb.photos.map((p) => (
                    <img
                      key={p.id}
                      src={p.dataUrl}
                      alt={p.name || "photo"}
                      onClick={() => setLightbox(p.dataUrl)}
                      style={{
                        width: 96, height: 96, objectFit: "cover",
                        border: "1.5px solid var(--steel)", cursor: "pointer",
                      }}
                      title={p.name || ""}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );

  // If onClose is provided, render as a modal. Otherwise render inline (for Reports tab)
  if (onClose) {
    return (
      <div className="modal-bg" onClick={onClose}>
        <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 960 }}>
          <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <Camera size={16} /> {title || "PHOTO GALLERY"}
            </h3>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
          </div>
          <div style={{ padding: 22 }}>
            {body}
          </div>
        </div>
      </div>
    );
  }
  return body;
};

// ========== BIDS / RFP TRACKER (v19 Batch 3 Session F) ==========
// Pipeline: discovered → researching → preparing → submitted → awarded | rejected | abandoned
// Daily value: surface deadlines, reduce missed submissions, track pursuit history.


// ========== BIDS TAB ==========
