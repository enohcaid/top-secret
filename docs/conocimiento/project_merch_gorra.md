---
name: project_merch_gorra
description: Primer producto de merch (2026-11-10) — gorra negra con el espía bordado en dorado y TOP SECRET en la tira; teaser con la modelo oculta, réplicas de producto con ChatGPT y técnica "solo dorado" para el metraje real
metadata:
  type: project
---

**El producto:** gorra negra de 6 paneles, el espía (Clean logo) bordado en hilo dorado al frente, "TOP SECRET" bordado en dorado en la tira trasera, hebilla rectangular de bronce. Primer merch oficial. Sin precio, link ni fecha de venta definidos al 2026-11-10 (las piezas cierran con "Próximamente": no inventar datos comerciales).

**Teaser (2026-11-10):** `scripts/social/piezas/merch-gorra.mjs` + `scripts/social/plantillas/merch-gorra.html`, 31 s, "Scar" (The Shorts, 140 BPM, golpe a los 41,146 s = revelado). Pedido de Juan: muchos efectos, **la modelo no se ve**, misterio. Material en R2 `_fuentes/merch-gorra/` (6 videos de celular 480x854 + 5 réplicas PNG).

**Lo que funcionó:**
- **Modelo oculta:** tramos revisados cuadro a cuadro (4 por segundo, con el recorte final); en v2 la boca y el mentón asoman a los 9–10 s y 24 s, y el perfil a los 11–15 s y 26–33 s, así que no se usan. Encima, gradación **"solo dorado"** (`gradar()`): solo queda en color el amarillo con croma absoluta alta (máx − mín > 32; el hilo da ~65, la pared crema ~27, el pelo ~10) y tono 30–54°, remapeado a la rampa dorada de la marca; todo lo demás pasa a gris oscuro. `colorhold` de ffmpeg no sirve: la pared y la piel tienen un tono parecido al dorado.
- **Réplicas desde otros ángulos:** `generarImagen` con `promptCompleto` + `adjuntos` (fotos reales + Clean logo Dorado); el prompt por defecto dice "SIN TEXTO" y borraría el TOP SECRET de la tira. Pedir "una sola toma, sin recuadros ni insertos" (la primera héroe vino con un círculo de detalle).
- **Canva imagen→video** (`animar(..., { quietos: false })`): órbita y giro muy buenos, pero en 2 de 5 clips la luz cambió el color de la gorra (beige o dorada a mitad de clip). Revisar cada clip y usar solo el tramo fiel (`desde`) o la imagen fija (`quieta`).
- Un intento de ChatGPT recibió solo los adjuntos, sin el texto, y esperó 25 min: reintentar resuelve.
