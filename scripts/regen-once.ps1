# One-shot: espera el draft de hoy y genera las imagenes (ASCII only).
# Lanzado manualmente tras re-disparar el agente de articulo. Se puede borrar.
$ErrorActionPreference = 'Continue'
$repoRoot = 'D:\proyectos\top-secret'
$logFile  = "$repoRoot\scripts\daily-images.log"

function Log($msg) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    "$ts [regen-once] $msg" | Add-Content $logFile -Encoding UTF8
}

$fsUrl    = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft'
$today    = (Get-Date).ToUniversalTime().AddHours(-3).ToString('yyyy-MM-dd')
$deadline = (Get-Date).AddMinutes(20)
$draftOk  = $false

Log "Esperando draft de hoy ($today) tras re-disparo manual..."
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 20
    try {
        $doc   = Invoke-RestMethod $fsUrl -TimeoutSec 10
        $draft = $doc.fields.data.stringValue | ConvertFrom-Json
        if ($draft.date -eq $today -and -not $draft.imagePost) {
            Log "Draft listo: $($draft.title)"
            $draftOk = $true
            break
        }
    } catch {}
}

if (-not $draftOk) {
    Log 'Timeout (20 min) esperando draft - abortando generacion de imagenes.'
    exit 1
}

Set-Location $repoRoot
$chromeExe  = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$profileDir = "$repoRoot\scripts\.chrome-profile"

$cdpOk = $false
try { Invoke-WebRequest 'http://localhost:9222/json/version' -UseBasicParsing -TimeoutSec 3 | Out-Null; $cdpOk = $true } catch {}
if (-not $cdpOk) {
    Start-Process -FilePath $chromeExe -ArgumentList @(
        '--remote-debugging-port=9222',
        "--user-data-dir=$profileDir",
        '--no-first-run',
        '--no-default-browser-check',
        'https://chatgpt.com'
    )
    Start-Sleep -Seconds 12
}

Log 'Lanzando generacion de imagenes...'
cmd /c "node scripts\generate-image-chatgpt.mjs >> scripts\daily-images.log 2>&1"
Log "Generacion terminada (exit $LASTEXITCODE)."
