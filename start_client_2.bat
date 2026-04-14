@echo off
call "%~dp0infra\scripts\run-service.bat" start_client.ps1 client -Port 3002 %*
exit /b %ERRORLEVEL%
