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

Import-Module (Join-Path $PSScriptRoot "healthos-common.psm1") -Force

Write-Host "=== HealthOS Setup ===" -ForegroundColor Cyan
Write-Host "Root: $Root"

$MasterEnv = "$Root\infra\env\.env.master"
$MasterExample = "$Root\infra\env\.env.master.example"
if (-not (Test-Path $MasterEnv)) {
    Copy-Item $MasterExample $MasterEnv
    Write-Host "[ENV] Created $MasterEnv from template. Review it before production deploy." -ForegroundColor Yellow
}
else {
    Write-Host "[ENV] $MasterEnv already exists." -ForegroundColor Green
}

Write-Host "[ENV] Rendering generated env files from master..." -ForegroundColor Cyan
& "$Root\infra\scripts\sync-env.ps1" -Target all
if ($LASTEXITCODE -ne 0) {
    throw "[ENV] Env render failed."
}

if (-not $skipModelDownload) {
    Write-Host "[MODEL] Ensuring AI YOLO model exists..." -ForegroundColor Cyan
    & "$Root\infra\scripts\download-ai-model.ps1" -EnvFile "$Root\services\ai-worker\.env" -RequireSha256
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
    $ComposeFile = "$Root\infra\docker\docker-compose.dev.yml"
    $ComposeEnvFile = "$Root\infra\docker\.env.dev"
    $ComposeArgs = Get-ComposeArgs -ComposeFile $ComposeFile -ComposeEnvFile $ComposeEnvFile
    docker compose @ComposeArgs up -d
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

        Write-Host "[BE] Verifying Alembic migration graph..." -ForegroundColor Cyan
        Assert-SingleAlembicHead -PythonExe $PyExe -BackendDir "$Root\backend" -ErrorPrefix "[BE]"

        Write-Host "[BE] Running database migrations..." -ForegroundColor Cyan
        & $PyExe -m alembic upgrade head
        if ($LASTEXITCODE -ne 0) {
            throw "[BE] Database migrations failed. Fix the error above and rerun setup."
        }

        Write-Host "[BE] Done." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Setup complete ===" -ForegroundColor Cyan
Write-Host "Run: .\start_ALL.bat  (or .\infra\scripts\start_all.ps1) to start all services"
