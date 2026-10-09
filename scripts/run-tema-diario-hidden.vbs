' Tema del día: compone un beat original por día (scripts/beats/diario.mjs). Log: scripts/tema-diario.log
Set oShell = CreateObject("WScript.Shell")
oShell.CurrentDirectory = "D:\proyectos\top-secret"
oShell.Run "cmd /c node scripts\beats\diario.mjs >> scripts\tema-diario.log 2>&1", 0, False
