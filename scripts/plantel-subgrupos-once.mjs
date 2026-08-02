/**
 * One-off: arma 4 placas de referencia (5 jugadores cada una, cuerpo
 * entero, renders ya aprobados) para pasarle a ChatGPT como material de
 * identidad/kit y que arme la foto grupal del plantel T3 en la cancha.
 * Correspondencia 100% garantizada porque se arma por codigo, no IA.
 * Se puede borrar despues de correrlo.
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUT_DIR = process.env.PLACAS_OUT_DIR || path.resolve('.placas-tmp');

const GROUPS = [
  {
    name: 'grupo1-arco-defensa',
    players: [
      { key: 'Ivan_Cabj_La12', num: 12 },
      { key: 'rivarola90',     num: 2  },
      { key: 'Alexisraies23',  num: 3  },
      { key: 'Cabers14',       num: 5  },
      { key: 'CAT_FEL',        num: 55 },
    ],
  },
  {
    name: 'grupo2-lateral-medio',
    players: [
      { key: 'Huber236',       num: 8  },
      { key: 'Juan_Martinez4', num: 6  },
      { key: 'RS32-DaniStone', num: 13 },
      { key: 'CipriMancini',   num: 32 },
      { key: 'Guiidow',        num: 20 },
    ],
  },
  {
    name: 'grupo3-medio-delantero',
    players: [
      { key: 'Eli_No-SKILL',    num: 10 },
      { key: 'Lil_Dekuroko',    num: 22 },
      { key: 'Mauriii-_1891',   num: 30 },
      { key: 'BlackPanther-CG', num: 11 },
      { key: 'Lautavester7',    num: 7  },
    ],
  },
  {
    name: 'grupo4-delanteros',
    players: [
      { key: 'yzytx0',         num: 99 },
      { key: 'Ramiro4588',     num: 96 },
      { key: 'fedeavv9',       num: 9  },
      { key: 'Juanchyroman08', num: 18 },
      { key: 'kee_viin03',     num: 21 },
    ],
  },
];

const CELL_H = 900;
const CELL_W = 620;
const LABEL_H = 40;

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

async function playerCell(p) {
  const src = path.resolve('Renders', p.key, 'Frente3.png');
  const bodyBuf = await sharp(src)
    .resize({ width: CELL_W, height: CELL_H - LABEL_H, fit: 'inside' })
    .png()
    .toBuffer();
  const bodyMeta = await sharp(bodyBuf).metadata();

  const composites = [{ input: bodyBuf, left: Math.round((CELL_W - bodyMeta.width) / 2), top: 0 }];

  const labelSvg = `
    <svg width="${CELL_W}" height="${LABEL_H}">
      <rect width="${CELL_W}" height="${LABEL_H}" fill="#0d0d0d"/>
      <text x="${CELL_W / 2}" y="27" font-family="Arial, sans-serif" font-weight="900" font-size="22" fill="#ffffff" text-anchor="middle">${esc(p.key.toUpperCase())} · #${p.num}</text>
    </svg>`;
  composites.push({ input: Buffer.from(labelSvg), left: 0, top: CELL_H - LABEL_H });

  return sharp({ create: { width: CELL_W, height: CELL_H, channels: 4, background: '#0d0d0d' } })
    .composite(composites)
    .png()
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const group of GROUPS) {
    const composites = [];
    for (let i = 0; i < group.players.length; i++) {
      const cellBuf = await playerCell(group.players[i]);
      composites.push({ input: cellBuf, left: i * CELL_W, top: 0 });
    }
    const outPath = path.join(OUT_DIR, `${group.name}.png`);
    await sharp({ create: { width: CELL_W * group.players.length, height: CELL_H, channels: 4, background: '#0d0d0d' } })
      .composite(composites)
      .png()
      .toFile(outPath);
    console.log('Guardado:', outPath);
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
