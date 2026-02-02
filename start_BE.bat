@echo off
setlocal
cd /d "%~dp0backend"
if not exist .venv (
  python -m venv .venv
)
call .venv\Scripts\Activate.bat
pip install -r requirements.txt
uvicorn app.main:app --reload
