#!/usr/bin/env node
// Sube los lyric videos de The Shorts al canal de YouTube de Tacet Sin desde el Chrome CDP, con una playlist por disco.
// Todo en inglés (regla de Juan): título, descripción y playlists salen de fuentes/musica/youtube/vol-N/*.txt.
// "AI use" va en Yes: lo pide YouTube para música generada con IA que es el foco del video (decisión de Juan, 2026-11-05).
//
//   node scripts/beats/subir-youtube-tacet.mjs playlists
//   node scripts/beats/subir-youtube-tacet.mjs subir <slug>… [--privado]   o   subir --todos   (saltea lo ya subido)
//   node scripts/beats/subir-youtube-tacet.mjs terminar-borrador <slug>   → completa y publica un borrador ya subido de ese tema
//   node scripts/beats/subir-youtube-tacet.mjs hacer-publico <slug>       → pasa a público una prueba privada ya verificada
//
// OJO: studio.youtube.com/channel/tacetsin redirige al canal del club. El canal de Tacet Sin es CANAL (abajo).
// Registro versionado: scripts/beats/youtube-tacet.json. Si YouTube corta por el límite diario, se vuelve a correr y sigue.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { ROOT } from '../lib/env.mjs';
import { asegurarVentana, cargarArchivos } from '../lib/ventana.mjs';

const CANAL = 'UC1tHhG-3UeEPK7iOmw23wHw';
const OUT = path.join(ROOT, 'fuentes/musica/youtube');
const REG = path.join(ROOT, 'scripts/beats/youtube-tacet.json');
const SHOTS = path.join(OUT, 'capturas'); fs.mkdirSync(SHOTS, { recursive: true });
const PLAYLISTS = {
  1: { titulo: 'The Shorts, Vol. 1', descripcion: 'Tacet Sin. Short songs, each one a moment: the night before something big, the effort nobody sees, the wound that takes its time to close.\n\nLyric videos.' },
  2: { titulo: 'The Shorts, Vol. 2', descripcion: 'Tacet Sin. The second part: later, deeper.\n\nLyric videos.' },
};
const SHORTS_VOL1 = 12;
const temas = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/beats/letras.json'), 'utf8')).map((t, i) => ({ slug: t.slug, titulo: t.titulo, volumen: i < SHORTS_VOL1 ? 1 : 2, pista: i < SHORTS_VOL1 ? i + 1 : i - SHORTS_VOL1 + 1 }));
const leerReg = () => (fs.existsSync(REG) ? JSON.parse(fs.readFileSync(REG, 'utf8')) : { canal: CANAL, playlists: {}, videos: {} });
const guardarReg = r => fs.writeFileSync(REG, JSON.stringify(r, null, 2) + '\n');
// El texto público no puede tener español ni hablar de cómo se hizo: si aparece, se frena antes de subir
const PROHIBIDO = /\b(temas?|letra|disco|canci[oó]n|música|portada|the shorts vol\. \d de)\b|[áéíóúñ¿¡]|\b(AI|IA|artificial|generated|suno|ace-step|claude)\b/i;

const argv = process.argv.slice(2), cmd = argv[0];
const b = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const ctx = b.contexts()[0];
const p = await ctx.newPage();
await asegurarVentana(p);
p.setDefaultTimeout(60000);
const espera = ms => p.waitForTimeout(ms);
const shot = n => p.screenshot({ path: path.join(SHOTS, `${n}.png`) }).catch(() => {});
const elegir = async (dentro, disparador, opcion) => {
  await dentro.locator('ytcp-dropdown-trigger:visible', { hasText: disparador }).first().click();
  await espera(1200);
  await p.locator('tp-yt-paper-item:visible, ytcp-text-menu tp-yt-paper-item:visible', { hasText: opcion }).first().click();
  await espera(900);
};
const verificarCanal = async () => {
  const txt = await p.locator('body').innerText();
  if (!/Your channel\s+Tacet Sin/i.test(txt) || !p.url().includes(CANAL)) throw new Error(`no estoy en el canal de Tacet Sin (${p.url()})`);
};

async function crearPlaylists() {
  const reg = leerReg();
  for (const v of [1, 2]) {
    if (reg.playlists[v]) { console.log('ya existe', PLAYLISTS[v].titulo); continue; }
    await p.goto(`https://studio.youtube.com/channel/${CANAL}/content/playlists`, { waitUntil: 'domcontentloaded' });
    await espera(7000); await verificarCanal();
    await p.locator('ytcp-button:visible, button:visible', { hasText: /^\s*Create\s*$/ }).first().click();
    await espera(1200);
    await p.locator('tp-yt-paper-item:visible', { hasText: 'New playlist' }).first().click();
    await espera(2500);
    const d = p.locator('ytcp-playlist-creation-dialog');
    await d.locator('#textbox').nth(0).click(); await d.locator('#textbox').nth(0).type(PLAYLISTS[v].titulo, { delay: 8 });
    await d.locator('#textbox').nth(1).click(); await d.locator('#textbox').nth(1).type(PLAYLISTS[v].descripcion, { delay: 4 });
    await espera(500);
    // viene en "Date published (newest)": el disco se vería al revés
    // (al crearla no hay "Manual"; se agregan en orden de pista, así que "Date added (oldest)" es el orden del disco)
    await elegir(d, 'Default video order', /Date added \(oldest\)/);
    await shot(`playlist-${v}`);
    await d.locator('#create-button').click();
    await espera(6000);
    reg.playlists[v] = PLAYLISTS[v].titulo; guardarReg(reg);
    console.log('creada', PLAYLISTS[v].titulo);
  }
}

async function subir(t, { privado, deBorrador = false }) {
  const base = path.join(OUT, `vol-${t.volumen}`, `${String(t.pista).padStart(2, '0')}-${t.slug}`);
  const [titulo, ...resto] = fs.readFileSync(base + '.txt', 'utf8').split('\n');
  const descripcion = resto.join('\n').trim();
  const malo = (titulo + '\n' + descripcion).match(PROHIBIDO);
  if (malo) throw new Error(`${t.slug}: el texto tiene "${malo[0]}"`);
  if (deBorrador) {
    // retoma un borrador ya subido de este mismo tema: no gasta cupo diario
    await p.goto(`https://studio.youtube.com/channel/${CANAL}/videos/upload`, { waitUntil: 'domcontentloaded' });
    await espera(8000); await verificarCanal();
    // innerText (no textContent): todas las filas tienen "Edit draft" oculto, solo el borrador lo muestra
    const abierto = await p.evaluate(tit => {
      const fila = [...document.querySelectorAll('ytcp-video-row')].find(r => r.innerText.includes(tit) && /\bDraft\b/.test(r.innerText));
      if (!fila) return false;
      const x = [...fila.querySelectorAll('ytcp-button, button, a')].find(n => n.innerText?.trim() === 'Edit draft');
      if (!x) return false;
      x.click(); return true;
    }, titulo);
    if (!abierto) throw new Error(`no hay borrador de ${titulo}`);
    await espera(9000);
  } else {
    await p.goto(`https://studio.youtube.com/channel/${CANAL}/videos/upload?d=ud`, { waitUntil: 'domcontentloaded' });
    await espera(7000); await verificarCanal();
    await cargarArchivos(p.locator('input[type=file]').first(), base + '.mp4', { timeout: 10 * 60000 });
    await espera(12000);
  }
  const aviso = await p.locator('body').innerText();
  if (/daily upload limit|reached.*limit/i.test(aviso)) throw new Error('LIMITE: YouTube cortó por el límite diario de subidas');
  const cajas = p.locator('ytcp-uploads-dialog #textbox');
  await cajas.nth(0).click(); await p.keyboard.press('Control+A'); await p.keyboard.press('Delete');
  await cajas.nth(0).type(titulo, { delay: 6 });
  await cajas.nth(1).click(); await cajas.nth(1).type(descripcion, { delay: 1 });
  await espera(800);
  let miniatura = true;
  try { await p.locator('input#file-loader').first().setInputFiles(base + '.jpg', { timeout: 15000 }); await espera(6000); }
  catch (e) { miniatura = false; console.log('  miniatura no subida:', e.message.split('\n')[0]); }
  // playlist del disco
  const dlg = p.locator('ytcp-uploads-dialog');
  await dlg.locator('ytcp-video-metadata-playlists ytcp-dropdown-trigger, ytcp-dropdown-trigger:visible').filter({ hasText: /^\s*(Playlists\s*)?Select\s*$/ }).first().click();
  await espera(1800);
  const lista = p.locator('ytcp-playlist-dialog:visible, tp-yt-paper-dialog:visible').last();
  await lista.locator('ytcp-checkbox-group, ul, *').getByText(PLAYLISTS[t.volumen].titulo, { exact: true }).first().click();
  await espera(800);
  await lista.locator('ytcp-button:visible, button:visible', { hasText: /^\s*Done\s*$/ }).first().click();
  await espera(1200);
  await p.locator('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]').click();
  await espera(600);
  await dlg.locator('#toggle-button').click();
  await espera(2000);
  await p.locator('tp-yt-paper-radio-button[name="VIDEO_HAS_ALTERED_CONTENT_YES"]').click();
  await espera(600);
  await elegir(dlg, 'Video language', /^\s*English\s*$/);
  // la primera vez viene "People & Blogs"; después YouTube recuerda la última usada
  const categoria = dlg.locator('ytcp-dropdown-trigger:visible').filter({ hasText: /^\s*(Category\s*)?Music\s*$/ });
  if (!(await categoria.count())) await elegir(dlg, 'People & Blogs', /^\s*Music\s*$/);
  if (!(await categoria.count())) throw new Error('no pude poner la categoría Music');
  await shot(`${t.slug}-detalles`);
  for (let i = 0; i < 3; i++) { await p.locator('#next-button').click(); await espera(2500); }
  await p.locator(`tp-yt-paper-radio-button[name="${privado ? 'PRIVATE' : 'PUBLIC'}"]`).click();
  await espera(1500);
  const url = await p.evaluate(() => [...document.querySelectorAll('ytcp-uploads-dialog a')].map(a => a.href).find(h => /youtu\.be\/|watch\?v=/.test(h)) || '');
  await shot(`${t.slug}-visibilidad`);
  // esperar a que termine la subida antes de publicar y cerrar la pestaña
  const t0 = Date.now();
  for (let ultimo = ''; Date.now() - t0 < 30 * 60000; await espera(5000)) {
    const estado = await p.evaluate(() => (document.querySelector('ytcp-uploads-dialog ytcp-video-upload-progress, ytcp-uploads-dialog .progress-label') || {}).textContent || '').catch(() => '');
    if (estado.trim() !== ultimo) { ultimo = estado.trim(); console.log('  subida:', ultimo.replace(/\s+/g, ' ').slice(0, 70)); }
    // ojo: mientras sube dice "89% uploaded … Processing will start after", no confundirlo con terminado
    if (!/\d+\s*%\s*uploaded/i.test(estado)) break;
  }
  await p.locator('#done-button').click();
  await espera(7000);
  await shot(`${t.slug}-fin`);
  const reg = leerReg();
  reg.videos[t.slug] = { url, titulo, volumen: t.volumen, pista: t.pista, visibilidad: privado ? 'private' : 'public', miniatura, ai: 'yes' };
  guardarReg(reg);
  console.log(`OK ${titulo} → ${url}`);
}

async function hacerPublico(slug) {
  const reg = leerReg(), v = reg.videos[slug];
  if (!v) throw new Error('no está en el registro');
  const id = /(?:youtu\.be\/|v=)([\w-]{11})/.exec(v.url)?.[1];
  if (!id) throw new Error('sin id de video');
  await p.goto(`https://studio.youtube.com/video/${id}/edit`, { waitUntil: 'domcontentloaded' });
  await espera(8000);
  await p.locator('ytcp-video-metadata-visibility ytcp-dropdown-trigger, ytcp-video-metadata-visibility #select-button').first().click();
  await espera(1500);
  await p.locator('tp-yt-paper-radio-button[name="PUBLIC"]').click();
  await espera(800);
  await p.locator('#save-button:visible, ytcp-button#save-button').last().click();
  await espera(1200);
  await p.locator('ytcp-button#save:visible, #save:visible').first().click();
  await espera(6000);
  await shot(`${slug}-publico`);
  reg.videos[slug].visibilidad = 'public'; guardarReg(reg);
  console.log('público:', v.url);
}

try {
  if (cmd === 'playlists') await crearPlaylists();
  else if (cmd === 'subir') {
    const privado = argv.includes('--privado'), reg = leerReg(), todos = temas();
    const pedidos = argv.includes('--todos') ? todos : todos.filter(t => argv.includes(t.slug));
    if (!pedidos.length) throw new Error('¿qué temas?');
    let hechos = 0;
    for (const t of pedidos) {
      if (leerReg().videos[t.slug]) { console.log('ya subido', t.slug); continue; }
      await subir(t, { privado }); hechos++;
    }
    console.log(`listo: ${hechos} subidos en esta corrida, ${Object.keys(leerReg().videos).length} en total`);
  }
  else if (cmd === 'hacer-publico') await hacerPublico(argv[1]);
  else if (cmd === 'terminar-borrador') { const r = leerReg(); delete r.videos[argv[1]]; guardarReg(r); await subir(temas().find(t => t.slug === argv[1]), { privado: false, deBorrador: true }); }
  else console.log('uso: playlists | subir <slug>…|--todos [--privado] | hacer-publico <slug>');
} catch (e) {
  await shot('error');
  console.error('ERROR:', e.message.split('\n')[0]);
  process.exitCode = 1;
} finally {
  await p.close().catch(() => {});
  await b.close().catch(() => {});
  process.exit(process.exitCode || 0);
}
