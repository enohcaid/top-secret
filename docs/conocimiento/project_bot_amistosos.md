---
name: bot-amistosos
description: Bot de amistosos sobre el WhatsApp PERSONAL de Juan (grupo "Amistosos 🤝 VPN 🇦🇷") — scripts/amistosos.mjs, semi-automático, carga los confirmados en calendario/estado.custom
metadata:
  type: project
---

Pedido de Juan (2026-09-30): en días sin competencia busca amistosos en el grupo de WhatsApp "Amistosos 🤝 VPN 🇦🇷": ve quién busca, de qué categoría es, le escribe por privado "Buenas, soy de Top Secret, jugamos a las xx:xx hs?" con horarios **22:40, 23:00, 23:20, 23:40**, y los confirmados van al sitio como amistosos del día (salen en la convocatoria y en la formación exportada).

- **WhatsApp:** el PERSONAL de Juan, vinculado como dispositivo (whatsapp-web.js, sesión en `scripts/.wa-personal/`, gitignored). **Nunca usar la sesión/bot de Losinno** (es otro número, lo pidió explícito).
- `node scripts/amistosos.mjs [--prueba] [--horarios 23:00,23:20] [--auto]`. Juan aprueba desde su chat "Mensaje a mí mismo" con letras (`A`, `A 23:20`, `A <equipo>`, `A no`, `A ok`, `estado`). Por ahora **semi-automático**; la idea es pasar a `--auto` "en un futuro cercano".
- Equipos: 1ra (liga 2119, temporada 6409) y 2da (2127, 6410) de VPN vía `virtualpronetwork.com/api/leagues/<id>/table` (actualizar temporadas cuando cambien). Nombres **nunca exactos**: `scripts/lib/equipos-match.mjs` (distancia de edición, abreviaturas, nombre compacto) + `scripts/amistosos-alias.json` (alias, `nombre_sitio` para usar el nombre que ya usa el sitio, `extras` fuera de 1ra/2da). Empates cercanos → pregunta en vez de adivinar. Aprende número de teléfono → equipo cuando Juan corrige (`fuentes/amistosos/aprendidos.json`). Prueba: `node scripts/amistosos-test-nombres.mjs`.
- Carga en el sitio: Firestore `calendario/estado.custom` con `appendMissingElements` (atómico, no pisa lo que haya): `{tipo:'partido', date, time, rival, league:'Amistoso', instancia:'', isHome:true, badge}`. `badge` = logo de VPN; si no hay (equipo de otra liga), `scripts/lib/escudos.mjs` lo busca en VPUG (CopáFácil) y 11x11 (VPG) → convocatoria lo muestra. Actualizar ahí los torneos/temporadas cuando cambien.
- 2026-09-30: se cargaron a mano (mismo mecanismo) los amistosos del día: 22:40 InfinitX, 23:00 SUB 21CF, 23:20 Olimpo Esports (escudo tomado de VPUG), 23:40 IACC Cantera. Verificado en convocatoria (panel "Partidos de hoy" y mensaje exportado).
- Pendiente: primera corrida real con `--prueba` (Juan escanea el QR) prevista para el 2026-10-01.

**Arranque automático (2026-09-30, pedido de Juan):** tarea de Windows `TopSecretFC-Amistosos`, **lunes a jueves 17:00** (StartWhenAvailable, LogonType Interactive: necesita la sesión de Windows iniciada), corre `scripts/run-amistosos-hidden.vbs` → `node scripts/amistosos.mjs` en modo real semi-automático, log en `fuentes/amistosos/bot-auto.log`. Al arrancar lee **todos** los partidos del día abriendo `convocatoria.html?vista` publicada y usando su `getTodayMatches()` (oficiales VPN/VPUG/11x11 + amistosos cargados; respaldo: Firestore `custom`). Un horario (22:40/23:00/23:20/23:40) queda ocupado si hay un partido que empieza a menos de 20 min. Si no queda ninguno libre, avisa a Juan y se apaga; si no, busca solo para los libres. Se apaga a las 23:45.

**Amistosos vencidos se borran solos (2026-10-08, regla de Juan):** de un amistoso nunca se reporta resultado, así que una vez pasado su día se elimina de `calendario/estado.custom`. Lo hace el cron del Worker (`purgarAmistososPasados()` en `top-secret-worker.js`, cada minuto, `date < hoy` ART), reindexando las claves `c<N>` de `results`/`edits`/`suspended` y con precondición `updateTime` para no pisar guardados concurrentes. No cargar amistosos en `SEED_MATCHES`.
