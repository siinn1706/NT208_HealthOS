# HealthOS — Frontend Clean + Reinstall (Windows PowerShell)
# Removes node_modules and .next, then reinstalls.
# Usage: .\infra\scripts\clean-fe.ps1 [-Force] [-IncludeLockfile]
param(
    [switch]$Force,
    [switch]$IncludeLockfile
)

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$FrontendDir = Join-Path $Root "frontend"

Write-Host "[FE] Will delete:" -ForegroundColor Cyan
Write-Host "  $FrontendDir\node_modules"
Write-Host "  $FrontendDir\.next"
if ($IncludeLockfile) {
    Write-Host "  $FrontendDir\package-lock.json  (WARNING: dependency resolution may change)"
}

if (-not $Force) {
    $answer = Read-Host "Proceed? [y/N]"
    if ($answer -notmatch "^[Yy]$") {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 0
    }
}

Set-Location $FrontendDir

if (Test-Path "node_modules") {
    Write-Host "[FE] Removing node_modules..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force "node_modules"
}
if (Test-Path ".next") {
    Write-Host "[FE] Removing .next cache..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force ".next"
}
if ($IncludeLockfile -and (Test-Path "package-lock.json")) {
    Write-Host "[FE] Removing package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Force "package-lock.json"
}

if (Test-Path "package-lock.json") {
    Write-Host "[FE] Installing with npm ci..." -ForegroundColor Cyan
    npm ci
} else {
    Write-Host "[FE] Installing with npm install..." -ForegroundColor Cyan
    npm install
}

Write-Host "[FE] Frontend clean-reinstall complete." -ForegroundColor Green
