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
import { PC_ACTIONS, needsConfirmPc } from './computer.mjs';

const VERSION = '5.9.6';
const log = (...a) => process.stderr.write('[jarvis] ' + a.join(' ') + '\n');   // stdout belongs to the protocol
const send = (m) => process.stdout.write(JSON.stringify(m) + '\n');

/* ---------- human confirmation: a real dialog on the user's screen (the AI cannot click it) ---------- */
function ask(message) {
  const t = process.env.JARVIS_TEST_CONFIRM; if (t) return Promise.resolve(/^(ja|yes|1)$/i.test(t));   // tests only
  const p = process.env.JARVIS_PLATFORM || process.platform;
  const [cmd, args] = p === 'win32'
    ? ['powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.Form -Property @{TopMost=$true}; $r = [System.Windows.Forms.MessageBox]::Show($f, $env:JV_MSG, 'JARVIS - Bestaetigung', 'YesNo', 'Warning', 'Button2'); $f.Dispose(); if ($r -eq 'Yes') { 'JA' } else { 'NEIN' }"]]
    : p === 'darwin' ? ['osascript', ['-e', 'display dialog (system attribute "JV_MSG") with title "JARVIS – Bestätigung" buttons {"Nein", "Ja"} default button "Nein" with icon caution', '-e', 'if button returned of result is "Ja" then return "JA"']]
    : ['zenity', ['--question', '--title=JARVIS – Bestätigung', '--text', message]];
  return new Promise((res) => {
    let out = ''; const ch = spawn(cmd, args, { env: { ...process.env, JV_MSG: message }, windowsHide: false });
    ch.stdout.on('data', (d) => { out += d; }); ch.on('error', () => res(false));
    ch.on('close', (code) => res(p === 'linux' ? code === 0 : /JA/.test(out)));
  });
}

/* ---------- the tools Claude sees ---------- */
const S = (props, req = []) => ({ type: 'object', properties: props, required: req });
const str = (d) => ({ type: 'string', description: d }), arr = (d) => ({ type: 'array', items: { type: 'string' }, description: d });
const PFAD = 'Pfad: "Downloads", "Desktop/Schule", "Dokumente/…", "~/…" oder absolut (auch D:\\…). Erlaubt ist der ganze Benutzerordner und weitere Laufwerke/USB-Sticks.';
const RO = { readOnlyHint: true }, CHANGE = { readOnlyHint: false, destructiveHint: false }, DESTR = { readOnlyHint: false, destructiveHint: true };
const T = [
  // files
  ['dateien_ordner', 'datei:ordner', 'Bekannte Ordner des Nutzers (Downloads, Desktop, Dokumente, Bilder, OneDrive …) mit ihren echten Pfaden.', S({}), RO],
  ['dateien_liste', 'datei:liste', 'Zeigt, was in einem Ordner liegt: Anzahl, Grösse, Typen, Jahre, grösste Dateien, Unterordner (tief=true zählt alle Unterordner mit). ' + PFAD, S({ pfad: str('Ordner'), tief: { type: 'boolean' } }), RO],
  ['dateien_suchen', 'datei:suchen', 'Sucht Dateien und Ordner nach Namen im ganzen Benutzerordner (z.B. „bewerbung“). ' + PFAD, S({ muster: str('Wörter im Namen'), pfad: str('wo suchen (Standard: ganzer Benutzerordner)') }, ['muster']), RO],
  ['dateien_sortieren', 'datei:sortieren', 'Räumt einen Ordner auf: Dateien direkt im Ordner kommen in Unterordner nach Typ (Bilder, Dokumente, Videos …), Jahr oder Monat – oder nach eigenen Regeln {"Ordnername":["pdf","docx"]}. Jede Verschiebung wird geprüft, Unterordner und Verknüpfungen bleiben, alles ist mit rueckgaengig umkehrbar. vorschau=true zeigt nur den Plan.', S({ pfad: str('Ordner (Standard Downloads)'), nach: { type: 'string', enum: ['typ', 'jahr', 'monat'] }, regeln: { type: 'object', description: 'eigene Ordner → Dateiendungen' }, vorschau: { type: 'boolean' } }), CHANGE],
  ['dateien_verschieben', 'datei:verschieben', 'Verschiebt Dateien/Ordner in einen Zielordner (wird angelegt; bei gleichem Namen „name (2)“). Umkehrbar. ' + PFAD, S({ quellen: arr('Dateien/Ordner'), ziel: str('Zielordner') }, ['quellen', 'ziel']), CHANGE],
  ['datei_umbenennen', 'datei:umbenennen', 'Benennt eine Datei oder einen Ordner um (umkehrbar).', S({ pfad: str('Datei/Ordner'), neuer_name: str('neuer Name') }, ['pfad', 'neuer_name']), CHANGE],
  ['ordner_erstellen', 'datei:ordner_erstellen', 'Legt einen Ordner an. ' + PFAD, S({ pfad: str('neuer Ordner') }, ['pfad']), CHANGE],
  ['datei_lesen', 'datei:lesen', 'Liest den Text einer Datei: Text, Word (.docx), PowerPoint (.pptx) – zum Zusammenfassen, Lernen, Prüfen.', S({ pfad: str('Datei') }, ['pfad']), RO],
  ['datei_oeffnen', 'datei:öffnen', 'Öffnet eine Datei, einen Ordner oder Link mit dem passenden Programm am Computer. Programme/Skripte (.exe, .bat …) fragen den Nutzer per Fenster.', S({ pfad: str('Datei/Ordner'), url: str('oder ein http(s)-Link') }), CHANGE],
  ['dateien_loeschen', 'datei:löschen', 'Löscht Dateien – sie kommen in den Ordner „JARVIS-Papierkorb“ (umkehrbar). Der Nutzer bestätigt IMMER selbst per Fenster.', S({ pfade: arr('Dateien/Ordner') }, ['pfade']), DESTR],
  ['duplikate_finden', 'datei:duplikate', 'Findet doppelte Dateien (gleicher Inhalt, auch in Unterordnern) und wie viel Platz sie belegen.', S({ pfad: str('Ordner (Standard Downloads)'), tief: { type: 'boolean' } }), RO],
  ['duplikate_entfernen', 'datei:duplikate_entfernen', 'Entfernt doppelte Dateien – je eine (die älteste) bleibt, der Rest kommt in den JARVIS-Papierkorb. Der Nutzer bestätigt IMMER per Fenster.', S({ pfad: str('Ordner (Standard Downloads)') }), DESTR],
  ['papierkorb_leeren', 'datei:papierkorb_leeren', 'Leert den JARVIS-Papierkorb endgültig und macht den Platz frei – nicht umkehrbar. Der Nutzer bestätigt IMMER per Fenster.', S({}), DESTR],
  ['rueckgaengig', 'datei:rückgängig', 'Macht die letzte Datei-Aktion rückgängig (Sortieren, Verschieben, Umbenennen, Löschen in den JARVIS-Papierkorb).', S({}), CHANGE],
  // computer
  ['programme_liste', 'pc:apps', 'Installierte Programme (Startmenü), optional gefiltert.', S({ suche: str('Teil des Namens') }), RO],
  ['programm_oeffnen', 'pc:app_öffnen', 'Öffnet ein Programm, z.B. Word, Excel, Spotify, Discord, Minecraft, Rechner, Einstellungen, Explorer.', S({ name: str('Programmname') }, ['name']), CHANGE],
  ['fenster_liste', 'pc:fenster', 'Welche Programme/Fenster gerade offen sind.', S({}), RO],
  ['fenster_schliessen', 'pc:fenster_schliessen', 'Schliesst ein Programm höflich (es fragt selbst nach Speichern).', S({ name: str('Programm oder Fenstertitel') }, ['name']), CHANGE],
  ['lautstaerke', 'pc:lautstärke', 'Lautstärke: setzen (wert 0–100), lauter, leiser (wert = Prozent-Schritte) oder stumm.', S({ aktion: { type: 'string', enum: ['setzen', 'lauter', 'leiser', 'stumm'] }, wert: { type: 'number' } }, ['aktion']), CHANGE],
  ['medien', 'pc:medien', 'Musik/Videos steuern wie mit den Medientasten: play_pause, weiter, zurück.', S({ aktion: { type: 'string', enum: ['play_pause', 'weiter', 'zurück'] } }, ['aktion']), CHANGE],
  ['bildschirmfoto', 'pc:bildschirm', 'Macht ein Bildschirmfoto, damit du siehst, was auf dem Bildschirm ist – NUR wenn der Nutzer das will („schau mal“, „was ist auf meinem Bildschirm“). Wird nicht gespeichert.', S({}), RO],
  ['systemzustand', 'pc:system', 'Festplatten (frei/voll), Akku, Arbeitsspeicher, Prozessor-Last und Warnungen (z.B. Festplatte fast voll).', S({}), RO],
  ['text_schreiben', 'pc:schreiben', 'Schreibt Text in ein Programm (z.B. Word, E-Mail) – über die Zwischenablage. fenster = Titel/Programm, sonst das zuletzt benutzte Fenster.', S({ text: str('Text'), fenster: str('Zielfenster (optional)') }, ['text']), CHANGE],
  ['zwischenablage', 'pc:zwischenablage', 'Liest die Zwischenablage oder setzt sie (text).', S({ text: str('neuer Inhalt (leer = lesen)') }), CHANGE],
  ['bildschirm_sperren', 'pc:sperren', 'Sperrt den Computer.', S({}), CHANGE],
  ['herunterfahren', 'pc:herunterfahren', 'Fährt den Computer in 60 s herunter oder startet neu; abbrechen stoppt das. Fragt IMMER per Fenster.', S({ art: { type: 'string', enum: ['aus', 'neustart', 'abbrechen'] } }, ['art']), DESTR],
  ['jarvis_app_oeffnen', 'pc:app_fenster', 'Öffnet die JARVIS-App (Hologramm-Oberfläche) als eigenes Fenster.', S({ vollbild: { type: 'boolean' } }), CHANGE],
];
const BY = Object.fromEntries(T.map(([name, target]) => [name, target]));
const TOOLS = T.map(([name, , description, inputSchema, annotations]) => ({ name, description, inputSchema, annotations }));
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
