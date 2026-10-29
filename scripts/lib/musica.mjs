// Música de los videos (y del modo pausa del vivo): desde 2026-10-28 (Juan) SOLO los temas cantados de The Shorts de
// Tacet Sin (catálogo público de topsecret.ar/music, R2 musica/catalogo.json). Nada de Anno Domini ni de las
// instrumentales propias (quedan en R2 como archivo, no se usan más).
//
// Rotación (Juan, 2026-10-28): los temas se pueden repetir, pero nunca uno de los últimos NO_REPETIR videos; entre los
// que quedan, el que hace más que no suena (o nunca sonó). Registro versionado en scripts/musica-usada.json
// (`historial`; `usados`/`fijos` son de la regla vieja de "un tema por video, nunca repetido" y quedan como archivo).
// Cada video dice qué tema suena: tarjeta "Sonando ahora" en pantalla (rotuloEntrada) + línea en el texto de cada publicación
// (creditoTexto, lo agrega agregarLote de scripts/social/lib/aprobaciones.mjs).
//
//   elegirMusica('id-del-video', { preferida: 'Cold Hands' })  → ruta del mp3 (y lo anota en el historial)
//   - Si ese video ya tiene tema asignado, devuelve el mismo (re-renders del mismo video).
//   - 'preferida' busca en título o slug, sin distinguir mayúsculas; puede ser uno usado hace poco (lo pidió alguien).
//   infoTema(ruta) → { slug, titulo, volumen } · creditoTexto(titulo) · rotuloEntrada(ruta, ancho, alto) (tarjeta animada)
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const REG = path.join(ROOT, 'scripts/musica-usada.json');
const DIR = path.join(ROOT, 'fuentes/musica/tacet-sin');
const CATALOGO = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/musica/catalogo.json';
const LOCAL = path.join(DIR, 'catalogo.json');
const LOCAL_ALBUMES = path.join(DIR, 'albumes.json');
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
    fs.writeFileSync(LOCAL_ALBUMES, JSON.stringify(cat.albumes || [], null, 1));
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

// Tarjeta "Sonando ahora" (rotulo-tema.js en la raíz, la misma que dibuja video-equipo.js en el navegador): queda
// todo el video en la franja de arriba. Cuadros PNG transparentes de esa franja (ancho del video), a 30 fps, dibujados
// con Playwright; se guarda solo el último juego (tema + tamaño + duración) para re-renders del mismo video.
// Devuelve los argumentos de entrada para ffmpeg; en el filtro: [video][N:v]overlay=0:0:eof_action=pass.
export async function rotuloEntrada(ruta, ancho = 1080, alto = 1920, dur = 60) {
  const t = infoTema(ruta);
  const raiz = path.join(DIR, 'rotulos'), nombre = `${t.slug}-${ancho}x${alto}-${Math.round(dur * 10)}`;
  const dir = path.join(raiz, nombre);
  const patron = path.join(dir, '%04d.png');
  if (!fs.existsSync(path.join(dir, 'listo'))) {
    fs.rmSync(raiz, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const cat = JSON.parse(fs.readFileSync(LOCAL_ALBUMES, 'utf8'));
    const portada = cat.find(a => a.id === 'the-shorts' && a.volumen === t.volumen)?.portada;
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.setContent(`<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@600&family=Barlow+Condensed:wght@700;800&display=block" rel="stylesheet">
        <p style="font-family:'Barlow Condensed';font-weight:800">a</p><p style="font-family:'Barlow';font-weight:600">a</p>`, { waitUntil: 'networkidle' });
      await page.addScriptTag({ path: path.join(ROOT, 'rotulo-tema.js') });
      await page.evaluate(async ([W, H, dur, tema, src]) => {
        await document.fonts.ready;
        await Promise.all(["800 38px 'Barlow Condensed'", "700 18px 'Barlow Condensed'", "600 25px 'Barlow'"].map(f => document.fonts.load(f)));
        const img = new Image(); img.crossOrigin = 'anonymous';
        if (src) await new Promise(r => { img.onload = img.onerror = r; img.src = src; });
        window._c = document.createElement('canvas'); _c.width = W; _c.height = TSRotuloTema.franja(W, H);
        window._f = f => { const x = _c.getContext('2d'); x.clearRect(0, 0, _c.width, _c.height); TSRotuloTema.dibujar(x, W, H, f / 30, tema, img.width ? img : null, dur); return _c.toDataURL('image/png'); };
      }, [ancho, alto, dur, { titulo: t.titulo, artista: ARTISTA }, portada]);
      for (let f = 0; f < Math.ceil(dur * 30); f++) {
        const b64 = (await page.evaluate(f => _f(f), f)).split(',')[1];
        fs.writeFileSync(path.join(dir, String(f).padStart(4, '0') + '.png'), Buffer.from(b64, 'base64'));
      }
      fs.writeFileSync(path.join(dir, 'listo'), '');
    } finally { await browser.close(); }
  }
  return ['-framerate', '30', '-start_number', '0', '-i', patron];
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
