---
name: arranque-temporada-vpn
description: "Checklist repetible para cuando arranca una temporada nueva de VPN o 11x11 (fixture, Worker, calendario, convocatoria, posiciones)"
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-03T21:15:48.311Z
---

Cuando el usuario pasa el link del fixture de VPN (`virtualpronetwork.com/web/app/team/28524/top-secret/fixtures`) y pide "lo que hacemos todas las temporadas", son estos pasos — verificados/ejecutados el 2026-08-03 para el arranque de T3 (Liga Argentina 2da División, season 10):

**1. Leer el fixture nuevo**
- La página es una SPA (Angular/mat-select) — WebFetch normal no sirve, hay que usar gstack browse.
- Al entrar pide elegir "Community" (combobox) → seleccionar "VPN Argentina" y Guardar antes de que cargue el fixture.
- El texto scrapeado da: ronda, rival, horario, local/visita, nombre de la liga (ej. "Liga Argentina 2da División - S10").

**2. Verificar/actualizar `top-secret-worker.js`**
- Los endpoints `/vpn-results`, `/vpn-fixtures` y `/vpn-table` tienen **hardcodeado** `LEAGUE_ID` (y `/vpn-table` además un `season=<id>` en la URL). Si el club cambió de división entre temporadas (pasó: 1ra↔2da), estos quedan apuntando a la liga/temporada vieja y los tres endpoints devuelven datos stale o vacíos — rompe calendario, convocatoria y posiciones sin ningún error visible.
- Para encontrar el `LEAGUE_ID`/`season id` correctos: `curl` directo a `https://www.virtualpronetwork.com/api/teams/28524/fixtures` y `.../results` (sin pasar por el Worker), leer `matchSeason.id_league`, `matchSeason.number` (número de temporada visible, ej. 10) y `matchSeason.id` (el id interno que usa `/vpn-table?season=<id>`).
- Actualizar los 3 lugares en el Worker y redesplegar (ver [[reference_cloudflare_y_r2]]). Verificar con curl directo a los 3 endpoints del Worker que ya devuelven datos correctos (fixtures count > 0, table trae los equipos de la liga correcta).

**3. Cargar el fixture en Firestore (NO en `RAW` de calendario.html)**
- `RAW` en `calendario.html` es el archivo **histórico** de temporadas ya finalizadas (T1, T2 quedaron ahí hardcodeados porque terminaron) — no es el mecanismo de arranque de temporada.
- El mecanismo correcto para partidos futuros es el array `custom` del doc Firestore `calendario/estado` (mismo campo que usa el botón "Agregar partido" del admin). Escribir vía Firestore REST API (`apiKey` público en el `firebaseConfig` de `calendario.html`, proyecto `top-secret-fc`) con `PATCH ...?updateMask.fieldPaths=custom`.
- Estructura de cada entrada: `{tipo:'partido', date, time, rival, league:'VPN', instancia:'', isHome}`.
- **Cuidado**: Firestore no mergea arrays — hay que leer el `custom` actual completo, decodificar el formato tipado de Firestore (`{stringValue:...}` etc.) correctamente (**ojo**: cada elemento del array es `{mapValue:{fields:{...}}}` — hay que desenvolver `.mapValue` antes de leer `.fields`, si no se pisan con `{}` los eventos viejos), agregar las entradas nuevas, y reescribir el array completo. Verificar con un GET después del PATCH que los eventos viejos siguen intactos.
- `convocatoria.html` NO necesita esto — su panel "partidos de hoy" (`getTodayMatches`) hace fetch directo a `/vpn-fixtures` del Worker y filtra por hoy, así que se arregla solo en cuanto el Worker (paso 2) está bien.

**4. Bug relacionado a vigilar: `customIsInRaw()` en calendario.html**
- Si el rival de un partido nuevo ya fue enfrentado en una temporada anterior (T1/T2) con resultado cargado, esta función lo marcaba como "ya cubierto por RAW" y lo ocultaba del calendario — sin importar que la fecha fuera de meses de diferencia. Se corrigió (2026-08-03) para que ese descarte solo aplique si el partido de `RAW` está a ≤14 días de la fecha del `custom` (cubre reprogramaciones reales, no rivales repetidos entre temporadas). Si vuelve a pasar que partidos nuevos "desaparecen" del grid mensual aunque estén en Firestore, revisar esta función primero.

**5. Verificar en vivo**
- `calendario.html`: el hero "HOY" y el grid mensual de "T3" deben mostrar los partidos.
- `convocatoria.html`: el panel de partidos de hoy debe mostrarlos también (vía `/vpn-fixtures`).
- GitHub Pages tarda unos minutos en propagar (`Cache-Control: max-age=600` en la CDN) — para confirmar que el push ya está en el repo sin esperar el cache, comparar contra `raw.githubusercontent.com/enohcaid/top-secret/main/<archivo>` que no tiene ese cache.

**6. Carga de resultados** — sigue el flujo normal ya documentado: [[report-workflow-t2]] (reportes en `reportes/`, Claude los lee y agrega a `SEED_MATCHES`). Tanto las entradas `RAW` como las `custom` resuelven el resultado automáticamente cruzando por fecha+rival+liga contra `SEED_MATCHES` una vez que el partido se juega — no hace falta cargar el resultado a mano en el calendario.

**7. Placa de fixture para redes + noticia** (pedido explícito del usuario, no automático)
- El usuario pide primero una "planilla" con los 19 rivales y sus escudos, y después que se la pase a ChatGPT para armar la placa gráfica. Proceso que funcionó:
  1. Descargar los escudos reales de cada rival desde el campo `badge` que devuelve `/vpn-fixtures` (URLs `virtualpronetwork.com/api/media/images/teamlogos/...`).
  2. Armar dos imágenes de referencia con HTML + gstack browse (`goto file:///...` + `screenshot --viewport`): una "planilla" tipo tabla (ronda/fecha/hora/escudo/rival/local-visita) y una "hoja de escudos" grande (grid con cada escudo en ~80px + nombre) — esta segunda es la que más ayuda a que ChatGPT no invente escudos.
  3. Usar `logos/Fixture VPN.webp` (o el fixture de la temporada anterior que exista) como referencia de estilo/layout — ChatGPT lo replica fielmente si se le pide "reproduce exactamente el mismo estilo".
  4. Conectar por CDP a `localhost:9222` (Chrome del pipeline diario ya suele estar abierto y logueado) igual que `scripts/generate-image-chatgpt.mjs`: iN`chromium.connectOverCDP`, ir a `PROJECT_URL` del proyecto "TOP Secret FC", adjuntar (`input[type=file]`) escudo del club + logo de VPN recortado + planilla + hoja de escudos + referencia de temporada anterior, pegar el prompt vía portapapeles (no escribir directo, rompe saltos de línea) y click en el botón de enviar (nunca Enter). El script standalone debe copiarse a `scripts/` del repo (no a un tmpdir fuera del proyecto) para que Node resuelva `node_modules/playwright` — borrar el script temporal después, no commitearlo.
  5. Pedirle a ChatGPT explícitamente que NO invente rivales/escudos y que use exactamente los adjuntos — aun así conviene revisar visualmente el resultado.
  6. Iterar en el MISMO chat (reusar la pestaña, no `freshChat`) para correcciones — mucho más rápido que regenerar de cero. Ejemplo real: el primer intento repetía el escudo del club en cada una de las 19 filas + una fila de escudos como marca de agua abajo — el usuario pidió sacar esa repetición ("solo listá los rivales"), se mandó una corrección en el mismo chat y salió bien.
- El usuario después revisa y sube la imagen final a mano a `logos/` (no asumir que el archivo que bajó el script es el definitivo — puede haber una vuelta más de edición manual antes de subirla).
- Una vez que la imagen está en `logos/`, crear la noticia siguiendo el checklist estándar de "New manual news article" en CLAUDE.md: entrada en `NOTICIAS` (noticias-data.js) + entrada en `NOTICIAS_OG` (top-secret-worker.js) + redeploy del Worker + commit. El fixture anterior (T2) en `noticias-data.js` (id `fixture-vpn-t2-2026`) es la plantilla de tono/estructura a copiar.

**8. Mismo proceso para 11x11 (torneo "CHALLENGERS #N" en virtualprogaming.com)** — hecho el 2026-08-03 para CHALLENGERS #4 (Zona 1, 10 equipos, 18 partidos ida/vuelta):
- El usuario pasa el link `virtualprogaming.com/tournament/CHALLENGERS-T{n}/groups` (usa mayúsculas en el slug, ojo — `challengers-t4` en minúscula da 404). Es una SPA, hace falta gstack browse; mirar el network log (`$B network`) para encontrar la URL real de la API en vez de adivinar — el endpoint de grupos es `api.virtualprogaming.com/public/tournaments/CHALLENGERS-T{n}/groups/?season=1`.
- El fixture NO sale de esa misma llamada — hay una pestaña "matches" aparte; su API es `.../tournaments/CHALLENGERS-T{n}/matches/?match_status=scheduled&season=1&limit=30&offset=0`, paginada de a 30 (mirar el campo `count` de la respuesta y pedir más `offset` hasta cubrirlo). `match_status` solo acepta `scheduled|in_progress|disputed|complete` (probar valores tipo "upcoming" da 400 con la lista válida en el error).
- Fechas vienen en UTC — convertir a ART restando 3 horas antes de guardar (mismo criterio que el resto del sitio).
- `E11_T3_BADGES` (en `calendario.html` Y `convocatoria.html`, hay que mantener las dos copias sincronizadas) es un mapa fijo por nombre de rival — agregar ahí los equipos nuevos sin tocar los viejos (quedan para partidos históricos ya jugados). El campo `team_logo` de la API de grupos es el id que va en `VPG_LOGO + id + '/public'`.
- El fixture nuevo va a Firestore `custom` con `league:'11x11'`, mismo mecanismo que VPN (ver punto 3). `E11_T3_SCHEDULE` en convocatoria.html es el fixture VIEJO ya jugado (como `RAW`) — no tocar, el panel de "hoy" ya lee de `calCustom` directo así que no hace falta duplicar ahí.
- Si el grupo tiene un equipo tipo "Interzonal A/B" (bye/comodín), tratarlo como rival normal — la API lo devuelve como partido programado real, no asumir que es walkover sin confirmar con el resultado real cuando se juegue.

**9. `posiciones.html` — pestaña T3 (tablas en vivo) es un build aparte, no asumir que ya existe**
- Después de que se desactivó la pretemporada, la sección `#s-t3` había quedado como un placeholder "Próximamente" vacío — sin tabs, sin tablas, para las tres ligas. No se arma sola con los fixes de Worker/Firestore de los puntos anteriores.
- Si el usuario pide construirla: copiar el patrón exacto de `#s-t2` (tabs VPN/VPUG/11x11, mismo HTML, mismos ids con prefijo `t3-` en vez de `t2-`). `switchSeason`/`switchTab` ya son genéricos por prefijo de season, no hace falta tocarlos.
- 11x11 T3 usa `normE11` + fetch a `E11_GROUPS_URL_T3` (2 grupos, mismo array-de-2-arrays que T2) — reusable tal cual.
- VPN T3 reusa `VPN_URL`/`normVPN` (el mismo endpoint que ya se corrigió en el punto 2).
- **Bug real que salió de este build**: el endpoint `/vpn-table` del Worker es UNO SOLO — antes lo usaban tanto la pestaña T2 (temporada finalizada, debía mostrar la tabla final congelada) como la nueva T3. Al apuntar `/vpn-table` a la temporada actual (punto 2), la pestaña T2 empezó a mostrar en vivo los datos de T3. Fix: temporadas finalizadas (T1 y ahora T2) NO deben depender de fetch en vivo — hay que hardcodear su tabla final como array estático (`VPN_T2_DATA`, mismo patrón que `VPN_T1_DATA`) y dejar el fetch en vivo (`VPN_URL`) exclusivamente para la pestaña de la temporada en curso. Revisar esto cada vez que se reutilice un endpoint del Worker entre una temporada vieja y una nueva.
- Si VPUG no tiene fuente de datos en vivo confirmada para la temporada nueva (pasó en T3: `/vpug-table` seguía devolviendo el evento viejo de CopaFacil, `-fthh5@pg59`, con partidos jugados de T2), no inventar/reusar ese endpoint viejo — dejar placeholder "Próximamente" en esa pestaña específica hasta tener el event key nuevo confirmado.
