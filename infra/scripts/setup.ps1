# HealthOS Local Setup Script (Windows PowerShell)
# Run from repo root: .\infra\scripts\setup.ps1

param(
    [switch]$docker,
    [switch]$skipModelDownload,
    [switch]$skipFrontend,
    [switch]$skipBackend
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path "$PSScriptRoot\..\..\"

Write-Host "=== HealthOS Setup ===" -ForegroundColor Cyan
Write-Host "Root: $Root"

function Copy-EnvFile {
    param(
        [string]$src,
        [string]$dest
    )

    if (-not (Test-Path $dest)) {
        Copy-Item $src $dest
        Write-Host "[ENV] Created $dest" -ForegroundColor Green
    }
    else {
        Write-Host "[ENV] $dest already exists, skipping." -ForegroundColor Yellow
    }
}

Copy-EnvFile "$Root\infra\env\frontend.env.example" "$Root\frontend\.env.local"
Copy-EnvFile "$Root\infra\env\backend.env.example" "$Root\backend\.env"
Copy-EnvFile "$Root\infra\env\worker.env.example" "$Root\services\ai-worker\.env"
Copy-EnvFile "$Root\infra\env\worker.env.example" "$Root\services\queue-worker\.env"
Copy-EnvFile "$Root\infra\env\worker.env.example" "$Root\services\notification\.env"
Copy-EnvFile "$Root\infra\docker\.env.dev.example" "$Root\infra\docker\.env.dev"

if (-not $skipModelDownload) {
    Write-Host "[MODEL] Ensuring AI YOLO model exists..." -ForegroundColor Cyan
    & "$Root\infra\scripts\download-ai-model.ps1" -EnvFile "$Root\services\ai-worker\.env"
    if ($LASTEXITCODE -ne 0) {
        throw "[MODEL] Failed to download AI model."
    }
    Write-Host "[MODEL] Done." -ForegroundColor Green
}
else {
    Write-Host "[MODEL] Skipping model download (--skipModelDownload)." -ForegroundColor Yellow
}

if ($docker) {
    Write-Host "[DOCKER] Starting full stack..." -ForegroundColor Cyan
    Set-Location $Root
    docker compose -f infra/docker/docker-compose.dev.yml up -d
    if ($LASTEXITCODE -ne 0) {
        throw "[DOCKER] Failed to start docker compose stack."
    }
    Write-Host "[DOCKER] Stack running. Ports: FE=3000 BE=8000 AI=8001 Notification=8002 PG=5432 Redis=6379 MinIO=9000" -ForegroundColor Green
}
else {
    if (-not $skipFrontend) {
        Write-Host "[FE] Installing npm packages (deterministic)..." -ForegroundColor Cyan
        Set-Location "$Root\frontend"
        if (Test-Path "package-lock.json") {
            npm ci
        }
        else {
            npm install
        }
        if ($LASTEXITCODE -ne 0) {
            throw "[FE] npm install failed."
        }
        Write-Host "[FE] Done." -ForegroundColor Green
    }

    if (-not $skipBackend) {
        Write-Host "[BE] Setting up Python venv..." -ForegroundColor Cyan
        Set-Location "$Root\backend"
        if (-not (Test-Path ".venv")) {
            python -m venv .venv
        }

        $PyExe = "$Root\backend\.venv\Scripts\python.exe"
        if (-not (Test-Path $PyExe)) {
            throw "[BE] Python executable not found at $PyExe"
        }

        Write-Host "[BE] Using Python: $PyExe" -ForegroundColor DarkCyan
        & $PyExe -m pip install --upgrade pip setuptools wheel
        & $PyExe -m pip install -r requirements.txt
        if (Test-Path "requirements-dev.txt") {
            & $PyExe -m pip install -r requirements-dev.txt
        }

        if ($LASTEXITCODE -ne 0) {
            throw "[BE] pip install failed."
        }

        Write-Host "[BE] Running database migrations..." -ForegroundColor Cyan
        # `heads` (plural) is multi-head safe; `head` silently no-ops on branched trees.
        & $PyExe -m alembic upgrade heads
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "[BE] Migration failed. DB may need manual setup or Postgres may not be running."
        }

        Write-Host "[BE] Done." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Setup complete ===" -ForegroundColor Cyan
Write-Host "Run: .\start_ALL.bat  (or .\infra\scripts\start_all.ps1) to start all services"
