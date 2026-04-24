import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Lightbox } from "./Lightbox";
import { TrackingHeader } from "./TrackingHeader";
import { DispatchTrackingCard } from "./DispatchTrackingCard";

// Public tracking page for a single dispatch (linked from a tracking URL).
// Shows the company header, the dispatch card with all its FBs, and a footer.
export const DispatchTrackingPage = ({ dispatch, freightBills, company, onBack }) => {
  const [lightbox, setLightbox] = useState(null);

  if (!dispatch) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", maxWidth: 400 }}>
          <AlertCircle size={48} style={{ color: "var(--safety)", marginBottom: 16 }} />
          <h2 className="fbt-display" style={{ fontSize: 24, margin: "0 0 12px" }}>TRACKING LINK NOT FOUND</h2>
          <p style={{ color: "var(--concrete)", margin: "0 0 20px" }}>
            This tracking link may be invalid or the dispatch has been removed. Contact your dispatcher for a current link.
          </p>
          <button className="btn-ghost" onClick={onBack}>← BACK</button>
        </div>
      </div>
    );
  }

  const bills = freightBills
    .filter((fb) => fb.dispatchId === dispatch.id)
    .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }} className="texture-paper">
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      <TrackingHeader company={company} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", letterSpacing: "0.15em", marginBottom: 8 }}>
          ▸ DISPATCH #{dispatch.code}
        </div>
        <h1 className="fbt-display" style={{ fontSize: 36, margin: "0 0 8px", lineHeight: 1 }}>
          JOB TRACKING
        </h1>
        <p style={{ color: "var(--concrete)", margin: "0 0 24px", fontSize: 14 }}>
          Real-time status of your trucking job. Refresh the page to see new updates.
        </p>

        <DispatchTrackingCard dispatch={dispatch} bills={bills} expanded={true} onPhotoClick={setLightbox} />

        <div className="fbt-mono" style={{ marginTop: 32, fontSize: 10, color: "var(--concrete)", textAlign: "center", letterSpacing: "0.12em", lineHeight: 1.8 }}>
          ▸ QUESTIONS? CONTACT YOUR DISPATCHER<br />
          ▸ {company?.name || "4 BROTHERS TRUCKING"}{company?.phone && ` · ${company.phone}`}{company?.email && ` · ${company.email}`}
        </div>
      </div>
    </div>
  );
};
