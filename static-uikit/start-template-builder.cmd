@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start-template-builder.ps1"
if errorlevel 1 (
  echo.
  echo Template Builder did not start.
  pause
)
endlocal
