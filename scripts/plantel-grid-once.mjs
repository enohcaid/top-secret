/**
 * One-off: arma una grilla base (correspondencia 100% garantizada, sin IA)
 * del plantel completo T3 con los renders ya aprobados de cada jugador +
 * nombre y dorsal correctos, en formato post de Instagram (4:5, 1086x1448).
 * Esta grilla se usa despues como referencia UNICA para pedirle a ChatGPT
 * que la pula/estilice, en vez de pedirle que componga 20 caras desde cero
 * (mucho mas propenso a error).
 *
 * Se puede borrar despues de correrlo.
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUT_DIR = process.env.PLACAS_OUT_DIR || path.resolve('.placas-tmp');

const ROSTER = [
  { key: 'Ivan_Cabj_La12', num: 12 },
  { key: 'rivarola90',     num: 2  },
  { key: 'Alexisraies23',  num: 3  },
  { key: 'Cabers14',       num: 5  },
  { key: 'Huber236',       num: 8  },
  { key: 'Juan_Martinez4', num: 6  },
  { key: 'RS32-DaniStone', num: 13 },
  { key: 'CipriMancini',   num: 32 },
  { key: 'Guiidow',        num: 20 },
  { key: 'BlackPanther-CG',num: 11 },
  { key: 'Lautavester7',   num: 7  },
  { key: 'yzytx0',         num: 99 },
  { key: 'Ramiro4588',     num: 96 },
  { key: 'Eli_No-SKILL',   num: 10 },
  { key: 'fedeavv9',       num: 9  },
  { key: 'CAT_FEL',        num: 55 },
  { key: 'Juanchyroman08', num: 18 },
  { key: 'Lil_Dekuroko',   num: 22 },
  { key: 'Mauriii-_1891',  num: 30 },
  { key: 'kee_viin03',     num: 21 },
];

const CANVAS_W = 1086;
const CANVAS_H = 1448;
const COLS = 4;
const ROWS = 5;
const MARGIN_X = 30;
const GRID_TOP = 190;
const GRID_BOTTOM_MARGIN = 20;

const COL_W = (CANVAS_W - MARGIN_X * 2) / COLS;
const ROW_H = (CANVAS_H - GRID_TOP - GRID_BOTTOM_MARGIN) / ROWS;
const IMG_H = Math.round(ROW_H - 40);
const IMG_W = Math.round(COL_W - 16);

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

async function bustCrop(key) {
  const src = path.resolve('Renders', key, 'Frente3.png');
  const meta = await sharp(src).metadata();
  const cropW = Math.round(meta.width * 0.74);
  const cropH = Math.round(meta.height * 0.455);
  const left = Math.round((meta.width - cropW) / 2);
  return sharp(src)
    .extract({ left, top: 0, width: cropW, height: cropH })
    .resize({ height: IMG_H, fit: 'inside' })
    .png()
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const composites = [];

  // Fondo: negro con franja diagonal azul sutil arriba (coherente con las
  // placas individuales ya aprobadas).
  const bgSvg = `
    <svg width="${CANVAS_W}" height="${CANVAS_H}">
      <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="#0d0d0d"/>
      <polygon points="0,0 ${CANVAS_W},0 ${CANVAS_W},70 0,150" fill="#4a9eff"/>
    </svg>`;
  composites.push({ input: Buffer.from(bgSvg), left: 0, top: 0 });

  // Escudo + titulo
  const crestBuf = await sharp(path.resolve('logos/TOP Secret White.png'))
    .resize({ height: 80 })
    .png()
    .toBuffer();
  const crestMeta = await sharp(crestBuf).metadata();
  composites.push({ input: crestBuf, left: MARGIN_X, top: 30 });

  const titleSvg = `
    <svg width="${CANVAS_W - MARGIN_X * 2 - crestMeta.width - 16}" height="80">
      <text x="0" y="34" font-family="Arial, sans-serif" font-weight="900" font-size="30" fill="#ffffff" letter-spacing="1">PLANTEL T3</text>
      <text x="0" y="66" font-family="Arial, sans-serif" font-weight="700" font-size="18" fill="#4a9eff" letter-spacing="1">TOP SECRET FC — PROXIMA TEMPORADA</text>
    </svg>`;
  composites.push({ input: Buffer.from(titleSvg), left: MARGIN_X + crestMeta.width + 16, top: 30 });

  // Grilla de jugadores
  for (let i = 0; i < ROSTER.length; i++) {
    const p = ROSTER[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cellX = Math.round(MARGIN_X + col * COL_W);
    const cellY = Math.round(GRID_TOP + row * ROW_H);

    const bustBuf = await bustCrop(p.key);
    const bustMeta = await sharp(bustBuf).metadata();
    const imgLeft = Math.round(cellX + (COL_W - bustMeta.width) / 2);
    composites.push({ input: bustBuf, left: imgLeft, top: cellY });

    // Numero (chip circular azul, esquina sup. derecha de la miniatura)
    const badgeSvg = `
      <svg width="34" height="34">
        <circle cx="17" cy="17" r="16" fill="#4a9eff" stroke="#0d0d0d" stroke-width="2"/>
        <text x="17" y="23" font-family="Arial, sans-serif" font-weight="900" font-size="16" fill="#ffffff" text-anchor="middle">${p.num}</text>
      </svg>`;
    composites.push({
      input: Buffer.from(badgeSvg),
      left: imgLeft + bustMeta.width - 26,
      top: cellY - 6,
    });

    // Nombre (debajo de la miniatura, centrado en la celda)
    const nameSvg = `
      <svg width="${Math.round(COL_W)}" height="30">
        <text x="${Math.round(COL_W / 2)}" y="20" font-family="Arial, sans-serif" font-weight="900" font-size="15" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">${esc(p.key.toUpperCase())}</text>
      </svg>`;
    composites.push({ input: Buffer.from(nameSvg), left: cellX, top: cellY + IMG_H + 4 });
  }

  const outPath = path.join(OUT_DIR, 'plantel-grid-base.png');
  await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: '#0d0d0d' } })
    .composite(composites)
    .png()
    .toFile(outPath);

  console.log('Grilla base guardada en:', outPath);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
