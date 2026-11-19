# Laedt Node.js als portable Version in diesen Ordner (keine Installation, keine Admin-Rechte). Wird vom Starter (.cmd) aufgerufen.
# Fest auf v24 (LTS bis 2028). 5.9.7.1: kein Umbenennen mehr - der Virenschutz haelt frisch entpackte Ordner oft kurz fest
# ("Zugriff verweigert"); der Starter benutzt den Ordner node-v24.22.3-win-x64 direkt.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$v = 'v24.22.3'
$a = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
$n = "node-$v-win-$a"
if (Test-Path "$n\node.exe") { Write-Host "Node.js $v ist schon da."; exit 0 }
Write-Host "Lade $n ..."
Invoke-WebRequest "https://nodejs.org/dist/$v/$n.zip" -OutFile node.zip -UseBasicParsing
Expand-Archive node.zip -DestinationPath . -Force
Remove-Item node.zip -ErrorAction SilentlyContinue
if (-not (Test-Path "$n\node.exe")) { throw "node.exe fehlt nach dem Entpacken" }
Write-Host "Node.js $v bereit."
