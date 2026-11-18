#!/bin/bash
# JARVIS einrichten (Mac/Linux) - Doppelklick bzw. ./JARVIS-einrichten.command
# Braucht KEINE Admin-Rechte: Node.js kommt bei Bedarf als portable Version in diesen Ordner.
cd "$(dirname "$0")" || exit 1
# vorhandenes Node.js 20–24 nutzen, sonst portable v24
nm=$(command -v node >/dev/null 2>&1 && node -p "parseInt(process.versions.node)" 2>/dev/null)
if [ -z "$nm" ] || [ "$nm" -lt 20 ] || [ "$nm" -gt 24 ]; then
  if [ -x ../desktop-agent/node/bin/node ] && [ ! -x node/bin/node ]; then export PATH="$PWD/../desktop-agent/node/bin:$PATH"
  else
    if [ ! -x node/bin/node ]; then
      echo "Lade Node.js als portable Version – keine Installation, keine Admin-Rechte nötig …"
      v=v24.22.3
      case "$(uname -s)-$(uname -m)" in Darwin-arm64) p=darwin-arm64;; Darwin-*) p=darwin-x64;; Linux-aarch64) p=linux-arm64;; *) p=linux-x64;; esac
      { [ -n "$v" ] && curl -fL "https://nodejs.org/dist/$v/node-$v-$p.tar.gz" -o node.tgz && mkdir -p node && tar -xzf node.tgz -C node --strip-components=1 && rm -f node.tgz; } || { echo "Download fehlgeschlagen."; read -r; exit 1; }
      echo "Node.js $v bereit."
    fi
    export PATH="$PWD/node/bin:$PATH"
  fi
fi
if [ ! -f .bereit ]; then npm install --no-audit --no-fund || { echo "Hat nicht geklappt (Schul-/Firmengerät? Dann IT fragen)."; read -r; exit 1; }; echo ok > .bereit; fi
npm start
