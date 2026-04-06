param([switch]$SkipInstall, [switch]$CheckOnly, [string]$LogFile)

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
& (Join-Path $PSScriptRoot "start-python-service.ps1") `
    -ServiceName "Queue Worker" `
    -ServiceDir (Join-Path $Root "services\queue-worker") `
    -LogPrefix "queue" `
    -StartCommand "celery -A app.celery_app worker --loglevel=info --pool=solo" `
    -SkipInstall:$SkipInstall -CheckOnly:$CheckOnly -LogFile $LogFile
