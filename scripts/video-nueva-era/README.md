# Video "Bienvenidos a la nueva era" (T4)

Reel vertical 1080×1920, ~28 s, sin audio (la música se agrega al subir a cada red). Publicado en R2 `videos/nueva-era-t4-v2.mp4`. Hecho el 2026-10-01 para relanzar las redes del club; solo con material propio, sin créditos de Canva.

Secuencia: escudo Clean + "TOP SECRET" → "Bienvenidos a una nueva era" → sello metálico "Misma esencia. Otra presencia." (nunca "nuevo escudo") → travelling de las camisetas T4 → paneo de la foto grupal → los 6 fichajes (cortes rápidos con número, gamertag y puesto) → gol de nikileo527 vs IACC Cantera "Ahora en EA FC 27" → sitio en el celular → cierre con redes.

Para regenerarlo:
```bash
node scripts/r2.mjs get videos/pruebas/kits-t4-travelling.mp4 fuentes/nueva-era/kits.mp4
node scripts/r2.mjs get videos/goles/2026-09-30/compilado-goles-2026-09-30-v3.mp4 fuentes/nueva-era/goles.mp4
node scripts/r2.mjs sync-down _fuentes/video-fichajes fuentes/video-fichajes
node scripts/video-nueva-era/armar.cjs     # → fuentes/nueva-era/nueva-era.mp4
```
Los fichajes salen de `scripts/video-fichajes/jugadores.json`.
