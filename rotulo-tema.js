/* Tarjeta "Sonando ahora" de los videos (Juan, 2026-10-28): qué tema de Tacet Sin suena, como un reproductor —
   portada del volumen de The Shorts, "SONANDO AHORA" con ecualizador, título, artista y barra de progreso.
   Juan: que se entienda que es el tema que suena y que Tacet Sin es el artista; que no se vaya nunca y que no tape
   nada. Es una píldora compacta en la franja de arriba de todo (libre en todas las plantillas, por encima de los
   chips y títulos), entra al segundo 0,3 y queda hasta el final; la barra marca el avance de todo el video.
     TSRotuloTema.dibujar(ctx, ancho, alto, segundo, { titulo, artista }, imagenPortada, duracionVideo)
   `alto` es el del video: el canvas puede ser solo la franja de arriba (TSRotuloTema.franja(ancho, alto) px).
   La usan video-equipo.js (en el navegador) y scripts/lib/musica.mjs (cuadros PNG con Playwright para ffmpeg). */
(function () {
  const ORO = '#c9a84c';
  const suave = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const medidas = (w, h) => { const s = w / 1080; return { s, x: 40 * s, y: h * 0.02, H: 96 * s }; };
  const franja = (w, h) => { const m = medidas(w, h); return Math.ceil(m.y + m.H + 30 * m.s); };

  function redondo(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function recortar(ctx, txt, max) {
    if (ctx.measureText(txt).width <= max) return txt;
    while (txt.length > 1 && ctx.measureText(txt + '…').width > max) txt = txt.slice(0, -1);
    return txt + '…';
  }
  const fuente = (peso, px, fam) => `${peso} ${px}px ${fam === 'b' ? "'Barlow', 'Barlow Condensed'" : "'Barlow Condensed', 'Barlow'"}, sans-serif`;

  function dibujar(ctx, w, h, seg, tema, portada, dur) {
    const entra = suave((seg - 0.3) / 0.5);
    if (entra <= 0) return;
    const { s, x, H } = medidas(w, h), y = medidas(w, h).y - (1 - entra) * 30 * s;
    const pad = 14 * s, lado = H - pad * 2, tx = x + pad + lado + 18 * s;
    const artista = tema.artista || 'Tacet Sin';

    // Ancho según el texto (título + artista en la misma línea), con tope en el 80% del video
    ctx.font = fuente(800, 38 * s); const wT = ctx.measureText(tema.titulo).width;
    ctx.font = fuente(600, 25 * s, 'b'); const wA = ctx.measureText(artista).width;
    const W = Math.min(w * 0.8, Math.max(400 * s, tx - x + wT + 16 * s + wA + 26 * s));
    const maxT = x + W - 22 * s - tx;

    ctx.save();
    ctx.globalAlpha = entra;
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 20 * s; ctx.shadowOffsetY = 5 * s;
    redondo(ctx, x, y, W, H, H / 2 > 30 * s ? 24 * s : H / 2); ctx.fillStyle = 'rgba(12,12,14,.8)'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.5 * s; ctx.strokeStyle = 'rgba(201,168,76,.45)'; ctx.stroke();

    // Portada
    ctx.save(); redondo(ctx, x + pad, y + pad, lado, lado, 12 * s); ctx.clip();
    if (portada && portada.width) ctx.drawImage(portada, x + pad, y + pad, lado, lado);
    else { ctx.fillStyle = '#222'; ctx.fillRect(x + pad, y + pad, lado, lado); }
    ctx.restore();

    // Ecualizador + "SONANDO AHORA"
    const l1 = y + pad + 20 * s;
    for (let i = 0; i < 4; i++) {
      const alt = (0.35 + 0.65 * Math.abs(Math.sin(seg * (5.5 + i * 1.7) + i * 1.3))) * 19 * s;
      ctx.fillStyle = ORO; ctx.fillRect(tx + i * 7 * s, l1 - alt, 4.5 * s, alt);
    }
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = ORO; ctx.font = fuente(700, 18 * s);
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${2.5 * s}px`;
    ctx.fillText('SONANDO AHORA', tx + 36 * s, l1);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    // Título y artista
    const l2 = l1 + 40 * s;
    ctx.fillStyle = '#fff'; ctx.font = fuente(800, 38 * s);
    const tit = recortar(ctx, tema.titulo, maxT * 0.68);
    ctx.fillText(tit, tx, l2);
    const ax = tx + ctx.measureText(tit).width + 14 * s;
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = fuente(600, 25 * s, 'b');
    ctx.fillText(recortar(ctx, artista, x + W - 22 * s - ax), ax, l2);

    // Barra de progreso del video, pegada al borde de abajo
    if (dur > 0) {
      ctx.save(); redondo(ctx, x, y, W, H, 24 * s); ctx.clip();
      ctx.fillStyle = ORO; ctx.fillRect(x, y + H - 3.5 * s, W * Math.min(1, seg / dur), 3.5 * s);
      ctx.restore();
    }
    ctx.restore();
  }

  (typeof window !== 'undefined' ? window : globalThis).TSRotuloTema = { dibujar, franja };
})();
