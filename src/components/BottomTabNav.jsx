import { useState } from "react";
import { MoreHorizontal, X } from "lucide-react";

// Phone-only fixed bottom navigation. Surfaces the four highest-traffic tabs
// (Home, Orders, Review, Invoices) plus a "More" button that opens a sheet
// listing the rest. Hidden on desktop — the existing top nav row handles
// that. Includes safe-area-inset support so the bar doesn't hide under the
// iPhone home indicator.
export const BottomTabNav = ({ tabs, active, setTab }) => {
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = ["home", "dispatches", "review", "invoices"]
    .map((k) => tabs.find((t) => t.k === k))
    .filter(Boolean);
  const overflow = tabs.filter((t) => !primary.find((p) => p.k === t.k));

  const handleTap = (k) => {
    setTab(k);
    setMoreOpen(false);
  };

  return (
    <>
      <nav className="fbt-bottom-nav" role="navigation" aria-label="Primary">
        {primary.map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => handleTap(t.k)}
            className={`fbt-bottom-nav-btn ${active === t.k ? "active" : ""}`}
          >
            {t.ico}
            <span>{t.l}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`fbt-bottom-nav-btn ${overflow.some((t) => t.k === active) ? "active" : ""}`}
          aria-label="More tabs"
        >
          <MoreHorizontal size={18} />
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
            zIndex: 1100, display: "flex", alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#FFF",
              borderTopLeftRadius: 14, borderTopRightRadius: 14,
              width: "100%",
              padding: `14px 14px calc(14px + env(safe-area-inset-bottom, 0px))`,
              boxShadow: "0 -4px 20px rgba(15,23,42,0.20)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="fbt-display" style={{ fontSize: 16 }}>More tabs</div>
              <button onClick={() => setMoreOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {overflow.map((t) => (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => handleTap(t.k)}
                  className={`fbt-bottom-more-btn ${active === t.k ? "active" : ""}`}
                >
                  {t.ico}
                  <span>{t.l}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fbt-bottom-nav {
          display: none;
          position: fixed;
          left: 0; right: 0;
          bottom: 0;
          background: #FFF;
          border-top: 1px solid var(--line);
          padding: 6px 4px calc(6px + env(safe-area-inset-bottom, 0px));
          z-index: 900;
          justify-content: space-around;
          align-items: stretch;
          box-shadow: 0 -2px 12px rgba(15,23,42,0.08);
        }
        .fbt-bottom-nav-btn {
          flex: 1;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 6px 4px;
          color: var(--concrete);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          font-size: 10px;
          font-weight: 600;
          border-radius: 6px;
          transition: color 0.1s, background 0.1s;
          min-width: 0;
          position: relative;
        }
        .fbt-bottom-nav-btn span {
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .fbt-bottom-nav-btn.active {
          color: var(--steel);
        }
        .fbt-bottom-nav-btn.active::after {
          content: "";
          position: absolute;
          bottom: 0;
          width: 28px;
          height: 3px;
          background: var(--hazard);
          border-radius: 2px 2px 0 0;
        }
        .fbt-bottom-nav-btn:active {
          background: rgba(15,23,42,0.05);
        }
        .fbt-bottom-more-btn {
          background: #F8FAFC;
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 12px 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--steel);
        }
        .fbt-bottom-more-btn.active {
          background: var(--steel);
          color: var(--cream);
          border-color: var(--steel);
        }
        @media (max-width: 768px) {
          .fbt-bottom-nav { display: flex; }
          /* Add bottom padding to page content so it doesn't hide under the bar */
          .fbt-page-content { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important; }
          /* Hide the scrolly top nav-row on phone — bottom bar replaces it */
          .fbt-nav-row { display: none !important; }
        }
      `}</style>
    </>
  );
};
