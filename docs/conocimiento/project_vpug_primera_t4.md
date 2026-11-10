---
name: project_vpug_primera_t4
description: VPUG T4 = Primera División en la web propia de la liga (vpug-liga.onrender.com, dejó CopáFácil); API, qué es público, ids y dónde está cableado
metadata:
  type: project
---

Desde 2026-11-10 VPUG tiene web propia: **https://vpug-liga.onrender.com** (React; API `https://vpug-liga-api.onrender.com/v1`). Ya no usa CopáFácil → el checklist "Nueva temporada/torneo de CopáFácil" del CLAUDE.md **no aplica más a VPUG** (sirve solo para la historia T2–pretemporada).

**Torneo:** "2026 · Temporada 1" (temporadaId **7**), TOP Secret = club **107** en **Primera** (divisionId **1**): 18 equipos, 17 fechas, todas a las 22:30 ART, lun–jue, del 10/11 al 08/12/2026. Formato que da `/tabla`: 1°–8° playoff, últimos 3 descienden. A diferencia de CopáFácil, **cada partido trae `fechaHora` real** (UTC) y `aplazado`.

**API:**
- Públicas (sin token): `/temporadas`, `/divisiones`, `/tabla?temporadaId=&divisionId=`, `/actividad`.
- Con token (sesión de usuario): `/partidos?temporadaId=&divisionId=` (fixture por jornada, con goles cuando se juega), `/partidos/{id}`, `/clubes/{id}`, `/eliminatorias?...`.
- Sin CORS para topsecret.ar → todo lo que use el sitio pasa por el Worker.
- Nombres de club = los de EA, cortados a 15 caracteres ("Arg de Merlo eS"). Escudos en Supabase (`nkqjsmxxmrodientlnlh.supabase.co`, agregado a `FETCH_ALLOWED_DOMAINS` del `/img-proxy`).

**Token:** Juan inició sesión con su cuenta en el Chrome del pipeline (CDP 9222, `scripts/.chrome-profile/`); el token queda en el `localStorage` de `vpug-liga.onrender.com` (clave `token`). Para re-bajar el fixture (reprogramaciones, `aplazado`) leerlo de ahí con Playwright `connectOverCDP`; **no guardarlo en archivos ni en `.env`**.

**Cableado:**
- `calendario.html` RAW: bloque `// ══ VPUG T4 — Primera División VPUG ══` (17 filas, `round:N`); escudos en `VPUG_T4_BADGES`. Espejado en `VPUG_T4_SCHEDULE`/`VPUG_T4_BADGES` de `convocatoria.html` (mismos arrays que la pretemporada → Convocar, `scripts/social/lib/datos.mjs` y el Worker, que lee RAW del calendario publicado, lo toman solos).
- Nombres de rival: los de la liga verbatim, salvo clubes ya jugados con otro nombre: Argentino de Merlo, San Miguel eSports, Belgrano eSports, United Mito (comentado en cada fila).
- Worker `GET /vpug-table-primera` → `{temporada, division, jornadasJugadas, jornadasTotales, teams:[{pos,name,logo,zona,gp,w,d,l,gf,gc,gd,pts}]}`; busca la división de TOP Secret, timeout 25 s (onrender despierta lento) y si falla devuelve la última buena de KV `vpug_primera_tabla`.
- Lo usan: `posiciones.html` (T4 → VPUG, arriba la Primera; abajo la pretemporada como historial), la tarjeta VPUG del inicio (`index-home.js`) y `scripts/noticia-diaria.mjs`.
