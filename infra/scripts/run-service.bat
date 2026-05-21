@echo off & setlocal EnableExtensions
set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%..\.."
set "LOG_DIR=%REPO_ROOT%\infra\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%i"
set "LOG_FILE=%LOG_DIR%\%~2_%TS%.log"
set "CI_FLAG=%CI%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%%~1" -LogFile "%LOG_FILE%" %3 %4 %5 %6 %7 %8 %9
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo. & echo [ERROR] %~2 failed, exit %EXIT_CODE%. Log: "%LOG_FILE%"
  if /I not "%CI_FLAG%"=="true" if /I not "%CI_FLAG%"=="1" pause
)
exit /b %EXIT_CODE%
