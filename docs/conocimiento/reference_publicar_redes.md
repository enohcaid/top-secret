---
name: publicar-redes
description: Cómo se publicó en las redes del club desde el Chrome CDP (YouTube Studio, X, TikTok Studio) — selectores y trampas; Instagram/Facebook pendientes (captcha → API de Meta)
metadata:
  type: reference
---

Primera publicación automatizada: 2026-10-01, reel "Expediente Top Secret: desclasificado" (scripts en `fuentes/redes/` no versionados; esto es el resumen reutilizable).

- **YouTube** (sesión en el Chrome CDP, canal **TOP Secret FC** `UCEKzzKDMMPri12Q3E9S7IVw`; ojo: el perfil también tiene el canal personal de Juan): `studio.youtube.com/channel/<id>/videos/upload?d=ud` → `input[type=file]` → `#textbox` 0 = título, 1 = descripción → radio `VIDEO_MADE_FOR_KIDS_NOT_MFK` → `#next-button` ×3 → radio `PUBLIC` → `#done-button`. Vertical ≤60 s sale como Short. Resultado: https://youtube.com/shorts/7ykfCkHJuD8
- **X** (@FCTOPSecret): componer desde `x.com/home` (`tweetTextarea_0` + `input[data-testid=fileInput]`), esperar "…mp4: Listo", y publicar con `document.querySelector('[data-testid=tweetButtonInline]').click()` vía evaluate — el click normal de Playwright falla porque una capa del header intercepta el puntero; desde `/compose/post` tampoco salía. Verificar en el perfil (el primer post es el FIJADO del ascenso). Resultado: https://x.com/FCTOPSecret/status/2105657385352147409
- **TikTok** (@topsecretfc): `tiktok.com/tiktokstudio/upload` → `input[type=file]` → cerrar diálogos ("Cancelar" en revisiones automáticas, "Entendido") → descripción en el contenteditable (hashtags escribiendo `#x` + espacio) → "Editar portada" y arrastrar el selector a un cuadro con texto (el primer cuadro es negro) → Guardar → Publicar. Queda "Contenido en revisión / Solo yo" unos minutos y después pasa a público.
- **Instagram y Facebook:** el login en el Chrome CDP lo frena un captcha (también en modo normal). Juan sube a mano por ahora; alternativa: API de Meta (Graph API, publicación de Reels).
- Noticia en el sitio con video de YouTube: bloque de body `{youtube: '<id>', vertical: true, caption}` (noticias.html `bodyHtml`).
