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
    // Título entero (sin el subtítulo después de ":", "—" o "|"). Antes se quedaba con las primeras 6 palabras si
    // tenía más de 7 y cortaba la frase ("TOP SECRET ARRANCA ESPACIO GAMER CON", 2026-10-21): ahora achica la letra.
    return (n.title || '').split(/[:—|]/)[0].trim();
  }

  // Palabras del título: en mayúsculas, salvo los gamertags (van tal cual y en dorado).
  function tokens(titulo, gamertags, upper = true) {
    const gts = (gamertags || []).slice().sort((a, b) => b.length - a.length);
    // El "·" separador queda pegado a la palabra anterior (espacio duro): nunca arranca un renglón.
    return titulo.replace(/ ·/g, ' ·').split(/[ \t\n]+/).filter(Boolean).map(w => {
      const limpio = w.replace(/[.,;:!?¡¿"'()]/g, '');
      const gt = gts.find(g => g.toLowerCase() === limpio.toLowerCase());
      return gt ? { txt: w.replace(limpio, gt), gold: true } : { txt: upper ? w.toUpperCase() : w, gold: false };
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
    if (tipo === 'tiktok') return portadaTikTok(n, opts);
    const historia = tipo === 'historia';
    const W = 1080, H = historia ? 1920 : 1350;
    await fonts();
    const raw = historia ? (n.imageStoryRaw || n.imagePostRaw) : n.imagePostRaw;
    const pub = historia ? (n.imageStory || n.imagePost || n.image) : (n.imagePost || n.image);
    let foto = await loadImg(raw), conEscudo = false;
    // Sin la copia limpia: la foto publicada. Las de la noticia diaria ya traen el escudo en una
    // esquina (no se suma otro); cualquier otra (noticias manuales) lleva el del bloque del título.
    if (!foto) { foto = await loadImg(pub); conEscudo = estampada(pub); }
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
    // Letra lo más grande posible que entre en 3 líneas (post) o 4 (historia); títulos largos bajan hasta 72 px.
    const toks = tokens(opts.titulo || tituloCorto(n), opts.gamertags), maxLineas = historia ? 4 : 3;
    let size = historia ? 124 : 112, lines;
    for (;;) {
      ctx.font = `900 ${size}px ${FONT}`;
      lines = wrap(ctx, toks, maxW);
      if (lines.length <= maxLineas || size <= 72) break;
      size -= 4;
    }
    const lh = size * 0.9;

    // Se arma de abajo hacia arriba.
    let y = H - (historia ? Math.round(H * 0.20) + 40 : 84);
    ctx.textBaseline = 'alphabetic';
    // Pie del post: n.pieRedes (opcional) avisa que hay más imágenes en el carrusel ("DESLIZÁ PARA VER…").
    const pie = historia ? 'NOTA COMPLETA · LINK EN LA BIO' : (opts.pie || n.pieRedes || '').toUpperCase();
    if (pie) {
      ctx.font = `${historia ? 600 : 700} 30px ${FONT}`; ctx.letterSpacing = '6px';
      ctx.fillStyle = historia ? 'rgba(244,241,234,.8)' : GOLD;
      ctx.fillText(historia ? pie : pie + '  →', X, y);
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

  // Las imágenes de la noticia diaria salen del generador con el escudo ya estampado.
  function estampada(url) { return /Daily(%20| )News\/(?!raw\/)/.test(url || ''); }

  // Escudo en una esquina, sobre la foto: la más pareja y sin luces, con halo oscuro detrás
  // (misma idea que stampCrest de scripts/generate-image-chatgpt.mjs). En formato historia
  // respeta la zona que tapa la interfaz de Instagram (14% arriba, 20% abajo).
  function estamparEscudo(ctx, escudo, W, H) {
    const w = Math.round(W * 0.085), h = Math.round(w * escudo.height / escudo.width), m = Math.round(W * 0.04);
    const story = H / W > 1.5;
    const top = story ? Math.round(H * 0.14) : m, bottom = story ? H - Math.round(H * 0.20) - h : H - m - h;
    const esquinas = [[W - m - w, top], [m, top], [W - m - w, bottom], [m, bottom]];
    let best = null;
    for (const [x, y] of esquinas) {
      const pad = Math.round(w * 0.35);
      const x0 = Math.max(0, x - pad), y0 = Math.max(0, y - pad);
      const d = ctx.getImageData(x0, y0, Math.min(W - x0, w + 2 * pad), Math.min(H - y0, h + 2 * pad)).data;
      let n = 0, sum = 0, sq = 0, bright = 0;
      for (let i = 0; i < d.length; i += 16) {
        const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        n++; sum += v; sq += v * v; if (v > 200) bright++;
      }
      const mean = sum / n, sd = Math.sqrt(Math.max(0, sq / n - mean * mean)), score = sd + 250 * bright / n;
      if (!best || score < best.score) best = { x, y, score, bright: bright / n };
    }
    const R = w * 1.1, cx = best.x + w / 2, cy = best.y + h / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, `rgba(0,0,0,${best.bright > 0.03 ? 0.55 : 0.3})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = Math.max(4, w * 0.06); ctx.shadowOffsetY = 2;
    ctx.drawImage(escudo, best.x, best.y, w, h);
    ctx.restore();
  }

  // Foto sola con el logo (las descargas del modal Compartir). 'post' = la foto de la nota;
  // 'historia' = la vertical si existe, si no la misma foto sobre un fondo desenfocado 9:16.
  async function limpia(n, tipo) {
    if (tipo === 'og') return og(n);
    const src = tipo === 'historia' ? (n.imageStory || n.imagePost || n.image) : (n.imagePost || n.image);
    const foto = await loadImg(src);
    if (!foto) return null;
    const vertical = foto.height / foto.width > 1.5;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (tipo === 'historia' && !vertical) {
      c.width = 1080; c.height = 1920;
      ctx.filter = 'blur(40px) brightness(.45)';
      cover(ctx, foto, 1080, 1920, 0.5);
      ctx.filter = 'none';
      const w = 1080, h = Math.round(w * foto.height / foto.width), y = Math.round((1920 - h) / 2);
      ctx.drawImage(foto, 0, y, w, h);
    } else {
      const k = Math.min(1, 1600 / Math.max(foto.width, foto.height));
      c.width = Math.round(foto.width * k); c.height = Math.round(foto.height * k);
      ctx.drawImage(foto, 0, 0, c.width, c.height);
      if (estampada(src)) return c;
    }
    const escudo = await loadImg(ESCUDO);
    if (escudo) estamparEscudo(ctx, escudo, c.width, c.height);
    return c;
  }

  // Vista previa del link (og:image, 1200x630) para Facebook y X: la foto con el logo. El Worker
  // la sirve en /og/<id> si existe (logos/noticias/redes/<id>-og.jpg).
  async function og(n) {
    const raw = n.imagePostRaw, pub = n.imagePost || n.image;
    let foto = await loadImg(raw), yaTiene = false;
    if (!foto) { foto = await loadImg(pub); yaTiene = estampada(pub); }
    if (!foto) return null;
    const c = document.createElement('canvas');
    c.width = 1200; c.height = 630;
    const ctx = c.getContext('2d');
    cover(ctx, foto, 1200, 630, 0.3);
    if (!yaTiene) { const escudo = await loadImg(ESCUDO); if (escudo) estamparEscudo(ctx, escudo, 1200, 630); }
    return c;
  }

  // ── TikTok, modo fotos (2026-10-22) ──────────────────────────────────────────
  // Carrusel 1080x1920: portada con título → la ficha (bloque {specs}) → la frase ({quote}) → imágenes extra.
  // Zona segura de TikTok: arriba las pestañas (~12%), abajo el texto y el sonido (~25%), a la derecha los botones.
  const TT = { W: 1080, H: 1920, X: 72, top: 250, bottom: 1440, maxW: 1080 - 72 - 170 };

  async function fotoVertical(n) {
    return (await loadImg(n.imageStoryRaw)) || (await loadImg(n.imagePostRaw))
      || (await loadImg(n.imageStory)) || (await loadImg(n.imagePost || n.image));
  }
  function lienzo() {
    const c = document.createElement('canvas');
    c.width = TT.W; c.height = TT.H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, TT.W, TT.H);
    return { c, ctx };
  }
  function fondoOscuro(ctx, foto) {
    if (!foto) return;
    ctx.filter = 'blur(30px) brightness(.32)';
    cover(ctx, foto, TT.W, TT.H, 0.5);
    ctx.filter = 'none';
  }
  // Líneas de texto con los gamertags en dorado; sin mayúsculas forzadas si upper es false.
  function lineasTexto(ctx, texto, gamertags, font, maxW, upper) {
    ctx.font = font;
    return wrap(ctx, tokens(texto, gamertags, upper), maxW);
  }
  function pintarLineas(ctx, lines, x, y, lh, color) {
    const sp = ctx.measureText(' ').width;
    for (const l of lines) {
      let xx = x;
      for (const t of l) { ctx.fillStyle = t.gold ? GOLD : color; ctx.fillText(t.txt, xx, y); xx += ctx.measureText(t.txt).width + sp; }
      y += lh;
    }
    return y;
  }
  // Encabezado de las placas interiores: escudo + rótulo dorado, arriba a la izquierda.
  function encabezado(ctx, escudo, rotulo) {
    let x = TT.X;
    if (escudo) {
      const eh = 64, ew = eh * escudo.width / escudo.height;
      ctx.drawImage(escudo, x, TT.top - eh + 8, ew, eh);
      x += ew + 22;
    }
    ctx.font = `800 30px ${FONT}`; ctx.letterSpacing = '8px'; ctx.fillStyle = GOLD;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(rotulo.toUpperCase(), x, TT.top - 12);
    ctx.letterSpacing = '0px';
  }
  function pieLink(ctx) {
    ctx.font = `700 30px ${FONT}`; ctx.letterSpacing = '6px'; ctx.fillStyle = 'rgba(244,241,234,.85)';
    ctx.fillText('NOTA COMPLETA · LINK EN LA BIO', TT.X, TT.bottom);
    ctx.letterSpacing = '0px';
  }

  async function portadaTikTok(n, opts) {
    await fonts();
    const foto = await fotoVertical(n), escudo = await loadImg(ESCUDO);
    const { c, ctx } = lienzo();
    if (foto) cover(ctx, foto, TT.W, TT.H, 0.5);
    const g = ctx.createLinearGradient(0, TT.H, 0, TT.H * 0.3);
    g.addColorStop(0, 'rgba(5,5,5,.96)'); g.addColorStop(0.45, 'rgba(5,5,5,.8)'); g.addColorStop(1, 'rgba(5,5,5,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, TT.W, TT.H);
    const toks = tokens(opts.titulo || tituloCorto(n), opts.gamertags);
    let size = 120, lines;
    for (;;) { ctx.font = `900 ${size}px ${FONT}`; lines = wrap(ctx, toks, TT.maxW); if (lines.length <= 4 || size <= 72) break; size -= 4; }
    const lh = size * 0.9;
    let y = TT.bottom;
    ctx.textBaseline = 'alphabetic';
    if (opts.pie) {
      ctx.font = `700 30px ${FONT}`; ctx.letterSpacing = '6px'; ctx.fillStyle = GOLD;
      ctx.fillText(opts.pie.toUpperCase() + '  →', TT.X, y);
      y -= 30 + 34;
    }
    ctx.font = `900 ${size}px ${FONT}`; ctx.letterSpacing = '0.5px';
    pintarLineas(ctx, lines, TT.X, y - (lines.length - 1) * lh, lh, INK);
    y -= (lines.length - 1) * lh + lh + size * 0.12;
    const kicker = [n.category, (n.date || '').split('-').reverse().slice(0, 2).join('.')].filter(Boolean).join(' · ').toUpperCase();
    ctx.font = `800 30px ${FONT}`; ctx.letterSpacing = '8px'; ctx.fillStyle = GOLD;
    ctx.fillText(kicker, TT.X, y);
    y -= 30 + 22;
    ctx.fillRect(TT.X, y - 6, 72, 6);
    y -= 6 + 26;
    if (escudo) {
      const eh = 84, ew = eh * escudo.width / escudo.height;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
      ctx.drawImage(escudo, TT.X, y - eh, ew, eh);
      ctx.restore();
    }
    ctx.letterSpacing = '0px';
    return c;
  }

  // La ficha: filas dato / valor, centradas en la zona segura (achica la letra si no entran).
  function placaFicha(ctx, specs, gamertags) {
    const filas = specs.slice(0, 5);
    let size = 104, bloques, alto;
    for (;;) {
      bloques = filas.map(([k, v]) => ({ k, lines: lineasTexto(ctx, String(v), gamertags, `900 ${size}px ${FONT}`, TT.maxW, true) }));
      alto = bloques.reduce((s, b) => s + 30 + 18 + b.lines.length * size * 0.92, 0) + (filas.length - 1) * 56;
      if (alto <= TT.bottom - TT.top - 160 || size <= 48) break;
      size -= 4;
    }
    let y = TT.top + 90 + Math.max(0, (TT.bottom - TT.top - 160 - alto) / 2);
    bloques.forEach((b, i) => {
      ctx.font = `800 30px ${FONT}`; ctx.letterSpacing = '8px'; ctx.fillStyle = GOLD;
      ctx.fillText(String(b.k).toUpperCase(), TT.X, y + 30);
      ctx.letterSpacing = '0.5px'; ctx.font = `900 ${size}px ${FONT}`;
      y = pintarLineas(ctx, b.lines, TT.X, y + 30 + 18 + size * 0.85, size * 0.92, INK) - size * 0.85;
      if (i < bloques.length - 1) { ctx.fillStyle = 'rgba(244,241,234,.18)'; ctx.fillRect(TT.X, y + 26, TT.maxW, 2); y += 56; }
    });
    ctx.letterSpacing = '0px';
  }

  function placaFrase(ctx, q, gamertags) {
    let size = 88, lines;
    for (;;) { lines = lineasTexto(ctx, q.quote, gamertags, `800 ${size}px ${FONT}`, TT.maxW, false); if (lines.length * size * 1.08 <= 860 || size <= 50) break; size -= 4; }
    const lh = size * 1.08, alto = 130 + lines.length * lh + (q.by ? 80 : 0);
    let y = TT.top + 60 + Math.max(0, (TT.bottom - TT.top - 160 - alto) / 2);
    ctx.font = `900 200px ${FONT}`; ctx.fillStyle = GOLD;
    ctx.fillText('“', TT.X - 8, y + 150);
    y += 130 + size;
    ctx.font = `800 ${size}px ${FONT}`;
    y = pintarLineas(ctx, lines, TT.X, y, lh, INK);
    if (q.by) {
      ctx.font = `700 32px ${FONT}`; ctx.letterSpacing = '4px'; ctx.fillStyle = GOLD;
      ctx.fillText('— ' + q.by, TT.X, y + 30, TT.maxW);
      ctx.letterSpacing = '0px';
    }
  }

  // Devuelve los lienzos del carrusel en orden. extras: URLs de imágenes que van enteras (la placa del fixture, etc.).
  async function tiktok(n, opts = {}) {
    await fonts();
    const foto = await fotoVertical(n), escudo = await loadImg(ESCUDO);
    const bloques = (n.body || []).filter(b => b && typeof b === 'object');
    const specs = bloques.find(b => Array.isArray(b.specs) && b.specs.length)?.specs;
    const quote = bloques.find(b => b.quote);
    const extras = (await Promise.all((opts.extras || []).slice(0, 3).map(loadImg))).filter(Boolean);
    const interiores = [];
    if (specs) interiores.push(ctx => { encabezado(ctx, escudo, 'La ficha'); placaFicha(ctx, specs, opts.gamertags); });
    else if (n.excerpt) interiores.push(ctx => { encabezado(ctx, escudo, n.category || 'La nota'); placaFrase(ctx, { quote: n.excerpt }, opts.gamertags); });
    if (quote) interiores.push(ctx => { encabezado(ctx, escudo, 'La frase'); placaFrase(ctx, quote, opts.gamertags); });
    for (const img of extras) interiores.push(ctx => {
      // Entera, lo más grande posible sin meterse bajo los botones de la derecha ni el texto de abajo.
      const w = Math.min(TT.maxW + 60, img.width * (TT.bottom - TT.top - 90) / img.height), h = w * img.height / img.width;
      const x = Math.max(40, TT.X + (TT.maxW - w) / 2), y = TT.top + (TT.bottom - TT.top - 90 - h) / 2;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 40;
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
    });
    const out = [await portadaTikTok(n, { ...opts, pie: interiores.length ? 'Deslizá' : null })];
    interiores.forEach((dibujar, i) => {
      const { c, ctx } = lienzo();
      fondoOscuro(ctx, foto);
      dibujar(ctx);
      if (i === interiores.length - 1) pieLink(ctx);
      out.push(c);
    });
    return out;
  }

  window.TSRedes = { render, tituloCorto, limpia, tiktok };
})();
