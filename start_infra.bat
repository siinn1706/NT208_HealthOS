@echo off
call "%~dp0infra\scripts\run-service.bat" start_infra.ps1 infra %*
exit /b %ERRORLEVEL%
