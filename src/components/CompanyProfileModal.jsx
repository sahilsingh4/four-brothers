import { useState, useEffect } from "react";
import { Building2, CheckCircle2, FileDown, Upload, X } from "lucide-react";
import { compressImage } from "../utils";
import { fetchPublicProjects, fetchPublicTestimonials } from "../db";

// generateCapabilityStatementPDF is passed in so this module doesn't have
// to drag the 250-line PDF generator with it. App.jsx still owns the PDF
// helper; if it ever gets extracted, this prop can be wired internally.
export const CompanyProfileModal = ({ company, onSave, onClose, onToast, generateCapabilityStatementPDF }) => {
  const [draft, setDraft] = useState({ ...company });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogo = async (files) => {
    if (!files || files.length === 0) return;
    setUploadingLogo(true);
    try {
      const dataUrl = await compressImage(files[0], 400, 0.85);
      setDraft({ ...draft, logoDataUrl: dataUrl });
    } catch (e) { console.warn(e); }
    setUploadingLogo(false);
  };

  const save = async () => {
    await onSave(draft);
    onToast("COMPANY PROFILE SAVED");
    onClose();
  };

  // v18 Batch 2: keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [draft]);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", background: "var(--steel)", color: "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="fbt-display" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Building2 size={18} /> COMPANY PROFILE
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cream)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <div>
            <label className="fbt-label">Company Name</label>
            <input className="fbt-input" value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="4 Brothers Trucking, LLC" />
          </div>
          <div>
            <label className="fbt-label">Address</label>
            <input className="fbt-input" value={draft.address || ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Bay Point, CA 94565" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="fbt-label">Phone</label>
              <input className="fbt-input" value={draft.phone || ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className="fbt-label">Email</label>
              <input className="fbt-input" value={draft.email || ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="[email protected]" />
            </div>
          </div>
          <div>
            <label className="fbt-label">USDOT / MC # (optional)</label>
            <input className="fbt-input" value={draft.usdot || ""} onChange={(e) => setDraft({ ...draft, usdot: e.target.value })} placeholder="USDOT 1234567 · CA MCP" />
          </div>
          <div style={{ padding: 12, background: "#F0FDF4", border: "2px solid var(--good)" }}>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--good)", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700 }}>
              ▸ TAX / PAYROLL IDENTIFIERS (SHOWN ON PAY STUBS & 1099s)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="fbt-label">Federal EIN</label>
                <input className="fbt-input" value={draft.ein || ""} onChange={(e) => setDraft({ ...draft, ein: e.target.value })} placeholder="XX-XXXXXXX" />
              </div>
              <div>
                <label className="fbt-label">CA Employer ID (EDD)</label>
                <input className="fbt-input" value={draft.caEmployerId || ""} onChange={(e) => setDraft({ ...draft, caEmployerId: e.target.value })} placeholder="123-4567-8" />
              </div>
            </div>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 8 }}>
              ▸ APPEARS ON PAY STUBS FOR 1099 MATCHING · STORED LOCALLY
            </div>
          </div>
          <div>
            <label className="fbt-label">Logo / Letterhead</label>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              {draft.logoDataUrl ? (
                <img src={draft.logoDataUrl} alt="logo" style={{ width: 80, height: 80, objectFit: "contain", border: "2px solid var(--steel)", background: "#FFF" }} />
              ) : (
                <div style={{ width: 80, height: 80, border: "2px dashed var(--concrete)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--concrete)" }}>
                  <Building2 size={24} />
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                <label className="btn-ghost" style={{ cursor: "pointer" }}>
                  <Upload size={14} style={{ marginRight: 6 }} /> {uploadingLogo ? "PROCESSING…" : draft.logoDataUrl ? "REPLACE LOGO" : "UPLOAD LOGO"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleLogo(e.target.files)} />
                </label>
                {draft.logoDataUrl && (
                  <button className="btn-danger" onClick={() => setDraft({ ...draft, logoDataUrl: null })}>REMOVE LOGO</button>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="fbt-label">Default Payment Terms</label>
            <textarea className="fbt-textarea" value={draft.defaultTerms || ""} onChange={(e) => setDraft({ ...draft, defaultTerms: e.target.value })} placeholder="Net 30. Remit by check or ACH. Late payments subject to 1.5% monthly finance charge." />
          </div>

          {/* v22 Session V: Capability Statement fields */}
          <details style={{ padding: 14, border: "2px dashed var(--steel)", background: "#FAFAF9" }}>
            <summary style={{ cursor: "pointer", fontFamily: "Oswald, sans-serif", fontSize: 12, letterSpacing: "0.1em", color: "var(--hazard-deep)", textTransform: "uppercase", fontWeight: 700 }}>
              ▸ CAPABILITY STATEMENT — GOVERNMENT / PRIME CONTRACTOR DATA
            </summary>
            <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 10, marginBottom: 14, letterSpacing: "0.05em", lineHeight: 1.5 }}>
              ▸ USED WHEN GENERATING THE CAPABILITY STATEMENT PDF.<br/>
              ▸ LEAVE FIELDS BLANK IF YOU DON'T HAVE THEM YET — THEY'LL BE OMITTED FROM THE PDF.
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label className="fbt-label">Tagline (1 line)</label>
                <input className="fbt-input" value={draft.tagline || ""} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} placeholder="Bay Area Dump Truck Hauling · DBE · MBE · SB-PW Certified" />
              </div>
              <div>
                <label className="fbt-label">Website</label>
                <input className="fbt-input" value={draft.website || ""} onChange={(e) => setDraft({ ...draft, website: e.target.value })} placeholder="4brotherstruck.com" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label className="fbt-label">Year Founded</label>
                  <input className="fbt-input" value={draft.yearFounded || ""} onChange={(e) => setDraft({ ...draft, yearFounded: e.target.value })} placeholder="e.g. 2020" />
                </div>
                <div>
                  <label className="fbt-label">Employees</label>
                  <input className="fbt-input" value={draft.employeeCount || ""} onChange={(e) => setDraft({ ...draft, employeeCount: e.target.value })} placeholder="e.g. 5–10" />
                </div>
                <div>
                  <label className="fbt-label">EIN</label>
                  <input className="fbt-input" value={draft.ein || ""} onChange={(e) => setDraft({ ...draft, ein: e.target.value })} placeholder="XX-XXXXXXX" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label className="fbt-label">UEI (SAM.gov)</label>
                  <input className="fbt-input" value={draft.uei || ""} onChange={(e) => setDraft({ ...draft, uei: e.target.value })} placeholder="12 chars" />
                </div>
                <div>
                  <label className="fbt-label">CAGE Code</label>
                  <input className="fbt-input" value={draft.cage || ""} onChange={(e) => setDraft({ ...draft, cage: e.target.value })} placeholder="5 chars" />
                </div>
                <div>
                  <label className="fbt-label">DUNS (legacy)</label>
                  <input className="fbt-input" value={draft.duns || ""} onChange={(e) => setDraft({ ...draft, duns: e.target.value })} placeholder="9 digits" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label className="fbt-label">USDOT #</label>
                  <input className="fbt-input" value={draft.usdot || ""} onChange={(e) => setDraft({ ...draft, usdot: e.target.value })} />
                </div>
                <div>
                  <label className="fbt-label">MC Number</label>
                  <input className="fbt-input" value={draft.mcNumber || ""} onChange={(e) => setDraft({ ...draft, mcNumber: e.target.value })} />
                </div>
                <div>
                  <label className="fbt-label">CA MCP #</label>
                  <input className="fbt-input" value={draft.caMcp || ""} onChange={(e) => setDraft({ ...draft, caMcp: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="fbt-label">NAICS Codes (comma-separated)</label>
                <input className="fbt-input" value={draft.naicsCodes || ""} onChange={(e) => setDraft({ ...draft, naicsCodes: e.target.value })} placeholder="484220, 484230, 237310" />
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4, letterSpacing: "0.05em" }}>
                  ▸ 484220 = SPECIALIZED FREIGHT TRUCKING · 484230 = LONG-DISTANCE · 237310 = HIGHWAY/STREET CONSTRUCTION
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="fbt-label">Bonding Capacity</label>
                  <input className="fbt-input" value={draft.bondingCapacity || ""} onChange={(e) => setDraft({ ...draft, bondingCapacity: e.target.value })} placeholder="e.g. Single: $500K · Aggregate: $2M" />
                </div>
                <div>
                  <label className="fbt-label">Insurance Carrier</label>
                  <input className="fbt-input" value={draft.insuranceCarrier || ""} onChange={(e) => setDraft({ ...draft, insuranceCarrier: e.target.value })} placeholder="e.g. Cover Whale Insurance" />
                </div>
              </div>

              <div>
                <label className="fbt-label">Core Competencies (one per line)</label>
                <textarea
                  className="fbt-textarea"
                  rows={4}
                  value={(draft.competencies || []).join("\n")}
                  onChange={(e) => setDraft({ ...draft, competencies: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Construction material hauling (aggregate, dirt, asphalt)&#10;Public works / prevailing wage project support&#10;Certified payroll reporting"
                />
                <div className="fbt-mono" style={{ fontSize: 10, color: "var(--concrete)", marginTop: 4, letterSpacing: "0.05em" }}>
                  ▸ LEAVE BLANK TO USE SMART DEFAULTS
                </div>
              </div>

              <div>
                <label className="fbt-label">Differentiators (one per line)</label>
                <textarea
                  className="fbt-textarea"
                  rows={4}
                  value={(draft.differentiators || []).join("\n")}
                  onChange={(e) => setDraft({ ...draft, differentiators: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="DBE, MBE, and SB-PW certified&#10;Family-run with responsive dispatch&#10;Clean paperwork: digital FBs with scale tickets"
                />
              </div>
            </div>
          </details>

          <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
            <button onClick={save} className="btn-primary"><CheckCircle2 size={16} /> SAVE PROFILE</button>
            <button onClick={onClose} className="btn-ghost">CANCEL</button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const [projects, testimonials] = await Promise.all([
                    fetchPublicProjects().catch(() => []),
                    fetchPublicTestimonials().catch(() => []),
                  ]);
                  generateCapabilityStatementPDF({
                    company: draft,
                    publicProjects: projects,
                    testimonials,
                  });
                  onToast("✓ CAPABILITY STATEMENT OPENED — PRINT AS PDF");
                } catch (e) {
                  console.error("cap statement:", e);
                  onToast(e.message || "⚠ POPUP BLOCKED");
                }
              }}
              className="btn-ghost"
              style={{ marginLeft: "auto", padding: "8px 14px", fontSize: 12, borderColor: "var(--hazard-deep)", color: "var(--hazard-deep)" }}
            >
              <FileDown size={14} /> CAPABILITY STATEMENT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
