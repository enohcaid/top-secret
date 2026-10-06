// ── TOP SECRET FC · Paso "Publicar en redes" de una noticia ─────────────────
// Muestra, antes de publicar, qué sale en cada red (pieza + texto), con una casilla por
// destino y la opción de publicar en todas. Las piezas con título las dibuja
// noticia-redes.js; el pedido va al Worker (/redes-publicar) y la PC del club lo publica
// en el minuto (scripts/publicar-noticia-redes.mjs). Acá se sigue el estado de cada red.
//   TSRedesUI.open(noticia, pin)
(function () {
  const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
  const DESTINOS = [
    { red: 'ig-post', nombre: 'Instagram · post', pieza: 'ig', texto: true },
    { red: 'ig-historia', nombre: 'Instagram · historia', pieza: 'historia' },
    { red: 'fb-post', nombre: 'Facebook · post con link', pieza: 'link', texto: true },
    { red: 'fb-historia', nombre: 'Facebook · historia', pieza: 'historia' },
    { red: 'x', nombre: 'X · post con link', pieza: 'link', texto: true, max: 280 },
  ];
  const ESTADOS = { pendiente: 'En cola · la PC lo toma en el minuto', publicando: 'Publicando…', publicado: 'Publicado', error: 'Error' };
  let n = null, pin = '', piezas = {}, gamertags = [], poll = null, timer = null;

  const css = `
  .rd-ov{position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.82);display:none;overflow-y:auto;padding:32px 16px}
  .rd-ov.open{display:block}
  .rd-box{max-width:1080px;margin:0 auto;background:var(--gray);border-radius:8px;overflow:hidden}
  .rd-head{display:flex;justify-content:space-between;align-items:center;padding:18px 24px;background:var(--black)}
  .rd-head h2{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:1.2rem;letter-spacing:.1em;text-transform:uppercase;color:var(--white,#fff)}
  .rd-head h2 span{color:var(--gold)}
  .rd-x{background:rgba(255,255,255,.1);border:0;color:inherit;width:34px;height:34px;border-radius:50%;cursor:pointer}
  .rd-body{padding:22px 24px}
  .rd-tit{display:flex;gap:12px;align-items:center;margin-bottom:18px;flex-wrap:wrap}
  .rd-tit label{font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:.85rem;color:var(--mid)}
  .rd-tit input{flex:1 1 220px;min-width:0;background:var(--black);color:inherit;border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:9px 12px;font:600 1rem 'Barlow',sans-serif}
  .rd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
  .rd-card{background:var(--black);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:10px}
  .rd-card.off{opacity:.45}
  .rd-card h3{display:flex;gap:8px;align-items:center;font:700 .85rem 'Barlow Condensed',sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
  .rd-card h3 input{accent-color:var(--gold);width:16px;height:16px}
  .rd-prev{border-radius:6px;overflow:hidden;background:#000}
  .rd-prev img{display:block;width:100%;height:100%;object-fit:cover}
  .rd-prev.ig{aspect-ratio:4/5}.rd-prev.historia{aspect-ratio:9/16}
  .rd-link{border:1px solid rgba(255,255,255,.12);border-radius:6px;overflow:hidden}
  .rd-link img{display:block;width:100%;aspect-ratio:1.91/1;object-fit:cover}
  .rd-link div{padding:8px 10px;font:600 .78rem 'Barlow',sans-serif;line-height:1.25}
  .rd-link small{display:block;color:var(--mid);font-weight:500;margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em;font-size:.66rem}
  .rd-card textarea{width:100%;min-height:118px;resize:vertical;background:var(--gray);color:inherit;border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:8px;font:500 .8rem/1.35 'Barlow',sans-serif}
  .rd-nota{font:500 .74rem 'Barlow',sans-serif;color:var(--mid)}
  .rd-nota.mal{color:var(--loss,#e5484d)}
  .rd-est{font:600 .78rem 'Barlow',sans-serif;color:var(--mid)}
  .rd-est.publicado{color:var(--win,#3ecf8e)}.rd-est.error{color:var(--loss,#e5484d)}.rd-est a{color:var(--gold)}
  .rd-foot{display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap;margin-top:20px;align-items:center}
  .rd-foot p{margin-right:auto;font:500 .8rem 'Barlow',sans-serif;color:var(--mid)}
  .rd-btn{border:0;border-radius:6px;padding:11px 18px;font:800 .9rem 'Barlow Condensed',sans-serif;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
  .rd-btn.sec{background:rgba(255,255,255,.08);color:inherit}
  .rd-btn.pri{background:var(--gold);color:var(--black)}
  .rd-btn:disabled{opacity:.4;cursor:default}
  @media (max-width:560px){.rd-ov{padding:0}.rd-box{border-radius:0}.rd-body{padding:16px}.rd-grid{grid-template-columns:1fr 1fr}}
  `;

  function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const link = () => `${WORKER}/og/${n.id}`;

  function ensure() {
    if (document.getElementById('rd-ov')) return;
    document.head.appendChild(el(`<style>${css}</style>`));
    const ov = el(`<div class="rd-ov" id="rd-ov"><div class="rd-box">
      <div class="rd-head"><h2>Publicar en <span>redes</span></h2><button class="rd-x" aria-label="Cerrar">✕</button></div>
      <div class="rd-body">
        <div class="rd-tit"><label for="rd-titulo">Título en la imagen</label><input id="rd-titulo" maxlength="60"></div>
        <div class="rd-grid" id="rd-grid"></div>
        <div class="rd-foot"><p id="rd-msg"></p>
          <button class="rd-btn sec" id="rd-sel">Publicar seleccionadas</button>
          <button class="rd-btn pri" id="rd-todas">Publicar en todas</button></div>
      </div></div></div>`);
    document.body.appendChild(ov);
    ov.querySelector('.rd-x').onclick = close;
    ov.querySelector('#rd-titulo').oninput = () => { clearTimeout(timer); timer = setTimeout(renderPiezas, 350); };
    ov.querySelector('#rd-sel').onclick = () => enviar(false);
    ov.querySelector('#rd-todas').onclick = () => enviar(true);
  }

  function textoInicial(d) {
    const c = n.shareCaptions || {};
    if (d.red === 'ig-post') return `${c.ig || n.shareCaption || n.title}\n\nNota completa en el sitio: link en la bio.`;
    if (d.red === 'fb-post') return c.fb || n.shareCaption || n.title;
    if (d.red === 'x') return c.x || n.title;
    return '';
  }

  function cards() {
    const grid = document.getElementById('rd-grid');
    grid.innerHTML = '';
    for (const d of DESTINOS) {
      const prev = d.pieza === 'link'
        ? `<div class="rd-link"><img src="${esc(n.imagePost || n.image)}" alt=""><div><small>enohcaid.github.io</small>${esc(n.title)}</div></div>`
        : `<div class="rd-prev ${d.pieza}"><img data-pieza="${d.pieza}" alt=""></div>`;
      const card = el(`<div class="rd-card" data-red="${d.red}">
        <h3><input type="checkbox" checked> ${d.nombre}</h3>${prev}
        ${d.texto ? `<textarea></textarea><div class="rd-nota"></div>` : `<div class="rd-nota">Sin texto: la historia es la imagen.</div>`}
        <div class="rd-est"></div></div>`);
      const ta = card.querySelector('textarea');
      if (ta) { ta.value = textoInicial(d); ta.oninput = () => nota(card, d); nota(card, d); }
      card.querySelector('input').onchange = e => card.classList.toggle('off', !e.target.checked);
      grid.appendChild(card);
    }
  }

  function nota(card, d) {
    const ta = card.querySelector('textarea'), nt = card.querySelector('.rd-nota');
    if (d.red === 'x') {
      const largo = ta.value.length + 25;   // X cuenta cualquier link como 23 caracteres (+ salto de línea)
      nt.textContent = `${largo}/280 · el link a la nota se agrega solo`;
      nt.classList.toggle('mal', largo > 280);
    } else if (d.red === 'fb-post') nt.textContent = 'El link a la nota se agrega solo (con su vista previa).';
    else nt.textContent = 'Instagram no permite links en el texto.';
  }

  async function renderPiezas() {
    const titulo = document.getElementById('rd-titulo').value.trim();
    for (const tipo of ['ig', 'historia']) {
      const c = await TSRedes.render(n, tipo, { titulo, gamertags });
      piezas[tipo] = c.toDataURL('image/jpeg', 0.9);
      document.querySelectorAll(`#rd-grid img[data-pieza="${tipo}"]`).forEach(i => { i.src = piezas[tipo]; });
    }
  }

  function setEstado(job) {
    let activo = false;
    for (const d of job.destinos) {
      const card = document.querySelector(`.rd-card[data-red="${d.red}"]`);
      if (!card) continue;
      const e = card.querySelector('.rd-est');
      e.className = 'rd-est ' + d.estado;
      e.innerHTML = esc(ESTADOS[d.estado] || d.estado) + (d.url ? ` · <a href="${esc(d.url)}" target="_blank" rel="noopener">ver</a>` : '') + (d.error ? ` · ${esc(d.error)}` : '');
      if (d.estado === 'pendiente' || d.estado === 'publicando') activo = true;
    }
    return activo;
  }

  async function seguir() {
    clearInterval(poll);
    const t0 = Date.now();
    poll = setInterval(async () => {
      try {
        const { job } = await (await fetch(`${WORKER}/redes-estado?t=${Date.now()}`)).json();
        if (!job || job.id !== n.id) return;
        const activo = setEstado(job);
        const msg = document.getElementById('rd-msg');
        if (!activo) { clearInterval(poll); msg.textContent = 'Listo.'; }
        else if (job.destinos.every(d => d.estado === 'pendiente') && Date.now() - t0 > 150000) {
          msg.textContent = 'La PC todavía no lo tomó: tiene que estar prendida y con sesión iniciada.';
        }
      } catch (e) {}
    }, 4000);
  }

  async function enviar(todas) {
    const cardsEl = [...document.querySelectorAll('.rd-card')];
    if (todas) cardsEl.forEach(c => { c.querySelector('input').checked = true; c.classList.remove('off'); });
    const destinos = cardsEl.filter(c => c.querySelector('input').checked).map(c => {
      const red = c.dataset.red, ta = c.querySelector('textarea');
      let texto = ta ? ta.value.trim() : '';
      if (red === 'x') texto = `${texto}\n${link()}`;
      return { red, texto };
    });
    if (!destinos.length) return alert('Elegí al menos una red.');
    if (destinos.some(d => d.red === 'x' && d.texto.length - link().length + 23 > 280)) return alert('El texto de X es demasiado largo.');
    const lista = destinos.map(d => DESTINOS.find(x => x.red === d.red).nombre).join('\n· ');
    if (!confirm(`Se publica en:\n· ${lista}\n\n¿Confirmás?`)) return;
    const msg = document.getElementById('rd-msg');
    document.getElementById('rd-sel').disabled = document.getElementById('rd-todas').disabled = true;
    msg.textContent = 'Enviando…';
    try {
      if (!piezas.ig || !piezas.historia) await renderPiezas();
      const r = await fetch(`${WORKER}/redes-publicar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + pin },
        body: JSON.stringify({ id: n.id, link: link(), piezas, destinos }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || r.status);
      msg.textContent = 'Pedido enviado.';
      setEstado(j.job);
      seguir();
    } catch (e) {
      msg.textContent = 'No se pudo enviar: ' + e.message;
      document.getElementById('rd-sel').disabled = document.getElementById('rd-todas').disabled = false;
    }
  }

  function close() {
    clearInterval(poll);
    document.getElementById('rd-ov').classList.remove('open');
    document.body.style.overflow = '';
  }

  async function open(noticia, adminPin) {
    if (!adminPin) adminPin = prompt('PIN de administrador');
    if (!adminPin) return;
    n = noticia; pin = adminPin; piezas = {};
    ensure();
    try { gamertags = (await import('./roster.js')).ROSTER_T4.map(p => p.key); } catch (e) { gamertags = []; }
    document.getElementById('rd-titulo').value = TSRedes.tituloCorto(n);
    document.getElementById('rd-msg').textContent = 'Revisá cada pieza y su texto antes de publicar.';
    document.getElementById('rd-sel').disabled = document.getElementById('rd-todas').disabled = false;
    cards();
    document.getElementById('rd-ov').classList.add('open');
    document.body.style.overflow = 'hidden';
    renderPiezas();
    // Si esta noticia ya tiene un pedido en curso o terminado, mostrar su estado.
    try {
      const { job } = await (await fetch(`${WORKER}/redes-estado?t=${Date.now()}`)).json();
      if (job && job.id === n.id && setEstado(job)) seguir();
    } catch (e) {}
  }

  window.TSRedesUI = { open };
})();
