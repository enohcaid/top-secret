#!/usr/bin/env node
// Lyric videos de The Shorts para el canal de YouTube de Tacet Sin (Juan, 2026-11-05): la portada del volumen en 16:9 con
// sus tiras moviéndose como las barras de un ecualizador, por arriba y por abajo (Juan: "que no fuera solo un efecto de luces,
// sino que se muevan las barras"). El movimiento es un clip de 10 s (2 de 5 s de Canva) que se conecta con el mismo clip invertido y se repite todo el tema (por eso hay un solo loop por volumen; no reacciona al audio).
//
//   node scripts/beats/videos-youtube.mjs loops [--vol 1]    → fuentes/musica/youtube/loop-vol-N.mp4 (y su base de 10 s)
//   node scripts/beats/videos-youtube.mjs tiempos [slug…]    → versos que se cantan de verdad con sus tiempos, desde lo oído por
//                                                              Whisper (palabras-whisper.py) → scripts/beats/letras-tiempos.json
//   node scripts/beats/videos-youtube.mjs video <slug>|--todos [--vol 1] → fuentes/musica/youtube/vol-N/NN-slug.{mp4,jpg,txt}
//   node scripts/beats/videos-youtube.mjs letras-web         → esas letras pasan a ser las oficiales de /music (letraFinal + catálogo)
//   node scripts/beats/videos-youtube.mjs publicar [slug…]   → sube a topsecret.ar/music (apartado Videos) los videos ya armados:
//                                                              versión liviana 720p + portada a R2 musica/videos/ y lista musica/videos.json
//
// Portada: el original sin firma (fuentes/musica/portadas/the-shorts-N.png); la firma se estampa quieta encima.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { ROOT, loadEnv } from '../lib/env.mjs';
import { putFile } from '../lib/r2.mjs';

const OUT = path.join(ROOT, 'fuentes/musica/youtube');
const PORTADAS = path.join(ROOT, 'fuentes/musica/portadas');
const W = 1920, H = 1080, FPS = 30, BASE_S = 10, LADO = 1080;
const CANVA = path.join(OUT, 'canva');
// YouTube trata el HD sin etiqueta como bt709: se etiqueta así para que no cambien los colores
const COLOR = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── Capas fijas ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function firma(vol) {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 900, height: 200 }, deviceScaleFactor: 2 });
  const alto = Math.round(LADO * 0.15);
  await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700&display=swap" rel="stylesheet">
    <style>html,body{margin:0;background:transparent}#f{display:inline-block;padding:6px;font-family:'Barlow Condensed',sans-serif;color:#fff;text-transform:uppercase;line-height:1;text-shadow:0 1px 6px rgba(0,0,0,.55)}
    .a{font-weight:700;font-size:${alto * 0.42}px;letter-spacing:.32em}.d{font-weight:500;font-size:${alto * 0.34}px;letter-spacing:.24em;opacity:.8;margin-top:${alto * 0.14}px}</style></head>
    <body><div id="f"><div class="a">Tacet Sin</div><div class="d">The Shorts · Vol. ${vol}</div></div></body></html>`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const png = await p.locator('#f').screenshot({ omitBackground: true });
  await b.close();
  return sharp(png).resize({ height: Math.round((await sharp(png).metadata()).height / 2) }).png().toBuffer();
}

// Fondo 16:9 (el negro con grano de la portada), máscara que funde el borde derecho de la portada, firma y cuadro quieto
async function capas(vol) {
  const dir = path.join(OUT, 'capas'); fs.mkdirSync(dir, { recursive: true });
  const { data: arte } = await sharp(path.join(PORTADAS, `the-shorts-${vol}.png`)).removeAlpha().resize(LADO, LADO).raw().toBuffer({ resolveWithObject: true });
  const muestras = [[], [], []];
  for (let y = 0; y < LADO; y += 2) for (let x = LADO - 24; x < LADO; x += 2) for (let c = 0; c < 3; c++) muestras[c].push(arte[(y * LADO + x) * 3 + c]);
  const fondo = muestras.map(m => m.sort((a, b) => a - b)[m.length >> 1]);
  const r = rng(77 + vol), placa = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) { const g = (r() + r() - 1) * 7; for (let c = 0; c < 3; c++) placa[i * 3 + c] = Math.max(0, Math.min(255, fondo[c] + g)); }
  const crudo = b => sharp(b, { raw: { width: W, height: H, channels: 3 } });
  await crudo(placa).png().toFile(path.join(dir, `fondo-${vol}.png`));
  const FUNDE = 50, mascara = Buffer.alloc(LADO * LADO);
  for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) mascara[y * LADO + x] = 255 * Math.min(1, (LADO - 1 - x) / FUNDE);
  await sharp(mascara, { raw: { width: LADO, height: LADO, channels: 1 } }).png().toFile(path.join(dir, `mascara-${vol}.png`));
  // firma y logo, iguales a la tapa publicada
  const margen = Math.round(LADO * 0.045), altoLogo = Math.round(LADO * 0.075);
  const logo = await sharp(path.join(ROOT, 'logos/rebrand/Clean logo.png')).resize({ height: altoLogo }).png().toBuffer();
  const lm = await sharp(logo).metadata();
  const texto = await firma(vol), tm = await sharp(texto).metadata();
  const tapa = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: logo, left: LADO - margen - lm.width, top: LADO - margen - lm.height }, { input: texto, left: margen - 6, top: LADO - margen - tm.height + 6 }]).png().toBuffer();
  await sharp(tapa).ensureAlpha().composite([{ input: Buffer.from([255, 255, 255, Math.round(255 * 0.86)]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: 'dest-in' }]).png().toFile(path.join(dir, `tapa-${vol}.png`));
  // cuadro quieto con la portada entera: la base de las miniaturas
  const lleno = Buffer.from(placa);
  for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) { const a = mascara[y * LADO + x] / 255, i = (y * W + x) * 3, k = (y * LADO + x) * 3; for (let c = 0; c < 3; c++) lleno[i + c] = arte[k + c] * a + placa[i + c] * (1 - a); }
  await sharp(await crudo(lleno).png().toBuffer()).composite([{ input: path.join(dir, `tapa-${vol}.png`) }]).png().toFile(path.join(OUT, `portada-vol-${vol}.png`));
}

// ── Loop ────────────────────────────────────────────────────────────────────────────────────────────────────────────
// El movimiento sale de "Imagen a video" de Canva (Juan, 2026-11-05): 2 clips de 5 s, los dos generados desde la portada
// (generar uno desde el último cuadro del otro lo degrada: se lava y aparecen formas) (canva/vN-a.mp4, canva/vN-c.mp4; scripts/canva-imagen-a-video.mjs, prompt en docs/conocimiento/
// project_videos_youtube_tacet_sin.md). A invertido + C se encuentran en la portada limpia, sin salto (base de 10 s); se le suma lo mismo invertido sin repetir los cuadros de
// los extremos (si no, se ve un tirón en cada vuelta) y encima va la firma quieta: la IA deforma el texto.
async function loop(vol) {
  await capas(vol);
  const ff = (...a) => { const r = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...a], { encoding: 'utf8', maxBuffer: 1e8 }); if (r.status !== 0) throw new Error(r.stderr.slice(-1500)); };
  const c = n => path.join(CANVA, `v${vol}-${n}.mp4`), d = n => path.join(OUT, 'capas', `${n}-${vol}.png`), tmp = n => path.join(OUT, 'capas', `${n}-${vol}.mp4`);
  const fino = ['-c:v', 'libx264', '-preset', 'fast', '-crf', '12', '-pix_fmt', 'yuv420p', '-r', String(FPS)];
  // 1. A invertido + C: los dos arrancan en la portada, a C se le saltea el primer cuadro
  ff('-i', c('a'), '-i', c('c'), '-filter_complex', `[0:v]fps=${FPS},reverse,setpts=PTS-STARTPTS[a];[1:v]fps=${FPS},trim=start_frame=1,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1[v]`, '-map', '[v]', ...fino, tmp('crudo'));
  const r = spawnSync(ffmpeg, ['-hide_banner', '-i', tmp('crudo'), '-map', '0:v', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1e8 });
  const N = +[...r.stderr.matchAll(/frame=\s*(\d+)/g)].at(-1)[1];
  // 2. + lo mismo invertido, sin los dos cuadros de los extremos
  ff('-i', tmp('crudo'), '-filter_complex', `[0:v]split[f][r0];[r0]reverse,trim=start_frame=1:end_frame=${N - 1},setpts=PTS-STARTPTS[r];[f][r]concat=n=2:v=1[v]`, '-map', '[v]', ...fino, tmp('crudo-loop'));
  // 3. Portada a 1080 sobre el fondo 16:9, con la firma quieta
  const estampar = (entrada, salida, cuadros) => {
    const dur = (cuadros / FPS + 1).toFixed(2), fijo = x => ['-loop', '1', '-framerate', String(FPS), '-t', dur, '-i', x];
    ff('-i', entrada, ...fijo(d('mascara')), ...fijo(d('fondo')), ...fijo(d('tapa')), '-filter_complex',
      '[0:v]colorlevels=rimin=0.045:gimin=0.045:bimin=0.045,scale=1080:1080:flags=lanczos,format=yuva420p[p];[1:v]format=gray[m];[p][m]alphamerge[q];[2:v][q]overlay=0:0[w];[w][3:v]overlay=0:0,format=yuv420p[v]',
      '-map', '[v]', '-frames:v', String(cuadros), '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', ...COLOR, '-r', String(FPS), '-movflags', '+faststart', salida);
  };
  estampar(tmp('crudo'), path.join(OUT, `base-vol-${vol}.mp4`), N);
  estampar(tmp('crudo-loop'), path.join(OUT, `loop-vol-${vol}.mp4`), 2 * N - 2);
  fs.rmSync(tmp('crudo')); fs.rmSync(tmp('crudo-loop'));
  console.log(`OK loop Vol. ${vol} (${N} cuadros de base, ${2 * N - 2} de loop)`);
}

// ── Letra sincronizada ──────────────────────────────────────────────────────────────────────────────────────────────
const LETRAS = path.join(ROOT, 'scripts/beats/letras.json');
const TIEMPOS = path.join(ROOT, 'scripts/beats/letras-tiempos.json');
const SHORTS_VOL1 = 12;   // igual que scripts/beats/catalogo.mjs
const temas = () => JSON.parse(fs.readFileSync(LETRAS, 'utf8')).map((t, i) => ({ ...t, volumen: i < SHORTS_VOL1 ? 1 : 2, pista: i < SHORTS_VOL1 ? i + 1 : i - SHORTS_VOL1 + 1 }));
// La letra del video es SOLO lo que se canta (Juan, 2026-11-05: "no condicen con lo que suena"). letraFinal no sirve de
// fuente: conserva versos escritos donde la transcripción falla, y varios temas tienen estrofas que no se cantan (arrancan
// con la pista sola o con "oh, oh"). Acá: dos transcripciones de la voz separada (palabras-whisper.py: de corrido y por
// ventanas; cada una pierde cosas distintas) + la letra escrita → Claude arma los versos con sus tiempos, que salen de lo oído.
const enTexto = w => w.map(o => `${o.w}@${o.ini}`).join(' ');
const PEDIDO_LETRA = (t, a, b) => `You are preparing the on-screen lyrics of a lyric video. They must match what is sung in the recording, at the moment it is sung.

TRANSCRIPT A of the isolated vocal (word@start_seconds; run over short windows):
${enTexto(a)}

TRANSCRIPT B of the same vocal (word@start_seconds; run over the whole song):
${enTexto(b)}

Both are automatic: they mishear words under the singing, each misses passages the other caught, and they hallucinate during instrumental parts.

WRITTEN LYRICS (correct wording; but parts of this may NOT be sung at all):
${t.letra}

Build the list of lines that are really sung, in order:
- A line is sung only if either transcript has words matching it at that point. NEVER add a written line with no matching heard words: those parts are not sung and get no line. Do not fill gaps.
- Wording: by default use the WRITTEN wording. Heard words that sound similar to the written line at that place are mishearings ("womb" = "wound", "breaking low" = "breaking the law"). Only write something different if both transcripts clearly agree on different words that make sense.
- If a written line is sung only in part, write only the part that is sung.
- Keep repeats exactly as sung: a repeated line appears again.
- Ignore hallucinations: runs of "oh oh oh", isolated stray words, a final "Thank you". Keep a short "oh" or "yeah" only inside a sung phrase.
- Each line is one sung phrase of at most 14 words. Split long passages at the natural phrase ends.
- "ini" is the start second of the line's first heard word; "fin" is the start second of its last heard word plus about 0.5. Take them from the transcript that best covers that line. Times must increase and lines must not overlap.

Answer ONLY with a JSON array, no code fence: [{"ini": seconds, "fin": seconds, "texto": "the line"}].`;
const limpiarOidas = w => {
  // las rachas de "oh" son alucinaciones sobre partes sin canto: se sacan antes de pasarlas
  const es = x => /^(oh|ooh|ah|mm+|hmm)[,.!?]*$/i.test(x.w), out = [];
  for (let i = 0; i < w.length;) { if (!es(w[i])) { out.push(w[i++]); continue; } let j = i; while (j < w.length && es(w[j])) j++; if (j - i < 3) out.push(...w.slice(i, j)); i = j; }
  return out;
};
async function tiempos(solo) {
  const { pedirTexto } = await import('../lib/ia.mjs');
  const todo = fs.existsSync(TIEMPOS) ? JSON.parse(fs.readFileSync(TIEMPOS, 'utf8')) : {};
  const dir = path.join(OUT, 'palabras'), leer = f => limpiarOidas(JSON.parse(fs.readFileSync(f, 'utf8')));
  for (const t of temas()) {
    if (solo.length ? !solo.includes(t.slug) : todo[t.slug]?.dosPasadas) continue;
    const a = leer(path.join(dir, t.slug + '.json')), b = leer(path.join(dir, 'corrido', t.slug + '.json')), oidas = [...a, ...b];
    let L = null;
    const validar = x => {
      let v; try { v = JSON.parse(x.replace(/^\`\`\`\w*\n?|\`\`\`\s*$/g, '').trim()); } catch { return 'no es JSON válido'; }
      if (!Array.isArray(v) || v.length < 3) return 'muy pocas líneas';
      let prev = -0.01;
      for (const l of v) {
        // un desfase chico se acomoda solo; un desorden grande es un verso mal ubicado
        if (!l.texto || !(l.ini >= prev - 3)) return `tiempos inválidos en "${l.texto}"`;
        l.ini = Math.max(l.ini, prev);
        if (!(l.fin > l.ini + 0.3)) l.fin = l.ini + l.texto.split(/\s+/).length * 0.3;
        // cada verso tiene que tener algo oído en su lugar: si no, es un verso inventado
        if (!oidas.some(o => o.ini >= l.ini - 0.6 && o.ini <= l.fin)) return `"${l.texto}" (${l.ini}s) no tiene nada oído en ese lugar`;
        prev = l.fin;
      }
      L = v.map(l => ({ texto: l.texto.trim(), ini: +l.ini, fin: +l.fin })); return null;
    };
    for (let intento = 1; intento <= 3 && !L; intento++) await pedirTexto(PEDIDO_LETRA(t, a, b), { orden: ['claude'], claudeModelo: 'sonnet', tarea: 'letra-video', validar }).catch(() => {});
    if (!L) { console.log(`FALLÓ ${t.slug}: queda sin letra, correrlo de nuevo`); continue; }
    for (let k = 0; k < L.length - 1; k++) L[k].fin = Math.min(L[k].fin, L[k + 1].ini);
    todo[t.slug] = { dosPasadas: true, lineas: L };
    fs.writeFileSync(TIEMPOS, JSON.stringify(todo, null, 1) + '\n');
    console.log(`${t.slug.padEnd(22)} ${L.length} versos cantados · de ${L[0].ini}s a ${L.at(-1).fin}s`);
  }
}

// ── Subtítulos (ASS, libass con Barlow Condensed) ───────────────────────────────────────────────────────────────────
const X = 1130;
const hms = t => { const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = (t % 60).toFixed(2).padStart(5, '0'); return `${h}:${String(m).padStart(2, '0')}:${s}`; };
const ACENTO = { 1: '&H4CB0F0&', 2: '&HE8CFB0&' };   // ámbar / azul acero (ASS va en BGR)
function partir(txt, max) {
  if (txt.length <= max) return [txt];
  const pal = txt.split(' '); let mejor = null;
  for (let k = 1; k < pal.length; k++) {
    const a = pal.slice(0, k).join(' '), b = pal.slice(k).join(' '), m = Math.max(a.length, b.length);
    if (!mejor || m < mejor.m) mejor = { m, l: [a, b] };
  }
  if (!mejor) return [txt];
  return mejor.m <= max ? mejor.l : [mejor.l[0], ...partir(mejor.l[1], max)];
}
const limpio = s => s.replace(/[{}\\]/g, '');
function assCabecera() {
  const est = (n, f, tam) => `Style: ${n},${f},${tam},&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1`;
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n${[est('Verso', 'Barlow Condensed SemiBold', 74), est('Tenue', 'Barlow Condensed Medium', 42), est('Titulo', 'Barlow Condensed SemiBold', 40), est('Dato', 'Barlow Condensed Medium', 26)].join('\n')}\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
}
const ev = (ini, fin, est, tag, txt) => `Dialogue: 0,${hms(ini)},${hms(fin)},${est},,0,0,0,,{${tag}}${txt}\n`;
function ass(t, tt, dur) {
  const L = tt.lineas, TAM = 74, CENTRO = 540, MAX = 25, MAX_T = 42;
  // aire para los versos: cuánto queda cada uno en pantalla, hasta el próximo si está cerca
  const fin = L.map((l, i) => { const prox = L[i + 1]?.ini ?? dur - 1.6; const f = prox - l.fin < 1.2 ? prox : Math.min(l.fin + 0.7, prox); return Math.min(f, l.ini + l.texto.split(/\s+/).length + 4); });
  let s = assCabecera();
  const primero = L[0].ini, tit = limpio(t.titulo).toUpperCase(), dato = `TACET SIN  ·  THE SHORTS VOL. ${t.volumen}`;
  // antes de la primera línea, el título grande; después, chico arriba
  if (primero > 1.5) {
    const lin = partir(tit, 13), alto = lin.length * 112;
    s += ev(0.6, primero - 0.2, 'Titulo', `\\an4\\pos(${X},${CENTRO})\\fs104\\fsp3\\fad(600,250)`, lin.join('\\N'));
    s += ev(0.9, primero - 0.2, 'Dato', `\\an7\\pos(${X + 3},${CENTRO + alto / 2 + 22})\\c${ACENTO[t.volumen]}\\fsp5\\fad(600,250)`, dato);
  }
  const iniCab = primero > 1.5 ? primero - 0.2 : 0.3;
  s += ev(iniCab, dur - 1.6, 'Titulo', `\\an7\\pos(${X},82)\\fsp2\\fad(400,300)`, tit);
  s += ev(iniCab, dur - 1.6, 'Dato', `\\an7\\pos(${X + 1},132)\\c${ACENTO[t.volumen]}\\fsp4\\alpha&H30&\\fad(400,300)`, dato);
  L.forEach((l, i) => {
    const lin = partir(limpio(l.texto), MAX), alto = lin.length * TAM * 1.12, f = fin[i];
    s += ev(l.ini, f, 'Verso', `\\an4\\move(${X},${CENTRO + 12},${X},${CENTRO},0,220)\\fad(140,120)`, lin.join('\\N'));
    const sig = L[i + 1], ant = L[i - 1];
    // el que sigue, tenue abajo; si viene un silencio largo, aparece solo un rato antes de entrar
    if (sig && sig.ini - f < 2) s += ev(l.ini, f, 'Tenue', `\\an7\\pos(${X},${CENTRO + alto / 2 + 34})\\alpha&H90&\\fad(200,80)`, partir(limpio(sig.texto), MAX_T).join('\\N'));
    if (ant && l.ini - fin[i - 1] < 2) s += ev(l.ini, f, 'Tenue', `\\an1\\pos(${X},${CENTRO - alto / 2 - 34})\\alpha&HB4&\\fad(200,80)`, partir(limpio(ant.texto), MAX_T).join('\\N'));
    if (sig && sig.ini - f >= 2) s += ev(sig.ini - 1.6, sig.ini, 'Tenue', `\\an7\\pos(${X},${CENTRO + 40})\\alpha&H90&\\fad(350,60)`, partir(limpio(sig.texto), MAX_T).join('\\N'));
  });
  return s;
}
function assMiniatura(t) {
  const CENTRO_M = 520, lin = partir(limpio(t.titulo).toUpperCase(), 13), tam = lin.some(l => l.length > 10) ? 118 : 138;
  return assCabecera() + ev(0, 5, 'Titulo', `\\an4\\pos(${X},${CENTRO_M})\\fs${tam}\\fsp2`, lin.join('\\N'))
    + ev(0, 5, 'Dato', `\\an7\\pos(${X + 4},${CENTRO_M + lin.length * tam * 0.56 + 26})\\c${ACENTO[t.volumen]}\\fs34\\fsp5`, 'TACET SIN');
}

const duracion = f => { const r = spawnSync(ffmpeg, ['-hide_banner', '-i', f], { encoding: 'utf8' }); const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr); return +m[1] * 3600 + +m[2] * 60 + +m[3]; };
function correr(args, cwd) { const r = spawnSync(ffmpeg, args, { cwd, encoding: 'utf8', maxBuffer: 1e8 }); if (r.status !== 0) throw new Error(r.stderr.slice(-1200)); }

function descripcion(t, tt) {
  // la misma letra que se ve en el video; una pausa larga separa estrofas
  const letra = tt.lineas.map((l, i) => (i && l.ini - tt.lineas[i - 1].fin > 3 ? '\n' : '') + l.texto).join('\n');
  return `${t.titulo} (Lyrics) - Tacet Sin\n\n"${t.titulo}" — Tacet Sin\nThe Shorts, Vol. ${t.volumen} · Track ${t.pista}\n\nFull album: https://topsecret.ar/music\n\nLYRICS\n\n${letra}\n\n#TacetSin #TheShorts #${t.titulo.replace(/[^A-Za-z0-9]/g, '')}\n`;
}

async function video(t, tiemposTodos) {
  const tt = tiemposTodos[t.slug]; if (!tt) throw new Error(`sin tiempos: ${t.slug}`);
  const carpeta = path.join(OUT, `vol-${t.volumen}`), base = `${String(t.pista).padStart(2, '0')}-${t.slug}`;
  fs.mkdirSync(carpeta, { recursive: true }); fs.mkdirSync(path.join(OUT, 'subs'), { recursive: true });
  const mp3 = path.join(ROOT, 'fuentes/musica/tacet-sin', t.slug + '.mp3'), dur = duracion(mp3);
  fs.writeFileSync(path.join(OUT, 'subs', t.slug + '.ass'), ass(t, tt, dur));
  fs.writeFileSync(path.join(OUT, 'subs', t.slug + '-mini.ass'), assMiniatura(t));
  // con cwd en OUT y rutas relativas: los ":" de una ruta de Windows rompen el filtro ass
  correr(['-y', '-hide_banner', '-loglevel', 'error', '-stream_loop', '-1', '-i', `loop-vol-${t.volumen}.mp4`, '-i', mp3, '-t', dur.toFixed(3),
    '-filter_complex', `[0:v]ass=subs/${t.slug}.ass:fontsdir=fuentes-tipo,fade=t=in:st=0:d=0.8,fade=t=out:st=${(dur - 1.4).toFixed(2)}:d=1.4,format=yuv420p[v]`,
    '-map', '[v]', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', ...COLOR, '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', path.join(carpeta, base + '.mp4')], OUT);
  correr(['-y', '-hide_banner', '-loglevel', 'error', '-i', `portada-vol-${t.volumen}.png`, '-vf', `ass=subs/${t.slug}-mini.ass:fontsdir=fuentes-tipo,scale=1280:720`, '-frames:v', '1', '-q:v', '2', path.join(carpeta, base + '.jpg')], OUT);
  fs.writeFileSync(path.join(carpeta, base + '.txt'), descripcion(t, tt));
  console.log(`OK Vol.${t.volumen} ${base} (${dur.toFixed(1)} s, ${tt.lineas.length} versos)`);
}

// ── Letra oficial de cada tema (Juan, 2026-11-05) ───────────────────────────────────────────────────────────────────
// La letra de los videos pasa a ser letraFinal en letras.json (la que muestra /music), con las etiquetas de sección de la
// letra escrita para que se lea por estrofas. Correr después de corregir letras-tiempos.json.
const palabras = s => new Set(s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean));
const parecidoLinea = (a, b) => { const x = palabras(a), y = palabras(b); let n = 0; for (const w of x) if (y.has(w)) n++; return x.size >= 2 && n === x.size ? 0.9 : n / Math.max(x.size, y.size, 1); };   // una línea cantada a medias también es de esa sección
function conSecciones(t, lineas) {
  const escrita = []; let sec = 'verse';
  for (const crudo of t.letra.split('\n')) { const l = crudo.trim(), m = /^\[(.+)\]$/.exec(l); if (m) sec = m[1]; else if (l) escrita.push({ sec, l }); }
  const out = []; let actual = null, finPrevio = 0;
  for (const v of lineas) {
    const mejor = escrita.reduce((m, e) => { const p = parecidoLinea(v.texto, e.l); return p > m.p ? { p, sec: e.sec } : m; }, { p: 0.34, sec: actual || escrita[0]?.sec || 'verse' });
    if (mejor.sec !== actual || v.ini - finPrevio > 4) { if (out.length) out.push(''); out.push(`[${mejor.sec}]`); actual = mejor.sec; }
    out.push(v.texto); finPrevio = v.fin;
  }
  return out.join('\n');
}
async function letrasWeb() {
  loadEnv();
  const todos = JSON.parse(fs.readFileSync(LETRAS, 'utf8')), tt = JSON.parse(fs.readFileSync(TIEMPOS, 'utf8'));
  for (const t of todos) { if (!tt[t.slug]?.dosPasadas) throw new Error(`sin letra: ${t.slug}`); t.letraFinal = conSecciones(t, tt[t.slug].lineas); t.letraOida = true; }
  fs.writeFileSync(LETRAS, JSON.stringify(todos, null, 2) + '\n');
  const { armarCatalogo } = await import('./catalogo.mjs');
  await armarCatalogo();
}

// ── Apartado Videos de topsecret.ar/music ───────────────────────────────────────────────────────────────────────────
const LISTA_WEB = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/musica/videos.json';
async function publicar(solo) {
  loadEnv();
  const MEDIA = LISTA_WEB.replace('musica/videos.json', ''), dir = path.join(OUT, 'web'); fs.mkdirSync(dir, { recursive: true });
  let lista = [];
  try { const r = await fetch(`${LISTA_WEB}?${Date.now()}`); if (r.ok) lista = (await r.json()).videos || []; } catch {}
  const version = Date.now().toString(36);
  for (const t of temas()) {
    const base = path.join(OUT, `vol-${t.volumen}`, `${String(t.pista).padStart(2, '0')}-${t.slug}`);
    if ((solo.length && !solo.includes(t.slug)) || !fs.existsSync(base + '.mp4')) continue;
    const mp4 = path.join(dir, t.slug + '.mp4'), img = path.join(dir, t.slug + '.webp');
    correr(['-y', '-hide_banner', '-loglevel', 'error', '-i', base + '.mp4', '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', ...COLOR, '-c:a', 'copy', '-movflags', '+faststart', mp4]);
    await sharp(base + '.jpg').webp({ quality: 82 }).toFile(img);
    await putFile(mp4, `musica/videos/${t.slug}.mp4`, 'video/mp4');
    await putFile(img, `musica/videos/${t.slug}.webp`);
    lista = lista.filter(v => v.slug !== t.slug);
    lista.push({ slug: t.slug, titulo: t.titulo, volumen: t.volumen, pista: t.pista, duracion: +duracion(base + '.mp4').toFixed(1),
      video: `${MEDIA}musica/videos/${t.slug}.mp4?v=${version}`, portada: `${MEDIA}musica/videos/${t.slug}.webp?v=${version}` });
    console.log(`subido ${t.titulo} (${(fs.statSync(mp4).size / 1048576).toFixed(0)} MB)`);
  }
  lista.sort((a, b) => a.volumen - b.volumen || a.pista - b.pista);
  const f = path.join(dir, 'videos.json');
  fs.writeFileSync(f, JSON.stringify({ actualizado: new Date().toISOString(), videos: lista }, null, 1));
  await putFile(f, 'musica/videos.json', 'application/json');
  console.log(`apartado Videos: ${lista.length} videos`);
}

const argv = process.argv.slice(2), cmd = argv[0];
const op = n => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : null);
if (cmd === 'loops') { for (const v of op('--vol') ? [Number(op('--vol'))] : [1, 2]) await loop(v); }
else if (cmd === 'tiempos') await tiempos(argv.slice(1));
else if (cmd === 'publicar') await publicar(argv.slice(1));
else if (cmd === 'letras-web') await letrasWeb();
else if (cmd === 'video') {
  const tt = JSON.parse(fs.readFileSync(TIEMPOS, 'utf8')), todos = temas();
  const elegidos = argv.includes('--todos') ? todos.filter(t => !op('--vol') || t.volumen === Number(op('--vol'))) : todos.filter(t => t.slug === argv[1]);
  if (!elegidos.length) throw new Error('no encuentro el tema');
  for (const t of elegidos) await video(t, tt);
}
else { console.log('Uso: videos-youtube.mjs loops [--vol N] | tiempos | video <slug>|--todos [--vol N]'); process.exit(1); }
