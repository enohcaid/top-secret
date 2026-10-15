// Modo pausa del overlay (pedido de Juan, 2026-10-15): en los menús, el lobby y la espera entre partidos
// (estado.modo === 'pausa', lo detecta vigia-vivo.mjs) tapa la pantalla con contenido propio que va rotando:
//   charla (dos jugadores con globos de diálogo), entrevista de "TS TV", próximo partido y números de la etapa (hoy, la pretemporada).
// Guion en charlas.json (marcadores {rival}, {hora}, {pj}…, ver _ayuda). Música propia del club bajita de fondo
// (solo la horizontal: el audio de OBS es uno solo para las dos versiones). Usa lo de overlay.js (indice, estado, CLIPS…).
(() => {
  const VERTICAL = document.body.classList.contains('vertical');
  const MUSICA = q.get('musica') || '../../fuentes/stream/musica.json';
  const VOL = 0.10;                                         // bajita: los temas vienen a -14 LUFS; así quedan ~-34 dB, al nivel del partido (medido 2026-10-15)
  const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/rebrand/';
  const MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="#C8A84B" stroke-width="1.6"><rect x="8.5" y="2.5" width="7" height="12" rx="3.5"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7"/></svg>';

  const raiz = document.createElement('div'); raiz.id = 'pausa';
  raiz.innerHTML = `<img class="marca" src="${MEDIA}clean-dorado.webp" alt="">
    <div class="barra"><img src="${MEDIA}badge-metal.webp" alt=""><div><div class="a">TOP SECRET FC</div><div class="b"><i></i>EN VIVO · YA VOLVEMOS</div></div>
      <div class="chip" id="pChip" hidden><div class="k">PRÓXIMO PARTIDO</div><div class="v" id="pChipV"></div></div></div>
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
    const etapa = (t.etapa || 'Pretemporada').toLowerCase();
    return { A, B, etapa: `la ${etapa}`, rival: p?.rival, liga: p?.liga, hora: p?.hora, pj: t.pj, g: t.g, e: t.e, p: t.p, gf: t.gf, gc: t.gc, goleador: t.goleador, golesGoleador: t.golesGoleador };
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
    const d = document.createElement('div'); d.className = 'pj ' + lado;
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
      c.innerHTML = `<div class="k">${(t.etapa || 'Pretemporada').toUpperCase()} · NÚMEROS</div><div class="nums">
        ${[['pj', 'JUGADOS'], ['g', 'GANADOS'], ['e', 'EMPATADOS'], ['p', 'PERDIDOS'], ['gf', 'GOLES A FAVOR'], ['gc', 'EN CONTRA']].map(([k, n]) => `<div><b>${t[k] ?? 0}</b><span>${n}</span></div>`).join('')}</div>
        ${t.goleador ? `<div class="goleador">Goleador: <b>${t.goleador}</b> · ${t.golesGoleador} goles</div>` : ''}`;
    }
    const gt = azar(js);
    escena.replaceChildren(c, pj(gt, clipDe(gt, ['aliento', 'aplaude', 'indicaciones']), VERTICAL ? 'centro' : 'der'));
    escena.classList.add('on');
    await espera(11000);
    return true;
  }

  // Rotación de escenas mientras dure la pausa
  const ORDEN = ['charla', 'entrevista', 'charla', 'proximo', 'charla', 'numeros'];
  let activo = false, paso = 0, corriendo = false;
  async function bucle() {
    if (corriendo) return; corriendo = true;
    while (activo) {
      const tipo = ORDEN[paso++ % ORDEN.length];
      raiz.classList.toggle('con-tarjeta', tipo !== 'charla');
      const hizo = tipo === 'charla' ? await charla() : tipo === 'entrevista' ? await entrevista() : await tarjeta(tipo);
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

  window.pausa = {
    poner(on) {
      if (on === activo) return;
      activo = on; document.body.classList.toggle('en-pausa', on);
      const p = proximo(); const chip = raiz.querySelector('#pChip'); chip.hidden = !p;
      if (p) raiz.querySelector('#pChipV').textContent = `${p.hora} · vs ${p.rival}`;
      if (on) { bucle(); if (!VERTICAL) { if (audio.src && audio.paused) audio.play().then(() => fundir(VOL)).catch(() => {}); else if (!audio.src) tocar(); } }
      else if (!VERTICAL) fundir(0, () => audio.pause());
    },
  };
})();
