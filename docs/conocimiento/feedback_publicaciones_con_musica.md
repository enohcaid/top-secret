---
name: publicaciones-con-musica
description: Regla de Juan (2026-10-01) — TODAS las publicaciones en redes van con música; qué se puede automatizar y qué queda manual por eso
metadata:
  type: feedback
---

**Regla:** a partir del 2026-10-01, toda publicación en las redes del club (reels, videos, carruseles, posts de imagen) va **con música**.

**Why:** Juan está relanzando las redes con un look limpio y visual; sin música las piezas rinden menos y se ven incompletas.

**How to apply** (según lo que permite cada plataforma):
- **TikTok:** música de la biblioteca desde el editor web de TikTok Studio ("Sonidos") — automatizable vía Chrome CDP (ver [[publicar-redes]]). Los carruseles de fotos también llevan sonido.
- **YouTube:** Studio → Editor → Audio (Biblioteca de audio de YouTube). Automatizable.
- **X:** no tiene biblioteca → pegar al archivo un tema de la Biblioteca de audio de YouTube con ffmpeg. Las imágenes sueltas no admiten música: publicar como video (placa animada o carrusel en video) cuando haga falta.
- **Instagram y Facebook:** la API de Meta no permite música de biblioteca, así que (decisión de Juan, mismo día) se usa **trap libre de derechos pegado al archivo** (ver [[musica-trap]]) y se publica por `scripts/meta.mjs`. Los carruseles se publican como video (placas + beat).
- Siempre decirle a Juan qué tema se usó en cada red, para que use el mismo en Instagram.
- El carrusel "El expediente" (IG y FB, 2026-10-01) salió SIN música, antes de esta regla.
