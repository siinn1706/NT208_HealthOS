@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra\scripts\clean-fe.ps1" %*
