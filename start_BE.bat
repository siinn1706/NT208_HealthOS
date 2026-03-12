@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra\scripts\start_be.ps1" %*
exit /b %errorlevel%