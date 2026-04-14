# HealthOS — Env Key Validation (Windows PowerShell)
# Compares local .env files against infra/env/*.env.example to find missing keys.
# Safe: read-only, non-destructive.
# Usage: .\infra\scripts\check-env.ps1

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

$Pairs = @(
    @{ Example = "infra\env\backend.env.example";   Local = "backend\.env" },
    @{ Example = "infra\env\frontend.env.example";  Local = "frontend\.env.local" },
    @{ Example = "infra\env\worker.env.example";    Local = "services\ai-worker\.env" },
    @{ Example = "infra\env\worker.env.example";    Local = "services\queue-worker\.env" },
    @{ Example = "infra\env\worker.env.example";    Local = "services\notification\.env" },
    @{ Example = "infra\docker\.env.dev.example";   Local = "infra\docker\.env.dev" }
)

$AnyMissing = $false

foreach ($Pair in $Pairs) {
    $examplePath = Join-Path $Root $Pair.Example
    $localPath   = Join-Path $Root $Pair.Local

    if (-not (Test-Path $examplePath)) {
        Write-Warning "  [SKIP] Example not found: $($Pair.Example)"
        continue
    }

    $exampleKeys = (Get-Content $examplePath) |
        Where-Object { $_ -match "^[A-Z_][A-Z0-9_]*=" } |
        ForEach-Object { ($_ -split "=")[0] }

    if (-not (Test-Path $localPath)) {
        Write-Host "[MISSING FILE] $($Pair.Local)" -ForegroundColor Red
        Write-Host "  Run setup script: .\infra\scripts\setup.ps1" -ForegroundColor Yellow
        $AnyMissing = $true
        continue
    }

    $localKeys = (Get-Content $localPath) |
        Where-Object { $_ -match "^[A-Z_][A-Z0-9_]*=" } |
        ForEach-Object { ($_ -split "=")[0] }

    $missing = $exampleKeys | Where-Object { $_ -notin $localKeys }
    $extra   = $localKeys   | Where-Object { $_ -notin $exampleKeys }

    if ($missing.Count -eq 0) {
        Write-Host "[OK] $($Pair.Local)" -ForegroundColor Green
    } else {
        Write-Host "[MISSING KEYS] $($Pair.Local)" -ForegroundColor Red
        $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
        $AnyMissing = $true
    }

    if ($extra.Count -gt 0) {
        Write-Host "  [INFO] Extra keys (not in example — may be OK): $($extra -join ', ')" -ForegroundColor DarkGray
    }
}

if ($AnyMissing) {
    Write-Host ""
    Write-Host "Fix: copy missing keys from infra/env/*.env.example into your local .env file." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host ""
    Write-Host "All env files look good." -ForegroundColor Green
    exit 0
}
