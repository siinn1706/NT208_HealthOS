param([switch]$SkipInstall, [switch]$CheckOnly, [string]$LogFile)

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
& (Join-Path $PSScriptRoot "start-python-service.ps1") `
    -ServiceName "Queue Worker" `
    -ServiceDir (Join-Path $Root "backend") `
    -LogPrefix "queue" `
    -StartCommand "celery -A app.tasks:celery_app worker --loglevel=info --pool=solo" `
    -SkipInstall:$SkipInstall -CheckOnly:$CheckOnly -LogFile $LogFile
