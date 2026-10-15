// ¿De qué lado está la barra de FC27 con NUESTRO jugador (abajo a la izquierda o a la derecha)?
// No depende de local/visitante: en el mismo partido puede cambiar (visto el 2026-10-14), así que se lee la pantalla.
// Se OCRean los nombres de las dos barras (720p) y se compara con lo que se sabe de cada equipo:
//   - de entrada, el apellido de quien transmite (panel fijo de arriba a la derecha, "6 J. MARTINEZ");
//   - cada vez que el lado está claro, los nombres de ese lado se aprenden como nuestros y los del otro como rivales,
//     así se reconoce el lado aunque Martinez no tenga la pelota.
// Un cambio de lado se acepta recién con 2 lecturas seguidas que lo confirmen (el OCR de nombres chicos falla a veces).
export const BARRA_IZQ = { left: 60, top: 646, width: 200, height: 26 };
export const BARRA_DER = { left: 1040, top: 646, width: 190, height: 26 };
export const PANEL = { left: 985, top: 36, width: 170, height: 26 };

// "6 MARTINEZ" / "AGUSS1932 33" / "6 J. MARTINEZ" → palabras de letras (y dígitos pegados) de 3+ caracteres
export const palabras = texto => String(texto || '').toUpperCase().replace(/[^A-Z0-9_ ]+/g, ' ').split(/\s+/)
  .filter(w => w.length >= 3 && /[A-Z]/.test(w));

function distancia(a, b) {                                     // Levenshtein
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const parecido = (a, b) => a === b || (Math.min(a.length, b.length) >= 5 && distancia(a, b) <= 1);
const esta = (set, ws) => ws.some(w => [...set].some(x => parecido(w, x)));

export function crearLado() {
  const nuestros = new Set(), rivales = new Set();
  let lado = null, candidato = null, seguidas = 0;
  const aprender = (ws, propio) => {
    for (const w of ws) {
      const [este, otro] = propio ? [nuestros, rivales] : [rivales, nuestros];
      if ([...otro].some(x => parecido(w, x))) continue;       // contradicción: no se aprende
      este.add(w);
    }
  };
  return {
    get lado() { return lado; },
    get nuestros() { return [...nuestros]; },
    get rivales() { return [...rivales]; },
    apellido(texto) { const ws = palabras(texto).filter(w => !/\d/.test(w)); if (ws.length) nuestros.add(ws[ws.length - 1]); return ws[ws.length - 1]; },
    // Una lectura de las dos barras; devuelve el lado si cambió (si no, null)
    paso(textoIzq, textoDer) {
      const L = palabras(textoIzq), R = palabras(textoDer);
      const izq = esta(nuestros, L) || esta(rivales, R), der = esta(nuestros, R) || esta(rivales, L);
      const d = izq && !der ? 'izq' : der && !izq ? 'der' : null;
      if (!d) return null;
      aprender(d === 'izq' ? L : R, true); aprender(d === 'izq' ? R : L, false);
      if (d === lado) { candidato = null; seguidas = 0; return null; }
      if (lado === null) { lado = d; return d; }                // la primera vez alcanza con una
      seguidas = candidato === d ? seguidas + 1 : 1; candidato = d;
      if (seguidas >= 2) { lado = d; candidato = null; seguidas = 0; return d; }
      return null;
    },
  };
}
