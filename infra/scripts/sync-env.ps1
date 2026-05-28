# HealthOS - Master Env Render Script (Windows PowerShell)
# Renders generated service .env files from infra/env/.env.master.
# This overwrites generated env files by design; edit the master file instead.
# Usage: .\infra\scripts\sync-env.ps1 [-Target all|dev|prod|workers|backend|frontend|ai-worker|queue-worker|notification|compose-dev|compose-prod|mobile]

param(
    [string]$Target = "all",
    [string]$Master
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Renderer = Join-Path $PSScriptRoot "render-env.mjs"
$MasterExample = Join-Path $Root "infra\env\.env.master.example"
$MasterPath = if ($Master) { (Resolve-Path $Master).Path } else { Join-Path $Root "infra\env\.env.master" }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required to render env files. Install Node.js 20+ and retry."
}

if (-not (Test-Path $MasterPath)) {
    if (-not (Test-Path $MasterExample)) {
        throw "Master env missing and example template not found: $MasterExample"
    }
    $masterDir = Split-Path $MasterPath -Parent
    if (-not (Test-Path $masterDir)) {
        New-Item -ItemType Directory -Path $masterDir -Force | Out-Null
    }
    Copy-Item $MasterExample $MasterPath
    Write-Host "[ENV] Created infra\env\.env.master from template. Review it before production deploy." -ForegroundColor Yellow
}

& node $Renderer --master $MasterPath --target $Target
exit $LASTEXITCODE
