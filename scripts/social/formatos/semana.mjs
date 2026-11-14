// Formato "La semana en datos": carrusel (Instagram/Facebook/X) + video vertical (Reel/TikTok/Short) con los
// partidos de los últimos 7 días, goleadores, la figura por promedio, los números del equipo y lo que viene.
// Va los sábados (repaso semanal) y cuando hubo jornada y no hay clips de goles para mostrar.
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { resumen, render, diaSemana, fechaCorta, LIGA_VISIBLE } from '../lib/datos.mjs';
import { archivo } from '../lib/render.mjs';

const dia3 = f => diaSemana(f).slice(0, 3).replace('mié', 'mié').toUpperCase();
const n1 = x => Math.round(x * 100) / 100;

const pl = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const lv = h => h === true ? 'Local' : h === false ? 'Visitante' : '';
const ORDEN_LIGAS = ['VPUG', 'VPN', '11x11'];

// Arma los datos de la plantilla. desde/hasta: fechas YYYY-MM-DD (inclusive). hero: foto de portada opcional.
// Desde la T4 oficial hay tres ligas por semana: cada partido muestra la suya y los puntos van por liga (sumarlos
// no es una tabla de ningún lado).
export function datos({ partidos, fixture }, { desde, hasta, hero = null, semana = 1 }) {
  const ps = partidos.filter(m => m.date >= desde && m.date <= hasta).sort((a, b) => a.date.localeCompare(b.date));
  if (!ps.length) return null;
  const r = resumen(ps);
  const ligas = ORDEN_LIGAS.filter(l => r.ligas[l]).map(l => r.ligas[l]);
  const conImg = j => ({ ...j, img: archivo(render(j.gt, ['Gesto4', 'Unica4', 'Frente4'])) });
  const goleadores = r.goleadores.filter(j => render(j.gt)).slice(0, 3).map(conImg);
  const golesConAutor = r.goleadores.reduce((a, j) => a + j.goles, 0);
  const fig = r.promedios.find(j => render(j.gt));
  // Lo que viene: los próximos 7 días después del resumen, todas las ligas, agrupado por día.
  const tope = new Date(hasta + 'T12:00:00Z'); tope.setUTCDate(tope.getUTCDate() + 7);
  const prox = fixture.filter(f => f.date > hasta && f.date <= tope.toISOString().slice(0, 10));
  const dias = [...new Set(prox.map(f => f.date))].map(date => ({ dia: dia3(date), fecha: fechaCorta(date),
    partidos: prox.filter(f => f.date === date).map(f => ({ escudo: f.escudo || '', rival: f.rival, liga: LIGA_VISIBLE(f.league), lv: lv(f.isHome), hora: f.time })) }));
  return {
    resumen: r, partidos: ps, ligas, proximos: prox,
    plantilla: {
      kicker: `Temporada 4 · Semana ${semana}`,
      escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')),
      hero: hero ? archivo(hero) : null,
      portada: {
        kicker: 'La semana en datos',
        titulo: r.v >= r.pj - 1 && r.v > 1 ? `${r.v} victorias<br><span class="oro">en ${r.pj} partidos</span>`
          : `${pl(r.pj, 'partido', 'partidos')}<br><span class="oro">${ligas.length > 1 ? `en ${ligas.length} ligas` : `${r.pts} puntos`}</span>`,
        cifras: ligas.length > 1 ? ligas.map(l => ({ n: l.pts, t: `Pts ${l.liga}` }))
          : [{ n: r.pts, t: 'Puntos' }, { n: r.gf, t: 'Goles' }, { n: r.goleadores.length, t: 'Goleadores' }],
      },
      resultadosTitulo: `${r.v}V · ${r.e}E · ${r.d}D`,
      compacto: ps.length > 6,
      partidos: ps.map(m => ({ dia: dia3(m.date), fecha: fechaCorta(m.date), escudo: m.escudo, rival: m.rival, liga: LIGA_VISIBLE(m.league), lv: lv(m.isHome), gf: m.gf, gc: m.gc, res: m.res })),
      // Si hay goles sin autor cargado (partidos que EA no guardó), el título no dice "N goles, M nombres".
      goleadoresTitulo: golesConAutor === r.gf ? `${pl(r.gf, 'gol', 'goles')}, ${pl(r.goleadores.length, 'nombre', 'nombres')}` : 'Gritos de gol',
      goleadores: goleadores.map(g => ({ gt: g.gt, goles: g.goles, img: g.img })),
      figura: fig ? {
        gt: fig.gt, nota: n1(fig.prom).toFixed(2), img: archivo(render(fig.gt, ['Unica4', 'Gesto4', 'Frente4'])),
        lineas: [`Promedio en ${pl(fig.ratings.length, 'partido', 'partidos')}`, [fig.goles && pl(fig.goles, 'gol', 'goles'), fig.asist && pl(fig.asist, 'asistencia', 'asistencias')].filter(Boolean).join(' · ')].filter(Boolean),
      } : null,
      numeros: [
        { n: r.gf, t: 'Goles a favor', oro: true },
        { n: r.gc, t: 'Goles en contra' },
        { n: r.v + r.e, t: `Sin perder (de ${r.pj})` },
        { n: r.vallas, t: r.vallas === 1 ? 'Valla invicta' : 'Vallas invictas' },
      ],
      ligas: ligas.length > 1 ? ligas.map(l => ({ liga: l.liga, rec: `${l.v}V · ${l.e}E · ${l.d}D`, pts: l.pts })) : [],
      proxTitulo: dias.length ? `${pl(prox.length, 'partido', 'partidos')}<br><span class="oro">en ${pl(dias.length, 'día', 'días')}</span>` : 'Próximamente',
      proxDias: dias,
      gancho: { kicker: 'La semana en datos', lineas: [`${pl(r.pj, 'partido', 'partidos')}.`, `<span class="oro">${pl(r.v, 'victoria', 'victorias')}.</span>`, `${pl(r.gf, 'gol', 'goles')}.`] },
    },
  };
}

// Duración de cada escena en el video (segundos). Total ~24 s con el gancho: el largo que mejor retiene en Reels/TikTok/Shorts.
export const ESCENAS_VIDEO = [{ n: 0, dur: 3.6 }, { n: 1, dur: 4.4 }, { n: 2, dur: 3.8 }, { n: 3, dur: 3.6 }, { n: 4, dur: 3.4 }, { n: 5, dur: 4.2 }];
