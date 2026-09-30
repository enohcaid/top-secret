---
name: diseno-sitio-limpio
description: "Dirección de diseño del sitio Top Secret FC desde el rediseño 2026-09-28 — oscuro limpio estilo editorial, nav superior agrupada, sin barras laterales ni burbujas"
metadata:
  node_type: memory
  type: feedback
  modified: 2026-09-28T23:39:46.739Z
---

El usuario pidió (2026-09-28) que el sitio se vea "mucho más limpio", tomando como modelo una landing editorial de moda (tarjeta hero redondeada, tipografía enorme, miniaturas, botón pill con flecha). Eligió **oscuro limpio** (negro/dorado, no blanco como el modelo).

- **Nada de barras laterales ni burbujas de redes** — pedido explícito. Toda la navegación vive en la top bar de `layout.js`, que "no se tiene que notar" (transparente, blur recién al scrollear).
- Menú agrupado definido por el usuario: logo Clean → inicio · Miembros (→ plantilla; despliega Convocatoria y Plan de juego) · Competencias (→ posiciones/liga; despliega Calendario y Estadísticas) · Redes (desplegable con todas las redes). Noticias integradas en la portada con imágenes grandes.
- Usar los logos nuevos del rebrand (`logos/rebrand/clean-*.webp`).

- 2026-09-28 (2da tanda): el grupo "Redes" pasó a llamarse **Nosotros** (→ nosotros.html, página editorial estilo nota de lanzamiento de kit del Chelsea: proyecto/identidad/historia/escudo/equipaciones/redes). Páginas interiores con encabezado-tarjeta + dupla e imágenes grandes; contenedores a 1440px con `--ts-g`.
- **Imágenes solo en R2, nunca en el repo** (pedido explícito). Todo PNG pesado en R2 tiene un `.webp` hermano; las páginas piden el webp con fallback al PNG (`webp()` en noticias.html / index-home.js). Imágenes nuevas del pipeline diario todavía no generan webp → caen al PNG.

- **Nada encerrado en recuadros** (corrección del usuario 2026-09-28: "quedó toda encerrada en cuadrados… en la imagen que pasé todo estaba libre"). Solo el hero de la portada es tarjeta; las fotos llevan esquinas redondeadas, pero textos, números, listas, ligas, redes y accesos van sueltos sobre el fondo, separados por aire y líneas finas (`border-top` hairline). No usar cards con fondo+borde para agrupar contenido. Implementado como bloques `/* ── LIBRE ── */` al final del `<style>` de cada página.

- Portada: título "Top Secret" + kicker "Información clasificada" (al usuario NO le gusta "Nada que declarar"; tampoco usarlo en otros textos).
- Plantilla T4 = foto grupal a sangre, interactiva (hover = expediente, click = perfil sin bordes con pose única). **Fotos grupales: poses canchereras variadas como las duplas, NUNCA formados en filas "como militares"** (corrección explícita del usuario). Se compone con `scripts/plantel-foto-t4.mjs` desde los `Unica4.png` de cada jugador (una escala común + "piso" por plano, así un jugador agachado no se agranda).

**Why:** el sitio anterior se sentía recargado (sidebar izquierda + burbujas flotantes + topbar con borde dorado).
**How to apply:** en cualquier página o sección nueva, respetar este lenguaje (tarjetas redondeadas, mucho aire, tipografía grande, pills) y no reintroducir sidebars/burbujas/barra inferior mobile. Páginas nuevas se agregan al `NAV` de layout.js dentro del grupo que corresponda. Ver [[project_t4_renders_kit]].
