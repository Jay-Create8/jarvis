# Quellcode der gebündelten Module (js/)
- `hud3d.mjs` → js/hud3d.js (3D-Kern), `windows.mjs` → js/windows.js (Fenster, Live-Engine, Widgets), `jv.mjs` → js/jv.js (Visual SDK), `three-entry.mjs` → js/three.js
Build (Node 20+): `npm i three@0.170.0 leaflet@1.9.4 chart.js@4.4.1 esbuild@0.24.0`, dann
`node build-jv.mjs` und `npx esbuild hud3d.mjs windows.mjs --bundle --splitting --format=esm --platform=browser --minify --outdir=../js`
