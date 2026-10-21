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
  })).filter(t => t.nombre);
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
