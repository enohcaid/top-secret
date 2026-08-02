/**
 * Genera las placas definitivas de "nuevo fichaje" (1080x1080, IG post) para
 * los 11 fichajes de Temporada 3. Estilo aprobado: diagonal negro/azul,
 * medio cuerpo (cintura arriba), pose fachera variada por jugador, dorsal
 * chico en una esquina. Prompt deliberadamente simple: una version anterior
 * mas detallada (instrucciones largas de identidad + escudo duplicado +
 * numero gigante de fondo) le hacia perder fidelidad al escudo del club a
 * ChatGPT (ej. "TOP SECIRET" en vez de "TOP SECRET"). Reusa el pipeline de
 * ChatGPT (mismo Chrome persistente que generate-image-chatgpt.mjs).
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';

const CREST_REF = path.resolve('logos/TOP Secret White.png');
const OUT_DIR    = process.env.PLACAS_OUT_DIR || path.resolve('.placas-tmp');

const PLAYERS = [
  { key: 'Ivan_Cabj_La12', num: 12, pose: 'brazos cruzados, mentón en alto' },
  { key: 'rivarola90',     num: 2,  pose: 'señalando a cámara con el dedo índice' },
  { key: 'yzytx0',         num: 99, pose: 'una mano sobre el pecho' },
  { key: 'Ramiro4588',     num: 96, pose: 'brazos abiertos, palmas hacia arriba' },
  { key: 'Eli_No-SKILL',   num: 10, pose: 'puños juntos frente al pecho' },
  { key: 'fedeavv9',       num: 9,  pose: 'manos detrás de la nuca, codos afuera' },
  { key: 'CAT_FEL',        num: 55, pose: 'una mano sobre el hombro opuesto' },
  { key: 'Juanchyroman08', num: 18, pose: 'puño en alto, festejando' },
  { key: 'Lil_Dekuroko',   num: 22, pose: 'cabeza inclinada, mirada fija a cámara' },
  { key: 'Mauriii-_1891',  num: 30, pose: 'manos en la cintura' },
  { key: 'kee_viin03',     num: 21, pose: 'dedo índice sobre los labios, gesto de silencio' },
];

function buildPrompt(p) {
  return `Adjunto dos imágenes de referencia:
1) El render de un jugador de Top Secret FC (fútbol virtual, EA Sports FC Clubs Pro), fondo transparente. Copiá su cara, peinado y kit negro exactamente como se ven ahí.
2) El escudo del club en blanco. Usalo exactamente igual, sin modificarlo.

Creá una placa cuadrada de 1080x1080px (post de Instagram), diseño simple y gráfico:

- Fondo: corte diagonal, negro a la izquierda (60%) y azul #4a9eff a la derecha (40%), colores planos, sin degradados.
- Jugador: encuadre de cintura para arriba, grande, ocupando casi todo el alto de la imagen. Pose: ${p.pose}.
- Escudo blanco (Referencia 2) chico, arriba a la izquierda.
- Número "${p.num}" en blanco, chico, abajo a la derecha.
- Texto blanco, mayúscula, tipografía condensada gruesa: "NUEVO FICHAJE" sobre el fondo negro, y "${p.key.toUpperCase()}" más grande sobre el fondo azul, debajo.

Estilo cartel deportivo minimalista, sin sombras ni texturas de fondo.`;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const playersToRun = process.env.PLAYER_ONLY
    ? PLAYERS.filter(p => process.env.PLAYER_ONLY.split(',').includes(p.key))
    : PLAYERS;

  const results = [];
  try {
    for (const p of playersToRun) {
      console.log(`\n\n========== ${p.key} ==========`);
      const playerRef = path.resolve('Renders', p.key, 'Frente3.png');
      let ok = false;
      for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
        try {
          const { filename } = await generateImage(
            page, { date: `placa-fichaje-${p.key}-s${attempt}` }, 'sq', buildPrompt(p),
            { freshChat: true, excludeSrcs: [], attachments: [playerRef, CREST_REF] }
          );
          const src = path.join('Renders/Daily News', filename);
          const dest = path.join(OUT_DIR, `${p.key}.png`);
          fs.copyFileSync(src, dest);
          fs.unlinkSync(src);
          console.log(`  Guardada: ${dest}`);
          results.push({ key: p.key, file: dest });
          ok = true;
        } catch (err) {
          console.log(`  Intento ${attempt} error: ${err.message.split('\n')[0]}`);
        }
        await deleteChatById(page, currentChatId(page));
      }
      if (!ok) results.push({ key: p.key, file: null });
    }
  } finally {
    await page.close().catch(() => {});
  }

  console.log('\n\n===== RESUMEN =====');
  results.forEach(r => console.log(`${r.file ? '✓' : '✗'} ${r.key}${r.file ? ` (${r.file})` : ''}`));
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
