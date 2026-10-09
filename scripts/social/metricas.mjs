#!/usr/bin/env node
// Métricas de las publicaciones del club, para saber qué formato rinde en cada red.
// Por ahora Instagram (Graph API, mismo token que scripts/meta.mjs). Facebook: la página tiene 0
// seguidores y sus insights requieren read_insights; YouTube, X y TikTok se suman después por CDP.
//
//   node scripts/social/metricas.mjs              → tabla de los últimos 50 posts de Instagram + resumen por formato
//   node scripts/social/metricas.mjs --limite 100
//   node scripts/social/metricas.mjs --json fuentes/redes/metricas-ig.json   (además guarda el detalle)
import fs from 'fs';
import { loadEnv } from '../lib/env.mjs';

const E = loadEnv();
const G = 'https://graph.facebook.com/v21.0';
const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i < 0 ? null : argv[i + 1]; };
const LIMITE = Number(opt('--limite') || 50);

async function get(path, params = {}) {
  const u = new URL(G + path);
  for (const [k, v] of Object.entries({ ...params, access_token: E.META_PAGE_TOKEN })) u.searchParams.set(k, v);
  const j = await (await fetch(u)).json();
  if (j.error) throw new Error(`${path}: ${j.error.message}`);
  return j;
}

// Formato real del post: Reel, carrusel o imagen (la API dice VIDEO también para los reels).
const formato = m => m.media_product_type === 'REELS' ? 'reel'
  : m.media_type === 'CAROUSEL_ALBUM' ? 'carrusel'
  : m.media_type === 'VIDEO' ? 'video' : 'imagen';

async function insights(m) {
  // Las métricas válidas cambian según el tipo; si una no aplica, la API rechaza el pedido entero.
  const sets = [['reach', 'views', 'saved', 'shares', 'total_interactions'], ['reach', 'saved', 'shares', 'total_interactions'], ['reach']];
  for (const metric of sets) {
    try {
      const r = await get(`/${m.id}/insights`, { metric: metric.join(',') });
      return Object.fromEntries(r.data.map(d => [d.name, d.values?.[0]?.value ?? d.total_value?.value ?? 0]));
    } catch { /* probar con menos métricas */ }
  }
  return {};
}

const posts = [];
let next = null;
do {
  const page = next ? await (await fetch(next)).json()
    : await get(`/${E.META_IG_ID}/media`, { fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count', limit: 50 });
  posts.push(...page.data);
  next = page.paging?.next;
} while (next && posts.length < LIMITE);

const filas = [];
for (const m of posts.slice(0, LIMITE)) {
  const i = await insights(m);
  filas.push({
    fecha: m.timestamp.slice(0, 10), formato: formato(m), url: m.permalink,
    texto: (m.caption || '').replace(/\s+/g, ' ').slice(0, 50),
    likes: m.like_count ?? 0, comentarios: m.comments_count ?? 0,
    alcance: i.reach ?? null, vistas: i.views ?? null, guardados: i.saved ?? null, compartidos: i.shares ?? null,
  });
}

console.log('fecha       formato   alcance  vistas  likes  coment  guard  compart  texto');
for (const f of filas) {
  const c = (v, n) => String(v ?? '-').padStart(n);
  console.log(`${f.fecha}  ${f.formato.padEnd(8)} ${c(f.alcance, 7)} ${c(f.vistas, 7)} ${c(f.likes, 6)} ${c(f.comentarios, 7)} ${c(f.guardados, 6)} ${c(f.compartidos, 8)}  ${f.texto}`);
}

// Resumen por formato: mediana (no promedio: un post viral distorsiona).
const mediana = xs => { const v = xs.filter(x => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
console.log('\nResumen por formato (medianas)');
console.log('formato    posts  alcance  vistas  likes  compart  guard');
for (const fmt of [...new Set(filas.map(f => f.formato))]) {
  const g = filas.filter(f => f.formato === fmt);
  const c = (k, n) => String(mediana(g.map(f => f[k])) ?? '-').padStart(n);
  console.log(`${fmt.padEnd(9)} ${String(g.length).padStart(6)} ${c('alcance', 8)} ${c('vistas', 7)} ${c('likes', 6)} ${c('compartidos', 8)} ${c('guardados', 6)}`);
}

const salida = opt('--json');
if (salida) { fs.mkdirSync(salida.replace(/[\\/][^\\/]+$/, ''), { recursive: true }); fs.writeFileSync(salida, JSON.stringify(filas, null, 2)); console.log('\nDetalle en', salida); }
