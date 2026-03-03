@echo off
setlocal
echo Starting HealthOS infrastructure (Redis + PostgreSQL) in a separate window...
start "INFRA" cmd /k "%~dp0start_infra.bat"
echo.
echo Starting FE and BE...
start "FE" cmd /k "%~dp0start_FE.bat"
start "BE" cmd /k "%~dp0start_BE.bat"
