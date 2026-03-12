@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra\scripts\start_ai_worker.ps1" %*
exit /b %errorlevel%