import { useState, useEffect } from "react";
import { CheckCircle2, Trash2, X } from "lucide-react";
import { fmt$, BID_STATUSES, BID_STATUS_MAP, BID_PORTALS } from "../utils";
import { BidDeadlineChip } from "./BidDeadlineChip";
import { useFormDraft } from "../hooks/useFormDraft";

export const BidModal = ({ bid, onSave, onDelete, onClose, onToast }) => {
  const isNew = !bid?.id;
  const initialDraft = bid ? { ...bid } : {
    rfbNumber: "",
    title: "",
    agency: "",
    agencyContactName: "",
    agencyContactEmail: "",
    agencyContactPhone: "",
    sourceUrl: "",
    portal: "",
    preBidMeetingAt: "",
    questionsDueAt: "",
    submissionDueAt: "",
    awardDecisionExpected: "",
    ourSubmittedAt: "",
    estimatedValue: "",
    ourBidAmount: "",
    bondRequired: false,
    bondAmount: "",
    bondType: "",
    ourCostEstimate: "",
    status: "discovered",
    priority: "medium",
    outcomeAt: "",
    winningBidder: "",
    winningBidAmount: "",
    rejectionReason: "",
    lessonsLearned: "",
    notes: "",
    tags: [],
    checklistItems: [],  // v19a: document checklist [{id, label, done, notes}]
  };
  // Only persist drafts for NEW bids — editing an existing one already has
  // the server as source of truth, so draft-restore would be confusing.
  const [draft, setDraft, wasRestored, clearDraft] = useFormDraft("bid:new", initialDraft, isNew);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [checklistInput, setChecklistInput] = useState("");  // v19a: for adding new checklist items

  // Helper: convert "yyyy-mm-dd" from input to ISO timestamp (keep time at start of day local)
  // If value is already ISO, return as-is. If blank, return null.
  const toISOTs = (val) => {
    if (!val) return null;
    if (val.includes("T")) return val;  // already ISO
    return new Date(val + "T12:00:00").toISOString();
  };
  // Inverse: pull yyyy-mm-dd from ISO for <input type="date">
  const fromISOTs = (iso) => {
    if (!iso) return "";
    return new Date(iso).toISOString().slice(0, 10);
  };

  const save = async () => {
    if (!draft.title) { onToast("TITLE REQUIRED"); return; }
    setSaving(true);
    try {
      const payload = {
        ...draft,
        preBidMeetingAt: toISOTs(draft.preBidMeetingAt),
        questionsDueAt: toISOTs(draft.questionsDueAt),
        submissionDueAt: toISOTs(draft.submissionDueAt),
        awardDecisionExpected: toISOTs(draft.awardDecisionExpected),
        ourSubmittedAt: toISOTs(draft.ourSubmittedAt),
        outcomeAt: toISOTs(draft.outcomeAt),
        estimatedValue: draft.estimatedValue === "" ? null : Number(draft.estimatedValue),
        ourBidAmount: draft.ourBidAmount === "" ? null : Number(draft.ourBidAmount),
        bondAmount: draft.bondAmount === "" ? null : Number(draft.bondAmount),
        ourCostEstimate: draft.ourCostEstimate === "" ? null : Number(draft.ourCostEstimate),
        winningBidAmount: draft.winningBidAmount === "" ? null : Number(draft.winningBidAmount),
      };
      await onSave(payload);
      clearDraft();  // saved — drop any persisted restore copy
      onClose();
    } catch (e) {
      console.error("BidModal save:", e);
      onToast("⚠ SAVE FAILED");
    } finally {
      setSaving(false);
    }
  };

  // v18 pattern: keyboard shortcuts. Declared AFTER `save` to avoid the
  // react-hooks/immutability TDZ warning ("Cannot access variable before
  // it is declared") that fired when the handler closed over `save` from
  // above its declaration.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && !saving) onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, draft]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || (draft.tags || []).includes(t)) { setTagInput(""); return; }
    setDraft({ ...draft, tags: [...(draft.tags || []), t] });
    setTagInput("");
  };

  const currentStatus = BID_STATUS_MAP[draft.status] || BID_STATUSES[0];
  const showOutcomeFields = draft.status === "awarded" || draft.status === "rejected";

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 820 }}>
        <div style={{ padding: "18px 22px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard)", letterSpacing: "0.1em" }}>
              {isNew ? "NEW BID" : "EDIT BID"}
              {wasRestored && (
                <span
                  onClick={() => { clearDraft(); setDraft(initialDraft); }}
                  title="Click to discard the restored draft and start fresh"
                  style={{ marginLeft: 8, padding: "2px 6px", background: "var(--good)", color: "#FFF", fontSize: 9, cursor: "pointer", letterSpacing: "0.06em" }}
                >● RESTORED · CLICK TO DISCARD</span>
              )}
            </div>
            <h3 className="fbt-display" style={{ fontSize: 18, margin: "2px 0 0" }}>
              {draft.rfbNumber ? `${draft.rfbNumber} · ` : ""}{draft.title || "Untitled"}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 16, maxHeight: "75vh", overflowY: "auto" }}>

          {/* Status chip + pipeline selector */}
          <div style={{ padding: 12, background: currentStatus.bg, border: `2px solid ${currentStatus.color}` }}>
            <div className="fbt-mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: currentStatus.color, marginBottom: 8, fontWeight: 700 }}>
              ▸ STATUS: {currentStatus.label}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {BID_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setDraft({ ...draft, status: s.value })}
                  style={{
                    padding: "6px 10px",
                    fontSize: 10,
                    fontFamily: "JetBrains Mono, monospace",
                    letterSpacing: "0.05em",
                    fontWeight: 700,
                    background: draft.status === s.value ? s.color : "#FFF",
                    color: draft.status === s.value ? "#FFF" : s.color,
                    border: `1.5px solid ${s.color}`,
                    cursor: "pointer",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 6 }}>
              ▸ {currentStatus.description}
            </div>
          </div>

          {/* Core info */}
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ IDENTIFICATION</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <div>
                <label className="fbt-label">RFB/RFP #</label>
                <input className="fbt-input" value={draft.rfbNumber || ""} onChange={(e) => setDraft({ ...draft, rfbNumber: e.target.value })} placeholder="RFB 26055" />
              </div>
              <div>
                <label className="fbt-label">Title *</label>
                <input className="fbt-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Volcanic Basalt Chip Seal Aggregate Supply" autoFocus />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label className="fbt-label">Agency</label>
              <input className="fbt-input" value={draft.agency || ""} onChange={(e) => setDraft({ ...draft, agency: e.target.value })} placeholder="San Joaquin County Public Works" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <div>
                <label className="fbt-label">Portal</label>
                <select className="fbt-select" value={draft.portal || ""} onChange={(e) => setDraft({ ...draft, portal: e.target.value })}>
                  <option value="">— Select —</option>
                  {BID_PORTALS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="fbt-label">Priority</label>
                <select className="fbt-select" value={draft.priority || "medium"} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label className="fbt-label">Source URL</label>
              <input className="fbt-input" value={draft.sourceUrl || ""} onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })} placeholder="https://publicpurchase.com/..." />
            </div>
          </div>

          {/* Agency contact */}
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ AGENCY CONTACT (OPTIONAL)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="fbt-label">Contact Name</label>
                <input className="fbt-input" value={draft.agencyContactName || ""} onChange={(e) => setDraft({ ...draft, agencyContactName: e.target.value })} />
              </div>
              <div>
                <label className="fbt-label">Email</label>
                <input className="fbt-input" type="email" value={draft.agencyContactEmail || ""} onChange={(e) => setDraft({ ...draft, agencyContactEmail: e.target.value })} />
              </div>
              <div>
                <label className="fbt-label">Phone</label>
                <input className="fbt-input" type="tel" value={draft.agencyContactPhone || ""} onChange={(e) => setDraft({ ...draft, agencyContactPhone: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Deadlines */}
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ DEADLINES</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="fbt-label">Pre-Bid Meeting</label>
                <input type="date" className="fbt-input" value={fromISOTs(draft.preBidMeetingAt)} onChange={(e) => setDraft({ ...draft, preBidMeetingAt: e.target.value })} />
              </div>
              <div>
                <label className="fbt-label">Questions Due</label>
                <input type="date" className="fbt-input" value={fromISOTs(draft.questionsDueAt)} onChange={(e) => setDraft({ ...draft, questionsDueAt: e.target.value })} />
              </div>
              <div>
                <label className="fbt-label">Submission Due ⚠</label>
                <input type="date" className="fbt-input" value={fromISOTs(draft.submissionDueAt)} onChange={(e) => setDraft({ ...draft, submissionDueAt: e.target.value })} />
                {draft.submissionDueAt && <div style={{ marginTop: 4 }}><BidDeadlineChip dueAt={draft.submissionDueAt} /></div>}
              </div>
              <div>
                <label className="fbt-label">Award Decision Expected</label>
                <input type="date" className="fbt-input" value={fromISOTs(draft.awardDecisionExpected)} onChange={(e) => setDraft({ ...draft, awardDecisionExpected: e.target.value })} />
              </div>
              {(draft.status === "submitted" || draft.status === "awarded" || draft.status === "rejected") && (
                <div>
                  <label className="fbt-label">We Submitted On</label>
                  <input type="date" className="fbt-input" value={fromISOTs(draft.ourSubmittedAt)} onChange={(e) => setDraft({ ...draft, ourSubmittedAt: e.target.value })} />
                </div>
              )}
            </div>
          </div>

          {/* Money */}
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ MONEY</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="fbt-label">Agency Estimate $</label>
                <input className="fbt-input" type="number" step="0.01" value={draft.estimatedValue ?? ""} onChange={(e) => setDraft({ ...draft, estimatedValue: e.target.value })} placeholder="500000" />
              </div>
              <div>
                <label className="fbt-label">Our Bid $</label>
                <input className="fbt-input" type="number" step="0.01" value={draft.ourBidAmount ?? ""} onChange={(e) => setDraft({ ...draft, ourBidAmount: e.target.value })} placeholder="485000" />
              </div>
              <div>
                <label className="fbt-label">Our Cost Estimate $</label>
                <input className="fbt-input" type="number" step="0.01" value={draft.ourCostEstimate ?? ""} onChange={(e) => setDraft({ ...draft, ourCostEstimate: e.target.value })} placeholder="360000" />
              </div>
            </div>
            {draft.ourBidAmount && draft.ourCostEstimate && Number(draft.ourBidAmount) > 0 && (
              <div className="fbt-mono" style={{ marginTop: 8, padding: 8, background: "#F0FDF4", border: "1px solid var(--good)", fontSize: 11, color: "var(--good)", fontWeight: 700 }}>
                ▸ PROJECTED MARGIN: {fmt$(Number(draft.ourBidAmount) - Number(draft.ourCostEstimate))}{" "}
                ({((1 - Number(draft.ourCostEstimate) / Number(draft.ourBidAmount)) * 100).toFixed(1)}%)
              </div>
            )}

            <div style={{ marginTop: 12, padding: 10, background: "#FEF3C7", border: "1.5px solid var(--hazard-deep)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                <input type="checkbox" checked={!!draft.bondRequired} onChange={(e) => setDraft({ ...draft, bondRequired: e.target.checked })} />
                Bond required
              </label>
              {draft.bondRequired && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                  <div>
                    <label className="fbt-label">Bond Type</label>
                    <select className="fbt-select" value={draft.bondType || ""} onChange={(e) => setDraft({ ...draft, bondType: e.target.value })}>
                      <option value="">— Select —</option>
                      <option value="bid">Bid bond (5-10%)</option>
                      <option value="performance">Performance bond (100%)</option>
                      <option value="payment">Payment bond (100%)</option>
                      <option value="bid-performance">Bid + Performance</option>
                      <option value="bid-performance-payment">Bid + Performance + Payment</option>
                    </select>
                  </div>
                  <div>
                    <label className="fbt-label">Bond Amount $</label>
                    <input className="fbt-input" type="number" step="0.01" value={draft.bondAmount ?? ""} onChange={(e) => setDraft({ ...draft, bondAmount: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Outcome fields — only when won/lost */}
          {showOutcomeFields && (
            <div>
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ OUTCOME</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="fbt-label">Outcome Date</label>
                  <input type="date" className="fbt-input" value={fromISOTs(draft.outcomeAt)} onChange={(e) => setDraft({ ...draft, outcomeAt: e.target.value })} />
                </div>
                <div>
                  <label className="fbt-label">Winning Bidder</label>
                  <input className="fbt-input" value={draft.winningBidder || ""} onChange={(e) => setDraft({ ...draft, winningBidder: e.target.value })} placeholder="Competitor name" />
                </div>
                <div>
                  <label className="fbt-label">Winning Bid $</label>
                  <input className="fbt-input" type="number" step="0.01" value={draft.winningBidAmount ?? ""} onChange={(e) => setDraft({ ...draft, winningBidAmount: e.target.value })} />
                </div>
              </div>
              {draft.status === "rejected" && (
                <div style={{ marginTop: 10 }}>
                  <label className="fbt-label">Rejection Reason</label>
                  <textarea className="fbt-input" rows={2} value={draft.rejectionReason || ""} onChange={(e) => setDraft({ ...draft, rejectionReason: e.target.value })} placeholder="Lost on price · failed responsiveness check · DBE requirement unmet · ..." />
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <label className="fbt-label">Lessons Learned</label>
                <textarea className="fbt-input" rows={2} value={draft.lessonsLearned || ""} onChange={(e) => setDraft({ ...draft, lessonsLearned: e.target.value })} placeholder="What to do differently next time" />
              </div>
            </div>
          )}

          {/* v19a Session G: Document checklist — required submission items */}
          <div>
            {(() => {
              const items = draft.checklistItems || [];
              const done = items.filter((x) => x.done).length;
              const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
              const allDone = items.length > 0 && done === items.length;

              const addItem = () => {
                const t = checklistInput.trim();
                if (!t) return;
                const newItem = { id: "chk-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7), label: t, done: false, notes: "" };
                setDraft({ ...draft, checklistItems: [...items, newItem] });
                setChecklistInput("");
              };

              const toggle = (id) => {
                setDraft({
                  ...draft,
                  checklistItems: items.map((x) => x.id === id ? { ...x, done: !x.done, doneAt: !x.done ? new Date().toISOString() : null } : x),
                });
              };

              const remove = (id) => {
                setDraft({ ...draft, checklistItems: items.filter((x) => x.id !== id) });
              };

              const addPreset = (labels) => {
                const existing = new Set(items.map((x) => x.label.toLowerCase()));
                const newItems = labels
                  .filter((l) => !existing.has(l.toLowerCase()))
                  .map((label) => ({ id: "chk-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7), label, done: false, notes: "" }));
                if (newItems.length === 0) { onToast("ALREADY ADDED"); return; }
                setDraft({ ...draft, checklistItems: [...items, ...newItems] });
                onToast(`+${newItems.length} ITEMS ADDED`);
              };

              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em" }}>▸ SUBMISSION CHECKLIST</div>
                    {items.length > 0 && (
                      <div className="fbt-mono" style={{ fontSize: 11, fontWeight: 700, color: allDone ? "var(--good)" : done > 0 ? "var(--hazard-deep)" : "var(--concrete)" }}>
                        {done} OF {items.length} · {pct}%{allDone ? " ✓ READY TO SUBMIT" : ""}
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  {items.length > 0 && (
                    <div style={{ width: "100%", height: 4, background: "#E7E5E4", marginBottom: 12, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: allDone ? "var(--good)" : "var(--hazard)", transition: "width 0.3s" }} />
                    </div>
                  )}

                  {/* Checklist items */}
                  {items.length === 0 ? (
                    <div style={{ padding: 10, background: "#F5F5F4", fontSize: 11, color: "var(--concrete)", fontFamily: "JetBrains Mono, monospace", marginBottom: 10 }}>
                      No checklist items yet. Add required submission documents below or use a preset.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
                      {items.map((item) => (
                        <div key={item.id} style={{
                          padding: "8px 10px",
                          background: item.done ? "#F0FDF4" : "#FFF",
                          border: `1.5px solid ${item.done ? "var(--good)" : "var(--steel)"}`,
                          display: "flex", alignItems: "center", gap: 10,
                        }}>
                          <input
                            type="checkbox"
                            checked={!!item.done}
                            onChange={() => toggle(item.id)}
                            style={{ width: 18, height: 18, cursor: "pointer", flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, fontSize: 13, fontFamily: "JetBrains Mono, monospace", color: item.done ? "var(--good)" : "var(--steel)", textDecoration: item.done ? "line-through" : "none" }}>
                            {item.label}
                            {item.done && item.doneAt && (
                              <span style={{ fontSize: 10, color: "var(--concrete)", marginLeft: 8, textDecoration: "none" }}>
                                ✓ {new Date(item.doneAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(item.id)}
                            style={{ background: "transparent", border: "none", color: "var(--safety)", cursor: "pointer", padding: 0 }}
                            title="Remove item"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add item input */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <input
                      className="fbt-input"
                      style={{ flex: 1 }}
                      placeholder="add item (e.g. 'Signed addendum #2', 'Bid bond 10%', 'DBE certification')"
                      value={checklistInput}
                      onChange={(e) => setChecklistInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
                    />
                    <button type="button" onClick={addItem} className="btn-ghost" style={{ padding: "6px 14px", fontSize: 11 }}>ADD</button>
                  </div>

                  {/* Preset packs */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 10 }}>
                    <span className="fbt-mono" style={{ color: "var(--concrete)", letterSpacing: "0.05em", alignSelf: "center" }}>QUICK-ADD:</span>
                    <button type="button" onClick={() => addPreset([
                      "Bid bond",
                      "Price sheet / schedule",
                      "Signed proposal form",
                      "Certification forms (DBE/MBE/SB)",
                      "Insurance certificate",
                      "Signed addenda",
                    ])} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>+ STANDARD BID PACK</button>
                    <button type="button" onClick={() => addPreset([
                      "W-9",
                      "Contractor license copy",
                      "References",
                      "Safety record / EMR",
                    ])} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>+ QUALIFICATION PACK</button>
                    <button type="button" onClick={() => addPreset([
                      "Performance bond",
                      "Payment bond",
                    ])} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}>+ POST-AWARD BONDS</button>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Tags */}
          <div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", letterSpacing: "0.1em", marginBottom: 8 }}>▸ TAGS</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {(draft.tags || []).map((t) => (
                <span key={t} style={{ padding: "4px 8px", background: "var(--steel)", color: "var(--cream)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", display: "flex", alignItems: "center", gap: 6 }}>
                  {t}
                  <button type="button" onClick={() => setDraft({ ...draft, tags: (draft.tags || []).filter((x) => x !== t) })} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer", padding: 0 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input className="fbt-input" style={{ flex: 1 }} placeholder="add tag (e.g. dbe, aggregate, chip-seal)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              />
              <button type="button" onClick={addTag} className="btn-ghost" style={{ padding: "6px 14px", fontSize: 11 }}>ADD</button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="fbt-label">Notes</label>
            <textarea className="fbt-input" rows={4} value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Free-form notes, competitor intel, meeting recap..." />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <div>
              {!isNew && onDelete && (
                <button type="button" onClick={() => onDelete(bid)} className="btn-ghost" style={{ color: "var(--safety)", borderColor: "var(--safety)" }}>
                  <Trash2 size={14} /> DELETE
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={onClose} className="btn-ghost">CANCEL</button>
              <button type="button" onClick={save} disabled={saving} className="btn-primary">
                <CheckCircle2 size={14} /> {saving ? "SAVING..." : (isNew ? "CREATE BID" : "SAVE CHANGES")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
