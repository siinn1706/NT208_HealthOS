@echo off
setlocal
cd /d "%~dp0frontend"
if not exist node_modules (
  npm install
)
npm run dev -- --port 3001
