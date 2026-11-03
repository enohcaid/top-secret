// Render de las plantillas de redes (scripts/social/plantillas/*.html) con Playwright (Chromium headless):
//   - carrusel: una imagen JPG por escena, en su estado final
//   - video: cuadros a 30 fps (mostrar(n, t) en cada cuadro, determinístico) directo a ffmpeg + música
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { pathToFileURL } from 'url';
import { chromium } from 'playwright';
import ffmpeg from 'ffmpeg-static';
import { ROOT } from '../../lib/env.mjs';
import { rotuloEntrada } from '../../lib/musica.mjs';

const TAM = { post: { width: 1080, height: 1350 }, story: { width: 1080, height: 1920 }, yt: { width: 1920, height: 1080 } };
export const archivo = f => pathToFileURL(f).href;   // rutas locales → file:// para la plantilla

async function abrir(plantilla, formato, datos) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: TAM[formato], deviceScaleFactor: 1 });
  await page.goto(archivo(path.join(ROOT, 'scripts/social/plantillas', plantilla)));
  const n = await page.evaluate(([d, f]) => pintar(d, f), [datos, formato]);
  await page.evaluate(() => document.fonts.ready);
  // Que carguen todas las imágenes (renders, escudos, foto de portada) antes de capturar.
  await page.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
  await page.waitForTimeout(400);
  return { browser, page, n };
}

export async function carrusel(plantilla, datos, carpeta, prefijo = 'slide') {
  fs.mkdirSync(carpeta, { recursive: true });
  const { browser, page, n } = await abrir(plantilla, 'post', datos);
  const salida = [];
  for (let i = 0; i < n; i++) {
    await page.evaluate(i => mostrar(i, 99), i);
    const f = path.join(carpeta, `${prefijo}-${i + 1}.jpg`);
    await page.locator('#lienzo').screenshot({ path: f, type: 'jpeg', quality: 92 });
    salida.push(f);
  }
  await browser.close();
  return salida;
}

// Segundo del tema en que entra el primer gancho ("drop"), según la ficha del tema del día
// (scripts/beats/temas-diarios.json: bpm + estructura "intro 4 · gancho A 8 · …" en compases de 4 tiempos).
export function dropDelTema(musica) {
  try {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/beats/temas-diarios.json'), 'utf8'));
    const t = reg.temas.find(x => x.archivo === path.basename(musica));
    if (!t?.bpm || !t.estructura) return null;
    let compases = 0;
    for (const parte of t.estructura.split('·').map(s => s.trim())) {
      if (/^gancho/i.test(parte)) break;
      compases += Number((parte.match(/(\d+)\s*$/) || [])[1] || 0);
    }
    return { drop: compases * 4 * 60 / t.bpm, bpm: t.bpm };
  } catch { return null; }
}

// Fotos fijas → video vertical con fundidos, un tema de The Shorts y su tarjeta "Sonando ahora". Lo usa el carrusel de
// TikTok de la noticia del día (Juan, 2026-11-03: toda publicación diaria suena con The Shorts, y la biblioteca de
// sonidos de TikTok no los tiene, así que el carrusel de fotos sale como video).
export async function videoDeFotos(fotos, salida, { musica, porFoto = 5, fundido = 0.5 }) {
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  const { width: W, height: H } = TAM.story, m = fotos.length;
  const total = m * porFoto - (m - 1) * fundido;
  const args = ['-hide_banner', '-y'];
  for (const f of fotos) args.push('-loop', '1', '-framerate', '30', '-t', String(porFoto), '-i', f);
  args.push('-i', musica, ...(await rotuloEntrada(musica, W, H, total)));
  let fil = fotos.map((_, i) => `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=30,format=yuv420p[f${i}]`).join(';');
  let prev = 'f0';
  for (let i = 1; i < m; i++) { fil += `;[${prev}][f${i}]xfade=transition=fade:duration=${fundido}:offset=${(i * (porFoto - fundido)).toFixed(3)}[x${i}]`; prev = `x${i}`; }
  fil += `;[${prev}][${m + 1}:v]overlay=0:0:eof_action=pass[v]`;
  args.push('-filter_complex', fil, '-map', '[v]', '-map', `${m}:a`, '-t', total.toFixed(3),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '192k', '-af', `afade=t=in:d=0.3,afade=t=out:st=${(total - 1.2).toFixed(2)}:d=1.2`,
    '-movflags', '+faststart', salida);
  const ff = spawn(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; ff.stderr.on('data', d => { err = (err + d).slice(-2000); });
  const code = await new Promise(r => ff.on('close', r));
  if (code !== 0) throw new Error('ffmpeg falló: ' + err);
  return { salida, duracion: total };
}

// escenas: [{ n, dur }]; gancho: segundos de la pantalla de gancho al principio (0 = sin gancho).
// fps 60 + desenfoque: se renderiza a 60 cuadros y se mezclan de a 2 (desenfoque de movimiento real) → 30 fps.
// musicaDesde: segundo del tema en que arranca el audio (para que el drop caiga en el momento clave del video).
// formato: 'story' (vertical, por defecto) o 'yt' (horizontal 1920x1080, video de YouTube).
export async function video(plantilla, datos, salida, { escenas, gancho = 0, musica = null, fps = 30, desenfoque = false, musicaDesde = 0, formato = 'story' }) {
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  const { browser, page } = await abrir(plantilla, formato, datos);
  const total = gancho + escenas.reduce((s, e) => s + e.dur, 0);
  const args = ['-hide_banner', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  if (musica) {
    // Con música, la tarjeta "Sonando ahora" del tema (Tacet Sin) arriba, todo el video (scripts/lib/musica.mjs)
    args.push('-ss', musicaDesde.toFixed(3), '-i', musica, ...(await rotuloEntrada(musica, TAM[formato].width, TAM[formato].height, total)));
    args.push('-filter_complex', `[0:v]${desenfoque ? 'tmix=frames=2:weights=1 1,fps=30' : 'null'}[b];[b][2:v]overlay=0:0:eof_action=pass[v]`, '-map', '[v]', '-map', '1:a');
  } else if (desenfoque) args.push('-vf', 'tmix=frames=2:weights=1 1,fps=30');
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', desenfoque ? '30' : String(fps));
  if (musica) args.push('-c:a', 'aac', '-b:a', '192k', '-af', `afade=t=in:d=0.3,afade=t=out:st=${(total - 1.2).toFixed(2)}:d=1.2`, '-shortest');
  args.push('-movflags', '+faststart', salida);
  const ff = spawn(ffmpeg, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = ''; ff.stderr.on('data', d => { err = (err + d).slice(-2000); });
  // con -shortest ffmpeg puede cerrar la entrada en el último cuadro: sin esto Node se caía con 'write EOF', y esperando
  // un 'drain' que no llega se colgaba (2026-10-30). Cerrada la entrada, los cuadros que quedan se descartan.
  let cerrada = false;
  ff.stdin.on('error', e => { cerrada = true; err += ` · stdin: ${e.code}`; });
  ff.stdin.on('close', () => { cerrada = true; });
  const escribir = buf => cerrada ? Promise.resolve() : new Promise(r => {
    if (ff.stdin.write(buf)) return r();
    const listo = () => { for (const ev of ['drain', 'error', 'close']) ff.stdin.off(ev, listo); r(); };
    for (const ev of ['drain', 'error', 'close']) ff.stdin.on(ev, listo);
  });
  const cuadro = async () => escribir(await page.locator('#lienzo').screenshot({ type: 'jpeg', quality: 94 }));

  for (let k = 0; k < Math.round(gancho * fps); k++) { await page.evaluate(t => mostrar(0, t, true), k / fps); await cuadro(); }
  for (const e of escenas) {
    for (let k = 0; k < Math.round(e.dur * fps); k++) { await page.evaluate(([n, t]) => mostrar(n, t), [e.n, k / fps]); await cuadro(); }
  }
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  await browser.close();
  if (code !== 0) throw new Error('ffmpeg falló: ' + err);
  return { salida, duracion: total };
}
