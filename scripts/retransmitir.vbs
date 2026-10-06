' Lanza scripts/retransmitir.mjs sin ventana (tarea programada "TopSecret - Retransmitir Twitch").
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "D:\proyectos\top-secret"
sh.Run """C:\Program Files\nodejs\node.exe"" scripts\retransmitir.mjs --hasta 03:00", 0, False
