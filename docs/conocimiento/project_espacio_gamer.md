---
name: project-espacio-gamer
description: Desde la T4 la liga 11x11 se llama "Espacio Gamer" (CHALLENGERS (2°) | ESPACIO GAMER ARGENTINA, espaciogamer.cl); cómo se lee su tabla y qué quedó como "11x11" a propósito
metadata:
  type: project
---

**Regla de Juan (2026-10-13):** a partir de la Temporada 4, lo que era la liga **11x11** se llama **Espacio Gamer**. La división de Top Secret y toda su info oficial (tabla, fixture, máximos, ranking, TOTW/TOTS) está en
https://espaciogamer.cl/division/challengers-2-espacio-gamer-argentina/
(Temporada #1 - FC 27 del sitio; el club figura como "Top Secret FC").

**En textos para el público** (sitio, noticias, redes): "Espacio Gamer", sin artículo, igual que las otras ligas ("ganó en Espacio Gamer"). Las tablas y menciones de T1–T3 siguen diciendo "11x11" (es lo que era en ese momento). Ver [[feedback_league_naming_news]].

**En el código la clave interna NO cambió:** `league: '11x11'` en `seed_matches.js`, `e11` en ids/clases/colores (`--e11`), `LG_CLASS`, etc. Cambiarla rompería filtros y estadísticas de todo el sitio; solo cambian las etiquetas visibles de la T4.

**Cómo se lee la tabla:** es un WordPress con plugin propio ("espacio-gamer-motor"). La tabla no está en el HTML: la carga `admin-ajax.php` (`action=eg_obtener_ranking`, `metrica=posiciones`, `division_id`, `temporada_id`, `nonce`). El nonce y los ids (`data-division-id="10"`, `data-temporada-id="6"` al 2026-10-13) salen de la propia página. El Worker hace eso en **`/eg-table`** y devuelve `[{name, logo, gp, w, d, l, gf, gc, gd, pts}]` en el orden de la liga. Lo usan `posiciones.html` (pestaña T4 "Espacio Gamer", `fetchT4EG()`) y la tarjeta de la home (`index-home.js`). Si cambian de temporada, los ids se toman solos de la página; si cambia la URL de la división, editar `DIV_URL` en el Worker.

**Fixture:** se publica en `/division/challengers-2-espacio-gamer-argentina/fixture/` (al 2026-10-13 todavía vacío, división "Por comenzar"). Cuando salga, cargarlo como los otros fixtures (Firestore `calendario/estado.custom` + convocatoria, ver [[feedback_arranque_temporada_vpn]] y [[feedback_11x11_two_schedule_sources]]) con `league: '11x11'` internamente.

`espaciogamer.cl` está en la whitelist de `/img-proxy` (escudos al compartir tablas).
