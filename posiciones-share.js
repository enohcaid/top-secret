// ── TOP SECRET FC · Placas de tablas de posiciones para compartir ──────────
// Dibuja en canvas una imagen 1080px de ancho con una tabla (botón "Compartir"
// arriba de cada tabla) o con todas las tablas de la temporada (botón
// "Compartir todas" en la barra de ligas). La vista previa abre en un modal;
// "Enviar por WhatsApp" usa el share nativo con la imagen (celular) y si el
// navegador no comparte archivos, descarga la imagen y abre WhatsApp con el link.
// posiciones.html llama TSPos.register(tableId, data) desde renderTable().
(function () {
  const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
  const MEDIA = WORKER + '/media/';
  const CREST = MEDIA + 'logos/rebrand/clean-dorado.webp';
  const OUR_LOGO = MEDIA + 'logos/rebrand/clean-metal-96.webp';
  const PAGE_URL = 'https://topsecret.ar/posiciones.html';
  const C = { bg: '#0B0A07', ink: '#F2EEE0', dim: 'rgba(242,238,224,.5)', faint: 'rgba(242,238,224,.32)', gold: '#C8A84B', line: 'rgba(242,238,224,.12)', win: '#3ECF8E', loss: '#E0645A' };
  const LEAGUE = {
    vpn:  { name: 'VPN',   color: '#F5C518' },
    vpug: { name: 'VPUG',  color: '#3ECF8E' },
    e11:  { name: '11x11', color: '#4A9EFF' },
  };
  // Desde la T4 la ex-liga 11x11 se llama Espacio Gamer (las tablas T1–T3 siguen como 11x11).
  const lgName = t => (t.league === 'e11' && +t.season.slice(1) >= 4) ? 'Espacio Gamer' : LEAGUE[t.league].name;
  const COND = '"Barlow Condensed", Barlow, sans-serif';
  // W = ancho de la placa: 1080 para tablas; el cuadro de playoffs lo cambia a 1920 mientras dibuja.
  let W = 1080;
  const P = 56;
  const tables = {};        // tableId -> { data, season, league, group }
  const imgCache = {};

  // ── Registro + botones ────────────────────────────────────────────────────
  function parseId(tableId) {
    const m = /^(t\d)-(vpn|vpug|e11)(?:-(g\d))?-table$/.exec(tableId);
    return m && { season: m[1], league: m[2] };
  }
  function groupLabel(wrap) {
    for (let el = wrap.previousElementSibling; el; el = el.previousElementSibling) {
      if (el.classList.contains('table-wrap')) return '';
      if (el.classList.contains('group-header')) return el.textContent.trim();
    }
    return '';
  }
  function register(tableId, data) {
    const id = parseId(tableId);
    const table = document.getElementById(tableId);
    if (!id || !table || !data || !data.length) return;
    const wrap = table.closest('.table-wrap') || table;
    tables[tableId] = { data, ...id, group: groupLabel(wrap) };
    if (!(wrap.previousElementSibling || {}).classList?.contains('pos-share-bar')) {
      const bar = document.createElement('div');
      bar.className = 'pos-share-bar';
      bar.innerHTML = `<button type="button" class="pos-share-btn">${WA_ICON}<span>Compartir tabla</span></button>`;
      bar.querySelector('button').addEventListener('click', () => openModal([tableId]));
      wrap.parentNode.insertBefore(bar, wrap);
    }
    updateAllButton(id.season);
  }
  function seasonTables(season) {
    const box = document.getElementById('s-' + season);
    if (!box) return [];
    return [...box.querySelectorAll('table.standings-table')].map(t => t.id).filter(k => tables[k]);
  }
  function updateAllButton(season) {
    const tabs = document.querySelector('#s-' + season + ' .tabs');
    if (!tabs) return;
    let btn = tabs.querySelector('.pos-share-all');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pos-share-all';
      btn.innerHTML = `${WA_ICON}<span>Compartir todas</span>`;
      btn.addEventListener('click', () => openModal(seasonTables(season)));
      tabs.appendChild(btn);
    }
    btn.hidden = seasonTables(season).length < 2;
  }

  // ── Utilidades de canvas ──────────────────────────────────────────────────
  function loadImg(src) {
    if (!src) return Promise.resolve(null);
    if (imgCache[src]) return imgCache[src];
    const url = src.startsWith(MEDIA) ? src : WORKER + '/img-proxy?url=' + encodeURIComponent(src);
    imgCache[src] = new Promise(res => {
      const img = new Image();
      const t = setTimeout(() => res(null), 8000);
      img.crossOrigin = 'anonymous';
      img.onload = () => { clearTimeout(t); res(img); };
      img.onerror = () => { clearTimeout(t); res(null); };
      img.src = url;
    });
    return imgCache[src];
  }
  async function fontsReady() {
    try {
      await Promise.all(['900 80px', '800 40px', '700 30px', '600 30px'].map(f => document.fonts.load(`${f} "Barlow Condensed"`)));
    } catch (e) {}
  }
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function tracked(ctx, text, x, y, spacing) {
    try { ctx.letterSpacing = spacing + 'px'; } catch (e) {}
    ctx.fillText(text, x, y);
    try { ctx.letterSpacing = '0px'; } catch (e) {}
  }
  function ellipsis(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    return text.trim() + '…';
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function contain(ctx, img, cx, cy, size) {
    const s = size / Math.max(img.width, img.height);
    ctx.drawImage(img, cx - img.width * s / 2, cy - img.height * s / 2, img.width * s, img.height * s);
  }
  function todayART() {
    return new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function isFinal(season) {
    const sub = document.querySelector('#sbtn-' + season + ' .sb-sub');
    return !!sub && /finalizada/i.test(sub.textContent);
  }
  function seasonName(season) { return 'Temporada ' + season.slice(1); }

  // Columnas numéricas (centros), de derecha a izquierda.
  const COLS = [['PJ', 'gp', 616], ['V', 'w', 680], ['E', 'd', 738], ['D', 'l', 796], ['DG', 'gd', 872], ['PTS', 'pts', W - P - 46]];
  const NAME_X = P + 136, NAME_MAX = 616 - 34 - NAME_X;

  function drawColHead(ctx, y, h, color) {
    ctx.font = `700 21px ${COND}`; ctx.textBaseline = 'middle'; ctx.fillStyle = C.faint;
    ctx.textAlign = 'center'; tracked(ctx, '#', P + 30, y + h / 2, 2);
    ctx.textAlign = 'left'; tracked(ctx, 'EQUIPO', NAME_X - 70, y + h / 2, 3);
    ctx.textAlign = 'center';
    COLS.forEach(([lab, , x]) => { ctx.fillStyle = lab === 'PTS' ? color : C.faint; tracked(ctx, lab, x, y + h / 2, 2); });
    ctx.textAlign = 'left';
  }

  async function drawRows(ctx, t, y, rowH) {
    const color = LEAGUE[t.league].color;
    const logos = await Promise.all(t.data.map(r => loadImg(r.us ? OUR_LOGO : r.logo)));
    // Columna de puntos con un velo del color de la liga.
    ctx.fillStyle = rgba(color, 0.07);
    ctx.fillRect(COLS[5][2] - 48, y, 96, rowH * t.data.length);
    t.data.forEach((r, i) => {
      const ry = y + i * rowH, cy = ry + rowH / 2;
      if (r.us) {
        ctx.fillStyle = rgba('#C8A84B', 0.16); ctx.fillRect(P, ry, W - P * 2, rowH);
        ctx.fillStyle = C.gold; ctx.fillRect(P, ry, 6, rowH);
      } else if (i % 2) {
        ctx.fillStyle = 'rgba(242,238,224,.025)'; ctx.fillRect(P, ry, W - P * 2, rowH);
      }
      if (i) { ctx.fillStyle = C.line; ctx.fillRect(P, ry, W - P * 2, 1); }
      const big = Math.round(rowH * 0.42);
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.font = `800 ${big}px ${COND}`;
      ctx.fillStyle = i === 0 ? color : r.us ? C.gold : C.dim;
      ctx.fillText(String(i + 1), P + 30, cy + 1);
      // Escudo (o sigla si no carga).
      const ls = Math.round(rowH * 0.64), lx = P + 92;
      if (logos[i]) contain(ctx, logos[i], lx, cy, ls);
      else {
        ctx.fillStyle = 'rgba(242,238,224,.08)'; ctx.beginPath(); ctx.arc(lx, cy, ls / 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.dim; ctx.font = `800 ${Math.round(ls * 0.32)}px ${COND}`;
        ctx.fillText(String(r.abbr || r.name.slice(0, 3)).toUpperCase().slice(0, 3), lx, cy + 1);
      }
      ctx.textAlign = 'left';
      ctx.font = `${r.us ? 800 : 600} ${Math.round(rowH * 0.4)}px ${COND}`;
      ctx.fillStyle = r.us ? C.gold : C.ink;
      ctx.fillText(ellipsis(ctx, r.us ? r.name.toUpperCase() : r.name, NAME_MAX), NAME_X, cy + 1);
      ctx.textAlign = 'center';
      COLS.forEach(([lab, key, x]) => {
        let v = r[key] ?? 0;
        if (lab === 'PTS') { ctx.font = `900 ${Math.round(rowH * 0.46)}px ${COND}`; ctx.fillStyle = r.us ? C.gold : C.ink; }
        else if (lab === 'DG') { ctx.font = `700 ${Math.round(rowH * 0.36)}px ${COND}`; ctx.fillStyle = v > 0 ? C.win : v < 0 ? C.loss : C.dim; v = (v > 0 ? '+' : '') + v; }
        else { ctx.font = `600 ${Math.round(rowH * 0.36)}px ${COND}`; ctx.fillStyle = r.us ? C.ink : 'rgba(242,238,224,.78)'; }
        ctx.fillText(String(v), x, cy + 1);
      });
      ctx.textAlign = 'left';
    });
    return y + rowH * t.data.length;
  }

  // Cabecera común: escudo + kicker + título grande + subtítulo, estado a la derecha.
  async function drawHeader(ctx, { title, titleColor, sub, season }) {
    const crest = await loadImg(CREST);
    const ch = 132;
    let tx = P;
    if (crest) { const cw = ch * crest.width / crest.height; ctx.drawImage(crest, P, 64, cw, ch); tx = P + cw + 30; }
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.font = `700 24px ${COND}`; ctx.fillStyle = C.gold;
    tracked(ctx, 'TOP SECRET FC · POSICIONES', tx, 92, 5);
    ctx.font = `900 104px ${COND}`; ctx.fillStyle = titleColor;
    try { ctx.letterSpacing = '-2px'; } catch (e) {}
    ctx.fillText(title, tx - 4, 182);
    try { ctx.letterSpacing = '0px'; } catch (e) {}
    const titleW = ctx.measureText(title).width;
    // Estado (final / en juego) + fecha, alineado a la derecha del título.
    const fin = isFinal(season);
    const pill = fin ? 'TABLA FINAL' : 'EN JUEGO';
    ctx.font = `700 22px ${COND}`;
    const pw = ctx.measureText(pill).width + 20 * 2 + 6 * pill.length;
    const px = W - P - pw, py = 66;
    roundRect(ctx, px, py, pw, 40, 20);
    ctx.fillStyle = fin ? 'rgba(242,238,224,.08)' : rgba(C.win, 0.14); ctx.fill();
    ctx.fillStyle = fin ? C.dim : C.win; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    tracked(ctx, pill, px + pw / 2 + 3, py + 21, 3);
    ctx.font = `600 24px ${COND}`; ctx.fillStyle = C.faint; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    if (tx + titleW < px - 20) ctx.fillText(todayART(), W - P, 146);
    ctx.textAlign = 'left';
    ctx.font = `600 32px ${COND}`; ctx.fillStyle = C.dim;
    ctx.fillText(ellipsis(ctx, sub, W - P - tx), tx, 230);
    return 290;
  }
  function drawFooter(ctx, H) {
    const y = H - 92;
    ctx.fillStyle = C.line; ctx.fillRect(P, y, W - P * 2, 2);
    ctx.font = `600 24px ${COND}`; ctx.textBaseline = 'middle'; ctx.fillStyle = C.faint;
    ctx.textAlign = 'left'; tracked(ctx, 'ENOHCAID.GITHUB.IO/TOP-SECRET', P, y + 46, 3);
    ctx.textAlign = 'right'; ctx.fillStyle = C.gold; tracked(ctx, 'TOP SECRET FC', W - P, y + 46, 4);
    ctx.textAlign = 'left';
  }
  function background(ctx, H, color) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.85, 40, 20, W * 0.85, 40, 900);
    g.addColorStop(0, rgba(color, 0.16)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.min(H, 1100));
    const g2 = ctx.createRadialGradient(0, H, 20, 0, H, 700);
    g2.addColorStop(0, 'rgba(200,168,75,.07)'); g2.addColorStop(1, 'rgba(200,168,75,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, H - 800, W, 800);
  }
  function newCanvas(H) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    return [cv, cv.getContext('2d')];
  }

  // Una tabla: 4:5 (1080x1350) si entra; si es larga, la imagen crece.
  async function single(t) {
    await fontsReady();
    const color = LEAGUE[t.league].color;
    const top = 290, colH = 56, foot = 120, n = t.data.length;
    const rowH = Math.max(56, Math.min(96, Math.floor((1350 - top - colH - foot) / n)));
    const H = Math.max(1350, top + colH + rowH * n + foot);
    const [cv, ctx] = newCanvas(H);
    background(ctx, H, color);
    await drawHeader(ctx, { title: lgName(t), titleColor: color, sub: [seasonName(t.season), t.group].filter(Boolean).join(' · '), season: t.season });
    // Centra el bloque de la tabla en el espacio disponible.
    const block = colH + rowH * n;
    const y0 = top + Math.max(0, Math.floor((H - foot - top - block) / 2));
    drawColHead(ctx, y0, colH, color);
    await drawRows(ctx, t, y0 + colH, rowH);
    drawFooter(ctx, H);
    return cv;
  }

  // Todas las tablas de la temporada, una debajo de otra.
  async function all(list) {
    await fontsReady();
    const season = list[0].season, rowH = 58, secH = 96, colH = 48, gap = 44, top = 290, foot = 120;
    const H = top + list.reduce((s, t) => s + secH + colH + rowH * t.data.length, 0) + gap * (list.length - 1) + foot + 20;
    const [cv, ctx] = newCanvas(H);
    background(ctx, H, C.gold);
    const leagues = [...new Set(list.map(t => lgName(t)))].join(' · ');
    await drawHeader(ctx, { title: 'POSICIONES', titleColor: C.ink, sub: seasonName(season) + ' · ' + leagues, season });
    let y = top;
    for (const t of list) {
      const color = LEAGUE[t.league].color;
      ctx.fillStyle = color; ctx.fillRect(P, y + 28, 8, 48);
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      ctx.font = `900 58px ${COND}`; ctx.fillStyle = color;
      ctx.fillText(lgName(t), P + 26, y + 74);
      const lw = ctx.measureText(lgName(t)).width;
      if (t.group) {
        ctx.font = `600 30px ${COND}`; ctx.fillStyle = C.dim;
        ctx.fillText(ellipsis(ctx, t.group, W - P * 2 - lw - 50), P + 26 + lw + 22, y + 72);
      }
      y += secH;
      drawColHead(ctx, y, colH, color);
      y = await drawRows(ctx, t, y + colH, rowH) + gap;
    }
    drawFooter(ctx, H);
    return cv;
  }

  // ── Cuadro de playoffs ─────────────────────────────────────────────────────
  // El mismo cuadro del sitio. Hoy solo la Fase Oro (1080px de ancho, como las tablas); si se le
  // pasan dos fases, las dibuja enfrentadas en 1920px. Datos = los de posiciones-playoffs.js
  // (/vpug-playoffs-t4), que llama TSPos.registerBracket().
  const PLATA = '#B9C0CA';
  let bracket = null;   // { fases, season }
  const cortoBr = s => String(s ?? '')
    .replace(/Octavos de final #(\d+)/g, '8vos $1').replace(/Cuartos de final #(\d+)/g, '4tos $1')
    .replace(/Semifinal #(\d+)/g, 'Semi $1').replace(/^Ganador /, 'Gan. ').replace(/(\d+)° Grupo ([A-Z])/g, '$1° $2');
  const esNosBr = t => /top.?secret/i.test(t?.name || '');

  function registerBracket(fases, wrap, season) {
    if (!Array.isArray(fases) || !fases.length || !wrap) return;
    bracket = { fases, season: season || 't4' };
    const grid = wrap.querySelector('.po-grid');
    if (grid && !(grid.previousElementSibling || {}).classList?.contains('pos-share-bar')) {
      const bar = document.createElement('div');
      bar.className = 'pos-share-bar';
      bar.innerHTML = `<button type="button" class="pos-share-btn">${WA_ICON}<span>Compartir cuadro</span></button>`;
      bar.querySelector('button').addEventListener('click', () => openWith(makeBracket));
      grid.parentNode.insertBefore(bar, grid);
    }
  }

  async function drawBracket() {
    await fontsReady();
    const oro = bracket.fases.find(f => !/plata/i.test(f.titulo));
    const plata = bracket.fases.find(f => /plata/i.test(f.titulo));
    const lados = [oro && { f: oro, lado: 'oro', color: C.gold }, plata && { f: plata, lado: 'plata', color: PLATA }].filter(Boolean);
    const cols = lados.flatMap(({ f, lado, color }) => {
      const c = f.rondas.map((r, i) => ({ r, i, n: f.rondas.length, lado, color }));
      return lado === 'plata' ? c.reverse() : c;
    });
    const top = 290, sideH = 70, titH = 54, foot = 120, slot = 118;
    const maxM = Math.max(...cols.map(c => c.r.series.length));
    const areaY = top + sideH + titH + 10, areaH = maxM * slot;
    const H = areaY + areaH + 30 + foot;
    const [cv, ctx] = newCanvas(H);
    background(ctx, H, C.gold);
    await drawHeader(ctx, { title: 'PLAYOFFS', titleColor: C.ink, sub: 'Copa de Pretemporada VPUG · ' + lados.map(l => l.f.titulo.replace(/^playoff\s*/i, '').toLowerCase().replace(/(^|\s)\p{L}/gu, m => m.toUpperCase())).join(' y '), season: bracket.season });

    // Columnas: la primera ronda de cada lado más ancha (como en el sitio)
    const units = cols.map(c => c.i === 0 ? 1.5 : 1), uw = (W - P * 2) / units.reduce((a, b) => a + b, 0);
    let x = P;
    cols.forEach((c, k) => { c.x = x; c.w = units[k] * uw; x += c.w; });
    const gapX = 14;   // margen de la tarjeta dentro de su columna (ahí van las líneas)

    // Títulos de lado y de ronda
    ctx.textBaseline = 'alphabetic';
    lados.forEach(({ f, lado, color }) => {
      const cs = cols.filter(c => c.lado === lado);
      ctx.font = `900 54px ${COND}`; ctx.fillStyle = color;
      const t = f.titulo.replace(/^playoff\s*/i, '').toUpperCase();
      if (lado === 'plata') { ctx.textAlign = 'right'; ctx.fillText(t, cs[0].x + cs.reduce((s, c) => s + c.w, 0) - gapX, top + 48); }
      else { ctx.textAlign = 'left'; ctx.fillText(t, cs[0].x + gapX, top + 48); }
    });
    ctx.font = `800 20px ${COND}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    for (let k = 0; k < cols.length; k++) {
      const c = cols[k], sig = cols[k + 1], y = top + sideH + titH / 2 - 6;
      const juntas = c.i === c.n - 1 && sig && sig.i === sig.n - 1;
      const x0 = c.x + 6, x1 = (juntas ? sig.x + sig.w : c.x + c.w) - 6;
      ctx.fillStyle = juntas ? C.ink : c.color;
      tracked(ctx, juntas ? 'FINALES' : c.r.titulo.toUpperCase(), (x0 + x1) / 2, y, 3);
      ctx.fillStyle = C.line; ctx.fillRect(x0, y + 22, x1 - x0, 2);
      if (juntas) k++;
    }

    // Posición vertical de cada llave: la ronda siguiente queda centrada entre su par
    const cardH = 84, rowH = cardH / 2;
    cols.forEach(c => { const m = c.r.series.length, sh = areaH / m; c.cy = c.r.series.map((_, j) => areaY + sh * j + sh / 2 + 10); });
    const logos = {};
    await Promise.all(cols.flatMap(c => c.r.series.flatMap(s => [s.a, s.b])).map(async t => {
      const src = esNosBr(t) ? OUR_LOGO : t?.logo;
      if (src && !(src in logos)) logos[src] = await loadImg(src);
    }));

    // Líneas
    ctx.lineWidth = 2;
    cols.forEach((c, k) => {
      if (c.i === c.n - 1) return;
      const espejo = c.lado === 'plata';
      const sig = espejo ? cols[k - 1] : cols[k + 1];
      ctx.strokeStyle = rgba(c.color, 0.5);
      const borde = espejo ? c.x + gapX : c.x + c.w - gapX;
      const xm = espejo ? c.x : c.x + c.w;
      const entra = espejo ? sig.x + sig.w - gapX : sig.x + gapX;
      for (let j = 0; j + 1 < c.cy.length; j += 2) {
        const y1 = c.cy[j], y2 = c.cy[j + 1], yn = sig.cy[j / 2];
        ctx.beginPath();
        ctx.moveTo(borde, y1); ctx.lineTo(xm, y1); ctx.lineTo(xm, y2); ctx.lineTo(borde, y2);
        ctx.moveTo(xm, yn); ctx.lineTo(entra, yn);
        ctx.stroke();
      }
    });
    const fo = cols.find(c => c.lado === 'oro' && c.i === c.n - 1), fp = cols.find(c => c.lado === 'plata' && c.i === c.n - 1);
    if (fo && fp) {
      const g = ctx.createLinearGradient(fo.x + fo.w - gapX, 0, fp.x + gapX, 0);
      g.addColorStop(0, rgba(C.gold, 0.7)); g.addColorStop(1, rgba(PLATA, 0.7));
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(fo.x + fo.w - gapX, fo.cy[0]); ctx.lineTo(fp.x + gapX, fp.cy[0]); ctx.stroke();
    }

    // Tarjetas
    cols.forEach(c => {
      const espejo = c.lado === 'plata', final = c.i === c.n - 1;
      const cx = c.x + gapX, cw = c.w - gapX * 2;
      c.r.series.forEach((s, j) => {
        const y = c.cy[j] - cardH / 2;
        const nos = esNosBr(s.a) || esNosBr(s.b);
        roundRect(ctx, cx, y, cw, cardH, 10);
        ctx.fillStyle = nos ? rgba(C.gold, 0.14) : 'rgba(242,238,224,.045)'; ctx.fill();
        ctx.strokeStyle = nos ? rgba(C.gold, 0.8) : final ? rgba(c.color, 0.6) : C.line; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = C.line; ctx.fillRect(cx + 1, y + rowH, cw - 2, 1);
        // Rótulo arriba de la tarjeta
        const n = (s.nombre.match(/#(\d+)/) || [])[1] || '';
        const glob = s.global ? ` · GLOBAL ${s.global[0]}-${s.global[1]}` : '';
        const tag = (final ? (espejo ? 'FINAL PLATA' : 'FINAL ORO') : `LLAVE ${n} · ${cortoBr(s.cupo)}`) + glob;
        ctx.font = `700 15px ${COND}`; ctx.fillStyle = C.faint; ctx.textBaseline = 'alphabetic';
        ctx.textAlign = espejo ? 'right' : 'left';
        tracked(ctx, ellipsis(ctx, tag.toUpperCase(), cw - 4), espejo ? cx + cw - 2 : cx + 2, y - 7, 1);
        // Filas: escudo, nombre, ida, vuelta (espejado en Plata)
        const filas = [[s.a, s.ida?.[0], s.vuelta?.[1], s.ganador === 'a' ? 'gana' : s.ganador === 'b' ? 'queda' : ''],
                       [s.b, s.ida?.[1], s.vuelta?.[0], s.ganador === 'b' ? 'gana' : s.ganador === 'a' ? 'queda' : '']];
        filas.forEach(([t, ida, vta, est], f) => {
          const ry = y + rowH * f + rowH / 2;
          const pend = !t?.logo && /^Ganador /.test(t?.name || '');
          const us = esNosBr(t);
          ctx.globalAlpha = est === 'queda' ? 0.4 : 1;
          const lx = espejo ? cx + cw - 22 : cx + 22;
          const img = logos[us ? OUR_LOGO : t?.logo];
          if (img) contain(ctx, img, lx, ry, 26);
          else { ctx.fillStyle = 'rgba(242,238,224,.08)'; roundRect(ctx, lx - 13, ry - 13, 26, 26, 5); ctx.fill(); }
          const gx1 = espejo ? cx + 20 : cx + cw - 50, gx2 = espejo ? cx + 50 : cx + cw - 20;
          ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
          ctx.font = `800 24px ${COND}`; ctx.fillStyle = C.ink;
          ctx.fillText(ida ?? '–', gx1, ry + 1); ctx.fillText(vta ?? '–', gx2, ry + 1);
          ctx.font = `${est === 'gana' || us ? 800 : pend ? 500 : 600} ${pend ? 17 : 20}px ${COND}`;
          ctx.fillStyle = us ? C.gold : pend ? C.faint : C.ink;
          const nx = espejo ? cx + cw - 44 : cx + 44, nmax = cw - 44 - 64;
          ctx.textAlign = espejo ? 'right' : 'left';
          // Pendiente: solo "8vos 1" (el rótulo de la llave ya dice de dónde sale)
          const txt = pend ? cortoBr(t.name).replace(/^Gan\. /, '') : cortoBr(t?.name || 'A definir');
          ctx.fillText(ellipsis(ctx, txt, nmax), nx, ry + 1);
          ctx.globalAlpha = 1;
        });
      });
    });
    drawFooter(ctx, H);
    return cv;
  }

  async function makeBracket() {
    const prevW = W;
    W = bracket.fases.length > 1 ? 1920 : 1080;   // un solo cuadro (Fase Oro) entra en el ancho de las placas
    try {
      const cv = await drawBracket();
      return { cv, name: 'top-secret-playoffs-copa-de-pretemporada-vpug.png', text: `Playoffs · Copa de Pretemporada VPUG — Top Secret FC\n${PAGE_URL}` };
    } finally { W = prevW; }
  }

  // ── Modal de vista previa + compartir ─────────────────────────────────────
  const WA_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';
  let modal, current = null;   // { blob, name, text }

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'pos-share-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="psm-card" role="dialog" aria-modal="true" aria-label="Compartir tabla de posiciones">
        <button type="button" class="psm-close" aria-label="Cerrar">&times;</button>
        <div class="psm-title">Compartir posiciones</div>
        <div class="psm-preview"><div class="psm-loading">Armando la imagen…</div><img alt="Vista previa de la tabla"></div>
        <div class="psm-actions">
          <button type="button" class="psm-wa" disabled>${WA_ICON}<span>Enviar por WhatsApp</span></button>
          <button type="button" class="psm-dl" disabled>Descargar imagen</button>
        </div>
        <p class="psm-note" hidden></p>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    modal.querySelector('.psm-close').addEventListener('click', closeModal);
    modal.querySelector('.psm-wa').addEventListener('click', shareWhatsApp);
    modal.querySelector('.psm-dl').addEventListener('click', () => current && download(current.blob, current.name));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
    return modal;
  }
  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    const img = modal.querySelector('img');
    if (img.src) URL.revokeObjectURL(img.src);
    img.removeAttribute('src');
    current = null;
  }
  function openModal(ids) {
    const list = ids.map(k => tables[k]).filter(Boolean);
    if (!list.length) return;
    openWith(async () => {
      const cv = list.length === 1 ? await single(list[0]) : await all(list);
      const t = list[0];
      const what = list.length === 1 ? [lgName(t), t.group].filter(Boolean).join(' · ') : seasonName(t.season);
      const slug = list.length === 1 ? `${t.season}-${lgName(t)}${t.group ? '-' + t.group.split(' ').pop() : ''}` : `${t.season}-todas`;
      return {
        cv,
        name: `top-secret-posiciones-${slug}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-') + '.png',
        text: `Tabla de posiciones · ${what} — Top Secret FC\n${PAGE_URL}`,
      };
    });
  }
  // make() arma la placa y devuelve { cv, name, text }
  async function openWith(make) {
    const m = ensureModal();
    const img = m.querySelector('img'), loading = m.querySelector('.psm-loading'), note = m.querySelector('.psm-note');
    m.querySelectorAll('.psm-actions button').forEach(b => { b.disabled = true; });
    note.hidden = true; loading.hidden = false; img.hidden = true;
    m.hidden = false; document.body.style.overflow = 'hidden';
    const token = {};
    current = token;
    try {
      const { cv, name, text } = await make();
      const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
      if (current !== token || !blob) return;
      Object.assign(token, { blob, name, text });
      img.src = URL.createObjectURL(blob);
      img.hidden = false; loading.hidden = true;
      m.querySelectorAll('.psm-actions button').forEach(b => { b.disabled = false; });
    } catch (e) {
      if (current === token) loading.textContent = 'No se pudo armar la imagen. Probá de nuevo.';
    }
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  async function shareWhatsApp() {
    if (!current || !current.blob) return;
    const file = new File([current.blob], current.name, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: current.text }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    // Sin share de archivos (PC): bajamos la imagen y abrimos WhatsApp con el texto.
    download(current.blob, current.name);
    window.open('https://wa.me/?text=' + encodeURIComponent(current.text), '_blank', 'noopener');
    const note = modal.querySelector('.psm-note');
    note.textContent = 'La imagen se descargó: adjuntala en el chat de WhatsApp que se abrió.';
    note.hidden = false;
  }

  window.TSPos = { register, registerBracket };
})();
