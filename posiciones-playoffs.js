// ─── Posiciones · Playoffs de la Copa de Pretemporada VPUG (T4) ──────────────
// Cuadros de cruces de la Fase Oro (izquierda) y la Fase Plata (derecha), en vivo desde
// CopáFácil vía el Worker /vpug-playoffs-t4. Se carga después del script inline de
// posiciones.html (usa WORKER_BASE y OUR_LOGO). Si el Worker falla, la sección se oculta.
(function () {
  const URL_PLAYOFFS = WORKER_BASE + '/vpug-playoffs-t4';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esNos = t => /top.?secret/i.test(t?.name || '');
  const g = v => (v === null || v === undefined) ? '–' : v;
  // "Ganador Octavos de final #1" no entra en la tarjeta → "Ganador Octavos 1"
  const corto = s => String(s ?? '').replace(/(Octavos|Cuartos) de final #(\d+)/g, '$1 $2').replace(/Semifinal #(\d+)/g, 'Semi $1');

  function fila(t, ida, vta, glob, estado) {
    const nos = esNos(t);
    const logo = nos ? OUR_LOGO : t.logo;
    const img = logo
      ? `<img class="po-logo${nos ? ' us' : ''}" src="${esc(logo)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
      : '<span class="po-logo po-logo-vacio"></span>';
    return `<div class="po-fila${nos ? ' us' : ''}${estado ? ' ' + estado : ''}">
      ${img}<span class="po-equipo">${esc(corto(t.name))}</span>
      <span class="po-gol">${g(ida)}</span><span class="po-gol">${g(vta)}</span><span class="po-gol po-glob">${g(glob)}</span>
    </div>`;
  }

  function serie(s) {
    const nos = esNos(s.a) || esNos(s.b);
    const estA = s.ganador === 'a' ? 'gana' : s.ganador === 'b' ? 'queda' : '';
    const estB = s.ganador === 'b' ? 'gana' : s.ganador === 'a' ? 'queda' : '';
    const llave = (s.nombre.match(/#(\d+)/) || [])[1];
    return `<div class="po-serie${nos ? ' us' : ''}">
      <div class="po-serie-head">
        <span class="po-llave">Llave ${esc(llave || '')}</span>
        <span class="po-cupo">${esc(corto(s.cupo))}</span>
      </div>
      <div class="po-cols"><span></span><span></span><span>Ida</span><span>Vta</span><span>Gl</span></div>
      ${fila(s.a, s.ida?.[0], s.vuelta?.[1], s.global?.[0], estA)}
      ${fila(s.b, s.ida?.[1], s.vuelta?.[0], s.global?.[1], estB)}
    </div>`;
  }

  function fase(f) {
    const tipo = /plata/i.test(f.titulo) ? 'plata' : 'oro';
    const nombre = f.titulo.replace(/^playoff\s*/i, '');
    return `<section class="po-fase po-${tipo}">
      <div class="po-fase-head">
        <span class="po-fase-kicker">Playoff</span>
        <span class="po-fase-titulo">${esc(nombre)}</span>
      </div>
      ${f.rondas.map(r => `<div class="po-ronda">
        <div class="po-ronda-titulo">${esc(r.titulo)}</div>
        <div class="po-series">${r.series.map(serie).join('')}</div>
      </div>`).join('')}
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
