param(
    [ValidateSet("auto", "docker", "local")]
    [string]$Mode = "auto",
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

$effectiveMode = Resolve-EffectiveMode -Mode $Mode -LogPrefix "[BE]"
$env:HEALTHOS_RUN_MODE = $effectiveMode
Write-Host "[BE] Effective mode: $effectiveMode" -ForegroundColor DarkCyan

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

# In local mode backend/.env can use Docker service hostnames which are
# unresolvable on the host. Override process env for host-run services without
# editing generated env files.
if ($effectiveMode -eq "local" -and -not $env:ALEMBIC_DATABASE_URL) {
    $localUser     = if ($env:POSTGRES_APP_USER)     { $env:POSTGRES_APP_USER }     else { "healthos" }
    $localPassword = if ($env:POSTGRES_APP_PASSWORD) { $env:POSTGRES_APP_PASSWORD } else { "healthos_dev_pass" }
    $localDb       = if ($env:POSTGRES_APP_DB)       { $env:POSTGRES_APP_DB }       else { "healthos" }
    $env:ALEMBIC_DATABASE_URL = "postgresql+asyncpg://${localUser}:${localPassword}@localhost:5432/${localDb}"
    $env:DATABASE_URL         = $env:ALEMBIC_DATABASE_URL
    Write-Host "[BE] Local mode: overriding DATABASE_URL to localhost:5432" -ForegroundColor Yellow
}

if ($effectiveMode -eq "local" -and -not $env:REDIS_URL) {
    $localRedisDb = if ($env:REDIS_DB) { $env:REDIS_DB } else { "0" }
    $env:REDIS_URL = "redis://localhost:6379/$localRedisDb"
    Write-Host "[BE] Local mode: overriding REDIS_URL to localhost:6379/$localRedisDb" -ForegroundColor Yellow
}

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
