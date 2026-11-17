@echo off
rem JARVIS einrichten (Windows) - Doppelklick
cd /d "%~dp0"
where node >nul 2>nul || (echo Bitte zuerst Node.js installieren: https://nodejs.org ^(LTS^) & pause & exit /b 1)
call npm install --no-audit --no-fund
call npm start
pause
