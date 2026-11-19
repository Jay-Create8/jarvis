/* =====================================================================
   JARVIS – Werkzeuge für Claude (geteilt von mcp.mjs in der Claude-App-Erweiterung und dem JARVIS-Server für die Claude-Verbindung)
   Nur Daten, kein Dateizugriff – darf auch im Cloudflare-Server geladen werden.
   ===================================================================== */
/* ---------- the tools Claude sees ---------- */
const S = (props, req = []) => ({ type: 'object', properties: props, required: req });
const str = (d) => ({ type: 'string', description: d }), arr = (d) => ({ type: 'array', items: { type: 'string' }, description: d });
const PFAD = 'Pfad: "Downloads", "Desktop/Schule", "Dokumente/…", "~/…" oder absolut (auch D:\\…). Erlaubt ist der ganze Benutzerordner und weitere Laufwerke/USB-Sticks.';
const RO = { readOnlyHint: true }, CHANGE = { readOnlyHint: false, destructiveHint: false }, DESTR = { readOnlyHint: false, destructiveHint: true };
export const T = [
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
export const BY = Object.fromEntries(T.map(([name, target]) => [name, target]));
export const TOOLS = T.map(([name, , description, inputSchema, annotations]) => ({ name, description, inputSchema, annotations }));

// the same actions in the JARVIS app (pc_dateien / pc_steuerung with an aktion) and on the PC agent (datei:… / pc:…)
const APP_PC = { lautstärke: 'lautstaerke' };
export function toApp(name, args = {}) {
  const t = BY[name]; if (!t) return null; const [kind, action] = t.split(':');
  if (kind === 'datei') return { tool: 'pc_dateien', input: { ...args, aktion: action } };
  const input = { ...args, aktion: APP_PC[action] || action };
  if (action === 'lautstärke' || action === 'medien') { input.modus = args.aktion; input.aktion = APP_PC[action] || action; }
  return { tool: 'pc_steuerung', input };
}
export function toAgent(name, args = {}) {   // name is a granular tool or the app's pc_dateien / pc_steuerung
  if (BY[name]) return { aktion: BY[name], args };
  if (name === 'pc_dateien' && args.aktion) { const { aktion, ...rest } = args; return { aktion: 'datei:' + aktion, args: rest }; }
  if (name === 'pc_steuerung' && args.aktion) { const { aktion, modus, ...rest } = args; const a = aktion === 'lautstaerke' ? 'lautstärke' : aktion; return { aktion: 'pc:' + a, args: modus ? { ...rest, aktion: modus } : rest }; }
  return null;
}
