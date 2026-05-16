@echo off
title SKY MOBILES Server
cd /d "%~dp0"
set NODE=%LOCALAPPDATA%\Programs\cursor\resources\app\resources\helpers\node.exe

if not exist "%NODE%" (
  echo Node.js not found. Open index.html directly or install Node.js.
  start "" "%~dp0index.html"
  pause
  exit /b 1
)

echo.
echo  Starting SKY MOBILES...
echo  Keep this window open while using the app.
echo.

start http://localhost:5173/sky-mobiles/
"%NODE%" "%~dp0serve.js"
pause
