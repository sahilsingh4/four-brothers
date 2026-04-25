// App-wide CSS injected as a single <style> element. Lives in its own module so
// route-level pages (DriverPayPortalPage, CustomerPortal, etc.) can render it
// when they're loaded as their own chunks via React.lazy.
export const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;500;700&family=Oswald:wght@400;500;600;700&display=swap');
    /* v22: lighter chrome — replaced the heavy 2–3px steel borders + brutalist
       offset shadows with 1px slate-200 borders + soft drop shadows + subtle
       border radius. Token names unchanged so all per-component inline styles
       still resolve. */
    :root { --hazard:#60A5FA; --hazard-deep:#2563EB; --steel:#1E293B; --concrete:#64748B; --cream:#FFFFFF; --rust:#1D4ED8; --safety:#EF4444; --good:#16A34A; --line:#E2E8F0; --surface:#F8FAFC; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    .fbt-root { font-family: 'Oswald', sans-serif; color: var(--steel); background: var(--surface); min-height: 100vh; }
    .fbt-display { font-family: 'Archivo Black', sans-serif; letter-spacing: -0.02em; }
    .fbt-mono { font-family: 'JetBrains Mono', monospace; }
    /* Hazard stripe — lighter, used as a subtle accent (not warning tape). */
    .hazard-stripe { background: repeating-linear-gradient(-45deg, var(--hazard) 0 20px, var(--line) 20px 40px); }
    .hazard-stripe-thin { background: repeating-linear-gradient(-45deg, var(--hazard) 0 8px, var(--line) 8px 16px); }
    .texture-paper { background-color: var(--surface); background-image: radial-gradient(circle at 20% 50%, rgba(30,41,59,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(96,165,250,0.06) 0%, transparent 50%); }
    .grain::before { content:''; position:absolute; inset:0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.10 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); opacity:0.25; pointer-events:none; mix-blend-mode:multiply; }
    /* Buttons — soft pill shape, no offset shadow. Hover lift is now a small drop shadow. */
    .btn-primary { background: var(--hazard); color: #FFF; border: 1px solid var(--hazard-deep); border-radius: 6px; padding: 12px 22px; font-family: 'Oswald', sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; font-size: 13px; cursor: pointer; box-shadow: 0 1px 2px rgba(15,23,42,0.06); transition: all 0.15s ease; display: inline-flex; align-items: center; gap: 10px; }
    .btn-primary:hover { background: var(--hazard-deep); box-shadow: 0 4px 8px rgba(37,99,235,0.18); transform: translateY(-1px); }
    .btn-primary:active { transform: translateY(0); box-shadow: 0 1px 2px rgba(15,23,42,0.06); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
    .btn-ghost { background: transparent; color: var(--steel); border: 1px solid var(--line); border-radius: 6px; padding: 9px 18px; font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; cursor: pointer; transition: all 0.15s; }
    .btn-ghost:hover { background: var(--surface); border-color: var(--concrete); color: var(--steel); }
    .btn-danger { background: transparent; color: var(--safety); border: 1px solid var(--safety); border-radius: 6px; padding: 6px 12px; font-size: 11px; cursor: pointer; font-family: 'JetBrains Mono', monospace; font-weight: 500; text-transform: uppercase; transition: all 0.12s; }
    .btn-danger:hover { background: var(--safety); color: #FFF; }
    /* Inputs — light slate-200 border, 6px radius, blue focus ring (no offset). */
    .fbt-input, .fbt-select, .fbt-textarea { width: 100%; padding: 10px 12px; background: #FFF; border: 1px solid var(--line); border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--steel); outline: none; transition: border-color 0.12s, box-shadow 0.12s; }
    .fbt-input:focus, .fbt-select:focus, .fbt-textarea:focus { border-color: var(--hazard); box-shadow: 0 0 0 3px rgba(96,165,250,0.18); }
    .fbt-textarea { resize: vertical; min-height: 80px; }
    .fbt-label { display: block; font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; margin-bottom: 6px; color: var(--concrete); }
    /* Cards — soft drop shadow, 8px radius, light border. */
    .fbt-card { background: #FFF; border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.03); }
    .nav-tab { padding: 9px 16px; font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 13px; cursor: pointer; color: var(--cream); border: 1px solid transparent; border-radius: 6px; display: flex; align-items: center; gap: 8px; transition: all 0.15s; }
    .nav-tab:hover { background: rgba(96,165,250,0.18); }
    .nav-tab.active { background: var(--hazard); color: #FFF; border-color: var(--hazard-deep); }
    .fbt-table { width: 100%; border-collapse: collapse; }
    .fbt-table th { background: var(--surface); color: var(--steel); text-align: left; padding: 10px 12px; font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; border-bottom: 1px solid var(--line); }
    .fbt-table td { padding: 10px 12px; border-bottom: 1px solid var(--line); font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--steel); }
    .fbt-table tr:hover td { background: #EFF6FF; }
    .stat-num { font-family: 'Archivo Black', sans-serif; font-size: clamp(22px, 4vw, 36px); line-height: 1.1; color: var(--steel); word-break: break-all; }
    .stat-label { font-family: 'Oswald', sans-serif; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; font-size: 11px; color: var(--concrete); margin-top: 6px; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .anim-up { animation: slideUp 0.5s ease-out both; }
    @keyframes truckRoll { 0%,100% { transform: translateX(-10px); } 50% { transform: translateX(10px); } }
    .anim-roll { animation: truckRoll 3s ease-in-out infinite; }
    /* Toast — lighter, soft drop shadow. */
    .toast { position: fixed; bottom: 24px; right: 24px; background: var(--steel); color: #FFF; padding: 12px 18px; border: 1px solid var(--steel); border-radius: 8px; box-shadow: 0 6px 20px rgba(15,23,42,0.20); font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; font-size: 13px; z-index: 200; animation: slideUp 0.3s ease-out; display: flex; align-items: center; gap: 10px; }
    .scroll-x { overflow-x: auto; }
    /* Decorative corner crosshairs — keep on desktop, hide on mobile (heavy look). */
    .corner-mark { position: absolute; width: 12px; height: 12px; border: 1px solid var(--line); }
    .corner-mark.tl { top: -1px; left: -1px; border-right: none; border-bottom: none; }
    .corner-mark.tr { top: -1px; right: -1px; border-left: none; border-bottom: none; }
    .corner-mark.bl { bottom: -1px; left: -1px; border-right: none; border-top: none; }
    .corner-mark.br { bottom: -1px; right: -1px; border-left: none; border-top: none; }
    /* Modal backdrop — lighter slate so the modal feels like it floats. */
    .modal-bg { position: fixed; inset: 0; background: rgba(15,23,42,0.4); z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px; overflow-y: auto; backdrop-filter: blur(2px); }
    .modal-body { background: #FFF; border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 10px 40px rgba(15,23,42,0.15), 0 4px 12px rgba(15,23,42,0.08); max-width: 720px; width: 100%; max-height: 90vh; overflow-y: auto; }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border: 1px solid var(--line); border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; background: var(--surface); }
    .thumb { width: 80px; height: 80px; object-fit: cover; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; transition: transform 0.1s, box-shadow 0.1s; }
    .thumb:hover { transform: scale(1.05); box-shadow: 0 4px 10px rgba(15,23,42,0.12); }

    /* v21: Force auto-fit/auto-fill grids inside modals + content cards to
       collapse to a single column on iPhone-SE-class widths. Without this,
       grids declared with minmax(220–340px, 1fr) overflow the modal because
       a single column can't shrink below the minmax floor. Overrides inline
       grid-template-columns via attribute selector + !important. */
    @media (max-width: 480px) {
      .fbt-card [style*="repeat(auto-fit"],
      .fbt-card [style*="repeat(auto-fill"],
      .modal-body [style*="repeat(auto-fit"],
      .modal-body [style*="repeat(auto-fill"] {
        grid-template-columns: 1fr !important;
      }
      /* Hide decorative corner crosshairs on phone — heavy look without info value. */
      .corner-mark { display: none; }
    }

    /* v19c Session K: Mobile-specific rules — applies on phone widths (≤640px) */
    @media (max-width: 640px) {
      /* Nav tabs — smaller padding, smaller font so 13 tabs fit */
      .nav-tab { padding: 7px 11px; font-size: 11px; letter-spacing: 0.04em; gap: 5px; }
      /* Modal — reduce outer padding (saves horizontal space) */
      .modal-bg { padding: 12px 8px; align-items: flex-start; }
      .modal-body { max-height: 92vh; border-radius: 10px; }
      /* Tables — smaller font + tighter padding */
      .fbt-table th, .fbt-table td { padding: 8px 8px; font-size: 12px; }
      /* Inputs — slightly smaller padding */
      .fbt-input, .fbt-select, .fbt-textarea { padding: 9px 11px; }
      /* Toast — less right margin */
      .toast { bottom: 16px; right: 12px; left: 12px; padding: 10px 14px; font-size: 12px; border-radius: 8px; }
      /* Stat numbers — smaller ceiling on phones */
      .stat-num { font-size: clamp(20px, 6vw, 28px); }
    }
  `}</style>
);
