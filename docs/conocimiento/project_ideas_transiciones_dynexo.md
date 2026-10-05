---
name: project_ideas_transiciones_dynexo
description: Ideas de transiciones con scroll inspiradas en dynexo.io, guardadas el 2026-10-05 para la próxima temporada (T5) — no implementadas
metadata:
  type: project
---

**Estado:** idea guardada a pedido de Juan (2026-10-05) para retomar en la próxima temporada. Nada implementado todavía.

## Qué tiene dynexo.io (relevado 2026-10-05)

React + Lenis (scroll suave), animaciones CSS disparadas con IntersectionObserver, sin GSAP. Una sola página larga (~22.000 px), todo atado al scroll (avanza y retrocede).

1. **"Scroll para entrar"**: secuencia de 72 cuadros (contador "FRAME 026 / 072") que avanza con el scroll — la cámara entra a la pantalla de la notebook y esa pantalla pasa a ser el fondo de la sección siguiente (técnica tipo páginas de Apple). Contenedor sticky `scroll-transition__sticky`, ~2.900 px de recorrido.
2. **Pase de sección con el logo**: una "X" 3D gigante vuela hacia la cámara girando, tapa la pantalla y por adentro aparece la sección siguiente.
3. **Texto que se ilumina**: párrafo de "Quiénes somos" en gris que se pinta de blanco palabra por palabra con el scroll.
4. **Galería fija de proyectos** (`work-stage`, ~10.000 px): la sección queda clavada mientras pasan 21 proyectos, con índice a la derecha y un brillo ambiental que cambia de color por proyecto.
5. **Detalles**: contadores que suben, línea de progreso en "Cómo trabajamos", testimonios como chat de WhatsApp escribiéndose, marquesina de frases.

## Versión propuesta para Top Secret (contenido propio, sin copiar su diseño)

| Efecto | Idea TSFC | Cómo |
|---|---|---|
| Scroll para entrar | Cámara que entra al vestuario / puerta de la bóveda (como plan-de-juego) y desemboca en el plantel | Video 5 s desde una imagen con `scripts/canva-imagen-a-video.mjs` → ~60 cuadros webp en R2 → canvas dibujado según el scroll |
| Pase con el escudo | El escudo Clean dorado crece y por adentro aparece la sección siguiente | Capa fija con `mask-image` del Clean logo (`logos/rebrand/clean-white.webp`) escalada con el scroll; sin 3D |
| Texto que se ilumina | Manifiesto del club en Nosotros o en el inicio | ~40 líneas de JS |
| Galería fija | Plantel de la temporada (render, número, posición) o noticias | Sticky + índice; brillo en el color de la liga |
| Detalles | Contadores de temporada (PJ, goles, victorias) y cinta de resultados | Datos de `seed_matches.js` |

**Motor recomendado:** GSAP + ScrollTrigger + Lenis desde CDN (cdnjs/jsdelivr), como ya se usa GSAP en `posiciones.html`. Sigue siendo vanilla JS, sin build.

**Cuidados:** la secuencia de cuadros pesa (3–5 MB) → en celular menos cuadros o video corto; respetar `prefers-reduced-motion` (todo estático); no romper la nav de `layout.js`.

**Plan sugerido:** 1) página de prueba aparte sin link en el menú (p. ej. `inicio-v2.html`) para revisarla en PC y celular; 2) empezar por el inicio con scroll para entrar + pase con el escudo + texto que se ilumina; 3) si gusta, pasar a `index.html` y sumar galería del plantel y contadores. Lo más trabajoso es generar el video de la entrada; Juan no eligió escena todavía (se propuso la bóveda, que ya tiene imagen en R2 `logos/plan/boveda.webp`).
