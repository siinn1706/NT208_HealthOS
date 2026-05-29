param(
    [string]$EnvFile = "",
    [switch]$RequireSha256,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path "$ScriptRoot\..\.."

if ([string]::IsNullOrWhiteSpace($EnvFile)) {
    $EnvFile = Join-Path $RepoRoot "services\ai-worker\.env"
}

if (-not (Test-Path $EnvFile)) {
    throw "[MODEL] Env file not found: $EnvFile"
}

function Get-EnvMap {
    param([string]$Path)

    $map = @{}
    foreach ($line in Get-Content -Path $Path) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }
        if ($trimmed.StartsWith("#")) { continue }

        $parts = $trimmed.Split("=", 2)
        if ($parts.Count -ne 2) { continue }

        $key = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")
        $map[$key] = $value
    }
    return $map
}

function Resolve-ModelPath {
    param(
        [string]$RawPath,
        [string]$EnvFilePath
    )

    if ([System.IO.Path]::IsPathRooted($RawPath)) {
        return [System.IO.Path]::GetFullPath($RawPath)
    }

    $envDir = Split-Path -Parent $EnvFilePath
    return [System.IO.Path]::GetFullPath((Join-Path $envDir $RawPath))
}

function Get-Sha256 {
    param([string]$Path)

    return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Download-GDriveFile {
    param(
        [string]$FileId,
        [string]$DestinationPath
    )

    $curl = Get-Command "curl.exe" -ErrorAction SilentlyContinue
    if (-not $curl) {
        throw "[MODEL] curl.exe is required for Google Drive download on Windows."
    }

    $firstUrl = "https://drive.google.com/uc?export=download&id=$FileId"
    $cookiePath = [System.IO.Path]::GetTempFileName()
    $headerPath = [System.IO.Path]::GetTempFileName()
    $bodyPath = [System.IO.Path]::GetTempFileName()

    try {
        & $curl.Source -sSL -c $cookiePath -D $headerPath $firstUrl -o $bodyPath
        if ($LASTEXITCODE -ne 0) {
            throw "[MODEL] Failed first Google Drive request."
        }

        $contentTypeLine = Get-Content -Path $headerPath | Where-Object { $_ -match "^[Cc]ontent-[Tt]ype:" } | Select-Object -Last 1
        $contentType = ""
        if ($contentTypeLine) {
            $contentType = ($contentTypeLine -replace "^[^:]+:\s*", "").Trim().ToLowerInvariant()
        }
        $firstBody = Get-Content -Path $bodyPath -Raw

        if ($contentType -notmatch "text/html") {
            Move-Item -Path $bodyPath -Destination $DestinationPath -Force
            return
        }

        # Newer GDrive flow (large files): hidden form posts to drive.usercontent.google.com
        # with confirm + uuid inputs. Confirm value is now fixed ("t"); uuid is per-request.
        $formActionMatch = [regex]::Match($firstBody, 'action="(https://drive\.usercontent\.google\.com/download[^"]*)"')
        $confirmInputMatch = [regex]::Match($firstBody, 'name="confirm"\s+value="([^"]+)"')
        $uuidInputMatch = [regex]::Match($firstBody, 'name="uuid"\s+value="([^"]+)"')

        if ($formActionMatch.Success -and $confirmInputMatch.Success) {
            $action = $formActionMatch.Groups[1].Value
            $confirm = $confirmInputMatch.Groups[1].Value
            $uuid = if ($uuidInputMatch.Success) { $uuidInputMatch.Groups[1].Value } else { "" }

            $secondUrl = "$action`?id=$FileId&export=download&confirm=$confirm"
            if ($uuid) { $secondUrl += "&uuid=$uuid" }

            & $curl.Source -sSL -b $cookiePath $secondUrl -o $DestinationPath
            if ($LASTEXITCODE -ne 0) {
                throw "[MODEL] Failed second Google Drive request."
            }
            return
        }

        # Legacy GDrive flow: confirm token embedded in querystring of body
        $confirmMatch = [regex]::Match($firstBody, "confirm=([0-9A-Za-z_]+)")
        if ($confirmMatch.Success) {
            $confirm = $confirmMatch.Groups[1].Value
            $secondUrl = "https://drive.google.com/uc?export=download&confirm=$confirm&id=$FileId"
            & $curl.Source -sSL -b $cookiePath $secondUrl -o $DestinationPath
            if ($LASTEXITCODE -ne 0) {
                throw "[MODEL] Failed second Google Drive request."
            }
            return
        }

        throw "[MODEL] Google Drive response is HTML without confirm token. Check file visibility and file id."
    }
    finally {
        if (Test-Path $cookiePath) {
            Remove-Item -Path $cookiePath -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path $headerPath) {
            Remove-Item -Path $headerPath -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path $bodyPath) {
            Remove-Item -Path $bodyPath -Force -ErrorAction SilentlyContinue
        }
    }
}

$envMap = Get-EnvMap -Path $EnvFile
$defaultFileId = "1n9tMmb2P5rAlIJsZrBB1wtjRmCKFreZc"
$defaultModelPath = "./models/yolov10/YOLOv10b_VietFood67_SGD_new_bigger.pt"

$fileId = $envMap["AI_YOLO_GDRIVE_FILE_ID"]
$rawModelPath = $envMap["AI_YOLO_MODEL_PATH"]
$expectedSha = $envMap["AI_YOLO_MODEL_SHA256"]

if ([string]::IsNullOrWhiteSpace($fileId)) {
    $fileId = $defaultFileId
    Write-Host "[MODEL] AI_YOLO_GDRIVE_FILE_ID is missing. Using default id from worker template." -ForegroundColor Yellow
}

if ([string]::IsNullOrWhiteSpace($rawModelPath)) {
    $rawModelPath = $defaultModelPath
    Write-Host "[MODEL] AI_YOLO_MODEL_PATH is missing. Using default model path." -ForegroundColor Yellow
}

if ($RequireSha256 -and [string]::IsNullOrWhiteSpace($expectedSha)) {
    throw "[MODEL] RequireSha256 is on but AI_YOLO_MODEL_SHA256 is empty."
}

$modelPath = Resolve-ModelPath -RawPath $rawModelPath -EnvFilePath $EnvFile
$modelDir = Split-Path -Parent $modelPath
New-Item -ItemType Directory -Path $modelDir -Force | Out-Null

$expectedSha = "$expectedSha".ToLowerInvariant()
$hasExpectedSha = -not [string]::IsNullOrWhiteSpace($expectedSha)

if ((Test-Path $modelPath) -and -not $Force) {
    if ($hasExpectedSha) {
        $existingSha = Get-Sha256 -Path $modelPath
        if ($existingSha -eq $expectedSha) {
            Write-Host "[MODEL] Existing model hash matches. Skip download." -ForegroundColor Green
            exit 0
        }
        Write-Host "[MODEL] Existing model hash mismatch. Re-downloading..." -ForegroundColor Yellow
    }
    else {
        Write-Host "[MODEL] Model already exists and SHA256 is not configured. Skip download." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "[MODEL] Downloading model from Google Drive (id=$fileId)..." -ForegroundColor Cyan
$tmpDownload = [System.IO.Path]::GetTempFileName()

try {
    Download-GDriveFile -FileId $fileId -DestinationPath $tmpDownload

    if ($hasExpectedSha) {
        $actualSha = Get-Sha256 -Path $tmpDownload
        if ($actualSha -ne $expectedSha) {
            throw "[MODEL] SHA256 mismatch. Expected=$expectedSha Actual=$actualSha"
        }
        Write-Host "[MODEL] SHA256 verified." -ForegroundColor Green
    }
    elseif ($RequireSha256) {
        throw "[MODEL] SHA256 is required but AI_YOLO_MODEL_SHA256 is empty."
    }
    else {
        Write-Host "[MODEL] SHA256 not configured. Download accepted without integrity verification." -ForegroundColor Yellow
    }

    Move-Item -Path $tmpDownload -Destination $modelPath -Force
    Write-Host "[MODEL] Saved model to $modelPath" -ForegroundColor Green
}
finally {
    if (Test-Path $tmpDownload) {
        Remove-Item -Path $tmpDownload -Force -ErrorAction SilentlyContinue
    }
}
