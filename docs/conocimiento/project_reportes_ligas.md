---
name: project_reportes_ligas
description: Carga de reportes de partido en las webs de VPUG y VPN con la cuenta de Juan (en empates la carga el equipo) — dónde está cada panel y qué falta para automatizarlo
metadata:
  type: project
---

**Pedido de Juan (2026-11-12):** automatizar la carga de reportes en las webs de las ligas. En las dos ligas, cuando el partido termina **empatado**, hay que entrar al panel del equipo, aparece el partido pendiente y se carga a mano el resultado, las valoraciones, etc., con capturas de la transmisión que confirmen el resultado y las valoraciones.

**Sesión:** Juan inició sesión en las dos webs en el Chrome del pipeline (CDP 9222, `scripts/.chrome-profile/`), 2026-11-12. Las sesiones vencen: la de VPUG había vencido el 11/11. Si una página muestra "INGRESAR"/sin usuario, pedirle a Juan que vuelva a entrar. No guardar tokens en archivos.

**VPUG** (`vpug-liga.onrender.com`):
- Panel: **`/panel-dt`** → sección "REPORTES DE PARTIDOS" ("Los revisa el admin; al aprobarlos el resultado queda oficial") con **POR REPORTAR** (pendientes) y **ENVIADOS** (con estado, p. ej. APROBADO).
- El 12/11 figuraban enviados J1 vs MON0TRIBUTIST4S 0-6 y J2 vs Deportivo Madryn 0-0 (este, enviado 00:15 · 11 jugadores). Los enviados no se abren al hacer clic: **el formulario solo se ve con un partido en "Por reportar"**.
- Otras rutas con sesión: `/inicio` (mi panel), `/partidos`, `/mi-equipo`. API con token: ver [[project_vpug_primera_t4]].

**VPN** (`virtualpronetwork.com`):
- Panel: **`/my-vpn`** → "REPORT QUEUE" (el 12/11: "Every match you played is reported"), próximos partidos con confirmación de horario ("You can confirm in …", "Rival hasn't confirmed yet"). Equipo: `/my-vpn/teams/28524`, partidos `/my-vpn/matches`.
- Sin `/ar`, la portada redirige a `/mx`.

**Material para el reporte:** el vigía ya guarda en cada partido las pantallas de "Rendimiento" de los dos equipos (`fuentes/vivo/<sesión>/reporte/*.png`: nombre, CR = valoración, G, AST por jugador) y el resultado por partido. El cartel "Fin del partido" se saca de la grabación (en un 0-0 no aparece: va la pantalla Resumen), como en [[reference_wa_enviar_reporte_angel]].

**Pendiente:** ver el formulario real con un partido pendiente — VPUG el **jueves 12/11** (vs San Miguel eSports, 22:30) si empata, VPN el **lunes 16/11**. Plan: al terminar la noche, detectar pendientes en los dos paneles, completar el formulario con el resultado del vigía + valoraciones de las capturas, mostrarlo a Juan antes de enviar las primeras veces; después, automático.
