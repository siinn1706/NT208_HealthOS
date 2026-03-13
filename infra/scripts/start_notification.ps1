param(
    [switch]$SkipInstall,
    [switch]$CheckOnly,
    [string]$LogFile
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ServiceDir = Join-Path $RepoRoot "services\notification"
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

$ScriptLogFile = Resolve-LogFilePath -DefaultName "notification" -RequestedPath $LogFile
try {
    Start-Transcript -Path $ScriptLogFile -Append -Force | Out-Null
}
catch {
    Write-Warning "[Notification] Unable to start transcript at '$ScriptLogFile': $($_.Exception.Message)"
}

Write-Host "[Notification] Log file: $ScriptLogFile" -ForegroundColor DarkCyan

Set-Location $ServiceDir

if ($CheckOnly) {
    if (-not (Test-Path $VenvDir)) {
        throw "[Notification] Virtual environment missing at $VenvDir. Run without -CheckOnly to bootstrap."
    }
    if (-not (Test-Path $PythonExe)) {
        throw "[Notification] Python executable not found at $PythonExe"
    }

    & $PythonExe -m pip check
    exit $LASTEXITCODE
}

if (-not (Test-Path $VenvDir)) {
    if (-not (Test-CommandAvailable "python")) {
        throw "[Notification] Python command not found. Install Python and ensure it is on PATH."
    }

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

Write-Host "[Notification] Starting notification service on http://localhost:8002 ..." -ForegroundColor Green
& $PythonExe -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
