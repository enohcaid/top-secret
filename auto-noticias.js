// ── Auto-generated match result news ─────────────────────────────────────────

// Imágenes por defecto — aplican a todas las fechas anteriores al primer período.
export const RESULT_IMAGES = {
  win:  ['logos/victoria/festejo.png', 'logos/victoria/festejo 2.png', 'logos/victoria/festejo 4.png', 'logos/victoria/festejo 5.png'],
  draw: ['logos/empate/Empate 0.png', 'logos/empate/Empate 1.png'],
  loss: ['logos/derrota/Derrota 0.png', 'logos/derrota/Derrota 1.png', 'logos/derrota/Derrota 2.png'],
};

// Períodos con imágenes propias.
// Cada entrada aplica a fechas >= `from` hasta la siguiente entrada.
export const RESULT_IMAGES_PERIODS = [
  {
    from: '2026-05-13',
    win:  ['logos/victoria/Victoria 0.png', 'logos/victoria/Victoria 1.png'],
    draw: ['logos/empate/Empate 0.png', 'logos/empate/Empate 1.png'],
    loss: ['logos/derrota/Derrota 0.png', 'logos/derrota/Derrota 1.png', 'logos/derrota/Derrota 2.png'],
  },
  {
    from: '2026-05-10',
    win:  [],
    draw: ['logos/empate/Empate 0.png', 'logos/empate/Empate 1.png'],
    loss: ['logos/derrota/Derrota 0.png', 'logos/derrota/Derrota 1.png', 'logos/derrota/Derrota 2.png'],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function imagesForDate(date) {
  const sorted = [...RESULT_IMAGES_PERIODS].sort((a, b) => b.from.localeCompare(a.from));
  return sorted.find(p => date >= p.from) || RESULT_IMAGES;
}

function resultKey(matchResult) {
  if (!matchResult) return 'draw';
  const [gf, gc] = String(matchResult).split('-').map(Number);
  return gf > gc ? 'win' : gf < gc ? 'loss' : 'draw';
}

function pickImage(arr) {
  if (!arr || !arr.length) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['enero','febrero','marzo','abril','mayo','junio',
                  'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const days   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const day    = new Date(iso + 'T12:00:00').getDay();
  return `${days[day]} ${d} de ${months[m - 1]} de ${y}`;
}

const LEAGUE_LABEL = { VPN: 'Liga VPN', VPUG: 'VPUG', '11x11': '11x11' };
const RES_EMOJI    = { win: '✅', draw: '➖', loss: '❌' };

// ── Main export ───────────────────────────────────────────────────────────────
export function generateMatchNews(matches) {
  const byDate = {};
  matches.forEach(m => {
    if (!m.match_result) return;
    const d = m.date || '1970-01-01';
    (byDate[d] = byDate[d] || []).push(m);
  });

  return Object.entries(byDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayMatches]) => {
      const wins   = dayMatches.filter(m => resultKey(m.match_result) === 'win').length;
      const draws  = dayMatches.filter(m => resultKey(m.match_result) === 'draw').length;
      const losses = dayMatches.filter(m => resultKey(m.match_result) === 'loss').length;
      const pj     = dayMatches.length;

      const overallKey = wins > losses ? 'win' : losses > wins ? 'loss' : 'draw';
      const imgs       = imagesForDate(date);
      const image      = pickImage(imgs[overallKey]);

      // Top performer del día — acumular por jugador entre todos los partidos del día
      const _dayG = {}, _dayR = {};
      dayMatches.forEach(m => (m.players || []).forEach(p => {
        _dayG[p.name] = (_dayG[p.name] || 0) + (p.goals || 0);
        if ((p.rating || 0) > (_dayR[p.name] || 0)) _dayR[p.name] = p.rating || 0;
      }));
      let topScorer = null, topGoals = 0, topRated = null, topRating = 0;
      Object.entries(_dayG).forEach(([n, g]) => { if (g > topGoals)  { topGoals  = g; topScorer = n; } });
      Object.entries(_dayR).forEach(([n, r]) => { if (r > topRating) { topRating = r; topRated  = n; } });

      const ddmm  = date.slice(5).split('-').reverse().join('/');
      const title = pj === 1
        ? `${dayMatches[0].rival} — ${dayMatches[0].match_result}`
        : `Jornada ${ddmm} · ${pj} partidos`;

      const resultSummary = [wins && `${wins}V`, draws && `${draws}E`, losses && `${losses}D`]
        .filter(Boolean).join(' · ');

      const excerpt = dayMatches
        .map(m => `${LEAGUE_LABEL[m.league] || m.league}: ${m.rival} ${m.match_result}`)
        .join(' · ')
        + (topScorer && topGoals > 0 ? ` · ⚡ ${topScorer} (${topGoals}G)` : '');

      const body = [
        `Top Secret FC disputó ${pj} ${pj === 1 ? 'partido' : 'partidos'} el ${formatDateLabel(date)}, con balance ${resultSummary}.`,
        ...dayMatches.map(m => {
          const rk  = resultKey(m.match_result);
          const lg  = LEAGUE_LABEL[m.league] || m.league || '';
          const mvp = (m.players || []).slice().sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
          return `${RES_EMOJI[rk]} ${lg} vs ${m.rival} — ${m.match_result}${mvp ? ` · MVP: ${mvp.name} (${mvp.rating})` : ''}`;
        }),
        topScorer && topGoals  > 0 ? `⚡ Goleador del día: ${topScorer} (${topGoals} goles)` : '',
        topRated  && topRating > 0 ? `⭐ Mejor rating: ${topRated} (${topRating})` : '',
      ].filter(Boolean);

      const capBase = `⚽ TOP SECRET FC · Resultados ${ddmm}\n\n`
        + dayMatches.map(m => `${RES_EMOJI[resultKey(m.match_result)]} ${m.rival} ${m.match_result} (${m.league})`).join('\n');

      return {
        id:        `resultados-${date}`,
        auto:      true,
        category:  'Resultados',
        title,
        date,
        dateLabel: formatDateLabel(date),
        excerpt,
        image,
        body,
        shareCaption: capBase + '\n\n#TopSecretFC #VPN #EAFCClubsPro',
        shareCaptions: {
          ig: capBase + '\n\n#TopSecretFC #VPN #EAFCClubsPro',
          x:  capBase + '\n\n#TopSecretFC #VPN',
          fb: capBase + '\n\n#TopSecretFC #VPN #EAFCClubsPro',
        },
      };
    });
}
