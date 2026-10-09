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
    # Si otro proceso tiene el log tomado (pasó 2026-10-09 con un tail -f), no
    # cortar el script: con ErrorActionPreference=Stop eso frenaba la publicación en redes.
    try { "$ts [watch-regen] $msg" | Add-Content $logFile -Encoding UTF8 } catch {}
}

# ── PASO 0: Limpieza de imágenes de noticias descartadas ─────────────────────
# Credenciales R2 desde .env en la raíz del repo (ver .env.example) — nunca escribirlas acá: el repo es público.
$envVars = @{}
$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
if (Test-Path $envFile) { Get-Content $envFile -Encoding UTF8 | ForEach-Object { if ($_ -match "^\s*([A-Z0-9_]+)\s*=\s*(.*)$") { $envVars[$matches[1]] = $matches[2].Trim() } } }
$r2AccessKey = $envVars["R2_ACCESS_KEY_ID"]
$r2SecretKey = $envVars["R2_SECRET_ACCESS_KEY"]
$r2Endpoint  = "https://$($envVars["CF_ACCOUNT_ID"]).r2.cloudflarestorage.com"
$r2Bucket    = "top-secret-media"

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

# ── PASO R: publicacion en redes pedida desde noticias.html ("Publicar en redes") ──
# Consulta barata al Worker; solo si hay algo en cola corre el publicador (Meta API + X por CDP).
try {
    $redes = Invoke-RestMethod "$worker/redes-estado" -TimeoutSec 10
    if ($redes.job -and ($redes.job.destinos | Where-Object { $_.estado -eq 'pendiente' -or $_.estado -eq 'publicando' })) {
        Log "Publicacion en redes en cola ($($redes.job.id))"
        Push-Location $repoRoot
        cmd /c "node scripts\publicar-noticia-redes.mjs >> scripts\daily-images.log 2>&1"
        Pop-Location
    }
} catch {
    Log "Error en publicacion en redes: $_"
}

# ── PASO A: piezas aprobadas en aprobar.html (ronda de redes) cuya hora ya llegó ──
# Sale enseguida si no hay nada que publicar (una lectura de KV).
try {
    Push-Location $repoRoot
    cmd /c "node scripts\social\publicar.mjs >> scripts\ronda-redes.log 2>&1"
    Pop-Location
} catch {
    Log "Error en publicacion de la ronda: $_"
}

# ── PASO V: vigía del vivo de Twitch (goles + pantallas del reporte) ──────────
# Si topsecretfc está en vivo y no hay vigía corriendo (lock con PID vivo), lo lanza en segundo plano.
# Solo en la ventana de partidos que pidió Juan: lunes a jueves 22:30-00:30 (misma que retransmitir).
$ahora = Get-Date
$min = $ahora.Hour * 60 + $ahora.Minute
$dia = [int]$ahora.DayOfWeek   # 0 = domingo
$ventanaVigia = (($dia -ge 1 -and $dia -le 4) -and $min -ge 1350) -or (($dia -ge 2 -and $dia -le 5) -and $min -lt 30)
if ($ventanaVigia) { try {
    $gql = Invoke-RestMethod 'https://gql.twitch.tv/gql' -Method POST -TimeoutSec 10 `
        -Headers @{ 'Client-ID' = 'kimne78kx3ncx6brgo4mv6wki5h1ko' } `
        -Body '{"query":"query{user(login:\"topsecretfc\"){stream{id}}}"}'
    if ($gql.data.user.stream) {
        $lock = "$repoRoot\fuentes\vivo\.vigia.lock"
        $corriendo = $false
        if (Test-Path $lock) { $corriendo = [bool](Get-Process -Id ([int](Get-Content $lock)) -ErrorAction SilentlyContinue) }
        if (-not $corriendo) {
            Log "topsecretfc en vivo: lanzando vigia-vivo.mjs"
            Start-Process -FilePath 'cmd.exe' -WorkingDirectory $repoRoot -WindowStyle Hidden `
                -ArgumentList '/c', 'node scripts\vigia-vivo.mjs >> scripts\vigia-vivo.log 2>&1'
        }
    }
} catch { } }

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
