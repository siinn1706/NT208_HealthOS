@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra\scripts\start_notification.ps1" %*
exit /b %errorlevel%