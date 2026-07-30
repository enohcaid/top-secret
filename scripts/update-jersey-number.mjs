#!/usr/bin/env node
// Updates a player's current-squad (T3) jersey number across every file where it's
// duplicated, so a number change never has to be hunted down by hand again.
//
// Usage:
//   node scripts/update-jersey-number.mjs <gamertag> <newNumber> [--force]
//
// Two-phase: computes every edit and checks for dorsal conflicts FIRST, and only
// writes to disk if nothing conflicted (or --force was passed). No partial writes.
//
// Touches:
//   - plantilla.html                         (ROSTER_T3 only — ROSTER_T2 is historical, left untouched)
//   - convocatoria.html                      (PLAYERS array)
//   - scripts/generate-image-chatgpt.mjs     (PLAYER_TRAITS dorsal)
//   - scripts/chatgpt-project-instructions.md (roster table — mirror of the live ChatGPT project;
//     you must still paste the updated table into the ChatGPT project yourself)

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const [gamertag, newNumberRaw, ...flags] = process.argv.slice(2);
const force = flags.includes('--force');

if (!gamertag || !newNumberRaw || !/^\d+$/.test(newNumberRaw)) {
  console.error('Uso: node scripts/update-jersey-number.mjs <gamertag> <newNumber> [--force]');
  process.exit(1);
}
const newNumber = newNumberRaw;

function readUtf8(rel) {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}
function writeUtf8(rel, content) {
  writeFileSync(path.join(ROOT, rel), content, 'utf8');
}

const conflicts = [];
const pendingWrites = []; // { rel, content }
const skipped = [];       // files where the gamertag wasn't found (not every file lists everyone)

/* ─── plantilla.html : ROSTER_T3 only ─── */
{
  const rel = 'plantilla.html';
  const src = readUtf8(rel);
  const startMarker = 'const ROSTER_T3 = [';
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`No se encontró ROSTER_T3 en ${rel}`);
  const end = src.indexOf('\n];', start);
  if (end === -1) throw new Error(`No se encontró el cierre de ROSTER_T3 en ${rel}`);

  const block = src.slice(start, end);
  const numRe = new RegExp(`num:'${newNumber}'`);
  const keyRe = new RegExp(`key:'${gamertag}'`);
  const conflictLine = block.split('\n').find(l => numRe.test(l) && !keyRe.test(l));
  if (conflictLine) {
    conflicts.push(`${rel} (ROSTER_T3): el dorsal ${newNumber} ya está asignado a otro jugador → ${conflictLine.trim()}`);
  }

  const playerRe = new RegExp(`(key:'${gamertag}'[^\\n]*?num:')(\\d+)(')`);
  if (!playerRe.test(block)) {
    throw new Error(`No se encontró a '${gamertag}' en ROSTER_T3 de ${rel}`);
  }
  const newBlock = block.replace(playerRe, `$1${newNumber}$3`);
  if (newBlock !== block) {
    pendingWrites.push({ rel, content: src.slice(0, start) + newBlock + src.slice(end) });
  }
}

/* ─── convocatoria.html : PLAYERS array ─── */
{
  const rel = 'convocatoria.html';
  const src = readUtf8(rel);
  const startMarker = 'const PLAYERS = [';
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`No se encontró PLAYERS en ${rel}`);
  const end = src.indexOf('\n];', start);
  if (end === -1) throw new Error(`No se encontró el cierre de PLAYERS en ${rel}`);

  const block = src.slice(start, end);
  const numRe = new RegExp(`num:${newNumber}(?:\\D)`);
  const nameRe = new RegExp(`name:'${gamertag}'`);
  const conflictLine = block.split('\n').find(l => numRe.test(l) && !nameRe.test(l));
  if (conflictLine) {
    conflicts.push(`${rel} (PLAYERS): el dorsal ${newNumber} ya está asignado a otro jugador → ${conflictLine.trim()}`);
  }

  const playerRe = new RegExp(`(name:'${gamertag}'[^\\n]*?num:)(\\d+)`);
  if (!playerRe.test(block)) {
    throw new Error(`No se encontró a '${gamertag}' en PLAYERS de ${rel}`);
  }
  const newBlock = block.replace(playerRe, `$1${newNumber}`);
  if (newBlock !== block) {
    pendingWrites.push({ rel, content: src.slice(0, start) + newBlock + src.slice(end) });
  }
}

/* ─── scripts/generate-image-chatgpt.mjs : PLAYER_TRAITS ─── */
{
  const rel = 'scripts/generate-image-chatgpt.mjs';
  const src = readUtf8(rel);
  const playerRe = new RegExp(`('${gamertag}':\\s*\\{ dorsal: )(\\d+)`);
  if (playerRe.test(src)) {
    const newSrc = src.replace(playerRe, `$1${newNumber}`);
    if (newSrc !== src) pendingWrites.push({ rel, content: newSrc });
  } else {
    skipped.push(rel);
  }
}

/* ─── scripts/chatgpt-project-instructions.md : roster table ─── */
{
  const rel = 'scripts/chatgpt-project-instructions.md';
  const src = readUtf8(rel);
  const rowRe = new RegExp(`(\\| )(\\d+)( \\| ${gamertag} \\|)`);
  if (rowRe.test(src)) {
    const newSrc = src.replace(rowRe, `$1${newNumber}$3`);
    if (newSrc !== src) pendingWrites.push({ rel, content: newSrc });
  } else {
    skipped.push(rel);
  }
}

if (conflicts.length && !force) {
  console.error('Conflictos de dorsal detectados — no se escribió ningún archivo (usa --force para ignorar):');
  conflicts.forEach(c => console.error('  - ' + c));
  process.exit(1);
}

if (!pendingWrites.length) {
  console.log(`${gamertag} ya tiene el dorsal ${newNumber} en todos los archivos. Nada que hacer.`);
  process.exit(0);
}

for (const { rel, content } of pendingWrites) writeUtf8(rel, content);

console.log(`Dorsal de ${gamertag} actualizado a ${newNumber} en:`);
pendingWrites.forEach(({ rel }) => console.log('  - ' + rel));
if (skipped.length) {
  console.log('Sin cambios (no listan a este jugador):');
  skipped.forEach(rel => console.log('  - ' + rel));
}
if (conflicts.length) {
  console.warn('Advertencias (ignoradas por --force):');
  conflicts.forEach(c => console.warn('  - ' + c));
}
console.log('\nRecordá: si tocaste scripts/chatgpt-project-instructions.md, también hay que pegar');
console.log('la tabla actualizada en las instrucciones del proyecto ChatGPT "TOP Secret FC" (ese archivo es solo un espejo).');
console.log('No se tocó ROSTER_T2 en plantilla.html (es el historial de la temporada anterior).');
