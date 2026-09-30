/**
 * One-off: placa de fixture para redes de la temporada regular VPUG T6
 * (#1 Primera División VPUG). Sigue el mismo proceso documentado para el
 * fixture VPN T3 (planilla + hoja de escudos como referencia, más
 * "Fixture VPN T3.png" como referencia de estilo/layout para que ChatGPT
 * reproduzca el mismo diseño). Se puede borrar después de correrlo.
 */
import { chromium } from 'playwright';
import path from 'path';
import {
  MAX_ATTEMPTS, POST_MIN_RATIO, POST_MAX_RATIO,
  CREST_PATH, CREST_WHITE_PATH,
  imageRatio, generateImage, evaluateImage,
} from './generate-image-chatgpt.mjs';

const SCRATCH_DIR = 'C:/Users/User/AppData/Local/Temp/claude/d--proyectos-top-secret/5b7610b5-1827-47df-a2c8-00e555b4b435/scratchpad';
const PLANILLA_PATH = path.join(SCRATCH_DIR, 'planilla.png');
const ESCUDOS_PATH = path.join(SCRATCH_DIR, 'hoja-escudos.png');
const STYLE_REF_PATH = path.resolve('logos/Fixture VPN T3.png');

const RIVALES = [
  ['Fecha 1',  'Lunes 10/ago',     '22:30', 'Nueva Chicago',      'VISITA'],
  ['Fecha 2',  'Martes 11/ago',    '22:30', 'Deportivo Moron',    'LOCAL'],
  ['Fecha 3',  'Miércoles 12/ago', '22:30', 'Real MarcianoFC',    'VISITA'],
  ['Fecha 4',  'Jueves 13/ago',    '22:30', 'InfinitX',           'LOCAL'],
  ['Fecha 5',  'Lunes 17/ago',     '22:30', 'Germinal eSports',   'VISITA'],
  ['Fecha 6',  'Martes 18/ago',    '22:30', 'Argentino de Merlo', 'LOCAL'],
  ['Fecha 7',  'Miércoles 19/ago', '22:30', 'Hacha eSports',      'VISITA'],
  ['Fecha 8',  'Jueves 20/ago',    '22:30', 'Olimpo eSports',     'VISITA'],
  ['Fecha 9',  'Lunes 24/ago',     '22:30', 'Ysh FC',             'LOCAL'],
  ['Fecha 10', 'Martes 25/ago',    '22:30', 'I.A.C.C Cantera',    'VISITA'],
  ['Fecha 11', 'Miércoles 26/ago', '22:30', 'Atlético Moneiro',   'LOCAL'],
  ['Fecha 12', 'Jueves 27/ago',    '22:30', '4BDOMIFL4NES',       'VISITA'],
  ['Fecha 13', 'Lunes 31/ago',     '22:30', 'United Mito',        'LOCAL'],
  ['Fecha 14', 'Martes 01/sep',    '22:30', 'All Boys eSp',       'VISITA'],
  ['Fecha 15', 'Miércoles 02/sep', '22:30', 'Temperley eSports',  'LOCAL'],
  ['Fecha 16', 'Jueves 03/sep',    '22:30', 'San Miguel eSports', 'VISITA'],
  ['Fecha 17', 'Lunes 07/sep',     '22:30', 'Colon SL',           'LOCAL'],
];

const rivalesLines = RIVALES.map(([r, f, h, rival, cond]) => `${r}: ${f} ${h}hs vs ${rival} (${cond})`).join('\n');

function buildPrompt(correction) {
  return `Sos el diseñador gráfico oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro).

Necesito la placa de fixture para redes sociales de la Liga VPUG, temporada regular de "#1 Primera División VPUG (T6)" — 17 fechas, ida única.

═══ REFERENCIA DE ESTILO OBLIGATORIA ═══
Te adjunto "Fixture VPN T3.png", la placa de fixture que ya usamos esta misma temporada para la Liga VPN. Reproducí EXACTAMENTE el mismo estilo visual y layout: fondo negro con textura dorada/bronce desgastada en los bordes, título "TOP SECRET FC" en tipografía grande con efecto stencil/desgastado, escudo del club arriba a la izquierda (te lo adjunto en dos versiones, usá la que mejor contraste tenga), subtítulo "FIXTURE · TEMPORADA 3" en dorado, dos columnas de filas (una fila por fecha) con: badge dorado numerado ("F1", "F2", ...), escudo del rival, nombre del rival, etiqueta LOCAL (verde) o VISITA (celeste/azul), y horario a la derecha. Al pie: leyenda con los íconos de LOCAL/VISITA y el link del sitio "enohcaid.github.io/top-secret".

═══ CAMBIO DE LIGA (IMPORTANTE) ═══
Esta placa es para VPUG, no VPN. Arriba a la derecha, donde el ejemplo tiene el logo de VPN, escribí en su lugar el texto "VPUG" en un wordmark simple y prolijo (no inventes un logo con forma de escudo ni imágenes que no existen), y debajo "#1 PRIMERA DIVISIÓN" y "TEMPORADA 6".

═══ RIVALES Y ESCUDOS — USAR EXACTAMENTE ESTOS, NO INVENTAR NI OMITIR NINGUNO ═══
Te adjunto:
1. Una planilla con las 17 fechas (ronda, día/fecha, hora, rival, local/visita) — usala como fuente de datos exacta, replicá el texto tal cual.
2. Una hoja con los 17 escudos reales de los rivales — usá ESOS escudos exactos para cada rival, no inventes escudos nuevos ni los mezcles entre rivales.

Listado completo (17 fechas, todas a las 22:30hs):
${rivalesLines}

═══ FORMATO ═══
Publicación de Instagram — proporción 4:5, VERTICAL (más alto que ancho), aproximadamente 1086×1448 px, igual que la referencia adjunta.

${correction ? `═══ CORRECCIÓN SOBRE LA VERSIÓN ANTERIOR ═══\n${correction}\n\n` : ''}Generá la imagen ahora.`;
}

function buildEvalPrompt() {
  return `Sos el director de arte de Top Secret FC revisando la placa de fixture de VPUG Temporada 6 (17 fechas) antes de publicarla.

CRITERIOS (todos deben cumplirse):
- Mismo estilo visual que la referencia "Fixture VPN T3.png" adjunta: fondo negro con bordes dorados/bronce desgastados, título "TOP SECRET FC" grande, escudo del club, filas con badge de fecha + escudo + nombre + LOCAL/VISITA + horario.
- Dice "VPUG" (no "VPN") en el sector de la liga, con referencia a "Primera División" y "Temporada 6".
- Aparecen las 17 fechas (no 19, no menos) con los rivales correctos según el listado — revisá que ningún nombre de rival esté inventado o mal escrito.
- Los escudos de los rivales corresponden a los reales de la hoja de escudos adjunta (no escudos genéricos o inventados).
- Texto legible, sin errores de superposición, sin artefactos raros de IA.
- Proporción vertical 4:5 (aprox 1086x1448), no horizontal ni story angosta.

Respondé ÚNICAMENTE con uno de estos dos formatos (nada más):
APROBADA - [motivo breve]
RECHAZADA - [qué falla específicamente, en una línea accionable para el generador de imágenes]`;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  const attachments = [CREST_PATH, CREST_WHITE_PATH, STYLE_REF_PATH, PLANILLA_PATH, ESCUDOS_PATH];

  let correction = null;
  let finalFile = null;
  let finalDims = null;

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`\nIntento ${attempt}/${MAX_ATTEMPTS}...`);
      const prompt = buildPrompt(correction);

      let filename;
      try {
        ({ filename } = await generateImage(
          page, { date: 'vpug-t6' }, 'fixture', prompt,
          { freshChat: attempt === 1, excludeSrcs: [], attachments }
        ));
      } catch (genErr) {
        console.log(`  Error técnico (intento ${attempt}/${MAX_ATTEMPTS}): ${genErr.message.split('\n')[0]}`);
        if (attempt === MAX_ATTEMPTS) break;
        continue;
      }

      const dims = await imageRatio(path.join('Renders/Daily News', filename));
      console.log(`  ${dims.width}x${dims.height} (proporción ${dims.ratio.toFixed(2)})`);
      const wrongFormat = dims.ratio < POST_MIN_RATIO || dims.ratio > POST_MAX_RATIO;
      if (wrongFormat && attempt < MAX_ATTEMPTS) {
        correction = `La imagen anterior salió en proporción ${dims.ratio.toFixed(2)} (${dims.width}x${dims.height}) — formato incorrecto. Necesito proporción 4:5 vertical (aprox. 1086x1448).`;
        console.log(`  ⚠ ${correction}`);
        continue;
      }

      let evalResponse = null;
      try {
        evalResponse = await evaluateImage(context, path.resolve('Renders/Daily News', filename), buildEvalPrompt());
      } catch (evalErr) {
        console.log(`  Evaluación falló (${evalErr.message.split('\n')[0]}) — aceptando.`);
      }
      const approved = !evalResponse || /^aprobada/i.test(evalResponse.trim());
      finalFile = filename;
      finalDims = dims;
      if (approved || attempt === MAX_ATTEMPTS) {
        if (evalResponse && !approved) console.log('  Máximo de intentos alcanzado — usando última versión.');
        break;
      }
      correction = evalResponse.replace(/^rechazada\s*[-–]\s*/i, '').trim();
      console.log(`  Rechazada: "${correction}" — regenerando.`);
    }
  } finally {
    // NUNCA browser.close(): es el Chrome persistente del pipeline diario.
    await page.close().catch(() => {});
  }

  if (finalFile) {
    console.log(`\n\nOK: ${path.join('Renders/Daily News', finalFile)}${finalDims ? ` (${finalDims.width}x${finalDims.height})` : ''}`);
  } else {
    console.log('\n\nSIN RESULTADO.');
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
