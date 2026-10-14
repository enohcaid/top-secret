// ─── Posiciones · Playoffs de la Copa de Pretemporada VPUG (T4) ──────────────
// Cuadro de eliminación enfrentado (rondas en columnas, líneas que unen cada par de
// llaves con la siguiente): Fase Oro a la izquierda, Fase Plata espejada a la derecha y
// las dos finales juntas en el medio.
// En vivo desde CopáFácil vía el Worker /vpug-playoffs-t4. Se carga después del script
// inline de posiciones.html (usa WORKER_BASE y OUR_LOGO). Si el Worker falla, se oculta.
(function () {
  const URL_PLAYOFFS = WORKER_BASE + '/vpug-playoffs-t4';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esNos = t => /top.?secret/i.test(t?.name || '');
  const g = v => (v === null || v === undefined) ? '–' : v;
  // "Ganador Octavos de final #1" no entra en la llave → "Ganador 8vos 1"
  const corto = s => String(s ?? '')
    .replace(/Octavos de final #(\d+)/g, '8vos $1').replace(/Cuartos de final #(\d+)/g, '4tos $1')
    .replace(/Semifinal #(\d+)/g, 'Semi $1').replace(/(\d+)° Grupo ([A-Z])/g, '$1° $2');

  function fila(t, ida, vta, estado, espejo) {
    const nos = esNos(t);
    const logo = nos ? OUR_LOGO : t.logo;
    const img = logo
      ? `<img class="br-logo" src="${esc(logo)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
      : '<span class="br-logo br-logo-vacio"></span>';
    // Lugar todavía sin definir ("Ganador 8vos 1"): más corto y en gris
    const pendiente = !t.logo && /^Ganador /.test(t.name || '');
    const nombre = pendiente ? corto(t.name).replace(/^Ganador /, 'Gan. ') : corto(t.name);
    const equipo = `<span class="br-equipo" title="${esc(nombre)}">${esc(nombre)}</span>`;
    const goles = `<span class="br-gol">${g(ida)}</span><span class="br-gol">${g(vta)}</span>`;
    // Lado Plata espejado: goles a la izquierda, escudo a la derecha
    return `<div class="br-fila${nos ? ' us' : ''}${pendiente ? ' pendiente' : ''}${estado ? ' ' + estado : ''}">
      ${espejo ? goles + equipo + img : img + equipo + goles}
    </div>`;
  }

  function llave(s, espejo, rotulo) {
    const nos = esNos(s.a) || esNos(s.b);
    const estA = s.ganador === 'a' ? 'gana' : s.ganador === 'b' ? 'queda' : '';
    const estB = s.ganador === 'b' ? 'gana' : s.ganador === 'a' ? 'queda' : '';
    const n = (s.nombre.match(/#(\d+)/) || [])[1] || '';
    const glob = s.global ? ` · Global ${s.global[0]}-${s.global[1]}` : '';
    return `<div class="br-match">
      <div class="br-card${nos ? ' us' : ''}">
        <div class="br-tag" title="${esc(s.cupo)}">${rotulo ? esc(rotulo) : `Llave ${esc(n)} · ${esc(corto(s.cupo))}`}${esc(glob)}</div>
        ${fila(s.a, s.ida?.[0], s.vuelta?.[1], estA, espejo)}
        ${fila(s.b, s.ida?.[1], s.vuelta?.[0], estB, espejo)}
      </div>
    </div>`;
  }

  // Un solo cuadro enfrentado: Oro avanza de izquierda a derecha, Plata espejada de
  // derecha a izquierda, y las dos finales quedan juntas en el medio, unidas por una línea.
  function columna(r, i, n, lado) {
    const cls = ['br-ronda', lado, i === 0 ? 'primera' : '', i === n - 1 ? 'final' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}">${r.series.map(x => llave(x, lado === 'plata', i === n - 1 ? (lado === 'plata' ? 'Final Plata' : 'Final Oro') : '')).join('')}</div>`;
  }

  // Títulos de ronda; las dos finales del medio comparten uno solo ("Finales")
  function titulos(cols) {
    const out = [];
    for (let k = 0; k < cols.length; k++) {
      const c = cols[k], sig = cols[k + 1];
      if (c.i === c.n - 1 && sig && sig.i === sig.n - 1) {
        out.push('<div class="br-ronda-titulo br-finales" style="grid-column:span 2">Finales</div>'); k++; continue;
      }
      out.push(`<div class="br-ronda-titulo ${c.lado}">${esc(c.r.titulo)}</div>`);
    }
    return out.join('');
  }

  function cuadro(oro, plata) {
    const lados = [oro && { f: oro, lado: 'oro' }, plata && { f: plata, lado: 'plata' }].filter(Boolean);
    const cols = lados.flatMap(({ f, lado }) => {
      const c = f.rondas.map((r, i) => ({ r, i, n: f.rondas.length, lado }));
      return lado === 'plata' ? c.reverse() : c;
    });
    // La primera ronda de cada lado (la que ya tiene todos los nombres) va más ancha
    const plantilla = cols.map(c => c.i === 0 ? 'minmax(168px,1.3fr)' : 'minmax(128px,1fr)').join(' ');
    const head = ({ f, lado }) => `<div class="br-fase-head ${lado}" style="grid-column:span ${f.rondas.length}">
        <span class="br-fase-titulo">${esc(f.titulo.replace(/^playoff\s*/i, ''))}</span>
      </div>`;
    return `<div class="br-hint"><span>Deslizá para recorrer el cuadro</span><button type="button" class="br-ir">Ir a nuestro partido</button></div>
    <div class="br-scroll"><div class="br-cuadro" style="grid-template-columns:${plantilla}">
      ${lados.map(head).join('')}
      ${titulos(cols)}
      ${cols.map(c => columna(c.r, c.i, c.n, c.lado)).join('')}
    </div></div>`;
  }

  async function cargar() {
    const cont = document.getElementById('t4-vpug-playoffs');
    const wrap = document.getElementById('t4-vpug-playoffs-wrap');
    if (!cont || !wrap) return;
    try {
      const r = await fetch(URL_PLAYOFFS);
      if (!r.ok) throw new Error(r.status);
      const fases = await r.json();
      if (!Array.isArray(fases) || !fases.length) throw new Error('vacío');
      cont.innerHTML = cuadro(fases.find(f => !/plata/i.test(f.titulo)), fases.find(f => /plata/i.test(f.titulo)));
      wrap.hidden = false;
      // Botón "Compartir cuadro" (placa en posiciones-share.js)
      if (window.TSPos && TSPos.registerBracket) TSPos.registerBracket(fases, wrap, 't4');
      // Celular: el cuadro es más ancho que la pantalla → arranca centrado en nuestra llave
      const sc = cont.querySelector('.br-scroll');
      const centrar = suave => {
        const card = sc.querySelector('.br-card.us');
        if (!card || sc.scrollWidth <= sc.clientWidth) return;
        const r = card.getBoundingClientRect(), v = sc.getBoundingClientRect();
        sc.scrollTo({ left: sc.scrollLeft + (r.left - v.left) - (v.width - r.width) / 2,
          top: sc.scrollTop + (r.top - v.top) - (v.height - r.height) / 2, behavior: suave ? 'smooth' : 'auto' });
      };
      requestAnimationFrame(() => centrar(false));
      const ir = cont.querySelector('.br-ir');
      if (ir) { ir.hidden = !sc.querySelector('.br-card.us'); ir.addEventListener('click', () => centrar(true)); }
    } catch (e) {
      wrap.hidden = true;
    }
  }

  cargar();
})();
