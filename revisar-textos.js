// Revisor de las descripciones de redes (pedido de Juan, 2026-10-14: "estar atento a las descripciones").
// Reglas del club + lo aprendido de lo ya publicado. Lo usan aprobar.js (avisos en vivo en cada tarjeta) y
// scripts/social (al cargar un lote y antes de publicar). No bloquea: avisa. 'error' = la red lo va a rechazar
// o queda mal seguro; 'aviso' = revisalo.
//   revisarPieza(pieza, lote) → [{ nivel: 'error'|'aviso', msg }]
import { ROSTER_T3, ROSTER_T4 } from './roster.js';

const GAMERTAGS = [...new Set([...ROSTER_T3, ...ROSTER_T4].map(j => j.key)), 'nikileo527', 'adri_cai'];
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const VIDEO = new Set(['ig-reel', 'tiktok', 'youtube', 'x-video', 'fb-video']);
const CARRUSEL = new Set(['ig-carrusel', 'fb-album', 'x-imagenes']);
const SIN_TEXTO = new Set(['ig-historia', 'fb-historia']);
const HASHTAGS_MAX = { instagram: 5, tiktok: 5, youtube: 3, x: 2, facebook: 2 };
const emojis = s => (s.match(/\p{Extended_Pictographic}/gu) || []).length;
const largoX = s => [...s.replace(/https?:\/\/\S+/g, 'x'.repeat(23))].length;

export function revisarTexto({ red, metodo, texto = '', titulo, protagonistas = [], fecha = '' }) {
  const out = [], e = msg => out.push({ nivel: 'error', msg }), a = msg => out.push({ nivel: 'aviso', msg });
  const t = (texto || '').trim();
  if (red === 'sitio' || red === 'plan') return out;
  if (SIN_TEXTO.has(metodo)) return out;
  if (!t) { e('Sin texto.'); return out; }
  const todo = `${titulo || ''}\n${t}`;

  // Límites de cada red
  if (red === 'x' && largoX(t) > 280) e(`X: ${largoX(t)} caracteres (máximo 280, el link cuenta 23).`);
  if (red === 'tiktok' && [...t].length > 300) a(`TikTok: ${[...t].length} caracteres; más de 300 se corta y nadie lo lee.`);
  if (metodo === 'ig-reel' && [...t].length > 400) a(`Reel: ${[...t].length} caracteres; el del Reel va corto (hasta 400).`);
  if (red === 'youtube' && titulo != null) {
    if ([...titulo].length > 100) e(`Título de YouTube: ${[...titulo].length} caracteres (máximo 100).`);
    if (emojis(titulo)) a('Título de YouTube con emoji.');
    if (!/pro ?clubs|ea ?fc/i.test(titulo)) a('Título de YouTube sin "Pro Clubs" ni "EA FC": cuesta encontrarlo en la búsqueda.');
  }
  const tags = t.match(/#[\p{L}\p{N}_]+/gu) || [];
  if (HASHTAGS_MAX[red] && tags.length > HASHTAGS_MAX[red]) a(`${tags.length} hashtags (en ${red} van hasta ${HASHTAGS_MAX[red]}).`);
  if (['instagram', 'tiktok', 'x'].includes(red) && !tags.some(h => h.toLowerCase() === '#topsecretfc')) a('Falta #TopSecretFC.');
  if (emojis(t) > 2) a(`${emojis(t)} emojis (como mucho 1 o 2, y solo si suman).`);

  // Flechas que no señalan nada
  if (VIDEO.has(metodo) && /[👇⬇]/u.test(t)) a('"👇" en un video: abajo no hay nada (no es un carrusel ni un hilo).');
  if (!CARRUSEL.has(metodo) && /desliz/i.test(t)) a('Dice "deslizá" pero no es un carrusel.');

  // Ligas: nombre corto, sin artículo, sin sufijo de temporada, nunca sujeto
  const LIGA = 'VPN|VPUG|11x11|Espacio Gamer';
  if (new RegExp(`\\b(la|el|del|al)\\s+(${LIGA})\\b`, 'i').test(todo)) a('Liga con artículo ("la VPUG"): va "en VPUG", "por VPN".');
  if (new RegExp(`\\b(${LIGA})\\s*(T\\d|Temporada\\s*\\d)`, 'i').test(todo)) a('Liga con sufijo de temporada (T3, Temporada 6): solo el nombre corto.');
  if (new RegExp(`\\b(${LIGA})\\s+(ganó|perdió|empató|goleó|cayó)`, 'i').test(todo)) a('La liga como sujeto ("VPN ganó"): el sujeto es el club.');
  if (fecha >= '2026-10-13' && /\b11x11\b/i.test(todo)) a('Desde la T4 la liga se llama "Espacio Gamer", no 11x11.');
  if (/\bT[1-9]\b/.test(todo)) a('"T1…T4" es jerga interna: para el público, "temporada 1".');

  // Gamertags exactos y protagonistas nombrados
  for (const g of GAMERTAGS) {
    const m = todo.match(new RegExp(`(^|[^\\p{L}\\p{N}_-])(${esc(g)})(?![\\p{L}\\p{N}_])`, 'giu')) || [];
    for (const x of m) { const w = x.replace(/^[^\p{L}\p{N}_-]/u, ''); if (w !== g) a(`Gamertag mal escrito: "${w}" → "${g}".`); }
  }
  const faltan = protagonistas.filter(g => !todo.includes(g));
  if (protagonistas.length && faltan.length === protagonistas.length) a(`No nombra al protagonista (${protagonistas.join(', ')}).`);

  // Forma
  if (/^[a-záéíóúñ]/.test(t) && !GAMERTAGS.some(g => t.startsWith(g))) a('Arranca en minúscula.');
  if (/\bYoutube\b/.test(todo)) a('"Youtube" → "YouTube".');
  if (/en vivo por/i.test(t) && !(/twitch/i.test(t) && /kick/i.test(t) && /youtube/i.test(t))) a('"En vivo por…" sin las tres (Twitch, Kick y YouTube).');
  return out;
}

// Protagonistas = gamertags que nombran el lote o la pieza (título, formato, descripción).
export function revisarPieza(p, lote = {}) {
  const ctx = `${lote.titulo || ''} ${p.formato || ''} ${p.descripcion || ''}`;
  const protagonistas = p.protagonistas || GAMERTAGS.filter(g => ctx.includes(g));
  const fecha = (lote.publicarA || lote.creado || new Date().toISOString()).slice(0, 10);
  return revisarTexto({ red: p.red, metodo: p.metodo, texto: p.texto, titulo: p.titulo, protagonistas, fecha });
}
