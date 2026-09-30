---
name: vpug-t6-temporada-regular
description: "Estado del fixture de la temporada regular VPUG T6 (Primera División) cargado en el sitio — fechas proyectadas, no confirmadas partido a partido"
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-09T18:52:23.532Z
---

Se integró al sitio el fixture de "#1 Primera División VPUG (T6)" (CopáFácil `-fthh5@7zxj`), que arrancó 2026-08-10. 18 equipos, ida única, 17 fechas. TOP Secret juega: F1 visita Nueva Chicago, F2 local Deportivo Moron, F3 visita Real MarcianoFC, F4 local InfinitX, F5 visita Germinal, F6 local Argentino de Merlo, F7 visita Hacha, F8 visita Olimpo, F9 local Ysh FC, F10 visita IACC Cantera, F11 local Atlético Moneiro, F12 visita 4BDOMIFL4NES, F13 local United Mito, F14 visita All Boys eSp, F15 local Temperley, F16 visita San Miguel, F17 local Colon SL.

**Las fechas de calendario (2026-08-10 → 2026-09-07) son PROYECTADAS, no confirmadas.** CopáFácil/Firebase no guarda fecha ni horario por partido, solo el orden de fechas (ver [[reference_copafacil_api.md]]). El usuario confirmó el patrón semanal ("lunes a jueves 22:30, 1 partido por día") pero no las 17 fechas exactas — se proyectaron mecánicamente sin fines de semana, arrancando en la fecha de inicio real del torneo (`d_i` de Firebase).

**Por qué importa:** si el organizador reprograma o inserta una fecha libre (como pasó en la pretemporada — ver el checklist de reprogramación en CLAUDE.md), las fechas en `calendario.html` (`RAW`), `convocatoria.html` (`VPUG_T3_SCHEDULE`) y potencialmente el standing en vivo (`/vpug-table-t3`) quedan desalineadas. Antes de confiar en una fecha específica de este fixture para coordinar algo (convocatoria, aviso a jugadores), verificar contra CopáFácil o preguntarle al usuario si esa fecha puntual se mantuvo.

**Cómo aplicar:** al confirmarse cada resultado real, actualizar `result` en el `RAW` de `calendario.html` igual que se hizo con temporadas anteriores (T2, Pretemporada) — y si una fecha se corrió, corregir el `date` en ambos archivos (`calendario.html` + `convocatoria.html`, están espejados a propósito).
