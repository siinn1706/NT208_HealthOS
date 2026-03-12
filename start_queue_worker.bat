@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra\scripts\start_queue_worker.ps1" %*
exit /b %errorlevel%