param(
    [switch]$SkipInstall,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$ServiceDir = Join-Path $RepoRoot "services\queue-worker"
$VenvDir = Join-Path $ServiceDir ".venv"
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"

Set-Location $ServiceDir

if (-not (Test-Path $VenvDir)) {
    Write-Host "[Queue] Creating virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
}

if (-not (Test-Path $PythonExe)) {
    throw "[Queue] Python executable not found at $PythonExe"
}

if (-not $SkipInstall) {
    Write-Host "[Queue] Installing dependencies..." -ForegroundColor Cyan
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

Write-Host "[Queue] Starting Celery worker..." -ForegroundColor Green
& $PythonExe -m celery -A app.celery_app worker --loglevel=info
