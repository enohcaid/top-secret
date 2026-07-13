Set oShell = CreateObject("WScript.Shell")
oShell.Run "powershell.exe -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File D:\proyectos\top-secret\scripts\watch-regen.ps1", 0, False
