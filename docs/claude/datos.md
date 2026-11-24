# Datos: fixture, plantel y seed_matches

## Fixture, escudos y plantel — fuente única (2026-11-24)

- **`torneos-datos.js`** (script clásico → `globalThis.TSTorneos`): `RAW` (fixture), mapas de escudos, `vpugBadge`/`e11Badge`, `cabeceras`, `fixtureVigente`. Lo leen calendario, convocatoria, el Worker, `noticia-diaria.mjs`, `placa-envivo.mjs`, `placa-fixture-eg.mjs` y `social/lib/datos.mjs`. El Worker y noticia-diaria lo leen como TEXTO: un partido por línea.
- **El índice de cada partido de `RAW` es la clave de Firestore** (`edits`/`suspended`/`results`): solo se agrega al final, nunca se reordena ni se borra.
- VPN sale en vivo de la API; Espacio Gamer, amistosos y partidos cargados en el sitio viven en Firestore `calendario/estado.custom`. Las reprogramaciones hechas en el sitio (`edits`/`suspended`) no las aplica convocatoria (igual que antes).
- **`plantel-datos.js`** (→ `globalThis.TSPlantel`): `ROSTER_T3`, `ROSTER_T4`, `RENDER_V` y, por jugador, `conv:{n,pos,campo}` para la convocatoria. `roster.js` solo lo reexporta. Firestore `plantel/activo.numeros` sigue pisando dorsales en convocatoria.
- **Control**: `node scripts/control-datos.mjs` → `OK` o un error por línea. Corre solo en el pre-commit (`git config core.hooksPath .githooks`, una vez por PC). Cambio intencional del nombre de un rival: `--aceptar`.
- Después de editar cualquiera de los dos, subir su `?v=` en todos los archivos que lo cargan.

### Data Layer — `seed_matches.js`

Single source of truth for historical match data. ES module exporting `SEED_MATCHES`, imported by index, plantilla, estadisticas, calendario, and noticias. Real shape:

```js
{
  rival: 'La Unión FC',          // exact name — must match fixture/logo references in other pages
  league: 'VPUG',                // 'VPN' | 'VPUG' | '11x11'
  date: '2026-03-04',            // ART date
  match_result: '8-1',           // OUR goals first, as a score string (NOT win/draw/loss)
  isHome: true,                  // optional
  uploadedAt: '2026-03-04T00:00:00.000Z',
  notes: '',                     // e.g. 'W.O.', 'Cuartos de Final · Ida (Visita)'
  torneo: '...',                 // optional (playoffs etc.)
  team_stats: {                  // Spanish field names, null when unknown
    posesion, tiros, tiros_arco, goles_esperados, pases, precision_pases,
    entradas, entradas_exito, intercepciones, paradas, faltas, fuera_juego,
    corneres, regates_exito, precision_tiro
  },
  players: [{                    // English field names; empty array for W.O. matches
    name, matched, rating, goals, assists, passes, pass_accuracy,
    distance_km, sprints, tackles, interceptions
  }]
}
```

**When a match is played, append it to `SEED_MATCHES`.** Match reports arrive as images in `reportes/` (read them directly — see workflow memories). Walkover wins: `match_result:'1-0'`, `notes:'W.O.'`, `players:[]`.
