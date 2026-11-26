// Reglas de contenido para redes (Juan, 2026-11-26: "de ahora en más", adaptadas del pack instagram-agent-skill de
// Jakeschincariol: /ig-carousel, /ig-caption, /ig-human). Las usan noticia-diaria.mjs (se le devuelven a Claude para
// que corrija) y noticia-lote.mjs / placas-carrusel.mjs (avisan en las notas manuales). Detalle y porqués:
// docs/conocimiento/feedback_reglas_contenido_redes.md

const plano = s => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\*\*/g, '').trim();
const palabras = s => plano(s).split(/\s+/).filter(Boolean).length;

// Frases y palabras que delatan texto de máquina (en castellano). Editable: si una sirve, sacarla de acá.
export const MULETILLAS_IA = [
  'sin lugar a dudas', 'cabe destacar', 'cabe resaltar', 'vale la pena destacar', 'es importante destacar', 'en definitiva',
  'en este sentido', 'en el mundo de', 'en el vertiginoso', 'un antes y un después', 'no es solo', 'no se trata solo de',
  'más que un', 'sumergirse', 'sumergite', 'desbloquear', 'potenciar', 'elevar tu', 'llevar al siguiente nivel',
  'al siguiente nivel', 'sinergia', 'paradigma', 'robusto', 'en resumen', 'en conclusión', 'a fin de cuentas',
  'te contamos todo', 'todo lo que tenés que saber', 'lo que nadie te cuenta', 'prepárate', 'sin más preámbulos',
  'ni más ni menos', 'una auténtica', 'un auténtico', 'fascinante', 'apasionante travesía', 'travesía', 'tapiz',
];
const reMuletilla = new RegExp(`(?:^|[^\\p{L}])(${MULETILLAS_IA.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=$|[^\\p{L}])`, 'iu');

export const VENTANA_IG = 125;   // lo que muestra el feed antes del "... más"

// Textos de redes: shareCaption, shareCaptions.ig/.x/.fb y, si hay, tituloImagen.
export function controlarTextos(n) {
  const err = [];
  const sc = n.shareCaptions || {};
  const ig = String(sc.ig || '');
  if (ig) {
    const primera = plano(ig.split('\n')[0]);
    if ([...primera].length > VENTANA_IG) err.push(`shareCaptions.ig: la primera línea tiene ${[...primera].length} caracteres; el feed muestra ${VENTANA_IG} antes del "más": el gancho entero tiene que entrar ahí`);
    if (/^[\s]*(#|\p{Extended_Pictographic})/u.test(ig)) err.push('shareCaptions.ig no puede arrancar con un emoji ni un hashtag: la primera línea es el gancho');
    const tags = ig.match(/#[\p{L}\d_]+/gu) || [];
    if (tags.length !== 3) err.push(`shareCaptions.ig lleva ${tags.length} hashtags: van exactamente 3 (uno del club, uno del juego o la liga, uno del tema), al final`);
  }
  for (const [k, t] of [['shareCaption', n.shareCaption], ['shareCaptions.ig', sc.ig], ['shareCaptions.x', sc.x], ['shareCaptions.fb', sc.fb]]) {
    if (!t) continue;
    if (/—/.test(t)) err.push(`${k}: sin rayas (—) en los textos de redes; usá punto, coma o dos puntos`);
    const m = String(t).match(reMuletilla);
    if (m) err.push(`${k}: "${m[1]}" suena a texto de máquina; decilo directo`);
  }
  if (n.tituloImagen && palabras(n.tituloImagen) > 6) err.push(`tituloImagen tiene ${palabras(n.tituloImagen)} palabras: máximo 6 (tiene que leerse en la grilla)`);
  return err;
}

// Carrusel (/ig-carousel): portada (la foto con tituloImagen, la arma noticia-redes.js) + estas placas:
//   clave   → por qué importa, en una frase. Instagram puede volver a mostrar el carrusel desde la 2.ª: se entiende sola.
//   idea    → UNA idea por placa: título de 3 a 7 palabras y hasta 25 palabras debajo.
//   resumen → todo en una lista corta (la placa que se guarda).
//   cta     → una sola acción.
// Total con la portada: 6 a 10 → de 5 a 9 placas acá.
export const TIPOS_PLACA = ['clave', 'idea', 'resumen', 'cta'];
export function controlarCarrusel(placas) {
  const err = [];
  if (!Array.isArray(placas)) return ['"carrusel" tiene que ser una lista de placas'];
  if (placas.length < 5 || placas.length > 9) err.push(`el carrusel tiene ${placas.length} placas además de la portada: van de 5 a 9 (6 a 10 en total)`);
  placas.forEach((p, i) => {
    const q = `placa ${i + 2}`;
    if (!TIPOS_PLACA.includes(p?.tipo)) { err.push(`${q}: tipo "${p?.tipo}" (clave, idea, resumen o cta)`); return; }
    if (!plano(p.titulo)) err.push(`${q}: falta el título`);
    if (/\p{Extended_Pictographic}/u.test(JSON.stringify(p))) err.push(`${q}: sin emojis en las placas`);
    if (p.tipo === 'idea') {
      const w = palabras(p.titulo);
      if (w < 3 || w > 7) err.push(`${q}: el título tiene ${w} palabras (de 3 a 7)`);
      if (palabras(p.texto) > 25) err.push(`${q}: ${palabras(p.texto)} palabras debajo del título (máximo 25: si necesita más, son dos placas)`);
    }
    if (p.tipo === 'clave' && palabras(p.texto || p.titulo) > 30) err.push(`${q}: la clave es una sola frase corta`);
    if (p.tipo === 'resumen' && (!Array.isArray(p.items) || p.items.length < 2 || p.items.length > 6 || p.items.some(x => palabras(x) > 10)))
      err.push(`${q}: el resumen es una lista de 2 a 6 puntos de hasta 10 palabras`);
    if (p.tipo === 'cta' && palabras(p.titulo) > 8) err.push(`${q}: la acción final, en 8 palabras o menos`);
  });
  const tipos = placas.map(p => p?.tipo);
  if (tipos[0] !== 'clave') err.push('la placa 2 tiene que ser "clave" (por qué importa)');
  if (tipos[tipos.length - 1] !== 'cta') err.push('la última placa tiene que ser "cta" (una sola acción)');
  if (tipos[tipos.length - 2] !== 'resumen') err.push('la anteúltima placa tiene que ser "resumen"');
  if (tipos.filter(t => t === 'idea').length < 2) err.push('el carrusel necesita al menos 2 placas "idea"');
  return err;
}
