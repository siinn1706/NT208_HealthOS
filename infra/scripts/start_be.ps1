param(
    [switch]$SkipInstall,
    [switch]$CheckOnly,
    [Alias("Host")]
    [string]$BindHost = "0.0.0.0",
    [int]$Port = 8000,
    [string]$LogFile
)

$ErrorActionPreference = "Stop"

Import-Module (Join-Path $PSScriptRoot "healthos-common.psm1") -Force

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$BackendDir = Join-Path $RepoRoot "backend"
$VenvDir = Join-Path $BackendDir ".venv"
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"

$ScriptLogFile = Resolve-LogFilePath -RepoRoot $RepoRoot -DefaultName "be" -RequestedPath $LogFile
Start-HealthOSTranscript -LogFilePath $ScriptLogFile

Write-Host "[BE] Log file: $ScriptLogFile" -ForegroundColor DarkCyan

Set-Location $BackendDir

if ($CheckOnly) {
    if (-not (Test-Path $VenvDir)) {
        throw "[BE] Virtual environment missing at $VenvDir. Run without -CheckOnly to bootstrap."
    }
    if (-not (Test-Path $PythonExe)) {
        throw "[BE] Python executable not found at $PythonExe"
    }

    Write-Host "[BE] Running dependency health checks..." -ForegroundColor Cyan
    & $PythonExe -m pip check
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
    Assert-SingleAlembicHead -PythonExe $PythonExe -BackendDir $BackendDir -ErrorPrefix "[BE]"
    & $PythonExe -m alembic current
    exit $LASTEXITCODE
}

if (-not (Test-Path $VenvDir)) {
    if (-not (Test-CommandAvailable "python")) {
        throw "[BE] Python command not found. Install Python and ensure it is on PATH."
    }

    Write-Host "[BE] Creating virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
}

if (-not (Test-Path $PythonExe)) {
    throw "[BE] Python executable not found at $PythonExe"
}

$ActivateScript = Join-Path $VenvDir "Scripts\Activate.ps1"
if (Test-Path $ActivateScript) {
    Write-Host "[BE] Activating virtual environment..." -ForegroundColor Cyan
    & $ActivateScript
}

$pyVer = & python --version 2>&1
if ($pyVer -notmatch "3\.12") {
    Write-Warning "[BE] Expected Python 3.12 (see .python-version). Got: $pyVer"
}

if (-not $SkipInstall) {
    Write-Host "[BE] Installing dependencies (deterministic mode)..." -ForegroundColor Cyan
    & $PythonExe -m pip install --upgrade pip setuptools wheel
    & $PythonExe -m pip install -r requirements.txt
    if (Test-Path "requirements-dev.txt") {
        & $PythonExe -m pip install -r requirements-dev.txt
    }
}

Assert-SingleAlembicHead -PythonExe $PythonExe -BackendDir $BackendDir -ErrorPrefix "[BE]"

Write-Host "[BE] Running migrations via python -m alembic..." -ForegroundColor Cyan
& $PythonExe -m alembic upgrade head
if ($LASTEXITCODE -ne 0) {
    throw "[BE] Database migrations failed. Fix the migration error before starting the backend."
}

Write-Host "[BE] Starting FastAPI on http://$BindHost`:$Port ..." -ForegroundColor Green
if ($BindHost -eq "0.0.0.0") {
    Write-Host "[BE] LAN devices should use http://<this-computer-lan-ip>:$Port" -ForegroundColor DarkCyan
}
& $PythonExe -m uvicorn app.main:app --reload --host $BindHost --port $Port
exit $LASTEXITCODE
