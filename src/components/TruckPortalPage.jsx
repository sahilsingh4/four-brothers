import { useState, useEffect } from "react";
import { AlertCircle, ArrowUpRight, FileText, Truck } from "lucide-react";
import { fetchTruckForPublic, fetchTruckDocSignedUrl, COMPLIANCE_DOC_TYPES, getComplianceStatus } from "../db";
import { GlobalStyles } from "./GlobalStyles";

// Public page reached via /#/truck/<token>. Driver opens it on the side of
// the road and shows the cop the truck's registration / insurance / DOT
// inspection / etc. No login required — token-only auth.
//
// Each doc's actual file is fetched via the truck-doc-signed-url Edge
// Function: tap "View", get a fresh 60-second signed URL, open it. URLs
// don't sit in the page HTML, so screenshotting the page text doesn't
// expose long-lived links.
//
// Driver PII (CDL, medical card) is intentionally NOT shown here — those
// docs have null truck_unit on compliance_documents, so the public RPC
// fetch_truck_for_public can't return them.
const labelFor = (doc) => {
  if (doc.docType === "other") return doc.customTypeLabel || "Other";
  const t = COMPLIANCE_DOC_TYPES.find((x) => x.key === doc.docType);
  return t ? t.label : doc.docType;
};

const expiryColor = (sev) => ({
  4: "var(--safety)",
  3: "var(--safety)",
  2: "var(--warn-fg)",
  1: "var(--concrete)",
  0: "var(--good)",
}[sev] || "var(--concrete)");

export const TruckPortalPage = ({ token, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [truckUnit, setTruckUnit] = useState(null);
  const [docs, setDocs] = useState([]);
  const [openingId, setOpeningId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTruckForPublic(token);
        if (cancelled) return;
        if (!data) {
          setError("This roadside link is invalid or has been revoked. Ask the dispatcher for a new one.");
        } else {
          setTruckUnit(data.truckUnit);
          setDocs(data.docs);
        }
      } catch (e) {
        if (cancelled) return;
        if (e?.code === "RPC_ERROR") {
          setError("Server error loading truck docs — try again in a minute.");
        } else {
          setError("Couldn't load — check your connection and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleView = async (doc) => {
    setOpeningId(doc.docId);
    try {
      const url = await fetchTruckDocSignedUrl(token, doc.docId);
      if (!url) {
        alert("Couldn't open this document — try again.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="fbt-root" style={{ minHeight: "100vh", padding: "16px 14px 32px", maxWidth: 540, margin: "0 auto" }}>
      <GlobalStyles />
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0 18px", borderBottom: "2px solid var(--steel)", marginBottom: 18 }}>
        <Truck size={28} style={{ color: "var(--hazard-deep)" }} />
        <div>
          <div className="fbt-mono" style={{ fontSize: 11, color: "var(--concrete)" }}>4 BROTHERS TRUCKING · ROADSIDE</div>
          <div className="fbt-display" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 2 }}>
            {loading ? "Loading…" : truckUnit ? `Truck #${truckUnit}` : "Roadside"}
          </div>
        </div>
      </div>

      {loading && (
        <div className="fbt-card" style={{ padding: 24, textAlign: "center", color: "var(--concrete)", fontSize: 13 }}>
          Loading truck documents…
        </div>
      )}

      {error && (
        <div className="fbt-card" style={{ padding: 18, borderLeft: "4px solid var(--safety)", background: "var(--danger-soft)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <AlertCircle size={20} style={{ color: "var(--safety)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div className="fbt-display" style={{ fontSize: 15, color: "var(--safety)" }}>Link not active</div>
              <div style={{ fontSize: 13, color: "var(--steel)", marginTop: 6, lineHeight: 1.5 }}>{error}</div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && docs.length === 0 && (
        <div className="fbt-card" style={{ padding: 24, textAlign: "center", color: "var(--concrete)", fontSize: 13 }}>
          <FileText size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div>No documents on file for this truck yet.</div>
          <div style={{ fontSize: 11, marginTop: 6 }}>Ask the dispatcher to upload registration / insurance / DOT inspection.</div>
        </div>
      )}

      {!loading && !error && docs.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          {docs.map((d) => {
            const status = getComplianceStatus(d.expiryDate);
            const isExpired = status.status === "expired";
            return (
              <button
                key={d.docId}
                type="button"
                onClick={() => handleView(d)}
                disabled={openingId === d.docId}
                className="fbt-card"
                style={{
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textAlign: "left",
                  cursor: openingId === d.docId ? "wait" : "pointer",
                  border: isExpired ? "2px solid var(--safety)" : "1px solid var(--line)",
                  background: "#FFF",
                  color: "var(--steel)",
                  fontFamily: "inherit",
                  fontSize: 14,
                  width: "100%",
                  transition: "background 0.12s",
                }}
              >
                <FileText size={22} style={{ color: "var(--hazard-deep)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{labelFor(d)}</div>
                  <div style={{ fontSize: 11, color: "var(--concrete)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.fileName || "—"}
                  </div>
                  {d.expiryDate && (
                    <div style={{ fontSize: 11, color: expiryColor(status.severity), marginTop: 3, fontWeight: 600 }}>
                      {isExpired ? "EXPIRED" : `Expires ${d.expiryDate}`}
                      {status.daysUntilExpiry !== null && status.status !== "expired" && status.daysUntilExpiry <= 90 && ` · ${status.daysUntilExpiry}d`}
                    </div>
                  )}
                </div>
                <ArrowUpRight size={18} style={{ color: "var(--concrete)", flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 24, padding: 12, fontSize: 11, color: "var(--concrete)", textAlign: "center", lineHeight: 1.5 }}>
        For verification only. Documents are real-time copies of files on record.
        {onBack && (
          <div style={{ marginTop: 10 }}>
            <button onClick={onBack} className="btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>
              ← Back to home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
