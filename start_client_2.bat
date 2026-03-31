@echo off
setlocal
echo [WARN] This script runs the frontend on port 3002.
echo [WARN] Backend ALLOWED_ORIGINS must include http://localhost:3002 for CORS to work.
cd /d "%~dp0frontend"
if exist package-lock.json (
    npm ci
) else (
    npm install
)
npm run dev -- --port 3002
