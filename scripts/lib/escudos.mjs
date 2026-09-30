// Buscar el escudo de un club en todas las ligas que conoce el sitio: VPN (1ra y 2da), VPUG (CopáFácil)
// y 11x11 (VirtualProGaming). Tolera nombres mal escritos (usa equipos-match).
import { buscarEquipo } from './equipos-match.mjs';

const VPN = [[2119, 6409], [2127, 6410]];                         // actualizar temporadas cuando cambien
const COPAFACIL = ['-fthh5@pg59', '-fthh5@7zxj'];                 // torneos VPUG (ver CLAUDE.md, CopáFácil)
const VPG = ['CHALLENGERS-T4'];                                   // torneos 11x11
const VPG_LOGO = 'https://virtualprogaming.com/cdn-cgi/imagedelivery/cl8ocWLdmZDs72LEaQYaYw/';

let cache = null;
export async function cargarEscudos() {
  if (cache) return cache;
  const out = [];
  const tryJson = async u => { try { const r = await fetch(u); return r.ok ? await r.json() : null; } catch { return null; } };
  for (const [l, s] of VPN) {
    const j = await tryJson(`https://www.virtualpronetwork.com/api/leagues/${l}/table?season=${s}&community_id=1`);
    const rows = j ? (Array.isArray(j) ? j : Object.values(j).find(Array.isArray) || []) : [];
    rows.forEach(t => { const x = t.team || t; if (x.name && x.logoUrl) out.push({ nombre: x.name.trim(), logo: x.logoUrl, fuente: 'VPN' }); });
  }
  for (const ev of COPAFACIL) {
    const j = await tryJson(`https://copafacil-web.firebaseio.com/events/${ev}/teams.json`);
    Object.values(j || {}).forEach(t => { if (t.name && t.url) out.push({ nombre: t.name.trim(), logo: t.url, fuente: 'VPUG' }); });
  }
  for (const tn of VPG) {
    const j = await tryJson(`https://api.virtualprogaming.com/public/tournaments/${tn}/groups/?season=1`);
    (j || []).flat().forEach(t => { if (t.team_name && t.team_logo) out.push({ nombre: t.team_name.trim(), logo: VPG_LOGO + t.team_logo + '/public', fuente: '11x11' }); });
  }
  return (cache = out);
}

// Devuelve { logo, fuente, nombre } o null.
export async function buscarEscudo(nombre) {
  const lista = await cargarEscudos();
  const r = buscarEquipo(nombre, lista, {});
  return r && !r.dudoso ? { logo: r.logo, fuente: r.fuente, nombre: r.nombre } : null;
}
