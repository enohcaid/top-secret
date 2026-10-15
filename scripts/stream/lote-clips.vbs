' Lanza scripts/stream/lote-clips.mjs sin ventana (tarea programada "TopSecret - Clips overlay", cada hora).
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "D:\proyectos\top-secret"
sh.Run """C:\Program Files\nodejs\node.exe"" scripts\stream\lote-clips.mjs", 0, False
