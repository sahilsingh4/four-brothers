// App-wide CSS injected as a single <style> element. Lives in its own module so
// route-level pages (DriverPayPortalPage, CustomerPortal, etc.) can render it
// when they're loaded as their own chunks via React.lazy.
export const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;500;700&family=Oswald:wght@400;500;600;700&display=swap');
    /* v21: shifted to a lighter palette — white surfaces + light-blue accent.
       Token names kept (--hazard, --steel, --cream, etc.) so all the per-component
       inline styles that reference them swap automatically. */
    :root { --hazard:#60A5FA; --hazard-deep:#2563EB; --steel:#1E293B; --concrete:#64748B; --cream:#FFFFFF; --rust:#1D4ED8; --safety:#EF4444; --good:#16A34A; --line:#E2E8F0; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    .fbt-root { font-family: 'Oswald', sans-serif; color: var(--steel); background: var(--cream); min-height: 100vh; }
    .fbt-display { font-family: 'Archivo Black', sans-serif; letter-spacing: -0.02em; }
    .fbt-mono { font-family: 'JetBrains Mono', monospace; }
    .hazard-stripe { background: repeating-linear-gradient(-45deg, var(--hazard) 0 20px, var(--steel) 20px 40px); }
    .hazard-stripe-thin { background: repeating-linear-gradient(-45deg, var(--hazard) 0 8px, var(--steel) 8px 16px); }
    .texture-paper { background-color: var(--cream); background-image: radial-gradient(circle at 20% 50%, rgba(30,41,59,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(96,165,250,0.06) 0%, transparent 50%); }
    .grain::before { content:''; position:absolute; inset:0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); opacity:0.4; pointer-events:none; mix-blend-mode:multiply; }
    .btn-primary { background: var(--hazard); color: var(--steel); border: 3px solid var(--steel); padding: 14px 28px; font-family: 'Oswald', sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; font-size: 14px; cursor: pointer; box-shadow: 4px 4px 0 var(--steel); transition: all 0.12s ease; display: inline-flex; align-items: center; gap: 10px; }
    .btn-primary:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--steel); }
    .btn-primary:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 var(--steel); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: 4px 4px 0 var(--steel); }
    .btn-ghost { background: transparent; color: var(--steel); border: 2px solid var(--steel); padding: 10px 20px; font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 13px; cursor: pointer; transition: all 0.15s; }
    .btn-ghost:hover { background: var(--steel); color: var(--cream); }
    .btn-danger { background: transparent; color: var(--safety); border: 2px solid var(--safety); padding: 6px 12px; font-size: 11px; cursor: pointer; font-family: 'JetBrains Mono', monospace; font-weight: 500; text-transform: uppercase; transition: all 0.12s; }
    .btn-danger:hover { background: var(--safety); color: var(--cream); }
    .fbt-input, .fbt-select, .fbt-textarea { width: 100%; padding: 12px 14px; background: var(--cream); border: 2px solid var(--steel); font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--steel); outline: none; }
    .fbt-input:focus, .fbt-select:focus, .fbt-textarea:focus { background: #FFF; border-color: var(--hazard-deep); box-shadow: 3px 3px 0 var(--hazard); }
    .fbt-textarea { resize: vertical; min-height: 80px; }
    .fbt-label { display: block; font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; margin-bottom: 6px; color: var(--concrete); }
    .fbt-card { background: #FFF; border: 2px solid var(--steel); box-shadow: 6px 6px 0 var(--steel); }
    .nav-tab { padding: 10px 20px; font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; font-size: 13px; cursor: pointer; color: var(--cream); border: 2px solid transparent; display: flex; align-items: center; gap: 8px; transition: all 0.15s; }
    .nav-tab:hover { background: rgba(96,165,250,0.18); }
    .nav-tab.active { background: var(--hazard); color: var(--steel); }
    .fbt-table { width: 100%; border-collapse: collapse; }
    .fbt-table th { background: var(--steel); color: var(--hazard); text-align: left; padding: 10px 12px; font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; border-right: 1px solid var(--concrete); }
    .fbt-table td { padding: 10px 12px; border-bottom: 1px solid #E7E5E4; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--steel); }
    .fbt-table tr:hover td { background: #EFF6FF; }
    .stat-num { font-family: 'Archivo Black', sans-serif; font-size: clamp(22px, 4vw, 36px); line-height: 1.1; color: var(--steel); word-break: break-all; }
    .stat-label { font-family: 'Oswald', sans-serif; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; font-size: 11px; color: var(--concrete); margin-top: 6px; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .anim-up { animation: slideUp 0.5s ease-out both; }
    @keyframes truckRoll { 0%,100% { transform: translateX(-10px); } 50% { transform: translateX(10px); } }
    .anim-roll { animation: truckRoll 3s ease-in-out infinite; }
    .toast { position: fixed; bottom: 24px; right: 24px; background: var(--steel); color: var(--hazard); padding: 14px 20px; border: 2px solid var(--hazard); box-shadow: 6px 6px 0 var(--hazard); font-family: 'Oswald', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 13px; z-index: 200; animation: slideUp 0.3s ease-out; display: flex; align-items: center; gap: 10px; }
    .scroll-x { overflow-x: auto; }
    .corner-mark { position: absolute; width: 14px; height: 14px; border: 2px solid var(--steel); }
    .corner-mark.tl { top: -2px; left: -2px; border-right: none; border-bottom: none; }
    .corner-mark.tr { top: -2px; right: -2px; border-left: none; border-bottom: none; }
    .corner-mark.bl { bottom: -2px; left: -2px; border-right: none; border-top: none; }
    .corner-mark.br { bottom: -2px; right: -2px; border-left: none; border-top: none; }
    .modal-bg { position: fixed; inset: 0; background: rgba(28,25,23,0.6); z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px; overflow-y: auto; }
    .modal-body { background: var(--cream); border: 3px solid var(--hazard); box-shadow: 10px 10px 0 var(--steel); max-width: 720px; width: 100%; max-height: 90vh; overflow-y: auto; }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1.5px solid var(--steel); font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
    .thumb { width: 80px; height: 80px; object-fit: cover; border: 2px solid var(--steel); cursor: pointer; transition: transform 0.1s; }
    .thumb:hover { transform: scale(1.05); box-shadow: 3px 3px 0 var(--hazard); }

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
    }

    /* v19c Session K: Mobile-specific rules — applies on phone widths (≤640px) */
    @media (max-width: 640px) {
      /* Nav tabs — smaller padding, smaller font so 13 tabs fit */
      .nav-tab { padding: 8px 12px; font-size: 11px; letter-spacing: 0.06em; gap: 5px; }
      /* Modal — reduce outer padding, smaller shadow (saves horizontal space) */
      .modal-bg { padding: 12px 8px; align-items: flex-start; }
      .modal-body { box-shadow: 4px 4px 0 var(--steel); border-width: 2px; max-height: 92vh; }
      /* Cards — smaller shadows on phone (6px was eating horizontal space) */
      .fbt-card { box-shadow: 3px 3px 0 var(--steel); }
      /* Tables — smaller font + tighter padding */
      .fbt-table th, .fbt-table td { padding: 8px 8px; font-size: 12px; }
      /* Inputs — slightly smaller padding */
      .fbt-input, .fbt-select, .fbt-textarea { padding: 10px 12px; }
      /* Toast — less right margin */
      .toast { bottom: 16px; right: 12px; left: 12px; padding: 12px 16px; font-size: 12px; }
      /* Stat numbers — smaller ceiling on phones */
      .stat-num { font-size: clamp(20px, 6vw, 28px); }
    }
  `}</style>
);
