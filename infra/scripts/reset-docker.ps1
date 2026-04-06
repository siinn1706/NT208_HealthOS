# HealthOS — Docker Full Reset (Windows PowerShell)
# Stops all containers, removes volumes and orphans, clears stale state.
# Usage: .\infra\scripts\reset-docker.ps1 [-Force] [-Rebuild]
param(
    [switch]$Force,
    [switch]$Rebuild
)

$Root       = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ComposeFile = Join-Path $Root "infra\docker\docker-compose.dev.yml"

Write-Host "[DOCKER] WARNING: This will stop all HealthOS containers and DELETE all Docker volumes." -ForegroundColor Red
Write-Host "[DOCKER] Data removed: PostgreSQL data, Redis cache, MinIO files." -ForegroundColor Yellow
Write-Host "[DOCKER] Compose file: $ComposeFile"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "[DOCKER] docker CLI not found. Install Docker Desktop."
}

if (-not $Force) {
    $answer = Read-Host "Proceed? [y/N]"
    if ($answer -notmatch "^[Yy]$") {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 0
    }
}

Set-Location $Root

Write-Host "[DOCKER] Stopping containers and removing volumes..." -ForegroundColor Cyan
docker compose -f $ComposeFile down --volumes --remove-orphans

if ($Rebuild) {
    Write-Host "[DOCKER] Rebuilding images (no cache)..." -ForegroundColor Cyan
    docker compose -f $ComposeFile build --no-cache
}

Write-Host ""
Write-Host "[DOCKER] Reset complete." -ForegroundColor Green
Write-Host "Run: .\start_ALL.bat  (or .\infra\scripts\setup.ps1 -docker) to recreate." -ForegroundColor Cyan
