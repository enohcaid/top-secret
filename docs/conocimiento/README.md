# Conocimiento del proyecto

Notas acumuladas trabajando con Claude Code (antes vivían solo en la memoria local de una PC). Cualquier sesión, en cualquier PC, debería leer este índice antes de trabajar y abrir las notas que apliquen a la tarea.

Formato: cada nota tiene *frontmatter* (`name`, `description`, `type`) y los links `[[nombre]]` apuntan a otras notas de esta carpeta. Al aprender algo nuevo y duradero sobre el proyecto, sumarlo acá (y al índice) en vez de solo a la memoria local.

## Reglas y preferencias (cómo trabajar)

- [feedback_11x11_two_schedule_sources](feedback_11x11_two_schedule_sources.md) — 11x11 (and other) fixture dates in top-secret live in TWO separate places that must both be edited to actually change what the site shows
- [feedback_always_push](feedback_always_push.md) — User wants every git commit in top-secret pushed to main immediately, no confirmation needed
- [feedback_alwayspresent_lo_pone_el_jugador](feedback_alwayspresent_lo_pone_el_jugador.md) — alwaysPresent ("fijo") en convocatoria nunca se marca automáticamente al promover/agregar un jugador — lo tiene que activar el jugador mismo
- [feedback_arranque_temporada_vpn](feedback_arranque_temporada_vpn.md) — Checklist repetible para cuando arranca una temporada nueva de VPN o 11x11 (fixture, Worker, calendario, convocatoria, posiciones)
- [feedback_auto_noticias_cutoff](feedback_auto_noticias_cutoff.md) — auto-noticias.js ya no genera noticias de resultados para T3 en adelante (AUTO_NEWS_CUTOFF) — evita duplicar los artículos reales del pipeline diario
- [feedback_baja_jugador_limpiar_firestore](feedback_baja_jugador_limpiar_firestore.md) — Al dar de baja un jugador de convocatoria.html/roster.js hay que limpiar también 3 lugares en Firestore o el nombre reaparece con carga demorada
- [feedback_chatgpt_stuck_send_button](feedback_chatgpt_stuck_send_button.md) — generate-image-chatgpt.mjs a veces "envía" un mensaje de corrección que en realidad queda escrito sin enviar en el composer de ChatGPT, y el script espera igual los 25 min completos sin que nada pase
- [feedback_commit_changes](feedback_commit_changes.md) — Siempre commitear cambios de código automáticamente al hacerlos, sin esperar que el usuario lo pida
- [feedback_crespo_is_juan_martinez](feedback_crespo_is_juan_martinez.md) — "Crespo" en reportes es un bug del juego, NO corresponde a Juan_Martinez4
- [feedback_diseno_sitio_limpio](feedback_diseno_sitio_limpio.md) — Dirección de diseño del sitio Top Secret FC desde el rediseño 2026-09-28 — oscuro limpio estilo editorial, nav superior agrupada, sin barras laterales ni burbujas
- [feedback_ficha_agente_posicion_inventada](feedback_ficha_agente_posicion_inventada.md) — el estilo EXPEDIENTE_FICHA (ficha de agente) de generate-image-chatgpt.mjs inventa el campo POSICION si el brief no lo especifica explicitamente
- [feedback_filename_collision_2_noticias_mismo_dia](feedback_filename_collision_2_noticias_mismo_dia.md) — generateImage() nombraba las imagenes solo por fecha — 2 noticias el mismo dia pisaban las imagenes entre si
- [feedback_gamertags_noticias](feedback_gamertags_noticias.md) — En noticias y artículos siempre usar el gamertag exacto, nunca abreviaciones ni nombres reales
- [feedback_gamertags_verbatim](feedback_gamertags_verbatim.md) — Gamertags de jugadores deben usarse verbatim — no cambiar mayúsculas ni formato aunque el usuario los escriba en minúsculas o de forma casual
- [feedback_grillas_referencia_simetricas](feedback_grillas_referencia_simetricas.md) — Al armar planillas/grillas HTML de referencia para que ChatGPT genere una placa, organizarlas simétricamente
- [feedback_imagenes_noticias_diarias](feedback_imagenes_noticias_diarias.md) — Criterios de calidad para las imágenes diarias de noticias de Top Secret FC (post + story)
- [feedback_img_proxy_whitelist](feedback_img_proxy_whitelist.md) — El endpoint /img-proxy del Worker tiene whitelist de dominios — si un escudo no carga al compartir, sospechar esto primero
- [feedback_instagram_post_size](feedback_instagram_post_size.md) — The "Instagram post" size for Top Secret FC graphics is 4:5 portrait (~1086x1448), not 1:1 square
- [feedback_kit_sponsor_aia_nike](feedback_kit_sponsor_aia_nike.md) — El sponsor AIA y el swoosh de Nike SI forman parte del kit real del club — nunca instruir al generador de imagenes que los quite
- [feedback_league_naming_news](feedback_league_naming_news.md) — News writing style: leagues get short names only (VPN/VPUG/11x11, no season suffixes), and the club is always the grammatical subject
- [feedback_nombres_en_reportes](feedback_nombres_en_reportes.md) — Tabla de alias — nombres que muestran los reportes de partido (EA FC) que no coinciden con el gamertag real del jugador
- [feedback_musica_trap](feedback_musica_trap.md) — Regla: la música de las publicaciones es trap libre de derechos; biblioteca en R2
- [feedback_no_achicar_fuente_para_encajar](feedback_no_achicar_fuente_para_encajar.md) — Cuando un texto nuevo (rival largo, etc.) no entra en el tamaño de fuente original de un elemento (Canva u otros editores), NUNCA achicar el font_size para que entre — escribir el texto al tamaño original y centrar/ajustar el recuadro (box) en su lugar
- [feedback_no_copiar_brief_textual](feedback_no_copiar_brief_textual.md) — When the user dictates a detailed brief/explanation for content, treat it as raw material to transform — not text to trim and paste as final copy
- [feedback_noticias_expediente_digital](feedback_noticias_expediente_digital.md) — Desde 2026-09-29 las noticias de Top Secret abandonan la estética de fichero/expediente de papel; noticias.html es un "expediente de computadora" limpio y gráfico
- [feedback_noticias_og_map](feedback_noticias_og_map.md) — Every new article must also be added to NOTICIAS_OG in the Worker and redeployed
- [feedback_plataforma_jugadores_fuente](feedback_plataforma_jugadores_fuente.md) — Para plataforma (PS/PC/Xbox) y nacionalidad de jugadores, la Lista de Buena Fe de VPN es más confiable que las capturas del lobby del juego
- [feedback_push_images](feedback_push_images.md) — Siempre pushear imágenes al repo cuando el usuario las sube o cuando el JS las referencia
- [feedback_render_review](feedback_render_review.md) — Antes de commitear renders nuevos, revisar cada imagen visualmente y convertir JPEG a PNG
- [feedback_report_workflow](feedback_report_workflow.md) — How the user delivers new match reports and how to process them (images historically, video from T3 onward)
- [feedback_publicaciones_con_musica](feedback_publicaciones_con_musica.md) — Regla: toda publicación en redes va con música; IG/FB con música solo manual desde la app
- [feedback_reskin_equipos_11x11](feedback_reskin_equipos_11x11.md) — Equipos de 11x11/VPUG a veces cambian de nombre/escudo (reskin) a mitad de temporada sin que el codigo del sitio se entere; el usuario es la fuente de verdad final sobre el nombre actual del rival, no calendario.html/convocatoria.html
- [feedback_rosters_hardcodeados_desactualizados](feedback_rosters_hardcodeados_desactualizados.md) — El sitio tiene varias listas de gamertags hardcodeadas e independientes que se desactualizan cuando cambia el plantel — revisar todas al arrancar temporada o agregar/dar de baja jugadores
- [feedback_sin_verificacion_calidad_imagenes](feedback_sin_verificacion_calidad_imagenes.md) — generate-image-chatgpt.mjs ya no evalúa con ChatGPT Vision ni reintenta por formato en el flujo default — un solo intento por imagen, revisión humana en el preview de publicación
- [feedback_triage_antes_de_debug_profundo](feedback_triage_antes_de_debug_profundo.md) — Antes de multiplicar hipótesis debugueando un fallo que puede ser externo (no de este lado), hacer 2-3 chequeos mínimos de triage primero
- [feedback_video_formacion_fixture_block](feedback_video_formacion_fixture_block.md) — Los videos 'Formación Titular' llevan el partido de VPUG del día en el bloque de fixture — pero la copia grande y la copia chica del bloque NO tienen por qué mostrar las mismas filas: eso es el formato real, no un bug

## Estado y decisiones del proyecto

- [project_baja_cat_fel_ltemp_prep_t4](project_baja_cat_fel_ltemp_prep_t4.md) — CAT_FEL y lTemp30148 dejaron el club (2026-09-08); prep de Temporada 4 en plantilla.html/roster.js queda pendiente, el usuario pidió posponerla
- [project_bot_amistosos](project_bot_amistosos.md) — Bot de amistosos sobre el WhatsApp personal de Juan (grupo Amistosos VPN), semi-automático, carga los confirmados en el calendario
- [project_chequeo_nocturno_reportes](project_chequeo_nocturno_reportes.md) — Runbook manual para cargar reportes de partido (YouTube) en seed_matches.js — la rutina cloud automática quedó DESHABILITADA, hacerlo a mano cuando el usuario lo pida
- [project_convocatoria_resets_2026_08_12](project_convocatoria_resets_2026_08_12.md) — convocatoria.html — incidente "se resetean los estados todo el tiempo" (2026-08-12), causas encontradas y fixeadas, qué revisar si vuelve a pasar. Incluye recurrencia 2026-08-19: alwaysPresent/captain/lineup vaciados en producción
- [project_t4_renders_kit](project_t4_renders_kit.md) — Renders de plantel Temporada 4 (Frente4/Brazos4/Pose4) con Kit 1 negro/dorado y escudo Clean logo Dorado — decisiones del usuario y pendientes
- [project_topsecret_receso_pausa_tareas](project_topsecret_receso_pausa_tareas.md) — Top Secret FC daily automation paused 2026-09-15 for off-season recess — resume when the user says so
- [project_topsecret_tarea_duplicada_09_30](project_topsecret_tarea_duplicada_09_30.md) — Tarea de Task Scheduler duplicada (09:30) causaba fallas silenciosas del pipeline de imágenes diarias; deshabilitada el 2026-08-10
- [project_topsecret_tareas_imagenes](project_topsecret_tareas_imagenes.md) — Las tareas diarias de imágenes (09:30/09:35) solo corren con sesión iniciada; regen-once.ps1 es la recuperación manual; ChatGPT muy lento de noche
- [project_twitch_clips_extraccion](project_twitch_clips_extraccion.md) — Pipeline de extraccion de clips destacados desde VODs de Twitch (cabers1414/cacc_esport/topsecretfc) y tarea programada asociada
- [project_vpug_t6_temporada_regular](project_vpug_t6_temporada_regular.md) — Estado del fixture de la temporada regular VPUG T6 (Primera División) cargado en el sitio — fechas proyectadas, no confirmadas partido a partido
- [project_youtube_canal_oficial_tsfc](project_youtube_canal_oficial_tsfc.md) — Top Secret FC lanzó su canal oficial de YouTube (@TOPSecretFC) el 2026-08-09 — contenido de video del club, reportes de partido incluidos

## Referencias técnicas

- [reference_calendario_dead_code](reference_calendario_dead_code.md) — calendario.html tiene funciones de renderizado muertas (nunca invocadas) que pueden confundir — dónde está el widget "HOY" real
- [reference_canva_imagen_a_video](reference_canva_imagen_a_video.md) — Automatización de "Imagen a video" de Canva (videos de 5 s desde una imagen) con scripts/canva-imagen-a-video.mjs vía el Chrome CDP
- [reference_canva_resumen_semanal](reference_canva_resumen_semanal.md) — Proceso completo y limitaciones reales para armar el video 'Resumen Semanal' (goles de la semana) en Canva, distinto del proceso de 'Formación Titular'
- [reference_canva_video_formacion_titular](reference_canva_video_formacion_titular.md) — Proceso y limitaciones reales para editar los videos 'Formación Titular' VPN y 11x11 (Canva) con partidos del día y cambios de jugador, incluye checklist end-to-end y export correcto
- [reference_cloudflare_y_r2](reference_cloudflare_y_r2.md) — Cómo desplegar el Worker y manejar el bucket R2 sin wrangler — credenciales en .env, scripts deploy-worker.mjs y r2.mjs
- [reference_copafacil_api](reference_copafacil_api.md) — Cómo extraer datos de torneos de CopáFácil (Flutter SPA) vía Firebase RTDB — patrón usado en el Worker de Top Secret
- [reference_kit_crop_generate_image](reference_kit_crop_generate_image.md) — generate-image-chatgpt.mjs recorta un solo kit de T3 Kits.png en vez de mandar el poster completo con los 3 — el script elige el color, no ChatGPT
- [reference_publicar_redes](reference_publicar_redes.md) — Cómo se publica en YouTube/X/TikTok desde el Chrome CDP; Instagram/Facebook pendientes
- [reference_renders_folder](reference_renders_folder.md) — Estructura y propósito de las carpetas en Renders/ — qué borrar y qué conservar
- [reference_topsecret_daily_news_routine](reference_topsecret_daily_news_routine.md) — How to find and edit the cloud routine that writes Top Secret FC's daily news draft
