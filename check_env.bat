@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra\scripts\check-env.ps1" %*
