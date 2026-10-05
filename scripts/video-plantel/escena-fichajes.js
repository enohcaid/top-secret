// Escena del video "Nuevos fichajes": estética libre y minimalista, sin recuadros. Cada jugador tiene su momento
// a pantalla completa: aparece de brazos cruzados (clip Brazos4), un destello dorado lo pasa a su pose (clip
// Gesto4 al revés, del primer plano a la pose entera) y su nombre/número/puesto entran en tipografía grande.
// Cierra con los fichajes recortados juntos y "Bienvenidos". Los 2 primeros cuadros son la portada.
// La usa fichajes.mjs (render cuadro por cuadro → ffmpeg). crearFichajes(canvas, cfg) → { preparar, cuadro, portada }.
function crearFichajes(cv, cfg) {
  const W = cv.width, H = cv.height, NF = 150;
  const C = { bg: '#0a0a0a', gold: '#c9a84c', goldHi: '#e9cf86', white: '#f4f1ea', mid: 'rgba(244,241,234,.6)' };
  const COND = "'Barlow Condensed', sans-serif";
  const CREST = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/rebrand/clean-dorado.webp';
  const INTRO = 78, MOM = 120, OUTRO = 126, PORTADA = 2;
  const SWAP = 50;                                          // cuadro del momento en que pasa de brazos a pose
  const items = cfg.items, ctx = cv.getContext('2d');
  const cache = new Map();
  let crest = null, recortes = [], total = 0;

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (n, a, b) => clamp((n - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const outCubic = t => 1 - Math.pow(1 - t, 3);
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const outBack = t => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  function img(src) {
    if (cache.has(src)) return cache.get(src);
    const p = new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    cache.set(src, p); return p;
  }
  const cuadroClip = (pose, key, k) => img(`/${pose}/${encodeURIComponent(key)}/${String(Math.min(NF, Math.max(1, k))).padStart(3, '0')}.jpg`);

  function fondo() {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H * .2, 10, W / 2, H * .2, Math.max(W, H) * .8);
    g.addColorStop(0, 'rgba(201,168,76,.22)'); g.addColorStop(.5, 'rgba(201,168,76,.05)'); g.addColorStop(1, 'rgba(201,168,76,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function texto(t, x, y, size, weight, color, { spacing = 0, align = 'left', alpha = 1, stroke = 0 } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = `${weight} ${size}px ${COND}`; ctx.letterSpacing = spacing + 'px'; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    if (stroke) { ctx.strokeStyle = color; ctx.lineWidth = stroke; ctx.strokeText(t, x, y); } else { ctx.fillStyle = color; ctx.fillText(t, x, y); }
    ctx.restore();
  }
  // Texto que "sube" desde atrás de una línea invisible (máscara), sin cajas
  function texReveal(t, x, y, size, weight, color, p, opts = {}) {
    if (p <= 0) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, y - size * 1.05, W, size * 1.25); ctx.clip();
    texto(t, x, y + size * (1 - outCubic(p)), size, weight, color, opts);
    ctx.restore();
  }
  function fit(t, maxW, size, weight) {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${COND}`; } while (ctx.measureText(t).width > maxW && (s -= 4) > 40);
    return s;
  }

  // Fila de los fichajes recortados (portada y cierre). aparece(i) = 0..1 por jugador
  function fila(y0, alto, aparece = () => 1, idxs = [...recortes.keys()], solape = .28) {
    const sub = idxs.map(i => recortes[i]);
    const n = sub.length, anchoTot = W * .96;
    const pasos = sub.map(r => r ? r.width * (alto / r.height) : 0);
    const total = pasos.reduce((a, w) => a + w * (1 - solape), 0) + pasos[n - 1] * solape;
    const k = Math.min(1, anchoTot / total);
    let x = (W - total * k) / 2;
    // los del medio adelante: se dibujan de afuera hacia adentro
    const orden = [...sub.keys()].sort((a, b) => Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2));
    const pos = pasos.map(w => { const p = x; x += w * k * (1 - solape); return p; });
    for (const i of orden) {
      const r = sub[i]; if (!r) continue;
      const a = aparece(idxs[i]); if (a <= 0) continue;
      const h = alto * k, w = r.width * h / r.height;
      ctx.globalAlpha = a;
      ctx.drawImage(r, pos[i], y0 + (alto - h) + 40 * (1 - outCubic(a)), w, h);
      ctx.globalAlpha = 1;
    }
  }

  // Grupo de fichajes: en horizontal una fila; en vertical dos filas escalonadas (mitad atrás, mitad adelante)
  function grupo(y0, alto, aparece) {
    const todos = [...recortes.keys()];
    if (W >= H || todos.length < 4) return fila(y0, alto, aparece, todos);
    const mitad = Math.ceil(todos.length / 2), atras = todos.slice(0, mitad), adelante = todos.slice(mitad);
    fila(y0, alto * .64, aparece, atras, .12);
    fila(y0 + alto * .33, alto * .67, aparece, adelante, .12);
  }

  function intro(n) {
    fondo();
    const a = seg(n, 0, 12) * (1 - seg(n, INTRO - 10, INTRO));
    ctx.globalAlpha = a;
    if (crest) { const s = 70; ctx.drawImage(crest, W / 2 - s * .45, H * .3 - s, s * .9, s); }
    const lw = W * .5 * ease(seg(n, 6, 30));
    ctx.fillStyle = C.gold; ctx.fillRect(W / 2 - lw / 2, H * .5 + 10, lw, 3);
    texReveal('NUEVOS', W / 2, H * .5 - 150, 190, 900, C.white, seg(n, 12, 34), { align: 'center' });
    texReveal('FICHAJES', W / 2, H * .5 - 6, 190, 900, C.gold, seg(n, 18, 40), { align: 'center' });
    texto('TOP SECRET FC · TEMPORADA 4', W / 2, H * .5 + 80, 30, 700, C.mid, { spacing: 8, align: 'center', alpha: seg(n, 28, 44) });
    ctx.globalAlpha = 1;
  }

  async function momento(i, t) {
    const it = items[i];
    fondo();
    // Imagen a pantalla completa: brazos cruzados (acercamiento suave) → destello → pose (de cerca a cuerpo entero)
    let im, zoom;
    if (t < SWAP) { im = await cuadroClip('brazos', it.key, Math.round(15 + 70 * seg(t, 0, SWAP))); zoom = 1; }
    else { im = await cuadroClip('gesto', it.key, Math.round(NF - (NF - 1) * outCubic(seg(t, SWAP, 104)))); zoom = 1.06 - .06 * outCubic(seg(t, SWAP, SWAP + 14)) + .03 * seg(t, 104, MOM); }
    const a = seg(t, 0, 8) * (1 - seg(t, MOM - 8, MOM));
    if (im) {
      ctx.globalAlpha = a;
      const w = W * zoom, h = w * im.height / im.width;
      ctx.drawImage(im, (W - w) / 2, (H - h) * .35, w, h);
      ctx.globalAlpha = 1;
    }
    // destello dorado en el cambio de pose
    const fl = 1 - Math.abs(t - SWAP) / 7;
    if (fl > 0) {
      const g = ctx.createRadialGradient(W / 2, H * .35, 0, W / 2, H * .35, H * .8);
      g.addColorStop(0, `rgba(255,240,200,${.95 * fl})`); g.addColorStop(.45, `rgba(201,168,76,${.55 * fl})`); g.addColorStop(1, `rgba(201,168,76,${.15 * fl})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // sombra abajo para que se lea el nombre (degradé, sin cajas)
    const sg = ctx.createLinearGradient(0, H * .58, 0, H);
    sg.addColorStop(0, 'rgba(10,10,10,0)'); sg.addColorStop(1, `rgba(10,10,10,${.92 * a})`);
    ctx.fillStyle = sg; ctx.fillRect(0, H * .58, W, H * .42);
    // textos
    const ta = 1 - seg(t, MOM - 10, MOM);
    ctx.globalAlpha = ta;
    texto(String(i + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0'), 64, 96, 26, 700, C.mid, { spacing: 6, alpha: seg(t, 4, 16) });
    texto('NUEVO FICHAJE', W - 64, 96, 26, 700, C.gold, { spacing: 6, align: 'right', alpha: seg(t, 4, 16) });
    texReveal(it.num, W - 60, H - 330, 230, 900, C.gold, seg(t, SWAP + 2, SWAP + 20), { align: 'right', stroke: 4 });
    texReveal(it.puesto.toUpperCase(), 64, H - 250, 34, 700, C.gold, seg(t, 10, 26), { spacing: 9 });
    const s = fit(it.key, W - 128, 150, 900);
    texReveal(it.key, 64, H - 110, s, 900, C.white, seg(t, 14, 34));
    const lw = (W - 128) * ease(seg(t, 18, 40));
    ctx.fillStyle = C.gold; ctx.fillRect(64, H - 80, lw, 3);
    ctx.globalAlpha = 1;
  }

  function cierre(o) {
    fondo();
    const a = seg(o, 0, 10);
    ctx.globalAlpha = a;
    texReveal('BIENVENIDOS', W / 2, H * .2, 150, 900, C.white, seg(o, 4, 26), { align: 'center' });
    texto('AL CLUB', W / 2, H * .2 + 64, 34, 700, C.gold, { spacing: 10, align: 'center', alpha: seg(o, 18, 32) });
    ctx.globalAlpha = 1;
    grupo(H * .27, H * .64, i => seg(o, 12 + i * 6, 30 + i * 6));
    ctx.globalAlpha = seg(o, 50, 70);
    texto('#TOPSECRETFC', W / 2, H - 70, 32, 700, C.gold, { spacing: 9, align: 'center' });
    ctx.globalAlpha = 1;
  }

  // Portada (miniatura del video y de la noticia): "NUEVOS FICHAJES" + los fichajes juntos
  function portada() {
    fondo();
    const vertical = H > W;
    if (crest) { const s = vertical ? 64 : 56; ctx.drawImage(crest, W / 2 - s * .45, vertical ? 70 : 60, s * .9, s); }
    const ts = vertical ? 170 : 120, ty = vertical ? 330 : 250;
    texto('NUEVOS', W / 2, ty, ts, 900, C.white, { align: 'center' });
    texto('FICHAJES', W / 2, ty + ts * .92, ts, 900, C.gold, { align: 'center' });
    texto('TOP SECRET FC · TEMPORADA 4', W / 2, ty + ts * .92 + (vertical ? 70 : 54), vertical ? 30 : 24, 700, C.mid, { spacing: 8, align: 'center' });
    const y0 = ty + ts * .92 + (vertical ? 110 : 80);
    grupo(y0, H - y0 - (vertical ? 50 : 30));
  }

  async function preparar() {
    await Promise.all([document.fonts.load(`900 100px ${COND}`), document.fonts.load(`700 30px ${COND}`)]).catch(() => {});
    crest = await img(CREST);
    recortes = await Promise.all(items.map(it => img(`/recorte/${encodeURIComponent(it.key)}.png`)));
    total = INTRO + items.length * MOM + OUTRO;
    return total + PORTADA;
  }

  async function cuadro(nOut, opts = {}) {
    if (nOut < PORTADA) portada();
    else {
      const n = nOut - PORTADA;
      if (n < INTRO) intro(n);
      else if (n < INTRO + items.length * MOM) { const m = n - INTRO; await momento(Math.floor(m / MOM), m % MOM); }
      else cierre(n - INTRO - items.length * MOM);
    }
    return opts.raw ? null : cv.toDataURL('image/jpeg', .9).split(',')[1];
  }

  return { preparar, cuadro, portada: () => { portada(); return cv.toDataURL('image/jpeg', .92).split(',')[1]; } };
}
window.crearFichajes = crearFichajes;
