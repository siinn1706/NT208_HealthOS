param(
    [switch]$SkipInstall,
    [switch]$CheckOnly,
    [string]$LogFile
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$FrontendDir = Join-Path $RepoRoot "frontend"
$LockFile = Join-Path $FrontendDir "package-lock.json"

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

$ScriptLogFile = Resolve-LogFilePath -DefaultName "fe" -RequestedPath $LogFile
try {
    Start-Transcript -Path $ScriptLogFile -Append -Force | Out-Null
}
catch {
    Write-Warning "[FE] Unable to start transcript at '$ScriptLogFile': $($_.Exception.Message)"
}

Write-Host "[FE] Log file: $ScriptLogFile" -ForegroundColor DarkCyan

Set-Location $FrontendDir

if (-not (Test-CommandAvailable "npm")) {
    throw "[FE] npm is not installed or not on PATH."
}

if ($CheckOnly) {
    if (-not (Test-Path "node_modules")) {
        throw "[FE] node_modules missing. Run without -CheckOnly (or run npm ci manually) before checking."
    }

    Write-Host "[FE] Running npm dependency tree check..." -ForegroundColor Cyan
    npm ls --depth=0
    exit $LASTEXITCODE
}

if (-not $SkipInstall) {
    if (Test-Path $LockFile) {
        Write-Host "[FE] Installing dependencies with npm ci..." -ForegroundColor Cyan
        npm ci
    }
    else {
        Write-Host "[FE] Lockfile missing, falling back to npm install..." -ForegroundColor Yellow
        npm install
    }
}

Write-Host "[FE] Starting Next.js on http://localhost:3000 ..." -ForegroundColor Green
npm run dev
