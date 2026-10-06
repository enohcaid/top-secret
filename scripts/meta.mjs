#!/usr/bin/env node
/**
 * Publicar en Instagram (@fctopsecret) y en la página de Facebook "TOP Secret FC" con la Graph API de Meta.
 * Credenciales en .env: META_APP_ID, META_APP_SECRET, META_USER_TOKEN (vence ~60 días), META_PAGE_ID,
 * META_PAGE_TOKEN (permanente, derivado del de usuario), META_IG_ID. Ver docs/conocimiento/reference_publicar_redes.md.
 *
 *   node scripts/meta.mjs estado                                  verifica tokens y cuentas
 *   node scripts/meta.mjs ig-imagen  <url-publica> "<texto>"      post de una imagen
 *   node scripts/meta.mjs ig-carrusel "<texto>" <url1> <url2> …   carrusel (2-10 imágenes)
 *   node scripts/meta.mjs ig-reel   <url-publica.mp4> "<texto>"   reel (SIN música de la biblioteca: la API no la permite)
 *   node scripts/meta.mjs ig-historia <url-publica.mp4|jpg>        historia (24 h), sin stickers ni música de la biblioteca
 *   node scripts/meta.mjs fb-foto   <url-publica> "<texto>"
 *   node scripts/meta.mjs fb-album  "<texto>" <url1> <url2> …    post de Facebook con varias fotos
 *   node scripts/meta.mjs fb-video  <url-publica.mp4> "<texto>"
 *   Agregar --prueba para crear el contenedor/validar sin publicar.
 *
 * Las URLs tienen que ser públicas (R2: https://top-secret-proxy.juan-c-m-1985.workers.dev/media/…).
 * Instagram exige JPEG para imágenes. Los reels con música se suben a mano desde la app (regla de Juan).
 */
import { loadEnv } from './lib/env.mjs';
const E = loadEnv();
const G = 'https://graph.facebook.com/v21.0';
const PRUEBA = process.argv.includes('--prueba');
const [cmd, ...args] = process.argv.slice(2).filter(a => a !== '--prueba');

async function api(path, params = {}, method = 'POST') {
  const u = new URL(G + path);
  const body = new URLSearchParams(params);
  const r = method === 'GET' ? await fetch(u + '?' + body) : await fetch(u, { method, body });
  const j = await r.json();
  if (j.error) throw new Error(`${path}: ${j.error.message}`);
  return j;
}
const igTok = () => ({ access_token: E.META_PAGE_TOKEN });

async function esperarContenedor(id) {
  for (let i = 0; i < 60; i++) {
    const s = await api(`/${id}`, { fields: 'status_code,status', ...igTok() }, 'GET');
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR') throw new Error('Instagram rechazó el archivo: ' + s.status);
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('El contenedor no terminó de procesarse.');
}
async function publicarIG(creationId) {
  if (PRUEBA) { console.log('[prueba] contenedor listo, no se publica:', creationId); return; }
  const r = await api(`/${E.META_IG_ID}/media_publish`, { creation_id: creationId, ...igTok() });
  const m = await api(`/${r.id}`, { fields: 'permalink', ...igTok() }, 'GET');
  console.log('publicado en Instagram:', m.permalink);
}

if (cmd === 'estado') {
  for (const [n, t] of [['usuario', E.META_USER_TOKEN], ['página', E.META_PAGE_TOKEN]]) {
    const d = (await api('/debug_token', { input_token: t, access_token: `${E.META_APP_ID}|${E.META_APP_SECRET}` }, 'GET')).data;
    console.log(`token ${n}: válido=${d.is_valid} vence=${d.expires_at ? new Date(d.expires_at * 1000).toISOString().slice(0, 10) : 'nunca'}`);
  }
  const ig = await api(`/${E.META_IG_ID}`, { fields: 'username,followers_count,media_count', ...igTok() }, 'GET');
  console.log(`instagram @${ig.username}: ${ig.followers_count} seguidores, ${ig.media_count} publicaciones`);
  const pg = await api(`/${E.META_PAGE_ID}`, { fields: 'name,followers_count', ...igTok() }, 'GET');
  console.log(`facebook ${pg.name}: ${pg.followers_count ?? '?'} seguidores`);
} else if (cmd === 'ig-imagen') {
  const c = await api(`/${E.META_IG_ID}/media`, { image_url: args[0], caption: args[1] || '', ...igTok() });
  await esperarContenedor(c.id); await publicarIG(c.id);
} else if (cmd === 'ig-carrusel') {
  const [caption, ...urls] = args;
  const hijos = [];
  for (const u of urls) { const c = await api(`/${E.META_IG_ID}/media`, { image_url: u, is_carousel_item: 'true', ...igTok() }); hijos.push(c.id); }
  for (const h of hijos) await esperarContenedor(h);
  const c = await api(`/${E.META_IG_ID}/media`, { media_type: 'CAROUSEL', children: hijos.join(','), caption, ...igTok() });
  await esperarContenedor(c.id); await publicarIG(c.id);
} else if (cmd === 'ig-reel') {
  const c = await api(`/${E.META_IG_ID}/media`, { media_type: 'REELS', video_url: args[0], caption: args[1] || '', share_to_feed: 'true', ...igTok() });
  await esperarContenedor(c.id); await publicarIG(c.id);
} else if (cmd === 'ig-historia') {
  // Historia (24 h) con un video o una imagen. La API no permite stickers ni música de la biblioteca: sale tal cual el archivo.
  const esVideo = /\.(mp4|mov)(\?|$)/i.test(args[0]);
  const c = await api(`/${E.META_IG_ID}/media`, { media_type: 'STORIES', [esVideo ? 'video_url' : 'image_url']: args[0], ...igTok() });
  await esperarContenedor(c.id);
  if (PRUEBA) { console.log('[prueba] contenedor listo, no se publica:', c.id); process.exit(0); }
  const r = await api(`/${E.META_IG_ID}/media_publish`, { creation_id: c.id, ...igTok() });
  console.log('historia publicada en Instagram, id:', r.id, '(dura 24 h; se ve en instagram.com/stories/fctopsecret)');
} else if (cmd === 'fb-foto') {
  if (PRUEBA) { console.log('[prueba] no se publica en Facebook'); process.exit(0); }
  const r = await api(`/${E.META_PAGE_ID}/photos`, { url: args[0], caption: args[1] || '', ...igTok() });
  console.log('publicado en Facebook:', `https://www.facebook.com/${r.post_id || r.id}`);
} else if (cmd === 'fb-album') {
  // Post con varias fotos: se suben sin publicar y se adjuntan a un solo post del feed.
  const [caption, ...urls] = args;
  if (PRUEBA) { console.log('[prueba] no se publica en Facebook'); process.exit(0); }
  const ids = [];
  for (const u of urls) ids.push((await api(`/${E.META_PAGE_ID}/photos`, { url: u, published: 'false', ...igTok() })).id);
  const params = { message: caption, ...igTok() };
  ids.forEach((id, i) => { params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }); });
  const r = await api(`/${E.META_PAGE_ID}/feed`, params);
  console.log('publicado en Facebook:', `https://www.facebook.com/${r.id}`);
} else if (cmd === 'fb-video') {
  if (PRUEBA) { console.log('[prueba] no se publica en Facebook'); process.exit(0); }
  const r = await api(`/${E.META_PAGE_ID}/videos`, { file_url: args[0], description: args[1] || '', ...igTok() });
  console.log('publicado en Facebook (video):', `https://www.facebook.com/${r.id}`);
} else {
  console.log('Ver la cabecera de scripts/meta.mjs para el uso.');
}
