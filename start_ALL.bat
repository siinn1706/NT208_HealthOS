@echo off
setlocal
start "FE" cmd /k "%~dp0start_fe.bat"
start "BE" cmd /k "%~dp0start_be.bat"
