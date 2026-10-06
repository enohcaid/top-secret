// ── TOP SECRET FC · Piezas de la noticia para redes ──────────────────────────
// Dibuja en canvas, con la foto de campaña de la noticia, las piezas que llevan título:
//   TSRedes.render(n, 'ig')        1080x1350  post de Instagram (feed)
//   TSRedes.render(n, 'historia')  1080x1920  historia de Instagram / Facebook
// El título va abajo con el escudo Clean blanco arriba, como firma. En la historia, el bloque
// termina por encima del 20% inferior (barra de respuesta de la app) y suma "link en la bio".
// Las publicaciones con link (Facebook, X) no usan estas piezas: su vista previa ya trae título.
// Lo usan noticias.html (paso "Publicar en redes") y scripts/noticia-redes.mjs (prueba local).
(function () {
  const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/';
  const ESCUDO = MEDIA + 'logos/rebrand/clean-white.webp';
  const GOLD = '#c9a84c', INK = '#f4f1ea';
  const FONT = '"Barlow Condensed", "Barlow", sans-serif';

  function loadImg(src) {
    return new Promise(res => {
      if (!src) return res(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });
  }
  async function fonts() {
    if (!document.querySelector('link[href*="Barlow+Condensed"]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;800;900&display=swap';
      document.head.appendChild(l);
      await new Promise(r => { l.onload = r; l.onerror = r; });
    }
    try { await Promise.all(['900 120px', '800 30px', '600 30px'].map(f => document.fonts.load(`${f} "Barlow Condensed"`))); } catch (e) {}
  }

  // Título corto: el que escribió la rutina (tituloImagen) o la primera parte del título de la nota.
  function tituloCorto(n) {
    if (n.tituloImagen) return n.tituloImagen.trim();
    const t = (n.title || '').split(/[:—|]/)[0].trim();
    const pal = t.split(/\s+/);
    return pal.length <= 7 ? t : pal.slice(0, 6).join(' ');
  }

  // Palabras del título: en mayúsculas, salvo los gamertags (van tal cual y en dorado).
  function tokens(titulo, gamertags) {
    const gts = (gamertags || []).slice().sort((a, b) => b.length - a.length);
    return titulo.split(/\s+/).filter(Boolean).map(w => {
      const limpio = w.replace(/[.,;:!?¡¿"']/g, '');
      const gt = gts.find(g => g.toLowerCase() === limpio.toLowerCase());
      return gt ? { txt: w.replace(limpio, gt), gold: true } : { txt: w.toUpperCase(), gold: false };
    });
  }

  // Corte en líneas "balanceado": el ancho más angosto que mantiene la misma cantidad de líneas.
  function wrap(ctx, toks, maxW) {
    const sp = ctx.measureText(' ').width;
    const lay = w => {
      const lines = [[]]; let x = 0;
      for (const t of toks) {
        const tw = ctx.measureText(t.txt).width;
        if (lines[lines.length - 1].length && x + sp + tw > w) { lines.push([]); x = 0; }
        x += (lines[lines.length - 1].length ? sp : 0) + tw;
        lines[lines.length - 1].push(t);
      }
      return lines;
    };
    const base = lay(maxW);
    let best = base;
    for (let w = maxW; w > maxW * 0.5; w -= 10) {
      const l = lay(w);
      if (l.length !== base.length) break;
      best = l;
    }
    return best;
  }

  function cover(ctx, img, W, H, fy) {
    const s = Math.max(W / img.width, H / img.height);
    const sw = W / s, sh = H / s;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) * fy, sw, sh, 0, 0, W, H);
  }

  async function render(n, tipo, opts = {}) {
    const historia = tipo === 'historia';
    const W = 1080, H = historia ? 1920 : 1350;
    await fonts();
    const raw = historia ? (n.imageStoryRaw || n.imagePostRaw) : n.imagePostRaw;
    const pub = historia ? (n.imageStory || n.imagePost || n.image) : (n.imagePost || n.image);
    let foto = await loadImg(raw), conEscudo = false;
    if (!foto) { foto = await loadImg(pub); conEscudo = true; }   // la publicada ya trae el escudo en una esquina
    const escudo = conEscudo ? null : await loadImg(ESCUDO);

    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H);
    if (foto) cover(ctx, foto, W, H, historia ? 0.5 : 0.35);

    const g = ctx.createLinearGradient(0, H, 0, H * (1 - (historia ? 0.62 : 0.58)));
    g.addColorStop(0, 'rgba(5,5,5,.94)');
    g.addColorStop(historia ? 0.42 : 0.34, 'rgba(5,5,5,.78)');
    g.addColorStop(1, 'rgba(5,5,5,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const X = 68, maxW = W - 2 * X;
    const size = historia ? 124 : 112, lh = size * 0.9;
    ctx.font = `900 ${size}px ${FONT}`;
    const lines = wrap(ctx, tokens(opts.titulo || tituloCorto(n), opts.gamertags), maxW);

    // Se arma de abajo hacia arriba.
    let y = H - (historia ? Math.round(H * 0.20) + 40 : 84);
    ctx.textBaseline = 'alphabetic';
    if (historia) {
      ctx.font = `600 30px ${FONT}`; ctx.letterSpacing = '6px'; ctx.fillStyle = 'rgba(244,241,234,.8)';
      ctx.fillText('NOTA COMPLETA · LINK EN LA BIO', X, y);
      y -= 30 + 34;
    }
    ctx.font = `900 ${size}px ${FONT}`; ctx.letterSpacing = '0.5px';
    const sp = ctx.measureText(' ').width;
    for (let i = lines.length - 1; i >= 0; i--) {
      let x = X;
      for (const t of lines[i]) {
        ctx.fillStyle = t.gold ? GOLD : INK;
        ctx.fillText(t.txt, x, y);
        x += ctx.measureText(t.txt).width + sp;
      }
      y -= lh;
    }
    y -= size * 0.12;
    const kicker = [n.category, (n.date || '').split('-').reverse().slice(0, 2).join('.')].filter(Boolean).join(' · ').toUpperCase();
    ctx.font = `800 30px ${FONT}`; ctx.letterSpacing = '8px'; ctx.fillStyle = GOLD;
    ctx.fillText(kicker, X, y);
    y -= 30 + 22;
    ctx.fillRect(X, y - 6, 72, 6);
    y -= 6 + 26;
    if (escudo) {
      const eh = historia ? 84 : 76, ew = eh * escudo.width / escudo.height;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
      ctx.drawImage(escudo, X, y - eh, ew, eh);
      ctx.restore();
    }
    ctx.letterSpacing = '0px';
    return c;
  }

  window.TSRedes = { render, tituloCorto };
})();
