Set oShell = CreateObject("WScript.Shell")
oShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File D:\proyectos\top-secret\scripts\run-twitch-clips.ps1", 0, False
