// ─── TOP SECRET FC · Shared Layout ────────────────────────────────────────────
// Injects topbar, left sidebar, and right sidebar into every page.
// Edit this file once → changes replicate everywhere.

(function () {

  // ── Theme — apply immediately to avoid flash ──────────────────────────────
  const THEME_KEY = 'ts_theme';
  const htmlEl = document.documentElement;

  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light') htmlEl.classList.add('light-mode');
  else if (stored === 'dark') { /* dark: no class, original look */ }
  else htmlEl.classList.add('t3-mode'); // null o 't3' → T3 es el nuevo default

  const PAGES = [
    { url: 'index.html',        label: 'Inicio', svg: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>' },
    { url: 'plantilla.html',    label: 'Equipo', svg: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>' },
    { url: 'estadisticas.html', label: 'Stats',  svg: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
    { url: 'posiciones.html',   label: 'Liga',   svg: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>' },
    { url: 'calendario.html',   label: 'Cal.',   svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
    { url: 'convo.html',        label: 'Conv.',  svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><path d="M8 12l3 3 5-5"/>' },
    { url: 'noticias.html',     label: 'News',  svg: '<path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>' },
    { url: 'plan-de-juego.html', label: 'Plan',  svg: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>' },
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

    /* ── Right sidebar ── */
    .sidebar-right{position:fixed;top:64px;right:0;z-index:100;width:48px;height:calc(100vh - 64px);background:#111111;border-left:1px solid rgba(255,255,255,.09);display:flex;flex-direction:column;align-items:center;padding:20px 0;gap:8px;}
    .sr-icon{width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;text-decoration:none;color:rgba(255,255,255,.4);transition:color .15s;font-size:.75rem;font-weight:700;letter-spacing:.06em;}
    .sr-icon:hover{color:rgba(255,255,255,.85);}

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
    html.t3-mode .sidebar-right { background: #0d1117; border-left-color: rgba(74,158,255,.1); }
    html.t3-mode .sr-icon { color: rgba(224,232,244,.35); }
    html.t3-mode .sr-icon:hover { color: rgba(224,232,244,.85); }

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
    html.light-mode .sidebar-right { background: #FFFFFF; border-left-color: #E5E5E0; }
    html.light-mode .sr-icon { color: #888888; }
    html.light-mode .sr-icon:hover { color: #111111; }
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

  const LOGO_DARK  = 'logos/TOP Secret White.png';
  const LOGO_LIGHT = 'Top-Secret.png';
  const LOGO_T3    = 'logos/TOP Secret Blue.png';

  // ── Theme helpers ──────────────────────────────────────────────────────────
  function getTheme() {
    const s = localStorage.getItem(THEME_KEY);
    if (s === 'light' || s === 'dark') return s;
    return 't3';
  }

  function themeIcon(theme) {
    if (theme === 'light') return SUN_SVG;
    if (theme === 'dark')  return MOON_SVG;
    return T3_SVG;
  }

  function themeLogo(theme) {
    if (theme === 'light') return LOGO_LIGHT;
    if (theme === 't3')    return LOGO_T3;
    return LOGO_DARK;
  }

  function applyTheme(theme) {
    htmlEl.classList.remove('light-mode', 't3-mode');
    if (theme === 'light') htmlEl.classList.add('light-mode');
    if (theme === 't3')    htmlEl.classList.add('t3-mode');
    localStorage.setItem(THEME_KEY, theme);
    const icon = document.getElementById('tb-theme-icon');
    const logo = document.getElementById('tb-logo');
    if (icon) icon.innerHTML = themeIcon(theme);
    if (logo) logo.src = themeLogo(theme);
  }

  function cycleTheme() {
    const next = { t3: 'dark', dark: 'light', light: 't3' }[getTheme()];
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
    a.className = 'sl-link' + (p.url === currentFile ? ' active' : '');
    a.href = p.url;
    a.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p.svg}</svg><span>${p.label}</span>`;
    sbLeft.appendChild(a);
  });

  // ── Right sidebar HTML ─────────────────────────────────────────────────────
  const sbRight = document.createElement('aside');
  sbRight.className = 'sidebar-right';
  sbRight.innerHTML = `
    <a class="sr-icon" href="https://instagram.com/fctopsecret" target="_blank" rel="noopener" title="Instagram">IG</a>
    <a class="sr-icon" href="https://x.com/fctopsecret" target="_blank" rel="noopener" title="Twitter/X">X</a>
    <a class="sr-icon" href="https://facebook.com/topsecretfc" target="_blank" rel="noopener" title="Facebook">FB</a>
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
