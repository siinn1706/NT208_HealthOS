@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra\scripts\reset-docker.ps1" %*
