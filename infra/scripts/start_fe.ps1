param(
    [switch]$SkipInstall,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$FrontendDir = Join-Path $RepoRoot "frontend"
$LockFile = Join-Path $FrontendDir "package-lock.json"

Set-Location $FrontendDir

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

if ($CheckOnly) {
    Write-Host "[FE] Running npm dependency tree check..." -ForegroundColor Cyan
    npm ls --depth=0
    exit $LASTEXITCODE
}

Write-Host "[FE] Starting Next.js on http://localhost:3000 ..." -ForegroundColor Green
npm run dev
