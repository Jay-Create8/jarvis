@echo off
rem JARVIS PC-Agent - Doppelklick. Braucht KEINE Admin-Rechte (vorhandenes Node.js 20-24 wird genutzt, sonst portable v24):
rem Node.js kommt bei Bedarf als portable Version in diesen Ordner, als Browser wird Edge/Chrome genommen, das schon auf dem PC ist.
setlocal
cd /d "%~dp0"
if not exist "%~dp0agent.mjs" goto entpacken
where node >nul 2>nul || goto noSys
set "NODEMAJOR="
for /f "usebackq delims=" %%v in (`node -p "parseInt(process.versions.node)"`) do set "NODEMAJOR=%%v"
if "%NODEMAJOR%"=="" goto noSys
if %NODEMAJOR% GEQ 20 if %NODEMAJOR% LEQ 24 goto haveNode
:noSys
if exist "%~dp0node\node.exe" goto portable
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
echo Erster Start: richte den PC-Agent ein (einmalig, ca. 1 Minute) ...
call npm install --no-audit --no-fund
if errorlevel 1 goto fehler
echo ok> "%~dp0.bereit"
:start
echo.
echo Den angezeigten Token in JARVIS unter Einstellungen - PC-Agent eintragen. Dieses Fenster offen lassen.
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
