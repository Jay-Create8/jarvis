#!/bin/bash
# JARVIS PC-Agent – Doppelklick (Mac; beim ersten Mal Rechtsklick → Öffnen) bzw. ./PC-Agent-starten.command (Linux).
# Braucht KEINE Admin-Rechte: Node.js kommt bei Bedarf als portable Version in diesen Ordner,
# als Browser wird Chrome/Edge genommen, das schon installiert ist (sonst lädt der Agent einmalig Chromium).
cd "$(dirname "$0")" || exit 1
# vorhandenes Node.js 20–24 nutzen, sonst portable v24 (mit v26 hängt das Entpacken des Ersatz-Browsers – getestet)
nm=$(command -v node >/dev/null 2>&1 && node -p "parseInt(process.versions.node)" 2>/dev/null)
if [ -z "$nm" ] || [ "$nm" -lt 20 ] || [ "$nm" -gt 24 ]; then
  if [ ! -x node/bin/node ]; then
    echo "Lade Node.js als portable Version – keine Installation, keine Admin-Rechte nötig …"
    v=v24.22.3
    case "$(uname -s)-$(uname -m)" in Darwin-arm64) p=darwin-arm64;; Darwin-*) p=darwin-x64;; Linux-aarch64) p=linux-arm64;; *) p=linux-x64;; esac
    { [ -n "$v" ] && curl -fL "https://nodejs.org/dist/$v/node-$v-$p.tar.gz" -o node.tgz && mkdir -p node && tar -xzf node.tgz -C node --strip-components=1 && rm -f node.tgz; } || { echo "Download fehlgeschlagen."; read -r; exit 1; }
    echo "Node.js $v bereit."
  fi
  export PATH="$PWD/node/bin:$PATH"
fi
if [ ! -f .bereit ]; then
  echo "Erster Start: richte den PC-Agent ein (einmalig, ca. 1 Minute) …"
  npm install --no-audit --no-fund || { echo "Hat nicht geklappt (Schul-/Firmengerät? Dann IT fragen)."; read -r; exit 1; }
  echo ok > .bereit
fi
echo; echo "Den angezeigten Token in JARVIS unter Einstellungen → PC-Agent eintragen. Dieses Fenster offen lassen."
npm start
