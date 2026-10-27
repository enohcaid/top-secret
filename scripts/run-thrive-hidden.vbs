' Album Thrive (domingos 02:00): un tema nuevo con voz por semana (scripts/beats/thrive.mjs). Si falla, reintenta a las
' 05:00 del mismo domingo (segundo disparador): la letra queda guardada y ACE-Step retoma. Log: scripts/thrive.log
Set oShell = CreateObject("WScript.Shell")
oShell.CurrentDirectory = "D:\proyectos\top-secret"
oShell.Run "cmd /c node scripts\beats\thrive.mjs >> scripts\thrive.log 2>&1", 0, False
