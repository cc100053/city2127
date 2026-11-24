@echo off
rem One-click exhibition start on Windows. Options: -Low -Kiosk -NoBrowser -Local (see scripts\start-windows.ps1).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-windows.ps1" %*
pause
