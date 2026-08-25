/**
 * One-off: 4 fotos mas para Renders/Instalaciones del club/ — una del
 * estadio (interior, vista general de tribunas, distinta a las ya
 * existentes de fachada/aerea/campo) + sala de trofeos, sala de
 * video/analisis tactico y zona de recuperacion/pileta. Mismo pipeline y
 * estilo que instalaciones-club-once.mjs, sin loop de evaluacion por IA.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  MAX_ATTEMPTS, POST_MIN_RATIO, POST_MAX_RATIO,
  CREST_PATH, CREST_WHITE_PATH,
  imageRatio, generateImage, deleteChatById, currentChatId,
} from './generate-image-chatgpt.mjs';

const OUT_DIR = path.resolve('Renders/Instalaciones del club');

const SHOTS = [
  {
    id: '14_zona-calentamiento',
    scene: 'Cancha auxiliar de calentamiento junto al estadio, césped sintético de última generación, conos y pecheras prolijamente apilados a un costado, pequeños arcos portátiles, tribuna baja de fondo y parte de la estructura del estadio principal asomando detrás, luz natural de media tarde, sin ninguna persona en cuadro.',
  },
  {
    id: '15_sala-video-tactica',
    scene: 'Sala de video y análisis táctico del cuerpo técnico, gran pantalla en la pared con una pizarra táctica de fútbol proyectada (formación y flechas, sin texto legible ni logos de terceros), sillas de oficina alineadas frente a una mesa larga, el escudo del club en un panel lateral, iluminación tenue de sala de proyección, ambiente profesional de análisis de alto rendimiento, sin ninguna persona en cuadro.',
  },
  {
    id: '16_pileta-recuperacion',
    scene: 'Zona de recuperación física del club, piscina de hidroterapia con agua turquesa iluminada desde abajo, azulejos blancos y grises, camillas de recuperación al costado, el escudo del club en un mosaico en la pared, iluminación cálida tipo spa deportivo de élite, ambiente limpio y relajante, sin ninguna persona en cuadro.',
  },
];

function buildPrompt(shot) {
  return `Sos el fotógrafo institucional oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro) de élite. Estás haciendo un reportaje fotográfico de las instalaciones del club — el estadio y sus espacios internos — con la calidad de una producción real de un club top mundial (pensá en los tours virtuales/fotográficos oficiales de estadios europeos grandes: arquitectura, interiores, césped).

IMPORTANTE: Es una foto puramente ARQUITECTÓNICA / DE INTERIOR O EXTERIOR — NO debe aparecer ninguna persona, ni jugador, ni hincha, ni staff en la imagen. Solo el espacio, vacío.

Te adjunto el escudo oficial del club (el espía con sombrero, versión oscura y versión clara) — usalo como referencia para cualquier señalética, grabado o logo que aparezca de forma natural en la escena, reproduciéndolo fielmente tal cual aparece en el adjunto, nunca inventes un escudo distinto.

═══ ESCENA ═══
${shot.scene}

═══ ESTILO FOTOGRÁFICO (OBLIGATORIO) ═══
Fotografía arquitectónica/editorial de altísima calidad, luz natural o de estudio profesional (nunca luces de colores artificiales ni efectos de videojuego), composición cinematográfica, profundidad de campo controlada, grano de película sutil tipo revista deportiva premium. Sin texto superpuesto, sin titulares, sin marcos ni sellos gráficos añadidos — es una FOTO PURA, no una pieza de diseño gráfico.

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

  const refAttachments = [CREST_PATH, CREST_WHITE_PATH].filter(f => fs.existsSync(f));
  const results = [];

  try {
    for (let i = 0; i < SHOTS.length; i++) {
      const shot = SHOTS[i];
      console.log(`\n\n========== SHOT ${i + 1}/${SHOTS.length}: ${shot.id} ==========`);

      let correction = null;
      let finalFile = null;
      let finalDims = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        console.log(`\nIntento ${attempt}/${MAX_ATTEMPTS}...`);
        const prompt = buildPrompt(shot) + (correction ? `\n\nCORRECCIÓN sobre la versión anterior: ${correction}` : '');

        let filename;
        try {
          ({ filename } = await generateImage(
            page, { date: `instalaciones3-${i + 1}` }, shot.id, prompt,
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
