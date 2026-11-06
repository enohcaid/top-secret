---
name: reference_borrar_pelota
description: Quitar la pelota de un cuadro real del vivo sin IA (scripts/social/piezas/2026-11-09-jue-pelota.mjs): qué más delata la pelota, de dónde sale el pasto y por qué conviene la fuente sin overlay
metadata:
  type: reference
---

Técnica de "¿Dónde está la pelota?" (2026-11-06): congelar un cuadro real, borrar la pelota y arrancar el video desde ese mismo cuadro. Sin cv2 ni torch: clon de pasto con el borde difuminado (`borrar()`), revisado con zoom.

- **La pelota no es lo único que la delata:** también su sombra (en el aire queda lejos de ella), la etiqueta con el nombre del que la lleva y la marca amarilla del juego donde va a caer un centro o un pase largo. Los triángulos sobre los jugadores los tienen todos: quedan.
- **El pasto se saca de la misma franja de corte**, a unos píxeles, y sin agarrar una línea: un parche tomado de arriba de la pelota copió la línea del área como una raya blanca. Elegir un cuadro con la pelota sobre pasto limpio, no pegada a un cuerpo ni sobre una línea (3 cuadros más tarde la tijera ya estaba limpia).
- **Fuente:** `fuentes/goles/vvivo-2026-10-22/source.mp4`, YouTube de RS32-DaniStone, sin overlay y sin audio: 720p que se escala 3x y aguanta. El HUD (marcador, radar, nombres) no se borra cuadro por cuadro: se tapa con franjas esmeriladas (`backdrop-filter`), no con negro, para no parecer barras de cine.
- **La cuenta de 5 s** se reparte en una cantidad entera de pulsos del tema, así la revelación cae sobre el pulso sin mentir en la duración.
