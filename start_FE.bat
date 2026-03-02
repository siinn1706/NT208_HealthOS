@echo off
setlocal
cd /d "%~dp0frontend"
echo Installing/updating FE dependencies from package.json...
npm install
npm run dev
