' Lanza scripts/ea-traer.mjs sin ventana (tarea programada "TopSecret - EA", cada 30 min).
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "D:\proyectos\top-secret"
sh.Run "cmd /c node scripts\ea-traer.mjs >> scripts\ea-traer.log 2>&1", 0, True
