@echo off
setlocal

echo === HealthOS - Start Queue Worker (Celery) ===
cd /d "%~dp0services\queue-worker"

if not exist .venv (
  python -m venv .venv
)
call .venv\Scripts\Activate.bat
pip install -r requirements.txt -q
celery -A app.celery_app worker --loglevel=info
