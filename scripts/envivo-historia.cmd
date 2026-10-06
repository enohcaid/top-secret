@echo off
rem Publica la historia "EN VIVO en Twitch" (placa ya subida a R2). La dispara una tarea programada de Windows
rem a la hora del partido oficial. Log en fuentes\placas\envivo-log.txt. Uso: envivo-historia.cmd <url-de-la-placa>
cd /d D:\proyectos\top-secret
"C:\Program Files\nodejs\node.exe" scripts\meta.mjs ig-historia %1 --etiquetar vpugvirtual_prouruguay_gaming >> fuentes\placas\envivo-log.txt 2>&1
