' Ronda de redes: arma el contenido de las 14:00 (si hoy toca) y abre aprobar.html. Log: scripts/ronda-redes.log
Set oShell = CreateObject("WScript.Shell")
oShell.CurrentDirectory = "D:\proyectos\top-secret"
oShell.Run "cmd /c node scripts\social\ronda.mjs >> scripts\ronda-redes.log 2>&1", 0, False
