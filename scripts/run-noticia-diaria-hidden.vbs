' Noticia diaria (scripts/noticia-diaria.mjs): 06:00 con reintentos 06:30, 07:30, 09:00 y 12:00. Si la nota de hoy
' ya existe, termina enseguida. Log: scripts\noticia-diaria.log
Set oShell = CreateObject("WScript.Shell")
oShell.CurrentDirectory = "D:\proyectos\top-secret"
oShell.Run "cmd /c node scripts\noticia-diaria.mjs >> scripts\noticia-diaria.log 2>&1", 0, False
