param(
    [switch]$SkipInstall,
    [switch]$CheckOnly,
    [string]$LogFile
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ServiceDir = Join-Path $RepoRoot "services\queue-worker"
$VenvDir = Join-Path $ServiceDir ".venv"
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

$ScriptLogFile = Resolve-LogFilePath -DefaultName "queue" -RequestedPath $LogFile
try {
    Start-Transcript -Path $ScriptLogFile -Append -Force | Out-Null
}
catch {
    Write-Warning "[Queue] Unable to start transcript at '$ScriptLogFile': $($_.Exception.Message)"
}

Write-Host "[Queue] Log file: $ScriptLogFile" -ForegroundColor DarkCyan

Set-Location $ServiceDir

if ($CheckOnly) {
    if (-not (Test-Path $VenvDir)) {
        throw "[Queue] Virtual environment missing at $VenvDir. Run without -CheckOnly to bootstrap."
    }
    if (-not (Test-Path $PythonExe)) {
        throw "[Queue] Python executable not found at $PythonExe"
    }

    & $PythonExe -m pip check
    exit $LASTEXITCODE
}

if (-not (Test-Path $VenvDir)) {
    if (-not (Test-CommandAvailable "python")) {
        throw "[Queue] Python command not found. Install Python and ensure it is on PATH."
    }

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

Write-Host "[Queue] Starting Celery worker..." -ForegroundColor Green
& $PythonExe -m celery -A app.celery_app worker --loglevel=info --pool=solo
