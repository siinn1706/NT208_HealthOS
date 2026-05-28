param(
    [switch]$SkipInstall,
    [switch]$CheckOnly,
    [string]$LogFile
)

$ErrorActionPreference = "Stop"

Import-Module (Join-Path $PSScriptRoot "healthos-common.psm1") -Force

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$FrontendDir = Join-Path $RepoRoot "frontend"
$LockFile = Join-Path $FrontendDir "package-lock.json"

$ScriptLogFile = Resolve-LogFilePath -RepoRoot $RepoRoot -DefaultName "fe" -RequestedPath $LogFile
Start-HealthOSTranscript -LogFilePath $ScriptLogFile

Write-Host "[FE] Log file: $ScriptLogFile" -ForegroundColor DarkCyan

Set-Location $FrontendDir

if (-not (Test-CommandAvailable "npm")) {
    throw "[FE] npm is not installed or not on PATH."
}

$nodeVer = & node --version 2>&1
if ($nodeVer -notmatch "^v20\.") {
    Write-Warning "[FE] Expected Node 20 (see .nvmrc). Got: $nodeVer"
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

Write-Host "[FE] Starting Next.js on 0.0.0.0:3000 (local: http://localhost:3000) ..." -ForegroundColor Green
Write-Host "[FE] For Cloudflared, point the tunnel at http://127.0.0.1:3000 or http://localhost:3000." -ForegroundColor DarkCyan
npm run dev
exit $LASTEXITCODE
