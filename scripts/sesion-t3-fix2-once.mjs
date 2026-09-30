/**
 * One-off: corrige las fotos 09 (RS32-DaniStone, tracksuit) y 10 (Huber236 +
 * fedeavv9, duo con uniformes de juego) de la sesion T3 — salieron sin el
 * swoosh de Nike visible en la prenda. Sin loop de evaluacion por IA: se
 * genera una vez (con reintento solo si el formato de imagen sale mal) y se
 * deja la revision de contenido al usuario.
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

const TRAITS = {
  'RS32-DaniStone': 'piel clara, pelo revuelto turquesa/verde agua, máscara celeste cubriendo nariz y boca, anteojos, una manga azul en el brazo derecho',
  'Huber236':       'piel clara, pelo negro abundante peinado hacia arriba, barba negra completa y prolija',
  'fedeavv9':       'piel trigueña, pelo corto rubio platinado, muy tatuado en cuello, brazos y piernas, venda blanca en la muñeca izquierda',
};

const SHOTS = [
  {
    id: '09_rs32-danistone_tracksuit',
    players: ['RS32-DaniStone'],
    garment: 'TRACKSUIT RETRO negro con blanco (sección 8, fanwear/streetwear)',
    scene: 'Foto lifestyle en una cancha urbana de cemento, apoyado con actitud relajada, luz dura de atardecer, sombras largas, estética de campaña retro deportiva.',
  },
  {
    id: '10_huber236-fedeavv9_duo',
    players: ['Huber236', 'fedeavv9'],
    garment: 'Huber236 con HOME KIT (negro) y fedeavv9 con AWAY KIT (blanco) (sección 1, uniformes de juego)',
    scene: 'Los dos caminando juntos hacia la cancha, hombro con hombro, riendo o conversando de forma natural y espontánea, luz cálida de atardecer, compañerismo genuino, foto documental de vestuario/salida al campo.',
  },
];

function buildPrompt(shot) {
  const playerLines = shot.players
    .map(p => `- ${p}: ${TRAITS[p]}`)
    .join('\n');

  return `Sos el fotógrafo oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro) de élite. Estás haciendo la sesión de fotos institucional de la Temporada 3 para mostrar la identidad del club: la indumentaria oficial y los jugadores del plantel, con la calidad de una producción real de un club top mundial (pensá en las campañas fotográficas reales de clubes europeos grandes — Nike, Adidas, sesiones editoriales de prensa deportiva).

IMPORTANTE: Tenés que GENERAR UNA FOTOGRAFÍA COMPLETAMENTE NUEVA. Las imágenes que te adjunto (el escudo del club, el catálogo de indumentaria, el/los render(s) del jugador) son SOLO referencia visual — nunca devuelvas ninguna de ellas tal cual.

═══ JUGADOR(ES) DE ESTA FOTO — IDENTIDAD OBLIGATORIA ═══
Te adjunto el/los render(s) de referencia de cada jugador — usalos como referencia visual directa de cara, peinado y contextura, son NUESTROS jugadores reales, nunca inventes su apariencia:
${playerLines}

═══ INDUMENTARIA ═══
Te adjunto el catálogo completo de indumentaria oficial del club ("Colección Completa de Indumentaria Top Secret FC"). Para esta foto usá específicamente: ${shot.garment}.
Reproducí fielmente el diseño, corte y colores de esa prenda TAL CUAL aparece en el catálogo adjunto. El swoosh de Nike (proveedor técnico oficial del club) tiene que verse CLARAMENTE VISIBLE en la prenda — en el pecho, la manga o el costado, igual que en indumentaria deportiva Nike real — no lo omitas bajo ningún concepto. Si la prenda además lleva el sponsor "AIA" en el pecho (como los uniformes de juego), incluilo también.

═══ ESCENA ═══
${shot.scene}

═══ ESTILO FOTOGRÁFICO (OBLIGATORIO) ═══
Fotografía deportiva editorial de altísima calidad, luz natural o de estudio profesional (nunca luces de colores artificiales ni efectos de videojuego), composición cinematográfica, profundidad de campo con el/los jugador(es) nítido(s) y el fondo con leve desenfoque, grano de película sutil tipo revista deportiva premium. Sin texto superpuesto, sin titulares, sin marcos ni sellos gráficos — es una FOTO PURA, no una pieza de diseño gráfico. El escudo del club (el espía con sombrero) puede aparecer en la ropa de forma natural, pero no como elemento gráfico añadido encima de la foto.

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
      console.log(`\n\n========== FIX2 ${i + 1}/${SHOTS.length}: ${shot.id} ==========`);

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
            page, { date: `sesionT3fix2-${i + 1}` }, shot.id, prompt,
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
  } finally {
    // NUNCA browser.close(): es el Chrome persistente del pipeline diario.
    await page.close().catch(() => {});
  }

  console.log('\n\n===== RESUMEN =====');
  results.forEach(r => console.log(`${r.file ? '✓' : '✗'} ${r.id}${r.dims ? ` (${r.dims.width}x${r.dims.height})` : ''}`));
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
