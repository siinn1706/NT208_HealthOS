@echo off
setlocal
cd /d "%~dp0frontend"
echo Installing/updating FE dependencies from package.json...
call npm install
call npm run dev
pause