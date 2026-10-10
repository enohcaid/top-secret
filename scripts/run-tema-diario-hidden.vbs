' Temas del día (04:00): compone DOS beats originales seguidos (scripts/beats/diario.mjs --parte 1 y 2;
' el segundo ya ve al primero en el registro y no lo repite). Log: scripts/tema-diario.log
Set oShell = CreateObject("WScript.Shell")
oShell.CurrentDirectory = "D:\proyectos\top-secret"
oShell.Run "cmd /c node scripts\beats\diario.mjs --parte 1 >> scripts\tema-diario.log 2>&1 & node scripts\beats\diario.mjs --parte 2 >> scripts\tema-diario.log 2>&1", 0, False
