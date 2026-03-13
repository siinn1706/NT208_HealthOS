@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "LOG_DIR=%SCRIPT_DIR%infra\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1
set "CI_FLAG=%CI%"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%i"
set "LOG_FILE=%LOG_DIR%\start_all_%TS%.log"

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%infra\scripts\start_all.ps1" -LogFile "%LOG_FILE%" %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo [ERROR] start_ALL failed with exit code %EXIT_CODE%.
  echo [ERROR] See log: "%LOG_FILE%"
  if /I not "%CI_FLAG%"=="true" if /I not "%CI_FLAG%"=="1" pause
)

exit /b %EXIT_CODE%
