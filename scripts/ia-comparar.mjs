#!/usr/bin/env node
// Compara modelos locales (Ollama) en tareas reales del proyecto, para decidir cuál usa cada tarea automática
// (Juan, 2026-10-26: "implementemos la nueva IA y veamos qué tan necesario es un modelo alto").
//
//   node scripts/ia-comparar.mjs [modelo…]      → pruebas/ia-comparar/<tarea>__<modelo>.json + resumen.md
import fs from 'fs';
import path from 'path';
import { ROOT } from './lib/env.mjs';
import { ollama } from './lib/ia.mjs';

const MODELOS = process.argv.slice(2).length ? process.argv.slice(2) : ['qwen3:8b', 'qwen3:14b', 'gemma3:12b', 'deepseek-r1:8b'];
const OUT = path.join(ROOT, 'pruebas', 'ia-comparar');
fs.mkdirSync(OUT, { recursive: true });

const datosSemana = {
  contexto: 'Resumen de la semana 1 (20/10 a 26/10) en Espacio Gamer, primera semana de la competencia oficial',
  liga: 'Espacio Gamer',
  record: '4 partidos: 3 victorias, 1 empate, 0 derrotas · 6 goles a favor, 3 en contra · 10 puntos',
  partidos: ['martes 20/10: Top Secret 1-0 Sub 21 (visitante)', 'jueves 22/10: Top Secret 3-3 SF Drysdale (local)',
    'jueves 22/10: Top Secret 1-0 Los Picantes (local)', 'jueves 22/10: Top Secret 1-0 InfinitX (visitante)'],
  goleadores: ['Lautavester7: 3 goles (dos ante SF Drysdale, el último de tijera en el descuento para el 3-3)', 'pepolemmo2710: 1 gol', 'Cabers14: 1 gol (de cabeza)', 'NicoBJ_96: 1 gol'],
  vivo: 'Los partidos se transmiten en vivo por Twitch, Kick, YouTube e Instagram (topsecretfc)',
};
const TAREAS = {
  thrive: fs.readFileSync(path.join(ROOT, 'scripts/beats/thrive-encargo.md'), 'utf8')
    .replace('{{FECHA}}', '2026-10-26').replace('{{ANTERIORES}}', '(none yet: this is the first song of the album)'),
  redes: fs.readFileSync(path.join(ROOT, 'scripts/social/textos-encargo.md'), 'utf8')
    .replace('{{PIEZA}}', 'Formato "La semana en datos": un carrusel de 6 placas (portada, resultados, goleadores, mejor promedio, el equipo en números, lo que viene) y un video vertical de 25 s con las mismas escenas animadas y música original del club.')
    .replace('{{DATOS}}', JSON.stringify(datosSemana, null, 2)),
};

const resumen = ['| tarea | modelo | segundos | JSON ok |', '|---|---|---|---|'];
for (const modelo of MODELOS) for (const [tarea, prompt] of Object.entries(TAREAS)) {
  process.stdout.write(`${tarea} · ${modelo}… `);
  let texto = '', segundos = 0, ok = false;
  try {
    ({ texto, segundos } = await ollama(prompt, { modelo, json: true, temperatura: tarea === 'thrive' ? 0.9 : 0.7 }));
    try { texto = JSON.stringify(JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1)), null, 2); ok = true; } catch {}
  } catch (e) { texto = `ERROR: ${e.message}`; }
  fs.writeFileSync(path.join(OUT, `${tarea}__${modelo.replace(/[:/]/g, '-')}.json`), texto);
  resumen.push(`| ${tarea} | ${modelo} | ${segundos} | ${ok ? 'sí' : 'no'} |`);
  console.log(`${segundos} s, ${ok ? 'ok' : 'JSON inválido'}`);
}
fs.writeFileSync(path.join(OUT, 'resumen.md'), resumen.join('\n') + '\n');
console.log(resumen.join('\n'));
