@echo off
call "%~dp0infra\scripts\run-service.bat" start_notification.ps1 notification %*
exit /b %ERRORLEVEL%
