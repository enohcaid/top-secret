// Música de los videos (y del modo pausa del vivo): desde 2026-10-28 (Juan) SOLO los temas cantados de The Shorts de
// Tacet Sin (catálogo público de topsecret.ar/music, R2 musica/catalogo.json). Nada de Anno Domini ni de las
// instrumentales propias (quedan en R2 como archivo, no se usan más).
//
// Rotación (Juan, 2026-10-28): los temas se pueden repetir, pero nunca uno de los últimos NO_REPETIR videos; entre los
// que quedan, el que hace más que no suena (o nunca sonó). Registro versionado en scripts/musica-usada.json
// (`historial`; `usados`/`fijos` son de la regla vieja de "un tema por video, nunca repetido" y quedan como archivo).
// Cada video dice qué tema suena: rótulo en pantalla (filtroRotulo) + línea en el texto de cada publicación
// (creditoTexto, lo agrega agregarLote de scripts/social/lib/aprobaciones.mjs).
//
//   elegirMusica('id-del-video', { preferida: 'Cold Hands' })  → ruta del mp3 (y lo anota en el historial)
//   - Si ese video ya tiene tema asignado, devuelve el mismo (re-renders del mismo video).
//   - 'preferida' busca en título o slug, sin distinguir mayúsculas; puede ser uno usado hace poco (lo pidió alguien).
//   infoTema(ruta) → { slug, titulo, volumen } · creditoTexto(titulo) · filtroRotulo(ruta) (drawtext de ffmpeg)
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const REG = path.join(ROOT, 'scripts/musica-usada.json');
const DIR = path.join(ROOT, 'fuentes/musica/tacet-sin');
const CATALOGO = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/musica/catalogo.json';
const LOCAL = path.join(DIR, 'catalogo.json');
const NO_REPETIR = 8;
export const ARTISTA = 'Tacet Sin';

// Baja el catálogo y los mp3 que falten. Sin red, sigue con lo que ya esté bajado.
export async function bajarTheShorts() {
  fs.mkdirSync(DIR, { recursive: true });
  try {
    const cat = await (await fetch(CATALOGO, { signal: AbortSignal.timeout(20000) })).json();
    const temas = cat.temas.filter(t => t.voz && t.album === 'the-shorts')
      .map(t => ({ slug: t.slug, titulo: t.titulo, volumen: t.volumen, voz: t.voz }));
    for (const t of temas) {
      const f = path.join(DIR, t.slug + '.mp3');
      if (fs.existsSync(f)) continue;
      const r = await fetch(t.voz, { signal: AbortSignal.timeout(120000) });
      if (r.ok) fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    }
    fs.writeFileSync(LOCAL, JSON.stringify(temas, null, 1));
  } catch (e) { if (!fs.existsSync(LOCAL)) throw new Error('No pude bajar el catálogo de The Shorts: ' + e.message); }
  return lista();
}
const lista = () => JSON.parse(fs.readFileSync(LOCAL, 'utf8'))
  .map(t => ({ ...t, ruta: path.join(DIR, t.slug + '.mp3') })).filter(t => fs.existsSync(t.ruta));

export function infoTema(ruta) {
  const slug = path.basename(ruta).replace(/\.\w+$/, '');
  try { const t = lista().find(x => x.slug === slug); if (t) return t; } catch {}
  return { slug, titulo: slug, volumen: null };
}
export const creditoTexto = titulo => `Música: "${titulo}" — ${ARTISTA} (The Shorts) · topsecret.ar/music`;

// Rótulo "MÚSICA · TACET SIN — Título" arriba a la izquierda, del segundo 0,6 al 5,5 con fundidos (fuera de la zona
// que tapan los botones de Reels/TikTok). Para la cadena -vf de ffmpeg (escala con el ancho del video).
export function filtroRotulo(ruta) {
  const t = infoTema(ruta);
  const txt = path.join(DIR, `rotulo-${t.slug}.txt`);
  fs.writeFileSync(txt, `MÚSICA · ${ARTISTA.toUpperCase()} — ${t.titulo}`);
  const esc = p => p.replace(/\\/g, '/').replace(/:/g, '\\:');
  const a = `if(lt(t,0.6),0,if(lt(t,1.1),(t-0.6)/0.5,if(lt(t,5),1,if(lt(t,5.5),(5.5-t)/0.5,0))))`;
  return `drawtext=fontfile='${esc('C:/Windows/Fonts/bahnschrift.ttf')}':textfile='${esc(txt)}':fontsize=w*0.03:fontcolor=white`
    + `:box=1:boxcolor=black@0.45:boxborderw=w*0.012:x=w*0.06:y=h*0.11:alpha='${a}'`;
}

export async function elegirMusica(video, { preferida = null } = {}) {
  const temas = await bajarTheShorts();
  if (!temas.length) throw new Error('No hay temas de The Shorts bajados (fuentes/musica/tacet-sin).');
  const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
  reg.historial ||= [];
  const previo = reg.historial.find(h => h.video === video);
  const ya = previo && temas.find(t => t.slug === previo.tema);
  if (ya) return ya.ruta;
  let tema;
  if (preferida) {
    const q = preferida.toLowerCase();
    tema = temas.find(t => t.titulo.toLowerCase().includes(q) || t.slug.includes(q));
    if (!tema) throw new Error(`no encuentro "${preferida}" entre los temas de The Shorts`);
  } else {
    const recientes = reg.historial.slice(-NO_REPETIR).map(h => h.tema);
    const ultimo = slug => reg.historial.findLastIndex(h => h.tema === slug);
    const libres = temas.filter(t => !recientes.includes(t.slug));
    const pool = libres.length ? libres : temas;
    const minimo = Math.min(...pool.map(t => ultimo(t.slug)));
    const candidatos = pool.filter(t => ultimo(t.slug) === minimo);
    tema = candidatos[Math.floor(Math.random() * candidatos.length)];
  }
  reg.historial.push({ tema: tema.slug, titulo: tema.titulo, video, fecha: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }) });
  fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
  console.log(`Música de "${video}": ${tema.titulo} (${ARTISTA}). Commitear scripts/musica-usada.json.`);
  return tema.ruta;
}
