# sync-env-secrets.ps1
# Sync .env files between repo and docs/secret (internal use only)
#
# Usage:
#   .\sync-env-secrets.ps1            # Backup: repo → docs/secret
#   .\sync-env-secrets.ps1 -Restore   # Restore: docs/secret → repo
#   .\sync-env-secrets.ps1 -Status    # Show sync status

param(
    [switch]$Restore,
    [switch]$Status
)

$ROOT       = Split-Path -Parent $PSScriptRoot
$SECRET_DIR = Join-Path $PSScriptRoot "secret"

# Map: repo path → secret path (relative to ROOT and SECRET_DIR)
$ENV_FILES = @(
    "backend\.env",
    "frontend\.env.local",
    "services\ai-worker\.env",
    "services\notification\.env",
    "services\queue-worker\.env",
    "infra\env\backend.env",
    "infra\env\frontend.env",
    "infra\env\worker.env"
)

function Write-Header([string]$msg) {
    Write-Host "`n$msg" -ForegroundColor Cyan
    Write-Host ("-" * 50) -ForegroundColor DarkGray
}

function Backup-EnvFiles {
    Write-Header "BACKUP: repo → docs/secret"
    $count = 0

    foreach ($rel in $ENV_FILES) {
        $src  = Join-Path $ROOT $rel
        $dest = Join-Path $SECRET_DIR $rel

        if (-not (Test-Path $src)) {
            Write-Host "  [SKIP]    $rel  (not found in repo)" -ForegroundColor Yellow
            continue
        }

        $destDir = Split-Path -Parent $dest
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Force -Path $destDir | Out-Null
        }

        Copy-Item -Path $src -Destination $dest -Force
        Write-Host "  [OK]      $rel" -ForegroundColor Green
        $count++
    }

    Write-Host "`n  $count file(s) backed up to: docs/secret" -ForegroundColor White
}

function Restore-EnvFiles {
    Write-Header "RESTORE: docs/secret → repo"

    if (-not (Test-Path $SECRET_DIR)) {
        Write-Host "  [ERROR] docs/secret not found. Run backup first." -ForegroundColor Red
        exit 1
    }

    $count = 0
    foreach ($rel in $ENV_FILES) {
        $src  = Join-Path $SECRET_DIR $rel
        $dest = Join-Path $ROOT $rel

        if (-not (Test-Path $src)) {
            Write-Host "  [SKIP]    $rel  (not in docs/secret)" -ForegroundColor Yellow
            continue
        }

        $destDir = Split-Path -Parent $dest
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Force -Path $destDir | Out-Null
        }

        Copy-Item -Path $src -Destination $dest -Force
        Write-Host "  [OK]      $rel" -ForegroundColor Green
        $count++
    }

    Write-Host "`n  $count file(s) restored to repo" -ForegroundColor White
}

function Show-Status {
    Write-Header "STATUS: repo vs docs/secret"

    foreach ($rel in $ENV_FILES) {
        $repoPath   = Join-Path $ROOT $rel
        $secretPath = Join-Path $SECRET_DIR $rel
        $inRepo     = Test-Path $repoPath
        $inSecret   = Test-Path $secretPath

        if ($inRepo -and $inSecret) {
            $repoTime   = (Get-Item $repoPath).LastWriteTime
            $secretTime = (Get-Item $secretPath).LastWriteTime
            $diff       = ($repoTime - $secretTime).TotalSeconds

            if ([Math]::Abs($diff) -lt 5) {
                $tag = "[SYNCED]  "
                $color = "Green"
            } elseif ($diff -gt 0) {
                $tag = "[REPO NEW]"
                $color = "Yellow"
            } else {
                $tag = "[SEC NEW] "
                $color = "Magenta"
            }
        } elseif ($inRepo -and -not $inSecret) {
            $tag = "[NO BACKUP]"
            $color = "Yellow"
        } elseif (-not $inRepo -and $inSecret) {
            $tag = "[NO REPO]"
            $color = "Magenta"
        } else {
            $tag = "[MISSING]"
            $color = "DarkGray"
        }

        Write-Host "  $tag  $rel" -ForegroundColor $color
    }
    Write-Host ""
}

# --- Main ---
if ($Status) {
    Show-Status
} elseif ($Restore) {
    Restore-EnvFiles
} else {
    Backup-EnvFiles
}
