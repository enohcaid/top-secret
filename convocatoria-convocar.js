// ─── Convocatoria · botón "Convocar" (arriba de los partidos de hoy) ─────────
// Deja en el portapapeles el mensaje para el grupo con el link de la convocatoria editable y,
// si hay partidos hoy, comparte la placa "Partidos de hoy" (la misma de calendario.html,
// dibujada por calendario-share.js → TSMatchdayCard). Sin partidos: el mensaje es para el
// entrenamiento y no hay placa. Usa getTodayMatches(), TODAY y showToast() del script de la página.
(function () {
  const URL_EDITABLE = 'https://enohcaid.github.io/top-secret/convocatoria.html';
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MESES_C = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); return true; } catch (e) {}
    // Respaldo para navegadores sin Clipboard API (o sin permiso)
    const ta = document.createElement('textarea');
    ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return ok;
  }

  async function convocar() {
    const btn = document.getElementById('convocarBtn');
    if (btn && btn.disabled) return;
    const partidos = getTodayMatches().slice().sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    const para = partidos.length > 1 ? 'los partidos de hoy' : partidos.length ? 'el partido de hoy' : 'el entrenamiento de hoy';
    // El portapapeles primero, mientras dura el gesto del usuario
    const copiado = await copiar(`Buenas! Ya pueden confirmar para ${para}!\n${URL_EDITABLE}`);

    if (!partidos.length) {
      showToast(copiado ? 'Mensaje copiado · pegalo en el grupo' : 'No se pudo copiar el mensaje', copiado ? '' : 'error');
      return;
    }

    const label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Armando…'; }
    try {
      const d = new Date(TODAY + 'T12:00:00');
      const blob = await TSMatchdayCard.build({
        eyebrow: partidos.length > 1 ? 'Partidos de hoy' : 'Partido de hoy',
        title: `${DIAS[d.getDay()]} ${d.getDate()} ${MESES_C[d.getMonth()]}`,
        matches: partidos,
      });
      const file = new File([blob], 'partidos-top-secret.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        showToast(copiado ? 'Mensaje copiado · pegalo en el grupo' : 'Placa compartida');
      } else {
        // PC: se descarga la placa para adjuntarla en el chat
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'partidos-top-secret.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        showToast(copiado ? 'Placa descargada · mensaje copiado' : 'Placa descargada');
      }
    } catch (e) {
      if (!e || e.name !== 'AbortError') showToast('No se pudo compartir la placa', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = label; }
    }
  }

  window.convocar = convocar;
})();
