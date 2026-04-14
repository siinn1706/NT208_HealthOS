param(
    [int]$Port = 3001,
    [switch]$SkipInstall,
    [string]$LogFile
)

$ErrorActionPreference = "Stop"

Import-Module (Join-Path $PSScriptRoot "healthos-common.psm1") -Force

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$FrontendDir = Join-Path $RepoRoot "frontend"
$LockFile = Join-Path $FrontendDir "package-lock.json"

Write-Warning "[Client] Backend ALLOWED_ORIGINS must include http://localhost:$Port for CORS to work."

$ScriptLogFile = Resolve-LogFilePath -RepoRoot $RepoRoot -DefaultName "client" -RequestedPath $LogFile
Start-HealthOSTranscript -LogFilePath $ScriptLogFile

Write-Host "[Client] Log file: $ScriptLogFile" -ForegroundColor DarkCyan
Write-Host "[Client] Starting Next.js on port $Port ..." -ForegroundColor Green

Set-Location $FrontendDir

if (-not (Test-CommandAvailable "npm")) {
    throw "[Client] npm is not installed or not on PATH."
}

$nodeVer = & node --version 2>&1
if ($nodeVer -notmatch "^v20\.") {
    Write-Warning "[Client] Expected Node 20 (see .nvmrc). Got: $nodeVer"
}

if (-not $SkipInstall) {
    if (Test-Path $LockFile) {
        Write-Host "[Client] Installing dependencies with npm ci..." -ForegroundColor Cyan
        npm ci
    }
    else {
        Write-Host "[Client] Lockfile missing, falling back to npm install..." -ForegroundColor Yellow
        npm install
    }
}

npm run dev -- --port $Port
exit $LASTEXITCODE
