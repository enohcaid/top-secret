# Corre via Task Scheduler cada 1 minuto.
# 1) Si el browser descartó la noticia del día → borra sus imágenes del repo
#    local (Renders/Daily News) y de GitHub.
# 2) Si el browser pidió regenerar la noticia → dispara el agente cloud
#    (artículo) y después genera las imágenes localmente.

$ErrorActionPreference = 'Stop'
$repoRoot   = 'D:\proyectos\top-secret'
$logFile    = "$repoRoot\scripts\daily-images.log"
$worker     = 'https://top-secret-proxy.juan-c-m-1985.workers.dev'
$triggerId  = 'trig_01Kz9ev31E5WfSN2mkVrHq7a'

function Log($msg) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    "$ts [watch-regen] $msg" | Add-Content $logFile -Encoding UTF8
}

# ── PASO 0: Limpieza de imágenes de noticias descartadas ─────────────────────
$r2AccessKey = '193343f75da07692afb937f600d53fbb'
$r2SecretKey = 'b3e498f4c5cdb0fac18f3b9dcca4586bae251b33f0a17e6ecf0162f694ed309d'
$r2Endpoint  = 'https://505a1321519db1680cebe235e4e42808.r2.cloudflarestorage.com'
$r2Bucket    = 'top-secret-media'

try {
    $discard = Invoke-RestMethod "$worker/discard-flag" -TimeoutSec 10
} catch {
    $discard = $null
}

if ($discard -and $discard.requested) {
    Log "Noticia descartada ($($discard.date)) — eliminando imagenes de R2"

    # Limpiar el flag primero para evitar doble ejecución
    try { Invoke-RestMethod "$worker/discard-flag" -Method DELETE -TimeoutSec 10 | Out-Null }
    catch { Log "Advertencia: no se pudo limpiar discard-flag: $_" }

    $removed = @()
    foreach ($rel in $discard.files) {
        # Solo se tocan claves dentro de Renders/Daily News, sin path traversal
        if ($rel -notlike 'Renders/Daily News/*' -or $rel -match '\.\.') {
            Log "Ignorado (fuera de Daily News): $rel"
            continue
        }
        $key = ($rel -split '/' | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
        $code = & curl.exe -s -o NUL -w "%{http_code}" -X DELETE --aws-sigv4 "aws:amz:auto:s3" --user "${r2AccessKey}:${r2SecretKey}" "$r2Endpoint/$r2Bucket/$key"
        if ($code -eq '204' -or $code -eq '200') { $removed += $rel; Log "Borrado de R2: $rel" }
        else { Log "Error borrando de R2 (HTTP $code): $rel" }

        # Tambien borrar el archivo local si quedo (working tree, ya no versionado)
        $abs = Join-Path $repoRoot ($rel -replace '/', '\')
        if (Test-Path $abs) { try { Remove-Item $abs -Force -Confirm:$false } catch {} }
    }

    if ($removed.Count -gt 0) { Log "R2 actualizado: $($removed.Count) imagen(es) eliminadas" }
}

# Verificar si hay pedido de regeneración pendiente
try {
    $flag = Invoke-RestMethod "$worker/regen-flag" -TimeoutSec 10
} catch {
    # Corre cada minuto: sin red (PC suspendida, wifi caído) esto llenaba el
    # log con miles de líneas idénticas. Loguear como máximo una vez cada 30 min.
    $marker = "$repoRoot\scripts\.last-neterr"
    $silent = (Test-Path $marker) -and ((Get-Date) - (Get-Item $marker).LastWriteTime).TotalMinutes -lt 30
    if (-not $silent) {
        Log "Error consultando regen-flag: $_"
        New-Item -ItemType File -Path $marker -Force | Out-Null
    }
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
    # Nota: claude -p ya es no-interactivo; el flag --non-interactive no existe
    # y hacía fallar el disparo del agente.
    $claudeOutput = & claude -p "Usa la herramienta RemoteTrigger para disparar el trigger de Top Secret FC noticias ahora mismo. El trigger_id es: $triggerId. Accion: run. No hagas nada mas." 2>&1
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

# cmd /c en vez de *>> : PowerShell 5.1 redirige a UTF-16 y mezclaba encodings
# en el log; cmd escribe los bytes UTF-8 de node tal cual.
cmd /c "node scripts\generate-image-chatgpt.mjs >> scripts\daily-images.log 2>&1"
Log "Pipeline completo."
