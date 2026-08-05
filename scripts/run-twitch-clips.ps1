# Corre la extraccion de clips del ultimo VOD de Twitch de cabers1414.
# Pensado para Windows Task Scheduler (corrida nocturna, sin supervision).
# NOTA: mantener este archivo en ASCII puro (sin tildes) - PowerShell 5.1
# lee sin BOM como CP1252 y los caracteres especiales rompen el parseo.

$ErrorActionPreference = 'Stop'
$repoRoot = 'D:\proyectos\top-secret'
$logFile  = "$repoRoot\scripts\twitch-clips.log"

Set-Location $repoRoot
# cmd /c en vez de *>> : PowerShell 5.1 redirige a UTF-16 y mezclaba encodings
# en el log; cmd escribe los bytes UTF-8 de node tal cual.
cmd /c "node scripts\twitch-clips-once.mjs >> `"$logFile`" 2>&1"
