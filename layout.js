// ─── TOP SECRET FC · Shared Layout ────────────────────────────────────────────
// Injects the top navigation (menús agrupados + redes) into every page.
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

  // Menú agrupado. `url` del grupo = a dónde lleva el click; `items` = desplegable.
  const NAV = [
    { id: 'noticias', label: 'Noticias', url: 'noticias.html', match: ['noticias.html'] },
    { id: 'miembros', label: 'Miembros', url: 'plantilla.html', match: ['plantilla.html', 'convocatoria.html', 'convo.html', 'plan-de-juego.html'], items: [
      { label: 'Plantel',       desc: 'Fichas del plantel T4',          url: 'plantilla.html' },
      { label: 'Convocatoria',  desc: 'Disponibilidad y armado',        url: 'convocatoria.html?vista' },
      { label: 'Plan de juego', desc: 'Táctica del equipo',             url: 'plan-de-juego.html' },
    ]},
    { id: 'competencias', label: 'Competencias', url: 'posiciones.html', match: ['posiciones.html', 'calendario.html', 'estadisticas.html'], items: [
      { label: 'Posiciones',    desc: 'VPN · VPUG · 11x11',             url: 'posiciones.html' },
      { label: 'Calendario',    desc: 'Fixture y resultados',           url: 'calendario.html' },
      { label: 'Estadísticas',  desc: 'Goles, asistencias, ratings',    url: 'estadisticas.html' },
    ]},
    { id: 'nosotros', label: 'Nosotros', url: 'nosotros.html', match: ['nosotros.html'], social: true, items: [
      { label: 'El proyecto',   desc: 'Tres ligas, un plantel',          url: 'nosotros.html#proyecto' },
      { label: 'Historia',      desc: 'Temporada a temporada',           url: 'nosotros.html#historia' },
      { label: 'El escudo',     desc: 'El espía y sus variantes',        url: 'nosotros.html#escudo' },
      { label: 'Equipaciones',  desc: 'Titular, alternativa y arquero',  url: 'nosotros.html#equipaciones' },
    ]},
  ];

  const SOCIAL = [
    { key: 'ig', label: 'Instagram', handle: '@fctopsecret', url: 'https://instagram.com/fctopsecret', color: '#E1306C', svg: '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>' },
    { key: 'x', label: 'X', handle: '@fctopsecret', url: 'https://x.com/fctopsecret', color: '#FFFFFF', svg: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>' },
    { key: 'fb', label: 'Facebook', handle: 'topsecretfc', url: 'https://facebook.com/topsecretfc', color: '#1877F2', svg: '<path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/>' },
    { key: 'wa', label: 'WhatsApp', handle: 'Grupo de la comunidad', url: 'https://chat.whatsapp.com/G3zmPxrMZsYB1MqWCEhrkU', color: '#25D366', svg: '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0011.815 0C5.24 0-.13 5.371-.133 11.984c0 2.11.551 4.171 1.598 5.986L0 24l6.185-1.62a11.94 11.94 0 005.628 1.427h.005c6.575 0 11.946-5.372 11.949-11.985a11.94 11.94 0 00-3.5-8.47"/>' },
    { key: 'yt', label: 'YouTube', handle: '@TOPSecretFC', url: 'https://www.youtube.com/@TOPSecretFC', color: '#FF0000', svg: '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>' },
    { key: 'tk', label: 'TikTok', handle: '@topsecretfc', url: 'https://www.tiktok.com/@topsecretfc', color: '#FE2C55', svg: '<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>' },
    { key: 'tw', label: 'Twitch', handle: 'topsecretfc', url: 'https://www.twitch.tv/topsecretfc', color: '#9146FF', svg: '<path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>' },
  ];

  window.TS_SOCIAL = SOCIAL; // la portada arma su sección "Redes" con esta misma lista

  const currentFile = location.pathname.split('/').pop() || 'index.html';

  // Fuentes que usa la barra/menú, por si la página no las carga.
  [['Bebas+Neue', 'Bebas+Neue'], ['Barlow+Condensed', 'Barlow+Condensed:wght@700'], ['family=Barlow:', 'Barlow:wght@400;600;700;900']].forEach(([probe, fam]) => {
    if (document.querySelector(`link[href*="${probe}"]`)) return;
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`;
    document.head.appendChild(font);
  });

  // ── CSS ────────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    :root{--gold:#B0B8C4;--gold2:#D4DAE4;--sb-left:0px !important;--sb-right:0px !important;--ts-g:clamp(16px,3vw,40px);}

    /* Sin barras laterales: cada página reservaba 64px/48px a los costados. */
    body{margin-left:0 !important;margin-right:0 !important;padding-left:0 !important;padding-right:0 !important;}
    #lockScreen,#pdfViewer{left:0 !important;right:0 !important;}

    /* ── Top nav: transparente, se "nota" recién al scrollear ── */
    .topbar{position:fixed;top:0;left:0;right:0;z-index:200;height:64px;display:flex;align-items:center;gap:18px;padding:0 clamp(16px,3vw,40px);background:transparent;border-bottom:1px solid transparent;transition:background-color .3s ease,border-color .3s ease,backdrop-filter .3s ease;}
    .topbar.tb-scrolled{background:color-mix(in srgb, var(--bg, #0B0A07) 78%, transparent);-webkit-backdrop-filter:blur(14px) saturate(1.2);backdrop-filter:blur(14px) saturate(1.2);border-bottom-color:color-mix(in srgb, var(--text, #F2EEE0) 8%, transparent);}
    .tb-brand{display:flex;align-items:center;gap:12px;text-decoration:none;flex-shrink:0;}
    .tb-brand img{height:34px;width:auto;object-fit:contain;transition:transform .25s ease;}
    .tb-brand:hover img{transform:rotate(-6deg) scale(1.05);}
    .tb-brand-name{font-family:'Barlow',sans-serif;font-size:.78rem;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:var(--text, #F2EEE0);white-space:nowrap;}

    .tb-nav{display:flex;align-items:center;gap:4px;margin:0 auto;}
    .tb-item{position:relative;}
    .tb-link{display:flex;align-items:center;gap:6px;padding:10px 14px;border-radius:999px;font-family:'Barlow',sans-serif;font-size:.74rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:color-mix(in srgb, var(--text, #F2EEE0) 72%, transparent);text-decoration:none;background:none;border:0;cursor:pointer;transition:color .15s ease,background-color .15s ease;}
    .tb-link:hover,.tb-item.open>.tb-link{color:var(--text, #F2EEE0);background:color-mix(in srgb, var(--text, #F2EEE0) 6%, transparent);}
    .tb-item.active>.tb-link{color:var(--gold);}
    .tb-caret{width:10px;height:10px;transition:transform .2s ease;}
    .tb-item.open .tb-caret{transform:rotate(180deg);}

    .tb-drop{position:absolute;top:calc(100% + 10px);left:50%;min-width:250px;padding:8px;border-radius:16px;background:color-mix(in srgb, var(--card, #16130B) 94%, transparent);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid color-mix(in srgb, var(--text, #F2EEE0) 10%, transparent);box-shadow:0 18px 50px rgba(0,0,0,.45);opacity:0;visibility:hidden;transform:translate(-50%,-6px);transition:opacity .18s ease,transform .18s ease,visibility .18s;}
    .tb-item.open .tb-drop{opacity:1;visibility:visible;transform:translate(-50%,0);}
    .tb-drop::before{content:'';position:absolute;left:0;right:0;top:-12px;height:12px;}
    .tb-drop a{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;text-decoration:none;color:var(--text, #F2EEE0);transition:background-color .15s ease;}
    .tb-drop a:hover{background:color-mix(in srgb, var(--gold) 12%, transparent);}
    .tb-drop a.current .tb-d-label{color:var(--gold);}
    .tb-d-label{display:block;font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:700;letter-spacing:.04em;}
    .tb-d-desc{display:block;font-size:.72rem;color:color-mix(in srgb, var(--text, #F2EEE0) 50%, transparent);margin-top:1px;}
    .tb-d-sep{font-size:.62rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:color-mix(in srgb, var(--text, #F2EEE0) 40%, transparent);padding:12px 12px 6px;margin-top:4px;border-top:1px solid color-mix(in srgb, var(--text, #F2EEE0) 8%, transparent);}
    .tb-d-social{display:flex;flex-wrap:wrap;gap:4px;padding:4px 8px 6px;}
    .tb-d-social a{padding:4px !important;border-radius:10px;}
    .tb-s-icon{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:color-mix(in srgb, var(--text, #F2EEE0) 7%, transparent);color:var(--text, #F2EEE0);transition:color .15s ease,background-color .15s ease;}
    .tb-s-icon svg{width:16px;height:16px;}
    .tb-drop a:hover .tb-s-icon{color:var(--brand);background:color-mix(in srgb, var(--brand) 16%, transparent);}

    .tb-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
    .tb-cta{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;border:1px solid color-mix(in srgb, var(--gold) 55%, transparent);color:var(--gold);font-family:'Barlow',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;transition:background-color .2s ease,color .2s ease;}
    .tb-cta:hover{background:var(--gold);color:var(--bg, #0B0A07);}
    .tb-counter{display:flex;align-items:center;gap:5px;font-size:.7rem;font-weight:600;letter-spacing:.04em;color:color-mix(in srgb, var(--text, #F2EEE0) 45%, transparent);white-space:nowrap;cursor:default;user-select:none;}
    .tb-counter svg{width:13px;height:13px;}
    .tb-theme-btn{width:34px;height:34px;border-radius:50%;border:0;background:transparent;color:color-mix(in srgb, var(--text, #F2EEE0) 55%, transparent);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color .15s ease,background-color .15s ease;padding:0;}
    .tb-theme-btn:hover{color:var(--gold);background:color-mix(in srgb, var(--text, #F2EEE0) 6%, transparent);}
    .tb-theme-btn svg{width:16px;height:16px;pointer-events:none;}

    /* ── Menú mobile (pantalla completa) ── */
    .tb-burger{display:none;width:40px;height:40px;border-radius:50%;border:0;background:color-mix(in srgb, var(--text, #F2EEE0) 7%, transparent);color:var(--text, #F2EEE0);cursor:pointer;align-items:center;justify-content:center;padding:0;}
    .tb-burger svg{width:18px;height:18px;}
    .tb-sheet{position:fixed;inset:0;z-index:300;background:var(--bg, #0B0A07);display:flex;flex-direction:column;padding:18px 20px 28px;overflow-y:auto;opacity:0;visibility:hidden;transform:translateY(-8px);transition:opacity .22s ease,transform .22s ease,visibility .22s;}
    .tb-sheet.open{opacity:1;visibility:visible;transform:none;}
    .tb-sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;}
    .tb-sheet-group{padding:14px 0;border-top:1px solid color-mix(in srgb, var(--text, #F2EEE0) 8%, transparent);}
    .tb-sheet-title{display:block;font-family:'Bebas Neue',sans-serif;font-size:2.4rem;letter-spacing:.04em;line-height:1;color:var(--text, #F2EEE0);text-decoration:none;}
    .tb-sheet-title.active{color:var(--gold);}
    .tb-sheet-sub{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}
    .tb-sheet-sub a{padding:8px 14px;border-radius:999px;background:color-mix(in srgb, var(--text, #F2EEE0) 6%, transparent);color:color-mix(in srgb, var(--text, #F2EEE0) 80%, transparent);font-size:.8rem;font-weight:600;text-decoration:none;}
    .tb-sheet-social{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px;}
    .tb-sheet-social a{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border-radius:14px;background:color-mix(in srgb, var(--text, #F2EEE0) 5%, transparent);color:var(--brand);text-decoration:none;font-size:.66rem;font-weight:600;}
    .tb-sheet-social a span{color:color-mix(in srgb, var(--text, #F2EEE0) 70%, transparent);}
    .tb-sheet-social svg{width:20px;height:20px;}
    .tb-sheet .tb-cta{align-self:flex-start;margin-top:18px;}

    /* ── Encabezado de páginas interiores: tarjeta con título grande + dupla ── */
    .ts-hero{position:relative;left:50%;transform:translateX(-50%);display:grid !important;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);width:min(1360px,calc(100vw - 2*clamp(16px,3vw,40px)));max-width:none !important;min-height:clamp(260px,30vw,420px);margin:12px 0 clamp(24px,3vw,40px) !important;padding:0 !important;column-gap:clamp(20px,3vw,48px);background:none;border:0;overflow:visible;text-align:left;}
    .ts-hero.ts-hero--compact{min-height:clamp(230px,22vw,300px);}
    .ts-hero-copy{position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:12px;padding:clamp(8px,2vw,24px) 0;min-width:0;}
    .ts-hero-copy > *{margin-left:0 !important;margin-right:0 !important;}
    .ts-hero h1,.ts-hero .ph-title,.ts-hero .page-title{font-family:'Barlow',sans-serif !important;font-weight:900 !important;font-size:clamp(2.6rem,6vw,5.4rem) !important;line-height:.92 !important;letter-spacing:-.045em !important;text-transform:none !important;color:var(--text, #F2EEE0) !important;margin:0 !important;}
    .ts-hero.ts-hero--compact h1,.ts-hero.ts-hero--compact .page-title{font-size:clamp(2.2rem,4.4vw,3.8rem) !important;}
    .ts-hero h1 span,.ts-hero .ph-title span,.ts-hero .page-title span{color:inherit !important;}
    .ts-hero .ph-eyebrow,.ts-hero .page-eyebrow{border:0 !important;box-shadow:none !important;background:none !important;padding:0 !important;font-family:'Barlow',sans-serif !important;font-size:.74rem !important;font-weight:600 !important;letter-spacing:.3em !important;text-transform:uppercase;color:var(--gold) !important;}
    .ts-hero .ph-sub,.ts-hero .page-sub,.ts-hero p{font-size:.92rem !important;color:color-mix(in srgb, var(--text, #F2EEE0) 55%, transparent) !important;letter-spacing:.02em !important;text-transform:none !important;max-width:460px;}
    .ts-hero-visual{position:relative;min-height:100%;background:#050403;border-radius:28px;overflow:hidden;}
    .ts-hero-visual img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
    
    @media(max-width:760px){
      .ts-hero{grid-template-columns:1fr;min-height:0;}
      .ts-hero-visual{order:-1;aspect-ratio:16/10;min-height:0;}
      .ts-hero.ts-hero--compact .ts-hero-visual{aspect-ratio:16/7;}
    }

    @media(max-width:980px){
      .tb-nav,.tb-counter,.tb-right .tb-cta{display:none;}
      .tb-burger{display:flex;}
      .tb-right{margin-left:auto;}
    }
    @media(max-width:420px){ .tb-brand-name{display:none;} }

    /* ────────────────────────────────────────────────────────────────────────
       T3 MODE — gris oscuro + azul
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
  const CARET_SVG = '<svg class="tb-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  const BURGER_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>';
  const CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
  const EYE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

  const MEDIA_BASE = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
  const LOGO_ON_DARK  = MEDIA_BASE + '/logos/rebrand/clean-white.webp';
  const LOGO_ON_LIGHT = MEDIA_BASE + '/logos/rebrand/clean-negro.webp';

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
    return theme === 'light' ? LOGO_ON_LIGHT : LOGO_ON_DARK;
  }

  function applyTheme(theme) {
    htmlEl.classList.remove('light-mode', 't3-mode', 'cls-mode');
    if (theme === 'light') htmlEl.classList.add('light-mode');
    if (theme === 't3')    htmlEl.classList.add('t3-mode');
    if (theme === 'cls')   htmlEl.classList.add('cls-mode');
    localStorage.setItem(THEME_KEY, theme);
    const icon = document.getElementById('tb-theme-icon');
    if (icon) icon.innerHTML = themeIcon(theme);
    document.querySelectorAll('.tb-logo').forEach(l => { l.src = themeLogo(theme); });
  }

  function cycleTheme() {
    const next = { cls: 't3', t3: 'dark', dark: 'light', light: 'cls' }[getTheme()];
    applyTheme(next);
  }

  // ── Markup ────────────────────────────────────────────────────────────────
  const isCurrent = url => url.split('?')[0] === currentFile;
  const isActive  = g => (g.match || []).includes(currentFile);

  function navItem(g) {
    if (!g.items && !g.social) {
      return `<div class="tb-item${isActive(g) ? ' active' : ''}"><a class="tb-link" href="${g.url}">${g.label}</a></div>`;
    }
    const links = (g.items || []).map(i => `<a href="${i.url}"${isCurrent(i.url) ? ' class="current"' : ''}><span><span class="tb-d-label">${i.label}</span><span class="tb-d-desc">${i.desc}</span></span></a>`).join('');
    const socialRow = g.social
      ? `<div class="tb-d-sep">Redes</div><div class="tb-d-social">${SOCIAL.map(s => `<a href="${s.url}" target="_blank" rel="noopener" title="${s.label}" style="--brand:${s.color}"><span class="tb-s-icon"><svg viewBox="0 0 24 24" fill="currentColor">${s.svg}</svg></span></a>`).join('')}</div>`
      : '';
    const drop = `<div class="tb-drop">${links}${socialRow}</div>`;
    const trigger = g.url
      ? `<a class="tb-link" href="${g.url}" data-drop>${g.label}${CARET_SVG}</a>`
      : `<button class="tb-link" type="button" data-drop aria-haspopup="true">${g.label}${CARET_SVG}</button>`;
    return `<div class="tb-item${isActive(g) ? ' active' : ''}">${trigger}${drop}</div>`;
  }

  const currentTheme = getTheme();
  const brandHtml = `<a class="tb-brand" href="index.html" title="Inicio"><img class="tb-logo" src="${themeLogo(currentTheme)}" alt="Top Secret FC"><span class="tb-brand-name">Top Secret FC</span></a>`;

  const topbar = document.createElement('header');
  topbar.className = 'topbar';
  topbar.innerHTML = `
    ${brandHtml}
    <nav class="tb-nav" aria-label="Principal">${NAV.map(navItem).join('')}</nav>
    <div class="tb-right">
      <a class="tb-cta" href="reclutamiento.html">Sumate</a>
      <div class="tb-counter" title="Visitas al sitio">${EYE_SVG}<span class="tb-count">—</span></div>
      <button class="tb-theme-btn" id="tb-theme-btn" title="Cambiar tema">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="tb-theme-icon">${themeIcon(currentTheme)}</svg>
      </button>
      <button class="tb-burger" type="button" aria-label="Abrir menú">${BURGER_SVG}</button>
    </div>
  `;

  const sheet = document.createElement('div');
  sheet.className = 'tb-sheet';
  sheet.setAttribute('aria-hidden', 'true');
  sheet.innerHTML = `
    <div class="tb-sheet-head">${brandHtml}<button class="tb-burger" type="button" aria-label="Cerrar menú" style="display:flex">${CLOSE_SVG}</button></div>
    <div class="tb-sheet-group"><a class="tb-sheet-title${currentFile === 'index.html' ? ' active' : ''}" href="index.html">Inicio</a></div>
    ${NAV.map(g => `<div class="tb-sheet-group">
      <a class="tb-sheet-title${isActive(g) ? ' active' : ''}" href="${g.url}">${g.label}</a>
      ${g.items ? `<div class="tb-sheet-sub">${g.items.map(i => `<a href="${i.url}">${i.label}</a>`).join('')}</div>` : ''}
      ${g.social ? `<div class="tb-sheet-social">${SOCIAL.map(s => `<a href="${s.url}" target="_blank" rel="noopener" style="--brand:${s.color}"><svg viewBox="0 0 24 24" fill="currentColor">${s.svg}</svg><span>${s.label}</span></a>`).join('')}</div>` : ''}
    </div>`).join('')}
    <a class="tb-cta" href="reclutamiento.html">Sumate al club</a>
  `;

  // ── Behaviour ─────────────────────────────────────────────────────────────
  function closeDrops(except) {
    topbar.querySelectorAll('.tb-item.open').forEach(i => { if (i !== except) i.classList.remove('open'); });
  }

  function bind() {
    // Hover abre en desktop; click en el disparador sin URL (Redes) o toque en pantallas táctiles.
    topbar.querySelectorAll('.tb-item').forEach(item => {
      if (!item.querySelector('.tb-drop')) return;
      let t;
      item.addEventListener('mouseenter', () => { clearTimeout(t); closeDrops(item); item.classList.add('open'); });
      item.addEventListener('mouseleave', () => { t = setTimeout(() => item.classList.remove('open'), 140); });
      const trigger = item.querySelector('[data-drop]');
      trigger.addEventListener('click', e => {
        const touch = matchMedia('(hover: none)').matches;
        if (trigger.tagName === 'BUTTON' || (touch && !item.classList.contains('open'))) {
          e.preventDefault();
          closeDrops(item);
          item.classList.toggle('open');
        }
      });
    });
    document.addEventListener('click', e => { if (!topbar.contains(e.target)) closeDrops(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrops(); setSheet(false); } });

    const onScroll = () => topbar.classList.toggle('tb-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    function setSheet(open) {
      sheet.classList.toggle('open', open);
      sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.documentElement.style.overflow = open ? 'hidden' : '';
    }
    topbar.querySelector('.tb-burger').addEventListener('click', () => setSheet(true));
    sheet.querySelector('.tb-burger').addEventListener('click', () => setSheet(false));

    document.getElementById('tb-theme-btn').addEventListener('click', cycleTheme);
  }

  // Dupla que ilustra cada página interior (logos/duos/*.webp en R2).
  const PAGE_ART = {
    'estadisticas.html':  { img: 'duo-guiidow-lil-k1', pos: '50% 0%' },
    'posiciones.html':    { img: 'duo-ataque-k1',     pos: '50% 0%' },
    'calendario.html':    { img: 'duo-rivarola-huber-k2',  pos: '50% 0%' },
    'noticias.html':      { img: 'duo-defensa-k1',    pos: '50% 0%' },
    'reclutamiento.html': { img: 'solo-juanchyroman-k2',    pos: '50% 0%' },
    'convocatoria.html':  { img: 'duo-arqueros',      pos: '50% 0%', compact: true },
  };

  function decorateHeader() {
    const art = PAGE_ART[currentFile];
    const h = art && document.querySelector('.page-header, .page-header-row');
    if (!h || h.classList.contains('ts-hero')) return;
    h.classList.add('ts-hero');
    if (art.compact) h.classList.add('ts-hero--compact');
    const copy = document.createElement('div');
    copy.className = 'ts-hero-copy';
    while (h.firstChild) copy.appendChild(h.firstChild);
    const visual = document.createElement('div');
    visual.className = 'ts-hero-visual';
    visual.innerHTML = `<img src="${MEDIA_BASE}/logos/duos/${art.img}.webp" alt="" style="object-position:${art.pos}" onerror="this.onerror=null;this.src='${MEDIA_BASE}/logos/hero-t4.webp'">`;
    h.append(copy, visual);
  }

  function inject() {
    document.body.insertBefore(sheet, document.body.firstChild);
    document.body.insertBefore(topbar, document.body.firstChild);
    // noticias.html carga layout.js antes de su contenido: esperar al DOM completo.
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', decorateHeader);
    else decorateHeader();
    bind();
  }

  if (document.body) inject();
  else document.addEventListener('DOMContentLoaded', inject);

  // ── Visit counter ──────────────────────────────────────────────────────────
  function fmtCount(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  var COUNTER_URL = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/counter';

  function showCount(txt) {
    document.querySelectorAll('.tb-count').forEach(function (el) { el.textContent = txt; });
  }

  function updateCounterDisplay() {
    fetch(COUNTER_URL)
      .then(function(r) { return r.json(); })
      .then(function(d) { showCount(fmtCount(d.count)); })
      .catch(function() {});
  }

  (function initCounter() {
    var alreadyCounted = sessionStorage.getItem('ts_v');
    fetch(COUNTER_URL, { method: alreadyCounted ? 'GET' : 'POST' })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        showCount(fmtCount(d.count));
        if (!alreadyCounted) sessionStorage.setItem('ts_v', '1');
      })
      .catch(function() { showCount(''); });
    setInterval(updateCounterDisplay, 30000);
  })();

})();
