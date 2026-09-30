---
name: img-proxy-whitelist-vpug
description: "El endpoint /img-proxy del Worker tiene whitelist de dominios — si un escudo no carga al compartir, sospechar esto primero"
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-11T14:38:11.437Z
---

`calendario.html` → `shareMatchday()` captura la tarjeta "HOY" con html2canvas, pasando cada escudo de rival por `/img-proxy?url=...` (Worker) para evitar que el canvas quede "tainted" por CORS. Ese endpoint solo sirve dominios listados en `FETCH_ALLOWED_DOMAINS` (top-secret-worker.js) — si el dominio del escudo no está ahí, devuelve 403 y el escudo queda en blanco en la imagen compartida, sin error visible en la UI.

**Bug real (2026-08-11):** 15 de los 17 escudos de `VPUG_T3_BADGES` usan `copafacil-storage.b-cdn.net`, que NO estaba en la whitelist (solo `firebasestorage.googleapis.com`, usado por 2 de los 17). Por eso "compartir partidos de hoy" mostraba el escudo de VPN/11x11 bien (sus CDNs sí estaban permitidos) pero el de VPUG casi siempre en blanco. Fix: agregar `copafacil-storage.b-cdn.net` a `FETCH_ALLOWED_DOMAINS` + redeploy del Worker (ver [[reference_cloudflare_y_r2]]).

**Cómo aplicar:** si en el futuro se agrega un rival/liga nueva cuyo escudo venga de un CDN distinto (CopáFácil a veces mezcla `copafacil-storage.b-cdn.net` y `firebasestorage.googleapis.com` entre equipos de un mismo torneo, sin patrón claro), y "compartir" no muestra ese escudo puntual mientras el resto sí — revisar primero `FETCH_ALLOWED_DOMAINS` en `top-secret-worker.js` antes de asumir que es un problema de la imagen en sí. Se puede probar el proxy directo: `curl -sI "https://top-secret-proxy.juan-c-m-1985.workers.dev/img-proxy?url=<URL encodeURIComponent>"` — 403 "Domain not allowed" confirma el diagnóstico.
