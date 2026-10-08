# OCR con el motor nativo de Windows 10/11 (Windows.Media.Ocr), sin instalar nada.
# Uso: powershell -File ocr-windows.ps1 <img1> [<img2> ...]
#      sin argumentos = modo servidor: lee una ruta por línea de stdin y responde una línea JSON por ruta.
# Salida: una línea JSON por imagen {"file":..., "lines":[{"text":..., "x":..,"y":..,"w":..,"h":..}]}
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Files)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Foundation, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }

$lang = [Windows.Globalization.Language]::new('es')
$engine = if ([Windows.Media.Ocr.OcrEngine]::IsLanguageSupported($lang)) { [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang) }
          else { [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }

function Ocr($f) {
    $file =Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path $f).Path)) ([Windows.Storage.StorageFile])
    $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bmp = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $res = Await ($engine.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
    $lines = foreach ($l in $res.Lines) {
        $rs = @($l.Words | ForEach-Object { $_.BoundingRect })
        $x0 = ($rs | Measure-Object X -Minimum).Minimum; $y0 = ($rs | Measure-Object Y -Minimum).Minimum
        $x1 = ($rs | ForEach-Object { $_.X + $_.Width } | Measure-Object -Maximum).Maximum
        $y1 = ($rs | ForEach-Object { $_.Y + $_.Height } | Measure-Object -Maximum).Maximum
        @{ text = $l.Text; x = [int]$x0; y = [int]$y0; w = [int]($x1 - $x0); h = [int]($y1 - $y0) }
    }
    $stream.Dispose()
    @{ file = $f; lines = @($lines) } | ConvertTo-Json -Compress -Depth 4
}

if ($Files) { foreach ($f in $Files) { Ocr $f } }
else {
    while ($null -ne ($f = [Console]::In.ReadLine())) {
        if (-not $f.Trim()) { continue }
        try { [Console]::Out.WriteLine((Ocr $f.Trim())) }
        catch { [Console]::Out.WriteLine((@{ file = $f; error = "$_"; lines = @() } | ConvertTo-Json -Compress)) }
        [Console]::Out.Flush()
    }
}
