# Opens Chrome with remote debugging (CDP on localhost:9222) and the pipeline's own profile,
# so the image scripts (generate-image-chatgpt.mjs and the *-once.mjs generators) can drive ChatGPT.
# First time on a new PC: log in to ChatGPT in the window that opens and open the project "TOP Secret FC".
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\abrir-chrome-chatgpt.ps1
# (ASCII only on purpose: PowerShell 5.1 misreads BOM-less UTF-8.)

$repoRoot   = Split-Path $PSScriptRoot -Parent
$profileDir = Join-Path $repoRoot 'scripts\.chrome-profile'

try {
    Invoke-WebRequest -Uri 'http://localhost:9222/json/version' -UseBasicParsing -TimeoutSec 3 | Out-Null
    Write-Host 'Chrome with CDP is already running on localhost:9222.'
    exit 0
} catch {}

$candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$chromeExe = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $chromeExe) { Write-Error 'Chrome not found. Install Google Chrome.'; exit 1 }

Start-Process -FilePath $chromeExe -ArgumentList @(
    '--remote-debugging-port=9222',
    "--user-data-dir=$profileDir",
    '--no-first-run',
    '--no-default-browser-check',
    'https://chatgpt.com'
)
Write-Host "Chrome started with profile $profileDir. Log in to ChatGPT if it asks."
