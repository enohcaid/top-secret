/**
 * Cuatro fotos grupales del plantel T4 armadas con los renders reales (caras y dorsales exactos):
 *   A "campana"  — tres planos, atrás brazos cruzados, adelante los gestos (señalar, músculo, saludo)
 *   B "piramide" — el capitán al frente y el resto abriéndose en V hacia atrás
 *   C "bloque"   — todos apretados, mezclando las cuatro poses, arqueros en las puntas
 *   D "noche"    — dos filas en zigzag, luz cenital fría con borde dorado
 * Poses: Renders/<gt>/{Brazos4,Pose4,Gesto4,Unica4}.png (1024x1536, misma escala → un agachado queda más bajo).
 * Salida: fuentes/grupales/grupal-t4-<id>.png (original) y logos/grupales/grupal-t4-<id>-<ver>.webp (web, se sube a R2).
 * Uso: node scripts/fotos-grupales-t4.mjs [--subir]
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { putFile } from './lib/r2.mjs';

const W = 3200, H = 1700, CANVAS_H = 1536;
const VER = Date.now().toString(36).slice(-6);
const SUBIR = process.argv.includes('--subir');

const cache = new Map();
async function cutout(key, pose) {
  const id = key + pose;
  if (!cache.has(id)) {
    const src = `Renders/${key}/${pose}.png`;
    const { data, info } = await sharp(src).trim({ threshold: 5 }).png().toBuffer({ resolveWithObject: true });
    const top = -(info.trimOffsetTop || 0);
    cache.set(id, { data, w: info.width, h: info.height, offBottom: CANVAS_H - top - info.height });
  }
  return cache.get(id);
}

// Fondos: estudio dorado, foco cenital, gris acero, noche.
const BG = {
  oro: `<radialGradient id="g" cx="50%" cy="34%" r="64%"><stop offset="0" stop-color="#4a3512"/><stop offset=".42" stop-color="#1a130a"/><stop offset="1" stop-color="#0B0A07"/></radialGradient>`,
  foco: `<radialGradient id="g" cx="50%" cy="-8%" r="95%"><stop offset="0" stop-color="#6b5226"/><stop offset=".35" stop-color="#241a0c"/><stop offset=".7" stop-color="#0e0b07"/><stop offset="1" stop-color="#070605"/></radialGradient>`,
  acero: `<radialGradient id="g" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#2c2a26"/><stop offset=".5" stop-color="#141311"/><stop offset="1" stop-color="#080807"/></radialGradient>`,
  noche: `<radialGradient id="g" cx="50%" cy="0%" r="90%"><stop offset="0" stop-color="#1d2a3a"/><stop offset=".45" stop-color="#0d121a"/><stop offset="1" stop-color="#06070a"/></radialGradient>`,
};
const bgSvg = (kind, extra = '') => Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs>${BG[kind]}</defs><rect width="100%" height="100%" fill="url(#g)"/>${extra}</svg>`);
const fadeBottom = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset=".62" stop-color="#0B0A07" stop-opacity="0"/><stop offset="1" stop-color="#0B0A07" stop-opacity="1"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#f)"/></svg>`);

/**
 * rows: de atrás hacia adelante. { scale, floor, spread, light, blur, players: [[gt, pose, dy, k, dx]] }
 * k = escala extra, dx = corrimiento horizontal en px (para romper la grilla).
 */
async function compose({ id, bg, bgExtra = '', rows, tint }) {
  const comps = [];
  for (const row of rows) {
    const n = row.players.length;
    const slot = (W * row.spread) / n, x0 = (W - W * row.spread) / 2;
    for (const [i, [key, pose, dy = 0, k = 1, dx = 0]] of row.players.entries()) {
      if (!key) continue;   // hueco: el lugar cuenta pero queda libre
      const c = await cutout(key, pose);
      const f = row.scale * k, w = Math.round(c.w * f), h = Math.round(c.h * f);
      let img = sharp(c.data).resize({ width: w, height: h }).modulate({ brightness: row.light });
      if (row.blur) img = img.blur(row.blur);
      const cx = x0 + slot * (i + 0.5) + dx;
      const floorY = row.floor + dy;
      const top = Math.round(floorY - (c.h + c.offBottom) * f), left = Math.round(cx - w / 2);
      // sombra de contacto en el piso
      const sw = Math.round(w * 0.78), sh = Math.round(46 * f / 0.6);
      comps.push({ input: await sharp(Buffer.from(`<svg width="${sw * 2}" height="${sh * 4}" xmlns="http://www.w3.org/2000/svg"><ellipse cx="${sw}" cy="${sh * 2}" rx="${sw / 2}" ry="${sh / 2}" fill="#000" fill-opacity=".72"/></svg>`)).blur(14).png().toBuffer(),
        left: Math.round(cx - sw), top: Math.round(floorY - sh * 2 - 8) });
      comps.push({ input: await img.png().toBuffer(), left, top });
    }
  }
  if (tint) comps.push({ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${tint}</svg>`), left: 0, top: 0, blend: 'soft-light' });
  comps.push({ input: fadeBottom, left: 0, top: 0 });
  const png = `fuentes/grupales/grupal-t4-${id}.png`;
  fs.mkdirSync(path.dirname(png), { recursive: true });
  // sharp no deja componer con recortes que se salen del lienzo: se arma en uno más grande y se recorta
  const PAD = 600;
  const big = await sharp(bgSvg(bg, bgExtra)).resize(W, H).extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: '#0B0A07' })
    .composite(comps.map(c => ({ ...c, left: c.left + PAD, top: c.top + PAD }))).png().toBuffer();
  await sharp(big).extract({ left: PAD, top: PAD, width: W, height: H }).png().toFile(png);
  const webp = `logos/grupales/grupal-t4-${id}-${VER}.webp`;
  fs.mkdirSync(path.dirname(webp), { recursive: true });
  await sharp(png).resize({ width: 2400 }).webp({ quality: 82 }).toFile(webp);
  if (SUBIR) await putFile(webp, webp, 'image/webp');
  console.log(id.padEnd(9), webp, Math.round(fs.statSync(webp).size / 1024) + ' KB');
}

// ── A · Campaña: atrás brazos cruzados, adelante los gestos; el goleador al centro ──
await compose({ id: 'campana', bg: 'oro', rows: [
  { scale: .55, floor: 1050, spread: .82, light: .66, blur: 1.2, players: [
    ['Huber236', 'Brazos4', 20], ['rivarola90', 'Brazos4', -10], ['Elianja20', 'Brazos4', -40, 1.03], ['adri_cai', 'Brazos4', -40, 1.03], ['pepolemmo2710', 'Brazos4', -10], ['Alexisraies23', 'Brazos4', 20]] },
  { scale: .66, floor: 1330, spread: .78, light: .84, blur: .5, players: [
    ['Guiidow', 'Unica4', 20], ['Cabers14', 'Brazos4', 0], ['Lil_Dekuroko', 'Unica4', -20], ['Juan_Martinez4', 'Brazos4', -40, 1.05], ['RS32-DaniStone', 'Unica4', -20], ['endiabladorojo66', 'Brazos4', 0]] },
  { scale: .79, floor: 1665, spread: .7, light: 1, players: [
    ['Ivan_Cabj_La12', 'Gesto4', 50], ['nikileo527', 'Gesto4', 10], ['NicoBJ_96', 'Gesto4', -10, 1.06], ['CipriMancini', 'Gesto4', 10], ['Lautavester7', 'Gesto4', 50]] },
] });

// ── B · Pirámide: el capitán adelante, el resto se abre en V hacia atrás ──
await compose({ id: 'piramide', bg: 'foco', bgExtra: `<ellipse cx="${W / 2}" cy="${H * .93}" rx="${W * .42}" ry="110" fill="#c8a84b" fill-opacity=".07"/>`, rows: [
  { scale: .5, floor: 1000, spread: .92, light: .62, blur: 1.4, players: [
    ['adri_cai', 'Pose4', 30], ['Huber236', 'Pose4', 0], ['Alexisraies23', 'Pose4', -20], ['rivarola90', 'Brazos4', -30], ['Elianja20', 'Brazos4', -30], ['Lil_Dekuroko', 'Pose4', -20], ['endiabladorojo66', 'Pose4', 0], ['Ivan_Cabj_La12', 'Pose4', 30]] },
  { scale: .62, floor: 1270, spread: .6, light: .82, blur: .6, players: [
    ['Guiidow', 'Brazos4', 0], ['Cabers14', 'Brazos4', -10], ['RS32-DaniStone', 'Brazos4', -10], ['pepolemmo2710', 'Brazos4', 0]] },
  { scale: .76, floor: 1560, spread: .66, light: .95, players: [
    ['Lautavester7', 'Gesto4', 30], ['nikileo527', 'Unica4', 0], [null], ['NicoBJ_96', 'Unica4', 0], ['CipriMancini', 'Gesto4', 30]] },
  { scale: .9, floor: 1700, spread: .2, light: 1.04, players: [['Juan_Martinez4', 'Gesto4', 0, 1.02]] },
] });

// ── C · Bloque: todos apretados, poses mezcladas, arqueros en las puntas ──
await compose({ id: 'bloque', bg: 'acero', tint: `<rect width="100%" height="100%" fill="#c8a84b" fill-opacity=".18"/>`, rows: [
  { scale: .6, floor: 1180, spread: .66, light: .7, blur: 1, players: [
    ['adri_cai', 'Unica4', 40], ['Elianja20', 'Pose4', 0], ['Alexisraies23', 'Gesto4', -20], ['rivarola90', 'Unica4', -30], ['Huber236', 'Gesto4', -20], ['Cabers14', 'Pose4', 0], ['Ivan_Cabj_La12', 'Unica4', 40]] },
  { scale: .72, floor: 1470, spread: .6, light: .9, blur: .4, players: [
    ['Guiidow', 'Gesto4', 10, 1, 30], ['Lil_Dekuroko', 'Brazos4', -10], ['Juan_Martinez4', 'Unica4', -30, 1.03], ['pepolemmo2710', 'Gesto4', -10], ['endiabladorojo66', 'Unica4', 10, 1, -30]] },
  { scale: .84, floor: 1720, spread: .5, light: 1, players: [
    ['nikileo527', 'Brazos4', 30, 1, 40], ['NicoBJ_96', 'Brazos4', 0, 1.04], ['Lautavester7', 'Brazos4', 0], ['CipriMancini', 'Brazos4', 0], ['RS32-DaniStone', 'Brazos4', 30, 1, -40]] },
] });

// ── D · Noche: dos filas en zigzag, luz cenital fría con borde dorado ──
await compose({ id: 'noche', bg: 'noche', bgExtra: `<g fill="#9fc0ff" fill-opacity=".05"><polygon points="${W * .2},0 ${W * .32},0 ${W * .5},${H} ${W * .1},${H}"/><polygon points="${W * .68},0 ${W * .8},0 ${W * .9},${H} ${W * .5},${H}"/></g>`,
  tint: `<defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb4ff" stop-opacity=".22"/><stop offset="1" stop-color="#c8a84b" stop-opacity=".25"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#t)"/>`, rows: [
  { scale: .6, floor: 1220, spread: .9, light: .78, blur: .8, players: [
    ['Ivan_Cabj_La12', 'Brazos4', 0], ['Huber236', 'Gesto4', -30], ['rivarola90', 'Brazos4', 10], ['Elianja20', 'Gesto4', -30], ['Cabers14', 'Brazos4', 10], ['Juan_Martinez4', 'Gesto4', -40, 1.02], ['Lil_Dekuroko', 'Brazos4', 10], ['pepolemmo2710', 'Gesto4', -30], ['adri_cai', 'Brazos4', 0]] },
  { scale: .76, floor: 1640, spread: .8, light: 1, players: [
    ['Guiidow', 'Unica4', 40], ['Alexisraies23', 'Brazos4', 0], ['nikileo527', 'Unica4', -20], ['NicoBJ_96', 'Gesto4', -30, 1.04], ['Lautavester7', 'Unica4', -20], ['CipriMancini', 'Unica4', 0], ['RS32-DaniStone', 'Gesto4', 30], ['endiabladorojo66', 'Brazos4', 40]] },
] });
