# HealthOS Local Setup Script (Windows PowerShell)
# Run from repo root: .\infra\scripts\setup.ps1

param(
    [switch]$docker,
    [switch]$skipFrontend,
    [switch]$skipBackend
)

$Root = Resolve-Path "$PSScriptRoot\..\..\"
Write-Host "=== HealthOS Setup ===" -ForegroundColor Cyan
Write-Host "Root: $Root"

# ─── Copy .env files ──────────────────────────────────────────────
function Copy-EnvFile($src, $dest) {
    if (-not (Test-Path $dest)) {
        Copy-Item $src $dest
        Write-Host "[ENV] Created $dest" -ForegroundColor Green
    } else {
        Write-Host "[ENV] $dest already exists, skipping." -ForegroundColor Yellow
    }
}

Copy-EnvFile "$Root\infra\env\frontend.env.example" "$Root\frontend\.env.local"
Copy-EnvFile "$Root\infra\env\backend.env.example"  "$Root\backend\.env"
Copy-EnvFile "$Root\infra\env\worker.env.example"   "$Root\services\ai-worker\.env"
Copy-EnvFile "$Root\infra\env\worker.env.example"   "$Root\services\queue-worker\.env"
Copy-EnvFile "$Root\infra\env\worker.env.example"   "$Root\services\notification\.env"

if ($docker) {
    # ─── Docker Compose ───────────────────────────────────────────
    Write-Host "[DOCKER] Starting full stack..." -ForegroundColor Cyan
    Set-Location $Root
    docker compose -f infra/docker/docker-compose.dev.yml up -d
    Write-Host "[DOCKER] Stack running. Ports: FE=3000 BE=8000 AI=8001 PG=5432 Redis=6379 MinIO=9000" -ForegroundColor Green
} else {
    # ─── Frontend ─────────────────────────────────────────────────
    if (-not $skipFrontend) {
        Write-Host "[FE] Installing npm packages..." -ForegroundColor Cyan
        Set-Location "$Root\frontend"
        npm install
        Write-Host "[FE] Done." -ForegroundColor Green
    }

    # ─── Backend ──────────────────────────────────────────────────
    if (-not $skipBackend) {
        Write-Host "[BE] Setting up Python venv..." -ForegroundColor Cyan
        Set-Location "$Root\backend"
        if (-not (Test-Path ".venv")) {
            python -m venv .venv
        }
        .\.venv\Scripts\Activate.ps1
        pip install -r requirements.txt
        Write-Host "[BE] Done." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Setup complete ===" -ForegroundColor Cyan
Write-Host "Run: infra\scripts\start_all.ps1  to start all services"
