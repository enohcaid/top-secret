---
name: project_ideas_transiciones_dynexo
description: Ideas de transiciones con scroll inspiradas en dynexo.io, guardadas el 2026-10-05; se preparan para el arranque oficial de la T4 (decidido 2026-10-07) — no implementadas
metadata:
  type: project
---

**Estado:** idea guardada a pedido de Juan (2026-10-05) para retomar en la próxima temporada. **2026-10-07: Juan adelantó el plan — se prepara para el comienzo oficial de la T4** (la T4 todavía no arrancó; estamos en la pretemporada). Nada implementado todavía.

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

## Herramienta candidata: skill `scroll-world` (agregado 2026-10-06)

Juan la encontró en TikTok. Repo: https://github.com/oso95/scroll-world (MIT, ~9.7k estrellas). Arma landings "fly through the world": al scrollear, una cámara vuela sin cortes desde afuera de cada escena hacia adentro y sigue a la siguiente (dioramas isométricos generados por IA). El scroll controla un video cuadro por cuadro con JS vanilla (encaja con el sitio: sin frameworks).

- Cómo lo hace: imagen fija por escena (GPT Image vía Higgsfield, o Codex CLI con suscripción ChatGPT) → video de "zambullida" por escena + video conector entre escenas (Seedance 2.0 vía Monid), usando el cuadro real de cada corte para que las uniones calcen → ffmpeg extrae/encodea cuadros.
- Requisitos: CLI de Monid con API key (pago por uso, ~USD 27 por una cadena de 6 escenas en 1080p), Higgsfield con créditos, ffmpeg, Python 3 + Pillow.
- Instalación como skill: `/plugin marketplace add oso95/scroll-world` y `/plugin install scroll-world@scroll-world`.
- Para Top Secret: las imágenes fijas podrían salir del pipeline de ChatGPT que ya tenemos (CDP) con renders T4 y escudo como referencia; lo que cuesta plata es el video. Probar primero en una página aparte y revisar el código del repo antes de instalarlo. Podría ser el "scroll para entrar" de la portada (escenas: estadio → túnel → vestuario → cancha).

## Video con primer y último cuadro dentro de Canva (probado 2026-10-07)

Apps de Canva con fotograma inicial + final (todas cobran créditos propios, NO el cupo de IA de Canva):

| App | Qué tiene | Créditos en esta cuenta |
|---|---|---|
| **FrameFusion** | inicio + final, instrucciones, modo Classic/Film, 5 o 10 s | **1 gratis por día**; suscripción = 30/día |
| Gen Video (MiraclesKit) | Seedance 2.5/2.0, Kling, Veo 3.1, Sora 2, Hailuo, Wan… | 85 créditos por video, la cuenta tiene 1/mes → requiere plan pago |
| Frame Flow (VertexTurbo) | inicio + final, duración | sin créditos, solo comprando |
| Image Animate / Reference to Video (Vimmerse) | 1-2 fotos + texto, cámara | piden cuenta en Vimmerse |

**Prueba FrameFusion (modo Film, 5 s)**: sala digital → estadio (`logos/noticias/relanz-sala-digital` → `relanz-estadio-final`). Tardó < 1 min. Resultado: la cámara avanza al escudo de la pantalla, lo atraviesa (pase por fundido de ~0,3 s, no un vuelo 3D real) y sale en el estadio con el espía. Se ve bien y la identidad (escudo, silueta) se mantiene.
- **El último cuadro NO es exactamente la imagen final**: termina más cerca (encuadre recortado arriba, sin césped). Para encadenar escenas, el clip siguiente tiene que arrancar desde el último cuadro real exportado, no desde la imagen original.
- **Resolución baja**: el modo Film entrega 480×736 (para 2:3). Falta probar Classic, que quizá sale más grande.
- Bajar el video: la app lo agrega al diseño como blob (no se puede descargar ni capturar por canvas). Se hace agrandando el video en el diseño (Posición → ancho/alto/X/Y) y exportando el diseño en MP4 con la API de Canva (MCP `export-design`), después se recorta la zona con ffmpeg.
- Gotcha CDP: con las pestañas de Kick abiertas en el Chrome de CDP, Playwright y Puppeteer se cuelgan al conectarse (`connectOverCDP` timeout). Funciona abrir la pestaña con `PUT /json/new` y hablarle por WebSocket directo a `ws://localhost:9222/devtools/page/<id>`; los paneles de las apps son iframes de `*.canva-apps.com` (entrar con `Target.setAutoAttach` flatten y `DOM.setFileInputFiles` con `objectId` para subir archivos).

## Encadenar clips con "Imagen a video" nativo de Canva (probado 2026-10-07) — el camino elegido

Idea de Juan: generar el clip desde la imagen inicial con un prompt que **describa la escena final deseada**, sacar el último cuadro real con ffmpeg (`-sseof -0.1 … -frames:v 1`) y usarlo como imagen inicial del clip siguiente. La unión queda perfecta por construcción (medido: diferencia media 2/255 entre último cuadro y primero del siguiente, solo compresión).

Prueba vestuario → túnel → estadio (2 clips, 10 s, 1152×768, 30 fps, ~25 s por clip): `logos/nosotros/vestuario-kits.png` → los casilleros se abren como puerta, la cámara entra a un túnel con luces doradas y termina frente a la salida; el clip 2 sale a la cancha de un estadio de noche y la luz pasa a dorada en forma gradual (~0,8 s). Obedece bien el destino descrito. Detalles flojos: las líneas del círculo central se deforman al final del clip 2. Prompts usados: "Plano secuencia continuo, sin cortes. La cámara … avanza hacia … Movimiento de cámara suave y fluido, como un dron, iluminación cinematográfica." (sin "humo" ni "respirar", ver reference_canva_imagen_a_video).

Ventajas sobre FrameFusion: usa el cupo de IA de Canva (~4% por clip, sin pagar aparte), mejor resolución, y no hay que recortar el último cuadro porque ya lo elegimos nosotros. Lo que no se controla: el encuadre exacto de llegada (cada escena "nueva" la inventa el modelo; para que aparezcan nuestros escudos/jugadores conviene un clip de llegada que parta de una imagen nuestra, o un pase con máscara).

Implementación: el flujo del script `scripts/canva-imagen-a-video.mjs` sirve tal cual, pero si en el Chrome CDP hay pestañas de Kick abiertas Playwright se cuelga: para la prueba se rehízo el flujo con CDP crudo (WebSocket a la pestaña). Al pasar a producción, hacer que el script use ese modo o cerrar las pestañas de Kick. Ojo: el clic en "Generar video de 5 segundos" a veces no registra; reintentar el clic si a los ~30 s no apareció el video.

**Criterio de Juan (2026-10-07): transiciones poco exigentes.** Cada clip pide un solo movimiento simple (avanzar, girar o elevarse un poco), entre escenas cercanas, sin transformar objetos ni pedir cambios grandes de lugar o de luz. Cuanto más se le pide al modelo, más detalle se pierde: en la prueba se deformaron las líneas de la cancha y una camiseta desapareció de su casillero. Preferir más clips cortos y suaves que pocos clips con mucho viaje; los saltos grandes de escena se resuelven con un pase de diseño (máscara del escudo, fundido), no con la IA.

## Decisión (2026-10-07): "Del escudo al jugador" + una sección del index por transición

Juan eligió esta transición (descartó el acceso a la cancha: "no me genera nada"; quiere algo con los jugadores y el logo):
- Arranca en un primer plano del escudo Clean dorado del pecho de la camiseta T4; al scrollear la cámara se aleja y aparece el jugador entero; luego avanza al escudo del pecho del siguiente jugador hasta llenar la pantalla, y ese escudo es el del próximo (corte por coincidencia: mismo escudo, mismo lugar y tamaño → pase perfecto sin pedirle nada a la IA).
- A la IA solo se le pide un movimiento por clip (alejarse o acercarse), partiendo de los renders T4 propios (kit y escudo correctos). Encadenar con el último cuadro como en la prueba de Canva.
- **Después de cada transición aparece una nueva sección del index** (noticias, miembros, competencias, etc.): el recorrido de jugadores es el hilo que va presentando las secciones, no un video aislado arriba de la página.
- Cierre posible: la "rueda de reconocimiento" con todo el plantel (imagen ancha armada con los renders, desplazamiento sin IA).
- Descartadas por ahora: la silueta que se revela (cambio de luz muy exigente).

Próximo paso cuando se retome: prueba con dos jugadores (alejarse del escudo de uno → acercarse al escudo del otro, ~3 clips, ~12% del cupo de Canva).
