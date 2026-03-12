param(
    [switch]$SkipInstall,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$ServiceDir = Join-Path $RepoRoot "services\notification"
$VenvDir = Join-Path $ServiceDir ".venv"
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"

Set-Location $ServiceDir

if (-not (Test-Path $VenvDir)) {
    Write-Host "[Notification] Creating virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
}

if (-not (Test-Path $PythonExe)) {
    throw "[Notification] Python executable not found at $PythonExe"
}

if (-not $SkipInstall) {
    Write-Host "[Notification] Installing dependencies..." -ForegroundColor Cyan
    & $PythonExe -m pip install --upgrade pip setuptools wheel
    & $PythonExe -m pip install -r requirements.txt
    if (Test-Path "requirements-dev.txt") {
        & $PythonExe -m pip install -r requirements-dev.txt
    }
}

if ($CheckOnly) {
    & $PythonExe -m pip check
    exit $LASTEXITCODE
}

Write-Host "[Notification] Starting notification service on http://localhost:8002 ..." -ForegroundColor Green
& $PythonExe -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
