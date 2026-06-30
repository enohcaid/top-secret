# Corre despues del agente cloud de noticias (09:15 ART): genera las imagenes
# del draft del dia con ChatGPT (via el Chrome con sesion logueada) y las
# commitea al repo. Pensado para Windows Task Scheduler.

$ErrorActionPreference = 'Stop'
$repoRoot   = 'D:\proyectos\top-secret'
$profileDir = "$repoRoot\scripts\.chrome-profile"
$chromeExe  = 'C:\Program Files\Google\Chrome\Application\chrome.exe'

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
