/**
 * One-off: reemplaza la foto 10_huber236-fedeavv9_duo.png de la sesion T3
 * (ver sesion-t3-once.mjs) por dos fotos individuales, una por jugador,
 * manteniendo la misma indumentaria que tenian en la foto duo (Huber236 con
 * home kit negro, fedeavv9 con away kit blanco). Mismo pipeline y estilo,
 * sin loop de evaluacion por IA.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  MAX_ATTEMPTS, POST_MIN_RATIO, POST_MAX_RATIO,
  CREST_PATH, CREST_WHITE_PATH, T3_FRENTES_DIR,
  imageRatio, generateImage, deleteChatById, currentChatId,
} from './generate-image-chatgpt.mjs';

const OUT_DIR = path.resolve('Renders/Sesión T3');
const LOOKBOOK_PATH = path.resolve('logos/Indumentaria TOP Secret T3.png');
const OLD_DUO_FILE = path.join(OUT_DIR, '10_huber236-fedeavv9_duo.png');

const TRAITS = {
  'Huber236':  'piel clara, pelo negro abundante peinado hacia arriba, barba negra completa y prolija',
  'fedeavv9':  'piel trigueña, pelo corto rubio platinado, muy tatuado en cuello, brazos y piernas, venda blanca en la muñeca izquierda',
};

const SHOTS = [
  {
    id: '20_huber236_home-kit',
    players: ['Huber236'],
    garment: 'HOME KIT (sección 1, uniforme de juego negro con detalles en oro) — camiseta, short y medias',
    scene: 'Retrato de lateral en pleno repliegue defensivo, corriendo a toda velocidad por la banda, césped muy verde, luz de tarde clara, foto de acción congelada tipo editorial deportivo, cuerpo en tensión atlética.',
  },
  {
    id: '21_fedeavv9_away-kit',
    players: ['fedeavv9'],
    garment: 'AWAY KIT (sección 1, uniforme de juego blanco con detalles en azul marino) — camiseta, short y medias',
    scene: 'Retrato de delantero en el instante del remate al arco, pierna en pleno impacto con la pelota, césped del estadio de fondo desenfocado, luz dorada de atardecer, foto de acción congelada tipo editorial deportivo, energía y potencia.',
  },
];

function buildPrompt(shot) {
  const playerLines = shot.players
    .map(p => `- ${p}: ${TRAITS[p]}`)
    .join('\n');

  return `Sos el fotógrafo oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro) de élite. Estás haciendo la sesión de fotos institucional de la Temporada 3 para mostrar la identidad del club: la indumentaria oficial y los jugadores del plantel, con la calidad de una producción real de un club top mundial (pensá en las campañas fotográficas reales de clubes europeos grandes — Nike, Adidas, sesiones editoriales de prensa deportiva).

IMPORTANTE: Tenés que GENERAR UNA FOTOGRAFÍA COMPLETAMENTE NUEVA. Las imágenes que te adjunto (el escudo del club, el catálogo de indumentaria, el render del jugador) son SOLO referencia visual — nunca devuelvas ninguna de ellas tal cual.

═══ JUGADOR DE ESTA FOTO — IDENTIDAD OBLIGATORIA ═══
Te adjunto el render de referencia del jugador — usalo como referencia visual directa de cara, peinado y contextura, es NUESTRO jugador real, nunca inventes su apariencia:
${playerLines}

═══ INDUMENTARIA ═══
Te adjunto el catálogo completo de indumentaria oficial del club ("Colección Completa de Indumentaria Top Secret FC"). Para esta foto usá específicamente: ${shot.garment}.
Reproducí fielmente el diseño, corte y colores de esa prenda TAL CUAL aparece en el catálogo adjunto, incluyendo el logo swoosh de Nike (proveedor técnico oficial) — tiene que verse CLARAMENTE VISIBLE en la prenda (pecho, manga o costado) — y el sponsor "AIA" en el pecho — son parte de la identidad visual real de la indumentaria del club, no los quites ni los reemplaces.

═══ ESCENA ═══
${shot.scene}

═══ ESTILO FOTOGRÁFICO (OBLIGATORIO) ═══
Fotografía deportiva editorial de altísima calidad, luz natural o de estudio profesional (nunca luces de colores artificiales ni efectos de videojuego), composición cinematográfica, profundidad de campo con el jugador nítido y el fondo con leve desenfoque, grano de película sutil tipo revista deportiva premium. Sin texto superpuesto, sin titulares, sin marcos ni sellos gráficos — es una FOTO PURA, no una pieza de diseño gráfico. El escudo del club (el espía con sombrero) puede aparecer en la ropa de forma natural, pero no como elemento gráfico añadido encima de la foto.

═══ FORMATO ═══
Publicación de Instagram — proporción 4:5, VERTICAL (más alto que ancho), aproximadamente 1080×1350 px. Encuadre claramente vertical pero no extremo como una Story (9:16).

Generá la imagen ahora.`;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  const results = [];

  try {
    for (let i = 0; i < SHOTS.length; i++) {
      const shot = SHOTS[i];
      console.log(`\n\n========== SHOT ${i + 1}/${SHOTS.length}: ${shot.id} ==========`);

      const refAttachments = [
        CREST_PATH, CREST_WHITE_PATH, LOOKBOOK_PATH,
        ...shot.players.map(p => path.join(T3_FRENTES_DIR, `${p}.png`)),
      ].filter(f => fs.existsSync(f));

      let correction = null;
      let finalFile = null;
      let finalDims = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        console.log(`\nIntento ${attempt}/${MAX_ATTEMPTS}...`);
        const prompt = buildPrompt(shot) + (correction ? `\n\nCORRECCIÓN sobre la versión anterior: ${correction}` : '');

        let filename;
        try {
          ({ filename } = await generateImage(
            page, { date: `sesionT3split-${i + 1}` }, shot.id, prompt,
            { freshChat: true, excludeSrcs: [], attachments: refAttachments }
          ));
        } catch (genErr) {
          console.log(`  Error técnico (intento ${attempt}/${MAX_ATTEMPTS}): ${genErr.message.split('\n')[0]}`);
          if (attempt === MAX_ATTEMPTS) break;
          await deleteChatById(page, currentChatId(page));
          continue;
        }

        const dims = await imageRatio(path.join('Renders/Daily News', filename));
        console.log(`  ${dims.width}x${dims.height} (proporción ${dims.ratio.toFixed(2)})`);
        finalFile = filename;
        finalDims = dims;
        const wrongFormat = dims.ratio < POST_MIN_RATIO || dims.ratio > POST_MAX_RATIO;
        if (wrongFormat && attempt < MAX_ATTEMPTS) {
          correction = `La imagen anterior salió en proporción ${dims.ratio.toFixed(2)} (${dims.width}x${dims.height}) — formato incorrecto. Necesito proporción 4:5 vertical (aprox. 1080x1350).`;
          console.log(`  ⚠ ${correction}`);
          await deleteChatById(page, currentChatId(page));
          continue;
        }
        break;
      }

      if (finalFile) {
        const src = path.join('Renders/Daily News', finalFile);
        const destName = `${shot.id}.png`;
        const dest = path.join(OUT_DIR, destName);
        fs.renameSync(src, dest);
        console.log(`  Movida a: ${dest}`);
        results.push({ id: shot.id, file: destName, dims: finalDims });
      } else {
        console.log('  SIN RESULTADO para este shot.');
        results.push({ id: shot.id, file: null });
      }

      await deleteChatById(page, currentChatId(page));
    }

    if (results.every(r => r.file) && fs.existsSync(OLD_DUO_FILE)) {
      fs.unlinkSync(OLD_DUO_FILE);
      console.log(`\nBorrada foto duo original: ${OLD_DUO_FILE}`);
    }
  } finally {
    // NUNCA browser.close(): es el Chrome persistente del pipeline diario.
    await page.close().catch(() => {});
  }

  console.log('\n\n===== RESUMEN =====');
  results.forEach(r => console.log(`${r.file ? '✓' : '✗'} ${r.id}${r.dims ? ` (${r.dims.width}x${r.dims.height})` : ''}`));
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
