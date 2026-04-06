param([switch]$SkipInstall, [switch]$CheckOnly, [string]$LogFile)

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
& (Join-Path $PSScriptRoot "start-python-service.ps1") `
    -ServiceName "AI Worker" `
    -ServiceDir (Join-Path $Root "services\ai-worker") `
    -LogPrefix "ai" `
    -StartCommand "uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload" `
    -SkipInstall:$SkipInstall -CheckOnly:$CheckOnly -LogFile $LogFile
