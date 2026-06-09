param([switch]$SkipInstall, [switch]$CheckOnly, [string]$LogFile)

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$EnvFile = Join-Path $Root "services\ai-worker\.env"
$ModelScript = Join-Path $PSScriptRoot "download-ai-model.ps1"

# Ensure the YOLO model is present before booting. The download script is
# idempotent: it skips when the on-disk SHA256 matches the configured value.
# Skipped in -CheckOnly mode and when the worker .env is missing (orchestrator
# is expected to render env files first via sync-env.ps1).
if (-not $CheckOnly -and (Test-Path $EnvFile) -and (Test-Path $ModelScript)) {
    try {
        & $ModelScript
    }
    catch {
        Write-Warning "[AI Worker] Model bootstrap failed: $($_.Exception.Message). Continuing — readiness probe will return 503 until the model is available."
    }
}

& (Join-Path $PSScriptRoot "start-python-service.ps1") `
    -ServiceName "AI Worker" `
    -ServiceDir (Join-Path $Root "services\ai-worker") `
    -LogPrefix "ai" `
    -StartCommand "uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload" `
    -SkipInstall:$SkipInstall -CheckOnly:$CheckOnly -LogFile $LogFile
