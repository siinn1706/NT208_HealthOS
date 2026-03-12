@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra\scripts\start_infra.ps1" -Mode auto %*
exit /b %errorlevel%