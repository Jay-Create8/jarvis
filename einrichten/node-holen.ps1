# Laedt Node.js als portable Version in diesen Ordner (keine Installation, keine Admin-Rechte). Wird vom Starter (.cmd) aufgerufen.
# Fest auf v24 (LTS bis 2028): mit v26 haengt das Entpacken des Ersatz-Browsers von Playwright 1.56 (getestet).
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$v = 'v24.22.3'
$a = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
$n = "node-$v-win-$a"
Write-Host "Lade $n ..."
Invoke-WebRequest "https://nodejs.org/dist/$v/$n.zip" -OutFile node.zip -UseBasicParsing
Expand-Archive node.zip -DestinationPath . -Force
if (Test-Path node) { Remove-Item node -Recurse -Force }
Rename-Item $n node
Remove-Item node.zip
Write-Host "Node.js $v bereit."
