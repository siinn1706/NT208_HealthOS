@echo off
call "%~dp0infra\scripts\run-service.bat" start_queue_worker.ps1 queue %*
exit /b %ERRORLEVEL%
