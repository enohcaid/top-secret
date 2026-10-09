// Formato "La semana en datos": carrusel (Instagram/Facebook/X) + video vertical (Reel/TikTok/Short) con los
// partidos de los últimos 7 días, goleadores, la figura por promedio, los números del equipo y lo que viene.
// Va los sábados (repaso semanal) y cuando hubo jornada y no hay clips de goles para mostrar.
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { TEMPORADA, resumen, render, diaSemana, fechaCorta } from '../lib/datos.mjs';
import { archivo } from '../lib/render.mjs';

const dia3 = f => diaSemana(f).slice(0, 3).replace('mié', 'mié').toUpperCase();
const n1 = x => Math.round(x * 100) / 100;

// Arma los datos de la plantilla. desde/hasta: fechas YYYY-MM-DD (inclusive). hero: foto de portada opcional.
export function datos({ partidos, fixture }, { desde, hasta, hero = null, semana = 1 }) {
  const ps = partidos.filter(m => m.date >= desde && m.date <= hasta).sort((a, b) => a.date.localeCompare(b.date));
  if (!ps.length) return null;
  const r = resumen(ps);
  const conImg = j => ({ ...j, img: archivo(render(j.gt, ['Gesto4', 'Unica4', 'Frente4'])) });
  const goleadores = r.goleadores.filter(j => render(j.gt)).slice(0, 3).map(conImg);
  const fig = r.promedios.find(j => render(j.gt));
  const prox = fixture.filter(f => f.date > hasta).slice(0, 3);
  const pct = Math.round((r.v / r.pj) * 100);
  return {
    resumen: r, partidos: ps,
    plantilla: {
      kicker: `${TEMPORADA.torneo} · Semana ${semana}`,
      escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')),
      hero: hero ? archivo(hero) : null,
      portada: {
        kicker: 'La semana en datos',
        titulo: r.v >= r.pj - 1 && r.v > 1 ? `${r.v} victorias<br><span class="oro">en ${r.pj} partidos</span>` : `${r.pj} partidos<br><span class="oro">${r.pts} puntos</span>`,
        cifras: [{ n: r.pts, t: 'Puntos' }, { n: r.gf, t: 'Goles' }, { n: r.goleadores.length, t: 'Goleadores' }],
      },
      resultadosTitulo: `${r.v}V · ${r.e}E · ${r.d}D`,
      partidos: ps.map(m => ({ dia: dia3(m.date), fecha: fechaCorta(m.date), escudo: m.escudo, rival: m.rival, lv: m.isHome ? 'Local' : 'Visitante', gf: m.gf, gc: m.gc, res: m.res })),
      goleadoresTitulo: `${r.gf} goles, ${r.goleadores.length} nombres`,
      goleadores: goleadores.map(g => ({ gt: g.gt, goles: g.goles, img: g.img })),
      figura: fig ? {
        gt: fig.gt, nota: n1(fig.prom).toFixed(2), img: archivo(render(fig.gt, ['Unica4', 'Gesto4', 'Frente4'])),
        lineas: [`Promedio en ${fig.pj} partido${fig.pj > 1 ? 's' : ''}`, [fig.goles && `${fig.goles} gol${fig.goles > 1 ? 'es' : ''}`, fig.asist && `${fig.asist} asistencia${fig.asist > 1 ? 's' : ''}`].filter(Boolean).join(' · ')].filter(Boolean),
      } : null,
      numeros: [
        { n: r.pts, t: 'Puntos', oro: true },
        { n: pct, t: 'De victorias', suf: '%' },
        { n: r.gf, t: 'Goles a favor' },
        { n: n1(r.gf / r.pj), t: 'Goles por partido', dec: 1 },
      ],
      proxTitulo: prox.length ? `${diaSemana(prox[0].date)} ${fechaCorta(prox[0].date)}` : 'Próximamente',
      proximos: prox.map(f => ({ dia: dia3(f.date), fecha: fechaCorta(f.date), escudo: f.escudo || '', rival: f.rival, lv: f.isHome ? 'Local' : 'Visitante', hora: f.time })),
      gancho: { kicker: `${TEMPORADA.torneo}`, lineas: [`${r.pj} partidos.`, `<span class="oro">${r.v} victorias.</span>`, `${r.gf} goles.`] },
    },
  };
}

// Duración de cada escena en el video (segundos). Total ~24 s con el gancho: el largo que mejor retiene en Reels/TikTok/Shorts.
export const ESCENAS_VIDEO = [{ n: 0, dur: 3.6 }, { n: 1, dur: 4.4 }, { n: 2, dur: 3.8 }, { n: 3, dur: 3.6 }, { n: 4, dur: 3.4 }, { n: 5, dur: 4.2 }];
