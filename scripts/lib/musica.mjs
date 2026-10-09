// Música de los videos: cada video publicado lleva su propio tema y un tema no se repite en otro video
// (regla de Juan, 2026-10-05). Registro versionado en scripts/musica-usada.json, así vale desde cualquier PC.
//
// Desde 2026-10-09 (regla de Juan: "un tema por día, 100% nuevo y original; todo lo que tenemos fue testing")
// los videos usan SOLO los temas originales del club: uno por día, compuesto por scripts/beats/diario.mjs,
// en fuentes/musica/propios (R2 _fuentes/musica/propios). La biblioteca trap vieja queda solo para los fijos.
//
//   elegirMusica('id-del-video', { preferida: 'Nombre' })  → ruta del mp3 (y lo anota como usado)
//   - Si ese video ya tiene tema asignado, devuelve el mismo (re-renders del mismo video).
//   - 'preferida' (busca en el nombre, sin distinguir mayúsculas) tiene que estar libre; si está usada, error.
//   - Sin preferida, toma el tema libre MÁS NUEVO (el del día).
//   musicaFija('Locked In') → ruta de un tema reservado en "fijos" (plantillas que se repiten a propósito).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const REG = path.join(ROOT, 'scripts/musica-usada.json');
const DIR = path.join(ROOT, 'fuentes/musica/propios');
const DIR_FIJOS = path.join(ROOT, 'fuentes/musica/trap');

function listar(dir, r2) {
  // Siempre se sincroniza: el tema del día puede haberse compuesto en otra corrida o en otra PC.
  try { execFileSync('node', [path.join(ROOT, 'scripts/r2.mjs'), 'sync-down', r2, path.relative(ROOT, dir)], { stdio: 'ignore', cwd: ROOT }); }
  catch { if (!fs.existsSync(dir)) throw new Error(`No pude bajar la música de R2 (${r2}).`); }
  fs.mkdirSync(dir, { recursive: true });
  return fs.readdirSync(dir).filter(f => /\.(mp3|m4a|wav)$/i.test(f)).sort();
}
const leer = () => JSON.parse(fs.readFileSync(REG, 'utf8'));
const contiene = (archivo, nombre) => archivo.toLowerCase().includes(nombre.toLowerCase());

export function elegirMusica(video, { preferida = null } = {}) {
  const reg = leer(), libs = listar(DIR, '_fuentes/musica/propios');
  const propio = Object.entries(reg.usados).find(([, v]) => v.video === video);
  if (propio && libs.includes(propio[0])) return path.join(DIR, propio[0]);
  const ocupado = a => reg.usados[a] || reg.fijos[a];
  let tema;
  if (preferida) {
    tema = libs.find(a => contiene(a, preferida));
    if (!tema) throw new Error(`no encuentro "${preferida}" en fuentes/musica/propios`);
    if (ocupado(tema)) throw new Error(`"${tema}" ya se usó (${reg.usados[tema]?.video || 'reservado: ' + reg.fijos[tema]}). Cada video lleva su propia música: elegí otro tema.`);
  } else {
    // Los archivos empiezan con la fecha (AAAA-MM-DD - Nombre.mp3): el último libre es el más nuevo.
    tema = [...libs].reverse().find(a => !ocupado(a));
    if (!tema) throw new Error('No quedan temas originales sin usar: correr node scripts/beats/diario.mjs (compone el tema del día).');
  }
  reg.usados[tema] = { video, fecha: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }) };
  fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
  const libres = libs.filter(a => !reg.usados[a] && !reg.fijos[a]).length;
  console.log(`Música de "${video}": ${tema} (quedan ${libres} temas originales sin usar). Commitear scripts/musica-usada.json.`);
  return path.join(DIR, tema);
}

export function musicaFija(nombre) {
  const reg = leer(), tema = listar(DIR_FIJOS, '_fuentes/musica/trap').find(a => contiene(a, nombre));
  if (!tema || !reg.fijos[tema]) throw new Error(`"${nombre}" no está reservado como tema fijo en scripts/musica-usada.json`);
  return path.join(DIR_FIJOS, tema);
}
