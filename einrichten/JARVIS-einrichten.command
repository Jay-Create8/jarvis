#!/bin/sh
# JARVIS einrichten (Mac/Linux) - Doppelklick bzw. ./JARVIS-einrichten.command
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Bitte zuerst Node.js installieren: https://nodejs.org (LTS)"; read x; exit 1; }
npm install --no-audit --no-fund && npm start
