# Corre via Task Scheduler cada 1 minuto.
# Cuando el browser pide regenerar la noticia del día, este script lo detecta,
# dispara el agente cloud (artículo) y después genera las imágenes localmente.

$ErrorActionPreference = 'Stop'
$repoRoot   = 'D:\proyectos\top-secret'
$logFile    = "$repoRoot\scripts\daily-images.log"
$worker     = 'https://top-secret-proxy.juan-c-m-1985.workers.dev'
$triggerId  = 'trig_01Kz9ev31E5WfSN2mkVrHq7a'

function Log($msg) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    "$ts [watch-regen] $msg" | Add-Content $logFile
}

# Verificar si hay pedido de regeneración pendiente
try {
    $flag = Invoke-RestMethod "$worker/regen-flag" -TimeoutSec 10
} catch {
    Log "Error consultando regen-flag: $_"
    exit 0
}

if (-not $flag.requested) { exit 0 }

Log "Pedido de regeneración detectado — iniciando pipeline"

# Limpiar el flag inmediatamente para evitar doble ejecución
try {
    Invoke-RestMethod "$worker/regen-flag" -Method DELETE -TimeoutSec 10 | Out-Null
} catch {
    Log "Advertencia: no se pudo limpiar el flag: $_"
}

# ── PASO 1: Disparar agente de artículo via Claude Code CLI ──────────────────
Log "Disparando agente cloud para artículo..."
try {
    $claudeOutput = & claude -p "Usa la herramienta RemoteTrigger para disparar el trigger de Top Secret FC noticias ahora mismo. El trigger_id es: $triggerId. Accion: run. No hagas nada mas." --non-interactive 2>&1
    Log "Agente disparado: $($claudeOutput | Select-Object -First 3 | Out-String)"
} catch {
    Log "Error disparando agente: $_"
    Log "Intentando continuar de todas formas..."
}

# ── PASO 2: Esperar que el draft aparezca en Firestore (max 10 min) ──────────
Log "Esperando draft nuevo en Firestore..."
$fsUrl    = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft'
$today    = (Get-Date).ToUniversalTime().AddHours(-3).ToString('yyyy-MM-dd')
$deadline = (Get-Date).AddMinutes(10)
$draftOk  = $false

while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 15
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
    Log "Timeout esperando draft — abortando generación de imágenes"
    exit 1
}

# ── PASO 3: Generar imágenes ─────────────────────────────────────────────────
Log "Lanzando generación de imágenes..."
Set-Location $repoRoot

$chromeExe  = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$profileDir = "$repoRoot\scripts\.chrome-profile"

function Test-CDP {
    try { Invoke-WebRequest 'http://localhost:9222/json/version' -UseBasicParsing -TimeoutSec 3 | Out-Null; return $true }
    catch { return $false }
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

node scripts/generate-image-chatgpt.mjs *>> $logFile
Log "Pipeline completo."
