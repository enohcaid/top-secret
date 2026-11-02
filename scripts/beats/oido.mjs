// El "oído" sobre el tema entero (Juan, 2026-11-01: "las chances de que esto salga bien sin que puedas escuchar son
// bajísimas"). Corta la instrumental y el cover de ACE-Step en las secciones de la partitura y le pasa cada par a
// oido.py: letra cantada (Whisper, con 1,5 s de margen: en el cover la voz entra un poco antes o después), pulso de la
// batería conservado (¿aplanó un cambio de beat?) y voz presente. thrive.mjs repite el cover con otra semilla si falla.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { ROOT } from '../lib/env.mjs';

const PY = path.join(ROOT, 'fuentes/beats/whisper/.venv/Scripts/python.exe');
// calibrado el 01/11 con "Borrowed Time" v1 (cover a 0,5 que corría la letra y aplanaba): dos partes distintas del beat
// dan ~0.1 de pulso; aquel cover, 0.3–0.4; la letra de su primer estribillo, que no se cantó, ~0
export const UMBRAL = { letra: 0.5, beat: 0.35, voz: 1.05 };

const bloques = letra => { const p = letra.split(/^\s*\[([^\]]+)\]\s*$/m), out = []; for (let i = 1; i < p.length; i += 2) out.push({ tag: p[i].trim(), texto: p[i + 1].trim() }); return out; };
const cortar = (src, desde, largo, dst) => spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(Math.max(0, desde)), '-t', String(largo), '-i', src, '-ac', '1', '-ar', '16000', dst]);

export function oirTema({ instrumental, cantado, secciones, letra, carpeta }) {
  const b = bloques(letra);
  if (b.length !== secciones.length) return { error: `la letra tiene ${b.length} secciones y el beat ${secciones.length}` };
  const dir = path.join(carpeta, 'oido'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const tramos = secciones.map((s, i) => {
    const largo = s.fin - s.inicio, f = k => path.join(dir, `${k}-${i}.wav`);
    cortar(instrumental, s.inicio, largo, f('beat')); cortar(cantado, s.inicio, largo, f('voz')); cortar(cantado, s.inicio - 1.5, largo + 3, f('letra'));
    const conLetra = !/instrumental/i.test(b[i].tag) && b[i].texto.replace(/\(.*?\)/g, '').trim();
    return { src: f('beat'), salida: f('voz'), salida_letra: f('letra'), letra: conLetra ? b[i].texto : '', nombre: s.nombre };
  });
  const trabajo = path.join(dir, 'trabajo.json');
  fs.writeFileSync(trabajo, JSON.stringify({ tramos }, null, 2));
  const r = spawnSync(PY, [path.join(ROOT, 'scripts/beats/oido.py'), trabajo], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PATH: `${path.dirname(ffmpegPath)}${path.delimiter}${process.env.PATH}` } });
  const m = (r.stdout || '').match(/OIDO=(.+)/);
  if (!m) return { error: `el oído no respondió: ${(r.stderr || '').trim().split('\n').pop()}` };
  // el beat no se controla en intro (radio) ni outro (fundido): dan pulso bajo siempre
  const secs = JSON.parse(m[1]).map((o, i) => {
    const t = tramos[i];
    const fallas = [o.letra !== undefined && o.letra < UMBRAL.letra && `letra ${o.letra}`, !['intro', 'outro'].includes(t.nombre) && o.beat < UMBRAL.beat && `beat ${o.beat}`, t.letra && o.voz < UMBRAL.voz && `voz ${o.voz}`].filter(Boolean);
    return { seccion: `${t.nombre} ${i + 1}`, letra: o.letra, beat: o.beat, voz: o.voz, fallas };
  });
  fs.rmSync(dir, { recursive: true, force: true });
  const conLetra = secs.filter(s => s.letra !== undefined);
  return { secciones: secs, fallas: secs.reduce((n, s) => n + s.fallas.length, 0),
    puntaje: +(conLetra.reduce((a, s) => a + s.letra, 0) / Math.max(1, conLetra.length) + secs.reduce((a, s) => a + s.beat, 0) / secs.length).toFixed(3) };
}
