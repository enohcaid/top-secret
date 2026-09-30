---
name: cloudflare-y-r2
description: Cómo desplegar el Worker y manejar el bucket R2 sin wrangler — credenciales en .env, scripts deploy-worker.mjs y r2.mjs
metadata:
  type: reference
---

**Credenciales**: nunca en el código (el repo es público). Viven en `.env` (raíz del repo, gitignored; plantilla en `.env.example`) o en variables de entorno / secretos de GitHub:

| Variable | Qué es |
|---|---|
| `CF_EMAIL`, `CF_API_KEY` | Global API Key de la cuenta Cloudflare (deploy del Worker, API de cuenta) |
| `CF_ACCOUNT_ID` | Cuenta Cloudflare |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Token S3 limitado al bucket `top-secret-media` (lectura/escritura de objetos) |
| `R2_BUCKET` | `top-secret-media` |
| `KV_NAMESPACE_ID` | Namespace KV `top-secret-data`, bindeado como `TS_KV` |

Historia: hasta 2026-09-29 las claves R2 estaban escritas en `generate-image-chatgpt.mjs`, `watch-regen.ps1` y `migrate-images-to-r2-once.mjs` (públicas en GitHub). Se reemplazaron por un token nuevo limitado al bucket, todo lee de `.env` y el token viejo quedó revocado (era un token de cuenta: `DELETE /accounts/<acct>/tokens/<id>`).

**Deploy del Worker** (`top-secret-proxy`): `node scripts/deploy-worker.mjs`. También lo corre la GitHub Action `.github/workflows/deploy-worker.yml` al pushear cambios de `top-secret-worker.js` (si están cargados los secretos del repo).
- El deploy DEBE declarar los bindings KV `TS_KV` y R2 `MEDIA_BUCKET`, y `keep_bindings: ["secret_text"]` para conservar los secretos del Worker (`ADMIN_PIN`, etc.). Incidente 2026-09-28: un deploy sin el binding R2 dejó `/media/*` en 500 y todas las imágenes del sitio rotas. El script ya lo hace bien y verifica `/media` al final.
- Si alguna vez se pierde un binding sin redeploy: `PATCH .../workers/scripts/top-secret-proxy/settings` con los secretos como `{"type":"inherit","name":"..."}`.
- El cron (`scheduled()`, cada minuto) se registra aparte: `PUT .../workers/scripts/top-secret-proxy/schedules` con body array `[{"cron":"* * * * *"}]`.

**R2** (`node scripts/r2.mjs`): `ls`, `put`, `get`, `sync-up`, `sync-down` (ver cabecera del script).
- El Worker sirve el bucket en `GET /media/<key>` con `Cache-Control: immutable, max-age=1y` → al reemplazar una imagen con el mismo nombre, los navegadores siguen mostrando la vieja: subir con nombre nuevo (`-v2`, `-v3`) o subir el `?v=` (`RENDER_V`).
- `logos/...` y `Renders/...` usan la misma ruta que en el repo. Originales de trabajo que no se publican: `_fuentes/` (el Worker devuelve 404 para ese prefijo). Hoy: `_fuentes/fotos/T3`, `_fuentes/fotos/T4` (capturas, cartas, láminas de kits).
- Desde cualquier PC: `node scripts/r2.mjs sync-down _fuentes/fotos fuentes/fotos` baja las referencias; los scripts las encuentran vía `FOTOS_DIR` (`scripts/lib/env.mjs`).

**Historial de git limpiado (2026-09-29):** se sacaron de todos los commits `Renders/`, `logos/`, `node_modules/`, `reportes/` (el repo pasó de ~1 GB a ~20 MB; se reescribieron los hashes de commits anteriores). Copia completa del historial viejo, con todas las ramas: `_fuentes/backup/top-secret-historial-2026-09-29.bundle` en R2 (1,1 GB). Para recuperar algo: `node scripts/r2.mjs get _fuentes/backup/top-secret-historial-2026-09-29.bundle fuentes/backup/historial.bundle` y `git clone fuentes/backup/historial.bundle viejo`. **Nunca volver a commitear imágenes**: van a R2 (`logos/*` y `Renders/*` están en `.gitignore`).
