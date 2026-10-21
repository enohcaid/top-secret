// Portadas de las publicaciones de video (regla de Juan, 2026-10-21; docs/conocimiento/feedback_portadas.md).
//   const jpg = await portada({ imagen, kicker, titulo, dato, foco }, salida)   → JPG 1080x1920 (plantillas/portada.html)
//   conPortada(mp4, jpg, salida)  → el mismo video con la portada como 2 primeros cuadros (TikTok, YouTube Shorts y X
//                                    toman un cuadro del video como miniatura: así toman la portada)
//   subirPortada(jpg, clave)       → URL pública en R2 (/media/…) para Instagram (cover_url) y Facebook (miniatura)
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { chromium } from 'playwright';
import ffmpeg from 'ffmpeg-static';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { archivo } from './render.mjs';

export async function portada({ imagen, kicker = '', titulo = '', dato = '', foco = '50% 35%' }, salida) {
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/portada.html')));
    const img = /^https?:|^file:/.test(imagen) ? imagen : archivo(path.resolve(imagen));
    await p.evaluate(d => pintar(d), { imagen: img, kicker, titulo, dato, foco, escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')) });
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
    await p.waitForTimeout(300);
    await p.locator('#lienzo').screenshot({ path: salida, type: 'jpeg', quality: 92 });
  } finally { await b.close(); }
  return salida;
}

// Portada como primeros 2 cuadros (≈ 0,07 s): casi no se ve al reproducir, pero es lo que muestran como miniatura las
// redes que eligen un cuadro del video. El audio se corre lo mismo (silencio al principio).
export function conPortada(mp4, jpg, salida) {
  const info = spawnSync(ffmpeg, ['-hide_banner', '-i', mp4], { encoding: 'utf8' }).stderr;
  const fps = +(info.match(/(\d+(?:\.\d+)?) fps/) || [])[1] || 30;
  const [, w, h] = info.match(/Video:.*?(\d{3,4})x(\d{3,4})/) || [0, 1080, 1920];
  const dur = (2 / fps).toFixed(4);
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-framerate', String(fps), '-t', dur, '-i', jpg, '-i', mp4,
    '-filter_complex', `[0:v]scale=${w}:${h},setsar=1,format=yuv420p[p];[1:v]setsar=1,format=yuv420p[v];[p][v]concat=n=2:v=1:a=0[vo];[1:a]adelay=${Math.round(dur * 1000)}:all=1[ao]`,
    '-map', '[vo]', '-map', '[ao]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(fps), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', salida], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('conPortada: ' + r.stderr.slice(-300));
  return salida;
}

export async function subirPortada(jpg, clave) {
  await putFile(jpg, clave);
  return `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/${clave}?v=${Date.now().toString(36)}`;
}
