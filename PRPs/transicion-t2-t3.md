# PRP: Transición T2→T3 — Cerrar Temporada 2, preparar Temporada 3

## Overview

Marcar la Temporada 2 como finalizada y agregar la Temporada 3 como "PRÓXIMAMENTE" en las cinco páginas afectadas. El patrón ya existe (T1→T2 ya fue implementado); se replica exactamente en cada página. T3 no tiene partidos aún — el cutoff es `'2026-06-30'` y todo el contenido T3 muestra un empty state.

## Affected Files

| File | Change type | Descripción |
|------|------------|-------------|
| `estadisticas.html` | modify | T2 → FINALIZADA, agregar botón T3 + empty state, actualizar switchStatsSeason() |
| `calendario.html` | modify | T2 → cerrado, agregar T3 a SEASON_RANGES + sbtn, T3 activo por defecto |
| `plantilla.html` | modify | T2 pill → FINALIZADA, agregar ROSTER_T3 + t3-content + switchSeason(3) |
| `posiciones.html` | modify | T2 → FINALIZADA, agregar botón T3 + s-t3 div, T3 activo por defecto |
| `index.html` | modify | Cambiar badges "T2 2026" → "T3 2026", agregar T3_CUTOFF, banner T3 |

**NO tocar:** `seed_matches.js`, `convo.html`, `convocatoria.html`, `layout.js`, `mobile-nav.js`

## Context & Patterns

### Cutoffs
```js
const T2_CUTOFF = '2026-04-30'; // ya existe en todas las páginas
const T3_CUTOFF = '2026-06-30'; // NUEVO — T3 empieza julio 2026
```

### Patrón de pill/badge por temporada (estadisticas.html líneas 505-506)
```html
<!-- T1: inactivo, badge FINALIZADA gris -->
<button id="spill1" onclick="switchStatsSeason(1)"
  style="padding:6px 16px;border-radius:20px;border:1px solid var(--border2);background:transparent;
         font-family:'Barlow',sans-serif;font-size:.78rem;font-weight:700;letter-spacing:.05em;
         color:var(--muted);cursor:pointer;">
  T1 · 2026
  <span style="font-size:.6rem;padding:1px 5px;border-radius:3px;margin-left:5px;
               font-weight:800;background:var(--border2);color:var(--muted2);">FINALIZADA</span>
</button>

<!-- T2: activo, badge EN CURSO dorado → cambiar a FINALIZADA -->
<button id="spill2" onclick="switchStatsSeason(2)"
  style="...border:1px solid var(--gold);background:var(--gold-dim);color:var(--gold);">
  T2 · 2026
  <span style="...background:var(--gold);color:#000;">EN CURSO</span>
</button>

<!-- T3: nuevo, activo por defecto, badge PRÓXIMAMENTE azul (T3 mode) -->
<button id="spill3" onclick="switchStatsSeason(3)"
  style="...border:1px solid var(--gold);background:var(--gold-dim);color:var(--gold);">
  T3 · 2026
  <span style="...background:var(--gold);color:#000;">PRÓXIMAMENTE</span>
</button>
```

### switchStatsSeason() actual (líneas 2735-2748) — patrón a extender
```js
function switchStatsSeason(n){
  currentSeason = n;
  const s1=document.getElementById('spill1'), s2=document.getElementById('spill2');
  if(n===1){
    s1.style.border='1px solid var(--gold)'; s1.style.background='var(--gold-dim)'; s1.style.color='var(--gold)';
    s2.style.border='1px solid var(--border2)'; s2.style.background='transparent'; s2.style.color='var(--muted)';
  } else {
    s2.style.border='1px solid var(--gold)'; s2.style.background='var(--gold-dim)'; s2.style.color='var(--gold)';
    s1.style.border='1px solid var(--border2)'; s1.style.background='transparent'; s1.style.color='var(--muted)';
  }
  renderSeason();
  const activeTab=document.querySelector('.tab.active');
  if(activeTab) activeTab.click();
}
```

### seasonMatches() actual (líneas 777-783) — patrón a extender
```js
let currentSeason = 2;
const T2_CUTOFF = '2026-04-30';
function seasonMatches() {
  const all = loadMatches();
  if (currentSeason === 1) return all.filter(m => !m.date || m.date <= T2_CUTOFF);
  return all.filter(m => m.date && m.date > T2_CUTOFF);
}
```

### SEASON_RANGES de calendario.html (líneas 1783-1786)
```js
const SEASON_RANGES = [
  { id:'t2', label:'T2 · Temporada 2', color:'#C9A84C', bg:'rgba(201,168,76,.09)', months:['2026-05','2026-06'] },
  { id:'t1', label:'T1 · Temporada 1', color:'#888888', bg:'rgba(136,136,136,.06)', months:['2026-03','2026-04'] },
];
```

### matchSeason() de calendario.html (líneas 1447-1448)
```js
const T1_CUTOFF = '2026-04-30';
function matchSeason(dateStr){
  return dateStr <= T1_CUTOFF ? 't1' : 't2';
}
```

### switchSeason() de plantilla.html (líneas 826-834)
```js
function switchSeason(n, btn) {
  document.querySelectorAll('.season-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const t1 = document.getElementById('t1-content');
  const t2 = document.getElementById('t2-content');
  if (n === 1) { t1.style.display=''; t2.style.display='none'; closePanel(false); renderGrid(currentFilter); }
  else         { t1.style.display='none'; t2.style.display='block'; closePanel(false); renderGrid2(currentFilter2); }
}
```

### switchSeason() de posiciones.html (líneas 552-556)
```js
function switchSeason(season, btn) {
  document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('s-t1').style.display = season === 't1' ? '' : 'none';
  document.getElementById('s-t2').style.display = season === 't2' ? '' : 'none';
}
```

### Strings "T2 2026" en index.html (todas las ocurrencias a reemplazar)
- Línea 344: `section-badge` del hero
- Línea 359: `section-badge` de stats
- Líneas 371, 382, 393: `lc-badge` de las 3 ligas
- Línea 403: `section-badge` de top performers
- Línea 434: descripción en nav-card de stats
- Línea 456: footer
- Línea 755: texto en modal móvil de jugador

## Requirements

### estadisticas.html
- [ ] T2 badge: "EN CURSO" → "FINALIZADA" (mismos estilos que T1: fondo gris, sin dorado)
- [ ] Agregar botón `spill3` para T3 · 2026 con badge "PRÓXIMAMENTE" — activo por defecto
- [ ] `currentSeason = 3` como default
- [ ] Agregar `T3_CUTOFF = '2026-06-30'`
- [ ] `seasonMatches()`: agregar rama `if (currentSeason === 3)` que devuelve `[]` (vacío)
- [ ] `switchStatsSeason()`: manejar 3 botones, activar/desactivar correctamente
- [ ] Empty state cuando T3 está activo: mensaje "La Temporada 3 aún no comenzó" en el área de resultados

### calendario.html
- [ ] Agregar T3 a `SEASON_RANGES`: `{ id:'t3', label:'T3 · Temporada 3', color:'#4a9eff', bg:'rgba(74,158,255,.09)', months:['2026-07','2026-08'] }`
- [ ] `matchSeason()`: agregar rama T3 para fechas > T3_CUTOFF (`'2026-06-30'`)
- [ ] Agregar `const T3_CUTOFF = '2026-06-30'`
- [ ] `currentGridSeason = 't3'` como default
- [ ] Agregar botón `sbtn-t3` activo, T2 y T1 inactivos
- [ ] Empty state para T3 si no hay partidos en ese mes

### plantilla.html
- [ ] Pill T2: texto `T2 · 2026` → `T2 · 2026 FINALIZADA` (badge gris, pill inactivo por defecto)
- [ ] Agregar pill T3 `T3 · 2026` activo por defecto
- [ ] Definir `ROSTER_T3` con el plantel actual (ver lista abajo)
- [ ] `T3_CUTOFF = '2026-06-30'`
- [ ] `T3_MATCHES = SEED_MATCHES.filter(m => m.date && m.date > T3_CUTOFF)` → vacío
- [ ] `t3Stats` y `t3Rankings` computados sobre T3_MATCHES
- [ ] `t3-content` div (visible por default), `t2-content` oculto por default
- [ ] `switchSeason(3)` muestra t3-content, oculta t1 y t2
- [ ] Empty state en t3-content: "La Temporada 3 aún no comenzó · Volvé cuando empiece"
- [ ] Fotos T3: los renders ya usan Brazos3/Frente3 en convo — plantilla.html usa `Renders/${p.folder}/Brazos.png` etc., agregar Brazos3/Frente3 al chain de tryImages si existe la función allí

### posiciones.html
- [ ] T2 button: agregar `<span class="sb-sub">FINALIZADA</span>` y quitar `active`
- [ ] Agregar botón T3 con `active` por defecto y `<span class="sb-sub">PRÓXIMAMENTE</span>`
- [ ] `s-t2` div: hidden por default
- [ ] `s-t3` div: visible por default, contenido: mensaje "PRÓXIMAMENTE" con descripción
- [ ] `switchSeason()`: manejar `'t3'`, ocultar s-t1 y s-t2

### index.html
- [ ] Reemplazar todas las ocurrencias de `"T2 2026"` por `"T3 2026"` en badges/labels/footer
- [ ] Agregar `T3_CUTOFF = '2026-06-30'` junto al `T2_CUTOFF`
- [ ] El dashboard sigue mostrando stats de T2 (última temporada con datos) — NO cambiar el filtro de T2_MATCHES
- [ ] Agregar pequeño banner/badge "T3 PRÓXIMAMENTE" visible en el hero o cerca del top

## ROSTER_T3 (plantel actual — extraído de convo.html)

```js
const ROSTER_T3 = [
  { key:'Woolfyboyzx2',    name:'Woolfyboyzx2',    pos:'POR', num:45, folder:'Woolfyboyzx2'    },
  { key:'rivarola90',      name:'rivarola90',       pos:'DFC', num:2,  folder:'rivarola90'      },
  { key:'Alexisraies23',   name:'Alexisraies23',    pos:'DFC', num:3,  folder:'Alexisraies23'   },
  { key:'Cabers14',        name:'Cabers14',         pos:'DFC', num:4,  folder:'Cabers14'        },
  { key:'Agubostero7',     name:'Agubostero7',      pos:'DFD', num:31, folder:'Agubostero7'     },
  { key:'Huber236',        name:'Huber236',         pos:'LD',  num:8,  folder:'Huber236'        },
  { key:'zPibu__',         name:'zPibu__',          pos:'LI',  num:30, folder:'zPibu__'         },
  { key:'Juan_Martinez4',  name:'Juan_Martinez4',   pos:'MCD', num:6,  folder:'Juan_Martinez4'  },
  { key:'RS32-DaniStone',  name:'RS32-DaniStone',   pos:'MCI', num:13, folder:'RS32-DaniStone'  },
  { key:'CipriMancini',    name:'CipriMancini',     pos:'MVD', num:32, folder:'CipriMancini'    },
  { key:'Guiidow',         name:'Guiidow',          pos:'MCI', num:20, folder:'Guiidow'         },
  { key:'BlackPanther-CG', name:'BlackPanther-CG',  pos:'ED',  num:11, folder:'BlackPanther-CG' },
  { key:'Lautavester7',    name:'Lautavester7',     pos:'EI',  num:7,  folder:'Lautavester7'    },
  { key:'Lucasmati_akd',   name:'Lucasmati_akd',    pos:'DC',  num:9,  folder:'Lucasmati_akd'   },
];
```

## CSS tokens en uso

```css
--gold        /* acento activo */
--gold-dim    /* fondo activo */
--border2     /* borde inactivo */
--muted       /* texto inactivo */
--muted2      /* texto badge inactivo */
```

Para badge PRÓXIMAMENTE T3 usar el mismo estilo visual que FINALIZADA pero con color neutro, sin usar azul hardcodeado (ya hereda --gold en T3 mode).

## Gotchas

- **No hardcodear `#4a9eff`** — las páginas corren en todos los modos de tema. Usar `var(--gold)` para el acento activo (en T3 mode ya vale azul).
- **T3_MATCHES estará vacío** — cualquier `.reduce()` o `.map()` sobre T3_MATCHES no debe romper con array vacío. Verificar que `computePlayerStats([])` y `computeRankings(emptyStats, keys)` devuelven valores seguros.
- **switchSeason en plantilla.html** — la función `closePanel(false)` ya existe; no duplicarla.
- **currentGridSeason en calendario.html** — es la variable que controla el filtro del grid, no confundir con `currentSeason` de estadisticas.html.
- **Orden de los botones de temporada** — siempre T3 primero (más reciente a la izquierda), luego T2, luego T1. Esto es el patrón visual existente.
- **No usar `transition: all`** — ya hay `.sbtn`, `.season-pill`, `.season-btn` con transiciones específicas definidas en CSS.
- **Fotos T3 en plantilla.html** — buscar si hay función `tryImages` y si ya incluye Brazos3/Frente3; si no, agregarlas al chain.

## Implementation Blueprint

```
ORDEN DE IMPLEMENTACIÓN:

1. estadisticas.html
   a. Línea 506: cambiar "EN CURSO" → "FINALIZADA" en spill2, quitar estilos gold activo
   b. Línea 507: insertar spill3 (T3, activo con gold)
   c. Línea 777: cambiar currentSeason = 2 → currentSeason = 3
   d. Línea 778: agregar T3_CUTOFF = '2026-06-30'
   e. Líneas 779-783: actualizar seasonMatches() para 3 seasons
   f. Líneas 2735-2748: reescribir switchStatsSeason() para 3 botones
   g. Buscar dónde se renderiza el área vacía y agregar empty state para season===3

2. calendario.html
   a. Línea 788: cambiar sbtn-t2 a inactive, agregar sbtn-t3 active
   b. Línea 1172: currentGridSeason = 't3'
   c. Línea 1181: agregar T3_CUTOFF = '2026-06-30'
   d. Líneas 1447-1448: actualizar matchSeason() para 3 seasons
   e. Líneas 1783-1786: agregar T3 al inicio de SEASON_RANGES

3. plantilla.html
   a. Línea 463: agregar badge FINALIZADA al pill T2
   b. Línea 464: agregar pill T3 activo
   c. Línea 464+: agregar <div id="t3-content"> con empty state y grid
   d. Línea 464: cambiar pill T2 a inactive (quitar 'active')
   e. Después de ROSTER_T2: agregar ROSTER_T3
   f. Línea 724+: agregar T3_CUTOFF, T3_MATCHES, ROSTER_T3_KEYS, t3Stats, t3Rankings
   g. Líneas 826-834: expandir switchSeason() para n===3
   h. Verificar chain de tryImages para Brazos3/Frente3

4. posiciones.html
   a. Líneas 265-270: agregar T3 button active, T2 se vuelve inactive + FINALIZADA
   b. Línea 276+: agregar <div id="s-t3"> con mensaje PRÓXIMAMENTE
   c. Línea 310: s-t2 oculto por default (style="display:none")
   d. Líneas 552-556: actualizar switchSeason() para 't3'

5. index.html
   a. Reemplazar todas las 8 ocurrencias de "T2 2026" → "T3 2026"
   b. Línea 492: agregar T3_CUTOFF = '2026-06-30' debajo de T2_CUTOFF
   c. Agregar banner "T3 próximamente" en el área del hero o encabezado
```

## Tasks (en orden)

1. [ ] estadisticas.html — T2 pill: "EN CURSO" → "FINALIZADA", quitar estilos activos
2. [ ] estadisticas.html — agregar spill3 T3 activo por defecto
3. [ ] estadisticas.html — currentSeason=3, T3_CUTOFF, seasonMatches() actualizado
4. [ ] estadisticas.html — switchStatsSeason() reescrito para 3 pills
5. [ ] estadisticas.html — empty state T3 en el área de resultados
6. [ ] calendario.html — sbtn-t3 activo, currentGridSeason='t3', T3 en SEASON_RANGES
7. [ ] calendario.html — matchSeason() actualizado para T3, T3_CUTOFF definido
8. [ ] plantilla.html — pill T2 → FINALIZADA+inactive, pill T3 → activo
9. [ ] plantilla.html — ROSTER_T3, T3_MATCHES, t3Stats, t3-content div con empty state
10. [ ] plantilla.html — switchSeason() expandido para n===3
11. [ ] posiciones.html — T3 button activo, T2 FINALIZADA+inactive, s-t3 div, switchSeason() actualizado
12. [ ] index.html — reemplazar "T2 2026"→"T3 2026", T3_CUTOFF, banner próximamente

## Validation

```
Manual steps:
1. npx serve . --port 8000
2. estadisticas.html: verificar que T3 abre por defecto, T2 muestra FINALIZADA, T1 igual que antes
3. estadisticas.html: hacer clic en T2 → datos correctos; T1 → datos correctos; T3 → empty state
4. calendario.html: T3 activo por defecto sin partidos; T2 y T1 muestran partidos correctos
5. plantilla.html: T3 abierto por defecto con empty state; T2 → plantel T2 correcto; T1 → plantel T1 correcto
6. posiciones.html: T3 visible con PRÓXIMAMENTE; T2 y T1 accesibles con sus tablas
7. index.html: badges dicen T3 2026, footer actualizado, stats del dashboard siguen mostrando datos T2
8. Verificar en modo T3 (azul), dark y light que los estilos activos heredan bien --gold
9. Consola sin errores en todas las páginas
10. Mobile (375px): pills y botones de temporada visibles y tocables
```

## References

- Patrón T1→T2 ya implementado: `estadisticas.html` líneas 505-506, 777-783, 2735-2748
- Patrón calendario: `calendario.html` líneas 1447-1448, 1783-1786
- Patrón plantilla: `plantilla.html` líneas 463-464, 631+, 724-731, 826-834
- Patrón posiciones: `posiciones.html` líneas 265-270, 552-556

---
**PRP Score**: 9/10
**Confidence**: Patrón completamente documentado con snippets exactos y números de línea. El único riesgo es que `computePlayerStats([])` y funciones derivadas sean defensivas con arrays vacíos — verificar en el paso de validación. Todo lo demás es replicación 1:1 del patrón T1→T2 ya probado.
