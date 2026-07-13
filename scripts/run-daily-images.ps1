# Corre despues del agente cloud de noticias (09:15 ART): genera las imagenes
# del draft del dia con ChatGPT (via el Chrome con sesion logueada) y las
# commitea al repo. Pensado para Windows Task Scheduler.
# NOTA: mantener este archivo en ASCII puro (sin tildes) - PowerShell 5.1
# lee sin BOM como CP1252 y los caracteres especiales rompen el parseo.

$ErrorActionPreference = 'Stop'
$repoRoot   = 'D:\proyectos\top-secret'
$logFile    = "$repoRoot\scripts\daily-images.log"
$profileDir = "$repoRoot\scripts\.chrome-profile"
$chromeExe  = 'C:\Program Files\Google\Chrome\Application\chrome.exe'

function Log($msg) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    "$ts [run-daily] $msg" | Add-Content $logFile
}

# Esperar a que el agente cloud haya dejado el draft de HOY (max 45 min).
# Sin esto, si el articulo llega tarde el dia queda sin imagenes.
$fsUrl    = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft'
$today    = (Get-Date).ToUniversalTime().AddHours(-3).ToString('yyyy-MM-dd')
$deadline = (Get-Date).AddMinutes(45)
$draftOk  = $false

while ((Get-Date) -lt $deadline) {
    try {
        $doc   = Invoke-RestMethod $fsUrl -TimeoutSec 10
        $draft = $doc.fields.data.stringValue | ConvertFrom-Json
        if ($draft.date -eq $today) {
            if ($draft.imagePost) { Log "El draft de hoy ya tiene imagenes - nada que hacer."; exit 0 }
            $draftOk = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 30
}

if (-not $draftOk) {
    Log "Timeout (45 min) esperando el draft de hoy ($today) - abortando."
    exit 1
}
Log "Draft de hoy detectado - generando imagenes."

function Test-CDP {
    try {
        Invoke-WebRequest -Uri 'http://localhost:9222/json/version' -UseBasicParsing -TimeoutSec 3 | Out-Null
        return $true
    } catch {
        return $false
    }
}

if (-not (Test-CDP)) {
    Start-Process -FilePath $chromeExe -ArgumentList @(
        '--remote-debugging-port=9222',
        "--user-data-dir=$profileDir",
        '--no-first-run',
        '--no-default-browser-check',
        'https://chatgpt.com'
    )
    Start-Sleep -Seconds 12
}

Set-Location $repoRoot
node scripts/generate-image-chatgpt.mjs *>> "$repoRoot\scripts\daily-images.log"
