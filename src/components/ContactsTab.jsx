import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, FileDown, Mail, MessageSquare, Phone, Search, Star, Trash2, Upload, UserPlus, Users, X } from "lucide-react";
import { buildSMSLink, buildEmailLink, compressOrReadFile } from "../utils";
import { extractFromImage } from "../utils/ocr";
import { ContactDetailModal } from "./ContactDetailModal";

// Document kinds offered per contact type. CDL + medical_card trigger OCR
// to suggest the expiration date. `template` (when present) points to a
// blank fillable form the contact can download, fill in, and re-upload —
// these are the official IRS / USCIS PDFs hosted on the agency websites
// so we don't need to bundle anything ourselves.
const DRIVER_DOC_KINDS = [
  { v: "cdl", label: "CDL (driver's license)", ocrExpiry: true },
  { v: "medical_card", label: "Medical card / DOT physical", ocrExpiry: true },
  { v: "work_permit", label: "Work permit / EAD (if applicable)" },
  { v: "mvr", label: "Motor vehicle record" },
  { v: "i9", label: "I-9 (employment eligibility)", template: "https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf" },
  { v: "w4", label: "W-4 (federal tax)", template: "https://www.irs.gov/pub/irs-pdf/fw4.pdf" },
  { v: "driver_app", label: "Driver application (DOT 391.21)" },
  { v: "direct_deposit", label: "Direct deposit form" },
  { v: "drug_test", label: "Drug test result" },
  { v: "other", label: "Other" },
];
const SUB_DOC_KINDS = [
  { v: "w9", label: "W-9 (taxpayer ID)", template: "https://www.irs.gov/pub/irs-pdf/fw9.pdf" },
  { v: "coi", label: "Certificate of insurance (COI)" },
  { v: "operating_authority", label: "Operating authority / MC certificate" },
  { v: "ic_agreement", label: "Independent contractor agreement" },
  { v: "1099", label: "1099 (year-end)" },
  { v: "workers_comp", label: "Workers' comp waiver/certificate" },
  { v: "work_permit", label: "Work permit / EAD (if applicable)" },
  { v: "other", label: "Other" },
];

export const ContactModal = ({ contact, contacts = [], onSave, onClose, onToast }) => {
  const [draft, setDraft] = useState(contact || {
    type: "sub", companyName: "", contactName: "", phone: "", phone2: "",
    email: "", address: "", typicalTrucks: "", rateNotes: "",
    usdot: "", insurance: "", notes: "", favorite: false, drivesForId: null,
    brokerageApplies: false, brokeragePercent: 8,
    defaultPayRate: "", defaultPayMethod: "hour", defaultTruckNumber: "",
    taxId: "", taxIdType: "", legalName: "", is1099Eligible: false,
    documents: [],
  });
  const [showTaxId, setShowTaxId] = useState(false); // masked by default

  // Normalize identifiers so "John Smith" / "john smith" / "Jonh  smith"
  // match without false-positives on minor whitespace / case.
  const normName = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  const normPhone = (s) => String(s || "").replace(/\D/g, "");

  const save = async () => {
    if (!draft.companyName && !draft.contactName) {
      alert("Add at least a company name or contact name.");
      return;
    }
    // Pre-save duplicate check — only triggers when a NAME match is found
    // (company name OR contact name). A name match alone is a soft warning.
    // A name match PLUS a phone match is treated as a near-certain duplicate
    // and prompts a stronger warning. Email-only / phone-only matches aren't
    // flagged anymore (too noisy — shared family numbers, generic emails).
    const myCompany = normName(draft.companyName);
    const myContact = normName(draft.contactName);
    const myPhone = normPhone(draft.phone);
    const myPhone2 = normPhone(draft.phone2);
    const phoneMatch = (c) => {
      const cPhones = [normPhone(c.phone), normPhone(c.phone2)].filter(Boolean);
      if (myPhone && cPhones.includes(myPhone)) return true;
      if (myPhone2 && cPhones.includes(myPhone2)) return true;
      return false;
    };
    const matches = (contacts || []).filter((c) => {
      if (c.id && c.id === draft.id) return false;
      const nameHit = (myCompany && normName(c.companyName) === myCompany)
        || (myContact && normName(c.contactName) === myContact);
      return nameHit;
    });
    if (matches.length > 0) {
      const strongMatches = matches.filter(phoneMatch);
      const list = matches.slice(0, 3).map((c) => `• ${c.companyName || c.contactName} (${c.type})${c.phone ? ` · ${c.phone}` : ""}`).join("\n");
      const more = matches.length > 3 ? `\n+ ${matches.length - 3} more` : "";
      const message = strongMatches.length > 0
        ? `LIKELY DUPLICATE — same name AND phone as:\n\n${list}${more}\n\nThis is almost certainly the same person/company. Save anyway?`
        : `Same name as an existing contact:\n\n${list}${more}\n\nDifferent phone — could be a different person with the same name. Save anyway?`;
      const ok = window.confirm(message);
      if (!ok) return;
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

  const typeLabel = { sub: "Sub Hauler", driver: "Driver", customer: "Customer", broker: "Broker", other: "Other Company" }[draft.type] || "Contact";
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
                <option value="sub">Sub Hauler</option>
                <option value="driver">Driver</option>
                <option value="customer">Customer</option>
                <option value="broker">Broker</option>
                <option value="other">Other company</option>
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
              <label className="fbt-label">Drives For (Sub Hauler, optional)</label>
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

          {draft.type === "sub" && (
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

          {(draft.type === "driver" || draft.type === "sub") && (
            <ComplianceDocsSection
              draft={draft}
              setDraft={setDraft}
              kinds={draft.type === "driver" ? DRIVER_DOC_KINDS : SUB_DOC_KINDS}
              onSave={onSave}
              onToast={onToast}
            />
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


// Compliance documents section for driver / sub contacts. Stores docs as
// inline data URLs on the contact (kept simple — no separate file storage
// table). For CDL + medical card kinds, uploading a photo also runs OCR
// to suggest the expiration date and offers to populate the existing
// cdlExpiry / medicalCardExpiry fields on the contact.
//
// "Required documents" — admin can mark each kind as required. The list is
// persisted to localStorage per contact type so the next driver / sub the
// admin onboards uses the same checklist. Shows ✓/✗ for each required kind.
//
// "Share upload link" — generates a portal token, sets portal_enabled=true,
// and PERSISTS that change to Supabase (via onSave) so the public link
// actually works the moment it's generated. Without the persist step, the
// dispatcher would have to remember to also click SAVE; many won't, and
// the public link returns "Invalid or expired".
const REQUIRED_KEY = (type) => `fbt:requiredDocs:${type}`;
const ComplianceDocsSection = ({ draft, setDraft, kinds, onSave, onToast }) => {
  const [pendingKind, setPendingKind] = useState(kinds[0]?.v || "other");
  const [busy, setBusy] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [requiredKinds, setRequiredKinds] = useState(() => {
    try {
      const raw = localStorage.getItem(REQUIRED_KEY(draft.type));
      if (raw) return JSON.parse(raw);
    } catch { /* noop */ }
    // Default: every predefined kind except "other"
    return kinds.filter((k) => k.v !== "other").map((k) => k.v);
  });
  const persistRequired = (next) => {
    setRequiredKinds(next);
    try { localStorage.setItem(REQUIRED_KEY(draft.type), JSON.stringify(next)); } catch { /* noop */ }
  };
  const toggleRequired = (kindValue) => {
    persistRequired(
      requiredKinds.includes(kindValue)
        ? requiredKinds.filter((k) => k !== kindValue)
        : [...requiredKinds, kindValue]
    );
  };
  const docs = Array.isArray(draft.documents) ? draft.documents : [];
  const labelFor = (k) => kinds.find((x) => x.v === k)?.label || k;
  const hasUploadedKind = (kindValue) => docs.some((d) => d.kind === kindValue);

  const generateShareLink = async () => {
    if (!draft.id || String(draft.id).startsWith("temp-")) {
      onToast?.("⚠ Save the contact first, then generate the link.");
      return;
    }
    let token = draft.portalToken;
    if (!token) {
      // Random URL-safe token, 20 chars
      const bytes = new Uint8Array(15);
      crypto.getRandomValues(bytes);
      token = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 20);
    }
    const updated = { ...draft, portalToken: token, portalEnabled: true };
    setDraft(updated);
    // Persist immediately so the public RPC sees portal_enabled=true. Without
    // this, the link only works after the admin remembers to click SAVE.
    if (onSave) {
      try {
        await onSave({ ...updated, updatedAt: new Date().toISOString() });
      } catch (e) {
        console.warn("Persist share link failed:", e);
        onToast?.("⚠ Couldn't save the link. Try again.");
        return;
      }
    }
    const url = `${window.location.origin}${window.location.pathname}#/onboard/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      onToast?.("✓ Upload link saved + copied to clipboard");
    } catch {
      // Fallback: show in a prompt the user can copy from
      window.prompt("Upload link (copy this):", url);
    }
  };
  const revokeShareLink = async () => {
    if (!confirm("Revoke the upload link? The contact won't be able to use the existing URL anymore.")) return;
    const updated = { ...draft, portalEnabled: false };
    setDraft(updated);
    if (onSave) {
      try {
        await onSave({ ...updated, updatedAt: new Date().toISOString() });
      } catch (e) {
        console.warn("Persist revoke failed:", e);
      }
    }
    onToast?.("Link revoked.");
  };

  const addDoc = async (files) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const file = files[0];
      const dataUrl = await compressOrReadFile(file, 1800, 0.8);
      const newDoc = {
        id: Date.now() + Math.random(),
        kind: pendingKind,
        label: labelFor(pendingKind),
        fileName: file.name,
        dataUrl,
        uploadedAt: new Date().toISOString(),
        expiryDate: null,
      };
      // For CDL / medical card, kick off OCR and offer the detected date.
      // Skip when the file isn't an image (Tesseract only handles raster).
      const kindCfg = kinds.find((k) => k.v === pendingKind);
      let nextDocs = [...docs, newDoc];
      setDraft({ ...draft, documents: nextDocs });
      const isImage = file.type && file.type.startsWith("image/");
      if (kindCfg?.ocrExpiry && isImage) {
        try {
          const { fields } = await extractFromImage(dataUrl, { kind: pendingKind });
          if (fields?.expiryDate) {
            const ok = window.confirm(
              `OCR found an expiration date on this ${kindCfg.label}: ${fields.expiryDate}.\n\nApply it to the ${pendingKind === "cdl" ? "CDL expiration" : "Medical card expiration"} field?`
            );
            if (ok) {
              const expiryFieldKey = pendingKind === "cdl" ? "cdlExpiry" : "medicalCardExpiry";
              nextDocs = nextDocs.map((d) => d.id === newDoc.id ? { ...d, expiryDate: fields.expiryDate } : d);
              setDraft({ ...draft, [expiryFieldKey]: fields.expiryDate, documents: nextDocs });
              onToast?.(`✓ Set ${pendingKind === "cdl" ? "CDL" : "medical card"} expiry to ${fields.expiryDate}`);
            } else {
              // User skipped — still stamp the OCR date on the doc itself for reference
              nextDocs = nextDocs.map((d) => d.id === newDoc.id ? { ...d, expiryDate: fields.expiryDate } : d);
              setDraft({ ...draft, documents: nextDocs });
            }
          } else {
            onToast?.("OCR ran — no expiration date detected. Type it in by hand.");
          }
        } catch (e) {
          console.warn("OCR failed:", e);
        }
      }
    } catch (e) {
      console.warn("Doc upload failed:", e);
      onToast?.("⚠ Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const removeDoc = (id) => {
    if (!confirm("Remove this document?")) return;
    setDraft({ ...draft, documents: docs.filter((d) => d.id !== id) });
  };

  return (
    <div style={{ padding: 12, background: "#F8FAFC", border: "1.5px solid var(--line)", borderRadius: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--steel)", fontWeight: 700 }}>
          ▸ COMPLIANCE PACKET ({docs.length} {docs.length === 1 ? "document" : "documents"})
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="btn-ghost"
            style={{ padding: "3px 8px", fontSize: 10 }}
            title="Pick which document kinds to require for every driver/sub. Saved across contacts."
          >
            {showConfig ? "Done" : "Configure required"}
          </button>
          {draft.portalEnabled ? (
            <>
              <button
                type="button"
                onClick={generateShareLink}
                className="btn-ghost"
                style={{ padding: "3px 8px", fontSize: 10 }}
                title="Copy the upload link again"
              >
                Copy upload link
              </button>
              <button
                type="button"
                onClick={revokeShareLink}
                className="btn-ghost"
                style={{ padding: "3px 8px", fontSize: 10, color: "var(--safety)" }}
              >
                Revoke link
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={generateShareLink}
              className="btn-ghost"
              style={{ padding: "3px 8px", fontSize: 10 }}
              title="Generate a public link the contact can use to upload their docs themselves"
            >
              Share upload link
            </button>
          )}
        </div>
      </div>

      {/* Required-docs checklist — ✓ for kinds with at least one uploaded
          document, ✗ for kinds the admin needs to chase. Hidden when no
          kinds are marked required. */}
      {requiredKinds.length > 0 && (
        <div style={{ marginBottom: 10, padding: 8, background: "#FFF", border: "1px solid var(--line)", borderRadius: 4 }}>
          <div className="fbt-mono" style={{ fontSize: 9, color: "var(--concrete)", marginBottom: 6 }}>
            REQUIRED FOR EVERY {draft.type === "driver" ? "DRIVER" : "SUB"} ({requiredKinds.filter(hasUploadedKind).length}/{requiredKinds.length} ON FILE)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 4 }}>
            {requiredKinds.map((k) => {
              const have = hasUploadedKind(k);
              return (
                <div key={k} style={{ fontSize: 11, color: have ? "var(--good)" : "var(--safety)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>{have ? "✓" : "✗"}</span>
                  <span>{labelFor(k)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Configuration panel — toggle which kinds are required for this type */}
      {showConfig && (
        <div style={{ marginBottom: 10, padding: 10, background: "#FEF3C7", border: "1px solid var(--hazard)", borderRadius: 4 }}>
          <div className="fbt-mono" style={{ fontSize: 9, color: "var(--hazard-deep)", fontWeight: 700, marginBottom: 6 }}>
            REQUIRED DOCUMENT KINDS · APPLIES TO ALL {draft.type === "driver" ? "DRIVERS" : "SUBS"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 4 }}>
            {kinds.map((k) => (
              <label key={k.v} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={requiredKinds.includes(k.v)}
                  onChange={() => toggleRequired(k.v)}
                />
                {k.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <select
          className="fbt-select"
          value={pendingKind}
          onChange={(e) => setPendingKind(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
        >
          {kinds.map((k) => (
            <option key={k.v} value={k.v}>{k.label}{k.ocrExpiry ? " (OCR expiry)" : ""}</option>
          ))}
        </select>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "2px dashed var(--concrete)", cursor: busy ? "wait" : "pointer", fontSize: 12 }}>
          <Upload size={14} /> {busy ? "Processing…" : "Upload"}
          <input
            type="file"
            accept="image/*,application/pdf"
            style={{ display: "none" }}
            disabled={busy}
            onChange={(e) => addDoc(e.target.files)}
          />
        </label>
      </div>

      {/* Blank-form download — for kinds that have an official template
          (I-9 USCIS, W-4 + W-9 IRS), give the admin a one-click way to
          fetch the latest agency PDF so they can email/print it for the
          contact to fill in. */}
      {(() => {
        const k = kinds.find((x) => x.v === pendingKind);
        if (!k?.template) return null;
        return (
          <div style={{ marginBottom: 10, padding: 8, background: "#FEF3C7", border: "1px solid var(--hazard)", borderRadius: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="fbt-mono" style={{ fontSize: 10, color: "var(--hazard-deep)", fontWeight: 700 }}>BLANK FORM:</span>
            <a href={k.template} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--steel)", textDecoration: "underline" }}>
              Download official {k.label} (PDF)
            </a>
          </div>
        );
      })()}

      {docs.length === 0 ? (
        <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
          ▸ NO DOCUMENTS UPLOADED YET. Pick a kind and upload a photo or PDF.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {docs.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, background: "#FFF", border: "1px solid var(--line)", borderRadius: 4 }}>
              {d.dataUrl && /\.pdf$/i.test(d.fileName || "") === false ? (
                <img src={d.dataUrl} alt="" style={{ width: 40, height: 40, objectFit: "cover", border: "1px solid var(--line)" }} />
              ) : (
                <div style={{ width: 40, height: 40, background: "#F5F5F4", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileDown size={16} style={{ color: "var(--concrete)" }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--steel)" }}>{d.label || labelFor(d.kind)}</div>
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.fileName || "—"}
                  {d.expiryDate && <> · exp {d.expiryDate}</>}
                  {d.uploadedAt && <> · uploaded {new Date(d.uploadedAt).toLocaleDateString()}</>}
                </div>
              </div>
              <a
                href={d.dataUrl}
                download={d.fileName || `${d.kind}-${d.id}`}
                className="btn-ghost"
                style={{ padding: "4px 8px", fontSize: 10, textDecoration: "none" }}
                title="Download"
              >
                <FileDown size={11} />
              </a>
              <button
                type="button"
                onClick={() => removeDoc(d.id)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: "var(--safety)" }}
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// ========== CONTACTS TAB ==========
// generateCustomerStatementPDF is injected as a prop so this module doesn't
// have to carry the ~300-line PDF generator. App.jsx still owns it;
// extracting the PDF helper is a future refactor.
export const ContactsTab = ({ contacts, setContacts, refreshContacts, dispatches, freightBills, invoices = [], company, onToast, generateCustomerStatementPDF }) => {
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

  // Duplicate a driver / sub. Clones the source contact's defaults (pay rate,
  // pay method, brokerage, truck #) but starts FRESH on identity fields
  // (name, phone, email) and the per-contact compliance state (documents,
  // CDL/medical expiry, portal token). Opens the modal pre-filled so the
  // admin can fill in the new contact's name + phone + save.
  const duplicateContact = (c) => {
    const fresh = {
      ...c,
      id: undefined,
      portalToken: "",
      portalEnabled: false,
      documents: [],
      cdlExpiry: "",
      medicalCardExpiry: "",
      contactName: "",
      companyName: c.companyName ? `${c.companyName} (copy)` : "",
      phone: "",
      phone2: "",
      email: "",
      favorite: false,
      createdAt: undefined,
      updatedAt: undefined,
    };
    setEditing(fresh);
    setShowModal(true);
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

  // Build a duplicate-ID set — only flag rows that share BOTH a name
  // (company OR contact) AND a phone (primary OR alt) with another contact.
  // Pure name match alone (e.g. two different "John Smith"s with different
  // phones) doesn't get flagged, since that's expected. Both-axis matching
  // catches the actual duplicate-entry mistakes without false positives.
  const duplicateIds = useMemo(() => {
    const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
    const normPh = (s) => String(s || "").replace(/\D/g, "");
    const dups = new Set();
    for (let i = 0; i < contacts.length; i++) {
      for (let j = i + 1; j < contacts.length; j++) {
        const a = contacts[i], b = contacts[j];
        const aNames = [norm(a.companyName), norm(a.contactName)].filter(Boolean);
        const bNames = [norm(b.companyName), norm(b.contactName)].filter(Boolean);
        const aPhones = [normPh(a.phone), normPh(a.phone2)].filter(Boolean);
        const bPhones = [normPh(b.phone), normPh(b.phone2)].filter(Boolean);
        const nameHit = aNames.some((n) => bNames.includes(n));
        const phoneHit = aPhones.some((p) => bPhones.includes(p));
        if (nameHit && phoneHit) {
          dups.add(a.id);
          dups.add(b.id);
        }
      }
    }
    return dups;
  }, [contacts]);

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
          <div className="stat-label">Sub Haulers</div>
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

      {/* Sub-tab strip — Drivers / Sub Haulers / Customers / Brokers /
          Other / All. Replaces the old dropdown filter. Counts show how
          many records of each type exist. */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { v: "all", label: "All", count: contacts.length },
          { v: "driver", label: "Drivers", count: driversCount },
          { v: "sub", label: "Sub Haulers", count: subsCount },
          { v: "customer", label: "Customers", count: customersCount },
          { v: "broker", label: "Brokers", count: brokersCount },
          { v: "other", label: "Other companies", count: contacts.filter((c) => c.type === "other").length },
        ].map((t) => (
          <button
            key={t.v}
            type="button"
            onClick={() => setTypeFilter(t.v)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
              border: `2px solid ${typeFilter === t.v ? "var(--steel)" : "var(--line)"}`,
              background: typeFilter === t.v ? "var(--steel)" : "#FFF",
              color: typeFilter === t.v ? "var(--cream)" : "var(--steel)",
              cursor: "pointer",
              borderRadius: 6,
            }}
          >
            {t.label} <span style={{ opacity: 0.7, fontWeight: 400 }}>· {t.count}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--concrete)" }} />
          <input className="fbt-input" style={{ paddingLeft: 38 }} placeholder="Search name, phone, notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {refreshContacts && (
          <button
            onClick={async () => {
              await refreshContacts();
              onToast?.("✓ REFRESHED");
            }}
            className="btn-ghost"
            title="Pull latest contacts from the server (use this if a driver/sub uploaded docs via their link but you don't see them yet)"
          >
            ↻ REFRESH
          </button>
        )}
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
              <div key={c.id} className="fbt-card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={async () => {
                // Pull the latest version from DB before opening so any
                // documents the contact uploaded via their public link
                // (which doesn't trigger our local realtime if that's not
                // enabled on the contacts table) show up immediately.
                let fresh = null;
                if (refreshContacts) { try { fresh = await refreshContacts(); } catch { /* noop */ } }
                const updated = (fresh || contacts || []).find((x) => x.id === c.id) || c;
                setViewing(updated);
              }}>
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
                            : c.type === "other" ? "OTHER"
                            : "DRIVER"}
                        </span>
                        {duplicateIds.has(c.id) && (
                          <span className="chip" title="Another contact shares the same company name, person, phone, or email. Open both and merge or delete one." style={{ background: "var(--safety)", color: "#FFF", fontSize: 9, padding: "2px 8px", borderColor: "var(--safety)" }}>
                            ⚠ POSSIBLE DUP
                          </span>
                        )}
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
                    {(c.type === "driver" || c.type === "sub") && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); duplicateContact(c); }}
                        className="btn-ghost"
                        style={{ padding: "6px 10px", fontSize: 10, flex: 1, justifyContent: "center", display: "flex", alignItems: "center" }}
                        title="Start a new contact pre-filled with this one's defaults (rate, method, brokerage). Identity fields stay blank."
                      >
                        <UserPlus size={11} style={{ marginRight: 4 }} /> CLONE DEFAULTS
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
