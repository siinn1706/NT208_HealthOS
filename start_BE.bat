@echo off
call "%~dp0infra\scripts\run-service.bat" start_be.ps1 be %*
exit /b %ERRORLEVEL%
