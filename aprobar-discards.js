// Discards en aprobar.html (Juan, 2026-11-09): los temas de Thrive descartados se ven como un álbum de /music —
// portada grande, "Album · Tacet Sin", temas plegados, play redondo con barra de progreso y letra—, pero quedan acá
// (no en /music) hasta que Juan dé la orden: "en el futuro, un disco de los descartes".
// aprobar.js llama a TSDiscards.html(lotes) al pintar la pestaña Demos; el resto (play, plegar, letra) vive acá.
(() => {
  const PORTADA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/musica/portadas/discards.webp?v=1';
  const PLAY = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5.5v13l11-6.5z"/></svg>';
  const PAUSA = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
  const FLECHA = '<svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg>';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fecha = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${d.getDate()} de ${MESES[d.getMonth()]}`; };

  const audio = new Audio();
  audio.preload = 'none';
  let temas = [], actual = null, letras = new Set();
  let abierto = (() => { try { return localStorage.getItem('ts_discards_abierto') === '1'; } catch { return false; } })();

  // De cada lote saca lo que muestra /music: título, audio, fecha, tempo, tonalidad, duración y letra cantada
  const datos = (l, i) => {
    const beat = l.piezas.find(p => p.id === 'beat')?.detalle || '';
    const m = beat.match(/(\d+)\s*BPM\s*·\s*([^·\n]+?)\s*·\s*(\d+:\d{2})/);
    const letra = String(l.piezas.find(p => p.id === 'letra')?.detalle || '').replace(/^Historia:[^\n]*\n\n/, '');
    return { id: l.id, pista: i + 1, titulo: l.tema?.titulo || l.titulo.replace(/^Thrive · /, ''), audio: l.tema?.audio || '',
      fecha: fecha(l.creado), bpm: m?.[1], tonalidad: m?.[2], dur: m?.[3], letra, pendiente: !!l.descartar && !l.estado };
  };
  const letraHtml = t => esc(t).replace(/^\[([^\]]+)\][ \t]*\n?/gm, (_, s) => `<span class="sec">${s}</span>`).replace(/\n{2,}/g, '\n');
  const tema = t => {
    const on = t.id === actual, suena = on && !audio.paused;
    return `<div class="dz-tema${on ? ' sonando' : ''}${letras.has(t.id) ? ' con-letra' : ''}" data-dz-tema="${esc(t.id)}">
      <button class="dz-play" data-dz-play="${esc(t.id)}" aria-label="Escuchar ${esc(t.titulo)}"${t.audio ? '' : ' disabled'}>${suena ? PAUSA : PLAY}</button>
      <div class="dz-info">
        <div class="dz-titulo"><span class="dz-pista">${String(t.pista).padStart(2, '0')}</span>${esc(t.titulo)}</div>
        <div class="dz-meta">${[t.fecha, t.bpm && `<b>${t.bpm}</b> BPM`, t.tonalidad, t.dur].filter(Boolean).join(' · ')}${t.pendiente ? ' · pasando a Discards…' : ''}</div>
      </div>
      <div class="dz-acciones">${t.letra ? `<button class="dz-chip${letras.has(t.id) ? ' on' : ''}" data-dz-letra="${esc(t.id)}">Letra</button>` : ''}</div>
      <div class="dz-barra" data-dz-barra="${esc(t.id)}"><i style="width:${on && audio.duration ? audio.currentTime / audio.duration * 100 : 0}%"></i></div>
      ${t.letra ? `<div class="dz-letra">${letraHtml(t.letra)}</div>` : ''}
    </div>`;
  };

  function html(lotes) {
    temas = lotes.map(datos);
    const meta = temas.length ? `${temas.length} tema${temas.length > 1 ? 's' : ''}` : 'Todavía no hay temas descartados';
    return `<section class="dz-album${abierto ? ' abierto' : ''}" id="dz-album">
      <div class="dz-cab">
        <button class="dz-tapa" data-tapa="${PORTADA}" aria-label="Ver la portada de Discards más grande" style="background-image:url('${PORTADA}')"></button>
        <button class="dz-toggle" data-dz-album aria-expanded="${abierto}">
          <span>
            <span class="dz-tipo">Album · Tacet Sin</span>
            <span class="dz-nombre">Discards</span>
            <span class="dz-desc">Los temas de Thrive que no pasaron. No se rehacen ni se publican: quedan acá para un futuro disco de descartes.</span>
            <span class="dz-cuenta">${meta}</span>
          </span>
          <span class="dz-flecha">${FLECHA}</span>
        </button>
      </div>
      <div class="dz-temas">${temas.map(tema).join('')}</div>
    </section>`;
  }

  function marcar() {
    document.querySelectorAll('.dz-tema').forEach(el => {
      const on = el.dataset.dzTema === actual;
      el.classList.toggle('sonando', on);
      el.querySelector('.dz-play').innerHTML = on && !audio.paused ? PAUSA : PLAY;
    });
  }
  function tocar(id) {
    const t = temas.find(x => x.id === id); if (!t?.audio) return;
    if (actual === id && !audio.paused) return audio.pause();
    if (actual !== id) { audio.src = t.audio; actual = id; }
    audio.play().catch(() => {});
  }
  audio.addEventListener('play', marcar);
  audio.addEventListener('pause', marcar);
  audio.addEventListener('ended', () => {   // sigue con el próximo descarte, como en /music
    const i = temas.findIndex(t => t.id === actual);
    if (i >= 0 && i < temas.length - 1) tocar(temas[i + 1].id); else marcar();
  });
  audio.addEventListener('timeupdate', () => {
    const b = actual && document.querySelector(`[data-dz-barra="${CSS.escape(actual)}"] i`);
    if (b && audio.duration) b.style.width = (audio.currentTime / audio.duration * 100) + '%';
  });

  document.addEventListener('click', e => {
    const p = e.target.closest('[data-dz-play]'); if (p) return tocar(p.dataset.dzPlay);
    if (e.target.closest('[data-dz-album]')) {
      abierto = !abierto;
      const el = document.getElementById('dz-album');
      el.classList.toggle('abierto', abierto);
      el.querySelector('[data-dz-album]').setAttribute('aria-expanded', abierto);
      try { localStorage.setItem('ts_discards_abierto', abierto ? '1' : '0'); } catch {}
      return;
    }
    const l = e.target.closest('[data-dz-letra]');
    if (l) {
      const id = l.dataset.dzLetra, el = l.closest('.dz-tema'), on = el.classList.toggle('con-letra');
      l.classList.toggle('on', on); on ? letras.add(id) : letras.delete(id);
      return;
    }
    const b = e.target.closest('[data-dz-barra]');
    if (b && b.dataset.dzBarra === actual && audio.duration) { const r = b.getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * audio.duration; }
  });

  // aprobar.js no redibuja mientras suena algo: le avisa si este reproductor (que no está en el DOM) está sonando
  window.TSDiscards = { html, sonando: () => !audio.paused && !audio.ended };
})();
