// Lectura del marcador de FC27 (720p) para scripts/vigia-vivo.mjs: presencia y cambios de resultado.
// Las cifras se comparan binarizadas por fila (local arriba, visita abajo) con XOR/unión de píxeles oscuros.
//
// Calibrado 2026-10-09 sobre el vivo del 2026-10-08 (bitrate bajo, el marcador se ve borroso en las
// transiciones y cuando la conexión flojea). Un cuadro suelto llega a 0,23 de ruido, así que:
//   - se compara la MEDIANA de los últimos 5 cuadros (el ruido de compresión se cancela);
//   - un gol cambia UNA sola fila (> 0,19; el 2→3 da 0,21-0,24, lo borroso llega a 0,18) y la otra queda < 0,12;
//     si cambian las dos a la vez es borroso/transición y se ignora;
//   - el cambio tiene que sostenerse 6 cuadros (ya en la mediana) antes de contarse: con 3 contaba como gol
//     el marcador roto de los últimos segundos antes de que se cortara la señal; los goles reales aguantan 8+;
//   - las siglas de los equipos (TOP/PKE) no cambian en todo el partido: si la caja no se parece a la del
//     arranque (correlación < 0,5; normal >= 0,89) el cuadro está roto y no se mira.
// Con todo esto, el vivo del 2026-10-08 da los 4 goles reales y ningún falso (antes: 9 cambios, 5 falsos).
export const SB_CAJA = { left: 103, top: 38, width: 60, height: 36 };   // letras sobre blanco: presencia del marcador
export const SB_NUM  = { left: 166, top: 40, width: 26, height: 32 };   // las dos cifras (local arriba, visita abajo)
export const SB_RECORTE = { left: 60, top: 30, width: 150, height: 66 }; // lo que se guarda como evidencia

const frac = (buf, f) => { let n = 0; for (const v of buf) n += f(v); return n / buf.length; };
// Marcador presente: caja mayormente blanca pero con letras oscuras (descarta pantallas blancas)
export const hayMarcador = caja => frac(caja, v => v > 200) > 0.45 && frac(caja, v => v < 80) > 0.05;
// Correlación normalizada entre dos recortes en grises (1 = iguales)
const correl = (a, b) => {
  let ma = 0, mb = 0; for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; } ma /= a.length; mb /= a.length;
  let ab = 0, aa = 0, bb = 0; for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; ab += x * y; aa += x * x; bb += y * y; }
  return ab / Math.sqrt(aa * bb + 1e-9);
};
const filas = num => [num.subarray(0, num.length / 2), num.subarray(num.length / 2)].map(r => Uint8Array.from(r, v => v < 110));
export const diferFilas = (A, B) => A.map((a, k) => {
  let x = 0, u = 0; for (let i = 0; i < a.length; i++) { x += a[i] ^ B[k][i]; u += a[i] | B[k][i]; }
  return x / Math.max(u, 1);
});

function mediana(cuadros) {
  const n = cuadros[0].length, out = new Uint8Array(n), v = new Array(cuadros.length);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < cuadros.length; k++) v[k] = cuadros[k][i];
    v.sort((a, b) => a - b); out[i] = v[v.length >> 1];
  }
  return out;
}

// Detector de goles: paso(num, caja, seg) con los recortes SB_NUM y SB_CAJA en grises de cada cuadro con marcador.
// Devuelve { fila, seg } cuando cambia el resultado (fila 0 = local, 1 = visita; seg ≈ cuándo cambió).
export function crearDetector({ ventana = 5, alto = 0.19, bajo = 0.12, sostener = 6, rebase = 20, siglas = 0.5 } = {}) {
  let ring = [], base = null, cand = null, candN = 0, ambiguo = 0, refCaja = null;
  return {
    // Arranque de partido (o vuelta tras un rato sin marcador): se olvida todo
    reiniciar() { ring = []; base = null; cand = null; candN = 0; ambiguo = 0; refCaja = null; },
    // El marcador entra con animación: lo que haya hasta acá queda como resultado y siglas de partida
    asentar() {
      if (!ring.length) return;
      base = filas(mediana(ring.map(r => r.num))); refCaja = mediana(ring.map(r => r.caja));
      cand = null; candN = 0;
    },
    paso(num, caja, seg) {
      if (frac(num, v => v < 80) < 0.03) return null;          // sin cifras (transición en blanco)
      if (refCaja && correl(caja, refCaja) < siglas) return null;   // cuadro roto
      ring.push({ num, caja, seg }); if (ring.length > ventana) ring.shift();
      if (ring.length < Math.min(3, ventana)) return null;
      const fl = filas(mediana(ring.map(r => r.num)));
      if (!base) { base = fl; return null; }
      const d = diferFilas(fl, base), fila = d[0] > d[1] ? 0 : 1;
      if (d[fila] > alto && d[1 - fila] < bajo) {
        ambiguo = 0;
        if (cand && cand.fila === fila && Math.max(...diferFilas(fl, cand.fl)) < bajo) candN++;
        else { cand = { fl, fila, seg: ring[ring.length >> 1].seg }; candN = 1; }
        if (candN >= sostener) {
          base = fl; const ev = { fila, seg: cand.seg }; cand = null; candN = 0;
          return ev;
        }
      } else if (Math.max(...d) < bajo) { cand = null; candN = 0; ambiguo = 0; }
      else if (++ambiguo >= rebase) {
        // las dos filas distintas mucho rato (no es un gol: cambió la imagen del HUD): se toma como nueva base
        base = fl; cand = null; candN = 0; ambiguo = 0;
      }
      if (process.env.MARCADOR_DEBUG) console.log(seg, d.map(x => x.toFixed(2)).join('/'), refCaja ? correl(caja, refCaja).toFixed(2) : '-');
      return null;
    },
    get asentado() { return refCaja !== null; },
  };
}
