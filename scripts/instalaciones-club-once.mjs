/**
 * One-off: 10 fotos institucionales del estadio e instalaciones de Top
 * Secret FC, SIN jugadores ni personas — solo arquitectura/interiores.
 * 3 tomas exteriores del estadio + 7 de instalaciones y campo de juego.
 * Mismo pipeline de generacion que sesion-t3-*-once.mjs, pero SIN loop de
 * evaluacion por IA (a pedido del usuario: la revision la hace el mismo).
 * Guarda en Renders/Instalaciones del club/.
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
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const SHOTS = [
  // ── exteriores (3) ──
  {
    id: '01_exterior-fachada-dia',
    scene: 'Vista exterior de la fachada principal del estadio de Top Secret FC en pleno día, arquitectura moderna e imponente de un estadio de fútbol de élite, el escudo del club (el espía con sombrero) grabado en gran tamaño en la fachada de hormigón y vidrio, cielo despejado, ángulo de gran angular tipo fotografía arquitectónica de estadio real.',
  },
  {
    id: '02_exterior-entrada-principal',
    scene: 'Entrada principal / accesos del estadio de Top Secret FC, puertas de vidrio grandes con el escudo del club en el cristal, plaza de acceso vacía con banderas del club en mástiles a los costados, luz cálida de atardecer, composición simétrica y monumental.',
  },
  {
    id: '03_exterior-nocturna',
    scene: 'Vista exterior nocturna del estadio de Top Secret FC completamente iluminado, torres de luces encendidas asomando por encima de la estructura, fachada iluminada con luces arquitectónicas, cielo nocturno azul oscuro, reflejo de las luces en el pavimento mojado, estética cinematográfica de estadio europeo de elite.',
  },
  // ── campo de juego (2) ──
  {
    id: '04_campo-juego-panoramica',
    scene: 'Vista panorámica del campo de juego principal del estadio de Top Secret FC completamente vacío, césped perfectamente cortado con líneas de rayado en dos tonos de verde, arcos a ambos lados, tribunas vacías rodeando la cancha, luz natural de mediodía, tomada desde la altura de las gradas altas, sin ninguna persona en cuadro.',
  },
  {
    id: '05_campo-juego-nivel-cesped',
    scene: 'Toma a nivel del césped del campo de juego, cámara baja casi a ras del pasto mirando hacia el arco, red del arco visible, el círculo central y las líneas de cal nítidas en primer plano, luz dorada de atardecer entrando de costado, tribunas desenfocadas de fondo, sin ninguna persona en cuadro, estética de fotografía deportiva editorial.',
  },
  // ── instalaciones interiores (5) ──
  {
    id: '06_vestuario',
    scene: 'Interior del vestuario oficial del primer equipo de Top Secret FC, hilera de lockers de madera oscura con el escudo del club grabado en cada uno, camisetas negras colgadas prolijamente en cada puesto, banco de madera al frente, iluminación cálida y profesional, ambiente prolijo y silencioso antes de un partido, sin ninguna persona en cuadro.',
  },
  {
    id: '07_tunel-jugadores',
    scene: 'Túnel de jugadores del estadio, paredes de hormigón con el escudo del club grabado en relieve iluminado, perspectiva alargada hacia la luz del campo de juego al final del túnel, iluminación dramática lateral tipo publicidad deportiva, sin ninguna persona en cuadro.',
  },
  {
    id: '08_sala-prensa',
    scene: 'Sala de conferencias de prensa del club, atril con el logo de Top Secret FC al frente, pared de fondo con el escudo del club repetido en patrón tipo backdrop de rueda de prensa, sillas vacías en fila, micrófonos sobre la mesa, iluminación de estudio profesional, sin ninguna persona en cuadro.',
  },
  {
    id: '09_gimnasio',
    scene: 'Gimnasio de alto rendimiento del club, máquinas de musculación y pesas modernas ordenadas en fila, piso de goma negro, el escudo del club pintado en la pared principal en gran tamaño, iluminación LED fría y profesional tipo gimnasio de club europeo de élite, sin ninguna persona en cuadro.',
  },
  {
    id: '10_sala-trofeos',
    scene: 'Sala de trofeos / hall institucional del club, vitrinas de vidrio iluminadas con copas y trofeos, banderines y camisetas enmarcadas en las paredes junto con el escudo del club en relieve dorado, iluminación tenue y dramática tipo museo de elite, ambiente solemne y prestigioso, sin ninguna persona en cuadro.',
  },
];

function buildPrompt(shot) {
  return `Sos el fotógrafo institucional oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro) de élite. Estás haciendo un reportaje fotográfico de las instalaciones del club — el estadio y sus espacios internos — con la calidad de una producción real de un club top mundial (pensá en los tours virtuales/fotográficos oficiales de estadios europeos grandes: arquitectura, interiores, césped).

IMPORTANTE: Es una foto puramente ARQUITECTÓNICA / DE INTERIOR — NO debe aparecer ninguna persona, ni jugador, ni hincha, ni staff en la imagen. Solo el espacio, vacío.

Te adjunto el escudo oficial del club (el espía con sombrero, versión oscura y versión clara) — usalo como referencia para cualquier señalética, grabado o logo que aparezca de forma natural en la escena (fachada, paredes, vitrinas, atril, lockers), reproduciéndolo fielmente tal cual aparece en el adjunto, nunca inventes un escudo distinto.

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
            page, { date: `instalaciones-${i + 1}` }, shot.id, prompt,
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
