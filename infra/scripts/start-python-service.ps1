param(
    [Parameter(Mandatory)][string]$ServiceName,
    [Parameter(Mandatory)][string]$ServiceDir,
    [Parameter(Mandatory)][string]$LogPrefix,
    [Parameter(Mandatory)][string]$StartCommand,
    [switch]$SkipInstall,
    [switch]$CheckOnly,
    [string]$LogFile
)

$ErrorActionPreference = "Stop"
Import-Module (Join-Path $PSScriptRoot "healthos-common.psm1") -Force

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$VenvDir = Join-Path $ServiceDir ".venv"
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"

$ScriptLogFile = Resolve-LogFilePath -RepoRoot $RepoRoot -DefaultName $LogPrefix -RequestedPath $LogFile
Start-HealthOSTranscript -LogFilePath $ScriptLogFile

$tag = "[$ServiceName]"
Write-Host "$tag Log file: $ScriptLogFile" -ForegroundColor DarkCyan
Set-Location $ServiceDir

if ($CheckOnly) {
    if (-not (Test-Path $VenvDir)) { throw "$tag Virtual environment missing at $VenvDir. Run without -CheckOnly to bootstrap." }
    if (-not (Test-Path $PythonExe)) { throw "$tag Python executable not found at $PythonExe" }
    & $PythonExe -m pip check
    exit $LASTEXITCODE
}

if (-not (Test-Path $VenvDir)) {
    if (-not (Test-CommandAvailable "python")) { throw "$tag Python command not found. Install Python and ensure it is on PATH." }
    Write-Host "$tag Creating virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
}

if (-not (Test-Path $PythonExe)) { throw "$tag Python executable not found at $PythonExe" }

$pyVer = & $PythonExe --version 2>&1
if ("$pyVer" -notmatch "3\.12") { Write-Warning "$tag Expected Python 3.12 (see .python-version). Got: $pyVer" }

if (-not $SkipInstall) {
    Write-Host "$tag Installing dependencies..." -ForegroundColor Cyan
    & $PythonExe -m pip install --upgrade pip setuptools wheel
    & $PythonExe -m pip install -r requirements.txt
    if (Test-Path "requirements-dev.txt") {
        & $PythonExe -m pip install -r requirements-dev.txt
    }
}

if ($StartCommand -notmatch '^(\S+)\s*(.*)$') { throw "$tag Invalid StartCommand." }
$module = $Matches[1]
$rest = $Matches[2].Trim()
$argList = if ($rest) { @($rest -split '\s+') } else { @() }

Write-Host "$tag Starting service..." -ForegroundColor Green
& $PythonExe -m $module @argList
exit $LASTEXITCODE
