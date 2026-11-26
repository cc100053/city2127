@echo off
rem One-click exhibition start on Windows. Opens ?survey&quality=low plus the admin page. Options: -Full -Kiosk -NoBrowser -NoAdmin -Local (see scripts\start-windows.ps1).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-windows.ps1" %*
pause
