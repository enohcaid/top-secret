// Qué avisos del vigía cuentan como partidos de la noche (lo usa retransmitir.mjs).
// Regla de Juan (2026-11-03): los partidos nunca empiezan antes de su hora; lo que se juega antes de la hora del
// próximo partido registrado, o cuando ya no queda ninguno, es un amistoso y no se cuenta. Esa noche un amistoso de las
// 22:44 pasó como "partido 1" y el overlay anunciaba a Argentinos Jrs sin haber jugado contra Fco Kannabiense.
// El id de cada aviso es su hora en ms.
const porId = (a, b) => +a.id - +b.id;
const horaDe = (noche, p) => new Date(`${noche}T${p.hora}:00-03:00`).getTime();

// inicios: ids ya contados. finales: finPartido ya contados. Devuelve los ids a contar y los de amistosos.
export function clasificarInicios(eventos, { inicios, finales, partidos, noche }) {
  const contar = [], amistosos = [];
  for (const x of [...eventos].sort(porId)) {
    // "enCurso": el vigía arrancó con un partido ya en juego. Si hay uno contado sin terminar, es ese mismo (reinicio del vigía).
    const total = inicios.length + contar.length;
    if (x.enCurso && total && finales.length < total) continue;
    const prox = partidos[total];
    if (!prox || +x.id < horaDe(noche, prox)) amistosos.push(x.id);
    else contar.push(x.id);
  }
  return { contar, amistosos };
}

// Un final vale solo si hay un inicio contado sin terminar y es posterior a él (si no, es el de un amistoso).
export function clasificarFinales(eventos, { inicios, finales }) {
  const contar = [], amistosos = [];
  for (const x of [...eventos].sort(porId)) {
    const ini = inicios[finales.length + contar.length];
    if (ini === undefined || +x.id < +ini) amistosos.push(x);
    else contar.push(x);
  }
  return { contar, amistosos };
}
