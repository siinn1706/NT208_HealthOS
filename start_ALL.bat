@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra\scripts\start_all.ps1" %*
exit /b %errorlevel%
