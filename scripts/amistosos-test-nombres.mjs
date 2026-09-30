// Prueba del reconocimiento de nombres mal escritos: node scripts/amistosos-test-nombres.mjs
import { buscarEquipo } from './lib/equipos-match.mjs';
import fs from 'fs';
const A = JSON.parse(fs.readFileSync('scripts/amistosos-alias.json', 'utf8'));
const eq = [];
for (const [l, s, d] of [[2119, 6409, 'Primera'], [2127, 6410, 'Segunda']]) {
  const j = await (await fetch(`https://www.virtualpronetwork.com/api/leagues/${l}/table?season=${s}&community_id=1`)).json();
  (Array.isArray(j) ? j : Object.values(j).find(Array.isArray)).forEach(t => eq.push({ nombre: ((t.team || t).name || '').trim(), div: d }));
}
eq.push(...A.extras);
const casos = ['San Jorge busca amistoso', 'Buscamos amistoso hoy 23hs, Infinix', 'somos sub21 buscamos rival', 'Chaca busca amistoso 22:40', 'IACC cantera x1 23:20?', 'buscamos amistoso, san lorenso', 'Temperly esports disponible', 'Argentino de merlo busca', '4bdo sanjorge x1', 'estudiantes lp busca amistoso', 'Nuestro equipo busca amistoso hoy', 'Colon sl 23:40', 'bugadores do elit x1', 'Real pilar', 'Olimpo busca'];
for (const c of casos) { const r = buscarEquipo(c, eq, A.alias); console.log(c.padEnd(40), '→', r ? `${r.dudoso ? 'DUDA: ' + r.dudoso.join(' / ') + ' → ' : ''}${r.nombre} (${r.div}) ${r.score.toFixed(2)}${r.via ? ' alias' : ''}` : '—'); }
