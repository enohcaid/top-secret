---
name: feedback_kv_viejo_publicaciones_repetidas
description: 2026-11-26 la noticia del día y la de FC 27 salieron repetidas (hasta 5 veces en IG) porque el KV de Cloudflare devolvía el estado viejo; publicar.mjs ahora manda según un registro local (scripts/.publicadas.json)
metadata:
  type: feedback
---

**Qué pasó (2026-11-26):** `watch-regen.ps1` corre `scripts/social/publicar.mjs` cada minuto. Cada corrida decide qué falta leyendo `aprobaciones` del KV de Cloudflare, que puede devolver el valor anterior hasta unos 60 s después de una escritura. La corrida siguiente veía como pendiente una pieza recién publicada y la volvía a publicar: la noticia del día salió 4 veces en Instagram (más FB, X e historias) y la de FC 27 5 veces en Instagram, 3 en FB y X, 2 en TikTok y 4 historias. El candado `.publicar.lock` solo evita dos corridas simultáneas, no corridas seguidas.

**Arreglo:** registro local `scripts/.publicadas.json` (gitignored, un mes), clave `lote|pieza|republicarEn`. Se escribe "publicando" antes y "publicado" después de publicar; si dice publicado (o tomado hace menos de 15 min) no se publica, diga lo que diga el KV, y se le vuelve a escribir el estado al KV. Errores de IG/FB liberan la pieza para el reintento; los de X/TikTok/YouTube quedan tomados (pueden haber salido).

**Regla:** nunca decidir "ya se publicó o no" solo con el KV (es eventualmente consistente). Todo lo que publica corre en esta PC: el archivo local manda.
