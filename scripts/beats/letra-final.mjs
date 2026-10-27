#!/usr/bin/env node
// Letra de la versión final de cada tema (Juan, 2026-10-26: "que las letras sean más precisas en función de la versión
// final"). ACE-Step no siempre canta la letra tal cual se escribió: repite, corta, cambia palabras o el orden. Acá:
// 1. Whisper transcribe la versión final (scripts/beats/transcribir.py, GTX 1070).
// 2. Claude, en una llamada liviana (scripts/lib/ia.mjs), cruza la transcripción con la letra escrita: el orden, las
//    repeticiones y lo que se cambió salen de lo que se canta; la ortografía de las palabras, de la letra escrita
//    (Whisper confunde palabras con la música encima).
// 3. Guarda `letraFinal` en letras.json (The Shorts) o thrive.json y rearma el catálogo de topsecret.ar/music.
//
//   node scripts/beats/letra-final.mjs [--solo <slug>] [--rehacer]
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { ROOT, loadEnv } from '../lib/env.mjs';
import { getFile } from '../lib/r2.mjs';
import { pedirTexto } from '../lib/ia.mjs';
import { armarCatalogo } from './catalogo.mjs';

loadEnv();
const argv = process.argv.slice(2);
const SOLO = argv.includes('--solo') ? argv[argv.indexOf('--solo') + 1] : null, REHACER = argv.includes('--rehacer');
const PY = path.join(ROOT, 'fuentes/beats/whisper/.venv/Scripts/python.exe');
const TMP = path.join(ROOT, 'fuentes/beats/whisper/tmp');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [letra-final] ${m}`);
fs.mkdirSync(TMP, { recursive: true });

const FUENTES = [
  { archivo: path.join(ROOT, 'scripts/beats/letras.json'), lista: j => j, audio: t => t.voz, local: t => path.join(ROOT, 'fuentes/beats/voz', `${t.slug}.mp3`) },
  { archivo: path.join(ROOT, 'scripts/beats/thrive.json'), lista: j => j.temas, audio: t => t.audio, local: t => path.join(ROOT, 'fuentes/beats/thrive', `${t.slug}.mp3`) },
];

export async function letraFinal(t, mp3) {
  const pista = path.join(TMP, `${t.slug}.txt`), trans = path.join(TMP, `${t.slug}.json`);
  fs.writeFileSync(pista, t.letra.replace(/\[[^\]]+\]/g, ''));
  const r = spawnSync(PY, [path.join(ROOT, 'scripts/beats/transcribir.py'), mp3, trans, pista], {
    encoding: 'utf8', env: { ...process.env, PATH: `${path.dirname(ffmpegPath)}${path.delimiter}${process.env.PATH}`, PYTHONIOENCODING: 'utf-8' } });
  if (r.status !== 0) throw new Error(`Whisper falló: ${(r.stderr || '').slice(-300)}`);
  const segs = JSON.parse(fs.readFileSync(trans, 'utf8'));
  const prompt = `You are preparing the published lyrics of a song so they match EXACTLY what is sung in the final recording.

WRITTEN LYRICS (what the singer was given; correct spelling and wording):
${t.letra}

TRANSCRIPT of the final recording (automatic, with start times in seconds; it mishears words under the music, may produce garbage during intros or dense parts, and may add a hallucinated "Thank you." at the end):
${segs.map(s => `[${s.ini}] ${s.texto}`).join('\n')}

Write the lyrics as they are actually sung:
- Follow the transcript for the ORDER of lines, REPEATS (a chorus sung twice, a line doubled), lines that were SKIPPED, cut short or split, and words the singer clearly changed or added (ad-libs like "hey", "oh" only when clearly sung).
- When a transcript line is a mishearing of a written line (similar sounds), use the written wording.
- Where the transcript is garbage or missing (intro, dense passages), keep the written lines that belong there.
- Ignore hallucinations (e.g. a final "Thank you.").
- Keep the section tags ([intro], [verse], [pre-chorus], [chorus], [bridge], [outro]) on their own lines, placed where those sections are actually sung. Instrumental sections with no singing get no lines.
Answer ONLY with the lyrics, nothing else.`;
  const letra = await pedirTexto(prompt, { orden: ['local', 'claude'], claudeModelo: 'sonnet', tarea: 'letra-final', validar: x => (!/\[(verse|chorus)[^\]]*\]/i.test(x) ? 'sin etiquetas de sección' : x.split('\n').filter(l => l.trim() && !/^\[/.test(l.trim())).length < 8 ? 'letra demasiado corta' : null) });
  return letra.replace(/^```\w*\n?|```$/g, '').trim();
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  for (const F of FUENTES) {
    if (!fs.existsSync(F.archivo)) continue;
    const json = JSON.parse(fs.readFileSync(F.archivo, 'utf8'));
    for (const t of F.lista(json)) {
      // `fijo`: el tema queda como salió, no se toca (Juan, 2026-10-26, sobre "Too Far In")
      if ((SOLO && t.slug !== SOLO) || t.fijo || !F.audio(t) || !t.letra || (t.letraFinal && !REHACER)) continue;
      try {
        const mp3 = F.local(t);
        if (!fs.existsSync(mp3)) { fs.mkdirSync(path.dirname(mp3), { recursive: true }); await getFile(F.audio(t).split('?')[0], mp3); }
        log(`${t.titulo}…`);
        t.letraFinal = await letraFinal(t, mp3);
        fs.writeFileSync(F.archivo, JSON.stringify(json, null, 2) + '\n');
        log(`  ✓ ${t.letraFinal.split('\n').filter(l => l.trim() && !l.startsWith('[')).length} versos`);
      } catch (e) { log(`  ✗ ${t.titulo}: ${e.message}`); }
    }
  }
  fs.rmSync(TMP, { recursive: true, force: true });
  await armarCatalogo({ log });
}
