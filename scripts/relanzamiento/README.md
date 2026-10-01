# Relanzamiento "Expediente Top Secret: desclasificado" (2026-10-01)

Concepto aprobado por Juan: el club como organización secreta que abre su archivo. El **fichero de papel** (estética vieja del sitio y de las noticias) es el pasado; el **expediente digital** es el presente: "se informatizó todo". Hilo cinematográfico: el espía del escudo (sombrero, anteojos, gabardina, siempre de espaldas) camina del archivo de papel a la sala digital y termina en el estadio. **Sin fichajes no anunciados** (ni nombres ni primeros planos).

Reel vertical 1080×1920, ~42 s, sin audio → R2 `videos/relanzamiento-t4.mp4`.

| # | Escena | Fuente |
|---|---|---|
| 1 | "ARCHIVO TSFC · ACCESO CONCEDIDO" tipeado | `escenas.cjs` (acceso) |
| 2 | Espía en el archivo de papel — "Todo empezó en un archivo." | ChatGPT `archivo-papel` → Canva |
| 3 | Noticias viejas (fichero) cayendo sobre la mesa — "En papel." | `escenas.cjs` (papel), imágenes de `Renders/Daily News` |
| 4 | La ficha se pixela: "DIGITALIZANDO ARCHIVO %" | `escenas.cjs` (digital) |
| 5 | Espía frente a la pared de pantallas — "El archivo se informatizó." | ChatGPT `sala-digital` → Canva (solo los primeros 2,5 s: al final Canva inventa un segundo personaje) |
| 6 | 160 partidos · 75 victorias · 303 goles · 3 ligas | `escenas.cjs` (numeros), datos de `seed_matches.js` al 1/10 |
| 7 | Lautavester7, 100 goles | `escenas.cjs` (leyenda) |
| 8 | Sello metálico "Misma esencia. Otra presencia." | placa |
| 9 | Travelling de las camisetas T4 | `fuentes/nueva-era/kits.mp4` |
| 10 | Vestuario — "Listos para salir." | `logos/nosotros/vestuario-kits.png` |
| 11 | "Ahora en EA FC 27": gol de Juan_Martinez4 | compilado de goles del 30/9 |
| 12 | Espía en el estadio — "La nueva era empieza ahora." + redes | ChatGPT `estadio-final` → Canva (cámara casi fija: con travelling Canva convirtió al espía en un sombrero gigante) |
| 13 | Escudo Clean dorado "TOP SECRET" | placa |

Regenerar:
```bash
node scripts/r2.mjs sync-down _fuentes/relanzamiento fuentes/relanzamiento      # imágenes ChatGPT + clips Canva
node scripts/r2.mjs get videos/pruebas/kits-t4-travelling.mp4 fuentes/nueva-era/kits.mp4
node scripts/r2.mjs get videos/goles/2026-09-30/compilado-goles-2026-09-30-v3.mp4 fuentes/nueva-era/goles.mp4
node scripts/relanzamiento/escenas.cjs      # escenas animadas propias (cuadro a cuadro con Playwright)
node scripts/relanzamiento/armar.cjs        # → fuentes/relanzamiento/relanzamiento-t4.mp4
```
`imagenes.mjs` regenera las 3 imágenes del espía en ChatGPT (CDP). Cada clip de Canva consume **4%** del cupo mensual (medido 2026-10-01).
