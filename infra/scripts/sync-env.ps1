# HealthOS - Env Sync Script (Windows PowerShell)
# Syncs local .env files with infra/env/*.env.example:
#   - Creates missing .env files from examples
#   - Adds new keys from examples (with default values) to existing .env files
#   - Preserves existing local key values
#   - Preserves comments and blank lines in local files
# Usage: .\infra\scripts\sync-env.ps1

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

function Get-EnvKeys {
    param([string]$FilePath)
    $keys = [ordered]@{}
    foreach ($line in (Get-Content $FilePath)) {
        if ($line -match "^([A-Z_][A-Z0-9_]*)=(.*)$") {
            $keys[$Matches[1]] = $Matches[2]
        }
    }
    return $keys
}

$AnyChanged = $false

foreach ($Pair in $Pairs) {
    $examplePath = Join-Path $Root $Pair.Example
    $localPath   = Join-Path $Root $Pair.Local

    if (-not (Test-Path $examplePath)) {
        Write-Warning "  [SKIP] Example not found: $($Pair.Example)"
        continue
    }

    # If local file doesn't exist, copy the whole example
    if (-not (Test-Path $localPath)) {
        $localDir = Split-Path $localPath -Parent
        if (-not (Test-Path $localDir)) {
            New-Item -ItemType Directory -Path $localDir -Force | Out-Null
        }
        Copy-Item $examplePath $localPath
        Write-Host "[CREATED] $($Pair.Local)" -ForegroundColor Green
        $AnyChanged = $true
        continue
    }

    # Compare keys: find new ones in example that are missing locally
    $exampleKeys = Get-EnvKeys $examplePath
    $localKeys   = Get-EnvKeys $localPath

    $newKeys = @()
    foreach ($key in $exampleKeys.Keys) {
        if (-not $localKeys.Contains($key)) {
            $newKeys += $key
        }
    }

    if ($newKeys.Count -eq 0) {
        Write-Host "[OK] $($Pair.Local)" -ForegroundColor Green
        continue
    }

    # Append missing keys with their example default values
    $appendLines = @("")
    $appendLines += "# --- Added by sync-env $(Get-Date -Format 'yyyy-MM-dd') ---"
    foreach ($key in $newKeys) {
        $appendLines += "$key=$($exampleKeys[$key])"
    }

    Add-Content -Path $localPath -Value ($appendLines -join "`n") -Encoding UTF8
    Write-Host "[SYNCED] $($Pair.Local) - added $($newKeys.Count) key(s): $($newKeys -join ', ')" -ForegroundColor Yellow
    $AnyChanged = $true
}

if ($AnyChanged) {
    Write-Host ""
    Write-Host "Env sync complete. Review new keys in your .env files." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "All env files up to date." -ForegroundColor Green
}

exit 0
