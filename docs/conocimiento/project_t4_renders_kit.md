---
name: t4-renders-kit
description: Renders de plantel Temporada 4 (Frente4/Brazos4/Pose4) con Kit 1 negro/dorado y escudo Clean logo Dorado — decisiones del usuario y pendientes
metadata:
  node_type: memory
  type: project
  modified: 2026-09-29T21:26:54.824Z
---

2026-09-28: el usuario pidió renders de todo el plantel de convocatoria con los kits nuevos de T4, para una presentación y para armar T4 en la web (T4 aún no empezó; plantel = el de convocatoria).

- Kits en YouTube (no listados, no aparecen en el canal): Kit1 `https://youtu.be/BMYnnc-xj_M` (negro con ribetes dorados, estilo Chelsea), Kit2 `https://youtu.be/453JtmjV5tQ` (azul francia, medias blancas).
- **Decisión del usuario:** solo Kit 1, las 3 poses de siempre → `Renders/<gamertag>/Frente4.png`, `Brazos4.png`, `Pose4.png` (+ copia en `Renders/T4-Frentes/`). Kit 2 queda para más adelante.
- **Escudo:** el león del juego se reemplaza por `logos/rebrand/Clean logo Dorado.png` (elegido por el usuario). Sin sponsor en el pecho (nada de AIA en T4).
- Script: `scripts/renders-t4-once.mjs` (saltea lo existente; PLAYER_ONLY/POSES_ONLY/FORCE). Fuentes en `Documents/TOP SECRET/Fotos/T4` (capturas + recortes de carta + `KIT1-T4-referencia.png`).
- Identidad: Frente3 de T3 salvo looks renovados (RS32-DaniStone, Lautavester7, CipriMancini) y nuevos (Elianja20, endiabladorojo66, nikileo527, pepolemmo2710, NicoBJ_96), que salen de capturas nuevas.
- Dorsales: fuente de verdad = Firestore `plantel/activo.numeros` (los jugadores los eligen en convocatoria) — releer antes de generar. nikileo527=10, pepolemmo2710=15, adri_cai=99.
- Pendiente: adri_cai sin captura (usuario lo pospuso).
- Estado 2026-09-28: 57/57 generados, revisados, subidos a R2 y ONLINE. T4 armada en la web (plantilla, estadisticas, calendario, posiciones, index, convocatoria) con `T4_CUTOFF='2026-09-28'` provisorio — reemplazar por la fecha real de arranque cuando se sepa.
- **Arqueros (adri_cai, Ivan_Cabj_La12): kit de arquero T4** — camiseta naranja con ondas amarillas, short y medias rojas, Nike blanco, escudo **`Clean logo` BLANCO** (no el dorado; pedido del usuario). Referencia: carta de adri_cai → su Frente4 aprobado sirve de kit ref para otros arqueros (`gk:true` en el script). Los renders de Ivan con kit de campo quedaron como `*4-kit-campo.png`.
- **Kit 2 (alternativa)**: azul francia, cuello polo, vivos/swoosh amarillos, medias blancas con banda azul; escudo Clean DORADO (decisión mía, usuario no objetó). Lámina `KIT2-T4-referencia-sin-cara.png`. ⚠️ Gotcha: la textura del kit del juego trae "CHELSEA" + león tono sobre tono y ChatGPT lo copia — siempre prohibirlo explícito en el prompt y revisar de cerca el pecho antes de publicar. Descartes guardados en `Fotos/T4/descartes/`.
- Imágenes editoriales (2026-09-28): duplas en R2 `logos/duos/` (hero rotativo de la portada + encabezados de páginas interiores vía `PAGE_ART` en layout.js) y `logos/nosotros/` (página Nosotros). Scripts `duos-t4-once.mjs`, `nosotros-imgs-once.mjs`.
- El escudo clean blanco del kit arquero se deforma (le agregan cara/corbata) si el render va adjunto: adjuntar SOLO `escudo-clean-blanco.png` y describirlo.
- 2026-09-28: **Full_boxxing_ se fue del club** — sacado de convocatoria, ROSTER_T4, PLAYER_TRAITS, T3/T4-Frentes y Firestore `plantel/activo.jugadores` (sigue en ROSTER_T3 como historial). Plantel T4 = 19. No aparecía en ninguna dupla/imagen editorial. Baja completa (el proyecto ChatGPT "TOP Secret FC" ya no tiene instrucciones propias — nada que actualizar ahí).
- Imágenes editoriales verticales en recuadros horizontales: anclar `object-position: 50% 0` o se cortan las cabezas.
- 2026-09-29: CipriMancini pasó al **#14** (imágenes corregidas por edición puntual con `scripts/fix-dorsal-once.mjs`). **Cabers14** (ahora rasgos asiáticos, pelo negro corto, sin máscara) e **Ivan_Cabj_La12** (piel oscura, trenzas azules, barba canosa, sin anteojos) cambiaron de avatar: renders, poses únicas, duplas y túnel regenerados; capturas en `Fotos/T4/*-v2`. Al cambiar un look/dorsal: renders → Unica4 → duplas/túnel donde aparezca → `plantel-foto-t4.mjs` → webps + R2 → **subir `RENDER_V`** en plantilla.html, convocatoria.html e index-home.js (si no, el navegador sigue mostrando la foto vieja un año: caché immutable del Worker).
- 2026-09-29: el mismo problema de caché afecta a las fotos editoriales (`logos/duos`, `logos/nosotros`, `hero-t4`): el usuario seguía viendo a Cabers14/Ivan viejos en la portada. Ahora llevan `?v=` (RENDER_V en index-home.js, literal en layout.js PAGE_ART, nosotros.html, index.html) — subirlo al regenerar cualquiera con el mismo nombre, o subir con nombre nuevo (`-v2`, `-v3`).
- **Kit 2 (azul), método nuevo 2026-09-29:** las fotos armadas desde la lámina salían inconsistentes (sin dorsal, etc.). Ahora hay modelo de frente por jugador de campo, `Renders/<gk>/Frente4-k2.png` (+ `Renders/T4-Frentes-K2/`, script `renders-t4-k2-once.mjs`), y las fotos del kit azul se hacen SOLO con esos modelos de referencia (`fotos-k2-v3-once.mjs`).
- 2026-09-29: modelos Frente4-k2 completos (17 jugadores de campo, en R2 también). Fotos del kit azul rehechas con esos modelos → `-v3` (duplas k2, `nosotros/detalle-k2-v3`, `noticias/kits-t4-portada-v3`). Ivan_Cabj_La12 tiene `Frente4-campo.png` (look actual, kit titular de jugador, #12): convocatoria.html lo usa cuando está en un puesto ≠ GK (`campo:true` en PLAYERS). Los viejos `*4-kit-campo.png` (skin anterior) quedan solo en R2.
- Pendientes T4: imagen del slider de portada (`logos/Plantel T3 Uniforme.webp`, sigue con kit T3); pipeline de noticia diaria sigue usando `Renders/T3-Frentes` + `PLAYER_TRAITS` del plantel T3 (pausado por receso — actualizar a T4-Frentes y agregar a los nuevos al reactivarlo).
- Gotcha: con la lámina del kit con caras visibles, ChatGPT copió la cara del modelo del video (Lautavester7) → usar `KIT1-T4-referencia-sin-cara.png`. Looks renovados: adjuntar Frente3 + carta nueva y describir en texto qué cambió.

**How to apply:** si se retoma T4 (sitio, presentación, Kit 2), partir de estas decisiones sin volver a preguntarlas. Ver [[reference_cloudflare_y_r2]] para subir Renders/ a R2 (no van a git).
