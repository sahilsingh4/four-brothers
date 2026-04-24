import { useState, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Lightbox } from "./Lightbox";
import { TrackingHeader } from "./TrackingHeader";
import { DispatchTrackingCard } from "./DispatchTrackingCard";
import { matchesClientToken } from "../utils";

// Public client-wide tracking page (`#/client/:token`). Shows every dispatch
// that matches the deterministic client/sub token, with summary stats and a
// list of DispatchTrackingCards. Renders a friendly "no jobs found" panel
// for invalid or expired tokens.
export const ClientTrackingPage = ({ token, dispatches, freightBills, company, onBack }) => {
  const [lightbox, setLightbox] = useState(null);
  const matched = useMemo(
    () => dispatches
      .filter((d) => matchesClientToken(d, token))
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [dispatches, token]
  );

  if (matched.length === 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="fbt-card" style={{ padding: 40, textAlign: "center", maxWidth: 400 }}>
          <AlertCircle size={48} style={{ color: "var(--safety)", marginBottom: 16 }} />
          <h2 className="fbt-display" style={{ fontSize: 24, margin: "0 0 12px" }}>NO JOBS FOUND</h2>
          <p style={{ color: "var(--concrete)", margin: "0 0 20px" }}>
            This client tracking link has no dispatches yet, or the link is invalid. Contact your dispatcher.
          </p>
          <button className="btn-ghost" onClick={onBack}>← BACK</button>
        </div>
      </div>
    );
  }

  // Derive display client name from first matched dispatch
  const clientName = matched[0].clientName || matched[0].subContractor || "Your Jobs";

  // Stats
  const allBills = matched.flatMap((d) => freightBills.filter((fb) => fb.dispatchId === d.id));
  const totalTons = allBills.reduce((s, fb) => s + (Number(fb.tonnage) || 0), 0);
  const openCount = matched.filter((d) => {
    const b = freightBills.filter((fb) => fb.dispatchId === d.id);
    return d.status !== "closed" && b.length < d.trucksExpected;
  }).length;
  const completeCount = matched.filter((d) => {
    const b = freightBills.filter((fb) => fb.dispatchId === d.id);
    return d.status === "closed" || b.length >= d.trucksExpected;
  }).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }} className="texture-paper">
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      <TrackingHeader company={company} />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--hazard-deep)", letterSpacing: "0.15em", marginBottom: 8 }}>
          ▸ CLIENT PORTAL
        </div>
        <h1 className="fbt-display" style={{ fontSize: 36, margin: "0 0 8px", lineHeight: 1 }}>
          {clientName.toUpperCase()}
        </h1>
        <p style={{ color: "var(--concrete)", margin: "0 0 24px", fontSize: 14 }}>
          All your jobs with us, in one place. Refresh the page to see new freight bills as they come in.
        </p>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
          <div className="fbt-card" style={{ padding: 16 }}>
            <div className="stat-num" style={{ fontSize: 36 }}>{matched.length}</div>
            <div className="stat-label">Total Jobs</div>
          </div>
          <div className="fbt-card" style={{ padding: 16, background: openCount > 0 ? "#FEF3C7" : "#FFF" }}>
            <div className="stat-num" style={{ fontSize: 36 }}>{openCount}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="fbt-card" style={{ padding: 16 }}>
            <div className="stat-num" style={{ fontSize: 36 }}>{completeCount}</div>
            <div className="stat-label">Complete</div>
          </div>
          <div className="fbt-card" style={{ padding: 16, background: "var(--hazard)" }}>
            <div className="stat-num" style={{ fontSize: 36 }}>{totalTons.toFixed(0)}</div>
            <div className="stat-label">Total Tons</div>
          </div>
        </div>

        <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)", letterSpacing: "0.15em", marginBottom: 14 }}>
          ▸ JOBS ({matched.length})
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          {matched.map((d) => {
            const bills = freightBills.filter((fb) => fb.dispatchId === d.id).sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
            return <DispatchTrackingCard key={d.id} dispatch={d} bills={bills} expanded={true} onPhotoClick={setLightbox} />;
          })}
        </div>

        <div className="fbt-mono" style={{ marginTop: 40, fontSize: 10, color: "var(--concrete)", textAlign: "center", letterSpacing: "0.12em", lineHeight: 1.8 }}>
          ▸ QUESTIONS? CONTACT YOUR DISPATCHER<br />
          ▸ {company?.name || "4 BROTHERS TRUCKING"}{company?.phone && ` · ${company.phone}`}{company?.email && ` · ${company.email}`}
        </div>
      </div>
    </div>
  );
};
