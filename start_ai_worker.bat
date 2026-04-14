@echo off
call "%~dp0infra\scripts\run-service.bat" start_ai_worker.ps1 ai %*
exit /b %ERRORLEVEL%
