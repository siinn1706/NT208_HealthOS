param(
    [switch]$SkipInstall,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$BackendDir = Join-Path $RepoRoot "backend"
$VenvDir = Join-Path $BackendDir ".venv"
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"

Set-Location $BackendDir

if (-not (Test-Path $VenvDir)) {
    Write-Host "[BE] Creating virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
}

if (-not (Test-Path $PythonExe)) {
    throw "[BE] Python executable not found at $PythonExe"
}

if (-not $SkipInstall) {
    Write-Host "[BE] Installing dependencies (deterministic mode)..." -ForegroundColor Cyan
    & $PythonExe -m pip install --upgrade pip setuptools wheel
    & $PythonExe -m pip install -r requirements.txt
    if (Test-Path "requirements-dev.txt") {
        & $PythonExe -m pip install -r requirements-dev.txt
    }
}

if ($CheckOnly) {
    Write-Host "[BE] Running dependency health checks..." -ForegroundColor Cyan
    & $PythonExe -m pip check
    & $PythonExe -m alembic current
    exit $LASTEXITCODE
}

Write-Host "[BE] Running migrations via python -m alembic..." -ForegroundColor Cyan
& $PythonExe -m alembic upgrade head
if ($LASTEXITCODE -ne 0) {
    Write-Host "[BE] WARNING: Migration failed. Server will still start, but chat settings may break." -ForegroundColor Yellow
}

Write-Host "[BE] Starting FastAPI on http://localhost:8000 ..." -ForegroundColor Green
& $PythonExe -m uvicorn app.main:app --reload
