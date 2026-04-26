import { useEffect, useState } from "react";
import { CheckCircle2, FileDown, FileText, Trash2, Upload } from "lucide-react";
import { fetchContactForOnboarding, updateContactDocsByToken } from "../db";
import { compressOrReadFile } from "../utils";
import { extractFromImage } from "../utils/ocr";
import { GlobalStyles } from "./GlobalStyles";
import { Logo } from "./Logo";
import { InlineFormFiller } from "./InlineFormFiller";
import { FORM_SPECS } from "./formSpecs";

// Public document-upload page reached via /#/onboard/:token. The contact
// (driver or sub) sees a checklist of required documents the dispatcher
// configured, uploads them right from their phone, and the docs flow back
// into the company's Contacts tab. No admin login required — token is the
// only auth.
//
// Required-doc list comes from localStorage on the admin side; we read from
// the same key here so the checklist matches what the dispatcher sees.

const DRIVER_DOC_KINDS = [
  { v: "cdl", label: "CDL (driver's license)", ocrExpiry: true },
  { v: "medical_card", label: "Medical card / DOT physical", ocrExpiry: true },
  { v: "work_permit", label: "Work permit / EAD (if applicable)" },
  { v: "mvr", label: "Motor vehicle record" },
  { v: "i9", label: "I-9 (employment eligibility)", template: "https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf", inlineForm: "i9" },
  { v: "w4", label: "W-4 (federal tax)", template: "https://www.irs.gov/pub/irs-pdf/fw4.pdf", inlineForm: "w4" },
  { v: "driver_app", label: "Driver application (DOT 391.21)" },
  { v: "direct_deposit", label: "Direct deposit form", inlineForm: "direct_deposit" },
  { v: "drug_test", label: "Drug test result" },
  { v: "other", label: "Other" },
];
const SUB_DOC_KINDS = [
  { v: "w9", label: "W-9 (taxpayer ID)", template: "https://www.irs.gov/pub/irs-pdf/fw9.pdf" },
  { v: "coi", label: "Additional insured certificate of insurance" },
  { v: "operating_authority", label: "Operating authority / MC certificate" },
  { v: "ic_agreement", label: "Independent contractor agreement" },
  { v: "workers_comp", label: "Workers' comp waiver/certificate" },
  { v: "other", label: "Other" },
];

export const OnboardingPage = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState(null);
  const [error, setError] = useState(null);
  // Pending kind is computed from contact + already-uploaded docs; default
  // to the first required-but-missing kind so the next upload is the most
  // useful one. Once the user manually picks a kind, we honor that until
  // they upload (handleUpload picks the next missing).
  const [pendingKind, setPendingKindRaw] = useState("");
  const setPendingKind = (k) => setPendingKindRaw(k || "");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  // When non-null, an inline form modal renders for that kind ("i9" / "w4" /
  // "direct_deposit"). Submit captures the JSON data + adds to documents.
  const [activeForm, setActiveForm] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchContactForOnboarding(token);
        if (!data) setError("Invalid or expired link. Ask the dispatcher for a new one.");
        else setContact(data);
      } catch {
        setError("Failed to load — please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const kinds = contact?.type === "driver" ? DRIVER_DOC_KINDS : SUB_DOC_KINDS;
  const labelFor = (k) => kinds.find((x) => x.v === k)?.label || k;
  const docs = contact?.documents || [];
  const hasUploadedKind = (kindValue) => docs.some((d) => d.kind === kindValue);

  // Pull the required-doc list the admin configured on this device. If we
  // can't read it (different device than the admin), fall back to all
  // kinds except "other".
  const requiredKinds = (() => {
    if (!contact) return [];
    try {
      const raw = localStorage.getItem(`fbt:requiredDocs:${contact.type}`);
      if (raw) return JSON.parse(raw);
    } catch { /* noop */ }
    return kinds.filter((k) => k.v !== "other").map((k) => k.v);
  })();

  // Effective kind: the user's manual pick, else first required-but-missing,
  // else the first kind in the list. Computed at render so we don't need a
  // setState-in-effect.
  const effectiveKind = pendingKind
    || requiredKinds.find((k) => !hasUploadedKind(k))
    || kinds[0]?.v
    || "";

  const [saveError, setSaveError] = useState(null);
  const persistDocs = async (nextDocs, extraFields = {}) => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateContactDocsByToken(token, { documents: nextDocs, ...extraFields });
      if (updated) {
        setContact({
          ...contact,
          documents: nextDocs,
          ...extraFields,
        });
        setSavedAt(new Date());
      } else {
        // RPC returned null — most likely the link was revoked or the
        // documents column is missing/RLS blocked. Surface to the user
        // instead of failing silently (previous bug: upload appeared to
        // succeed but doc never persisted, dispatcher saw nothing).
        setSaveError("Upload didn't save. Link may be revoked — ask the dispatcher for a new one.");
      }
    } catch (e) {
      console.error("persistDocs failed:", e);
      setSaveError("Upload failed — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (files) => {
    if (!files || files.length === 0 || !effectiveKind) return;
    setBusy(true);
    try {
      const file = files[0];
      const dataUrl = await compressOrReadFile(file, 1800, 0.8);
      const newDoc = {
        id: Date.now() + Math.random(),
        kind: effectiveKind,
        label: labelFor(effectiveKind),
        fileName: file.name,
        dataUrl,
        uploadedAt: new Date().toISOString(),
        expiryDate: null,
        uploadedVia: "onboard-link",
      };
      const kindCfg = kinds.find((k) => k.v === effectiveKind);
      let nextDocs = [...docs, newDoc];
      let extras = {};
      // Only run OCR on images. Tesseract chokes on PDFs (it only handles
      // raster pixels) and the WASM error escapes the try/catch, breaking
      // the whole upload flow. Skip cleanly when file isn't an image.
      const isImage = file.type && file.type.startsWith("image/");
      if (kindCfg?.ocrExpiry && isImage) {
        try {
          const { fields } = await extractFromImage(dataUrl, { kind: effectiveKind });
          if (fields?.expiryDate) {
            nextDocs = nextDocs.map((d) => d.id === newDoc.id ? { ...d, expiryDate: fields.expiryDate } : d);
            extras = effectiveKind === "cdl"
              ? { cdlExpiry: fields.expiryDate }
              : { medicalCardExpiry: fields.expiryDate };
          }
        } catch (e) {
          console.warn("OCR failed:", e);
        }
      }
      await persistDocs(nextDocs, extras);
      // Clear manual pick so effectiveKind re-derives the next missing
      setPendingKind("");
    } catch (e) {
      console.warn("upload failed:", e);
    } finally {
      setBusy(false);
    }
  };

  const removeDoc = async (id) => {
    if (!confirm("Remove this document?")) return;
    await persistDocs(docs.filter((d) => d.id !== id));
  };

  // Inline-form submit. Saves the captured values as a regular document
  // entry with kind="<formKey>_form" + formData={...}. Admin sees this in
  // the contact view alongside uploaded PDFs.
  const submitInlineForm = async (formKey, values) => {
    const labelMap = { i9: "I-9 (filled)", w4: "W-4 (filled)", direct_deposit: "Direct deposit (filled)" };
    const newDoc = {
      id: Date.now() + Math.random(),
      kind: `${formKey}_form`,
      label: labelMap[formKey] || `${formKey} (filled)`,
      fileName: `${formKey}-form.json`,
      formData: values,
      uploadedAt: new Date().toISOString(),
      uploadedVia: "onboard-inline-form",
    };
    await persistDocs([...docs, newDoc]);
    setActiveForm(null);
    setPendingKind("");
  };

  if (loading) {
    return (
      <div className="fbt-root texture-paper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <GlobalStyles />
        <div className="fbt-mono anim-roll" style={{ color: "var(--hazard-deep)" }}>▸ LOADING…</div>
      </div>
    );
  }
  if (error || !contact) {
    return (
      <div className="fbt-root texture-paper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
        <GlobalStyles />
        <div className="fbt-card" style={{ padding: 36, textAlign: "center", maxWidth: 420 }}>
          <h2 className="fbt-display" style={{ fontSize: 20, margin: "0 0 10px" }}>LINK NOT FOUND</h2>
          <p style={{ color: "var(--concrete)", margin: 0 }}>{error || "Ask the dispatcher for a new link."}</p>
        </div>
      </div>
    );
  }

  const needCount = requiredKinds.filter((k) => !hasUploadedKind(k)).length;
  return (
    <div className="fbt-root" style={{ minHeight: "100vh", background: "#F5F5F4" }}>
      <GlobalStyles />

      <div style={{ background: "var(--steel)", color: "var(--cream)", padding: "20px 24px", borderBottom: "3px solid var(--hazard)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}><Logo size="sm" /></div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", marginBottom: 8 }}>
          ▸ DOCUMENT UPLOAD · {contact.type === "driver" ? "DRIVER" : "SUB HAULER"}
        </div>
        <h1 className="fbt-display" style={{ fontSize: 26, margin: "0 0 6px", lineHeight: 1.15 }}>
          {contact.companyName || contact.contactName || "Welcome"}
        </h1>
        <p style={{ color: "var(--concrete)", fontSize: 14, margin: "0 0 20px" }}>
          Upload the documents below so we can get you set up. {needCount === 0 ? "All required docs received — thank you!" : `${needCount} required ${needCount === 1 ? "doc" : "docs"} remaining.`}
        </p>

        {requiredKinds.length > 0 && (
          <div className="fbt-card" style={{ padding: 14, marginBottom: 18 }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8, fontWeight: 700 }}>
              ▸ CHECKLIST ({requiredKinds.filter(hasUploadedKind).length} / {requiredKinds.length} ON FILE)
            </div>
            <div style={{ display: "grid", gap: 5 }}>
              {requiredKinds.map((k) => {
                const have = hasUploadedKind(k);
                return (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: have ? "var(--good)" : "var(--safety)" }}>
                    <CheckCircle2 size={16} style={{ opacity: have ? 1 : 0.25 }} />
                    <span style={{ fontWeight: have ? 600 : 700 }}>{labelFor(k)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="fbt-card" style={{ padding: 14, marginBottom: 18 }}>
          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8, fontWeight: 700 }}>
            ▸ ADD A DOCUMENT
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <select
              className="fbt-select"
              value={effectiveKind}
              onChange={(e) => setPendingKind(e.target.value)}
            >
              {kinds.map((k) => (
                <option key={k.v} value={k.v}>{k.label}</option>
              ))}
            </select>
            {/* Inline "Fill in here" — for kinds that have a built-in form
                renderer (i9, w4, direct_deposit), let the contact fill it
                in-app instead of having to download/print/scan/upload. */}
            {(() => {
              const k = kinds.find((x) => x.v === effectiveKind);
              if (!k?.inlineForm || !FORM_SPECS[k.inlineForm]) return null;
              return (
                <button
                  type="button"
                  onClick={() => setActiveForm(k.inlineForm)}
                  className="btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
                >
                  <FileText size={14} /> Fill in {k.label} here
                </button>
              );
            })()}
            {/* Blank-form download link — appears whenever the selected kind
                has an official template (I-9, W-4, W-9). Alternative path:
                some contacts prefer a printable PDF over the inline form. */}
            {(() => {
              const k = kinds.find((x) => x.v === effectiveKind);
              if (!k?.template) return null;
              return (
                <a
                  href={k.template}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: "var(--steel)", textDecoration: "underline", padding: "6px 0" }}
                >
                  ▸ Or download blank {k.label} (PDF)
                </a>
              );
            })()}
            {/* OCR hint — for CDL / medical card, auto-extracting the
                expiry date only works on photos (Tesseract is image-only).
                PDFs upload fine but the date stays blank. */}
            {(() => {
              const k = kinds.find((x) => x.v === effectiveKind);
              if (!k?.ocrExpiry) return null;
              return (
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", padding: 6, background: "#F0F9FF", border: "1px dashed var(--steel)", borderRadius: 4 }}>
                  ▸ TIP: Take a PHOTO of your {k.label} (not a PDF scan) for auto-detection of the expiry date.
                </div>
              );
            })()}
            <label
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "20px 14px", border: "2px dashed var(--concrete)",
                cursor: busy ? "wait" : "pointer", fontSize: 14, fontWeight: 700,
                background: "#FEF3C7", borderRadius: 6,
              }}
            >
              <Upload size={18} /> {busy ? "Processing…" : "TAP TO UPLOAD"}
              <input
                type="file"
                accept="image/*,application/pdf"
                style={{ display: "none" }}
                disabled={busy}
                onChange={(e) => handleUpload(e.target.files)}
              />
            </label>
            {savedAt && !saveError && (
              <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)" }}>
                ✓ Saved at {savedAt.toLocaleTimeString()}{saving ? " · saving…" : ""}
              </div>
            )}
            {saveError && (
              <div className="fbt-mono" style={{ fontSize: 11, color: "var(--safety)", padding: 8, background: "#FEF2F2", border: "1px solid var(--safety)", borderRadius: 4 }}>
                ⚠ {saveError}
              </div>
            )}
          </div>
        </div>

        <div className="fbt-card" style={{ padding: 14 }}>
          <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginBottom: 8, fontWeight: 700 }}>
            ▸ YOUR DOCUMENTS ({docs.length})
          </div>
          {docs.length === 0 ? (
            <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>
              ▸ NO DOCUMENTS YET — tap "Upload" above to add one.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {docs.map((d) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, background: "#FFF", border: "1px solid var(--line)", borderRadius: 4 }}>
                  {d.dataUrl && /\.pdf$/i.test(d.fileName || "") === false ? (
                    <img src={d.dataUrl} alt="" style={{ width: 44, height: 44, objectFit: "cover", border: "1px solid var(--line)" }} />
                  ) : (
                    <div style={{ width: 44, height: 44, background: "#F5F5F4", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FileDown size={18} style={{ color: "var(--concrete)" }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--steel)" }}>{d.label || labelFor(d.kind)}</div>
                    <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)" }}>
                      {d.fileName || "—"}
                      {d.expiryDate && <> · exp {d.expiryDate}</>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDoc(d.id)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: "var(--safety)" }}
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", padding: "30px 0 10px", color: "var(--concrete)", fontSize: 11 }}>
          ▸ 4 BROTHERS TRUCKING · QUESTIONS? CONTACT YOUR DISPATCHER
        </div>
      </div>

      {activeForm && (
        <InlineFormFiller
          formKey={activeForm}
          defaults={{
            firstName: contact.contactName?.split(" ")[0] || "",
            lastName: contact.contactName?.split(" ").slice(1).join(" ") || "",
            email: contact.email || "",
            phone: contact.phone || "",
          }}
          onCancel={() => setActiveForm(null)}
          onSubmit={(values) => submitInlineForm(activeForm, values)}
        />
      )}
    </div>
  );
};
