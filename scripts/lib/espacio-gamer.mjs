// Equipos de las divisiones argentinas de Espacio Gamer (espaciogamer.cl, WordPress).
// La tabla la arma su plugin por admin-ajax (action eg_obtener_ranking) con un nonce que sale de la
// misma página de la división; igual que /eg-table en el Worker, pero para las 4 divisiones.
const EG = 'https://espaciogamer.cl';
const UA = { 'User-Agent': 'Mozilla/5.0 (TopSecretFC bot)' };
export const DIVISIONES_EG = [
  ['pro-league-1-espacio-gamer-argentina', 'EG Pro League'],
  ['challengers-2-espacio-gamer-argentina', 'EG Challengers'],
  ['ascension-3-espacio-gamer-argentina', 'EG Ascensión'],
  ['under-4-espacio-gamer-argentina', 'EG Under'],
];
// Equipos que EG publica sin escudo: el suyo de VPUG (CopáFácil), en R2 logos/escudos-eg/ (2026-10-21).
// Villa Die no tiene escudo en ningún lado conocido.
const ESC = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos-eg/';
export const ESCUDOS_FALTANTES = {
  'Deportivo Moron eSports': ESC + 'deportivo-moron-esports.webp',
  'Arabia Team': ESC + 'arabia-team.webp',
  'City Torque eSp': ESC + 'city-torque-esp.webp',
  'Nuvo FC': 'https://firebasestorage.googleapis.com/v0/b/copafacil-web.appspot.com/o/events%2F-fthh5%2Fpg59%2Fteams%2F-OsMvBXyushQcOcLYfub.png?alt=media&token=1',
};
// Escudos que EG sube con un fondo liso: versión transparente (scripts/escudos-sin-fondo.mjs), gana sobre la de EG.
// LT Gaming y NOTTINGAM MIEDO quedan como están: el fondo es parte de la ilustración (ni el relleno ni Canva lo separan).
export const ESCUDOS_SIN_FONDO = Object.fromEntries(Object.entries({
  'ALL BOYS': 'all-boys', 'IACC Reserva': 'iacc-reserva', 'MISKYMAYU FC': 'miskymayu-fc', 'MONOTRIBUTISTAS': 'monotributistas',
  'Suda eSports': 'suda-esports', 'SF DRYSDALE': 'suda-esports', 'SF Drysdale': 'suda-esports', 'Argentinos Jrs Esp': 'argentinos-jrs-esp', 'Lizzard CF': 'lizzard-cf',
  'Almagro eSports': 'almagro-esports', 'COMUNICACIÓNC': 'comunicacionc', 'Deportivo Murra': 'deportivo-murra',
  'LMJ eSports': 'lmj-esports', 'LosPamba1891': 'lospamba1891',
}).map(([n, s]) => [n, `${ESC}${s}.webp`]));
const decode = s => s.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').trim();

export async function equiposDivisionEG(slug) {
  const page = await (await fetch(`${EG}/division/${slug}/tabla-posiciones/`, { headers: UA })).text();
  const nonce = (page.match(/egRankingsData\s*=\s*\{[^}]*"nonce":"([a-f0-9]+)"/) || [])[1];
  const divId = (page.match(/data-division-id="(\d+)"/) || [])[1];
  const tempId = (page.match(/data-temporada-id="(\d+)"/) || [])[1];
  if (!nonce || !divId || !tempId) throw new Error(`EG ${slug}: no encontré nonce/ids`);
  const body = new URLSearchParams({ action: 'eg_obtener_ranking', nonce, metrica: 'posiciones', division_id: divId, temporada_id: tempId, limite: '60', club_destacado: '0' });
  const aj = await (await fetch(`${EG}/wp-admin/admin-ajax.php`, { method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body })).json();
  if (!aj?.success || !aj.data?.html) throw new Error(`EG ${slug}: respuesta inválida`);
  return aj.data.html.split(/<tbody class="eg-tp-club[^"]*"[^>]*>/).slice(1).map(chunk => ({
    nombre: decode((chunk.match(/class="eg-tp-nombre">\s*<span title="([^"]+)"/) || [])[1] || ''),
    logo: (chunk.match(/<img class="eg-tp-logo" src="([^"]+)"/) || [])[1] || null,
  })).filter(t => t.nombre).map(t => ({ ...t, logo: ESCUDOS_SIN_FONDO[t.nombre] || t.logo || ESCUDOS_FALTANTES[t.nombre] || null }));
}

// [{nombre, div, logo}] de las 4 divisiones; una división que falla no tumba a las otras
export async function equiposEG() {
  const out = [];
  for (const [slug, div] of DIVISIONES_EG) {
    try { for (const t of await equiposDivisionEG(slug)) out.push({ ...t, div }); }
    catch (e) { console.error(e.message); }
  }
  return out;
}
