---
name: reskin-equipos-11x11-vpug
description: "Equipos de 11x11/VPUG a veces cambian de nombre/escudo (reskin) a mitad de temporada sin que el codigo del sitio se entere; el usuario es la fuente de verdad final sobre el nombre actual del rival, no calendario.html/convocatoria.html"
metadata:
  type: feedback
  modified: 2026-08-25T22:38:17.866Z
---

Al editar el video "Formación Titular 11x11" (2026-08-25, ver [[canva-video-formacion-titular]]) para el fixture del día, usé el rival "Olimpo Esports" tal cual figura en `E11_T3_SCHEDULE` (calendario.html/convocatoria.html) para la fecha 14. El usuario corrigió a mitad de la edición: "olimpo ya no es olimpo, es Suda eSports" — el equipo rival se re-skineó (cambió de nombre/escudo en el juego) y el código hardcodeado del sitio quedó desactualizado, igual que el caso ya documentado en `seed_matches.js` línea ~2299 ("Interzonal A ... rival reskineado como All Boys/New Zealand Football en el reporte").

**Cómo aplicar:** cuando el usuario corrige el nombre de un rival de 11x11/VPUG que yo tomé de `E11_T3_SCHEDULE`/`VPUG_T*_SCHEDULE` o de cualquier archivo del repo, no cuestionar ni tratar de conciliar con la fuente vieja — aplicar el cambio directamente (texto + escudo) y, si ya existe un asset de ese equipo subido/usado antes en el mismo documento Canva, reusarlo en vez de subir uno nuevo. Estos reskins no se reflejan solos en el código del sitio; si el patrón se repite, considerar avisar que `E11_T3_SCHEDULE`/`VPUG_T*_BADGES` en calendario.html y convocatoria.html podrían necesitar actualizarse también (no lo hice esta vez porque el pedido puntual era solo el video).
