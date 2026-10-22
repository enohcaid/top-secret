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

**Fixture (cargado 2026-10-19):** 19 fechas, martes y jueves 23:00/23:30, del 20/10 al 19/11. Se lee del mismo admin-ajax con `metrica=fixture` y lo carga `node scripts/fixture-espacio-gamer.mjs [--aplicar]` en Firestore `calendario/estado.custom` (`league:'11x11'`, `instancia:'Fecha N'`; solo agrega los que falten, no mueve ni borra). Hora de EG (Chile) = ART mientras ambos estén en UTC-3; revisar si hay partidos entre abril y septiembre. Escudos en `E11_T4_BADGES` (calendario.html y convocatoria.html, mantener sincronizados; nombres exactos de EG, ej. "ALL BOYS", "Sub 21", "Los Picantes"). La etiqueta visible es `lgLabel(m)` → "Espacio Gamer" para 11x11 posterior a T4_CUTOFF.

**Tabla vacía (2026-10-20):** EG empezó a marcar las zonas (playoffs 1–8, promo, descenso) con `<tbody class="eg-tp-club eg-tp-en-zona" style="--zona:…">`; el Worker cortaba por `class="eg-tp-club"` exacto y devolvía 2 de 20 equipos. Ahora corta con regex `class="eg-tp-club[^"]*"`. Si la tabla vuelve a salir corta, mirar primero el HTML que devuelve el admin-ajax.

**Escudos sin fondo (2026-10-20):** EG sube algunos escudos con un cuadrado de fondo (ALL BOYS, IACC Reserva, MISKYMAYU FC, MONOTRIBUTISTAS, Suda eSports, Argentinos Jrs Esp). Versiones transparentes hechas con `node scripts/escudos-sin-fondo.mjs <dir> slug=url[@tol][+borde]` (relleno desde el borde + apertura para no comerse trazos finos; `+borde` = contorno blanco para textos oscuros, usado en ALL BOYS e IACC) → R2 `logos/escudos-eg/<slug>.webp` (originales PNG en `_fuentes/escudos-eg/`). Los usan `LOGO_LIMPIO` en `/eg-table` (Worker) y `E11_T4_BADGES` (calendario/convocatoria). Si aparece un equipo nuevo con fondo, sumarlo a los tres lugares.

`espaciogamer.cl` está en la whitelist de `/img-proxy` (escudos al compartir tablas).

**Placa del fixture (2026-10-19):** `node scripts/placa-fixture-eg.mjs [--subir]` arma `logos/Fixture Espacio Gamer T4.{png,webp}` en HTML + Playwright con los datos de `calendario/estado.custom` y los escudos de `E11_T4_BADGES` (grilla simétrica: dos columnas iguales y la fecha impar centrada abajo). Se hizo en HTML y no con ChatGPT para que los 19 escudos sean los reales. Re-correrla si EG cambia una fecha. **Nuvo FC no tiene escudo en EG**: se usa el de "NuVo FC" de VPUG (CopáFácil); el mapa tenía por error el de ALL BOYS.

**De dónde saca EG las estadísticas de cada partido (2026-10-20):** de la API pública de Clubes Pro de EA, la misma que ya guarda nuestro Worker (`/ea-historial`) — la página `espaciogamer.cl/partido/?partido_id=N` lo dice ("Las estadísticas … provienen de los datos públicos de Clubes Pro", "Estadísticas gestionadas por Top Secret FC"). No tiene nada que no tengamos: EA no trae posesión, xG, córners ni minutos de gol (los `match_event_aggregate_*` vienen vacíos). Si no hay reporte en video, el partido se carga con `node scripts/cargar-partidos-ea.mjs --aplicar --commit` (EA llama al rival "Sub21 CF": el Worker lo cruza por el calendario igual). El cargador no pone `isHome`: agregarlo a mano.

**Escudos que EG no tiene (2026-10-21):** Deportivo Moron eSports, Arabia Team y City Torque eSp usan su escudo de VPUG (CopáFácil: "Deportivo Moron" gallo CDM, "ArabiaTeam" = Arabia Viejo, "Montevideo City Torquee") → R2 `logos/escudos-eg/<slug>.webp` (originales en `_fuentes/escudos-eg/vpug-*.png`); Nuvo FC, el de "NuVo FC". Mapa `ESCUDOS_FALTANTES` en `scripts/lib/espacio-gamer.mjs` (lo usa el bot de amistosos). **Villa Die** (Under) no tiene escudo en ningún lado encontrado.

**Escudos con fondo, todas las divisiones (2026-10-21):** detector = esquinas opacas del recuadro con contenido (los PNG de EG traen margen transparente, así que mirar las esquinas de la imagen no sirve). De 76 equipos, 14 tenían fondo: los 6 de Challengers ya limpios + Lizzard CF, Almagro eSports, COMUNICACIÓNC, Deportivo Murra, LMJ eSports, LosPamba1891 (fondo en damero gris: tolerancia `@75`) → R2 `logos/escudos-eg/<slug>.webp`, originales en `_fuentes/escudos-eg/`. **LT Gaming y NOTTINGAM MIEDO quedan con fondo**: es parte de la ilustración (ni el relleno ni el removedor de Canva lo separan). Mapa `ESCUDOS_SIN_FONDO` en `scripts/lib/espacio-gamer.mjs` (gana sobre el logo de EG).
