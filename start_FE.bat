@echo off
setlocal
cd /d "%~dp0frontend"
echo Installing/updating FE dependencies from package.json...
call npm install

@REM echo Optimizing SVG assets and generating pattern thumbnails...
@REM call npm run optimize:assets

echo Starting Next.js dev server...
call npm run dev
pause