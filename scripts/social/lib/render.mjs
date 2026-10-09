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

const TAM = { post: { width: 1080, height: 1350 }, story: { width: 1080, height: 1920 } };
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

// escenas: [{ n, dur }]; gancho: segundos de la pantalla de gancho al principio (0 = sin gancho).
export async function video(plantilla, datos, salida, { escenas, gancho = 0, musica = null, fps = 30 }) {
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  const { browser, page } = await abrir(plantilla, 'story', datos);
  const total = gancho + escenas.reduce((s, e) => s + e.dur, 0);
  const args = ['-hide_banner', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  if (musica) args.push('-i', musica);
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps));
  if (musica) args.push('-c:a', 'aac', '-b:a', '192k', '-af', `afade=t=in:d=0.3,afade=t=out:st=${(total - 1.2).toFixed(2)}:d=1.2`, '-shortest');
  args.push('-movflags', '+faststart', salida);
  const ff = spawn(ffmpeg, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = ''; ff.stderr.on('data', d => { err = (err + d).slice(-2000); });
  const escribir = buf => new Promise(r => ff.stdin.write(buf) ? r() : ff.stdin.once('drain', r));
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
