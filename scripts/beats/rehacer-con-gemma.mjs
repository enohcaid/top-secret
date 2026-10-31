// Rehace un tema de Thrive entero con el método de Gemma (molde de partitura + historia + letra v2), manteniendo su título
// y concepto (Juan, 2026-10-31, tras aprobar "Asphalt Ghosts": "rehacer íntegramente las otras 3 canciones").
//   node scripts/beats/rehacer-con-gemma.mjs <slug> …   → después: node scripts/beats/thrive.mjs --revisar <slug>
import fs from 'node:fs';
const REG = new URL('./thrive.json', import.meta.url);
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const NOTA = 'Full remake with the new method: the previous version is discarded. Compose it from scratch for this concept — keep only the title and the concept, nothing from before.';
for (const slug of process.argv.slice(2)) {
  const t = reg.temas.find(x => x.slug === slug);
  if (!t) { console.log(`no existe ${slug}`); continue; }
  if (t.motor !== 'local') { t.motor = 'local'; t.conceptoPor = 'claude'; }
  const compas = 240 / t.bpm;
  // 2:00–2:30: con BPM lento entra una estructura más corta
  t.estructura = 140 / compas < 50 ? ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro']
    : ['intro', 'verse', 'pre-chorus', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'];
  t.duracion = 140;
  t.revision = { beat: NOTA, letra: NOTA };
  console.log(`${t.titulo}: ${t.bpm} BPM, ${Math.round(140 / compas)} compases, ${t.estructura.join(' ')}`);
}
fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
