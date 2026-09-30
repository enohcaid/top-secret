/**
 * One-off: la noticia del 2026-08-08 ya está publicada (el draft se borró de
 * Firestore al publicar). El usuario pidió reemplazar sus imágenes por unas
 * nuevas, sin tocar el texto ya publicado. Reusa el pipeline de generación/
 * evaluación de generate-image-chatgpt.mjs con el contenido real del artículo
 * publicado (copiado de GET /published-noticias) y sobreescribe los mismos
 * nombres de archivo (2026-08-08_post.png / _story.png) — el artículo
 * publicado ya apunta a esos paths, así que no hace falta tocar Firestore/KV.
 *
 * Se puede borrar después de correrlo (es fija a esta pieza puntual).
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  MAX_ATTEMPTS, POST_MIN_RATIO, POST_MAX_RATIO, STORY_MAX_RATIO,
  CREST_PATH, CREST_WHITE_PATH, KITS_PATH, T3_FRENTES_DIR,
  imageRatio, buildPrompt, buildResizePrompt, buildEvalPrompt,
  pickStyle, fetchStyleHistory, saveStyleHistory,
  extractMentionedPlayers, selectFeaturedPlayers, fetchFeaturedHistory, saveFeaturedHistory,
  generateImage, evaluateImage, deleteChatById, currentChatId,
  gitPushImages, fetchJerseyOverrides,
} from './generate-image-chatgpt.mjs';

const OUTPUT_DIR = path.resolve('Renders/Daily News');

// Contenido real del artículo ya publicado (auto-2026-08-08), vía
// GET /published-noticias — el texto queda igual, solo cambian las imágenes.
const draft = {
  id: 'auto-2026-08-08',
  date: '2026-08-08',
  category: 'Analisis',
  title: 'Semana de contrastes: dos victorias en VPN y deuda abierta en el 11x11',
  excerpt: 'Top Secret cerró una semana intensa con saldo mixto: 2-2 en la VPN y arranque complicado en el 11x11 Challengers, con doble fecha de visitante el martes.',
  body: [
    '<p>El balance semanal de Top Secret FC cierra con luces y sombras. En la <strong>VPN</strong>, el equipo arrancó de forma contundente al inicio de la semana: victoria 2-0 ante Ysh Fc y 1-0 frente a Al-Yateh FC, dos triunfos sin conceder goles. Pero luego llegó la tormenta: derrota 3-4 ante NUVO FC en casa y 0-1 de visitante ante División Palermo cerraron el frente VPN con <strong>2 victorias y 2 derrotas</strong>, seis goles a favor y cinco en contra.</p>',
    '<p>El <strong>11x11 Challengers</strong> fue terreno más complicado. El debut en la nueva zona dejó cuatro partidos sin victorias: caída 0-3 ante IACC Cantera, empate 1-1 en Cambaceres, rescate agridulce ante Interzonal A (3-3) y derrota 0-2 frente a Sub 21 CF. El equipo dominó la pelota en la mayoría de los encuentros, pero le costó transformar esa tendencia en goles: cuatro a favor y nueve en contra en el balance de la zona.</p>',
    '<p>En lo individual, <strong>kee_viin03</strong> fue el artillero de la semana con tres goles sumando los dos partidos del 11x11. En la VPN, <strong>fedeavv9</strong> respondió en los momentos clave con un tanto en cada uno de los primeros dos encuentros. <strong>RS32-DaniStone</strong> mantuvo un rendimiento parejo en todos sus partidos del 11x11, siendo uno de los puntales del mediocampo en la nueva zona del Challengers.</p>',
    '<p>La próxima parada es el <em>martes 11 con doble fecha de visitante en el 11x11</em> ante Olimpo Esports y Comunicaciones eSports. En la VPN, Top Secret buscará capitalizar lo positivo del arranque y dar vuelta la página de las dos derrotas del miércoles. La semana que empieza es otra oportunidad de afianzar el rumbo en ambas ligas.</p>',
  ],
  imageBrief: 'Composición institucional sin jugadores: dos tableros separados —uno con resultados VPN, otro con resultados 11x11— sobre un escritorio de vestuario con el escudo de Top Secret FC al centro. Luz de neon fría. ' +
    'CRÍTICO — NO INVENTES marcadores, rivales ni nombres de equipo: son datos reales de un club real. Si el tablero muestra texto de resultados, usá EXACTA y ÚNICAMENTE estos ocho partidos (nada más, nada menos, ni un dígito distinto): ' +
    'VPN — "Top Secret FC 2-0 Ysh Fc", "Top Secret FC 1-0 Al-Yateh FC", "Top Secret FC 3-4 NUVO FC", "Top Secret FC 0-1 División Palermo". ' +
    '11x11 — "Top Secret FC 0-3 IACC Cantera", "Top Secret FC 1-1 Cambaceres", "Top Secret FC 3-3 Interzonal A", "Top Secret FC 0-2 Sub 21 CF". ' +
    'Si no podés reproducir ese texto con precisión, preferí un tablero SIMBÓLICO sin marcadores ni nombres de rivales (fichas, sellos, checkmarks, barras) antes que inventar un resultado o equipo distinto.',
};

// Instrucción reforzada desde el intento 1 (el primer intento del regen
// anterior inventó equipos y marcadores ficticios en el tablero pese al
// imageBrief original — este correction inicial insiste en el mismo punto
// por un segundo canal).
const INITIAL_CORRECTION = 'La versión anterior de esta pieza mostró un tablero de resultados con equipos y marcadores INVENTADOS (ej. "Los Galácticos", "Tiki Tiki FC") que no existen. Los ocho partidos reales están detallados en la escena de arriba — reproducilos EXACTAMENTE tal cual están escritos, o si no podés garantizar el texto con precisión, usá un tablero simbólico sin números ni nombres de rivales.';

async function main() {
  await fetchJerseyOverrides(); // popula JERSEY_OVERRIDES dentro del módulo importado

  const allMentioned    = extractMentionedPlayers(draft);
  const featuredHistory = await fetchFeaturedHistory();
  const mentioned       = selectFeaturedPlayers(allMentioned, featuredHistory);
  console.log(mentioned.length > 0
    ? `Protagonistas: ${mentioned.join(', ')}`
    : 'Sin jugadores específicos — composición institucional.');

  console.log('Conectando al Chrome abierto...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  const styleHistory = await fetchStyleHistory();
  const chosenStyle  = pickStyle(styleHistory, draft);
  const evalPrompt   = buildEvalPrompt(chosenStyle, draft, mentioned);
  console.log(`Estilo del día: ${chosenStyle.label} (${chosenStyle.id})`);

  let correction   = INITIAL_CORRECTION;
  let lastPostFile = null, lastPostImgUrl = null;

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) console.log(`\nIntento ${attempt}/${MAX_ATTEMPTS}...`);

      const postPrompt = buildPrompt(draft, mentioned, chosenStyle, correction);
      const refAttachments = [
        CREST_PATH, CREST_WHITE_PATH, KITS_PATH,
        ...mentioned.map(p => {
          const png = path.join(T3_FRENTES_DIR, `${p}.png`);
          return fs.existsSync(png) ? png : path.join(T3_FRENTES_DIR, `${p}.jpg`);
        }),
      ];

      let postFile, postImgUrl;
      try {
        ({ filename: postFile, imgUrl: postImgUrl } = await generateImage(
          page, draft, 'post', postPrompt, { freshChat: true, excludeSrcs: [], attachments: refAttachments }
        ));
      } catch (genErr) {
        console.log(`  Error técnico (intento ${attempt}/${MAX_ATTEMPTS}): ${genErr.message.split('\n')[0]}`);
        if (attempt === MAX_ATTEMPTS) throw genErr;
        await deleteChatById(page, currentChatId(page));
        continue;
      }
      lastPostFile = postFile;
      lastPostImgUrl = postImgUrl;

      const postDims = await imageRatio(path.join(OUTPUT_DIR, postFile));
      const wrongPostFormat = postDims.ratio < POST_MIN_RATIO || postDims.ratio > POST_MAX_RATIO;
      if (wrongPostFormat && attempt < MAX_ATTEMPTS) {
        correction = postDims.ratio < POST_MIN_RATIO
          ? `La imagen anterior salió en proporción ${postDims.ratio.toFixed(2)} (${postDims.width}x${postDims.height}) — MUY angosta y alta, formato Story. Necesito el formato POST: notoriamente MÁS ANCHO Y MÁS CUADRADO, proporción 4:5.`
          : `La imagen anterior salió en proporción ${postDims.ratio.toFixed(2)} (${postDims.width}x${postDims.height}) — APAISADA/HORIZONTAL. El post sigue siendo vertical, proporción 4:5 (ej. 1086x1448).`;
        console.log(`  Corrección: "${correction}"`);
        await deleteChatById(page, currentChatId(page));
        continue;
      }

      let evalResponse = null;
      try {
        evalResponse = await evaluateImage(context, path.join(OUTPUT_DIR, postFile), evalPrompt);
      } catch (evalErr) {
        console.log(`  Evaluación falló (${evalErr.message.split('\n')[0]}) — aceptando imagen.`);
      }
      const approved = !evalResponse || /^aprobada/i.test(evalResponse.trim());
      if (approved || attempt === MAX_ATTEMPTS) {
        if (evalResponse && !approved) console.log('  Máximo de intentos alcanzado — usando última versión.');
        break;
      }
      correction = evalResponse.replace(/^rechazada\s*[-–]\s*/i, '').trim();
      console.log(`  Corrección: "${correction}"`);
      await deleteChatById(page, currentChatId(page));
    }

    let storyFile;
    const storyExclude = [lastPostImgUrl];
    let storyCorrection = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      let storyImgUrl;
      try {
        const storyPrompt = buildResizePrompt() +
          (storyCorrection ? `\n\nCORRECCIÓN sobre la versión anterior: ${storyCorrection}` : '');
        ({ filename: storyFile, imgUrl: storyImgUrl } = await generateImage(
          page, draft, 'story', storyPrompt, { freshChat: false, excludeSrcs: storyExclude }
        ));
      } catch (genErr) {
        console.log(`  Error generando story (intento ${attempt}/3): ${genErr.message.split('\n')[0]}`);
        if (attempt === 3) { storyFile = null; break; }
        await page.waitForTimeout(5000);
        continue;
      }
      storyExclude.push(storyImgUrl);

      const storyDims = await imageRatio(path.join(OUTPUT_DIR, storyFile));
      const wrongStoryFormat = storyDims.ratio > STORY_MAX_RATIO;
      if (storyCorrection !== null || attempt === 3) {
        if (wrongStoryFormat && attempt === 3) console.log('  Máximo de intentos alcanzado — usando última versión igual.');
        break;
      }
      if (wrongStoryFormat) {
        storyCorrection = `La imagen anterior salió en proporción ${storyDims.ratio.toFixed(2)} (${storyDims.width}x${storyDims.height}) — parece un post, no una story. Necesito proporción 9:16, pantalla completa de celular.`;
        console.log(`  Corrección: "${storyCorrection}"`);
        continue;
      }

      let storyEval = null;
      try {
        storyEval = await evaluateImage(context, path.join(OUTPUT_DIR, storyFile), evalPrompt);
      } catch (evalErr) {
        console.log(`  Evaluación de story falló (${evalErr.message.split('\n')[0]}) — aceptando.`);
      }
      if (!storyEval || /^aprobada/i.test(storyEval.trim())) break;
      storyCorrection = storyEval.replace(/^rechazada\s*[-–]\s*/i, '').trim();
      console.log(`  Story rechazada: "${storyCorrection}" — regenerando.`);
    }

    if (!storyFile) {
      storyFile = `${draft.date}_story.png`;
      fs.copyFileSync(path.join(OUTPUT_DIR, lastPostFile), path.join(OUTPUT_DIR, storyFile));
      console.log('  Story falló en todos los intentos — usando el post como story.');
    }

    await deleteChatById(page, currentChatId(page));
    await saveStyleHistory(chosenStyle.id, draft.date, styleHistory);
    if (mentioned.length > 0) await saveFeaturedHistory(mentioned, draft.date, featuredHistory);
    gitPushImages(lastPostFile, storyFile);

    console.log('\n✓ Listo.');
    console.log('  Post: ', lastPostFile);
    console.log('  Story:', storyFile);
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
