---
name: reference_marcas_sobre_video
description: Dibujos que siguen a los jugadores sobre video real, estilo análisis de TV (scripts/social/lib/seguir.py + plantillas/pizarra.html): cómo se sigue la cámara y a los jugadores sin opencv y cómo elegir una jugada
metadata:
  type: reference
---

Técnica de "El movimiento que nadie vio" (2026-11-06). Anillos, flechas y estelas quedan pegados al pasto aunque la cámara se mueva, y las flechas son las corridas reales, no dibujos.

- **`scripts/social/lib/seguir.py`** (solo numpy; no hay cv2 en la PC): `python seguir.py <ffmpeg absoluto> <config.json> <salida.json>`. Calcula la homografía de cada cuadro a uno de referencia (Gauss-Newton sobre toda la imagen, con pesos de Huber para que los jugadores no molesten) y sigue a cada jugador por mean-shift sobre su color (`oscuro` o `blanco`), partiendo de x, y de su cuerpo en un cuadro. 7 s a 60 fps tardan ~2:20.
- **Salida:** todo en coordenadas del cuadro de referencia, ya sobre el pasto. Pasar a pantalla con la inversa de la homografía del cuadro actual (`delPasto()` en `pizarra.html`). Lo ya corrido o lo que falta correr se dibuja pasando cada punto por ahí.
- **Verificar antes de armar nada:** dibujar anillos y estelas sobre 10-12 cuadros repartidos. Las estelas rectas y sin saltos dicen que la cámara está bien; también sirven para leer la jugada (acá mostraron que el defensor corre en paralelo al #9 toda la jugada).
- **Colores:** el blanco del rival se puede confundir con las líneas de la cancha cuando el jugador las cruza, y el mean-shift se queda con la línea. No pasó en esta jugada, pero mirarlo si la pista salta. Oscuro sobre verde no tiene ese problema (la sombra queda afuera con `G - R < 16`).
- **Elegir la jugada:** mirar a resolución completa antes de decidir qué se afirma. El marcador del HUD y las etiquetas del juego confirman autor y momento. El marcador se actualiza más de un segundo después de que la red se mueve: el gol se ubica por la red. El partido puede no estar todavía en `seed_matches.js`: se dice solo lo que se ve.
- **Encuadre vertical:** ventana de 405x720 sobre el 1280x720 (zoom 2,667 o más), con los cuadros en disco al doble y `unsharp`. El HUD queda bajo franjas esmeriladas, como en [[reference_borrar_pelota]].
- **Cámara lenta:** se mezclan los dos cuadros vecinos con alfa, para suavizar el salto a 0,5x sobre fuente de 60 fps.
