// ─── TOP SECRET FC · Shared Layout ────────────────────────────────────────────
// Injects topbar, left sidebar, and right sidebar into every page.
// Edit this file once → changes replicate everywhere.

(function () {

  // ── Theme — apply immediately to avoid flash ──────────────────────────────
  const THEME_KEY = 'ts_theme';
  const htmlEl = document.documentElement;

  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light') htmlEl.classList.add('light-mode');
  else if (stored === 'dark') { /* dark plata: no class, look original */ }
  else if (stored === 't3') htmlEl.classList.add('t3-mode');
  else htmlEl.classList.add('cls-mode'); // null o 'cls' → Clasificado (negro+dorado) es el default

  const PAGES = [
    { url: 'index.html',        label: 'Inicio', svg: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>' },
    { url: 'plantilla.html',    label: 'Equipo', svg: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>' },
    { url: 'estadisticas.html', label: 'Stats',  svg: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
    { url: 'posiciones.html',   label: 'Liga',   svg: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>' },
    { url: 'calendario.html',   label: 'Cal.',   svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
    { url: 'convocatoria.html?vista', label: 'Conv.',  svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><path d="M8 12l3 3 5-5"/>' },
    { url: 'noticias.html',     label: 'News',  svg: '<path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>' },
    { url: 'plan-de-juego.html',   label: 'Plan',   svg: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>' },
    { url: 'reclutamiento.html',   label: 'Reclu.', svg: '<path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>' },
  ];

  const currentFile = location.pathname.split('/').pop() || 'index.html';

  if (!document.querySelector('link[href*="Bebas+Neue"]')) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap';
    document.head.appendChild(font);
  }

  // ── CSS ────────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    :root{--gold:#B0B8C4;--gold2:#D4DAE4;}

    /* ── Topbar ── */
    .topbar{position:fixed;top:0;left:0;right:0;z-index:200;height:64px;background:#111111;border-bottom:3px solid var(--gold);display:flex;align-items:center;padding:0 16px 0 16px;gap:8px;}
    .tb-brand{display:flex;align-items:center;gap:22px;text-decoration:none;margin-right:auto;}
    .tb-brand img{height:44px;width:auto;object-fit:contain;}
    .tb-brand-name{font-family:'Bebas Neue',sans-serif;font-size:2.1rem;font-weight:400;letter-spacing:.1em;color:#FFFFFF;line-height:1;}
    .tb-brand-name span{color:var(--gold);}
    .tb-center{display:none;}
    .tb-logos{display:flex;align-items:center;gap:40px;margin-right:4px;}
    .tb-counter{display:flex;align-items:center;gap:5px;padding:5px 11px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.22);border-radius:20px;font-size:.72rem;font-weight:700;letter-spacing:.04em;color:var(--gold);white-space:nowrap;flex-shrink:0;cursor:default;user-select:none;}
    .tb-counter svg{width:13px;height:13px;flex-shrink:0;opacity:.85;}
    @media(max-width:640px){.tb-counter{padding:4px 9px;font-size:.68rem;}}
    .tb-logos img{width:auto;object-fit:contain;opacity:.95;}
    .tb-logos img[alt="EA FC 26"]{height:100px;}
    .tb-logos img[alt="Clubs Pro"]{height:90px;}
    .tb-sep{width:1px;height:22px;background:rgba(255,255,255,.12);flex-shrink:0;}

    /* ── Theme toggle button ── */
    .tb-theme-btn{width:32px;height:32px;border-radius:6px;border:1px solid rgba(255,255,255,.15);background:transparent;color:rgba(255,255,255,.5);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color .15s,border-color .15s,background-color .15s;flex-shrink:0;padding:0;}
    .tb-theme-btn:hover{color:var(--gold);border-color:rgba(201,168,76,.4);background:rgba(201,168,76,.06);}
    .tb-theme-btn svg{width:15px;height:15px;pointer-events:none;}

    /* ── Left sidebar ── */
    .sidebar-left{position:fixed;top:64px;left:0;z-index:100;width:64px;height:calc(100vh - 64px);background:#111111;border-right:1px solid rgba(176,184,196,.15);display:flex;flex-direction:column;align-items:center;padding:20px 0;gap:4px;}
    .sl-link{width:44px;height:44px;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;text-decoration:none;color:rgba(255,255,255,.35);transition:background-color .15s,color .15s;}
    .sl-link svg{width:18px;height:18px;}
    .sl-link span{font-size:8px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;}
    .sl-link:hover{background:rgba(176,184,196,.1);color:rgba(255,255,255,.75);}
    .sl-link.active{background:rgba(176,184,196,.12);color:var(--gold);}

    /* ── Right sidebar — floating social bubbles ── */
    .sidebar-right{position:fixed;top:64px;right:0;z-index:100;width:56px;height:calc(100vh - 64px);display:flex;flex-direction:column;align-items:center;padding:24px 0;gap:14px;pointer-events:none;}
    .sr-icon{pointer-events:auto;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.35);transition:transform .2s ease, box-shadow .2s ease, background .2s ease;animation:sr-float 3.6s ease-in-out infinite;}
    .sr-icon svg{width:19px;height:19px;}
    .sr-icon:hover{transform:translateY(-4px) scale(1.08);}
    .sr-icon:nth-child(1){animation-delay:0s;}
    .sr-icon:nth-child(2){animation-delay:.5s;}
    .sr-icon:nth-child(3){animation-delay:1s;}
    .sr-icon:nth-child(4){animation-delay:1.5s;}
    @keyframes sr-float{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
    .sr-icon.sr-ig{color:#E1306C;background:rgba(225,48,108,.15);border:1px solid rgba(225,48,108,.32);}
    .sr-icon.sr-ig:hover{background:rgba(225,48,108,.28);box-shadow:0 8px 22px rgba(225,48,108,.4);}
    .sr-icon.sr-x{color:#fff;background:#0a0a0a;border:1px solid rgba(255,255,255,.24);}
    .sr-icon.sr-x:hover{background:#000;box-shadow:0 8px 22px rgba(0,0,0,.45);}
    .sr-icon.sr-fb{color:#1877F2;background:rgba(24,119,242,.15);border:1px solid rgba(24,119,242,.32);}
    .sr-icon.sr-fb:hover{background:rgba(24,119,242,.28);box-shadow:0 8px 22px rgba(24,119,242,.4);}
    .sr-icon.sr-wa{color:#25D366;background:rgba(37,211,102,.18);border:1px solid rgba(37,211,102,.4);}
    .sr-icon.sr-wa:hover{background:rgba(37,211,102,.32);box-shadow:0 8px 22px rgba(37,211,102,.45);}

    @media(max-width:860px){.tb-center{display:none;}}

    /* ────────────────────────────────────────────────────────────────────────
       T3 MODE — nuevo default: gris oscuro + azul
    ──────────────────────────────────────────────────────────────────────── */
    html.t3-mode {
      --gold:     #4a9eff;
      --gold2:    #7ab8ff;
      --gold-dim: rgba(74,158,255,.12);
      --black:    #0d1117;
      --gray:     #161b22;
      --card:     #161b22;
      --bg:       #0d1117;
      --border:   rgba(74,158,255,.15);
      --text:     #e0e8f4;
      --text2:    rgba(224,232,244,.55);
      --mid:      rgba(224,232,244,.4);
      --mid2:     rgba(224,232,244,.28);
    }
    html.t3-mode body { background: #0d1117; color: #e0e8f4; }
    html.t3-mode .topbar { background: #0d1117; border-bottom-color: #4a9eff; }
    html.t3-mode .tb-brand-name { color: #e0e8f4; }
    html.t3-mode .tb-sep { background: rgba(74,158,255,.2); }
    html.t3-mode .tb-counter { background: rgba(74,158,255,.08); border-color: rgba(74,158,255,.22); color: #4a9eff; }
    html.t3-mode .tb-theme-btn { border-color: rgba(74,158,255,.25); color: rgba(224,232,244,.5); }
    html.t3-mode .tb-theme-btn:hover { color: #4a9eff; border-color: rgba(74,158,255,.5); background: rgba(74,158,255,.08); }
    html.t3-mode .sidebar-left { background: #0d1117; border-right-color: rgba(74,158,255,.12); }
    html.t3-mode .sl-link { color: rgba(224,232,244,.3); }
    html.t3-mode .sl-link:hover { background: rgba(74,158,255,.08); color: rgba(224,232,244,.8); }
    html.t3-mode .sl-link.active { background: rgba(74,158,255,.12); color: #4a9eff; }

    /* Calendario */
    html.t3-mode .week-strip-wrap { background: rgba(13,17,23,.97) !important; }
    html.t3-mode .month-title-row:hover { background: rgba(74,158,255,.04) !important; }
    html.t3-mode .result-box.win  { border-color: rgba(34,197,94,.35)  !important; background: rgba(34,197,94,.04)  !important; }
    html.t3-mode .result-box.loss { border-color: rgba(239,68,68,.35)  !important; background: rgba(239,68,68,.04)  !important; }
    html.t3-mode .result-box.draw { border-color: rgba(245,197,24,.35) !important; background: rgba(245,197,24,.04) !important; }

    /* Stats panel */
    html.t3-mode .sp-panel { background: #161b22 !important; }
    html.t3-mode .sp-score-box, html.t3-mode .sp-ts { background: #0d1117 !important; }

    /* Convocatoria / Convo */
    html.t3-mode .pname { color: #e0e8f4 !important; }
    html.t3-mode .pitch-hint { color: rgba(224,232,244,.35) !important; }
    html.t3-mode .stoken.empty { background: rgba(74,158,255,.04) !important; border-color: rgba(74,158,255,.2) !important; color: rgba(224,232,244,.3) !important; }
    html.t3-mode .always-badge { color: #4a9eff !important; }
    html.t3-mode .sdot.sg { background: #22c55e !important; }
    html.t3-mode .sdot.sy { background: #f5c518 !important; }
    html.t3-mode .sdot.sr { background: #ef4444 !important; }
    html.t3-mode .sdot.sa { background: #4a9eff !important; }

    /* Mobile nav */
    html.t3-mode #ts-mobile-nav { background: #0d1117 !important; border-top-color: rgba(74,158,255,.25) !important; }
    html.t3-mode #ts-mobile-nav a.ts-mbn-active { color: #4a9eff !important; }

    /* ────────────────────────────────────────────────────────────────────────
       CLASIFICADO — default: negro cálido + dorado comprometido.
       La identidad del club (kits negro/dorado, "Top Secret" = expediente).
    ──────────────────────────────────────────────────────────────────────── */
    html.cls-mode {
      --gold:     #C8A84B;
      --gold2:    #E0C979;
      --gold-dim: rgba(200,168,75,.12);
      --black:    #0B0A07;
      --gray:     #16130B;
      --card:     #16130B;
      --card2:    #1D1910;
      --bg:       #0B0A07;
      --border:   rgba(200,168,75,.16);
      --border2:  rgba(200,168,75,.24);
      --text:     #F2EEE0;
      --text2:    rgba(242,238,224,.6);
      --mid:      rgba(242,238,224,.42);
      --mid2:     rgba(242,238,224,.28);
      --muted:    rgba(242,238,224,.42);
      --muted2:   rgba(242,238,224,.28);
      --white:    #F7F4EA;
    }
    html.cls-mode body { background: #0B0A07; color: #F2EEE0; }
    html.cls-mode .topbar { background: #0B0A07; border-bottom: 3px solid #C8A84B; }
    html.cls-mode .tb-brand-name { color: #F2EEE0; }
    html.cls-mode .tb-brand-name span { color: #C8A84B; }
    html.cls-mode .tb-sep { background: rgba(200,168,75,.25); }
    html.cls-mode .tb-counter { background: rgba(200,168,75,.08); border-color: rgba(200,168,75,.3); color: #C8A84B; }
    html.cls-mode .tb-theme-btn { border-color: rgba(200,168,75,.3); color: rgba(242,238,224,.55); }
    html.cls-mode .tb-theme-btn:hover { color: #C8A84B; border-color: rgba(200,168,75,.6); background: rgba(200,168,75,.08); }
    html.cls-mode .sidebar-left { background: #0B0A07; border-right-color: rgba(200,168,75,.14); }
    html.cls-mode .sl-link { color: rgba(242,238,224,.34); }
    html.cls-mode .sl-link:hover { background: rgba(200,168,75,.08); color: rgba(242,238,224,.85); }
    html.cls-mode .sl-link.active { background: rgba(200,168,75,.14); color: #C8A84B; }

    /* Sello de expediente: los badges de sección hablan el idioma "clasificado" */
    html.cls-mode .section-badge,
    html.cls-mode .ph-eyebrow,
    html.cls-mode .page-eyebrow {
      color: #C8A84B; border: 1px solid rgba(200,168,75,.45);
      padding: 3px 10px; border-radius: 2px; letter-spacing: .22em;
      box-shadow: inset 0 0 0 1px rgba(11,10,7,.9), inset 0 0 0 2px rgba(200,168,75,.2);
      background: rgba(200,168,75,.04); display: inline-block;
      font-weight: 700; text-transform: uppercase;
    }
    html.cls-mode .section-line { background: linear-gradient(90deg, rgba(200,168,75,.35), transparent) !important; height: 1px !important; }

    /* Calendario */
    html.cls-mode .week-strip-wrap { background: rgba(11,10,7,.97) !important; }
    html.cls-mode .month-title-row:hover { background: rgba(200,168,75,.05) !important; }
    html.cls-mode .result-box.win  { border-color: rgba(34,197,94,.35)  !important; background: rgba(34,197,94,.04)  !important; }
    html.cls-mode .result-box.loss { border-color: rgba(239,68,68,.35)  !important; background: rgba(239,68,68,.04)  !important; }
    html.cls-mode .result-box.draw { border-color: rgba(245,197,24,.35) !important; background: rgba(245,197,24,.04) !important; }

    /* Stats panel */
    html.cls-mode .sp-panel { background: #16130B !important; }
    html.cls-mode .sp-score-box, html.cls-mode .sp-ts { background: #0B0A07 !important; }

    /* Convocatoria */
    html.cls-mode .pname { color: #F2EEE0 !important; }
    html.cls-mode .pitch-hint { color: rgba(242,238,224,.35) !important; }
    html.cls-mode .stoken.empty { background: rgba(200,168,75,.05) !important; border-color: rgba(200,168,75,.25) !important; color: rgba(242,238,224,.3) !important; }
    html.cls-mode .always-badge { color: #C8A84B !important; }

    /* Mobile nav */
    html.cls-mode #ts-mobile-nav { background: #0B0A07 !important; border-top-color: rgba(200,168,75,.35) !important; }
    html.cls-mode #ts-mobile-nav a.ts-mbn-active { color: #C8A84B !important; }

    /* Accesibilidad de movimiento — global, todos los temas */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: .01ms !important;
        scroll-behavior: auto !important;
      }
    }

    /* ────────────────────────────────────────────────────────────────────────
       LIGHT MODE — applied when <html class="light-mode">
    ──────────────────────────────────────────────────────────────────────── */
    html.light-mode {
      --gold:   #C9A84C;
      --gold2:  #E8C97A;
      --gray:   #F5F5F0;
      --mid:    #888888;
      --border: #E5E5E0;
      --text:   #111111;
      --text2:  #444444;
      --muted:  #888888;
      --muted2: #666666;
      --bg:     #FFFFFF;
      --card:   #F5F5F0;
      --card2:  #EEEEEA;
      --border2:#DDDDDA;
      --vpn:    #d4a017;
      --vpn-bg: rgba(212,160,23,.10);
      --vpug:   #2a9d5c;
      --vpug-bg:rgba(42,157,92,.10);
      --e11:    #2563eb;
      --e11-bg: rgba(37,99,235,.10);
      --win:    #2a9d5c;
      --loss:   #c0392b;
      --draw:   #d4a017;
      --green:  #2a9d5c;
      --yellow: #d4a017;
      --red:    #c0392b;
    }
    html.light-mode body { background: #FFFFFF; color: #111111; }
    html.light-mode .topbar { background: #FFFFFF; border-bottom-color: #C9A84C; }
    html.light-mode .tb-brand-name { color: #111111; }
    html.light-mode .tb-sep { background: rgba(0,0,0,.12); }
    html.light-mode .tb-theme-btn { border-color: rgba(0,0,0,.15); color: rgba(0,0,0,.45); }
    html.light-mode .tb-theme-btn:hover { color: #C9A84C; border-color: rgba(201,168,76,.5); background: rgba(201,168,76,.06); }
    html.light-mode .sidebar-left { background: #FFFFFF; border-right-color: #E5E5E0; }
    html.light-mode .sl-link { color: rgba(0,0,0,.4); }
    html.light-mode .sl-link:hover { background: rgba(0,0,0,.05); color: rgba(0,0,0,.7); }
    html.light-mode .sl-link.active { background: rgba(201,168,76,.08); color: #C9A84C; }
    html.light-mode .week-strip-wrap { background: rgba(255,255,255,.97) !important; }
    html.light-mode .month-title-row:hover { background: rgba(0,0,0,.03) !important; }
    html.light-mode .result-box.win  { border-color: rgba(42,157,92,.4)  !important; background: rgba(42,157,92,.04)  !important; }
    html.light-mode .result-box.loss { border-color: rgba(192,57,43,.4)  !important; background: rgba(192,57,43,.04)  !important; }
    html.light-mode .result-box.draw { border-color: rgba(212,160,23,.4) !important; background: rgba(212,160,23,.04) !important; }
    html.light-mode .sp-panel { background: #FFFFFF !important; }
    html.light-mode .sp-score-box, html.light-mode .sp-ts { background: #F5F5F0 !important; }
    html.light-mode .pname { color: #111111 !important; }
    html.light-mode .pitch-hint { color: rgba(0,0,0,.35) !important; }
    html.light-mode .stoken.empty { background: rgba(0,0,0,.06) !important; border-color: rgba(0,0,0,.18) !important; color: rgba(0,0,0,.3) !important; }
    html.light-mode .always-badge { color: #2563eb !important; }
    html.light-mode .sdot.sg { background: #1a7a40 !important; }
    html.light-mode .sdot.sy { background: #b8900a !important; }
    html.light-mode .sdot.sr { background: #b03018 !important; }
    html.light-mode .sdot.sa { background: #2563eb !important; }
  `;
  document.head.appendChild(style);

  // ── Icons ─────────────────────────────────────────────────────────────────
  const MOON_SVG = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  const SUN_SVG  = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  const T3_SVG   = '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>';
  const CLS_SVG  = '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'; // escudo — Clasificado

  const LOGO_DARK  = 'logos/Top Secret white.png';
  const LOGO_LIGHT = 'Top-Secret.png';
  const LOGO_T3    = 'logos/TOP Secret Blue.png';
  const LOGO_CLS   = 'logos/Top Secret white.png';

  // ── Theme helpers ──────────────────────────────────────────────────────────
  function getTheme() {
    const s = localStorage.getItem(THEME_KEY);
    if (s === 'light' || s === 'dark' || s === 't3') return s;
    return 'cls';
  }

  function themeIcon(theme) {
    if (theme === 'light') return SUN_SVG;
    if (theme === 'dark')  return MOON_SVG;
    if (theme === 't3')    return T3_SVG;
    return CLS_SVG;
  }

  function themeLogo(theme) {
    if (theme === 'light') return LOGO_LIGHT;
    if (theme === 't3')    return LOGO_T3;
    if (theme === 'dark')  return LOGO_DARK;
    return LOGO_CLS;
  }

  function applyTheme(theme) {
    htmlEl.classList.remove('light-mode', 't3-mode', 'cls-mode');
    if (theme === 'light') htmlEl.classList.add('light-mode');
    if (theme === 't3')    htmlEl.classList.add('t3-mode');
    if (theme === 'cls')   htmlEl.classList.add('cls-mode');
    localStorage.setItem(THEME_KEY, theme);
    const icon = document.getElementById('tb-theme-icon');
    const logo = document.getElementById('tb-logo');
    if (icon) icon.innerHTML = themeIcon(theme);
    if (logo) logo.src = themeLogo(theme);
  }

  function cycleTheme() {
    const next = { cls: 't3', t3: 'dark', dark: 'light', light: 'cls' }[getTheme()];
    applyTheme(next);
  }

  // ── Topbar HTML ────────────────────────────────────────────────────────────
  const currentTheme = getTheme();
  const topbar = document.createElement('header');
  topbar.className = 'topbar';
  topbar.innerHTML = `
    <a class="tb-brand" href="index.html">
      <img id="tb-logo" src="${themeLogo(currentTheme)}" alt="TSFC">
      <span class="tb-brand-name">TOP <span>SECRET</span> FC</span>
    </a>
    <div class="tb-logos">
      <div class="tb-sep"></div>
      <img src="logos/Logo EA FC26.png" alt="EA FC 26">
      <img src="logos/Clubs Pro Badge.png" alt="Clubs Pro">
    </div>
    <button class="tb-theme-btn" id="tb-theme-btn" title="Cambiar tema">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="tb-theme-icon">
        ${themeIcon(currentTheme)}
      </svg>
    </button>
    <div class="tb-counter" id="tb-counter" title="Visitas al sitio">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      <span id="tb-count">—</span>
    </div>
  `;

  // ── Left sidebar HTML ──────────────────────────────────────────────────────
  const sbLeft = document.createElement('nav');
  sbLeft.className = 'sidebar-left';
  PAGES.forEach(p => {
    const a = document.createElement('a');
    a.className = 'sl-link' + (p.url.split('?')[0] === currentFile ? ' active' : '');
    a.href = p.url;
    a.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p.svg}</svg><span>${p.label}</span>`;
    sbLeft.appendChild(a);
  });

  // ── Right sidebar HTML ─────────────────────────────────────────────────────
  const sbRight = document.createElement('aside');
  sbRight.className = 'sidebar-right';
  sbRight.innerHTML = `
    <a class="sr-icon sr-ig" href="https://instagram.com/fctopsecret" target="_blank" rel="noopener" title="Instagram"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>
    <a class="sr-icon sr-x" href="https://x.com/fctopsecret" target="_blank" rel="noopener" title="X (Twitter)"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
    <a class="sr-icon sr-fb" href="https://facebook.com/topsecretfc" target="_blank" rel="noopener" title="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg></a>
    <a class="sr-icon sr-wa" href="https://chat.whatsapp.com/G3zmPxrMZsYB1MqWCEhrkU" target="_blank" rel="noopener" title="Unite a nuestro grupo de WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0011.815 0C5.24 0-.13 5.371-.133 11.984c0 2.11.551 4.171 1.598 5.986L0 24l6.185-1.62a11.94 11.94 0 005.628 1.427h.005c6.575 0 11.946-5.372 11.949-11.985a11.94 11.94 0 00-3.5-8.47"/></svg></a>
  `;

  // ── Inject into body ───────────────────────────────────────────────────────
  function inject() {
    document.body.insertBefore(sbRight, document.body.firstChild);
    document.body.insertBefore(sbLeft,  document.body.firstChild);
    document.body.insertBefore(topbar,  document.body.firstChild);

    const btn = document.getElementById('tb-theme-btn');
    if (btn) btn.addEventListener('click', cycleTheme);
  }

  if (document.body) inject();
  else document.addEventListener('DOMContentLoaded', inject);

  // ── Visit counter ──────────────────────────────────────────────────────────
  function fmtCount(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  var COUNTER_URL = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/counter';

  function updateCounterDisplay() {
    fetch(COUNTER_URL)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var el = document.getElementById('tb-count');
        if (el) el.textContent = fmtCount(d.count);
      })
      .catch(function() {});
  }

  (function initCounter() {
    var alreadyCounted = sessionStorage.getItem('ts_v');
    fetch(COUNTER_URL, { method: alreadyCounted ? 'GET' : 'POST' })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var el = document.getElementById('tb-count');
        if (el) el.textContent = fmtCount(d.count);
        if (!alreadyCounted) sessionStorage.setItem('ts_v', '1');
      })
      .catch(function() {
        var el = document.getElementById('tb-count');
        if (el) el.textContent = '';
      });
    setInterval(updateCounterDisplay, 30000);
  })();

})();
