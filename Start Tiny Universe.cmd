@echo off
title Tiny Universe
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install Node.js 22.12 or newer, then try again.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo First run pnpm install or npm install in this folder.
  pause
  exit /b 1
)
echo Starting Tiny Universe. Keep this window open while you play.
node node_modules\vite\bin\vite.js --host 127.0.0.1 --open
pause
