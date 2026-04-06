@echo off
call "%~dp0infra\scripts\run-service.bat" start_all.ps1 start_all %*
exit /b %ERRORLEVEL%
