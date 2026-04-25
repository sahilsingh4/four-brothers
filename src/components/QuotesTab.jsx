import { useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, ChevronDown, Eye, Save, Trash2, X } from "lucide-react";
import { fmtDate } from "../utils";
import { logAudit, updateQuote, deleteQuote } from "../db";

export const QuoteDetailModal = ({ quote, dispatches, setQuotes, quotes, onConvertToOrder, onClose, onToast }) => {
  const [draft, setDraft] = useState({ ...quote });
  const [showRevisions, setShowRevisions] = useState(false);
  const [revReason, setRevReason] = useState("");
  const [dirty, setDirty] = useState(false);

  const linkedOrder = quote.convertedToOrderId ? dispatches.find((d) => d.id === quote.convertedToOrderId) : null;

  const updateField = (field, value) => {
    setDraft({ ...draft, [field]: value });
    setDirty(true);
  };

  const saveRevision = async () => {
    if (!dirty) { onToast("NO CHANGES TO SAVE"); return; }
    // Build revision snapshot from current quote (pre-edit state)
    const currentRev = quote.revisions?.length || 0;
    const newRevision = {
      revNumber: currentRev + 1,
      savedAt: new Date().toISOString(),
      savedBy: "admin",
      changeReason: revReason || "(no reason given)",
      snapshot: {
        name: quote.name, company: quote.company, email: quote.email, phone: quote.phone,
        pickup: quote.pickup, dropoff: quote.dropoff, material: quote.material,
        quantity: quote.quantity, needDate: quote.needDate, notes: quote.notes,
        status: quote.status, service: quote.service,
      },
    };
    const updated = {
      ...draft,
      revisions: [...(quote.revisions || []), newRevision],
      updatedAt: new Date().toISOString(),
    };
    const next = quotes.map((q) => q.id === quote.id ? updated : q);
    setQuotes(next);
    // v18: persist to Supabase (was localStorage-only). Fail loudly if DB write fails.
    try {
      // v19c Session N: pass quote.updatedAt as optimistic lock
      await updateQuote(quote.id, updated, quote.updatedAt);
      onToast(`✓ REVISION ${newRevision.revNumber + 1} SAVED`);
    } catch (e) {
      if (e?.code === "CONCURRENT_EDIT") {
        onToast("⚠ SOMEONE ELSE EDITED THIS QUOTE — RELOAD");
        setQuotes(quotes);  // revert local state
      } else {
        console.error("saveQuote:", e);
        onToast("⚠ SAVE FAILED — CHANGES LOCAL ONLY. CHECK CONNECTION.");
      }
    }
    setDirty(false);
    setRevReason("");
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", letterSpacing: "0.1em" }}>QUOTE</div>
            <h3 className="fbt-display" style={{ fontSize: 20, margin: "2px 0 0" }}>{quote.name}{quote.company ? ` · ${quote.company}` : ""}</h3>
            <div className="fbt-mono" style={{ fontSize: 10, color: "#D6D3D1", marginTop: 2 }}>
              {fmtDate(quote.submittedAt)} · {quote.service || "—"} · rev {(quote.revisions?.length || 0) + 1}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 14 }}>

          {/* Converted banner */}
          {linkedOrder && (
            <div style={{ padding: 12, background: "#F0FDF4", border: "2px solid var(--good)" }}>
              <div className="fbt-mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--good)" }}>
                ✓ CONVERTED TO ORDER #{linkedOrder.code}
              </div>
              <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 4 }}>
                {quote.convertedAt ? new Date(quote.convertedAt).toLocaleDateString() : "—"} · {linkedOrder.jobName}
              </div>
            </div>
          )}

          {/* Status */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <div>
              <label className="fbt-label">Status</label>
              <select className="fbt-select" value={draft.status || "new"} onChange={(e) => updateField("status", e.target.value)}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="won">Won / Accepted</option>
                <option value="lost">Lost</option>
                {quote.convertedToOrderId && <option value="converted">Converted</option>}
              </select>
            </div>
            <div>
              <label className="fbt-label">Need Date</label>
              <input className="fbt-input" type="date" value={draft.needDate || ""} onChange={(e) => updateField("needDate", e.target.value)} />
            </div>
          </div>

          {/* Contact + job details */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <div><label className="fbt-label">Name</label><input className="fbt-input" value={draft.name || ""} onChange={(e) => updateField("name", e.target.value)} /></div>
            <div><label className="fbt-label">Company</label><input className="fbt-input" value={draft.company || ""} onChange={(e) => updateField("company", e.target.value)} /></div>
            <div><label className="fbt-label">Email</label><input className="fbt-input" value={draft.email || ""} onChange={(e) => updateField("email", e.target.value)} /></div>
            <div><label className="fbt-label">Phone</label><input className="fbt-input" value={draft.phone || ""} onChange={(e) => updateField("phone", e.target.value)} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label className="fbt-label">Pickup</label><input className="fbt-input" value={draft.pickup || ""} onChange={(e) => updateField("pickup", e.target.value)} /></div>
            <div><label className="fbt-label">Dropoff</label><input className="fbt-input" value={draft.dropoff || ""} onChange={(e) => updateField("dropoff", e.target.value)} /></div>
            <div><label className="fbt-label">Material</label><input className="fbt-input" value={draft.material || ""} onChange={(e) => updateField("material", e.target.value)} /></div>
            <div><label className="fbt-label">Quantity / Loads</label><input className="fbt-input" value={draft.quantity || ""} onChange={(e) => updateField("quantity", e.target.value)} /></div>
          </div>
          <div>
            <label className="fbt-label">Notes</label>
            <textarea className="fbt-textarea" value={draft.notes || ""} onChange={(e) => updateField("notes", e.target.value)} />
          </div>

          {/* Revision reason (only visible if dirty) */}
          {dirty && (
            <div style={{ padding: 10, background: "#FEF3C7", border: "2px solid var(--hazard)" }}>
              <label className="fbt-label" style={{ color: "var(--hazard-deep)" }}>
                CHANGE REASON (why are you revising this quote?)
              </label>
              <input
                className="fbt-input"
                value={revReason}
                onChange={(e) => setRevReason(e.target.value)}
                placeholder="e.g. Customer requested rate adjustment · added tonnage"
              />
            </div>
          )}

          {/* Revision history */}
          {(quote.revisions?.length || 0) > 0 && (
            <div style={{ border: "1.5px solid var(--steel)", padding: 12 }}>
              <div
                style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onClick={() => setShowRevisions(!showRevisions)}
              >
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.1em" }}>
                  ▸ REVISION HISTORY ({quote.revisions.length} PRIOR VERSION{quote.revisions.length !== 1 ? "S" : ""})
                </div>
                <ChevronDown size={14} style={{ transform: showRevisions ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
              </div>
              {showRevisions && (
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  {[...quote.revisions].reverse().map((rev, idx) => (
                    <div key={idx} style={{ padding: 10, background: "#F5F5F4", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        REV {rev.revNumber} · {new Date(rev.savedAt).toLocaleString()}
                      </div>
                      <div style={{ color: "var(--concrete)", marginBottom: 4 }}>"{rev.changeReason || "(no reason)"}"</div>
                      <div style={{ fontSize: 10 }}>
                        {rev.snapshot.material ? `Material: ${rev.snapshot.material} · ` : ""}
                        {rev.snapshot.pickup ? `Pickup: ${rev.snapshot.pickup} · ` : ""}
                        {rev.snapshot.dropoff ? `Dropoff: ${rev.snapshot.dropoff} · ` : ""}
                        {rev.snapshot.quantity ? `Qty: ${rev.snapshot.quantity} · ` : ""}
                        Status: {rev.snapshot.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dirty && (
              <button onClick={saveRevision} className="btn-primary">
                <Save size={14} /> SAVE AS NEW REVISION
              </button>
            )}
            {/* Convert to Order — only on "won" status, not already converted */}
            {(draft.status === "won" || quote.status === "won") && !quote.convertedToOrderId && (
              <button
                onClick={() => onConvertToOrder(quote)}
                className="btn-primary"
                style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}
              >
                <ArrowRight size={14} /> CONVERT TO ORDER
              </button>
            )}
            {/* Show warning if trying to convert non-won quote */}
            {!quote.convertedToOrderId && draft.status !== "won" && quote.status !== "won" && (
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", alignSelf: "center" }}>
                ▸ MARK AS WON FIRST TO ENABLE CONVERT
              </div>
            )}
            <button onClick={onClose} className="btn-ghost">CLOSE</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const QuotesTab = ({ quotes, setQuotes, dispatches = [], setDispatches, contacts = [], projects = [], onJumpTab, onToast }) => {
  const [viewingQuote, setViewingQuote] = useState(null);
  const [pendingConversion, setPendingConversion] = useState(null); // quote being converted

  const updateStatus = async (id, status) => {
    const current = quotes.find((q) => q.id === id);
    const next = quotes.map((q) => q.id === id ? { ...q, status } : q);
    setQuotes(next);
    // v18: persist to Supabase. Fail loudly if DB write fails.
    try {
      // v19c Session N: optimistic lock
      await updateQuote(id, { status }, current?.updatedAt);
      // v20 Session O: audit log
      if (current && current.status !== status) {
        logAudit({
          actionType: "quote.status_change",
          entityType: "quote", entityId: id,
          entityLabel: current.company || current.contactName || "Quote",
          before: { status: current.status },
          after: { status },
        });
      }
      onToast(`QUOTE ${status.toUpperCase()}`);
    } catch (e) {
      if (e?.code === "CONCURRENT_EDIT") {
        onToast("⚠ SOMEONE ELSE EDITED THIS QUOTE — RELOAD");
        setQuotes(quotes);  // revert
        return;
      }
      console.error("updateStatus:", e);
      onToast("⚠ STATUS UPDATE FAILED — LOCAL ONLY");
    }
  };
  const remove = async (id) => {
    if (!confirm("Delete this quote? Revision history will be lost.")) return;
    // v18 FIX: await the DB soft-delete FIRST, then update local state.
    // Previous version did optimistic removal first → realtime subscription could re-fetch
    // before the DELETE landed, putting the quote back in state.
    try {
      await deleteQuote(id, { deletedBy: "admin", reason: "" });
      // Only remove from local state after DB confirms soft-delete
      const next = quotes.filter((q) => q.id !== id);
      setQuotes(next);
      onToast("QUOTE DELETED");
    } catch (e) {
      console.error("removeQuote:", e);
      onToast("⚠ DELETE FAILED — QUOTE STILL ACTIVE");
    }
  };

  // Convert to Order — uses the pending-conversion state to trigger the order form pre-fill
  const handleConvert = (quote) => {
    // Try to match customer by email/phone/name against existing customer contacts
    const customer = contacts.find((c) =>
      c.type === "customer" && (
        (quote.email && c.email && c.email.toLowerCase() === quote.email.toLowerCase()) ||
        (quote.phone && c.phone && c.phone.replace(/[^0-9]/g, "") === String(quote.phone).replace(/[^0-9]/g, "")) ||
        (quote.company && c.companyName && c.companyName.toLowerCase() === quote.company.toLowerCase())
      )
    );

    // Pre-filled order draft — user still needs to add date + truck count
    const orderDraft = {
      date: quote.needDate || new Date().toISOString().slice(0, 10),
      jobName: quote.company ? `${quote.company} — ${quote.material || quote.service || "Hauling"}` : (quote.service || "Hauling Job"),
      clientId: customer?.id || "",
      clientName: customer?.companyName || quote.company || quote.name || "",
      pickup: quote.pickup || "",
      dropoff: quote.dropoff || "",
      material: quote.material || "",
      trucksExpected: 1,
      notes: `Converted from quote submitted ${quote.submittedAt ? new Date(quote.submittedAt).toLocaleDateString() : "—"}.${quote.notes ? "\n\nOriginal quote notes: " + quote.notes : ""}`,
      fromQuoteId: quote.id,
    };

    setPendingConversion({ quote, orderDraft });
    setViewingQuote(null);
    onToast("QUOTE LOADED — FILL IN DATE + TRUCK COUNT & SAVE");
  };

  // When user completes the conversion (clicks save in the embedded form)
  const finalizeConversion = async (newOrder) => {
    if (!pendingConversion) return;
    const { quote } = pendingConversion;
    // Stamp the quote as converted
    const updatedQuote = {
      ...quote,
      status: "converted",
      convertedToOrderId: newOrder.id,
      convertedAt: new Date().toISOString(),
    };
    const next = quotes.map((q) => q.id === quote.id ? updatedQuote : q);
    setQuotes(next);
    // v18: persist conversion to Supabase. Fail loudly if DB write fails.
    try {
      // v19c Session N: optimistic lock
      await updateQuote(quote.id, updatedQuote, quote.updatedAt);
      // v20 Session O: audit log
      logAudit({
        actionType: "quote.convert",
        entityType: "quote", entityId: quote.id,
        entityLabel: quote.company || quote.contactName || "Quote",
        metadata: {
          newOrderCode: newOrder.code,
          newOrderId: newOrder.id,
          customer: quote.company || quote.contactName,
        },
      });
      onToast(`✓ QUOTE CONVERTED → ORDER #${newOrder.code}`);
    } catch (e) {
      if (e?.code === "CONCURRENT_EDIT") {
        onToast("⚠ SOMEONE ELSE EDITED THIS QUOTE — RELOAD");
        setQuotes(quotes);  // revert
        setPendingConversion(null);
        return;
      }
      console.error("finalizeConversion:", e);
      onToast("⚠ QUOTE CONVERTED LOCALLY — SYNC FAILED. CHECK CONNECTION.");
    }
    setPendingConversion(null);
  };

  const byStatus = {
    new: quotes.filter((q) => q.status === "new"),
    contacted: quotes.filter((q) => q.status === "contacted"),
    won: quotes.filter((q) => q.status === "won"),
    converted: quotes.filter((q) => q.status === "converted"),
    lost: quotes.filter((q) => q.status === "lost"),
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {viewingQuote && (
        <QuoteDetailModal
          quote={viewingQuote}
          dispatches={dispatches}
          setQuotes={setQuotes}
          quotes={quotes}
          onConvertToOrder={handleConvert}
          onClose={() => setViewingQuote(null)}
          onToast={onToast}
        />
      )}

      {pendingConversion && (
        <QuoteConversionForm
          quote={pendingConversion.quote}
          draft={pendingConversion.orderDraft}
          dispatches={dispatches}
          setDispatches={setDispatches}
          projects={projects}
          contacts={contacts}
          onSave={finalizeConversion}
          onCancel={() => setPendingConversion(null)}
          onToast={onToast}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {[
          { l: "New", v: byStatus.new.length, c: "var(--hazard)", fg: "var(--steel)" },
          { l: "Contacted", v: byStatus.contacted.length, c: "#FFF", fg: "var(--steel)" },
          { l: "Won", v: byStatus.won.length, c: "var(--good)", fg: "#FFF" },
          { l: "Converted", v: byStatus.converted.length, c: "var(--steel)", fg: "var(--cream)" },
          { l: "Lost", v: byStatus.lost.length, c: "var(--concrete)", fg: "#FFF" },
        ].map((s, i) => (
          <div key={i} className="fbt-card" style={{ padding: 20, background: s.c, color: s.fg }}>
            <div className="stat-num" style={{ color: s.fg }}>{s.v}</div>
            <div className="stat-label" style={{ color: s.fg === "#FFF" || s.fg === "var(--cream)" ? "#E7E5E4" : "var(--concrete)" }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div className="fbt-card" style={{ padding: 0 }}>
        <div style={{ padding: "18px 24px", borderBottom: "2px solid var(--steel)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 24, background: "var(--hazard)" }} />
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0 }}>INBOUND QUOTE REQUESTS</h3>
        </div>
        {quotes.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--concrete)" }}>
            <AlertCircle size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div className="fbt-mono" style={{ fontSize: 13 }}>NO INBOUND REQUESTS YET</div>
          </div>
        ) : (
          <div style={{ padding: 24, display: "grid", gap: 16 }}>
            {quotes.map((q) => {
              const linkedOrder = q.convertedToOrderId ? dispatches.find((d) => d.id === q.convertedToOrderId) : null;
              const bg = q.status === "converted" ? "#F0FDF4" : q.status === "new" ? "#FEF3C7" : "#FFF";
              const revCount = q.revisions?.length || 0;
              return (
                <div key={q.id} style={{ border: "2px solid var(--steel)", padding: 20, background: bg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        <span className="fbt-display" style={{ fontSize: 18 }}>{q.name}</span>
                        {q.company && <span style={{ color: "var(--concrete)", fontSize: 14 }}>· {q.company}</span>}
                        {revCount > 0 && (
                          <span className="chip" style={{ background: "var(--steel)", color: "var(--cream)", fontSize: 9, padding: "2px 7px" }}>
                            REV {revCount + 1}
                          </span>
                        )}
                      </div>
                      <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {fmtDate(q.submittedAt)} · {q.service} {q.needDate && `· needed ${fmtDate(q.needDate)}`}
                      </div>
                      {linkedOrder && (
                        <div
                          onClick={() => onJumpTab && onJumpTab("dispatches", linkedOrder.id)}
                          style={{ marginTop: 6, padding: "4px 8px", background: "var(--good)", color: "#FFF", display: "inline-block", fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", cursor: "pointer", fontWeight: 700 }}
                        >
                          ✓ CONVERTED → ORDER #{linkedOrder.code} ▸
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: "6px 10px", fontSize: 11 }}
                        onClick={() => setViewingQuote(q)}
                      >
                        <Eye size={11} style={{ marginRight: 4 }} /> VIEW / EDIT
                      </button>
                      {!q.convertedToOrderId && (
                        <select className="fbt-select" style={{ padding: "6px 10px", fontSize: 12, width: "auto" }} value={q.status} onChange={(e) => updateStatus(q.id, e.target.value)}>
                          <option value="new">● New</option>
                          <option value="contacted">◐ Contacted</option>
                          <option value="won">✓ Won</option>
                          <option value="lost">✕ Lost</option>
                        </select>
                      )}
                      {/* Quick Convert button on won quotes */}
                      {q.status === "won" && !q.convertedToOrderId && (
                        <button
                          className="btn-primary"
                          style={{ padding: "6px 10px", fontSize: 11, background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}
                          onClick={() => handleConvert(q)}
                        >
                          <ArrowRight size={11} style={{ marginRight: 4 }} /> CONVERT
                        </button>
                      )}
                      <button className="btn-danger" onClick={() => remove(q.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
                    {q.email && <div><span style={{ color: "var(--concrete)" }}>EMAIL ▸</span> {q.email}</div>}
                    {q.phone && <div><span style={{ color: "var(--concrete)" }}>PHONE ▸</span> {q.phone}</div>}
                    {q.pickup && <div><span style={{ color: "var(--concrete)" }}>PICKUP ▸</span> {q.pickup}</div>}
                    {q.dropoff && <div><span style={{ color: "var(--concrete)" }}>DROPOFF ▸</span> {q.dropoff}</div>}
                    {q.material && <div><span style={{ color: "var(--concrete)" }}>MATERIAL ▸</span> {q.material}</div>}
                    {q.quantity && <div><span style={{ color: "var(--concrete)" }}>QTY ▸</span> {q.quantity}</div>}
                  </div>
                  {q.notes && <div style={{ marginTop: 12, padding: 10, background: "#F5F5F4", fontSize: 13, borderLeft: "3px solid var(--hazard)" }}>{q.notes}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ========== QUOTE CONVERSION FORM ==========
// Simple modal form focused on the 2 required fields (date + truck count) + optional rate
const QuoteConversionForm = ({ quote, draft, dispatches, setDispatches, projects, contacts, onSave, onCancel, onToast }) => {
  const [form, setForm] = useState({
    ...draft,
    ratePerHour: "142",
    ratePerTon: "",
    projectId: null,
    subContractor: "",
    subContractorId: "",
    quarryId: null,
  });

  const customers = contacts.filter((c) => c.type === "customer");
  const availableProjects = form.clientId
    ? projects.filter((p) => String(p.customerId) === String(form.clientId))
    : projects;

  const save = async () => {
    if (!form.jobName) { onToast("JOB NAME REQUIRED"); return; }
    if (!form.date) { onToast("DATE REQUIRED"); return; }
    if (!Number(form.trucksExpected) || Number(form.trucksExpected) < 1) { onToast("ENTER # OF TRUCKS"); return; }

    // Generate a unique code
    const year = new Date().getFullYear();
    const existing = dispatches.filter((d) => d.code?.startsWith(`${year}-`));
    const maxN = existing.reduce((m, d) => {
      const n = parseInt(String(d.code).split("-")[1], 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    const code = `${year}-${String(maxN + 1).padStart(4, "0")}`;

    const newOrder = {
      id: "temp-" + Date.now(),
      code,
      ...form,
      trucksExpected: Number(form.trucksExpected),
      ratePerHour: form.ratePerHour ? Number(form.ratePerHour) : null,
      ratePerTon: form.ratePerTon ? Number(form.ratePerTon) : null,
      assignments: [],
      assignedDriverIds: [],
      assignedDriverNames: [],
      status: "open",
      createdAt: new Date().toISOString(),
    };

    const next = [newOrder, ...dispatches];
    try {
      await setDispatches(next);
      // Wait briefly so Supabase returns the real id, then finalize conversion
      setTimeout(async () => {
        // Find the actual saved order (code-matched)
        const saved = dispatches.find((d) => d.code === code) || newOrder;
        await onSave(saved);
      }, 600);
      onToast(`✓ ORDER #${code} CREATED`);
    } catch (e) {
      console.error(e);
      onToast("CONVERSION FAILED");
    }
  };

  return (
    <div className="modal-bg" onClick={onCancel} style={{ zIndex: 105 }}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div style={{ padding: "18px 22px", background: "var(--good)", color: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em" }}>CONVERT QUOTE → ORDER</div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>{quote.name}{quote.company ? ` · ${quote.company}` : ""}</h3>
          </div>
          <button onClick={onCancel} style={{ background: "transparent", border: "none", color: "#FFF", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 12 }}>
          <div style={{ padding: 10, background: "#FEF3C7", border: "2px solid var(--hazard)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--hazard-deep)" }}>
            ⚠ FILL IN <strong>DATE</strong> AND <strong>TRUCKS EXPECTED</strong> TO CONTINUE · OTHER FIELDS PRE-FILLED FROM QUOTE
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label" style={{ color: "var(--hazard-deep)" }}>Date * (required)</label>
              <input className="fbt-input" type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ borderColor: "var(--hazard)" }} />
            </div>
            <div>
              <label className="fbt-label" style={{ color: "var(--hazard-deep)" }}>Trucks Expected * (required)</label>
              <input className="fbt-input" type="number" min="1" value={form.trucksExpected} onChange={(e) => setForm({ ...form, trucksExpected: e.target.value })} style={{ borderColor: "var(--hazard)" }} />
            </div>
          </div>

          <div>
            <label className="fbt-label">Job Name</label>
            <input className="fbt-input" value={form.jobName} onChange={(e) => setForm({ ...form, jobName: e.target.value })} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Customer</label>
              <select className="fbt-select" value={form.clientId || ""} onChange={(e) => {
                const id = e.target.value;
                const c = customers.find((x) => String(x.id) === id);
                setForm({ ...form, clientId: c?.id || "", clientName: c?.companyName || "" });
              }}>
                <option value="">— {form.clientName || "No customer link"} —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.contactName}</option>)}
              </select>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4 }}>
                ▸ {form.clientId ? "LINKED TO CUSTOMER CONTACT" : "NO CUSTOMER CONTACT MATCHED — CREATE ONE IN CONTACTS FOR FUTURE USE"}
              </div>
            </div>
            <div>
              <label className="fbt-label">Project (optional)</label>
              <select className="fbt-select" value={form.projectId || ""} onChange={(e) => setForm({ ...form, projectId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— None —</option>
                {availableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.defaultRate ? ` · $${p.defaultRate}/hr` : ""}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Pickup</label>
              <input className="fbt-input" value={form.pickup || ""} onChange={(e) => setForm({ ...form, pickup: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Dropoff</label>
              <input className="fbt-input" value={form.dropoff || ""} onChange={(e) => setForm({ ...form, dropoff: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
            <div>
              <label className="fbt-label">Material</label>
              <input className="fbt-input" value={form.material || ""} onChange={(e) => setForm({ ...form, material: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Rate $/hr</label>
              <input className="fbt-input" type="number" value={form.ratePerHour || ""} onChange={(e) => setForm({ ...form, ratePerHour: e.target.value })} />
            </div>
            <div>
              <label className="fbt-label">Rate $/ton</label>
              <input className="fbt-input" type="number" step="0.01" value={form.ratePerTon || ""} onChange={(e) => setForm({ ...form, ratePerTon: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="fbt-label">Notes</label>
            <textarea className="fbt-textarea" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", padding: 10, background: "#F5F5F4" }}>
            ▸ AFTER SAVING: ADD SUBS / DRIVERS ON THE ORDERS TAB · SHARE DRIVER LINKS · MARK AS DISPATCHED WHEN READY
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} className="btn-primary" style={{ background: "var(--good)", color: "#FFF", borderColor: "var(--good)" }}>
              <CheckCircle2 size={16} /> CREATE ORDER FROM QUOTE
            </button>
            <button onClick={onCancel} className="btn-ghost">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ========== PRINT-BASED INVOICE GENERATION ==========
// Opens a styled print window — user hits Print and saves as PDF from browser dialog.
// Works on mobile (Safari/Chrome both support "Save as PDF" in print dialog).
