// Modo pausa del overlay (pedido de Juan, 2026-10-15): en los menús, el lobby y la espera entre partidos
// (estado.modo === 'pausa', lo detecta vigia-vivo.mjs) tapa la pantalla con contenido propio que va rotando:
//   charla (dos jugadores con globos de diálogo), entrevista de "TS TV", próximo partido y números de la etapa (hoy, la pretemporada).
// Guion en charlas.json (marcadores {rival}, {hora}, {pj}…, ver _ayuda). Música propia del club bajita de fondo
// (solo la horizontal: el audio de OBS es uno solo para las dos versiones). Usa lo de overlay.js (indice, estado, CLIPS…).
// Franja "EN PAUSA · esperando el próximo partido" siempre visible en la pausa (pedido de Juan: que quede claro que esperamos).
// window.victoria.mostrar({ marcador, rival, escudo, torneo }): pantalla completa de VICTORIA con el resultado que tapa
// el reporte al terminar un partido ganado (~15 s, antes de la pausa; pedido de Juan 2026-10-15).
(() => {
  const VERTICAL = document.body.classList.contains('vertical');
  const MUSICA = q.get('musica') || '../../fuentes/stream/musica.json';
  const VOL = 0.10;                                         // bajita: los temas vienen a -14 LUFS; así quedan ~-34 dB, al nivel del partido (medido 2026-10-15)
  const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/rebrand/';
  const MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="#C8A84B" stroke-width="1.6"><rect x="8.5" y="2.5" width="7" height="12" rx="3.5"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7"/></svg>';

  const raiz = document.createElement('div'); raiz.id = 'pausa';
  raiz.innerHTML = `<img class="marca" src="${MEDIA}clean-dorado.webp" alt="">
    <div class="barra"><img src="${MEDIA}badge-metal.webp" alt=""><div><div class="a">TOP SECRET FC</div><div class="b"><i></i>EN VIVO</div></div>
      <div class="chip" id="pChip" hidden><div class="k">PRÓXIMO PARTIDO</div><div class="v" id="pChipV"></div></div></div>
    <div id="pEspera"><span class="pill"><i></i>EN PAUSA</span><span class="msg" id="pEsperaMsg">ESPERANDO EL PRÓXIMO PARTIDO</span><span class="dots"><b></b><b></b><b></b></span><div class="carga"></div></div>
    <div class="escena" id="pEscena"></div>`;
  document.body.appendChild(raiz);
  const escena = raiz.querySelector('#pEscena');

  let guion = { charlas: [], entrevistas: [] };
  fetch('charlas.json?' + Date.now()).then(r => r.json()).then(j => { guion = j; }).catch(() => {});

  const espera = ms => new Promise(r => setTimeout(r, ms));
  const mezclar = a => a.map(x => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  const proximo = () => (estado.proximos || [])[0] || null;
  const datos = (A, B) => {
    const p = proximo(), t = estado.temporada || {};
    return { A, B, etapa: t.frase || 'la temporada', rival: p?.rival, liga: p?.liga, hora: p?.hora, pj: t.pj, g: t.g, e: t.e, p: t.p, gf: t.gf, gc: t.gc, goleador: t.goleador, golesGoleador: t.golesGoleador };
  };
  const llenar = (txt, d) => txt.replace(/\{(\w+)\}/g, (_, k) => d[k] ?? '');
  const sirve = it => (!it.despues || it.despues === window.ultimoResultado) &&
    (it.requiere || []).every(r => r === 'proximo' ? proximo() : r === 'temporada' ? estado.temporada?.pj : r === 'goleador' ? estado.temporada?.goleador : true);
  // Cada línea/entrevista no se repite hasta que pasaron las demás (como los clips)
  const usado = new Map();
  const elegirDe = lista => { const ok = lista.filter(sirve); if (!ok.length) return null;
    const t = Math.min(...ok.map(x => usado.get(x) || 0)); const it = azar(ok.filter(x => (usado.get(x) || 0) === t)); usado.set(it, Date.now()); return it; };

  // Jugadores con clips; para hablar se prefiere "habla", para escuchar "escucha"
  // Jugadores con clips; si estado.jugadores trae los convocados de hoy (y alguno tiene clips), solo esos
  const jugadores = () => { const todos = Object.keys(indice).filter(gt => indice[gt].emociones.length);
    const conv = todos.filter(gt => (estado.jugadores || []).includes(gt)); return conv.length >= 2 ? conv : todos; };
  const clipDe = (gt, prefs) => { const e = indice[gt].emociones; return prefs.find(x => e.includes(x)) || azar(e.filter(x => ESPERA.includes(x)).length ? e.filter(x => ESPERA.includes(x)) : e); };
  function pj(gt, emocion, lado) {
    // habla/escucha se generan mirando hacia la derecha de la pantalla: el de la derecha (charla) y el del centro
    // (entrevista vertical, la pregunta sale a la izquierda) se espejan para mirar hacia el otro / hacia la pregunta.
    // En la charla el que escucha va siempre a la derecha: nunca queda mirando a un costado vacío.
    const d = document.createElement('div'); d.className = 'pj ' + lado + (lado !== 'izq' && /^(habla|escucha)$/.test(emocion) ? ' espejo' : '');
    d.innerHTML = `<video muted playsinline autoplay loop src="${CLIPS}${encodeURIComponent(gt)}/${emocion}.webm"></video>
      <div class="nombre"><span class="num">${indice[gt].num || ''}</span><span class="gt">${gt}</span></div>`;
    return d;
  }
  async function decir(globo, texto) {                      // globo que aparece y se escribe de a poco
    globo.innerHTML = `<span class="quien">${globo.dataset.quien || ''}</span><span class="txt"></span>`;
    const span = globo.querySelector('.txt'); globo.classList.add('on');
    for (let i = 1; i <= texto.length; i++) { span.textContent = texto.slice(0, i); await espera(26); }
    await espera(1400 + texto.length * 45);
    globo.classList.remove('on'); await espera(300);
  }
  const globo = (clase, quien) => { const g = document.createElement('div'); g.className = 'globo ' + clase; g.dataset.quien = quien; return g; };

  async function charla() {
    const js = mezclar(jugadores()); if (js.length < 2) return false;
    const ch = elegirDe(guion.charlas); if (!ch) return false;
    const [A, B] = js, d = datos(A, B);
    escena.replaceChildren(pj(A, clipDe(A, ['habla', 'indicaciones', 'aliento']), 'izq'), pj(B, clipDe(B, ['escucha', 'aplaude', 'aliento']), 'der'));
    const gA = globo('de-izq', A.toUpperCase()), gB = globo('de-der', B.toUpperCase()); escena.append(gA, gB);
    escena.classList.add('on');
    for (const [quien, txt] of ch.lineas) { if (!activo) return true; await decir(quien === 'A' ? gA : gB, llenar(txt, d)); }
    return true;
  }
  async function entrevista() {
    const js = jugadores(); if (!js.length) return false;
    const en = elegirDe(guion.entrevistas); if (!en) return false;
    const gt = azar(js), d = datos(gt, '');
    const tv = document.createElement('div'); tv.className = 'tv';
    tv.innerHTML = `<div class="logo">${MIC}<b>TS TV</b></div><div class="k">ENTREVISTA · ${gt.toUpperCase()}</div>`;
    const gq = globo('pregunta', 'TS TV'), gr = globo('de-der respuesta', gt.toUpperCase());
    escena.replaceChildren(tv, pj(gt, clipDe(gt, ['habla', 'indicaciones', 'aliento']), VERTICAL ? 'centro' : 'der'), gq, gr);
    escena.classList.add('on');
    await decir(gq, llenar(en.pregunta, d)); if (activo) await decir(gr, llenar(en.respuesta, d));
    return true;
  }
  async function tarjeta(tipo) {
    const js = jugadores(); if (!js.length) return false;
    const p = proximo(), t = estado.temporada;
    const c = document.createElement('div'); c.className = 'tarjeta';
    if (tipo === 'proximo') {
      if (!p) return false;
      c.innerHTML = `${p.escudo ? `<img src="${p.escudo}" alt="">` : ''}<div class="k">PRÓXIMO PARTIDO · ${[p.liga, p.etapa].filter(Boolean).join(' · ').toUpperCase()}</div>
        <div class="t">vs ${p.rival}</div><div class="s">${p.torneo && p.torneo !== p.liga ? p.torneo : ''}</div><div class="hora">${p.hora} HS</div>`;
    } else {
      if (!t?.pj) return false;
      c.innerHTML = `<div class="k">${(t.etapa || 'Temporada').toUpperCase()} · NÚMEROS</div><div class="nums">
        ${[['pj', 'JUGADOS'], ['g', 'GANADOS'], ['e', 'EMPATADOS'], ['p', 'PERDIDOS'], ['gf', 'GOLES A FAVOR'], ['gc', 'EN CONTRA']].map(([k, n]) => `<div><b>${t[k] ?? 0}</b><span>${n}</span></div>`).join('')}</div>
        ${t.goleador ? `<div class="goleador">Goleador: <b>${t.goleador}</b> · ${t.golesGoleador} goles</div>` : ''}`;
    }
    const gt = azar(js);
    escena.replaceChildren(c, pj(gt, clipDe(gt, ['aliento', 'aplaude', 'indicaciones']), VERTICAL ? 'centro' : 'der'));
    escena.classList.add('on');
    await espera(11000);
    return true;
  }

  // ── Repeticiones de nuestros goles de la noche (vigia-vivo.mjs las corta de la grabación; Juan, 2026-10-21) ──
  // Video de 20 s + minuto, marcador y contexto ("Gol agónico en el 91': la victoria en el final"). El goleador sale
  // de EA (Worker /ea-historial, llega ~10 min después del partido) solo si un único jugador hizo nuestros goles.
  const REPES = q.get('repes') || CLIPS.replace(/clips\/?$/, 'repeticiones/');
  const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
  const hoy = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  let ea = { t: 0, partidos: [] };
  async function goleadorDe(r) {
    if (Date.now() - ea.t > 120000) { ea.t = Date.now(); try { const j = await (await fetch(WORKER + '/ea-historial')).json(); ea.partidos = j.partidos || j || []; } catch {} }
    const m = (Array.isArray(ea.partidos) ? ea.partidos : []).find(p => p.calendario?.fecha === hoy() && p.calendario?.rival === r.rival);
    const goleadores = (m?.jugadores || []).filter(j => j.goles > 0);
    return goleadores.length === 1 ? goleadores[0].gamertag : null;
  }
  // Todos los goles de la noche seguidos, en orden (Juan, 2026-10-21: antes pasaba uno por vuelta de la pausa).
  // Hasta 6 para que la escena no se haga eterna: si hay más, los últimos.
  async function repeticion() {
    const lista = (estado.repeticiones || []).filter(r => r.archivo).sort((a, b) => a.id.localeCompare(b.id)).slice(-6);
    if (!lista.length) return false;
    for (const r of lista) {
      if (!activo) break;                                      // salió de la pausa (arrancó el partido): se corta
      await unaRepeticion(r);
    }
    return true;
  }
  async function unaRepeticion(r) {
    const gol = await goleadorDe(r);
    const c = document.createElement('div'); c.className = 'repe';
    c.innerHTML = `<div class="video"><video muted playsinline src="${REPES}${encodeURIComponent(r.archivo)}"></video><span class="sello">REPETICIÓN</span></div>
      <div class="info"><div class="k">${['GOL DE TOP SECRET', r.torneo].filter(Boolean).join(' · ')}</div>
        <div class="t">${r.contexto || 'Gol de Top Secret'}</div>
        <div class="m">${r.minuto > 0 ? `<b>${r.minuto}'</b>` : ''}<span>TOP SECRET ${r.gf}-${r.gc} ${(r.rival || '').toUpperCase()}</span></div>
        ${gol ? `<div class="g">Gol de <b>${gol}</b></div>` : ''}</div>`;
    escena.replaceChildren(c); escena.classList.add('on');
    const v = c.querySelector('video');
    await new Promise(res => { v.onended = res; v.onerror = res; v.play().catch(res); setTimeout(res, 24000); });
    return true;
  }

  // ── Espacio Gamer: tabla de la liga (nosotros resaltados) + nuestros números en la competencia oficial ──
  async function tabla() {
    const eg = estado.eg; if (!eg?.tabla?.length) return false;
    const nos = eg.tabla.find(t => t.nos), N = 10;
    const desde = !nos || nos.pos <= N - 2 ? 0 : Math.min(eg.tabla.length - N, nos.pos - 6);
    const filas = eg.tabla.slice(Math.max(0, desde), Math.max(0, desde) + N);
    const c = document.createElement('div'); c.className = 'tarjeta tabla-eg';
    c.innerHTML = `<div class="k">ESPACIO GAMER · TABLA DE POSICIONES</div>
      <table><tr><th></th><th></th><th>EQUIPO</th><th>PJ</th><th>DG</th><th>PTS</th></tr>
      ${filas.map(t => `<tr${t.nos ? ' class="nos"' : ''}><td>${t.pos}</td><td>${t.nos ? `<img src="${MEDIA}badge-metal.webp" alt="">` : t.escudo ? `<img src="${t.escudo}" alt="">` : ''}</td>
        <td>${t.nombre}</td><td>${t.pj}</td><td>${t.dg > 0 ? '+' + t.dg : t.dg}</td><td><b>${t.pts}</b></td></tr>`).join('')}</table>
      ${eg.pj ? `<div class="pie">Top Secret en Espacio Gamer: <b>${eg.pj} PJ · ${eg.g}G ${eg.e}E ${eg.p}P · ${eg.gf}-${eg.gc}</b>${eg.goleador ? ` · goleador <b>${eg.goleador}</b> (${eg.golesGoleador})` : ''}</div>` : ''}`;
    const js = jugadores(), gt = js.length && !VERTICAL ? azar(js) : null;   // en la vertical la tabla ocupa todo
    escena.replaceChildren(c, ...(gt ? [pj(gt, clipDe(gt, ['aliento', 'aplaude', 'indicaciones']), 'der')] : []));
    escena.classList.add('on');
    await espera(14000);
    return true;
  }

  // ── Cierre de la noche: terminó el último partido (retransmitir.mjs pone estado.cierre) ──
  const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  async function cierre() {
    if (!estado.cierre) return false;
    const noche = estado.noche || [], s = estado.siguiente;
    const RES = { victoria: 'VICTORIA', empate: 'EMPATE', derrota: 'DERROTA' };
    const c = document.createElement('div'); c.className = 'tarjeta cierre';
    c.innerHTML = `<div class="k">FIN DE LA NOCHE</div><div class="t">¡Gracias por acompañarnos!</div>
      <div class="res">${noche.map(r => `<div class="r ${r.resultado}">${r.escudo ? `<img src="${r.escudo}" alt="">` : '<i></i>'}<span>vs ${r.rival || 'rival'}</span><b>${r.marcador}</b><em>${RES[r.resultado] || ''}</em></div>`).join('')}</div>
      ${s ? `<div class="sig"><span>PRÓXIMO PARTIDO</span>${DIAS[new Date(s.fecha + 'T12:00:00').getDay()]} ${s.fecha.slice(8)}/${s.fecha.slice(5, 7)} · ${s.hora} HS · vs ${s.rival}${s.cantidad > 1 ? ` (+${s.cantidad - 1})` : ''}</div>` : ''}`;
    const js = jugadores(), gano = noche.some(r => r.resultado === 'victoria');
    const gt = js.length ? azar(js) : null;
    escena.replaceChildren(c, ...(gt ? [pj(gt, clipDe(gt, gano ? ['festejo', 'aplaude'] : ['aplaude', 'aliento']), VERTICAL ? 'centro' : 'der')] : []));
    escena.classList.add('on');
    await espera(16000);
    return true;
  }

  // Rotación de escenas mientras dure la pausa (escenas sin datos se saltean: sin repeticiones, sin tabla…).
  // Terminada la noche, el cierre manda: resultados + gracias + próximo partido, intercalado con repeticiones y la tabla.
  const ORDEN = ['charla', 'repeticion', 'entrevista', 'tabla', 'charla', 'proximo', 'repeticion', 'numeros'];
  const ORDEN_CIERRE = ['cierre', 'repeticion', 'tabla', 'cierre', 'repeticion', 'charla'];
  let activo = false, paso = 0, corriendo = false;
  async function bucle() {
    if (corriendo) return; corriendo = true;
    while (activo) {
      actualizarFranja();
      const orden = estado.cierre ? ORDEN_CIERRE : ORDEN;
      const tipo = orden[paso++ % orden.length];
      raiz.classList.toggle('con-tarjeta', tipo !== 'charla');
      raiz.classList.toggle('con-repe', tipo === 'repeticion');
      const hizo = tipo === 'charla' ? await charla() : tipo === 'entrevista' ? await entrevista() : tipo === 'repeticion' ? await repeticion()
        : tipo === 'tabla' ? await tabla() : tipo === 'cierre' ? await cierre() : await tarjeta(tipo);
      if (hizo) { escena.classList.remove('on'); await espera(600); } else await espera(300);
      if (!jugadores().length) await espera(3000);
    }
    corriendo = false;
  }

  // Música de fondo (solo la horizontal)
  const audio = new Audio(); let temas = [], nTema = 0, fundido = null;
  if (!VERTICAL) fetch(MUSICA + '?' + Date.now()).then(r => r.json()).then(l => { temas = mezclar(l); }).catch(() => {});
  audio.onended = () => { nTema++; tocar(); };
  function tocar() { if (!temas.length) return; audio.src = temas[nTema % temas.length]; audio.volume = 0; audio.play().then(() => fundir(VOL)).catch(() => {}); }
  function fundir(objetivo, fin) {
    clearInterval(fundido);
    fundido = setInterval(() => { const v = audio.volume + (objetivo > audio.volume ? 0.02 : -0.02);
      if (Math.abs(objetivo - audio.volume) <= 0.02) { audio.volume = objetivo; clearInterval(fundido); fin?.(); } else audio.volume = Math.min(1, Math.max(0, v)); }, 60);
  }

  // ── Pantalla de VICTORIA ──
  const vic = document.createElement('div'); vic.id = 'victoria';
  vic.innerHTML = `<div class="rayos"></div><canvas class="confeti"></canvas>
    <div class="k" id="vK"></div><div class="titulo">VICTORIA</div>
    <div class="marcador"><div class="eq"><img src="${MEDIA}badge-metal.webp" alt=""><span>TOP SECRET</span></div>
      <div class="goles"><b id="vGF"></b><i>–</i><b id="vGC"></b></div>
      <div class="eq"><img id="vEsc" alt=""><span id="vRival"></span></div></div>
    <div class="jugador"><video muted playsinline loop></video><div class="nombre"><span class="num" id="vNum"></span><span class="gt" id="vGt"></span></div></div>`;
  document.body.appendChild(vic);
  const lienzo = vic.querySelector('.confeti'); let confeti = null, finVic = null;
  function lluvia() {                                         // papelitos dorados que caen mientras dura la pantalla
    const W = lienzo.width = innerWidth, H = lienzo.height = innerHeight, g = lienzo.getContext('2d');
    const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: -Math.random() * H, v: 120 + Math.random() * 220, r: Math.random() * 6.28, w: 8 + Math.random() * 10, f: Math.random() * 6 }));
    let t0 = performance.now();
    const paso = now => { const dt = (now - t0) / 1000; t0 = now; g.clearRect(0, 0, W, H);
      for (const p of ps) { p.y += p.v * dt; p.r += dt * 4; if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
        g.save(); g.translate(p.x + Math.sin(p.y / 60 + p.f) * 18, p.y); g.rotate(p.r); g.fillStyle = p.f > 3 ? '#F1DC97' : '#C8A84B';
        g.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2 * Math.abs(Math.cos(p.r))); g.restore(); }
      confeti = requestAnimationFrame(paso); };
    cancelAnimationFrame(confeti); confeti = requestAnimationFrame(paso);
  }
  window.victoria = {
    mostrar({ marcador = '', rival = '', escudo = '', torneo = '' } = {}, ms = 15000) {
      const [gf, gc] = String(marcador).split('-');
      vic.querySelector('#vGF').textContent = gf ?? ''; vic.querySelector('#vGC').textContent = gc ?? '';
      vic.querySelector('.goles').hidden = !marcador;
      vic.querySelector('#vRival').textContent = (rival || 'RIVAL').toUpperCase();
      const esc = vic.querySelector('#vEsc'); esc.hidden = !escudo; if (escudo) esc.src = escudo;
      vic.querySelector('#vK').textContent = ['FINAL DEL PARTIDO', torneo].filter(Boolean).join(' · ');
      // un convocado festejando (festejo si hay, si no el grito de gol)
      const js = jugadores().filter(gt => indice[gt].emociones.some(e => ['festejo', 'gol'].includes(e)));
      const jb = vic.querySelector('.jugador'); jb.hidden = !js.length;
      if (js.length) { const gt = azar(js); const e = indice[gt].emociones.includes('festejo') ? 'festejo' : 'gol';
        const v = jb.querySelector('video'); v.src = `${CLIPS}${encodeURIComponent(gt)}/${e}.webm`; v.play().catch(() => {});
        vic.querySelector('#vGt').textContent = gt; vic.querySelector('#vNum').textContent = indice[gt].num || ''; }
      vic.classList.remove('on'); void vic.offsetWidth; vic.classList.add('on'); lluvia();
      clearTimeout(finVic); finVic = setTimeout(() => this.ocultar(), ms);
    },
    ocultar() { vic.classList.remove('on'); setTimeout(() => cancelAnimationFrame(confeti), 800); },
  };

  // Franja y chip de arriba: esperando el próximo partido, o fin de la transmisión cuando ya no quedan
  function actualizarFranja() {
    const p = proximo(), s = estado.siguiente, chip = raiz.querySelector('#pChip');
    if (estado.cierre) {
      chip.hidden = !s;
      if (s) { chip.querySelector('.k').textContent = 'PRÓXIMO PARTIDO'; raiz.querySelector('#pChipV').textContent = `${DIAS[new Date(s.fecha + 'T12:00:00').getDay()]} ${s.hora} · vs ${s.rival}`; }
      raiz.querySelector('#pEsperaMsg').textContent = 'FIN DE LA TRANSMISIÓN · GRACIAS POR VER';
      raiz.classList.add('cerrando');
      return;
    }
    raiz.classList.remove('cerrando');
    chip.hidden = !p;
    if (p) { chip.querySelector('.k').textContent = 'PRÓXIMO PARTIDO'; raiz.querySelector('#pChipV').textContent = `${p.hora} · vs ${p.rival}`; }
    raiz.querySelector('#pEsperaMsg').textContent = estado.sinSenal ? 'SE CORTÓ LA SEÑAL · YA VOLVEMOS'
      : p ? 'ESPERANDO EL PRÓXIMO PARTIDO' : 'YA VOLVEMOS · ESPERANDO QUE ARRANQUE';
  }

  window.pausa = {
    poner(on) {
      if (on === activo) return;
      activo = on; document.body.classList.toggle('en-pausa', on);
      actualizarFranja();
      if (on) { bucle(); if (!VERTICAL) { if (audio.src && audio.paused) audio.play().then(() => fundir(VOL)).catch(() => {}); else if (!audio.src) tocar(); } }
      else if (!VERTICAL) fundir(0, () => audio.pause());
    },
  };
})();
