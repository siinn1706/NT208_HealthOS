@echo off
setlocal
echo Starting HealthOS infrastructure (Redis + PostgreSQL)...
call "%~dp0start_infra.bat"
echo.
echo Starting FE and BE...
start "FE" cmd /k "%~dp0start_fe.bat"
start "BE" cmd /k "%~dp0start_be.bat"
