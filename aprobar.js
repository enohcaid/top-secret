// aprobar.html — la única página de aprobación del club (pedido de Juan, 2026-10-09).
// Lee los lotes pendientes del Worker (/aprobaciones, con PIN) y muestra cada pieza agrupada por red con
// su vista previa real. Aprobar, descartar o corregir el texto se guarda al toque (/aprobaciones/decidir);
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
  const LIMITE = { sitio: 5000, instagram: 2200, facebook: 5000, x: 280, tiktok: 2200, youtube: 5000 };
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
    cargar();
  };
  $('#pin-in').addEventListener('keydown', e => { if (e.key === 'Enter') $('#pin-ok').click(); });

  const fechaHora = iso => new Date(iso).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  function medio(p) {
    const m = p.media || [];
    if (!m.length) return '';
    const uno = x => x.tipo === 'video'
      ? `<video src="${esc(x.url)}" controls playsinline preload="metadata" ${x.poster ? `poster="${esc(x.poster)}"` : ''}></video>`
      : `<img src="${esc(x.url)}" alt="" loading="lazy">`;
    const vertical = m.some(x => x.vertical);
    if (m.length === 1) return `<div class="medio${vertical ? ' vertical' : ''}">${uno(m[0])}</div>`;
    return `<div class="medio"><div class="carrusel">${m.map(uno).join('')}</div><span class="contador">${m.length} imágenes · deslizá</span></div>`;
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
      <div class="texto">
        <label>Texto de la publicación</label>
        <textarea ${cerrada ? 'disabled' : ''} data-lim="${lim}">${esc(p.texto || '')}</textarea>
        <div class="cuenta"></div>
      </div>
      ${p.url ? `<div class="link"><a href="${esc(p.url)}" target="_blank" rel="noopener">Ver publicación</a></div>` : ''}
      ${p.error ? `<div class="error-txt">${esc(p.error)}</div>` : ''}
      <div class="botones">
        <button class="no" data-accion="descartada" ${cerrada ? 'disabled' : ''}>Descartar</button>
        <button class="si" data-accion="aprobada" ${cerrada || p.decision === 'aprobada' ? 'disabled' : ''}>${p.decision === 'aprobada' ? 'Aprobada' : 'Aprobar'}</button>
      </div>
    </article>`;
  }

  function lote(l) {
    const pend = l.piezas.filter(p => !p.decision || p.decision === 'pendiente').length;
    const redes = Object.keys(REDES).filter(r => l.piezas.some(p => p.red === r));
    return `<section class="lote" data-lote="${esc(l.id)}">
      <div class="lote-cab">
        <div><h2>${esc(l.titulo)}</h2>
          <div class="meta">${l.publicarA ? 'Sale ' + fechaHora(l.publicarA) : ''}${pend ? ` · ${pend} pieza${pend > 1 ? 's' : ''} sin decidir` : ' · todo decidido'}</div></div>
        <div class="acciones"><button class="si" data-todo="aprobada" ${pend ? '' : 'disabled'}>Aprobar todo lo pendiente</button></div>
      </div>
      ${redes.map(r => `<div class="red">
        <div class="red-cab"><span class="punto" style="background:${REDES[r].color}"></span><h3>${REDES[r].nombre}</h3></div>
        <div class="piezas">${l.piezas.filter(p => p.red === r).map(p => pieza(l, p)).join('')}</div>
      </div>`).join('')}
    </section>`;
  }

  let lotes = [];
  async function cargar() {
    if (!pin) return pedirPin();
    try {
      lotes = (await api('/aprobaciones')).lotes;
    } catch (e) { if (pin) aviso(e.message); return; }
    // Si el foco está en un texto que se está editando, no redibujar (se perdería lo escrito).
    if (['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName)) return;
    const vivos = lotes.filter(l => l.piezas.some(p => p.estado !== 'publicado' && p.decision !== 'descartada') || Date.now() - Date.parse(l.creado) < 3 * 86400000);
    $('#lotes').innerHTML = vivos.length ? vivos.map(lote).join('') : '<div class="vacio">No hay nada para aprobar por ahora.</div>';
    document.querySelectorAll('textarea').forEach(contar);
  }

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
      const sec = document.querySelector(`.lote[data-lote="${CSS.escape(l.id)}"]`);
      if (sec && cambios.decision) { sec.outerHTML = lote(l); document.querySelectorAll('textarea').forEach(contar); }
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
  document.addEventListener('input', e => { if (e.target.tagName === 'TEXTAREA') contar(e.target); });
  // El texto y el título corregidos se guardan al salir del cuadro.
  document.addEventListener('change', e => {
    const art = e.target.closest('.pieza');
    if (!art) return;
    if (e.target.tagName === 'TEXTAREA') decidir(art.dataset.lote, [art.dataset.pieza], { texto: e.target.value });
    else if (e.target.classList.contains('titulo')) decidir(art.dataset.lote, [art.dataset.pieza], { titulo: e.target.value });
  });

  cargar();
  setInterval(cargar, 20000);   // ver el estado de publicación sin recargar
})();
