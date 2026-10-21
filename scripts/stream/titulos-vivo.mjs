// Títulos del vivo en Twitch (topsecretfc), Kick y YouTube a partir de los partidos de la noche (pedido de Juan,
// 2026-10-21: los títulos quedaban viejos — Twitch decía "Pretemporada Octavos VPUG" en el debut de Espacio Gamer).
// Instagram ya lo pone ig-vivo.mjs al crear su vivo (con el mismo tituloDeNoche()).
// Ninguna de las tres tiene API sin credenciales nuevas: se edita en sus paneles web desde el Chrome CDP con las
// sesiones del club (scripts/abrir-chrome-chatgpt.ps1). Una red que falla no frena a las otras ni al vivo.
//   node scripts/stream/titulos-vivo.mjs [--fecha YYYY-MM-DD] [--titulo "…"] [--solo twitch,kick,youtube] [--ver]
//   (--ver: solo muestra el título que pondría). Lo llama retransmitir.mjs cuando queda esperando el vivo.
// Selectores (2026-10-21): Twitch stream-manager → "Editar información del stream" → #edit-broadcast-title-formgroup
// → "Hecho". Kick dashboard → lápiz de "Información del stream" → textarea[name=title] → "Guardar". YouTube Studio
// → Manage → Stream (#feature-item-0, la URL directa redirige) → ytls-broadcast-metadata #edit-button → #textbox del
// título → #save-button. Ojo: el perfil también tiene el canal personal de Juan; se entra siempre por el id del club.
import { chromium } from 'playwright';
import { spawnSync } from 'child_process';
import path from 'path';
import { pathToFileURL } from 'url';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const YT_CANAL = 'UCEKzzKDMMPri12Q3E9S7IVw';
const MAX = 100;   // YouTube corta en 100; Twitch y Kick permiten 140

// "A, B y C" — "e" delante de i-/hi- (InfinitX → "e InfinitX")
const lista = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + (/^h?i(?!e)/i.test(xs.at(-1)) ? ' e ' : ' y ') + xs.at(-1);

// Partidos = salida de placa-envivo.mjs --json: [{hora, rival, liga, torneo, etapa}]
export function tituloDeNoche(partidos = []) {
  if (!partidos.length) return 'Top Secret FC en vivo';
  const ligas = [...new Set(partidos.map(p => p.liga || 'Amistoso'))];
  const op = (p) => [p.torneo && p.torneo !== p.liga ? p.torneo : null, p.etapa].filter(Boolean).join(' · ');
  let t;
  const rivales = [...new Set(partidos.map(p => p.rival))];
  if (rivales.length === 1) {
    // un partido, o ida y vuelta contra el mismo rival ("… · Fase Oro · Octavos de final · Ida y Vuelta")
    const p = { ...partidos[0], etapa: lista([...new Set(partidos.map(x => x.etapa).filter(Boolean))]) };
    t = `Top Secret FC vs ${p.rival} · ${[p.liga || 'Amistoso', op(p)].filter(Boolean).join(' · ')} | EN VIVO`;
  } else if (ligas.length === 1) {
    t = `Top Secret FC · ${ligas[0]} · vs ${lista(partidos.map(p => p.rival))} | EN VIVO`;
  } else {
    t = `Top Secret FC · vs ${lista(partidos.map(p => `${p.rival} (${p.liga || 'Amistoso'})`))} | EN VIVO`;
  }
  if (t.length <= MAX) return t;
  return `Top Secret FC · ${ligas.join(' y ')} · ${partidos.length} partidos | EN VIVO`.slice(0, MAX);
}

export function partidosDe(fecha) {
  // spawnSync y no execFileSync: Node en Windows a veces sale con "Assertion failed … async.c" (código ≠ 0) después de
  // haber impreso bien el JSON; se usa la salida igual.
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'placa-envivo.mjs'), '--json', '--fecha', fecha], { cwd: ROOT, encoding: 'utf8' });
  return JSON.parse((r.stdout || '').trim().split('\n').pop());
}

const espera = ms => new Promise(r => setTimeout(r, ms));

async function twitch(p, titulo) {
  await p.goto('https://dashboard.twitch.tv/u/topsecretfc/stream-manager', { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: 'Editar información del stream' }).first().click({ timeout: 30000 });
  const campo = p.locator('#edit-broadcast-title-formgroup');
  await campo.waitFor({ timeout: 15000 });
  await campo.fill(titulo);
  await p.locator('[role=dialog] button', { hasText: /^Hecho$/ }).first().click();
  await espera(3000);
  // Verificación por la API pública de Twitch (la misma que lee cualquier visitante)
  const r = await fetch('https://gql.twitch.tv/gql', { method: 'POST', headers: { 'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ user(login:"topsecretfc"){ broadcastSettings{ title } } }' }) }).then(r => r.json()).catch(() => null);
  const quedo = r?.data?.user?.broadcastSettings?.title;
  if (quedo !== undefined && quedo !== titulo) throw new Error(`quedó "${quedo}"`);
}

async function kick(p, titulo) {
  await p.goto('https://dashboard.kick.com/stream', { waitUntil: 'domcontentloaded' });
  await espera(6000);
  // Cartel de cookies (OneTrust) que a veces tapa el panel
  await p.locator('#onetrust-reject-all-handler, #close-pc-btn-handler').first().click({ timeout: 2000 }).catch(() => {});
  // Lápiz del panel "Información del stream": el primer botón de la cabecera que contiene ese texto
  const ok = await p.evaluate(() => {
    const h = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /Información\s*del stream/i.test(e.textContent.trim()));
    let c = h; for (let i = 0; i < 6 && c; i++) { const b = c.querySelector?.('button'); if (b) { b.click(); return true; } c = c.parentElement; }
    return false;
  });
  if (!ok) throw new Error('no encontré el lápiz de "Información del stream"');
  const campo = p.locator('textarea[name=title]');
  await campo.waitFor({ timeout: 15000 });
  await campo.fill(titulo);
  await p.locator('[role=dialog] button', { hasText: /^Guardar$/ }).first().click();
  await espera(3000);
  const quedo = await p.evaluate(() => document.body.innerText);
  if (!quedo.includes(titulo.slice(0, 40))) throw new Error('no veo el título nuevo en el panel');
}

async function youtube(p, titulo) {
  await p.goto(`https://studio.youtube.com/channel/${YT_CANAL}/livestreaming/manage`, { waitUntil: 'domcontentloaded' });
  await p.locator('#feature-item-0').click({ timeout: 30000 });
  // Hay dos ytls-broadcast-metadata (uno oculto). El Edit del visible queda en un contenedor con scroll horizontal,
  // debajo del panel del chat: un clic de Playwright le pega a otro botón ("Edit" del stream vertical). Clic por JS.
  await p.waitForFunction(() => [...document.querySelectorAll('ytls-broadcast-metadata')].some(m => m.offsetParent && m.querySelector('#edit-button')), null, { timeout: 30000 })
    .catch(() => { throw new Error('no apareció el panel del título'); });
  await p.waitForTimeout(5000);   // el panel aparece antes de que el botón responda
  await p.evaluate(() => { const m = [...document.querySelectorAll('ytls-broadcast-metadata')].find(x => x.offsetParent);
    const e = m.querySelector('#edit-button'); (e.querySelector('button') || e).click(); });
  const campo = p.locator('#textbox[aria-label^="Add a title"]:visible, #textbox[aria-label^="Agrega un título"]:visible, #textbox[aria-label^="Añade un título"]:visible').first();
  await campo.waitFor({ timeout: 15000 }).catch(() => { throw new Error('no apareció el campo del título'); });
  await campo.click(); await p.keyboard.press('Control+A'); await p.keyboard.type(titulo);
  await p.locator('ytcp-button#save-button').first().click();
  await espera(4000);
  const quedo = await p.evaluate(() => document.querySelector('ytls-broadcast-metadata')?.innerText || '');
  if (!quedo.includes(titulo.slice(0, 40))) throw new Error('no veo el título nuevo en la sala de control');
}

const REDES = { twitch, kick, youtube };

export async function ponerTitulos(titulo, { redes = Object.keys(REDES), log = console.log } = {}) {
  const vivo = await fetch('http://localhost:9222/json/version', { signal: AbortSignal.timeout(3000) }).then(r => r.ok, () => false);
  if (!vivo) { log('Títulos: el Chrome CDP no está abierto, no los cambio.'); return {}; }
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const res = {};
  for (const red of redes) {
    // Pestaña propia por red, siempre cerrada al terminar (las pestañas acumuladas cuelgan connectOverCDP)
    const p = await b.contexts()[0].newPage();
    try { await p.setViewportSize({ width: 1400, height: 900 }); await REDES[red](p, titulo); res[red] = 'ok'; log(`Título en ${red}: ok`); }
    catch (e) { res[red] = 'falló'; log(`Título en ${red}: falló (${e.message.split('\n')[0].slice(0, 160)})`); }
    finally { await p.close().catch(() => {}); }
  }
  await b.close().catch(() => {});
  return res;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
  const fecha = arg('--fecha') || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const titulo = arg('--titulo') || tituloDeNoche(partidosDe(fecha));
  console.log(`Título (${titulo.length} caracteres): ${titulo}`);
  if (!process.argv.includes('--ver')) await ponerTitulos(titulo, { redes: (arg('--solo') || 'twitch,kick,youtube').split(',') });
}
