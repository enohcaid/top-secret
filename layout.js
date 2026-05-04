// ─── TOP SECRET FC · Shared Layout ────────────────────────────────────────────
// Injects topbar, left sidebar, and right sidebar into every page.
// Edit this file once → changes replicate everywhere.

(function () {

  const PAGES = [
    { url: 'index.html',        label: 'Inicio', svg: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>' },
    { url: 'plantilla.html',    label: 'Equipo', svg: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>' },
    { url: 'estadisticas.html', label: 'Stats',  svg: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
    { url: 'posiciones.html',   label: 'Liga',   svg: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>' },
    { url: 'calendario.html',   label: 'Cal.',   svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
    { url: 'convocatoria.html', label: 'Conv.',  svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><path d="M8 12l3 3 5-5"/>' },
    { url: 'noticias.html',     label: 'News',  svg: '<path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>' },
  ];

  const currentFile = location.pathname.split('/').pop() || 'index.html';

  // ── CSS ────────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* Topbar */
    .topbar{position:fixed;top:0;left:0;right:0;z-index:200;height:64px;background:#111111;border-bottom:3px solid #C9A84C;display:flex;align-items:center;padding:0 24px 0 16px;gap:0;}
    .tb-brand{display:flex;align-items:center;gap:14px;text-decoration:none;margin-right:auto;}
    .tb-brand img{height:80px;width:120px;object-fit:contain;}
    .tb-brand-name{font-family:'Barlow Condensed',sans-serif;font-size:1.05rem;font-weight:900;letter-spacing:.14em;color:#FFFFFF;text-transform:uppercase;}
    .tb-brand-name span{color:#C9A84C;}
    .tb-center{position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;pointer-events:none;}
    .tb-center-star{font-size:1rem;color:#C9A84C;opacity:.8;}
    .tb-center-text{font-family:'Barlow Condensed',sans-serif;font-size:.95rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#C9A84C;white-space:nowrap;}
    .tb-logos{display:flex;align-items:center;gap:40px;margin-right:60px;}
    .tb-logos img{width:auto;object-fit:contain;opacity:.95;}
    .tb-logos img[alt="EA FC 26"]{height:100px;}
    .tb-logos img[alt="Clubs Pro"]{height:90px;}
    .tb-sep{width:1px;height:22px;background:rgba(255,255,255,.12);}
    /* Left sidebar */
    .sidebar-left{position:fixed;top:64px;left:0;z-index:100;width:64px;height:calc(100vh - 64px);background:#111111;border-right:1px solid rgba(201,168,76,.15);display:flex;flex-direction:column;align-items:center;padding:20px 0;gap:4px;}
    .sl-link{width:44px;height:44px;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;text-decoration:none;color:rgba(255,255,255,.35);transition:background .15s,color .15s;}
    .sl-link svg{width:18px;height:18px;}
    .sl-link span{font-size:8px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;}
    .sl-link:hover{background:rgba(201,168,76,.1);color:rgba(255,255,255,.75);}
    .sl-link.active{background:rgba(201,168,76,.12);color:#C9A84C;}
    /* Right sidebar */
    .sidebar-right{position:fixed;top:64px;right:0;z-index:100;width:48px;height:calc(100vh - 64px);background:#FFFFFF;border-left:1px solid #E5E5E0;display:flex;flex-direction:column;align-items:center;padding:20px 0;gap:8px;}
    .sr-icon{width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;text-decoration:none;color:#888888;transition:color .15s;font-size:.75rem;font-weight:700;letter-spacing:.06em;}
    .sr-icon:hover{color:#111111;}
    /* Hide center text on small screens */
    @media(max-width:860px){.tb-center{display:none;}}
  `;
  document.head.appendChild(style);

  // ── Topbar HTML ────────────────────────────────────────────────────────────
  const topbar = document.createElement('header');
  topbar.className = 'topbar';
  topbar.innerHTML = `
    <a class="tb-brand" href="index.html">
      <img src="logos/Top Secret white.png" alt="TSFC">
      <span class="tb-brand-name">TOP <span>SECRET</span> FC</span>
    </a>
    <div class="tb-center">
      <span class="tb-center-star">★</span>
      <span class="tb-center-text">Primera División · VPN</span>
      <span class="tb-center-star">★</span>
    </div>
    <div class="tb-logos">
      <div class="tb-sep"></div>
      <img src="logos/Logo EA FC26.png" alt="EA FC 26">
      <img src="logos/Clubs Pro Badge.png" alt="Clubs Pro">
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
    <a class="sr-icon" href="#" title="Instagram">IG</a>
    <a class="sr-icon" href="#" title="Twitter/X">X</a>
    <a class="sr-icon" href="#" title="YouTube">YT</a>
  `;

  // ── Inject into body ───────────────────────────────────────────────────────
  function inject() {
    document.body.insertBefore(sbRight, document.body.firstChild);
    document.body.insertBefore(sbLeft,  document.body.firstChild);
    document.body.insertBefore(topbar,  document.body.firstChild);
  }

  if (document.body) inject();
  else document.addEventListener('DOMContentLoaded', inject);

})();
