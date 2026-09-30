# Trabajar en Top Secret FC desde cualquier PC

Todo el proyecto vive en línea: el código en GitHub (`enohcaid/top-secret`), las imágenes y los originales en Cloudflare R2, los datos en Firestore y la API en el Worker de Cloudflare. La PC principal (drygan, `D:\proyectos\top-secret`) sigue funcionando exactamente igual que antes; esto agrega la opción de trabajar desde otro lado.

## Opción A — Claude Code instalado en otra PC (recomendado, todo funciona)

1. Instalar **Git**, **Node.js 22+** y **Claude Code**.
2. Clonar y preparar:
   ```bash
   git clone https://github.com/enohcaid/top-secret.git
   cd top-secret
   npm install
   ```
3. Credenciales: copiar `.env.example` a `.env` y completar los valores (están en el `.env` de drygan). El `.env` nunca se sube a git.
4. Si vas a generar imágenes, bajar las referencias (capturas, cartas, láminas de kits) y los originales que haga falta:
   ```bash
   node scripts/r2.mjs sync-down _fuentes/fotos fuentes/fotos   # ~70 MB, referencias para renders
   node scripts/r2.mjs sync-down Renders/Ivan_Cabj_La12          # ejemplo: los renders de un jugador
   node scripts/r2.mjs sync-down logos/rebrand                   # ejemplo: escudos en alta
   ```
   (Todo `logos/` y `Renders/` pesa ~1 GB: bajar solo lo que se use.)
5. Abrir Claude Code en la carpeta. Lee `CLAUDE.md` y `docs/conocimiento/README.md` (lo que antes estaba solo en la memoria de drygan).

### Generar imágenes con ChatGPT
Los generadores manejan un Chrome con la sesión de ChatGPT abierta:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\abrir-chrome-chatgpt.ps1
```
La primera vez en esa PC hay que iniciar sesión en ChatGPT en la ventana que se abre (queda guardada en `scripts/.chrome-profile/`, que no se sube). Después, los scripts `scripts/*-once.mjs` y `generate-image-chatgpt.mjs` funcionan igual que en drygan.

### Publicar
- Sitio: `git push` a `main` (GitHub Pages publica solo).
- Imágenes: `node scripts/r2.mjs put <archivo>` o `sync-up <carpeta>`.
- Worker: `node scripts/deploy-worker.mjs`, o solo pushear el cambio de `top-secret-worker.js` si están cargados los secretos de la GitHub Action.

## Opción B — Claude Code en el navegador (claude.ai/code), sin instalar nada

Sirve para editar el sitio, cargar noticias, resultados, fixture, etc. Al abrir una sesión sobre el repo `enohcaid/top-secret`, cargar en la configuración del entorno las mismas variables del `.env` (`CF_*`, `R2_*`, `KV_NAMESPACE_ID`) para poder subir imágenes y desplegar.

Limitación: **no puede generar imágenes con ChatGPT** (necesita el Chrome local con la sesión). Para eso, usar la opción A o drygan.

## Qué sigue siendo solo de drygan
- Las tareas programadas de Windows del pipeline diario (imágenes, watch-regen, clips de Twitch) — hoy pausadas por el receso.
- El perfil de Chrome ya logueado en ChatGPT (en otra PC se crea uno nuevo con el paso de arriba).

## Secretos de la GitHub Action (una sola vez)
En GitHub → repo `top-secret` → Settings → Secrets and variables → Actions → *New repository secret*, crear: `CF_EMAIL`, `CF_API_KEY`, `CF_ACCOUNT_ID`, `KV_NAMESPACE_ID` (mismos valores del `.env`). Con eso, cada push que cambie `top-secret-worker.js` despliega el Worker solo.
