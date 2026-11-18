@echo off
rem JARVIS einrichten (Windows) - Doppelklick. Braucht KEINE Admin-Rechte: Node.js kommt bei Bedarf als portable Version.
setlocal
cd /d "%~dp0"
if not exist "%~dp0einrichten.mjs" goto entpacken
where node >nul 2>nul || goto noSys
set "NODEMAJOR="
for /f "usebackq delims=" %%v in (`node -p "parseInt(process.versions.node)"`) do set "NODEMAJOR=%%v"
if "%NODEMAJOR%"=="" goto noSys
if %NODEMAJOR% GEQ 20 if %NODEMAJOR% LEQ 24 goto haveNode
:noSys
if exist "%~dp0node\node.exe" goto portable
if exist "%~dp0..\desktop-agent\node\node.exe" (set "PATH=%~dp0..\desktop-agent\node;%PATH%" & goto haveNode)
echo Lade Node.js als portable Version - keine Installation, keine Admin-Rechte noetig ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0node-holen.ps1"
if exist "%~dp0node\node.exe" goto portable
echo PowerShell ging nicht - ich versuche es mit curl und tar ...
curl.exe -fL -o node.zip https://nodejs.org/dist/v24.22.3/node-v24.22.3-win-x64.zip
if errorlevel 1 goto fehler
tar.exe -xf node.zip
if errorlevel 1 goto fehler
if exist node rmdir /s /q node
ren node-v24.22.3-win-x64 node
del node.zip
if not exist "%~dp0node\node.exe" goto fehler
:portable
set "PATH=%~dp0node;%PATH%"
:haveNode
if exist "%~dp0.bereit" goto start
call npm install --no-audit --no-fund
if errorlevel 1 goto fehler
echo ok> "%~dp0.bereit"
:start
call npm start
pause
exit /b 0
:entpacken
echo Bitte zuerst den ZIP-Ordner entpacken: Rechtsklick auf die ZIP-Datei - "Alle extrahieren", dann im entpackten Ordner doppelklicken.
pause
exit /b 1
:fehler
echo.
echo Das hat nicht geklappt. Auf Schul- oder Firmen-Laptops sperrt die IT so etwas manchmal - dann bitte dort nachfragen.
pause
exit /b 1
