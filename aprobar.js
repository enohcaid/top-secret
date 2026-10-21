// aprobar.html — la única página de aprobación del club (pedido de Juan, 2026-10-09).
// Lee los lotes del Worker (/aprobaciones, con PIN) y los reparte en tres pestañas por estado (para aprobar,
// programadas, publicadas); cada lote es una fila horizontal de tarjetas con su vista previa real. Aprobar, descartar o corregir el texto se guarda al toque (/aprobaciones/decidir);
// la PC publica lo aprobado a la hora del lote y el estado de cada pieza se ve acá mismo.
(() => {
  const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
  const REDES = {
    sitio:     { nombre: 'Sitio web', color: '#C8A84B' },
    instagram: { nombre: 'Instagram', color: '#E1306C' },
    facebook:  { nombre: 'Facebook',  color: '#1877F2' },
    x:         { nombre: 'X',         color: '#F2EEE0' },
    tiktok:    { nombre: 'TikTok',    color: '#25F4EE' },
    youtube:   { nombre: 'YouTube',   color: '#FF0033' },
  };
  // Límites de texto por red (los usa el contador; X cuenta el link como 23).
  const LIMITE = { sitio: 20000, instagram: 2200, facebook: 5000, x: 280, tiktok: 2200, youtube: 5000 };
  const ESTADO = { pendiente: 'Pendiente', aprobada: 'Aprobada', descartada: 'Descartada', publicando: 'Publicando…', publicado: 'Publicada', error: 'Error' };

  let pin = '';
  try { pin = sessionStorage.getItem('ts_pin') || ''; } catch {}
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function aviso(t) {
    const a = $('#aviso'); a.textContent = t; a.classList.add('ver');
    clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove('ver'), 2200);
  }

  async function api(ruta, body) {
    const r = await fetch(WORKER + ruta, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + pin, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 401) { pedirPin(); throw new Error('PIN incorrecto'); }
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Error ' + r.status);
    return j;
  }

  function pedirPin() {
    try { sessionStorage.removeItem('ts_pin'); } catch {}
    $('#lotes').innerHTML = '';
    $('#pin').style.display = 'block';
    $('#pin-in').focus();
  }
  $('#pin-ok').onclick = () => {
    pin = $('#pin-in').value.trim();
    if (!pin) return;
    try { sessionStorage.setItem('ts_pin', pin); } catch {}
    $('#pin').style.display = 'none';
    cargar(true);
  };
  $('#pin-in').addEventListener('keydown', e => { if (e.key === 'Enter') $('#pin-ok').click(); });

  const fechaHora = iso => new Date(iso).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  function medio(p) {
    const m = p.media || [];
    if (!m.length) return '';
    const uno = x => x.tipo === 'video'
      ? `<video src="${esc(x.url)}" controls playsinline preload="metadata" ${(x.poster || p.portada?.url) ? `poster="${esc(x.poster || p.portada.url)}"` : ''}></video>`
      : `<img src="${esc(x.url)}" alt="" loading="lazy">`;
    const vertical = m.some(x => x.vertical);
    // Portada (regla de Juan 2026-10-21): lo que se ve en la red antes de reproducir; se muestra al lado para aprobarla
    const port = p.portada?.url ? `<figure class="portada"><img src="${esc(p.portada.url)}" alt=""><figcaption>Portada</figcaption></figure>` : '';
    if (m.length === 1) return `<div class="medio${vertical ? ' vertical' : ''}${port ? ' con-portada' : ''}">${uno(m[0])}${port}</div>`;
    return `<div class="medio"><div class="carrusel">${m.map(uno).join('')}</div><span class="contador">${m.length} imágenes · deslizá</span></div>`;
  }

  // Vista previa de una nota del sitio: los mismos bloques que noticias.html (párrafos, {h}, {specs}, {quote}, {img}, {pair}).
  function vistaNoticia(n) {
    const b = x => typeof x === 'string' ? `<p>${x}</p>`
      : x.h ? `<h4>${esc(x.h)}</h4>`
      : x.specs ? `<dl>${x.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`
      : x.quote ? `<blockquote>“${esc(x.quote)}”${x.by ? `<cite>${esc(x.by)}</cite>` : ''}</blockquote>`
      : x.img ? `<figure><img src="${esc(x.img)}" loading="lazy"><figcaption>${esc(x.caption || '')}</figcaption></figure>`
      : x.pair ? `<figure class="par">${x.pair.map(u => `<img src="${esc(u)}" loading="lazy">`).join('')}<figcaption>${esc(x.caption || '')}</figcaption></figure>`
      : '';
    return `<details class="vista"><summary>Ver la nota completa</summary><div class="nota">
      <div class="nota-cat">${esc(n.category || '')} · ${esc(n.dateLabel || n.date || '')}</div>
      <h3>${esc(n.title)}</h3><p class="bajada">${esc(n.excerpt || '')}</p>${(n.body || []).map(b).join('')}</div></details>`;
  }

  function pieza(l, p) {
    const estado = p.estado || p.decision || 'pendiente';
    const cerrada = p.estado === 'publicado' || p.estado === 'publicando';
    const lim = LIMITE[p.red] || 2200;
    return `<article class="pieza ${p.decision || ''}" data-lote="${esc(l.id)}" data-pieza="${esc(p.id)}">
      <div class="pieza-cab">
        <div><div class="formato">${esc(p.formato)}</div><div class="desc">${esc(p.descripcion || '')}</div></div>
        <span class="chip ${estado}">${ESTADO[estado] || estado}</span>
      </div>
      ${medio(p)}
      ${p.titulo !== undefined ? `<div class="texto"><label>Título</label><input class="titulo" ${cerrada ? 'disabled' : ''} value="${esc(p.titulo)}"></div>` : ''}
      ${p.musica ? `<div class="extra"><b>Música:</b> ${esc(p.musica)}</div>` : ''}
      ${p.noticia ? vistaNoticia({ ...p.noticia, title: p.titulo || p.noticia.title }) : ''}
      <div class="texto">
        <label>${esc(p.etiquetaTexto || 'Texto de la publicación')}</label>
        <textarea ${cerrada ? 'disabled' : ''} data-lim="${lim}">${esc(p.texto || '')}</textarea>
        <div class="cuenta"></div>
      </div>
      <ul class="avisos"></ul>
      ${p.url ? `<div class="link"><a href="${esc(p.url)}" target="_blank" rel="noopener">Ver publicación</a></div>` : ''}
      ${p.error ? `<div class="error-txt">${esc(p.error)}</div>` : ''}
      <div class="botones">
        <button class="no" data-accion="descartada" ${cerrada ? 'disabled' : ''}>Descartar</button>
        <button class="si" data-accion="aprobada" ${cerrada || p.decision === 'aprobada' ? 'disabled' : ''}>${p.decision === 'aprobada' ? 'Aprobada' : 'Aprobar'}</button>
      </div>
    </article>`;
  }

  // Estado de la producción automática de una idea aprobada (scripts/social/producir.mjs).
  const hora = iso => new Date(iso).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function produccion(p) {
    const pr = p.produccion;
    if (p.decision !== 'aprobada') return '';
    const txt = !pr ? 'En cola para producirse'
      : pr.estado === 'produciendo' ? `Produciéndose desde ${hora(pr.desde)}`
      : pr.estado === 'esperando' ? `ChatGPT sin cupo: reintenta ${hora(pr.reintentarDesde)}`
      : pr.estado === 'lista' ? 'Producida: está en "Visto bueno final"'
      : pr.estado === 'manual' ? 'Se produce a mano'
      : pr.estado === 'error' ? `No se pudo producir${(pr.reintentos || 0) < 2 ? ` (reintenta ${hora(pr.reintentarDesde)})` : ''}: ${pr.motivo || ''}` : pr.estado;
    return `<div class="prod ${esc(pr?.estado || 'cola')}">${esc(txt)}</div>`;
  }

  // Guion de una pieza viral (etapa 1): se aprueba la IDEA antes de producirla. El texto editable son los
  // comentarios de Juan para ajustarla.
  function guion(l, p) {
    const g = p.guion || {};
    const estado = p.decision || 'pendiente';
    return `<article class="pieza guion ${p.decision || ''}" data-lote="${esc(l.id)}" data-pieza="${esc(p.id)}">
      <div class="pieza-cab">
        <div><div class="cuando">${esc(g.cuando || '')}</div><div class="formato">${esc(p.formato)}</div>
          <div class="redes-chips">${(g.redes || []).map(r => `<span>${esc(r)}</span>`).join('')}</div></div>
        <span class="chip ${estado}">${estado === 'aprobada' ? 'Idea aprobada' : ESTADO[estado] || estado}</span>
      </div>
      ${produccion(p)}
      ${p.media?.length ? medio(p) : ''}
      <div class="g-gancho">${esc(g.gancho || '')}</div>
      ${g.escenas?.length ? `<ol class="g-escenas">${g.escenas.map(e => `<li>${esc(e)}</li>`).join('')}</ol>` : ''}
      ${g.texto ? `<div class="g-bloque"><b>Texto de la publicación</b>${esc(g.texto)}</div>` : ''}
      ${g.porque ? `<div class="g-bloque"><b>Por qué puede funcionar</b>${esc(g.porque)}</div>` : ''}
      ${g.crear ? `<div class="g-bloque"><b>Qué hay que crear</b>${esc(g.crear)}</div>` : ''}
      <div class="texto"><label>Tus comentarios para ajustarla</label><textarea data-lim="2000" placeholder="Opcional: qué cambiarías">${esc(p.texto || '')}</textarea><div class="cuenta"></div></div>
      <div class="botones">
        <button class="no" data-accion="descartada">Descartar idea</button>
        <button class="si" data-accion="aprobada" ${p.decision === 'aprobada' ? 'disabled' : ''}>${p.decision === 'aprobada' ? 'Idea aprobada' : 'Aprobar idea'}</button>
      </div>
    </article>`;
  }

  // Cada lote es una cabecera + UNA fila horizontal de tarjetas (antes: una grilla por red, la página se hacía
  // eterna). Los lotes ya decididos arrancan plegados; el usuario puede abrir/cerrar cualquiera y se recuerda.
  const sinDecidir = l => l.piezas.filter(p => !p.decision || p.decision === 'pendiente').length;
  const abiertos = new Set(), cerrados = new Set();
  const plegado = l => cerrados.has(l.id) || (!abiertos.has(l.id) && !sinDecidir(l) && !l.piezas.some(p => p.estado === 'error'));
  function lote(l) {
    const pend = sinDecidir(l), esGuion = l.etapa === 'guion';
    const orden = esGuion ? l.piezas
      : Object.keys(REDES).flatMap(r => l.piezas.filter(p => p.red === r))
          .concat(l.piezas.filter(p => !REDES[p.red]));
    // Lo descartado va al final de la fila, para que lo que importa quede a la vista.
    const fila = [...orden.filter(p => p.decision !== 'descartada'), ...orden.filter(p => p.decision === 'descartada')];
    const celda = p => esGuion ? `<div class="celda">${guion(l, p)}</div>`
      : `<div class="celda"><div class="red-tag"><span class="punto" style="background:${REDES[p.red]?.color || 'var(--mid)'}"></span>${esc(REDES[p.red]?.nombre || p.red)}</div>${pieza(l, p)}</div>`;
    const errores = l.piezas.filter(p => p.estado === 'error').length;
    const aprob = l.piezas.filter(p => p.decision === 'aprobada').length;
    const meta = esGuion
      ? `${esc(l.bajada || '')}${pend ? ` · ${pend} idea${pend > 1 ? 's' : ''} sin decidir` : ` · ${aprob} idea${aprob === 1 ? '' : 's'} aprobada${aprob === 1 ? '' : 's'}`}`
      : `${l.publicarA ? 'Sale ' + fechaHora(l.publicarA) : l.simulacro ? 'Simulacro: no se publica' : ''}${pend ? ` · ${pend} pieza${pend > 1 ? 's' : ''} sin decidir` : ` · ${aprob} aprobada${aprob === 1 ? '' : 's'}`}${errores ? ` · <b class="mal">${errores} con error</b>` : ''}`;
    const cerrado = plegado(l);
    return `<section class="lote${cerrado ? ' cerrado' : ''}" data-lote="${esc(l.id)}">
      <div class="lote-cab">
        <div><h2>${esc(l.titulo)}</h2><div class="meta">${meta}</div></div>
        <div class="acciones">
          ${pend ? `<button class="si" data-todo="aprobada">${esGuion ? 'Aprobar todas las ideas' : 'Aprobar todo lo pendiente'}</button>` : ''}
          <button class="plegar" data-plegar>${cerrado ? `Ver ${fila.length} ${esGuion ? 'ideas' : 'piezas'}` : 'Ocultar'}</button>
        </div>
      </div>
      <div class="fila">${fila.map(celda).join('')}</div>
    </section>`;
  }

  let lotes = [], ultimo = '';
  async function cargar(forzar = false) {
    if (!pin) return pedirPin();
    let nuevos;
    try {
      nuevos = (await api('/aprobaciones')).lotes;
    } catch (e) { if (pin) aviso(e.message); return; }
    // El refresco automático solo redibuja si algo cambió de verdad, y nunca mientras se está editando un texto
    // o reproduciendo un video (redibujar cortaba la reproducción).
    const firma = JSON.stringify(nuevos);
    if (!forzar && firma === ultimo) return;
    if (!forzar && ['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName)) return;
    if (!forzar && [...document.querySelectorAll('video')].some(v => !v.paused && !v.ended)) return;
    lotes = nuevos; ultimo = firma;
    pintar();
  }

  // Tres pestañas por ESTADO (pedido de Juan, 2026-10-12): lo que espera su decisión, lo aprobado que todavía no
  // salió (con su hora) y lo ya publicado. Un lote está "para aprobar" mientras tenga alguna pieza sin decidir.
  const DIA = 86400000;
  // Fin de la semana que cubre un lote de guiones (id viral-guiones-AAAA-MM-DD = lunes): después ya no se muestra.
  const finGuion = l => l.semanaHasta ? Date.parse(l.semanaHasta) + DIA
    : (m => m ? Date.parse(m[1] + 'T00:00:00-03:00') + 7 * DIA : Date.parse(l.creado) + 10 * DIA)(l.id.match(/(\d{4}-\d{2}-\d{2})$/));
  const estadoLote = l => {
    if (sinDecidir(l)) return 'aprobar';
    if (l.etapa === 'guion') return Date.now() < finGuion(l) && l.piezas.some(p => p.decision === 'aprobada') ? 'programadas' : null;
    if (l.piezas.some(p => p.decision === 'aprobada' && p.estado !== 'publicado')) return 'programadas';
    return Date.now() - Date.parse(l.publicarA || l.creado) < 7 * DIA ? 'publicadas' : null;
  };
  const PESTANAS = [
    { id: 'aprobar', nombre: 'Para aprobar' },
    { id: 'programadas', nombre: 'Programadas' },
    { id: 'publicadas', nombre: 'Publicadas' },
  ];
  let pestana = (() => { try { return localStorage.getItem('ts_aprobar_tab2') || 'aprobar'; } catch { return 'aprobar'; } })();
  const cuando = l => Date.parse(l.publicarA || l.creado);
  function bloque(titulo, sub, ls, vacio) {
    return `<h2 class="seccion">${titulo}</h2>${sub ? `<p class="seccion-sub">${sub}</p>` : ''}${ls.length ? ls.map(lote).join('') : `<div class="vacio">${vacio}</div>`}`;
  }
  function pintar() {
    const por = { aprobar: [], programadas: [], publicadas: [] };
    lotes.forEach(l => { const e = estadoLote(l); if (e) por[e].push(l); });
    if (!PESTANAS.some(x => x.id === pestana)) pestana = 'aprobar';
    const badge = { aprobar: por.aprobar.reduce((s, l) => s + sinDecidir(l), 0), programadas: por.programadas.filter(l => l.etapa !== 'guion').length, publicadas: 0 };
    const tabs = `<nav class="tabs">${PESTANAS.map(x => `<button class="tab ${x.id === pestana ? 'on' : ''}" data-tab="${x.id}">${x.nombre}${badge[x.id] ? `<i>${badge[x.id]}</i>` : ''}</button>`).join('')}</nav>`;
    let cuerpo;
    if (pestana === 'aprobar') {
      const g = por.aprobar.filter(l => l.etapa === 'guion'), resto = por.aprobar.filter(l => l.etapa !== 'guion').sort((a, b) => cuando(a) - cuando(b));
      cuerpo = (g.length ? bloque('Ideas para la próxima semana', 'Primero se aprueba la idea; después se produce y vuelve acá para el visto bueno final.', g, '') : '')
        + bloque('Visto bueno final', 'Piezas ya producidas: revisalas, corregí el texto si hace falta y aprobalas.', resto, g.length ? 'No hay piezas producidas esperando.' : 'Nada para aprobar por ahora.');
    } else if (pestana === 'programadas') {
      const listas = por.programadas.filter(l => l.etapa !== 'guion').sort((a, b) => cuando(a) - cuando(b));
      const prod = por.programadas.filter(l => l.etapa === 'guion');
      cuerpo = bloque('Por publicarse', 'Aprobado y con hora: sale solo. Hasta que salga, todavía podés corregir el texto o descartarlo.', listas, 'No hay nada programado.')
        + (prod.length ? bloque('Ideas aprobadas, en producción', 'Se están produciendo; cuando estén listas vuelven a "Para aprobar".', prod, '') : '');
    } else {
      cuerpo = bloque('Publicadas', 'Lo que salió en los últimos 7 días.', por.publicadas.sort((a, b) => cuando(b) - cuando(a)), 'Nada publicado en los últimos días.');
    }
    // Redibujar sin perder la posición de cada fila horizontal.
    const scroll = {};
    document.querySelectorAll('.lote').forEach(s => { scroll[s.dataset.lote] = s.querySelector('.fila')?.scrollLeft || 0; });
    $('#lotes').innerHTML = tabs + cuerpo;
    document.querySelectorAll('.lote').forEach(s => { const f = s.querySelector('.fila'); if (f && scroll[s.dataset.lote]) f.scrollLeft = scroll[s.dataset.lote]; });
    document.querySelectorAll('textarea').forEach(contar);
    document.querySelectorAll('.pieza:not(.guion)').forEach(revisar);
  }

  // Revisor de descripciones (revisar-textos.js, el mismo que usa la PC): avisos en vivo bajo el texto.
  let revisor = null;
  import('./revisar-textos.js?v=1').then(m => { revisor = m; document.querySelectorAll('.pieza:not(.guion)').forEach(revisar); }).catch(() => {});
  function revisar(art) {
    const ul = art.querySelector('.avisos');
    const l = lotes.find(x => x.id === art.dataset.lote), p = l?.piezas.find(x => x.id === art.dataset.pieza);
    if (!revisor || !ul || !p || p.estado === 'publicado') return;
    const ti = art.querySelector('input.titulo');
    const r = revisor.revisarPieza({ ...p, texto: art.querySelector('textarea')?.value ?? p.texto, ...(ti ? { titulo: ti.value } : {}) }, l);
    ul.innerHTML = r.map(x => `<li class="${x.nivel}">${esc(x.msg)}</li>`).join('');
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('button[data-tab]');
    if (t) {
      pestana = t.dataset.tab;
      try { localStorage.setItem('ts_aprobar_tab2', pestana); } catch {}
      return pintar();
    }
    const pl = e.target.closest('button[data-plegar]');
    if (pl) {
      const id = pl.closest('.lote').dataset.lote, l = lotes.find(x => x.id === id);
      if (plegado(l)) { cerrados.delete(id); abiertos.add(id); } else { abiertos.delete(id); cerrados.add(id); }
      pintar();
    }
  });

  function contar(t) {
    const c = t.parentElement.querySelector('.cuenta'), lim = Number(t.dataset.lim);
    const n = [...t.value].length;
    c.textContent = `${n} / ${lim}`;
    c.classList.toggle('pasado', n > lim);
  }

  async function decidir(loteId, piezas, cambios) {
    try {
      const { lote: l } = await api('/aprobaciones/decidir', { lote: loteId, piezas, ...cambios });
      lotes = lotes.map(x => x.id === l.id ? l : x);
      // El lote queda abierto donde está (aunque ya esté todo decidido) hasta el próximo cambio de pestaña o recarga.
      if (cambios.decision) { if (!cerrados.has(l.id)) abiertos.add(l.id); pintar(); }
      aviso(cambios.decision ? (cambios.decision === 'aprobada' ? 'Aprobado' : cambios.decision === 'descartada' ? 'Descartado' : 'Guardado') : 'Texto guardado');
    } catch (e) { aviso(e.message); }
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('button[data-accion]');
    if (b) {
      const art = b.closest('.pieza');
      const t = art.querySelector('textarea'), ti = art.querySelector('input.titulo');
      return decidir(art.dataset.lote, [art.dataset.pieza], { decision: b.dataset.accion, texto: t.value, ...(ti ? { titulo: ti.value } : {}) });
    }
    const todo = e.target.closest('button[data-todo]');
    if (todo) {
      const sec = todo.closest('.lote'), l = lotes.find(x => x.id === sec.dataset.lote);
      const ids = l.piezas.filter(p => !p.decision || p.decision === 'pendiente').map(p => p.id);
      if (ids.length) decidir(l.id, ids, { decision: 'aprobada' });
    }
  });
  document.addEventListener('input', e => {
    if (e.target.tagName === 'TEXTAREA') contar(e.target);
    const art = e.target.closest('.pieza:not(.guion)');
    if (art) revisar(art);
  });
  // El texto y el título corregidos se guardan al salir del cuadro.
  document.addEventListener('change', e => {
    const art = e.target.closest('.pieza');
    if (!art) return;
    if (e.target.tagName === 'TEXTAREA') decidir(art.dataset.lote, [art.dataset.pieza], { texto: e.target.value });
    else if (e.target.classList.contains('titulo')) decidir(art.dataset.lote, [art.dataset.pieza], { titulo: e.target.value });
  });

  cargar(true);
  setInterval(cargar, 20000);   // ver el estado de publicación sin recargar
})();
