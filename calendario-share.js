/* Placa "Partidos de hoy" que se comparte desde calendario.html (botón Compartir).
   Se dibuja en canvas 1080×1350 (post 4:5) en vez de capturar la tarjeta del hero:
   vertical para WhatsApp/Instagram, partidos ordenados por hora, escudo Clean dorado.
   Uso: TSMatchdayCard.build({ eyebrow, title, matches:[{time, rival, league, isHome, round, badge}] }) → Promise<Blob> */
(function () {
  const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
  const IMG_PROXY = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/img-proxy?url=';
  const ART = MEDIA + '/logos/duos/duo-defensa-k1.webp?v=2026-09-29b';
  const CREST = MEDIA + '/logos/rebrand/clean-dorado.webp';
  const W = 1080, H = 1350, PAD = 72;
  const C = {
    bg: '#0a0a0a', gold: '#c9a84c', goldSoft: 'rgba(201,168,76,.35)', white: '#f4f1ea',
    mid: 'rgba(244,241,234,.62)', line: 'rgba(244,241,234,.12)',
    league: { VPN: '#f5c518', VPUG: '#3ecf8e', '11x11': '#4a9eff', Amistoso: '#b8b2a6' },
  };
  const COND = "'Barlow Condensed', sans-serif";
  const MONO = "ui-monospace, 'SFMono-Regular', Consolas, monospace";

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
  // Los escudos de rivales vienen de dominios sin CORS: pasan por el img-proxy del Worker.
  const badgeSrc = url => !url ? null : url.startsWith(MEDIA) ? url : IMG_PROXY + encodeURIComponent(url);

  function fitText(ctx, text, maxW, size, weight, family) {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${family}`; } while (ctx.measureText(text).width > maxW && (s -= 2) > 20);
    return s;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function corners(ctx) {
    const L = 34, I = 36;
    ctx.strokeStyle = C.goldSoft; ctx.lineWidth = 2;
    [[I, I, 1, 1], [W - I, I, -1, 1], [I, H - I, 1, -1], [W - I, H - I, -1, -1]].forEach(([x, y, dx, dy]) => {
      ctx.beginPath(); ctx.moveTo(x, y + dy * L); ctx.lineTo(x, y); ctx.lineTo(x + dx * L, y); ctx.stroke();
    });
  }

  async function build({ eyebrow, title, matches }) {
    await Promise.all([
      document.fonts.load(`900 120px ${COND}`), document.fonts.load(`800 48px ${COND}`),
      document.fonts.load(`700 28px ${COND}`), document.fonts.load(`600 26px 'Barlow'`),
    ]).catch(() => {});
    const list = [...matches].sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    const [art, crest, ...badges] = await Promise.all([loadImg(ART), loadImg(CREST), ...list.map(m => loadImg(badgeSrc(m.badge)))]);

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    // ── Foto: duo de K1 arriba, fundida a negro ──
    const artH = 820;
    if (art) {
      const s = W / art.width;
      ctx.globalAlpha = .9;
      ctx.drawImage(art, 0, -40, W, art.height * s);
      ctx.globalAlpha = 1;
    }
    let g = ctx.createLinearGradient(0, 0, 0, artH);
    g.addColorStop(0, 'rgba(10,10,10,.8)'); g.addColorStop(.2, 'rgba(10,10,10,.15)');
    g.addColorStop(.55, 'rgba(10,10,10,.35)'); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, artH);
    ctx.fillStyle = C.bg; ctx.fillRect(0, artH - 1, W, H - artH + 1);
    g = ctx.createRadialGradient(W / 2, artH * .55, 40, W / 2, artH * .55, W * .8);
    g.addColorStop(0, 'rgba(201,168,76,.10)'); g.addColorStop(1, 'rgba(201,168,76,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    corners(ctx);

    // ── Cabecera: escudo + marca / etiqueta de archivo ──
    if (crest) ctx.drawImage(crest, PAD, 70, 58, 58 * crest.height / crest.width);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.white; ctx.font = `800 30px ${COND}`; ctx.letterSpacing = '4px';
    ctx.fillText('TOP SECRET FC', PAD + 76, 102);
    ctx.letterSpacing = '0px';
    ctx.font = `500 22px ${MONO}`;
    const tag = 'TSFC://convocatoria';
    const tw = ctx.measureText(tag).width;
    ctx.fillStyle = C.white; ctx.globalAlpha = .75; ctx.fillText(tag, W - PAD - tw, 102); ctx.globalAlpha = 1;
    ctx.fillStyle = '#3ecf8e'; ctx.beginPath(); ctx.arc(W - PAD - tw - 18, 102, 6, 0, Math.PI * 2); ctx.fill();

    // ── Filas: ancladas abajo, el título se apila encima ──
    const footerY = H - 92;
    const n = list.length;
    const rowH = Math.min(132, Math.max(92, Math.floor(560 / Math.max(n, 1))));
    const rowsTop = footerY - 40 - rowH * n;

    const titleY = rowsTop - 64;
    ctx.textBaseline = 'alphabetic';
    const tSize = fitText(ctx, title.toUpperCase(), W - PAD * 2, 132, 900, COND);
    // Velo detrás del título: con muchas filas el bloque sube y pisa la foto
    const veilTop = titleY - tSize - 140;
    g = ctx.createLinearGradient(0, veilTop, 0, rowsTop);
    g.addColorStop(0, 'rgba(10,10,10,0)'); g.addColorStop(.6, 'rgba(10,10,10,.6)'); g.addColorStop(1, 'rgba(10,10,10,.9)');
    ctx.fillStyle = g; ctx.fillRect(0, veilTop, W, rowsTop - veilTop);
    if (rowsTop < artH) { ctx.fillStyle = 'rgba(10,10,10,.9)'; ctx.fillRect(0, rowsTop, W, artH - rowsTop); }
    ctx.font = `900 ${tSize}px ${COND}`;
    ctx.fillStyle = C.white; ctx.font = `900 ${tSize}px ${COND}`;
    ctx.fillText(title.toUpperCase(), PAD, titleY);
    ctx.fillStyle = C.gold; ctx.font = `700 30px ${COND}`; ctx.letterSpacing = '7px';
    ctx.fillText(eyebrow.toUpperCase(), PAD, titleY - tSize * .78 - 18);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = C.gold; ctx.fillRect(PAD, titleY + 26, 120, 5);

    list.forEach((m, i) => {
      const y = rowsTop + i * rowH, cy = y + rowH / 2;
      ctx.fillStyle = C.line; ctx.fillRect(PAD, y, W - PAD * 2, 1);
      // Hora
      ctx.textBaseline = 'middle';
      ctx.fillStyle = C.gold; ctx.font = `800 ${Math.round(rowH * .4)}px ${COND}`;
      ctx.fillText(m.time || '--:--', PAD, cy + 2);
      // Escudo
      const bs = Math.round(rowH * .64), bx = PAD + 168;
      roundRect(ctx, bx, cy - bs / 2, bs, bs, 14); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill();
      const b = badges[i];
      if (b) {
        const inner = bs - 12, k = Math.min(inner / b.width, inner / b.height);
        ctx.drawImage(b, bx + (bs - b.width * k) / 2, cy - b.height * k / 2, b.width * k, b.height * k);
      } else {
        const ini = m.rival.split(/\s+/).filter(w => /^[A-Za-zÁÉÍÓÚÑ0-9]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase();
        ctx.fillStyle = C.mid; ctx.font = `800 ${Math.round(bs * .38)}px ${COND}`; ctx.textAlign = 'center';
        ctx.fillText(ini, bx + bs / 2, cy + 2); ctx.textAlign = 'left';
      }
      // Rival + datos
      const tx = bx + bs + 26, maxW = W - PAD - tx;
      ctx.textBaseline = 'alphabetic';
      const rs = fitText(ctx, m.rival, maxW, Math.round(rowH * .36), 800, COND);
      ctx.fillStyle = C.white; ctx.font = `800 ${rs}px ${COND}`;
      ctx.fillText(m.rival, tx, cy + 4);
      const lg = m.league || 'Amistoso';
      ctx.font = `700 21px ${COND}`; ctx.letterSpacing = '3px';
      const lw = ctx.measureText(lg.toUpperCase()).width + 22;
      roundRect(ctx, tx, cy + 16, lw, 32, 6);
      ctx.fillStyle = (C.league[lg] || C.league.Amistoso) + '26'; ctx.fill();
      ctx.fillStyle = C.league[lg] || C.league.Amistoso; ctx.textBaseline = 'middle';
      ctx.fillText(lg.toUpperCase(), tx + 11, cy + 33);
      ctx.letterSpacing = '0px';
      const meta = [m.round != null ? 'Fecha ' + m.round : null, m.isHome ? 'Local' : 'Visita'].filter(Boolean).join('  ·  ');
      ctx.fillStyle = C.mid; ctx.font = `600 24px 'Barlow', sans-serif`;
      ctx.fillText(meta, tx + lw + 16, cy + 33);
    });
    ctx.fillStyle = C.line; ctx.fillRect(PAD, rowsTop + n * rowH, W - PAD * 2, 1);

    // ── Pie ──
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.white; ctx.font = `700 28px ${COND}`; ctx.letterSpacing = '2px';
    ctx.fillText('CONFIRMÁ TU ASISTENCIA', PAD, footerY + 16);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = C.gold; ctx.font = `500 22px ${MONO}`;
    const url = 'enohcaid.github.io/top-secret';
    ctx.fillText(url, W - PAD - ctx.measureText(url).width, footerY + 16);

    return new Promise(res => cv.toBlob(res, 'image/png'));
  }

  window.TSMatchdayCard = { build };
})();
