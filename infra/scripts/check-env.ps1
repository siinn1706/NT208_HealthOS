# HealthOS - Master Env Validation (Windows PowerShell)
# Verifies generated .env files match infra/env/.env.master without writing files.
# Usage: .\infra\scripts\check-env.ps1 [-Target all|dev|prod|workers|backend|frontend|ai-worker|queue-worker|notification|compose-dev|compose-prod|mobile]

param(
    [string]$Target = "all",
    [string]$Master
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Renderer = Join-Path $PSScriptRoot "render-env.mjs"
$MasterPath = if ($Master) { (Resolve-Path $Master).Path } else { Join-Path $Root "infra\env\.env.master" }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required to validate env files. Install Node.js 20+ and retry."
}

if (-not (Test-Path $MasterPath)) {
    Write-Host "[MISSING FILE] infra\env\.env.master" -ForegroundColor Red
    Write-Host "  Run setup or sync first: .\infra\scripts\sync-env.ps1 -Target all" -ForegroundColor Yellow
    exit 1
}

& node $Renderer --master $MasterPath --target $Target --check
exit $LASTEXITCODE
