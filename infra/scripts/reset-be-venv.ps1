# HealthOS — Backend Venv Reset (Windows PowerShell)
# Deletes and recreates backend/.venv, reinstalls all deps.
# Usage: .\infra\scripts\reset-be-venv.ps1 [-Force]
param([switch]$Force)

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$BackendDir = Join-Path $Root "backend"
$VenvDir    = Join-Path $BackendDir ".venv"

Write-Host "[BE] Will delete and recreate: $VenvDir" -ForegroundColor Cyan

if (-not $Force) {
    $answer = Read-Host "Proceed? [y/N]"
    if ($answer -notmatch "^[Yy]$") {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 0
    }
}

Set-Location $BackendDir

# Deactivate if active (best-effort)
if ($env:VIRTUAL_ENV) {
    Write-Host "[BE] Deactivating current venv..." -ForegroundColor DarkCyan
    & deactivate 2>$null || $true
}

if (Test-Path $VenvDir) {
    Write-Host "[BE] Removing .venv..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force $VenvDir
}

Write-Host "[BE] Creating new venv..." -ForegroundColor Cyan
python -m venv .venv

$PyExe = Join-Path $VenvDir "Scripts\python.exe"
if (-not (Test-Path $PyExe)) {
    throw "[BE] python.exe not found after venv creation: $PyExe"
}

$pyVer = & $PyExe --version 2>&1
Write-Host "[BE] Using: $pyVer" -ForegroundColor DarkCyan

& $PyExe -m pip install --upgrade pip setuptools wheel
& $PyExe -m pip install -r requirements.txt
if (Test-Path "requirements-dev.txt") {
    & $PyExe -m pip install -r requirements-dev.txt
}

Write-Host "[BE] Backend venv reset complete." -ForegroundColor Green
