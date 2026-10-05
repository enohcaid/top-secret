#!/usr/bin/env node
// Arma el video vertical (1080×1920, 30 fps) de presentación del plantel o del equipo de la noche:
// cada jugador entra grande con su clip (acercamiento a cámara), muestra número / nombre / puesto y
// vuela a su lugar en la grilla, hasta que quedan todos.
//
//   node scripts/video-plantel/render.mjs                    → plantel completo (ROSTER_T4)
//   node scripts/video-plantel/render.mjs --modo equipo      → equipo de la noche (formación de la convocatoria, Firestore)
//   opciones: --fecha YYYY-MM-DD (equipo; default hoy ART) · --musica "<nombre>" · --sin-musica · --out archivo.mp4
//
// Antes: node scripts/video-plantel/prep.mjs (cuadros de cada jugador). Ver README.md.
import fs from 'fs';
import http from 'http';
import path from 'path';
import { spawn, execFileSync } from 'child_process';
import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { ROSTER_T4 } from '../../roster.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const D = path.join(ROOT, 'fuentes/video-plantel');
const argv = process.argv.slice(2);
const opt = (k, def = null) => { const i = argv.indexOf(k); return i < 0 ? def : argv[i + 1]; };
const MODO = opt('--modo', 'plantel');
const HOY = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
const FECHA = opt('--fecha', HOY);
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ── Jugadores y textos según el modo ──────────────────────────────────────────
const porKey = Object.fromEntries(ROSTER_T4.map(p => [p.key, p]));
let items, layout, header;
if (MODO === 'plantel') {
  items = ROSTER_T4.map(p => ({ key: p.key, num: p.num, puesto: p.posn }));
  layout = { tipo: 'grilla', cols: 4 };
  header = { eyebrow: 'Temporada 4 · 2026', title: 'Plantel' };
} else if (MODO === 'equipo') {
  // Formaciones y nombres de puesto: los mismos de convocatoria.html (única fuente)
  const conv = fs.readFileSync(path.join(ROOT, 'convocatoria.html'), 'utf8');
  const grab = name => { const m = conv.match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n\\});`)); return Function(`return ${m[1]}`)(); };
  const FORMATIONS = grab('FORMATIONS'), SLOT_LABEL_ES = grab('SLOT_LABEL_ES');
  const doc = await (await fetch('https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/convocatoria/state')).json();
  const lu = doc.fields?.lineup?.mapValue?.fields || {};
  const formation = lu.formation?.stringValue || '3-5-2';
  const slots = Object.fromEntries(Object.entries(lu.slots?.mapValue?.fields || {}).map(([k, v]) => [k, v.stringValue]));
  const captain = doc.fields?.captain?.stringValue;
  const def = FORMATIONS[formation];
  if (!def) throw new Error('formación desconocida: ' + formation);
  const vacios = def.filter(s => !slots[s.key] || !porKey[slots[s.key]]).map(s => s.key);
  if (vacios.length) console.log('Puestos sin jugador (no salen en el video):', vacios.join(', '));
  items = def.filter(s => porKey[slots[s.key]]).map(s => ({
    key: slots[s.key], num: porKey[slots[s.key]].num, slot: s.key, x: s.x, y: s.y,
    puesto: (SLOT_LABEL_ES[formation] || {})[s.key] || s.l, capitan: slots[s.key] === captain,
  }));
  layout = { tipo: 'formacion' };
  const dt = new Date(FECHA + 'T12:00:00Z');
  header = { eyebrow: `Equipo de hoy · ${formation}`, title: `${DIAS[dt.getUTCDay()]} ${dt.getUTCDate()} ${MESES[dt.getUTCMonth()]}` };
} else throw new Error('--modo plantel | equipo');

const faltan = items.filter(it => !fs.existsSync(path.join(D, 'frames', it.key, '150.jpg'))).map(it => it.key);
if (faltan.length) { console.error('Faltan cuadros, correr prep.mjs para:', faltan.join(' ')); process.exit(1); }
const provis = items.filter(it => fs.existsSync(path.join(D, 'frames', it.key, 'PROVISORIO'))).map(it => it.key);
if (provis.length) console.log(`Ojo: ${provis.length} jugadores con acercamiento simulado (sin clip de Canva): ${provis.join(', ')}`);

const OUT = path.resolve(opt('--out', path.join(D, MODO === 'plantel' ? 'plantel-t4.mp4' : `equipo-${FECHA}.mp4`)));
const MUSICA = argv.includes('--sin-musica') ? null : opt('--musica', MODO === 'plantel' ? 'Whoop' : 'Locked In');

// ── Servidor local (los cuadros tienen que venir por http para que el canvas no quede "tainted") ──
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(PAGE); }
  const f = path.join(D, u);
  if (!f.startsWith(D) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'image/jpeg' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;

const CFG = { items, layout, header, modo: MODO };
const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Barlow:wght@500;600&display=swap" rel="stylesheet">
<style>html,body{margin:0;background:#000}</style></head><body><canvas id="c" width="1080" height="1920"></canvas>
<script>window.CFG=${JSON.stringify(CFG)};</script>
<script>${fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'escena.js'), 'utf8')}</script>
</body></html>`;

// ── Render cuadro por cuadro → ffmpeg ─────────────────────────────────────────
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`http://localhost:${PORT}/`);
const total = await page.evaluate(() => window.ESCENA.preparar());
const tmp = OUT.replace(/\.mp4$/, '.sin-audio.mp4');
const ff = spawn(ffmpegPath, ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let f = 0; f < total; f++) {
  const b64 = await page.evaluate(n => window.ESCENA.cuadro(n), f);
  if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 150 === 0) process.stdout.write(`\r${f}/${total} cuadros`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close(); server.close();
console.log(`\r${total}/${total} cuadros en ${Math.round((Date.now() - t0) / 1000)} s`);

// ── Música (trap libre, regla del club): fundido de entrada 0,5 s y de salida 2 s, loudnorm ──
if (MUSICA) {
  const dirM = path.join(ROOT, 'fuentes/musica/trap');
  if (!fs.existsSync(dirM)) execFileSync('node', [path.join(ROOT, 'scripts/r2.mjs'), 'sync-down', '_fuentes/musica', 'fuentes/musica'], { stdio: 'inherit', cwd: ROOT });
  const mp3 = fs.readdirSync(dirM).find(f => f.toLowerCase().startsWith(MUSICA.toLowerCase()));
  if (!mp3) throw new Error('no encuentro la música ' + MUSICA);
  const dur = total / 30;
  execFileSync(ffmpegPath, ['-y', '-v', 'error', '-i', tmp, '-i', path.join(dirM, mp3),
    '-filter_complex', `[1:a]atrim=0:${dur},afade=t=in:d=0.5,afade=t=out:st=${(dur - 2).toFixed(2)}:d=2,loudnorm=I=-14:TP=-1.5,aresample=48000[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', OUT]);
  fs.rmSync(tmp);
  console.log('Música:', mp3);
} else fs.renameSync(tmp, OUT);
console.log('Listo:', OUT);
