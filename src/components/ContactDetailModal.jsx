import { useMemo } from "react";
import { Edit2, Link2, Lock, Mail, MessageSquare, RefreshCw, ShieldCheck, Trash2, X } from "lucide-react";
import { fmtDate, buildSMSLink, buildEmailLink } from "../utils";

export const ContactDetailModal = ({ contact, dispatches, freightBills, invoices = [], onEdit, onDelete, onClose, onToast, onSaveContact }) => {
  const history = useMemo(() => {
    return dispatches.filter((d) => d.subContractorId === contact.id || (d.subContractor && contact.companyName && d.subContractor.toLowerCase() === contact.companyName.toLowerCase()));
  }, [dispatches, contact]);

  const totalFBs = history.reduce((s, d) => s + freightBills.filter((fb) => fb.dispatchId === d.id).length, 0);
  const totalTons = history.reduce((s, d) => {
    return s + freightBills.filter((fb) => fb.dispatchId === d.id).reduce((ss, fb) => ss + (Number(fb.tonnage) || 0), 0);
  }, 0);

  // Audit #7: roll up invoice + revenue for the contact. For customers we
  // sum invoices billed-to them; for subs we sum invoices that included
  // FBs from any of their dispatches. Both bring "are they current?" and
  // "how much have they earned/owed" into one view without leaving the
  // modal.
  const isCustomer = contact?.type === "customer";
  const linkedInvoices = useMemo(() => {
    if (isCustomer) {
      return invoices.filter((i) => i.billToContactId === contact.id);
    }
    // Sub / driver: invoices whose FBs come from dispatches in this contact's history
    const dispatchIds = new Set(history.map((d) => d.id));
    return invoices.filter((inv) => (inv.freightBillIds || []).some((fbId) => {
      const fb = freightBills.find((f) => f.id === fbId);
      return fb && dispatchIds.has(fb.dispatchId);
    }));
  }, [invoices, history, freightBills, isCustomer, contact.id]);
  const totalBilled = linkedInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalPaid = linkedInvoices.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0);
  const totalOutstanding = totalBilled - totalPaid;

  // Portal link generation for customer contacts
  const generateToken = () => {
    // Browser-safe hex token (48 chars)
    const arr = new Uint8Array(24);
    (crypto && crypto.getRandomValues) ? crypto.getRandomValues(arr) : arr.forEach((_, i) => arr[i] = Math.floor(Math.random() * 256));
    return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const enablePortal = async () => {
    if (!onSaveContact) return;
    const token = contact.portalToken || generateToken();
    await onSaveContact({ ...contact, portalToken: token, portalEnabled: true });
    onToast("PORTAL ENABLED — LINK READY");
  };

  const disablePortal = async () => {
    if (!onSaveContact) return;
    if (!confirm("Disable customer portal access? Their link will stop working.")) return;
    await onSaveContact({ ...contact, portalEnabled: false });
    onToast("PORTAL DISABLED");
  };

  const regenerateToken = async () => {
    if (!onSaveContact) return;
    if (!confirm("Regenerate portal token? Their CURRENT link will stop working and you'll need to send the new one.")) return;
    await onSaveContact({ ...contact, portalToken: generateToken(), portalEnabled: true });
    onToast("NEW LINK GENERATED");
  };

  const portalUrl = contact.portalToken
    ? `${window.location.origin}${window.location.pathname}#/customer/${contact.portalToken}`
    : null;
  // v23 Session Y
  const payPortalUrl = contact.portalToken
    ? `${window.location.origin}${window.location.pathname}#/pay/${contact.portalToken}`
    : null;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard)" }}>
              {contact.type === "sub" ? "SUB HAULER"
                : contact.type === "customer" ? "CUSTOMER"
                : contact.type === "broker" ? "BROKER"
                : "DRIVER"}{contact.favorite && " · ★ PREFERRED"}
            </div>
            <h3 className="fbt-display" style={{ fontSize: 22, margin: "4px 0 0" }}>{contact.companyName || contact.contactName}</h3>
            {contact.contactName && contact.companyName && (
              <div className="fbt-mono" style={{ fontSize: 12, color: "#D6D3D1", marginTop: 4 }}>c/o {contact.contactName}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onEdit} className="btn-ghost" style={{ color: "var(--cream)", borderColor: "var(--cream)", padding: "6px 12px", fontSize: 11 }}><Edit2 size={12} /></button>
            <button onClick={onDelete} className="btn-danger" style={{ color: "var(--hazard)", borderColor: "var(--hazard)" }}><Trash2 size={12} /></button>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* Contact info */}
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ CONTACT INFO</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 20, fontSize: 13 }}>
            {contact.phone && (
              <div><strong>PHONE:</strong> <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} style={{ color: "var(--hazard-deep)" }}>{contact.phone}</a></div>
            )}
            {contact.phone2 && (
              <div><strong>ALT:</strong> <a href={`tel:${contact.phone2.replace(/[^\d+]/g, "")}`} style={{ color: "var(--hazard-deep)" }}>{contact.phone2}</a></div>
            )}
            {contact.email && (
              <div><strong>EMAIL:</strong> <a href={`mailto:${contact.email}`} style={{ color: "var(--hazard-deep)" }}>{contact.email}</a></div>
            )}
            {contact.address && <div style={{ gridColumn: "1 / -1" }}><strong>ADDRESS:</strong> {contact.address}</div>}
          </div>

          {(contact.typicalTrucks || contact.rateNotes || contact.usdot || contact.insurance) && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ OPERATIONAL</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 20, fontSize: 13 }}>
                {contact.typicalTrucks && <div><strong>TYPICAL TRUCKS:</strong> {contact.typicalTrucks}</div>}
                {contact.rateNotes && <div><strong>RATE:</strong> {contact.rateNotes}</div>}
                {contact.usdot && <div style={{ gridColumn: "1 / -1" }}><strong>USDOT/MC:</strong> {contact.usdot}</div>}
                {contact.insurance && <div style={{ gridColumn: "1 / -1" }}><strong>INSURANCE:</strong> {contact.insurance}</div>}
              </div>
            </>
          )}

          {contact.notes && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ NOTES</div>
              <div style={{ padding: 12, background: "#FEF3C7", borderLeft: "3px solid var(--hazard)", fontSize: 13, marginBottom: 20, whiteSpace: "pre-wrap" }}>
                {contact.notes}
              </div>
            </>
          )}

          {/* Customer Portal (only for type=customer) */}
          {contact.type === "customer" && onSaveContact && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ CUSTOMER PORTAL ACCESS</div>
              <div style={{ padding: 14, background: contact.portalEnabled ? "#F0FDF4" : "#F5F5F4", border: "2px solid " + (contact.portalEnabled ? "var(--good)" : "var(--concrete)"), marginBottom: 20 }}>
                {!contact.portalEnabled ? (
                  <>
                    <div className="fbt-mono" style={{ fontSize: 11, marginBottom: 10 }}>PORTAL DISABLED</div>
                    <p style={{ fontSize: 12, color: "var(--concrete)", margin: "0 0 10px" }}>
                      Enable a view-only portal link that lets this customer see their approved freight bills, scale tickets, and orders.
                    </p>
                    <button onClick={enablePortal} className="btn-primary" style={{ fontSize: 11 }}>
                      <ShieldCheck size={14} /> ENABLE PORTAL
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      <span className="chip" style={{ background: "var(--good)", color: "#FFF", fontSize: 9, padding: "2px 8px" }}>● ACTIVE</span>
                      <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>VIEW-ONLY · APPROVED FBs ONLY</span>
                    </div>
                    <code style={{ display: "block", padding: "8px 10px", background: "#FFF", border: "1px solid var(--steel)", fontSize: 10, wordBreak: "break-all", marginBottom: 10 }}>
                      {portalUrl}
                    </code>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 10, padding: "6px 10px" }}
                        onClick={async () => {
                          try { await navigator.clipboard.writeText(portalUrl); onToast("PORTAL LINK COPIED"); }
                          catch { onToast("COPY FAILED"); }
                        }}
                      >
                        <Link2 size={11} style={{ marginRight: 3 }} /> COPY LINK
                      </button>
                      {contact.phone && (
                        <a
                          href={buildSMSLink(contact.phone, `Hi ${contact.contactName || contact.companyName} — here's your 4 Brothers Trucking portal link to view your freight bills and scale tickets: ${portalUrl}`) || "#"}
                          className="btn-ghost"
                          style={{ fontSize: 10, padding: "6px 10px", textDecoration: "none" }}
                        >
                          <MessageSquare size={11} style={{ marginRight: 3 }} /> TEXT
                        </a>
                      )}
                      {contact.email && (
                        <a
                          href={buildEmailLink(contact.email, `Your 4 Brothers Trucking Portal Access`, `Hi ${contact.contactName || contact.companyName},\n\nYou can now view your freight bills and scale tickets any time at this link:\n\n${portalUrl}\n\nThanks,\n4 Brothers Trucking, LLC`) || "#"}
                          className="btn-ghost"
                          style={{ fontSize: 10, padding: "6px 10px", textDecoration: "none" }}
                        >
                          <Mail size={11} style={{ marginRight: 3 }} /> EMAIL
                        </a>
                      )}
                      <button className="btn-ghost" style={{ fontSize: 10, padding: "6px 10px" }} onClick={regenerateToken}>
                        <RefreshCw size={11} style={{ marginRight: 3 }} /> NEW LINK
                      </button>
                      <button className="btn-danger" style={{ fontSize: 10, padding: "6px 10px" }} onClick={disablePortal}>
                        <Lock size={11} style={{ marginRight: 3 }} /> DISABLE
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* v23 Session Y: Driver/Sub Pay Portal */}
          {(contact.type === "driver" || contact.type === "sub" || contact.type === "subcontractor") && onSaveContact && (
            <>
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>▸ PAY PORTAL ACCESS</div>
              <div style={{ padding: 14, background: contact.portalEnabled ? "#F0FDF4" : "#F5F5F4", border: "2px solid " + (contact.portalEnabled ? "var(--good)" : "var(--concrete)"), marginBottom: 20 }}>
                {!contact.portalEnabled ? (
                  <>
                    <div className="fbt-mono" style={{ fontSize: 11, marginBottom: 10 }}>PAY PORTAL DISABLED</div>
                    <p style={{ fontSize: 12, color: "var(--concrete)", margin: "0 0 10px" }}>
                      Enable a private link that lets this {contact.type === "driver" ? "driver" : "sub"} see their pay for the last 90 days — unpaid FBs, paid history, pay statement PDFs. They only see their own work.
                    </p>
                    <button onClick={enablePortal} className="btn-primary" style={{ fontSize: 11 }}>
                      <ShieldCheck size={14} /> ENABLE PAY PORTAL
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      <span className="chip" style={{ background: "var(--good)", color: "#FFF", fontSize: 9, padding: "2px 8px" }}>● ACTIVE</span>
                      <span className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>VIEW-ONLY · LAST 90 DAYS · THEIR PAY ONLY</span>
                    </div>
                    <code style={{ display: "block", padding: "8px 10px", background: "#FFF", border: "1px solid var(--steel)", fontSize: 10, wordBreak: "break-all", marginBottom: 10 }}>
                      {payPortalUrl}
                    </code>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 10, padding: "6px 10px" }}
                        onClick={async () => {
                          try { await navigator.clipboard.writeText(payPortalUrl); onToast("PAY PORTAL LINK COPIED"); }
                          catch { onToast("COPY FAILED"); }
                        }}
                      >
                        <Link2 size={11} style={{ marginRight: 3 }} /> COPY LINK
                      </button>
                      {contact.phone && (
                        <a
                          href={buildSMSLink(contact.phone, `Hi ${contact.contactName || contact.companyName} — your 4 Brothers pay portal: ${payPortalUrl}`) || "#"}
                          className="btn-ghost"
                          style={{ fontSize: 10, padding: "6px 10px", textDecoration: "none" }}
                        >
                          <MessageSquare size={11} style={{ marginRight: 3 }} /> TEXT
                        </a>
                      )}
                      {contact.email && (
                        <a
                          href={buildEmailLink(contact.email, `Your 4 Brothers Pay Portal`, `Hi ${contact.contactName || contact.companyName},\n\nCheck your pay any time at this private link:\n\n${payPortalUrl}\n\nShows last 90 days of your pay activity — unpaid, paid, statement PDFs. Don't share the link.\n\nThanks,\n4 Brothers Trucking, LLC`) || "#"}
                          className="btn-ghost"
                          style={{ fontSize: 10, padding: "6px 10px", textDecoration: "none" }}
                        >
                          <Mail size={11} style={{ marginRight: 3 }} /> EMAIL
                        </a>
                      )}
                      <button className="btn-ghost" style={{ fontSize: 10, padding: "6px 10px" }} onClick={regenerateToken}>
                        <RefreshCw size={11} style={{ marginRight: 3 }} /> NEW LINK
                      </button>
                      <button className="btn-danger" style={{ fontSize: 10, padding: "6px 10px" }} onClick={disablePortal}>
                        <Lock size={11} style={{ marginRight: 3 }} /> DISABLE
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Audit #7: invoice + revenue rollup. Only show when there's
              data — keeps the modal clean for new contacts. */}
          {linkedInvoices.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 14, padding: 12, background: "#F5F5F4", border: "1px solid var(--line)" }}>
              <div>
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>INVOICES</div>
                <div className="fbt-display" style={{ fontSize: 18 }}>{linkedInvoices.length}</div>
              </div>
              <div>
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>{isCustomer ? "BILLED" : "INVOICED"}</div>
                <div className="fbt-display" style={{ fontSize: 18 }}>${totalBilled.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <div>
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>PAID</div>
                <div className="fbt-display" style={{ fontSize: 18, color: "var(--good)" }}>${totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              {totalOutstanding > 0.01 && (
                <div>
                  <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>OUTSTANDING</div>
                  <div className="fbt-display" style={{ fontSize: 18, color: "var(--safety)" }}>${totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
              )}
            </div>
          )}

          {/* Job history */}
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", marginBottom: 10 }}>
            ▸ JOB HISTORY ({history.length} DISPATCH{history.length !== 1 ? "ES" : ""} · {totalFBs} FREIGHT BILL{totalFBs !== 1 ? "S" : ""} · {totalTons.toFixed(1)} TONS)
          </div>
          {history.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", border: "2px dashed var(--concrete)", color: "var(--concrete)", fontSize: 13 }}>
              No dispatches with this contact yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {history.slice(0, 10).map((d) => {
                const bills = freightBills.filter((fb) => fb.dispatchId === d.id);
                return (
                  <div key={d.id} style={{ padding: 10, border: "1px solid var(--steel)", background: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
                    <div>
                      <strong>#{d.code}</strong> · {d.jobName} · <span style={{ color: "var(--concrete)" }}>{fmtDate(d.date)}</span>
                    </div>
                    <div style={{ color: bills.length >= d.trucksExpected ? "var(--good)" : "var(--concrete)" }}>
                      {bills.length}/{d.trucksExpected} FBs
                    </div>
                  </div>
                );
              })}
              {history.length > 10 && (
                <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", textAlign: "center", padding: 6 }}>
                  + {history.length - 10} older dispatches
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
