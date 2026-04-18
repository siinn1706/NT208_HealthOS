param([switch]$SkipInstall, [switch]$CheckOnly, [string]$LogFile)

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
& (Join-Path $PSScriptRoot "start-python-service.ps1") `
    -ServiceName "Notification" `
    -ServiceDir (Join-Path $Root "services\notification") `
    -LogPrefix "notification" `
    -StartCommand "uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload" `
    -SkipInstall:$SkipInstall -CheckOnly:$CheckOnly -LogFile $LogFile
