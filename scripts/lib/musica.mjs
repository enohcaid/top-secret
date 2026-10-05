// Música de los videos: cada video publicado lleva su propio tema y un tema no se repite en otro video
// (regla de Juan, 2026-10-05). Registro versionado en scripts/musica-usada.json, así vale desde cualquier PC.
//
//   elegirMusica('id-del-video', { preferida: 'Ten' })  → ruta del mp3 (y lo anota como usado)
//   - Si ese video ya tiene tema asignado, devuelve el mismo (re-renders del mismo video).
//   - 'preferida' (empieza con, sin distinguir mayúsculas) tiene que estar libre; si está usada, error.
//   - Sin preferida, toma el primer tema libre de la biblioteca (fuentes/musica/trap, trap libre de derechos).
//   musicaFija('Locked In') → ruta de un tema reservado en "fijos" (plantillas que se repiten a propósito).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const REG = path.join(ROOT, 'scripts/musica-usada.json');
const DIR = path.join(ROOT, 'fuentes/musica/trap');

function biblioteca() {
  if (!fs.existsSync(DIR)) execFileSync('node', [path.join(ROOT, 'scripts/r2.mjs'), 'sync-down', '_fuentes/musica', 'fuentes/musica'], { stdio: 'inherit', cwd: ROOT });
  return fs.readdirSync(DIR).filter(f => /\.(mp3|m4a|wav)$/i.test(f)).sort();
}
const leer = () => JSON.parse(fs.readFileSync(REG, 'utf8'));
const empieza = (archivo, nombre) => archivo.toLowerCase().startsWith(nombre.toLowerCase());

export function elegirMusica(video, { preferida = null } = {}) {
  const reg = leer(), libs = biblioteca();
  const propio = Object.entries(reg.usados).find(([, v]) => v.video === video);
  if (propio && libs.includes(propio[0])) return path.join(DIR, propio[0]);
  const ocupado = a => reg.usados[a] || reg.fijos[a];
  let tema;
  if (preferida) {
    tema = libs.find(a => empieza(a, preferida));
    if (!tema) throw new Error(`no encuentro "${preferida}" en fuentes/musica/trap`);
    if (ocupado(tema)) throw new Error(`"${tema}" ya se usó (${reg.usados[tema]?.video || 'reservado: ' + reg.fijos[tema]}). Cada video lleva su propia música: elegí otro tema.`);
  } else {
    tema = libs.find(a => !ocupado(a));
    if (!tema) throw new Error('No quedan temas sin usar en la biblioteca: sumar más trap libre (Biblioteca de audio de YouTube) a R2 _fuentes/musica/trap.');
  }
  reg.usados[tema] = { video, fecha: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }) };
  fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
  const libres = libs.filter(a => !reg.usados[a] && !reg.fijos[a]).length;
  console.log(`Música de "${video}": ${tema} (quedan ${libres} temas sin usar${libres <= 3 ? ' — conviene sumar más a la biblioteca' : ''}). Commitear scripts/musica-usada.json.`);
  return path.join(DIR, tema);
}

export function musicaFija(nombre) {
  const reg = leer(), tema = biblioteca().find(a => empieza(a, nombre));
  if (!tema || !reg.fijos[tema]) throw new Error(`"${nombre}" no está reservado como tema fijo en scripts/musica-usada.json`);
  return path.join(DIR, tema);
}
