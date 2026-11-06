---
name: reference_capas_personajes
description: Separar una foto de ChatGPT en capas (recorte + fondo reconstruido + texto entre las dos) sin Canva; qué modelo de rembg usar y por qué; fotos de personajes inventados
metadata:
  type: reference
---

Técnica de "Los 6 compañeros" (2026-11-06, `scripts/social/piezas/2026-11-09-mar-companeros.mjs` + `plantillas/companeros.html`).

- **Recorte:** `python scripts/stream/quitar-fondo.py <entrada> <salida> <modelo>` (sin `-I`: rembg está en el site-packages del usuario). `u2net` conserva lo que el personaje tiene en la mano (pelota, pizarra) pero también se lleva lo llamativo del fondo; `u2net_human_seg` deja solo a la persona y su ropa (sacó el árbitro de luz, el sillón), y aun así mantuvo el joystick y las llaves. Probar los dos por imagen.
- **Fondo sin la persona:** difundir los colores de alrededor a 1/8 de resolución y componer con la máscara (`fondoSinPersona`). Un blur normalizado común deja negro el centro de una figura grande. No hace falta otra imagen de ChatGPT porque el fondo va desenfocado.
- **Texto entre capas:** dejar la cabeza tapando solo el borde de abajo de las letras y correr el nombre si un brazo levantado lo tapa (`sangria`). Marca los tiempos con la voz, no al revés.
- **Personajes inventados:** `generarImagen({ adjuntos: [], promptCompleto })`; con ropa negra lisa sin escudo no hay riesgo de escudos inventados.
- **Duración:** Elena hace ~2 palabras por segundo contando las pausas de los puntos: una frase con varios puntos dura mucho más de lo que parece. Para una escena de 7 s, unas 14 palabras y mejor comas que puntos.
