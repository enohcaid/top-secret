# Corre via Task Scheduler cada 1 minuto.
# 1) Si el browser descartó la noticia del día → borra sus imágenes del repo
#    local (Renders/Daily News) y de GitHub.
# 2) Si el borrador de hoy no tiene imágenes → las genera (ChatGPT por Chrome). Desde 2026-11-11 la nota, y el
#    "Rehacer" del sitio, los escribe la nube (.github/workflows/noticia-diaria.yml); acá solo quedan las imágenes.

$ErrorActionPreference = 'Stop'
$repoRoot   = 'D:\proyectos\top-secret'
$logFile    = "$repoRoot\scripts\daily-images.log"
$worker     = 'https://top-secret-proxy.juan-c-m-1985.workers.dev'

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

# ── PASO P: ideas aprobadas en aprobar.html → se producen solas (Juan, 2026-11-05) ──
# Sale enseguida si no hay ninguna (una lectura de KV); la producción corre aparte y escribe en scripts\produccion-redes.log.
# Este paso NO puede redirigir a ese log: lo dejaría tomado y producir.mjs no podría abrirlo para lanzar la producción (EBUSY).
try {
    Push-Location $repoRoot
    cmd /c "node scripts\social\producir.mjs >> scripts\ronda-redes.log 2>&1"
    Pop-Location
} catch {
    Log "Error lanzando la produccion de ideas: $_"
}

# ── PASO M: demos de música revisadas en aprobar.html (todo bien → se publica; "a mejorar" → se rehace) ──
# Sale enseguida si no hay decisiones nuevas (una lectura de KV). Log: scripts\thrive.log
try {
    Push-Location $repoRoot
    cmd /c "node scripts\beats\musica-aprobacion.mjs >> scripts\thrive.log 2>&1"
    Pop-Location
} catch {
    Log "Error revisando musica: $_"
}

# ── PASO V: vigía del vivo de Twitch (goles + pantallas del reporte) ──────────
# Si enohcaid (señal de la PS5) está en vivo y no hay vigía corriendo (lock con PID vivo), lo lanza en segundo plano.
# Solo en la ventana de partidos que pidió Juan: lunes a jueves 22:30-00:30 (misma que retransmitir).
$ahora = Get-Date
$min = $ahora.Hour * 60 + $ahora.Minute
$dia = [int]$ahora.DayOfWeek   # 0 = domingo
$ventanaVigia = (($dia -ge 1 -and $dia -le 4) -and $min -ge 1350) -or (($dia -ge 2 -and $dia -le 5) -and $min -lt 30)
if ($ventanaVigia) { try {
    $gql = Invoke-RestMethod 'https://gql.twitch.tv/gql' -Method POST -TimeoutSec 10 `
        -Headers @{ 'Client-ID' = 'kimne78kx3ncx6brgo4mv6wki5h1ko' } `
        -Body '{"query":"query{user(login:\"enohcaid\"){stream{id}}}"}'
    if ($gql.data.user.stream) {
        $lock = "$repoRoot\fuentes\vivo\.vigia.lock"
        $corriendo = $false
        if (Test-Path $lock) { $corriendo = [bool](Get-Process -Id ([int](Get-Content $lock)) -ErrorAction SilentlyContinue) }
        if (-not $corriendo) {
            Log "enohcaid en vivo: lanzando vigia-vivo.mjs"
            Start-Process -FilePath 'cmd.exe' -WorkingDirectory $repoRoot -WindowStyle Hidden `
                -ArgumentList '/c', 'node scripts\vigia-vivo.mjs >> scripts\vigia-vivo.log 2>&1'
        }
    }
} catch { } }

# ── PASO I: imágenes de la noticia del día (híbrido, 2026-11-11) ─────────────
# La nota (también el "Rehacer" del sitio) la escribe la nube: .github/workflows/noticia-diaria.yml, disparado por el
# Worker. Acá solo se miran las imágenes: si el borrador de hoy tiene título y no tiene imágenes, y no hay una
# generación corriendo, se lanza run-daily-images (ChatGPT + lote de aprobar.html). Una vez por borrador (generatedAt):
# si falla, no se relanza cada minuto; un borrador nuevo (rehacer) sí vuelve a lanzar.
$fsUrl = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft'
try {
    $doc = Invoke-RestMethod $fsUrl -TimeoutSec 10
} catch {
    # Corre cada minuto: sin red (PC suspendida, wifi caído) esto llenaba el
    # log con miles de líneas idénticas. Loguear como máximo una vez cada 30 min.
    $marker = "$repoRoot\scripts\.last-neterr"
    $silent = (Test-Path $marker) -and ((Get-Date) - (Get-Item $marker).LastWriteTime).TotalMinutes -lt 30
    if (-not $silent) {
        Log "Error consultando el borrador: $_"
        New-Item -ItemType File -Path $marker -Force | Out-Null
    }
    exit 0
}
$draft = $null
try { $draft = $doc.fields.data.stringValue | ConvertFrom-Json } catch {}
$today = (Get-Date).ToUniversalTime().AddHours(-3).ToString('yyyy-MM-dd')
if (-not $draft -or $draft.date -ne $today -or -not $draft.title -or $draft.imagePost) { exit 0 }

$marca = "$repoRoot\scripts\.imagenes-lanzadas"
$clave = [string]$draft.generatedAt
if ((Test-Path $marca) -and ((Get-Content $marca -Raw).Trim() -eq $clave)) { exit 0 }
$enCurso = Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'generate-image-chatgpt|run-daily-images' }
if ($enCurso) { exit 0 }

Set-Content -Path $marca -Value $clave -Encoding ASCII
Log "Borrador de hoy sin imagenes ($($draft.title)) - lanzando run-daily-images"
Start-Process -FilePath 'wscript.exe' -ArgumentList "`"$repoRoot\scripts\run-daily-images-hidden.vbs`"" -WindowStyle Hidden
