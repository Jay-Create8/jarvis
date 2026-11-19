#!/usr/bin/env node
/* =====================================================================
   JARVIS für Claude (5.9.6) – MCP-Server für die Claude-App (Windows/Mac)
   Gibt Claude die „Hände“ von JARVIS auf deinem Computer: Dateien (ganzer Benutzerordner), Programme, Lautstärke, Musik,
   Bildschirm (nur auf Wunsch), Systemzustand. Läuft lokal, braucht keinen API-Key – Claude Pro reicht.
   Sicherheit: nie in System-/Programm-/versteckten Ordnern; Löschen, Duplikate entfernen, Papierkorb leeren, Programme/Skripte
   starten und Herunterfahren fragen IMMER per Fenster auf deinem Bildschirm – das bestätigt nur ein Mensch, nicht die KI.
   Protokoll: MCP über stdio (JSON-RPC 2.0, eine Nachricht pro Zeile). Keine Pakete nötig – nur Node.js (bringt die Claude-App mit).
   ===================================================================== */
import { createInterface } from 'node:readline';
import { spawn } from 'node:child_process';
import { FILE_ACTIONS, needsConfirm } from './dateien.mjs';
import { PC_ACTIONS, needsConfirmPc, askHuman as ask } from './computer.mjs';

const VERSION = '5.9.7';
const log = (...a) => process.stderr.write('[jarvis] ' + a.join(' ') + '\n');   // stdout belongs to the protocol
const send = (m) => process.stdout.write(JSON.stringify(m) + '\n');

import { TOOLS, BY } from './mcp-tools.mjs';
const INSTRUCTIONS = 'JARVIS-Werkzeuge für diesen Computer. Nutze sie direkt, statt zu sagen, dass du keinen Zugriff hast. Sortieren, Verschieben und Umbenennen sind umkehrbar (rueckgaengig) – einfach machen und kurz sagen, was passiert ist. Löschen, Duplikate entfernen, Papierkorb leeren, Programme starten und Herunterfahren bestätigt der Nutzer selbst per Fenster auf seinem Bildschirm. Bildschirmfotos nur, wenn der Nutzer es möchte.';

async function call(name, args = {}) {
  const target = BY[name]; if (!target) throw new Error('Unbekanntes Werkzeug: ' + name);
  const [kind, action] = target.split(':'); const table = kind === 'datei' ? FILE_ACTIONS : PC_ACTIONS; const confirm = kind === 'datei' ? needsConfirm : needsConfirmPc;
  const f = table[action]; if (!f) throw new Error('Aktion fehlt: ' + action);
  if (confirm(action, args)) {
    const was = action === 'löschen' ? 'Diese Dateien in den JARVIS-Papierkorb verschieben (rückgängig möglich)?\n\n' + [].concat(args.pfade || []).join('\n')
      : action === 'duplikate_entfernen' ? `Doppelte Dateien in „${args.pfad || 'Downloads'}“ in den JARVIS-Papierkorb verschieben? Je eine (die älteste) bleibt.`
      : action === 'papierkorb_leeren' ? 'Den JARVIS-Papierkorb ENDGÜLTIG leeren? Das kann nicht rückgängig gemacht werden.'
      : action === 'herunterfahren' ? `Den Computer in 60 Sekunden ${args.art === 'neustart' ? 'NEU STARTEN' : 'HERUNTERFAHREN'}?`
      : 'Dieses Programm/Skript starten?\n\n' + (args.pfad || '');
    log('frage den Nutzer:', action);
    if (!(await ask('Claude (JARVIS) möchte:\n\n' + was))) return { content: [{ type: 'text', text: JSON.stringify({ abgebrochen: true, grund: 'Der Nutzer hat im Bestätigungsfenster NEIN gewählt (oder es geschlossen). Nichts wurde ausgeführt.' }) }] };
  }
  const r = await f(args);
  if (r && typeof r === 'object') { delete r._log; delete r._namen; }
  if (r?.bild) return { content: [{ type: 'image', data: r.bild.split(',')[1], mimeType: 'image/jpeg' }, { type: 'text', text: 'Bildschirmfoto (aktuell, nicht gespeichert).' }] };
  return { content: [{ type: 'text', text: JSON.stringify(r, null, 1) }] };
}

/* ---------- MCP over stdio ---------- */
const rl = createInterface({ input: process.stdin });
rl.on('line', async (line) => {
  if (!line.trim()) return;
  let m; try { m = JSON.parse(line); } catch { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
  const { id, method, params = {} } = m; if (id === undefined || id === null) return;   // notifications need no answer
  const ok = (result) => send({ jsonrpc: '2.0', id, result }), fail = (code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });
  try {
    if (method === 'initialize') return ok({ protocolVersion: params.protocolVersion || '2025-06-18', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'jarvis-computer', title: 'JARVIS – dein Computer', version: VERSION }, instructions: INSTRUCTIONS });
    if (method === 'ping') return ok({});
    if (method === 'tools/list') return ok({ tools: TOOLS });
    if (method === 'tools/call') {
      try { return ok(await call(params.name, params.arguments || {})); }
      catch (e) { return ok({ content: [{ type: 'text', text: 'Fehler: ' + String(e?.message || e).slice(0, 400) }], isError: true }); }
    }
    if (method === 'resources/list') return ok({ resources: [] });
    if (method === 'prompts/list') return ok({ prompts: [] });
    return fail(-32601, 'Method not found: ' + method);
  } catch (e) { fail(-32603, String(e?.message || e)); }
});
rl.on('close', () => process.exit(0));
log(`JARVIS für Claude ${VERSION} bereit (${TOOLS.length} Werkzeuge)`);
