// ─── TOP SECRET FC · Shared Navigation ───────────────────────────────────────
// Add to any page: <script src="nav.js"></script>
// The script auto-detects the current page to highlight the active link.

const TS_NAV_PAGES = [
  { label:'Inicio',        url:'index.html',        icon:'🏠' },
  { label:'Plantel',       url:'plantilla.html',     icon:'👥' },
  { label:'Calendario',    url:'calendario.html',    icon:'📅' },
  { label:'Estadísticas',  url:'estadisticas.html',  icon:'📊' },
  { label:'Convocatoria',  url:'convocatoria.html',  icon:'⚽' },
  { label:'Posiciones',    url:'posiciones.html',    icon:'🏆' },
];

(function() {
  const currentFile = location.pathname.split('/').pop() || 'index.html';

  const style = document.createElement('style');
  style.textContent = `
    #ts-nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(10,11,14,.94);backdrop-filter:blur(12px);border-bottom:1px solid #1e2230;height:60px;display:flex;align-items:center;padding:0 24px;gap:0;}
    #ts-nav .ts-logo{display:flex;align-items:center;gap:10px;text-decoration:none;margin-right:auto;flex-shrink:0;}
    #ts-nav .ts-logo img{width:32px;height:32px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(200,168,75,.4));}
    #ts-nav .ts-logo span{font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:800;letter-spacing:.08em;color:#f0f2f8;}
    #ts-nav .ts-logo span b{color:#c8a84b;}
    #ts-nav .ts-links{display:flex;gap:2px;}
    #ts-nav .ts-links a{padding:7px 12px;border-radius:8px;text-decoration:none;font-size:.8rem;font-weight:600;letter-spacing:.04em;color:#8890a8;transition:all .15s;white-space:nowrap;}
    #ts-nav .ts-links a:hover{color:#f0f2f8;background:#1e2230;}
    #ts-nav .ts-links a.ts-active{color:#c8a84b;background:rgba(200,168,75,.12);}
    @media(max-width:640px){
      #ts-nav .ts-links a{padding:6px 8px;font-size:.72rem;}
      #ts-nav .ts-logo span{display:none;}
    }
  `;
  document.head.appendChild(style);

  const nav = document.createElement('nav');
  nav.id = 'ts-nav';

  const logo = document.createElement('a');
  logo.className = 'ts-logo';
  logo.href = 'index.html';
  logo.innerHTML = '<img src="TopSecret.png" alt="TS"><span>TOP <b>SECRET</b></span>';
  nav.appendChild(logo);

  const links = document.createElement('div');
  links.className = 'ts-links';
  TS_NAV_PAGES.forEach(p => {
    const a = document.createElement('a');
    a.href = p.url;
    a.textContent = p.label;
    if (p.url === currentFile || (currentFile === '' && p.url === 'index.html')) {
      a.className = 'ts-active';
    }
    links.appendChild(a);
  });
  nav.appendChild(links);

  // Insert as first body child
  document.addEventListener('DOMContentLoaded', () => {
    document.body.insertBefore(nav, document.body.firstChild);
    document.body.style.paddingTop = '60px';
  });
})();
