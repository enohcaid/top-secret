// Plan de juego: caja fuerte con combinación + diagramas tácticos dibujados en SVG.
(function () {
  const CODE = '9075';
  const KEY = 'ts_plan_open';
  const $ = id => document.getElementById(id);

  /* ══════════ CAJA FUERTE ══════════ */
  const vault = $('vault'), dial = $('vDial'), stage = $('vStage'), msg = $('vMsg');
  const lights = [...$('vLights').children];
  let entered = '', angle = 0, busy = false;

  // Números y marcas del dial
  (function drawTicks() {
    const svg = $('vTicks'); let h = '';
    for (let i = 0; i < 50; i++) {
      const a = i * 7.2 * Math.PI / 180, long = i % 5 === 0;
      const r1 = 46, r2 = long ? 41 : 43.5;
      h += `<line x1="${50 + r1 * Math.sin(a)}" y1="${50 - r1 * Math.cos(a)}" x2="${50 + r2 * Math.sin(a)}" y2="${50 - r2 * Math.cos(a)}" stroke="#C8A84B" stroke-width="${long ? .9 : .5}" stroke-linecap="round"/>`;
    }
    for (let d = 0; d < 10; d++) {
      const a = d * 36 * Math.PI / 180;
      h += `<text x="${50 + 35 * Math.sin(a)}" y="${50 - 35 * Math.cos(a)}" transform="rotate(${d * 36} ${50 + 35 * Math.sin(a)} ${50 - 35 * Math.cos(a)})">${d}</text>`;
    }
    svg.innerHTML = h;
  })();

  function turnTo(digit, extraTurns) {
    // Gira alternando el sentido, como una combinación real, y deja el dígito bajo la marca
    const dir = entered.length % 2 ? -1 : 1;
    const target = -digit * 36;
    let next = Math.round(angle / 360) * 360 + target;
    if (dir > 0 && next <= angle) next += 360;
    if (dir < 0 && next >= angle) next -= 360;
    angle = next + dir * 360 * (extraTurns || 0);
    dial.style.transform = `rotate(${angle}deg)`;
  }

  function setLights(n, cls) {
    lights.forEach((l, i) => { l.className = 'v-light' + (cls ? ' ' + cls : i < n ? ' on' : ''); });
  }

  function press(d) {
    if (busy || entered.length >= 4) return;
    turnTo(+d);
    entered += d;
    setLights(entered.length);
    msg.className = 'v-msg'; msg.textContent = entered.length < 4 ? `Dígito ${entered.length} de 4` : 'Verificando…';
    if (entered.length === 4) { busy = true; setTimeout(check, 650); }
  }
  function back() {
    if (busy || !entered.length) return;
    entered = entered.slice(0, -1);
    setLights(entered.length);
    msg.textContent = entered.length ? `Dígito ${entered.length} de 4` : 'Cuatro dígitos';
  }

  function check() {
    if (entered === CODE) {
      setLights(4, 'good');
      msg.textContent = 'Acceso concedido';
      angle += 720; dial.style.transition = 'transform 1s cubic-bezier(.5,0,.2,1)'; dial.style.transform = `rotate(${angle}deg)`;
      setTimeout(open, 700);
    } else {
      setLights(4, 'bad');
      msg.className = 'v-msg bad'; msg.textContent = 'Combinación incorrecta';
      stage.classList.remove('v-shake'); void stage.offsetWidth; stage.classList.add('v-shake');
      angle = Math.round(angle / 360) * 360; dial.style.transform = `rotate(${angle}deg)`;
      setTimeout(() => { entered = ''; setLights(0); busy = false; msg.className = 'v-msg'; msg.textContent = 'Cuatro dígitos'; }, 1100);
    }
  }

  function open(instant) {
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
    if (instant) { vault.style.transition = 'none'; vault.querySelector('.v-door').style.transition = 'none'; }
    vault.classList.add('open');
    document.body.classList.remove('locked');
    const plan = $('plan');
    plan.setAttribute('aria-hidden', 'false');
    if (instant) plan.style.transition = 'none';
    requestAnimationFrame(() => plan.classList.add('show'));
  }

  window.lockVault = function () {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    window.scrollTo({ top: 0 });
    entered = ''; busy = false; angle = 0;
    dial.style.transition = ''; dial.style.transform = 'rotate(0deg)';
    vault.style.transition = ''; vault.querySelector('.v-door').style.transition = '';
    setLights(0); msg.className = 'v-msg'; msg.textContent = 'Cuatro dígitos';
    $('plan').classList.remove('show'); $('plan').setAttribute('aria-hidden', 'true');
    vault.classList.remove('open');
    document.body.classList.add('locked');
  };

  const pad = $('vPad');
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].forEach(k => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'v-key' + (/\d/.test(k) ? '' : ' fn'); b.textContent = k;
    b.setAttribute('aria-label', k === '⌫' ? 'Borrar' : k === '✓' ? 'Confirmar' : k);
    b.addEventListener('click', () => k === '⌫' ? back() : k === '✓' ? null : press(k));
    if (k === '✓') b.style.visibility = 'hidden';
    pad.appendChild(b);
  });
  document.addEventListener('keydown', e => {
    if (vault.classList.contains('open')) return;
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') back();
  });
  try { if (sessionStorage.getItem(KEY) === '1') open(true); } catch (e) {}

  /* ══════════ DIAGRAMAS ══════════
     Cancha vertical 100×140, nuestro arco abajo. Tokens: [x, y, etiqueta]. */
  const NS = 'http://www.w3.org/2000/svg';
  const R = 3.1;
  function pitchSVG() {
    let s = `<rect class="grass" x="0" y="0" width="100" height="140" rx="2"/>`;
    for (let i = 0; i < 7; i++) if (i % 2) s += `<rect class="stripe" x="0" y="${i * 20}" width="100" height="20"/>`;
    s += `<rect class="line" x="3" y="3" width="94" height="134"/>
      <line class="line" x1="3" y1="70" x2="97" y2="70"/><circle class="line" cx="50" cy="70" r="9"/>
      <rect class="line" x="22" y="3" width="56" height="22"/><rect class="line" x="37" y="3" width="26" height="8"/>
      <rect class="line" x="22" y="115" width="56" height="22"/><rect class="line" x="37" y="129" width="26" height="8"/>
      <path class="line" d="M41 25 A9 9 0 0 0 59 25"/><path class="line" d="M41 115 A9 9 0 0 1 59 115"/>`;
    return s;
  }
  function tok(x, y, label, cls) {
    return `<g class="tok ${cls}"><circle cx="${x}" cy="${y}" r="${R}"/><text x="${x}" y="${y + .1}">${label}</text></g>`;
  }
  function arrow(a, b, cls) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d, pad = R + .8;
    const x1 = a[0] + ux * pad, y1 = a[1] + uy * pad, x2 = b[0] - ux * pad, y2 = b[1] - uy * pad;
    const mx = (x1 + x2) / 2 - uy * d * .08, my = (y1 + y2) / 2 + ux * d * .08; // leve curva
    const marker = cls === 'mark' ? 'url(#hdR)' : 'url(#hd)';
    return `<path class="arrow draw ${cls || ''}" d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" marker-end="${marker}"/>`;
  }
  function zone(x, y, w, h, label, red) {
    return `<rect class="zone${red ? ' red' : ''}" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>` + (label ? `<text class="zlabel" x="${x + 1.2}" y="${y + 3}">${label}</text>` : '');
  }
  const DEFS = `<defs>
    <marker id="hd" viewBox="0 0 6 6" refX="4.5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L6 3L0 6z" fill="#E0C979"/></marker>
    <marker id="hdR" viewBox="0 0 6 6" refX="4.5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L6 3L0 6z" fill="#f0918a"/></marker></defs>`;

  // Nuestro 3-5-2 con MCO en su posición base
  const US = { POR: [50, 132], DFCD: [72, 114], LIB: [50, 117], DFCI: [28, 114], CARD: [90, 84], CARI: [10, 84], MCD: [62, 96], MCI: [38, 96], MCO: [50, 74], DCD: [62, 50], DCI: [38, 50] };
  const LBL = { POR: 'POR', DFCD: 'DFC', LIB: 'LÍB', DFCI: 'DFC', CARD: 'CAR', CARI: 'CAR', MCD: 'MC', MCI: 'MC', MCO: 'MCO', DCD: 'DC', DCI: 'DC' };
  const usTokens = (pos, hi) => Object.entries(pos).map(([k, p]) => tok(p[0], p[1], LBL[k], 'us' + (hi && hi.includes(k) ? ' hi' : ''))).join('');
  const themTokens = arr => arr.map(([x, y, l]) => tok(x, y, l, 'them')).join('');

  const DIAGRAMS = {
    base: () => usTokens(US),
    salida: () => {
      const p = { ...US, POR: [50, 133], DFCD: [84, 111], LIB: [50, 120], DFCI: [16, 111], CARD: [92, 60], CARI: [8, 60], MCD: [61, 100], MCI: [39, 100], MCO: [50, 78], DCD: [60, 42], DCI: [40, 42] };
      return zone(34, 70, 32, 18, 'PASILLO DEL MCO') + themTokens([[38, 108, 'DC'], [62, 108, 'DC']]) +
        arrow(p.POR, p.LIB) + arrow(p.LIB, p.DFCD) + arrow(p.DFCD, p.MCO) + arrow(p.DFCD, p.CARD, 'run') + usTokens(p, ['MCO']);
    },
    presion: () => {
      const r = [[50, 8, 'POR'], [36, 22, 'DFC'], [64, 22, 'DFC'], [12, 28, 'LAT'], [88, 28, 'LAT'], [50, 36, '5'], [34, 48, 'MC'], [66, 48, 'MC'], [14, 62, 'EXT'], [86, 62, 'EXT'], [50, 66, 'DC']];
      const p = { POR: [50, 132], DFCD: [70, 92], LIB: [50, 96], DFCI: [30, 92], CARD: [86, 50], CARI: [14, 50], MCD: [64, 62], MCI: [36, 62], MCO: [50, 46], DCD: [58, 32], DCI: [42, 32] };
      return zone(4, 4, 92, 30, 'ZONA DE PRESIÓN', true) + themTokens(r) +
        arrow(p.DCI, [36, 22]) + arrow(p.DCD, [64, 22]) + arrow(p.MCO, [50, 36]) + arrow(p.CARD, [88, 28]) + arrow(p.MCD, [66, 48]) + usTokens(p, ['DCD', 'DCI', 'MCO']);
    },
    ataque: () => {
      const p = { POR: [50, 132], DFCD: [72, 92], LIB: [50, 98], DFCI: [28, 92], CARD: [90, 26], CARI: [10, 36], MCD: [60, 50], MCI: [40, 62], MCO: [50, 38], DCD: [62, 20], DCI: [38, 30] };
      return zone(22, 3, 56, 22, 'ÁREA RIVAL', true) +
        arrow([38, 22], p.DCI, 'run') + arrow(p.DCI, p.MCO) + arrow(p.MCO, [60, 10]) + arrow(p.DCD, [58, 10], 'run') + arrow(p.CARI, [36, 9], 'run') + arrow(p.MCD, [56, 30], 'run') + arrow(p.CARD, [44, 8]) +
        usTokens(p, ['MCO', 'DCD', 'DCI']);
    },
    bloque: () => {
      const p = { POR: [50, 132], DFCD: [70, 112], LIB: [50, 114], DFCI: [30, 112], CARD: [90, 112], CARI: [10, 112], MCD: [68, 92], MCI: [32, 92], MCO: [50, 90], DCD: [60, 64], DCI: [40, 64] };
      return zone(5, 84, 90, 36, 'BLOQUE 5-3') + arrow([90, 72], p.CARD, 'run') + arrow([10, 72], p.CARI, 'run') + arrow([50, 72], p.MCO, 'run') + usTokens(p, ['CARD', 'CARI']);
    },
    cornerDef: () => {
      const p = { POR: [50, 135.5], DFCD: [63, 131], LIB: [50, 130], DFCI: [37, 131], MCD: [58, 120], MCI: [44, 120], CARI: [30, 121], MCO: [56, 106], CARD: [80, 108], DCD: [60, 80], DCI: [40, 80] };
      return zone(29, 126, 42, 11, 'Z1') + zone(24, 115, 42, 10, 'Z2') + zone(48, 100, 42, 12, 'Z3') + zone(30, 73, 40, 13, 'Z4') +
        themTokens([[43.5, 125.2, ''], [56.5, 125.2, ''], [70, 117, ''], [38, 112, ''], [96, 136, '⚑']]) + usTokens(p);
    },
    cornerOf: () => {
      const p = { POR: [50, 132], DFCD: [60, 8], DFCI: [40, 10], LIB: [50, 62], MCD: [62, 52], MCI: [38, 52], MCO: [60, 30], CARI: [34, 22], CARD: [82, 46], DCD: [56, 20], DCI: [46, 22] };
      return zone(22, 3, 56, 22, '') + tok(97, 3, '⚽', 'them') +
        arrow(p.DCD, [54, 9], 'run') + arrow(p.DCI, [46, 8], 'run') + arrow(p.CARI, [38, 7], 'run') + arrow([97, 3], [52, 12]) + usTokens(p, ['DFCD', 'DFCI']);
    },
  };

  /* ══════════ MARCAS POR RIVAL ══════════ */
  const RIVALS = [
    { id: '433', name: '4-3-3 con tapón',
      them: [[50, 8, 'POR'], [36, 24, 'DFC'], [64, 24, 'DFC'], [12, 30, 'LAT'], [88, 30, 'LAT'], [50, 42, '5'], [34, 52, 'MC'], [66, 52, 'MC'], [14, 76, 'EI'], [86, 76, 'ED'], [50, 84, 'DC']],
      us: { POR: [50, 132], DCI: [40, 30], DCD: [60, 30], MCO: [50, 49], MCI: [36, 59], MCD: [64, 59], CARI: [14, 38], CARD: [86, 38], DFCI: [22, 84], DFCD: [78, 84], LIB: [50, 92] },
      marks: [['DCI', 1], ['DCD', 2], ['MCO', 5], ['MCI', 6], ['MCD', 7], ['CARI', 3], ['CARD', 4], ['DFCI', 8], ['DFCD', 9], ['LIB', 10]],
      text: [['DC → DFC', 'Cada delantero sobre un central rival. Tapan el pase interior y fuerzan la salida por la banda.'],
             ['MCO → 5 rival', 'El MCO se pega al pivote: sin pase por el centro, el rival no tiene salida limpia.'],
             ['MC → MC', 'Los dos medios toman a sus pares. Uno por lado, sin cruzarse.'],
             ['CAR → LAT', 'Los carrileros saltan al lateral rival cuando recibe. Es la trampa de la presión.'],
             ['DFC → extremos · LÍB → DC', 'Los centrales abiertos toman a los extremos; el líbero al 9 y cubre la espalda de los dos.']] },
    { id: '433e', name: '4-3-3 con enganche',
      them: [[50, 8, 'POR'], [36, 24, 'DFC'], [64, 24, 'DFC'], [12, 30, 'LAT'], [88, 30, 'LAT'], [34, 44, 'MC'], [66, 44, 'MC'], [50, 60, '10'], [14, 76, 'EI'], [86, 76, 'ED'], [50, 84, 'DC']],
      us: { POR: [50, 132], DCI: [40, 30], DCD: [60, 30], MCO: [40, 51], MCI: [50, 67], MCD: [66, 51], CARI: [14, 38], CARD: [86, 38], DFCI: [22, 84], DFCD: [78, 84], LIB: [50, 92] },
      marks: [['DCI', 1], ['DCD', 2], ['MCO', 5], ['MCD', 6], ['MCI', 7], ['CARI', 3], ['CARD', 4], ['DFCI', 8], ['DFCD', 9], ['LIB', 10]],
      text: [['DC → DFC', 'Igual que contra el tapón: los delanteros presionan a los centrales.'],
             ['MCO y MC → los dos MC', 'Sin pivote rival, el MCO baja un escalón y toma a un medio; el MC del otro lado toma al otro.'],
             ['MC → enganche (10)', 'El otro medio se pega al 10 y no lo deja girar. Es la marca más importante del partido.'],
             ['CAR → LAT', 'Carrileros sobre los laterales rivales.'],
             ['DFC → extremos · LÍB → DC', 'Misma línea de tres atrás: cada uno con el suyo y el líbero cubriendo.']] },
    { id: '352', name: '3-5-2',
      them: [[50, 8, 'POR'], [30, 22, 'DFC'], [50, 18, 'LÍB'], [70, 22, 'DFC'], [10, 44, 'CAR'], [90, 44, 'CAR'], [50, 36, '5'], [36, 50, 'MC'], [64, 50, 'MC'], [40, 80, 'DC'], [60, 80, 'DC']],
      us: { POR: [50, 132], DCI: [32, 28], DCD: [68, 28], MCO: [50, 43], MCI: [38, 57], MCD: [62, 57], CARI: [12, 52], CARD: [88, 52], DFCI: [34, 88], DFCD: [66, 88], LIB: [50, 96] },
      marks: [['DCI', 1], ['DCD', 3], ['MCO', 6], ['MCI', 7], ['MCD', 8], ['CARI', 4], ['CARD', 5], ['DFCI', 9], ['DFCD', 10]],
      text: [['Espejo', 'Mismo dibujo: todos tienen su par. Gana el que gane más duelos individuales.'],
             ['DC → DFC abiertos', 'Los delanteros presionan a los centrales de los costados; el líbero rival queda libre pero sin pase.'],
             ['MCO → 5 · MC → MC', 'El MCO sobre el pivote rival, los medios sobre sus pares.'],
             ['CAR → CAR', 'Duelo de carrileros por banda: el que gana esa carrera gana el partido.'],
             ['DFC → DC · LÍB libre', 'Dos centrales contra dos delanteros; nuestro líbero sobra y cubre.']] },
    { id: '442', name: '4-4-2',
      them: [[50, 8, 'POR'], [38, 22, 'DFC'], [62, 22, 'DFC'], [12, 28, 'LAT'], [88, 28, 'LAT'], [38, 46, 'MC'], [62, 46, 'MC'], [12, 54, 'MI'], [88, 54, 'MD'], [40, 80, 'DC'], [60, 80, 'DC']],
      us: { POR: [50, 132], DCI: [40, 29], DCD: [60, 29], MCO: [50, 40], MCI: [38, 53], MCD: [62, 53], CARI: [12, 62], CARD: [88, 62], DFCI: [36, 88], DFCD: [64, 88], LIB: [50, 96] },
      marks: [['DCI', 1], ['DCD', 2], ['MCI', 5], ['MCD', 6], ['CARI', 7], ['CARD', 8], ['DFCI', 9], ['DFCD', 10]],
      text: [['DC → DFC', 'Presión a los centrales. Si la pelota va al lateral rival, el DC de ese lado sale en diagonal.'],
             ['MC → MC', 'Nuestros medios sobre sus dos medios centrales.'],
             ['MCO libre', 'Contra dos medios, el MCO sobra: flota, ayuda en la presión y arranca la contra.'],
             ['CAR → volantes externos', 'Los carrileros toman a los volantes por fuera; el lateral rival queda para el DC.'],
             ['DFC → DC · LÍB libre', 'Dos contra dos arriba y el líbero de cobertura.']] },
    { id: '41212', name: '4-1-2-1-2',
      them: [[50, 8, 'POR'], [38, 22, 'DFC'], [62, 22, 'DFC'], [12, 30, 'LAT'], [88, 30, 'LAT'], [50, 36, '5'], [34, 50, 'MC'], [66, 50, 'MC'], [50, 64, '10'], [40, 82, 'DC'], [60, 82, 'DC']],
      us: { POR: [50, 132], DCI: [40, 29], DCD: [60, 29], MCO: [50, 43], MCI: [36, 57], MCD: [64, 57], CARI: [12, 38], CARD: [88, 38], DFCI: [36, 90], DFCD: [64, 90], LIB: [50, 71] },
      marks: [['DCI', 1], ['DCD', 2], ['MCO', 5], ['MCI', 6], ['MCD', 7], ['CARI', 3], ['CARD', 4], ['LIB', 8], ['DFCI', 9], ['DFCD', 10]],
      text: [['DC → DFC · MCO → 5', 'Los delanteros a los centrales y el MCO al pivote: cortamos la salida por el medio.'],
             ['MC → MC', 'Cada medio con su par del rombo.'],
             ['LÍB → enganche (10)', 'El líbero salta a tomar al 10 cuando recibe de espaldas. Es el único día que el líbero sale.'],
             ['CAR → LAT', 'El rombo no tiene ancho: los carrileros pueden subir a los laterales rivales sin miedo.'],
             ['DFC → DC', 'Los dos centrales cierran por dentro sobre los dos delanteros.']] },
  ];

  function rivalSVG(rv) {
    let s = themTokens(rv.them);
    rv.marks.forEach(([k, i]) => { s += arrow(rv.us[k], rv.them[i], 'mark'); });
    return s + usTokens(rv.us);
  }

  function mount(el, inner) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', el.dataset.view || '0 0 100 140');
    svg.setAttribute('role', 'img');
    svg.innerHTML = DEFS + pitchSVG() + inner;
    el.innerHTML = ''; el.appendChild(svg);
    svg.querySelectorAll('.draw').forEach(p => p.style.setProperty('--len', Math.ceil(p.getTotalLength() + 2)));
  }

  document.querySelectorAll('[data-diagram]').forEach(el => mount(el, DIAGRAMS[el.dataset.diagram]()));

  const tabs = $('rivals'), panels = $('rivalPanels');
  RIVALS.forEach((rv, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rv' + (i ? '' : ' on'); b.textContent = 'vs ' + rv.name;
    b.addEventListener('click', () => {
      tabs.querySelectorAll('.rv').forEach(x => x.classList.toggle('on', x === b));
      panels.querySelectorAll('.rv-panel').forEach(p => p.classList.toggle('on', p.dataset.id === rv.id));
      const pan = panels.querySelector(`[data-id="${rv.id}"]`);
      pan.classList.remove('in'); void pan.offsetWidth; pan.classList.add('in');
    });
    tabs.appendChild(b);
    const pan = document.createElement('div');
    pan.className = 'rv-panel split reveal' + (i ? '' : ' on');
    pan.dataset.id = rv.id;
    pan.innerHTML = `<div><div class="pitch"></div><div class="legend"><span class="l-us">Top Secret</span><span class="l-them">Rival ${rv.name}</span></div></div>
      <div class="points">${rv.text.map(([t, d], j) => `<div class="point"><b><i>0${j + 1}</i>${t}</b><p>${d}</p></div>`).join('')}</div>`;
    panels.appendChild(pan);
    mount(pan.querySelector('.pitch'), rivalSVG(rv));
  });

  /* ══════════ APARICIÓN AL BAJAR ══════════ */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();
