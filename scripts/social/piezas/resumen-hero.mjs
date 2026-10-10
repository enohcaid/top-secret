#!/usr/bin/env node
// Portada del resumen semanal en video: foto de campaña NUEVA (ChatGPT) de los goleadores de la semana, animada con
// IA (Canva), para el fondo de la primera escena de "La semana en datos". Se cachea en fuentes/redes/resumen/<fecha>/.
//   node scripts/social/piezas/resumen-hero.mjs --fecha 2026-10-10 --jugadores nikileo527,NicoBJ_96,Lautavester7
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { generarImagen, cerrar } from '../lib/imagen.mjs';
import { animar, cuadros } from '../lib/clip.mjs';

const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i < 0 ? null : argv[i + 1]; };
const FECHA = opt('--fecha');
const jug = (opt('--jugadores') || '').split(',').filter(Boolean);
const dir = path.join(ROOT, 'fuentes/redes/resumen', FECHA);

const img = await generarImagen({
  id: 'hero', carpeta: dir, jugadores: jug, vertical: true,
  escena: `Foto de campaña heroica en el estadio de noche: ${jug.join(', ')} caminando juntos hacia cámara por el césped, en línea, con actitud de equipo que viene de ganar, miradas firmes a cámara, uno con la pelota bajo el brazo. Reflectores detrás que recortan las siluetas con luz dorada, tribunas desenfocadas, leve niebla baja sobre el pasto. Plano general bajo (cámara a la altura de las rodillas), cuerpos completos, mucho aire arriba para el título.`,
});
await cerrar();
console.log('imagen:', img);
const mp4 = animar(img, 'Travelling muy lento hacia atrás, a la altura del césped. Destellos suaves de los reflectores.');
const c = cuadros(mp4);
console.log('clip:', mp4, c.n, 'cuadros');
