' Resumen semanal "La semana en datos" (sábados): arma carrusel, video, textos y noticia del sitio y abre aprobar.html. Log: scripts/ronda-redes.log
Set oShell = CreateObject("WScript.Shell")
oShell.CurrentDirectory = "D:\proyectos\top-secret"
oShell.Run "cmd /c node scripts\social\resumen-semanal.mjs >> scripts\ronda-redes.log 2>&1", 0, False
