Set oShell = CreateObject("WScript.Shell")
oShell.CurrentDirectory = "D:\proyectos\top-secret"
oShell.Run "cmd /c ""C:\Program Files\nodejs\node.exe"" scripts\amistosos.mjs >> fuentes\amistosos\bot-auto.log 2>&1", 0, False
