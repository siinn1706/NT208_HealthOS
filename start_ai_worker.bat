@echo off
setlocal

echo === HealthOS - Start AI Worker (port 8001) ===
cd /d "%~dp0services\ai-worker"

if not exist .venv (
  python -m venv .venv
)
call .venv\Scripts\Activate.bat
pip install -r requirements.txt -q
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
