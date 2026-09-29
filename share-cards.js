// ── TOP SECRET FC · Placas para compartir noticias ──────────────────────────
// Genera en el navegador (canvas) dos piezas por noticia con la estética de
// expediente digital del sitio: post de Instagram 4:5 (1080x1350) e historia
// 9:16 (1080x1920). El escudo Clean se elige según el fondo donde cae
// (dorado sobre oscuro, negro sobre claro). Uso:
//   const canvas = await TSCards.post(n, meta)   // meta = { id: 'EXP-…', file: '….dossier' }
//   const canvas = await TSCards.story(n, meta)
(function () {
  const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/';
  const LOGO = { dorado: MEDIA + 'logos/rebrand/clean-dorado.webp', negro: MEDIA + 'logos/rebrand/clean-negro.webp' };
  const C = { bg: '#0B0A07', ink: '#F2EEE0', dim: 'rgba(242,238,224,.55)', gold: '#C8A84B', ok: '#3ECF8E', line: 'rgba(242,238,224,.14)' };
  const MONO = '"JetBrains Mono", ui-monospace, monospace';
  const SANS = 'Barlow, "Barlow Condensed", sans-serif';
  const cache = {};

  function loadImg(src) {
    if (!src) return Promise.resolve(null);
    if (cache[src]) return cache[src];
    cache[src] = new Promise(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });
    return cache[src];
  }
  // Primero la versión .webp liviana de /media, si falla la original.
  async function loadPhoto(url) {
    const webp = /\/media\/.+\.(png|jpe?g)$/i.test(url || '') ? url.replace(/\.(png|jpe?g)$/i, '.webp') : null;
    return (webp && await loadImg(webp)) || loadImg(url);
  }
  async function fontsReady() {
    try {
      await Promise.all([
        document.fonts.load(`900 80px Barlow`), document.fonts.load(`500 24px Barlow`),
        document.fonts.load(`500 22px "JetBrains Mono"`), document.fonts.load(`700 22px "JetBrains Mono"`),
      ]);
    } catch (e) {}
  }

  // Dibuja la imagen cubriendo el rectángulo (como object-fit: cover), con foco vertical fy (0 = arriba).
  function cover(ctx, img, x, y, w, h, fy = 0.3) {
    const s = Math.max(w / img.width, h / img.height);
    const sw = w / s, sh = h / s;
    const sx = (img.width - sw) / 2, sy = (img.height - sh) * fy;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  async function drawLogo(ctx, x, y, h, onLight) {   // dorado sobre oscuro, negro sobre claro
    const img = await loadImg(onLight ? LOGO.negro : LOGO.dorado);
    if (!img) return;
    const w = h * img.width / img.height;
    ctx.save();
    if (!onLight) { ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 18; }
    ctx.drawImage(img, x - w, y, w, h);   // x = borde derecho
    ctx.restore();
  }
  // Parte el texto en líneas y achica la fuente hasta que entre en maxLines.
  function fitTitle(ctx, text, maxW, size, minSize, maxLines) {
    for (let s = size; s >= minSize; s -= 4) {
      ctx.font = `900 ${s}px ${SANS}`;
      const lines = wrap(ctx, text, maxW);
      if (lines.length <= maxLines) return { size: s, lines };
    }
    ctx.font = `900 ${minSize}px ${SANS}`;
    const lines = wrap(ctx, text, maxW).slice(0, maxLines);
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '…');
    return { size: minSize, lines };
  }
  function wrap(ctx, text, maxW) {
    const words = String(text || '').split(/\s+/), lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function tracked(ctx, text, x, y, spacing) {
    try { ctx.letterSpacing = spacing + 'px'; } catch (e) {}
    ctx.fillText(text, x, y);
    try { ctx.letterSpacing = '0px'; } catch (e) {}
  }
  function title(ctx, t, x, y, lineGap) {
    ctx.fillStyle = C.ink; ctx.textBaseline = 'alphabetic';
    ctx.font = `900 ${t.size}px ${SANS}`;
    try { ctx.letterSpacing = (-t.size * 0.035) + 'px'; } catch (e) {}
    t.lines.forEach((l, i) => ctx.fillText(l, x, y + i * t.size * lineGap));
    try { ctx.letterSpacing = '0px'; } catch (e) {}
    return y + (t.lines.length - 1) * t.size * lineGap;
  }
  // Marcas de esquina tipo visor, muy tenues.
  function corners(ctx, x, y, w, h, len, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath(); ctx.moveTo(cx, cy + dy * len); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx * len, cy); ctx.stroke();
    });
  }
  function dots(ctx, x, y) {
    ['#e0645a', '#e0c979', '#3ecf8e'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + i * 26, y, 7, 0, Math.PI * 2); ctx.fill(); });
  }
  function metaRow(ctx, x, y, w, date) {
    ctx.fillStyle = C.line; ctx.fillRect(x, y, w, 2);
    ctx.font = `500 24px ${MONO}`; ctx.textBaseline = 'top';
    ctx.fillStyle = C.dim; ctx.textAlign = 'left'; ctx.fillText(date, x, y + 22);
    ctx.fillStyle = C.ok; ctx.textAlign = 'right'; tracked(ctx, 'DESCLASIFICADO', x + w, y + 22, 3);
    ctx.textAlign = 'left';
  }
  function label(n, meta) { return `${meta.id} · ${String(n.category || 'Noticia').toUpperCase()}`; }
  function dateOf(n) { return n.dateLabel || n.date || ''; }

  // Ventana de expediente con la foto (barra con semáforo + nombre de archivo).
  async function fileWindow(ctx, n, meta, x, y, w, h, fy) {
    const bar = 60;
    ctx.save(); roundRect(ctx, x, y, w, h, 28); ctx.fillStyle = '#16140f'; ctx.fill(); ctx.clip();
    const img = await loadPhoto(n.image);
    if (img) cover(ctx, img, x, y + bar, w, h - bar, fy);
    ctx.fillStyle = 'rgba(22,20,15,.96)'; ctx.fillRect(x, y, w, bar);
    ctx.restore();
    dots(ctx, x + 34, y + bar / 2);
    ctx.font = `500 22px ${MONO}`; ctx.fillStyle = C.dim; ctx.textBaseline = 'middle';
    const fname = `${meta.id} · ${meta.file}`;
    ctx.fillText(fname.length > 46 ? fname.slice(0, 45) + '…' : fname, x + 120, y + bar / 2);
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; roundRect(ctx, x, y, w, h, 28); ctx.stroke();
  }
  function glow(ctx, W, cy) {
    const rg = ctx.createRadialGradient(W / 2, cy, 40, W / 2, cy, 900);
    rg.addColorStop(0, 'rgba(200,168,75,.10)'); rg.addColorStop(1, 'rgba(200,168,75,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, cy * 2 + 400);
  }
  async function header(ctx, W, P, y, logoH) {
    ctx.textBaseline = 'middle'; ctx.font = `500 26px ${MONO}`;
    ctx.fillStyle = C.ok; ctx.beginPath(); ctx.arc(P + 6, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(242,238,224,.8)'; ctx.fillText('TSFC://archivo/noticias', P + 28, y);
    await drawLogo(ctx, W - P, y - logoH / 2, logoH, false);
  }

  async function post(n, meta) {
    await fontsReady();
    const W = 1080, H = 1350, P = 64;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    glow(ctx, W, 480);
    await header(ctx, W, P, 92, 88);
    // El texto se ancla abajo; la ventana ocupa lo que queda.
    const t = fitTitle(ctx, n.title, W - P * 2, 72, 48, 3);
    const rowY = H - 104;
    const lastBase = rowY - 40;
    const firstBase = lastBase - (t.lines.length - 1) * t.size * 0.98;
    const labelY = firstBase - t.size - 14;
    await fileWindow(ctx, n, meta, P, 168, W - P * 2, labelY - 56 - 168, 0.22);
    ctx.fillStyle = C.gold; ctx.font = `700 24px ${MONO}`; ctx.textBaseline = 'alphabetic';
    tracked(ctx, label(n, meta), P, labelY, 2);
    title(ctx, t, P, firstBase, 0.98);
    metaRow(ctx, P, rowY, W - P * 2, dateOf(n));
    return cv;
  }

  async function story(n, meta) {
    await fontsReady();
    const W = 1080, H = 1920, P = 72;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    glow(ctx, W, 700);
    await header(ctx, W, P, 236, 104);

    // Texto anclado abajo (sobre la zona que tapa la interfaz de Instagram);
    // la ventana con la foto ocupa lo que queda arriba.
    const t = fitTitle(ctx, n.title, W - P * 2, 84, 52, 4);
    const rowY = 1620;
    const lastBase = rowY - 44;
    const firstBase = lastBase - (t.lines.length - 1) * t.size * 0.98;
    const labelY = firstBase - t.size - 18;
    await fileWindow(ctx, n, meta, P, 330, W - P * 2, labelY - 70 - 330, 0.2);
    ctx.fillStyle = C.gold; ctx.font = `700 26px ${MONO}`; ctx.textBaseline = 'alphabetic';
    tracked(ctx, label(n, meta), P, labelY, 2);
    title(ctx, t, P, firstBase, 0.98);
    metaRow(ctx, P, rowY, W - P * 2, dateOf(n));

    ctx.textAlign = 'center'; ctx.font = `500 24px ${MONO}`; ctx.fillStyle = 'rgba(242,238,224,.4)'; ctx.textBaseline = 'alphabetic';
    tracked(ctx, 'NOTA COMPLETA EN EL SITIO DEL CLUB', W / 2, 1740, 3);
    ctx.textAlign = 'left';
    return cv;
  }

  function toBlob(cv) { return new Promise(res => cv.toBlob(b => res(b), 'image/jpeg', 0.92)); }

  window.TSCards = { post, story, toBlob };
})();
