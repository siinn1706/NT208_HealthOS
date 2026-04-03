param(
    [switch]$SkipInstall,
    [switch]$CheckOnly,
    [string]$LogFile
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$BackendDir = Join-Path $RepoRoot "backend"
$VenvDir = Join-Path $BackendDir ".venv"
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"

function Resolve-LogFilePath {
    param(
        [string]$DefaultName,
        [string]$RequestedPath
    )

    $logsDir = Join-Path $RepoRoot "infra\logs"
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null

    if ([string]::IsNullOrWhiteSpace($RequestedPath)) {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss_fff"
        return Join-Path $logsDir ("{0}_{1}.log" -f $DefaultName, $timestamp)
    }

    $resolved = if ([System.IO.Path]::IsPathRooted($RequestedPath)) {
        $RequestedPath
    }
    else {
        Join-Path $RepoRoot $RequestedPath
    }

    $parent = Split-Path -Parent $resolved
    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    return $resolved
}

function Test-CommandAvailable {
    param([string]$CommandName)
    return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

$ScriptLogFile = Resolve-LogFilePath -DefaultName "be" -RequestedPath $LogFile
try {
    Start-Transcript -Path $ScriptLogFile -Append -Force | Out-Null
}
catch {
    Write-Warning "[BE] Unable to start transcript at '$ScriptLogFile': $($_.Exception.Message)"
}

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

Write-Host "[BE] Running migrations via python -m alembic..." -ForegroundColor Cyan
& $PythonExe -m alembic upgrade head
if ($LASTEXITCODE -ne 0) {
    Write-Host "[BE] WARNING: Migration failed. Server will still start, but chat settings may break." -ForegroundColor Yellow
}

Write-Host "[BE] Starting FastAPI on http://localhost:8000 ..." -ForegroundColor Green
& $PythonExe -m uvicorn app.main:app --reload
