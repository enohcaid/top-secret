// ─── TOP SECRET FC · Mobile Bottom Navigation ────────────────────────────────
// Include at end of <body> on every page.
// On screens ≤ 640 px: hides sidebars, injects a bottom tab bar,
// and adds global mobile overrides via an injected <style>.

(function () {
  const PAGES = [
    { label: 'Inicio',    url: 'index.html',       svg: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>' },
    { label: 'Equipo',    url: 'plantilla.html',   svg: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>' },
    { label: 'Cal.',      url: 'calendario.html',  svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
    { label: 'Stats',     url: 'estadisticas.html',svg: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
    { label: 'Conv.',     url: 'convocatoria.html',svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><path d="M8 12l3 3 5-5"/>' },
    { label: 'Liga',      url: 'posiciones.html',  svg: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>' },
  ];

  const currentFile = location.pathname.split('/').pop() || 'index.html';

  // ── Global mobile CSS ──────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @media(max-width:640px){
      /* Hide sidebars */
      .sidebar-left, .sidebar-right { display:none !important; }

      /* Reset body padding from sidebars; keep topbar; add room for bottom nav */
      body {
        padding-left: 0 !important;
        padding-right: 0 !important;
        padding-bottom: 64px !important;
      }

      /* Topbar: hide heavy logos, keep brand */
      .tb-logos { display:none !important; }
      .topbar { padding: 0 16px !important; }

      /* Bottom nav bar */
      #ts-mobile-nav {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        z-index: 500;
        height: 60px;
        background: #111111;
        border-top: 2px solid rgba(201,168,76,.25);
        display: flex;
        align-items: stretch;
        justify-content: space-around;
        box-shadow: 0 -4px 20px rgba(0,0,0,.35);
      }
      #ts-mobile-nav a {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        text-decoration: none;
        color: #666;
        font-size: 8px;
        font-weight: 700;
        letter-spacing: .06em;
        text-transform: uppercase;
        transition: color .15s;
        padding: 6px 0;
        min-width: 0;
      }
      #ts-mobile-nav a svg {
        width: 20px; height: 20px;
        flex-shrink: 0;
      }
      #ts-mobile-nav a.ts-mbn-active { color: #C9A84C; }
      #ts-mobile-nav a:hover { color: rgba(255,255,255,.7); }
    }

    /* Hide bottom nav on desktop */
    @media(min-width:641px){
      #ts-mobile-nav { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  // ── Inject bottom nav HTML ─────────────────────────────────────────────────
  const nav = document.createElement('div');
  nav.id = 'ts-mobile-nav';

  PAGES.forEach(p => {
    const a = document.createElement('a');
    a.href = p.url;
    a.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p.svg}</svg><span>${p.label}</span>`;
    if (p.url === currentFile || (currentFile === '' && p.url === 'index.html')) {
      a.className = 'ts-mbn-active';
    }
    nav.appendChild(a);
  });

  document.body.appendChild(nav);
})();
