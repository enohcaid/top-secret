#!/usr/bin/env node
// Placa "EN VIVO" para historia de Instagram (1080×1920): invita a ver los partidos de la noche en todas las
// plataformas donde sale el vivo (CFG.canales: Twitch, Kick y YouTube). Desde 2026-10-14, estilo de las piezas de
// noticias: una foto a pantalla completa (fondo-envivo.mjs la genera en ChatGPT) con las letras en contraste encima.
// La API de Instagram no deja poner el sticker de link: el link va escrito grande en la placa.
// Los partidos del día salen solos: RAW de calendario.html (con edits/suspended de Firestore) + calendario/estado.custom.
// La publica retransmitir.mjs al detectar el vivo.
//
//   node scripts/placa-envivo.mjs [--fecha YYYY-MM-DD] [--fondo foto] [--out archivo.png|.jpg]
//   --json: solo imprime los partidos del día en JSON (lo usa retransmitir.mjs para la placa del overlay)
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const CFG = {
  ligas: {                                                    // el torneo (subtítulo) sale de cada partido: ver torneoDe()
    VPUG: { logo: 'logos/VPUG logo.png', color: '#3ecf8e' },
    VPN: { logo: 'logos/VPN logo.png', color: '#f5c518' },
    '11x11': { logo: 'logos/11x11 logo.png', color: '#4a9eff' },
    'Espacio Gamer': { logo: 'logos/Espacio Gamer logo.png', color: '#4a9eff' },   // ex 11x11 desde la T4
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
const BADGES = { ...literal(cal, 'const VPUG_T4_BADGES = {'), ...literal(cal, 'const E11_T4_BADGES = {') };
// Desde la T4 la clave interna '11x11' es la liga Espacio Gamer (mismo criterio que lgLabel() de calendario.html)
const ligaVisible = m => m.league === '11x11' && m.date > '2026-09-28' ? 'Espacio Gamer' : m.league;
// Torneo de cada partido de RAW: el bloque "// ══ <LIGA> T? — <torneo> ══" bajo el que está anotado en calendario.html
// ("VPUG T4 — Liga Pretemporada VPUG (FC-27) (T7 CopáFácil), Grupo D" → "Liga Pretemporada"). Sin nombre → la liga sola.
const torneoDe = (h, liga) => {
  const t = (h.split(/\s+—\s+/)[1] || '').replace(/\(.*?\)/g, '').replace(/,.*$/, '').replace(/#\d+/g, '')
    .replace(new RegExp('\\b' + liga + '\\b', 'gi'), '').replace(/\s+/g, ' ').trim();
  return !t || /^temporada\b|^partidos jugados/i.test(t) ? liga : t.replace(/\b(\p{Lu})(\p{Lu}+)\b/gu, (_, a, b) => a + b.toLowerCase());
};
const rawSrc = cal.slice(cal.indexOf('const RAW = ['), cal.indexOf('\n];', cal.indexOf('const RAW = [')));
const TORNEOS = []; let cab = '';
for (const l of rawSrc.split('\n')) { const h = l.match(/\/\/\s*══\s*(.*?)\s*══/); if (h) cab = h[1]; else if (/^\s*\{\s*date:/.test(l)) TORNEOS.push(cab); }
if (TORNEOS.length !== RAW.length) TORNEOS.length = 0;          // si no cuadra, cae a la liga sola
const un = v => v.mapValue ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, un(x)]))
  : v.arrayValue ? (v.arrayValue.values || []).map(un) : Object.values(v)[0];
let est = {};
try { est = un({ mapValue: (await (await fetch('https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/calendario/estado')).json()) }); }
catch (e) { console.warn('Firestore no responde, uso solo calendario.html:', e.message); }
const partidos = [
  ...RAW.map((m, k) => { const x = { ...m, ...(est.edits?.[k] || {}), date: est.suspended?.[k]?.newDate || m.date };
    // Playoffs: el antetítulo es la instancia ("Fase Oro · Octavos de final") y cada fila dice IDA/VUELTA
    if (x.playoff) return { ...x, torneo: x.playoff.replace(/\s*·\s*(Ida|Vuelta)$/i, ''), etapa: (x.playoff.match(/(Ida|Vuelta)$/i) || [])[1] || '' };
    return { ...x, torneo: TORNEOS[k] ? torneoDe(TORNEOS[k], x.league) : x.league }; }),
  ...(est.custom || []).filter(c => c.tipo === 'partido')
    // "Fecha N" (fase regular) va como etiqueta de cada fila, igual que IDA/VUELTA en los playoffs
    .map(c => /^Fecha \d+$/i.test(c.instancia || '') ? { ...c, torneo: ligaVisible(c), etapa: c.instancia }
      : ({ ...c, torneo: c.league === 'Amistoso' ? 'Amistoso' : c.instancia ? `${ligaVisible(c)} · ${c.instancia}` : ligaVisible(c) })),
].filter(m => m.date === FECHA).sort((x, y) => x.time.localeCompare(y.time))
  .map(m => ({ hora: m.time, rival: m.rival, liga: ligaVisible(m), torneo: m.torneo, etapa: m.etapa || '', escudo: BADGES[m.rival] || m.badge || null }));
if (process.argv.includes('--json')) { console.log(JSON.stringify(partidos)); process.exit(0); }
const ligas = [...new Set(partidos.map(p => p.liga).filter(l => CFG.ligas[l]))];
const torneos = [...new Set(partidos.map(p => p.torneo))];
const L0 = { color: ligas.length === 1 ? CFG.ligas[ligas[0]].color : '#c9a84c', copa: torneos.join(' · ') || 'Top Secret FC' };
console.log(`${FECHA}: ${partidos.length} partido(s)`, partidos.map(p => `${p.hora} ${p.rival} (${p.liga} — ${p.torneo})`).join(' · '));

// ── Foto de fondo a pantalla completa (fondo-envivo.mjs la genera en ChatGPT) ──
// --fondo <archivo>, o la más reciente de fuentes/placas/fondos-envivo/; si no hay ninguna,
// la última imagen de historia de la noticia diaria (también es una foto vertical del plantel).
const recientes = (dir, re) => fs.existsSync(dir)
  ? fs.readdirSync(dir).filter(f => re.test(f)).map(f => path.join(dir, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs) : [];
const FONDO = arg('--fondo') || recientes('fuentes/placas/fondos-envivo', /\.(png|jpe?g|webp)$/i)[0]
  || recientes('Renders/Daily News', /_story\.png$/i)[0];
if (!FONDO) throw new Error('No hay foto de fondo: correr scripts/fondo-envivo.mjs o pasar --fondo');
console.log('Fondo:', FONDO);
const fondo = 'data:image/jpeg;base64,' + (await sharp(FONDO).resize(1080, 1920, { fit: 'cover', position: 'attention' }).jpeg({ quality: 92 }).toBuffer()).toString('base64');
const logos = await Promise.all(ligas.map(async l => 'data:image/png;base64,' + (await sharp(CFG.ligas[l].logo).png().toBuffer()).toString('base64')));
const ICONO = {
  twitch: `<svg viewBox="0 0 24 28" width="38" height="44"><path fill="${TW}" d="M2 0 0 5v19h6v4h3l4-4h5l6-6V0H2zm20 14-4 4h-6l-4 4v-4H3V2h19v12z"/><path fill="${TW}" d="M15 6h2v6h-2zM9 6h2v6H9z"/></svg>`,
  kick: `<svg viewBox="0 0 24 24" width="40" height="40"><rect width="24" height="24" rx="5" fill="#53fc18"/><path fill="#0a0a0a" d="M6 5h4v4h2V7h2V5h4v5h-2v2h-2v0h2v2h2v5h-4v-2h-2v-2h-2v4H6z"/></svg>`,
  youtube: `<svg viewBox="0 0 28 20" width="44" height="32"><rect width="28" height="20" rx="5" fill="#ff0033"/><path fill="#fff" d="M11 5.5v9l8-4.5z"/></svg>`,
};
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/rebrand/';
const etapa = p => (p.etapa || '').toUpperCase();

// Mismo lenguaje que las piezas de noticias (noticia-redes.js): foto a sangre, degradé abajo, escudo,
// filete dorado, antetítulo dorado espaciado, título enorme en blanco y una línea chica al pie.
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;position:relative;overflow:hidden;background:#0a0a0a;font-family:'Barlow Condensed',sans-serif;color:#f4f1ea}
.foto{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.velo{position:absolute;inset:0;background:
  linear-gradient(180deg,rgba(10,10,10,.72) 0,rgba(10,10,10,0) 300px),
  linear-gradient(180deg,rgba(10,10,10,0) 34%,rgba(10,10,10,.78) 52%,rgba(10,10,10,.95) 64%,#0a0a0a 80%)}
.arriba{position:absolute;top:84px;left:80px;right:80px;display:flex;align-items:center;justify-content:space-between;z-index:3}
.live{display:inline-flex;align-items:center;gap:14px;padding:12px 26px 12px 20px;border-radius:999px;background:#e5252a;color:#fff;font-weight:900;font-size:34px;letter-spacing:7px;box-shadow:0 8px 30px rgba(229,37,42,.45)}
.live b{width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 0 0 6px rgba(255,255,255,.3)}
.marcas{display:flex;align-items:center;gap:22px}.marcas img{height:58px}.marcas i{width:2px;height:46px;background:rgba(244,241,234,.35)}
.abajo{position:absolute;left:80px;right:80px;bottom:86px;z-index:3}
.escudo{height:74px;display:block}
.filete{width:84px;height:5px;background:#c9a84c;margin:26px 0 22px}
.kicker{font-weight:800;font-size:${L0.copa.length > 30 ? 28 : 34}px;letter-spacing:7px;color:#c9a84c;text-transform:uppercase}
h1{font-weight:900;font-size:258px;line-height:.82;letter-spacing:-2px;color:#f4f1ea;margin:14px 0 30px;text-shadow:0 6px 40px rgba(0,0,0,.5)}
.part{margin-bottom:30px}
.fila{display:flex;align-items:center;gap:22px;padding:14px 0;border-top:1px solid rgba(244,241,234,.18)}
.fila:last-child{border-bottom:1px solid rgba(244,241,234,.18)}
.hora{font-weight:800;font-size:48px;color:#c9a84c;width:120px}.esc{width:56px;height:56px;object-fit:contain}
.riv{flex:1;font-weight:800;font-size:44px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tag{font-weight:700;font-size:24px;letter-spacing:5px;color:rgba(244,241,234,.6)}
.canales{display:flex;flex-direction:column;gap:12px;margin-bottom:30px}
.canal{display:flex;align-items:center;gap:18px}.canal .ic{width:48px;display:flex;justify-content:center}
.canal span{font-weight:800;font-size:42px;letter-spacing:.5px;color:#fff}
.pie{font-weight:700;font-size:28px;letter-spacing:8px;color:rgba(244,241,234,.72)}
.pie b{color:#c9a84c;font-weight:800}
</style></head><body>
<img class="foto" src="${fondo}">
<div class="velo"></div>
<div class="arriba"><div class="live"><b></b>AHORA</div>
  <div class="marcas">${logos.map(l => `<img src="${l}">`).join('<i></i>')}</div></div>
<div class="abajo">
  <img class="escudo" src="${MEDIA}clean-white.webp" onerror="this.style.display='none'">
  <div class="filete"></div>
  <div class="kicker">${L0.copa.toUpperCase()}</div>
  <h1>EN VIVO</h1>
  ${partidos.length ? `<div class="part">${partidos.map(p => `<div class="fila"><div class="hora">${p.hora}</div>${p.escudo ? `<img class="esc" src="${p.escudo}">` : ''}<div class="riv">${p.rival}</div>${etapa(p) ? `<div class="tag">${etapa(p)}</div>` : torneos.length > 1 ? `<div class="tag">${p.torneo.toUpperCase()}</div>` : ''}</div>`).join('')}</div>` : ''}
  <div class="canales">${CFG.canales.map(c => `<div class="canal"><div class="ic">${ICONO[c.red]}</div><span>${c.url}</span></div>`).join('')}</div>
  <div class="pie">MIRANOS DONDE QUIERAS${CFG.bio ? ` · <b>${CFG.bio}</b>` : ''}</div>
</div>
</body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
const png = await p.screenshot();
if (/.jpe?g$/i.test(OUT)) await sharp(png).jpeg({ quality: 90 }).toFile(OUT); else fs.writeFileSync(OUT, png);   // Instagram exige JPEG
await b.close();
console.log('Listo:', OUT);
