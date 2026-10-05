// Escena del video de plantel / equipo de la noche. La usan dos lados:
//  - render.mjs (PC): página con <canvas id="c"> y window.CFG → window.ESCENA; cuadros JPEG sueltos por http.
//  - video-equipo.js (sitio, botón "Compartir video" de convocatoria): crearEscena(canvas, cfg) con cfg.sprite,
//    una hoja de cuadros por jugador (R2 video-equipo/<ver>/<gt>.webp, armada por web-assets.mjs).
// preparar() carga todo y devuelve la cantidad de cuadros; cuadro(n) dibuja el cuadro n (y lo devuelve como
// JPEG en base64, salvo con {raw:true}). Todo es determinístico (mismo n → mismo cuadro).
function crearEscena(cv, cfg) {
  const W = 1080, H = 1920, FW = 720, FH = 1280, NF = 150;
  const C = { bg: '#0a0a0a', gold: '#c9a84c', goldSoft: 'rgba(201,168,76,.35)', white: '#f4f1ea', mid: 'rgba(244,241,234,.6)' };
  const COND = "'Barlow Condensed', sans-serif";
  const CREST = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/rebrand/clean-dorado.webp';
  // Tiempos (cuadros a 30 fps)
  const INTRO = 54, SEG = 44, STEP = 38, OUTRO = 96;
  const APARECE = 8, VUELA = 28;          // dentro de cada segmento: aparece 0–8, se queda 8–28, vuela 28–44
  // El clip de Canva es un acercamiento que termina en primer plano (y a veces tapa el gesto): se reproduce
  // AL REVÉS, del primer plano (cuadro 150) a la pose completa (cuadro 1), que es la que queda en la grilla.
  const TILE = 1;
  const HEADER_Y = 300;                    // la grilla arranca debajo del título

  const items = cfg.items;
  const ctx = cv.getContext('2d');
  const cache = new Map();
  let crest = null, slots = [], total = 0;

  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;   // easeInOutCubic
  const outCubic = t => 1 - Math.pow(1 - t, 3);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (n, a, b) => clamp((n - a) / (b - a));

  function img(src) {
    if (cache.has(src)) return cache.get(src);
    const p = new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    cache.set(src, p);
    return p;
  }
  const frameSrc = (key, k) => `/frames/${encodeURIComponent(key)}/${String(k).padStart(3, '0')}.jpg`;
  // Imagen de la grilla: brazos cruzados (si render.mjs la habilitó) o la pose completa del gesto
  const tileSrc = key => cfg.grilla ? `/grilla/${encodeURIComponent(key)}/001.jpg` : frameSrc(key, TILE);

  // Un cuadro = { im, sx, sy, sw, sh } (recorte de la imagen fuente, en proporción 720×1280).
  // p = avance de la entrada (0 = primer plano, 1 = pose completa).
  const SP = cfg.sprite;
  const spriteSrc = key => SP.base + encodeURIComponent(key) + '.webp';
  async function cuadroJugador(key, p) {
    if (SP) {
      const i = Math.round(clamp(p) * (SP.n - 1));
      return { im: await img(spriteSrc(key)), sx: (i % SP.cols) * SP.fw, sy: Math.floor(i / SP.cols) * SP.fh, sw: SP.fw, sh: SP.fh };
    }
    const k = Math.min(NF, Math.max(1, Math.round(NF - (NF - TILE) * outCubic(clamp(p)))));
    img(frameSrc(key, Math.max(TILE, k - 4)));                         // precarga
    return { im: await img(frameSrc(key, k)), sx: 0, sy: 0, sw: FW, sh: FH };
  }
  async function cuadroGrilla(key) {
    if (SP) return cuadroJugador(key, 1);
    return { im: await img(tileSrc(key)), sx: 0, sy: 0, sw: FW, sh: FH };
  }

  // ── Posiciones finales de cada jugador ──
  function calcularSlots() {
    const M = 56, GAP = 16, top = HEADER_Y + 40, bottom = H - 90 - altoPartidos();
    if (cfg.layout.tipo === 'grilla') {
      const cols = cfg.layout.cols, rows = Math.ceil(items.length / cols);
      const w = Math.floor(Math.min((W - 2 * M - (cols - 1) * GAP) / cols, ((bottom - top - (rows - 1) * GAP) / rows) * 3 / 4));
      const h = Math.round(w * 4 / 3);
      const gridH = rows * h + (rows - 1) * GAP, y0 = top + (bottom - top - gridH) / 2;
      return items.map((_, i) => {
        const r = Math.floor(i / cols), enFila = Math.min(cols, items.length - r * cols), c = i % cols;
        const rowW = enFila * w + (enFila - 1) * GAP;          // última fila centrada (grilla simétrica)
        return { x: (W - rowW) / 2 + c * (w + GAP), y: y0 + r * (h + GAP), w, h, srcH: FW * h / w };
      });
    }
    // Formación: filas por línea (según la "y" de convocatoria.html), delanteros arriba, arquero abajo
    const orden = items.map((it, i) => ({ ...it, i })).sort((a, b) => a.y - b.y);
    const filas = [];
    orden.forEach(it => { const f = filas[filas.length - 1]; if (f && it.y - f[f.length - 1].y <= 8) f.push(it); else filas.push([it]); });
    filas.forEach(f => f.sort((a, b) => a.x - b.x));
    const maxN = Math.max(...filas.map(f => f.length));
    const RG = 30, w = Math.floor(Math.min((W - 2 * M - (maxN - 1) * GAP) / maxN, 240));
    const h = Math.round(Math.min(w * 14 / 9, (bottom - top - (filas.length - 1) * RG) / filas.length)), gridH = filas.length * h + (filas.length - 1) * RG, y0 = top + (bottom - top - gridH) / 2;
    const out = [];
    filas.forEach((f, r) => {
      const rowW = f.length * w + (f.length - 1) * GAP;
      f.forEach((it, c) => { out[it.i] = { x: (W - rowW) / 2 + c * (w + GAP), y: y0 + r * (h + RG), w, h, srcH: FW * h / w }; });
    });
    return out;
  }

  // ── Partidos de la noche (modo equipo): bloque abajo de la formación ──
  const partidos = cfg.partidos || [];
  const FILA_P = 66;
  function altoPartidos() { return partidos.length ? 64 + FILA_P * partidos.length : 0; }
  const LIGA = { VPN: '#f5c518', VPUG: '#3ecf8e', '11x11': '#4a9eff' };
  function bloquePartidos(alpha) {
    if (!partidos.length || alpha <= 0) return;
    const M = 72, y0 = H - 90 - altoPartidos() + 18;
    ctx.globalAlpha = alpha;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = C.gold; ctx.font = `700 26px ${COND}`; ctx.letterSpacing = '7px';
    ctx.fillText(partidos.length > 1 ? 'PARTIDOS DE HOY' : 'PARTIDO DE HOY', M, y0 + 10);
    ctx.letterSpacing = '0px';
    partidos.forEach((p, i) => {
      const cy = y0 + 58 + i * FILA_P;
      ctx.fillStyle = 'rgba(244,241,234,.12)'; ctx.fillRect(M, cy - FILA_P / 2, W - 2 * M, 1);
      ctx.fillStyle = C.gold; ctx.font = `800 40px ${COND}`; ctx.fillText(p.time || '--:--', M, cy);
      const bx = M + 118, bs = 46;
      rr(bx, cy - bs / 2, bs, bs, 10); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill();
      if (p._img) { const k = Math.min((bs - 6) / p._img.width, (bs - 6) / p._img.height); ctx.drawImage(p._img, bx + (bs - p._img.width * k) / 2, cy - p._img.height * k / 2, p._img.width * k, p._img.height * k); }
      const lg = p.league || 'Amistoso', col = LIGA[lg] || '#b8b2a6';
      ctx.font = `700 22px ${COND}`; ctx.letterSpacing = '3px';
      const meta = lg.toUpperCase() + '  ·  ' + (p.isHome ? 'LOCAL' : 'VISITA');
      const mw = ctx.measureText(meta).width;
      ctx.fillStyle = col; ctx.fillText(meta, W - M - mw, cy);
      ctx.letterSpacing = '0px';
      const tx = bx + bs + 18, s = fit(p.rival, W - M - mw - 24 - tx, 40, 800);
      ctx.fillStyle = C.white; ctx.font = `800 ${s}px ${COND}`; ctx.fillText(p.rival, tx, cy + 1);
    });
    ctx.globalAlpha = 1;
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fit(text, maxW, size, weight) {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${COND}`; } while (ctx.measureText(text).width > maxW && (s -= 2) > 12);
    return s;
  }

  function fondo() {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    let g = ctx.createRadialGradient(W / 2, 260, 20, W / 2, 260, 1100);
    g.addColorStop(0, 'rgba(201,168,76,.16)'); g.addColorStop(1, 'rgba(201,168,76,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const L = 40, I = 40;
    ctx.strokeStyle = C.goldSoft; ctx.lineWidth = 2;
    [[I, I, 1, 1], [W - I, I, -1, 1], [I, H - I, 1, -1], [W - I, H - I, -1, -1]].forEach(([x, y, dx, dy]) => {
      ctx.beginPath(); ctx.moveTo(x, y + dy * L); ctx.lineTo(x, y); ctx.lineTo(x + dx * L, y); ctx.stroke();
    });
  }

  // Cabecera: en la intro el escudo y el título aparecen al centro y suben a su lugar.
  // Arriba: escudo + TOP SECRET FC (y≈100) · eyebrow (y≈180) · título (base y≈275)
  function cabecera(n) {
    const sube = ease(seg(n, 30, INTRO));
    const cs = lerp(220, 60, sube), cw = cs * .9;
    ctx.globalAlpha = seg(n, 0, 16);
    if (crest) ctx.drawImage(crest, lerp(W / 2 - cw / 2, 72, sube), lerp(560, 70, sube), cw, cs);
    ctx.globalAlpha = seg(n, 22, 40);
    ctx.textBaseline = 'middle'; ctx.fillStyle = C.white; ctx.font = `800 30px ${COND}`; ctx.letterSpacing = '5px';
    ctx.fillText('TOP SECRET FC', 150, 102);
    ctx.textBaseline = 'alphabetic';
    const titulo = cfg.header.title.toUpperCase();
    const ts = lerp(150, 92, sube), ty = lerp(1010, 275, sube);
    ctx.globalAlpha = seg(n, 10, 28);
    ctx.fillStyle = C.gold; ctx.font = `700 ${Math.round(lerp(34, 26, sube))}px ${COND}`; ctx.letterSpacing = '7px';
    const eb = cfg.header.eyebrow.toUpperCase(), ew = ctx.measureText(eb).width;
    ctx.fillText(eb, lerp(W / 2 - ew / 2, 72, sube), ty - ts * .78 - 16);
    ctx.letterSpacing = '0px';
    ctx.font = `900 ${Math.round(ts)}px ${COND}`; ctx.fillStyle = C.white;
    const tw = ctx.measureText(titulo).width;
    ctx.fillText(titulo, lerp(W / 2 - tw / 2, 72, sube), ty);
    ctx.globalAlpha = 1;
  }

  // Tarjeta de un jugador: imagen recortada + textos. big=1 → textos grandes; label=1 → rótulo chico de grilla
  // fr / fr2 = cuadros { im, sx, sy, sw, sh }; srcH = alto visible en escala 720×1280 (recorte desde arriba)
  function tarjeta(fr, it, x, y, w, h, srcH, radio, big, label, fr2 = null, mix = 0) {
    ctx.save();
    rr(x, y, w, h, radio); ctx.clip();
    const pinta = f => ctx.drawImage(f.im, f.sx, f.sy, f.sw, f.sh * srcH / FH, x, y, w, h);
    if (fr && fr.im && mix < 1) pinta(fr);
    if (fr2 && fr2.im && mix > 0) { ctx.globalAlpha = mix; pinta(fr2); ctx.globalAlpha = 1; }
    if (fr2 && mix > 0 && mix < 1) {   // destello dorado que disimula el cambio de pose
      const f = Math.sin(mix * Math.PI);
      const g = ctx.createRadialGradient(x + w / 2, y + h * .35, 0, x + w / 2, y + h * .35, Math.max(w, h) * .75);
      g.addColorStop(0, `rgba(255,236,180,${.75 * f})`); g.addColorStop(.5, `rgba(201,168,76,${.35 * f})`); g.addColorStop(1, 'rgba(201,168,76,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    }
    const g = ctx.createLinearGradient(0, y + h * .55, 0, y + h);
    g.addColorStop(0, 'rgba(10,10,10,0)'); g.addColorStop(1, `rgba(10,10,10,${.85 * Math.max(big, label)})`);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.textBaseline = 'alphabetic';
    if (big > 0) {
      ctx.globalAlpha = big;
      const p = w * .07;
      ctx.fillStyle = C.gold; ctx.font = `900 ${Math.round(w * .2)}px ${COND}`;
      ctx.fillText(it.num, x + p, y + h - p - w * .17);
      const nw = ctx.measureText(it.num).width;
      ctx.font = `700 ${Math.round(w * .042)}px ${COND}`; ctx.letterSpacing = '5px';
      ctx.fillText((it.capitan ? 'Capitán · ' : '') + it.puesto.toUpperCase(), x + p + nw + w * .04, y + h - p - w * .17 - w * .02);
      ctx.letterSpacing = '0px';
      ctx.fillStyle = C.white;
      const s = fit(it.key, w - 2 * p, Math.round(w * .1), 800);
      ctx.font = `800 ${s}px ${COND}`; ctx.fillText(it.key, x + p, y + h - p);
      ctx.globalAlpha = 1;
    }
    if (label > 0) {
      ctx.globalAlpha = label;
      const p = Math.round(w * .07);
      ctx.fillStyle = C.gold; ctx.font = `900 ${Math.round(w * .2)}px ${COND}`;
      ctx.fillText(it.num, x + p, y + h - p - w * .13);
      if (it.capitan) {
        const nw = ctx.measureText(it.num).width;
        ctx.font = `800 ${Math.round(w * .075)}px ${COND}`; ctx.fillText('C', x + p + nw + 6, y + h - p - w * .13);
      }
      ctx.fillStyle = C.white;
      const s = fit(it.key, w - 2 * p, Math.round(w * .1), 800);
      ctx.font = `800 ${s}px ${COND}`; ctx.fillText(it.key, x + p, y + h - p);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    rr(x, y, w, h, radio);
    ctx.strokeStyle = `rgba(201,168,76,${.25 + .35 * label})`; ctx.lineWidth = 2; ctx.stroke();
  }

  async function preparar() {
    await Promise.all([document.fonts.load(`900 100px ${COND}`), document.fonts.load(`800 40px ${COND}`), document.fonts.load(`700 30px ${COND}`)]).catch(() => {});
    crest = await img(CREST);
    await Promise.all(items.map(it => cuadroGrilla(it.key)));
    await Promise.all(partidos.map(async p => { p._img = p.badge ? await img(p.badge.startsWith('http') && !p.badge.includes('/media/') ? 'https://top-secret-proxy.juan-c-m-1985.workers.dev/img-proxy?url=' + encodeURIComponent(p.badge) : p.badge) : null; }));
    slots = calcularSlots();
    total = INTRO + (items.length - 1) * STEP + SEG + OUTRO;
    return total + PORTADA;
  }

  // Los primeros PORTADA cuadros son la imagen final (todos ubicados + partidos): es la miniatura que muestran
  // WhatsApp y las redes. Dura 2 cuadros, casi no se ve al reproducir.
  const PORTADA = 2;
  async function cuadro(nOut, opts = {}) {
    const portada = nOut < PORTADA;
    const n = portada ? total - 1 : nOut - PORTADA;
    fondo();
    cabecera(n);
    // Tarjetas ya ubicadas
    const activos = [];
    let dim = 0;
    for (let i = 0; i < items.length; i++) {
      const s0 = INTRO + i * STEP, t = n - s0;
      if (t >= SEG) {
        const sl = slots[i];
        tarjeta(await cuadroGrilla(items[i].key), items[i], sl.x, sl.y, sl.w, sl.h, sl.srcH, 12, 0, 1);
      } else if (t >= 0) {
        activos.push([i, t]);
        dim = Math.max(dim, seg(t, 0, APARECE) * (1 - seg(t, VUELA, SEG)));
      }
    }
    if (dim > 0) {
      const g = ctx.createLinearGradient(0, HEADER_Y - 10, 0, HEADER_Y + 50);
      g.addColorStop(0, 'rgba(10,10,10,0)'); g.addColorStop(1, `rgba(10,10,10,${.6 * dim})`);
      ctx.fillStyle = g; ctx.fillRect(0, HEADER_Y - 10, W, H);
    }
    // Tarjetas entrando (la más nueva arriba)
    for (const [i, t] of activos) {
      const it = items[i], sl = slots[i];
      const fr = await cuadroJugador(it.key, t / (SEG - 1));
      const bw = 760, bh = bw * 16 / 9, bx = (W - bw) / 2, by = HEADER_Y + 60 + (H - HEADER_Y - 60 - bh) / 2;
      const ap = outCubic(seg(t, 0, APARECE)), v = ease(seg(t, VUELA, SEG));
      const sc = lerp(.9, 1, ap);
      const w = lerp(bw * sc, sl.w, v), srcH = lerp(FH, sl.srcH, v), h = w * srcH / FW;
      const cx = lerp(bx + bw / 2, sl.x + sl.w / 2, v), cy = lerp(by + bh / 2, sl.y + sl.h / 2, v);
      ctx.globalAlpha = ap;
      const mix = cfg.grilla ? ease(seg(t, VUELA + 2, SEG - 3)) : 0;
      tarjeta(fr, it, cx - w / 2, cy - h / 2, w, h, srcH, lerp(22, 12, v), (1 - seg(t, VUELA, VUELA + 6)) * seg(t, 4, 12), seg(t, SEG - 6, SEG),
        cfg.grilla ? await cuadroGrilla(it.key) : null, mix);
      ctx.globalAlpha = 1;
    }
    // Cierre: barrido dorado y firma
    const o = n - (total - OUTRO);
    bloquePartidos(portada ? 1 : seg(o, 6, 30));
    if (o > 0) {
      const a = seg(o, 10, 30);
      ctx.globalAlpha = a;
      ctx.fillStyle = C.gold; ctx.font = `700 30px ${COND}`; ctx.letterSpacing = '8px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('#TOPSECRETFC', W / 2, H - 62);
      ctx.textAlign = 'left'; ctx.letterSpacing = '0px'; ctx.globalAlpha = 1;
      const sw = portada ? 0 : seg(o, 0, 26);
      if (sw > 0 && sw < 1) {
        const gx = lerp(-300, W + 300, ease(sw));
        const g = ctx.createLinearGradient(gx - 220, 0, gx + 220, 0);
        g.addColorStop(0, 'rgba(201,168,76,0)'); g.addColorStop(.5, 'rgba(201,168,76,.22)'); g.addColorStop(1, 'rgba(201,168,76,0)');
        ctx.fillStyle = g; ctx.fillRect(0, HEADER_Y, W, H - HEADER_Y);
      }
    }
    return opts.raw ? null : cv.toDataURL('image/jpeg', .9).split(',')[1];
  }

  return { preparar, cuadro, W, H };
}
window.crearEscena = crearEscena;
if (window.CFG && document.getElementById('c')) window.ESCENA = crearEscena(document.getElementById('c'), window.CFG);
