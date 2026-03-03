@echo off
setlocal
cd /d "%~dp0backend"
if not exist .venv (
  python -m venv .venv
)
call .venv\Scripts\Activate.bat
pip install -r requirements.txt
echo [BE] Running database migrations...
alembic upgrade head
if %errorlevel% neq 0 (
  echo [BE] WARNING: alembic upgrade failed. Check DB connection and try again.
  echo [BE] Starting server anyway — some features may not work.
)
uvicorn app.main:app --reload
