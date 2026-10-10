@echo off
rem Double-click to render all five Rock Bottom episodes (see render_all.ps1 for options).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0render_all.ps1" %*
pause
