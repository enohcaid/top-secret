/* Tarjeta "Sonando ahora" de los videos (Juan, 2026-10-28): qué tema de Tacet Sin suena, como una tarjeta de
   reproductor — portada del volumen de The Shorts, título grande, artista, ecualizador animado y barra de progreso.
   Entra deslizándose al segundo 0,5 y se va a los 6,1. Dibuja en un canvas 2D cualquiera:
     TSRotuloTema.dibujar(ctx, ancho, alto, segundo, { titulo, artista }, imagenPortada)
   La usan video-equipo.js (en el navegador) y scripts/lib/musica.mjs (cuadros PNG con Playwright para ffmpeg). */
(function () {
  const DUR = 6.4;
  const ORO = '#c9a84c';
  const suave = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

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

  function dibujar(ctx, w, h, seg, tema, portada) {
    const entra = suave((seg - 0.5) / 0.55), sale = suave((seg - 5.6) / 0.5);
    const a = entra * (1 - sale);
    if (a <= 0) return;
    const s = w / 1080;
    const W = 700 * s, H = 188 * s, x = 56 * s - (1 - entra) * 60 * s - sale * 60 * s, y = h * 0.11;
    const pad = 22 * s, lado = H - pad * 2;
    ctx.save();
    ctx.globalAlpha = a;

    // Fondo: vidrio oscuro con borde fino dorado
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 30 * s; ctx.shadowOffsetY = 8 * s;
    redondo(ctx, x, y, W, H, 28 * s); ctx.fillStyle = 'rgba(12,12,14,.82)'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.5 * s; ctx.strokeStyle = 'rgba(201,168,76,.45)'; ctx.stroke();

    // Portada
    ctx.save(); redondo(ctx, x + pad, y + pad, lado, lado, 16 * s); ctx.clip();
    if (portada && portada.width) ctx.drawImage(portada, x + pad, y + pad, lado, lado);
    else { ctx.fillStyle = '#222'; ctx.fillRect(x + pad, y + pad, lado, lado); }
    ctx.restore();

    const tx = x + pad + lado + 26 * s, maxT = x + W - pad - tx;
    // Ecualizador + "SONANDO AHORA"
    const base = y + pad + 30 * s;
    for (let i = 0; i < 4; i++) {
      const alt = (0.35 + 0.65 * Math.abs(Math.sin(seg * (5.5 + i * 1.7) + i * 1.3))) * 26 * s;
      ctx.fillStyle = ORO; ctx.fillRect(tx + i * 9 * s, base - alt, 5.5 * s, alt);
    }
    ctx.fillStyle = ORO; ctx.textBaseline = 'alphabetic';
    ctx.font = `700 ${23 * s}px 'Barlow Condensed', 'Barlow', sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${3 * s}px`;
    ctx.fillText('SONANDO AHORA', tx + 46 * s, base);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    // Título del tema y artista
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${56 * s}px 'Barlow Condensed', 'Barlow', sans-serif`;
    ctx.fillText(recortar(ctx, tema.titulo, maxT), tx, base + 60 * s);
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.font = `600 ${31 * s}px 'Barlow', 'Barlow Condensed', sans-serif`;
    ctx.fillText(recortar(ctx, tema.artista || 'Tacet Sin', maxT), tx, base + 102 * s);

    // Barra de progreso
    const by = y + H - pad - 4 * s;
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(tx, by, maxT, 4 * s);
    ctx.fillStyle = ORO; ctx.fillRect(tx, by, maxT * Math.min(1, Math.max(0, (seg - 0.5) / (DUR - 0.5))), 4 * s);
    ctx.restore();
  }

  (typeof window !== 'undefined' ? window : globalThis).TSRotuloTema = { DUR, dibujar };
})();
