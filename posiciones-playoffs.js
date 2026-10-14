// ─── Posiciones · Playoffs de la Copa de Pretemporada VPUG (T4) ──────────────
// Cuadro de eliminación como el de CopáFácil (rondas en columnas, líneas que unen cada
// par de llaves con la siguiente): Fase Oro a la izquierda, Fase Plata a la derecha.
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

  function fila(t, ida, vta, estado) {
    const nos = esNos(t);
    const logo = nos ? OUR_LOGO : t.logo;
    const img = logo
      ? `<img class="br-logo" src="${esc(logo)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
      : '<span class="br-logo br-logo-vacio"></span>';
    // Lugar todavía sin definir ("Ganador 8vos 1"): más corto y en gris
    const pendiente = !t.logo && /^Ganador /.test(t.name || '');
    const nombre = pendiente ? corto(t.name).replace(/^Ganador /, 'Gan. ') : corto(t.name);
    return `<div class="br-fila${nos ? ' us' : ''}${pendiente ? ' pendiente' : ''}${estado ? ' ' + estado : ''}">
      ${img}<span class="br-equipo" title="${esc(nombre)}">${esc(nombre)}</span>
      <span class="br-gol">${g(ida)}</span><span class="br-gol">${g(vta)}</span>
    </div>`;
  }

  function llave(s) {
    const nos = esNos(s.a) || esNos(s.b);
    const estA = s.ganador === 'a' ? 'gana' : s.ganador === 'b' ? 'queda' : '';
    const estB = s.ganador === 'b' ? 'gana' : s.ganador === 'a' ? 'queda' : '';
    const n = (s.nombre.match(/#(\d+)/) || [])[1] || '';
    const glob = s.global ? ` · Global ${s.global[0]}-${s.global[1]}` : '';
    return `<div class="br-match">
      <div class="br-card${nos ? ' us' : ''}">
        <div class="br-tag" title="${esc(s.cupo)}">Llave ${esc(n)} · ${esc(corto(s.cupo))}${esc(glob)}</div>
        ${fila(s.a, s.ida?.[0], s.vuelta?.[1], estA)}
        ${fila(s.b, s.ida?.[1], s.vuelta?.[0], estB)}
      </div>
    </div>`;
  }

  function fase(f) {
    const tipo = /plata/i.test(f.titulo) ? 'plata' : 'oro';
    const nombre = f.titulo.replace(/^playoff\s*/i, '');
    return `<section class="br-fase br-${tipo}">
      <div class="br-fase-head">
        <span class="br-fase-kicker">Playoff · ida y vuelta</span>
        <span class="br-fase-titulo">${esc(nombre)}</span>
      </div>
      <div class="br-scroll">
        <div class="br-cuadro" style="--br-rondas:${f.rondas.length}">
          ${f.rondas.map(r => `<div class="br-ronda-titulo">${esc(r.titulo)}</div>`).join('')}
          ${f.rondas.map((r, i) => `<div class="br-ronda${i === 0 ? ' primera' : ''}${i === f.rondas.length - 1 ? ' ultima' : ''}">${r.series.map(llave).join('')}</div>`).join('')}
        </div>
      </div>
    </section>`;
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
      // Oro a la izquierda, Plata a la derecha
      fases.sort((a, b) => (/plata/i.test(a.titulo) ? 1 : 0) - (/plata/i.test(b.titulo) ? 1 : 0));
      cont.innerHTML = fases.map(fase).join('');
      wrap.hidden = false;
    } catch (e) {
      wrap.hidden = true;
    }
  }

  cargar();
})();
