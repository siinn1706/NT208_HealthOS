@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra\scripts\reset-be-venv.ps1" %*
