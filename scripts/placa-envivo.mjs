#!/usr/bin/env node
// Placa "EN VIVO" para historia de Instagram (1080×1920): invita a ver los partidos de la noche en todas las
// plataformas donde sale el vivo (CFG.canales: Twitch, Kick y YouTube). Mismo lenguaje que placa-debut.mjs (sin recuadros, recortes con poses).
// La API de Instagram no deja poner el sticker de link: el link va escrito grande en la placa.
// Los partidos del día salen solos: RAW de calendario.html (con edits/suspended de Firestore) + calendario/estado.custom.
// Jugadores: 3 del plantel T4 con Gesto4.png, rotando por día. La publica retransmitir.mjs al detectar el vivo.
//
//   node scripts/placa-envivo.mjs [--fecha YYYY-MM-DD] [--out archivo.png|.jpg]
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const CFG = {
  ligas: {                                                    // copa = subtítulo de la placa (actualizar al cambiar de torneo)
    VPUG: { logo: 'logos/VPUG logo.png', color: '#3ecf8e', copa: 'Liga Pretemporada' },
    VPN: { logo: 'logos/VPN logo.png', color: '#f5c518', copa: 'VPN' },
    '11x11': { logo: 'logos/11x11 logo.png', color: '#4a9eff', copa: '11x11' },
  },
  bio: 'LINK EN LA BIO',                                      // linktree en la bio de @fctopsecret (null para sacarlo)
  canales: [
    { red: 'twitch', url: 'twitch.tv/topsecretfc' },
    { red: 'kick', url: 'kick.com/topsecretfc' },
    { red: 'youtube', url: 'youtube.com/@TOPSecretFC' },
  ],
};
const TW = '#9146ff';                                          // violeta de Twitch
const arg = n => { const k = process.argv.indexOf(n); return k > 0 ? process.argv[k + 1] : null; };
const FECHA = arg('--fecha') || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
const OUT = path.resolve(arg('--out') || `fuentes/placas/envivo-${FECHA}.png`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });

// ── Partidos del día ──
const literal = (src, desde) => { const k = src.indexOf(desde); const ini = src.indexOf(desde.endsWith('[') ? '[' : '{', k);
  const fin = src.indexOf(desde.endsWith('[') ? '\n];' : '\n};', ini); return new Function('return ' + src.slice(ini, fin + 2))(); };
const cal = fs.readFileSync('calendario.html', 'utf8');
const RAW = literal(cal, 'const RAW = [');
const BADGES = literal(cal, 'const VPUG_T4_BADGES = {');
const un = v => v.mapValue ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, un(x)]))
  : v.arrayValue ? (v.arrayValue.values || []).map(un) : Object.values(v)[0];
let est = {};
try { est = un({ mapValue: (await (await fetch('https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/calendario/estado')).json()) }); }
catch (e) { console.warn('Firestore no responde, uso solo calendario.html:', e.message); }
const partidos = [
  ...RAW.map((m, k) => ({ ...m, ...(est.edits?.[k] || {}), date: est.suspended?.[k]?.newDate || m.date })),
  ...(est.custom || []).filter(c => c.tipo === 'partido'),
].filter(m => m.date === FECHA).sort((x, y) => x.time.localeCompare(y.time))
  .map(m => ({ hora: m.time, rival: m.rival, liga: m.league, escudo: BADGES[m.rival] || m.badge || null }));
const ligas = [...new Set(partidos.map(p => p.liga).filter(l => CFG.ligas[l]))];
const L0 = CFG.ligas[ligas[0]] || { color: '#c9a84c', copa: partidos.length ? 'Amistoso' : 'Top Secret FC' };
console.log(`${FECHA}: ${partidos.length} partido(s)`, partidos.map(p => `${p.hora} ${p.rival} (${p.liga})`).join(' · '));

// ── Jugadores: 3 del plantel T4 con Gesto4, rotando por día ──
const rost = fs.readFileSync('roster.js', 'utf8'); const t4 = rost.slice(rost.indexOf('const ROSTER_T4'));
const pool = [...t4.matchAll(/key:'([^']+)'/g)].map(m => m[1]).filter(g => fs.existsSync(path.join('Renders', g, 'Gesto4.png')));
const dia = Math.floor(Date.parse(FECHA) / 864e5);
const jugadores = [0, 1, 2].map(k => pool[(dia * 3 + k) % pool.length]);
async function recorte(gt) {
  const src = path.resolve('Renders', gt, 'Gesto4.png');
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = 0, y0 = info.height, y1 = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++)
    if (data[(y * info.width + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const buf = await sharp(src).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).resize({ height: 1100 }).png().toBuffer();
  return 'data:image/png;base64,' + buf.toString('base64');
}
const [izq, centro, der] = await Promise.all(jugadores.map(recorte));
const logos = await Promise.all(ligas.map(async l => 'data:image/png;base64,' + (await sharp(CFG.ligas[l].logo).png().toBuffer()).toString('base64')));
const ICONO = {
  twitch: `<svg viewBox="0 0 24 28" width="46" height="54"><path fill="${TW}" d="M2 0 0 5v19h6v4h3l4-4h5l6-6V0H2zm20 14-4 4h-6l-4 4v-4H3V2h19v12z"/><path fill="${TW}" d="M15 6h2v6h-2zM9 6h2v6H9z"/></svg>`,
  kick: `<svg viewBox="0 0 24 24" width="50" height="50"><rect width="24" height="24" rx="5" fill="#53fc18"/><path fill="#0a0a0a" d="M6 5h4v4h2V7h2V5h4v5h-2v2h-2v0h2v2h2v5h-4v-2h-2v-2h-2v4H6z"/></svg>`,
  youtube: `<svg viewBox="0 0 28 20" width="56" height="40"><rect width="28" height="20" rx="5" fill="#ff0033"/><path fill="#fff" d="M11 5.5v9l8-4.5z"/></svg>`,
};

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;position:relative;overflow:hidden;background:#0a0a0a;font-family:'Barlow Condensed',sans-serif;color:#f4f1ea}
.glow{position:absolute;inset:0;background:radial-gradient(ellipse 80% 35% at 50% 22%,${TW}44,transparent 70%),radial-gradient(ellipse 70% 40% at 50% 58%,rgba(201,168,76,.16),transparent 70%),radial-gradient(ellipse 80% 25% at 50% 100%,${TW}33,transparent 70%)}
.top{position:absolute;top:170px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:26px;z-index:5}
.top img.club{height:64px}.top img.liga{height:70px}.top i{width:2px;height:54px;background:rgba(244,241,234,.25)}
.vivo{position:absolute;top:290px;left:0;right:0;text-align:center;z-index:5}
.badge{display:inline-flex;align-items:center;gap:16px;font-weight:800;font-size:40px;letter-spacing:10px;color:#fff}
.badge b{width:24px;height:24px;border-radius:50%;background:#ff3b3b;box-shadow:0 0 0 10px rgba(255,59,59,.22),0 0 30px #ff3b3b}
.vivo h1{font-weight:900;font-size:236px;line-height:.84;letter-spacing:4px;margin-top:18px;background:linear-gradient(180deg,#fff 20%,#c9a84c 100%);-webkit-background-clip:text;color:transparent}
.vivo .sub{font-weight:800;font-size:46px;letter-spacing:12px;color:${L0.color};margin-top:10px}
.jug{position:absolute;z-index:2}
.jug.c{height:600px;left:50%;transform:translateX(-50%);top:680px;z-index:3}
.jug.l,.jug.r{height:530px;top:740px;filter:brightness(.78)}.jug.l{left:130px}.jug.r{right:130px}
.fade{position:absolute;left:0;right:0;top:960px;bottom:0;z-index:4;background:linear-gradient(rgba(10,10,10,0),rgba(10,10,10,.94) 22%,#0a0a0a 32%)}
.abajo{position:absolute;left:90px;right:90px;bottom:90px;z-index:5;display:flex;flex-direction:column;align-items:center;gap:34px}
.part{align-self:stretch}
.fila{display:flex;align-items:center;gap:22px;padding:12px 0;border-top:1px solid rgba(244,241,234,.14)}
.fila:last-child{border-bottom:1px solid rgba(244,241,234,.14)}
.hora{font-weight:800;font-size:50px;color:#c9a84c;width:124px}.esc{width:58px;height:58px;object-fit:contain}.riv{flex:1;font-weight:800;font-size:42px}
.canales{display:flex;flex-direction:column;align-items:flex-start;gap:14px}
.canal{display:flex;align-items:center;gap:20px}
.canal .ic{width:60px;display:flex;justify-content:center}
.canal span{font-weight:900;font-size:52px;letter-spacing:1px;color:#fff}
.bio{text-align:center}
.bio span{display:inline-block;padding:14px 36px;border-radius:999px;background:#c9a84c;color:#0a0a0a;font-weight:900;font-size:36px;letter-spacing:8px}
.cta{text-align:center;font-weight:700;font-size:30px;letter-spacing:9px;color:rgba(244,241,234,.7);margin-bottom:-14px}
.tag{font-weight:700;font-size:24px;letter-spacing:4px;color:rgba(244,241,234,.55)}
</style></head><body>
<div class="glow"></div>
<div class="top"><img class="club" src="https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/rebrand/clean-dorado.webp">${logos.map(l => `<i></i><img class="liga" src="${l}">`).join('')}</div>
<div class="vivo"><div class="badge"><b></b>AHORA</div><h1>EN VIVO</h1><div class="sub">${L0.copa.toUpperCase()}</div></div>
<img class="jug l" src="${izq}"><img class="jug r" src="${der}"><img class="jug c" src="${centro}">
<div class="fade"></div>
<div class="abajo">${partidos.length ? `<div class="part">${partidos.map(p => `<div class="fila"><div class="hora">${p.hora}</div>${p.escudo ? `<img class="esc" src="${p.escudo}">` : ''}<div class="riv">${p.rival}</div>${ligas.length > 1 || !CFG.ligas[p.liga] ? `<div class="tag">${p.liga.toUpperCase()}</div>` : ''}</div>`).join('')}</div>` : ''}
<div class="cta">MIRANOS DONDE QUIERAS</div>
<div class="canales">${CFG.canales.map(c => `<div class="canal"><div class="ic">${ICONO[c.red]}</div><span>${c.url}</span></div>`).join('')}</div>
${CFG.bio ? `<div class="bio"><span>${CFG.bio}</span></div>` : ''}</div>
</body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
const png = await p.screenshot();
if (/.jpe?g$/i.test(OUT)) await sharp(png).jpeg({ quality: 90 }).toFile(OUT); else fs.writeFileSync(OUT, png);   // Instagram exige JPEG
await b.close();
console.log('Listo:', OUT);
