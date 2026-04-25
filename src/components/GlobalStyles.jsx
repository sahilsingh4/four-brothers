// App-wide CSS injected as a single <style> element. Lives in its own module so
// route-level pages (DriverPayPortalPage, CustomerPortal, etc.) can render it
// when they're loaded as their own chunks via React.lazy.
//
// v23 (mock-driven redesign): Inter typography everywhere, sentence-case
// headings, soft drop shadows, 1px slate borders, pill-shaped chips, no
// decorative stripes/grain/corner-marks. Token names (--hazard, --steel,
// --cream) preserved so legacy inline styles in components still resolve.
export const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    :root {
      /* Modern palette — slate text, blue accent, white surface, slate-50 page bg */
      --hazard:#3B82F6;          /* primary accent (blue 500) */
      --hazard-deep:#2563EB;     /* hover / focus accent (blue 600) */
      --steel:#0F172A;           /* primary text (slate 900) */
      --concrete:#64748B;        /* muted text (slate 500) */
      --cream:#FFFFFF;           /* card surfaces */
      --surface:#F8FAFC;         /* page bg + tinted hovers (slate 50) */
      --rust:#1D4ED8;            /* deep accent (blue 700) */
      --safety:#DC2626;          /* error red */
      --good:#16A34A;            /* success green */
      --line:#E2E8F0;            /* borders / dividers (slate 200) */
      /* Soft tinted backgrounds for chips */
      --accent-soft:#EFF6FF;
      --accent-border:#BFDBFE;
      --good-soft:#F0FDF4;
      --good-border:#BBF7D0;
      --warn-bg:#FEF3C7;
      --warn-fg:#D97706;
      --warn-border:#FCD34D;
      --danger-soft:#FEF2F2;
      --danger-border:#FCA5A5;
    }
    * { box-sizing: border-box; }
    body { margin: 0; }
    .fbt-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: var(--steel);
      background: var(--surface);
      min-height: 100vh;
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    /* fbt-display + fbt-mono kept as utility classes but mapped to Inter weights
       so legacy components rendering "FB #123" or stat numbers don't look out of
       place. Anything that explicitly opts into a weight via inline style still
       works. */
    .fbt-display { font-family: 'Inter', sans-serif; font-weight: 600; letter-spacing: -0.01em; }
    .fbt-mono { font-family: 'Inter', sans-serif; font-weight: 500; }
    .hazard-stripe { background: linear-gradient(180deg, var(--accent-soft), transparent); }
    .hazard-stripe-thin { background: var(--accent-soft); }
    .texture-paper { background: var(--surface); }
    .grain::before { display: none; }

    /* === Buttons === */
    .btn-primary {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--hazard); color: #FFF;
      border: 1px solid var(--hazard-deep);
      padding: 9px 16px; border-radius: 6px;
      font-family: inherit; font-weight: 500; font-size: 13px;
      letter-spacing: 0; text-transform: none;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(15,23,42,0.06);
      transition: all 0.15s ease;
    }
    .btn-primary:hover { background: var(--hazard-deep); box-shadow: 0 2px 6px rgba(37,99,235,0.18); }
    .btn-primary:active { transform: translateY(1px); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    .btn-ghost {
      display: inline-flex; align-items: center; gap: 6px;
      background: #FFF; color: var(--steel);
      border: 1px solid var(--line);
      padding: 8px 14px; border-radius: 6px;
      font-family: inherit; font-weight: 500; font-size: 13px;
      letter-spacing: 0; text-transform: none;
      cursor: pointer;
      transition: all 0.12s;
    }
    .btn-ghost:hover { background: var(--surface); border-color: var(--concrete); }
    .btn-danger {
      background: #FFF; color: var(--safety);
      border: 1px solid var(--safety);
      padding: 6px 10px; border-radius: 6px;
      font-size: 12px; cursor: pointer;
      font-family: inherit; font-weight: 500;
      letter-spacing: 0; text-transform: none;
      transition: all 0.12s;
    }
    .btn-danger:hover { background: var(--safety); color: #FFF; }

    /* === Inputs === */
    .fbt-input, .fbt-select, .fbt-textarea {
      width: 100%;
      padding: 9px 12px;
      background: #FFF;
      border: 1px solid var(--line);
      border-radius: 6px;
      font-family: inherit;
      font-size: 14px;
      color: var(--steel);
      outline: none;
      transition: border-color 0.12s, box-shadow 0.12s;
    }
    .fbt-input:focus, .fbt-select:focus, .fbt-textarea:focus {
      border-color: var(--hazard);
      box-shadow: 0 0 0 3px rgba(59,130,246,0.18);
    }
    .fbt-textarea { resize: vertical; min-height: 80px; }
    .fbt-label {
      display: block;
      font-family: inherit;
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0;
      font-size: 12px;
      margin-bottom: 6px;
      color: var(--concrete);
    }

    /* === Cards === */
    .fbt-card {
      background: #FFF;
      border: 1px solid var(--line);
      border-radius: 10px;
      box-shadow: 0 1px 2px rgba(15,23,42,0.04);
    }

    /* === Nav tabs === */
    .nav-tab {
      padding: 7px 12px;
      font-family: inherit;
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0;
      font-size: 13px;
      cursor: pointer;
      color: var(--cream);
      border: 1px solid transparent;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .nav-tab:hover { background: rgba(255,255,255,0.10); }
    .nav-tab.active { background: rgba(255,255,255,0.15); color: #FFF; border-color: rgba(255,255,255,0.20); }

    /* === Tables === */
    .fbt-table { width: 100%; border-collapse: collapse; }
    .fbt-table th {
      background: var(--surface);
      color: var(--concrete);
      text-align: left;
      padding: 10px 12px;
      font-family: inherit;
      font-weight: 600;
      text-transform: none;
      letter-spacing: 0;
      font-size: 12px;
      border-bottom: 1px solid var(--line);
    }
    .fbt-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      font-family: inherit;
      font-size: 13px;
      color: var(--steel);
    }
    .fbt-table tr:hover td { background: var(--accent-soft); }

    /* === Stats === */
    .stat-num {
      font-family: inherit;
      font-weight: 700;
      font-size: clamp(20px, 4vw, 28px);
      line-height: 1.1;
      color: var(--steel);
      letter-spacing: -0.02em;
      word-break: break-word;
    }
    .stat-label {
      font-family: inherit;
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0;
      font-size: 12px;
      color: var(--concrete);
      margin-top: 6px;
    }

    /* === Animations === */
    @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .anim-up { animation: slideUp 0.3s ease-out both; }
    @keyframes truckRoll { 0%,100% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }
    .anim-roll { animation: truckRoll 3s ease-in-out infinite; }

    /* === Toast === */
    .toast {
      position: fixed; bottom: 24px; right: 24px;
      background: var(--steel); color: #FFF;
      padding: 12px 18px;
      border: 1px solid var(--steel);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(15,23,42,0.20);
      font-family: inherit;
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0;
      font-size: 13px;
      z-index: 200;
      animation: slideUp 0.3s ease-out;
      display: flex; align-items: center; gap: 10px;
    }

    .scroll-x { overflow-x: auto; }

    /* Decorative corner crosshairs — disabled in v23 (busy / no info). */
    .corner-mark { display: none; }

    /* === Modals === */
    .modal-bg {
      position: fixed; inset: 0;
      background: rgba(15,23,42,0.45);
      z-index: 100;
      display: flex; align-items: flex-start; justify-content: center;
      padding: 40px 20px; overflow-y: auto;
      backdrop-filter: blur(2px);
    }
    .modal-body {
      background: #FFF;
      border: 1px solid var(--line);
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(15,23,42,0.18), 0 4px 12px rgba(15,23,42,0.10);
      max-width: 720px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    }

    /* === Chips === */
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 9px;
      border: 1px solid var(--line);
      border-radius: 999px;
      font-family: inherit;
      font-size: 12px;
      text-transform: none;
      letter-spacing: 0;
      font-weight: 500;
      background: var(--surface);
      color: var(--concrete);
    }

    /* === Thumbs === */
    .thumb {
      width: 80px; height: 80px;
      object-fit: cover;
      border: 1px solid var(--line);
      border-radius: 6px;
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .thumb:hover { transform: scale(1.04); box-shadow: 0 4px 10px rgba(15,23,42,0.12); }

    /* === Mobile-specific === */
    @media (max-width: 480px) {
      /* Force any auto-fit grid inside cards/modals to single column on iPhone-SE-class widths. */
      .fbt-card [style*="repeat(auto-fit"],
      .fbt-card [style*="repeat(auto-fill"],
      .modal-body [style*="repeat(auto-fit"],
      .modal-body [style*="repeat(auto-fill"] {
        grid-template-columns: 1fr !important;
      }
    }
    @media (max-width: 640px) {
      .nav-tab { padding: 6px 10px; font-size: 12px; gap: 5px; }
      .modal-bg { padding: 12px 8px; align-items: flex-start; }
      .modal-body { max-height: 92vh; border-radius: 10px; }
      .fbt-table th, .fbt-table td { padding: 8px 8px; font-size: 12px; }
      .fbt-input, .fbt-select, .fbt-textarea { padding: 9px 11px; }
      .toast { bottom: 16px; right: 12px; left: 12px; padding: 10px 14px; font-size: 12px; }
      .stat-num { font-size: clamp(20px, 6vw, 26px); }
    }
  `}</style>
);
