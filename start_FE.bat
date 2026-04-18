@echo off
call "%~dp0infra\scripts\run-service.bat" start_fe.ps1 fe %*
exit /b %ERRORLEVEL%
