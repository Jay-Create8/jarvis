/* =====================================================================
   JARVIS PC-AGENT – den Computer bedienen (5.9.5)
   Programme öffnen/schliessen, Lautstärke, Musik, Bildschirm ansehen (nur auf Wunsch), sperren, Systemzustand
   (Festplatte, Akku, Speicher), Text ins aktive Fenster schreiben, Mit-Windows-starten, JARVIS als App-Fenster.
   Alles als normaler Benutzer – keine Admin-Rechte. Herunterfahren/Neustarten fragt IMMER.
   Windows wird über eingebaute Werkzeuge gesteuert (PowerShell, explorer.exe, rundll32), Mac über open/osascript.
   ===================================================================== */
import os from 'node:os';
import fs from 'node:fs/promises';
import { existsSync, readdirSync, statSync, statfsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PLAT = process.env.JARVIS_PLATFORM || process.platform;   // JARVIS_PLATFORM only for tests
const WIN = PLAT === 'win32', MAC = PLAT === 'darwin';
const TEST = !!process.env.JARVIS_TEST_OEFFNEN;                    // tests: return the command instead of running it
const HOME = os.homedir();
const AGENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_URL = process.env.JARVIS_APP_URL || 'https://jay-create8.github.io/jarvis/';

function run(cmd, args = [], { env = {}, timeout = 20000, effect = true } = {}) {
  if (TEST && effect) return Promise.resolve({ code: 0, out: '', test: { cmd, args, env } });
  return new Promise((res) => {
    let out = '', done = false;
    const ch = spawn(cmd, args, { env: { ...process.env, ...env }, windowsHide: true });
    const t = setTimeout(() => { try { ch.kill(); } catch {} finish(124); }, timeout);
    const finish = (code) => { if (done) return; done = true; clearTimeout(t); res({ code, out: out.trim() }); };
    ch.stdout?.on('data', (d) => { out += d; }); ch.stderr?.on('data', (d) => { out += d; });
    ch.on('error', (e) => { out += e.message; finish(127); }); ch.on('close', (c) => finish(c));
  });
}
// PowerShell: user text only ever goes in through environment variables (never into the script text)
const ps = (script, env = {}, opt = {}) => run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { env, ...opt });
const psFail = (r, what) => { if (r.code !== 0 && !r.test) throw new Error(`${what} ging nicht (Windows PowerShell: ${r.out.split('\n')[0].slice(0, 160) || 'Fehler ' + r.code}). Auf Schul-/Firmengeräten sperrt die IT das manchmal.`); return r; };
const detached = (cmd, args, opt = {}) => { if (TEST) return { test: { cmd, args } }; const ch = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: false, ...opt }); ch.on('error', () => {}); ch.unref(); return null; };

/* ---------- programs ---------- */
function startMenuDirs() {
  if (WIN) return [path.join(process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs')];
  if (MAC) return ['/Applications', '/System/Applications', path.join(HOME, 'Applications')];
  return ['/usr/share/applications', path.join(HOME, '.local', 'share', 'applications')];
}
function listApps() {
  const out = [];
  const walk = (d, depth) => { let l; try { l = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of l) { const p = path.join(d, e.name);
      if (MAC && e.name.endsWith('.app')) out.push({ name: e.name.slice(0, -4), p });
      else if (e.isDirectory() && depth < 3) walk(p, depth + 1);
      else if (WIN && /\.(lnk|url)$/i.test(e.name) && !/uninstall|deinstall|readme|hilfe|help|website/i.test(e.name)) out.push({ name: e.name.replace(/\.(lnk|url)$/i, ''), p });
      else if (!WIN && !MAC && e.name.endsWith('.desktop')) out.push({ name: e.name.slice(0, -8), p }); } };
  startMenuDirs().forEach((d) => walk(d, 0));
  const seen = new Set(); return out.filter((a) => !seen.has(a.name.toLowerCase()) && seen.add(a.name.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
}
// well-known Windows programs and pages without a Start-menu entry
const WIN_BUILTIN = { rechner: ['calc.exe'], taschenrechner: ['calc.exe'], calculator: ['calc.exe'], editor: ['notepad.exe'], notepad: ['notepad.exe'], paint: ['mspaint.exe'],
  explorer: ['explorer.exe'], 'datei-explorer': ['explorer.exe'], dateiexplorer: ['explorer.exe'], einstellungen: ['explorer.exe', 'ms-settings:'], settings: ['explorer.exe', 'ms-settings:'],
  'task-manager': ['taskmgr.exe'], taskmanager: ['taskmgr.exe'], 'snipping tool': ['explorer.exe', 'ms-screenclip:'], kamera: ['explorer.exe', 'microsoft.windows.camera:'],
  spotify: ['explorer.exe', 'spotify:'], mail: ['explorer.exe', 'outlookmail:'], kalender: ['explorer.exe', 'outlookcal:'], store: ['explorer.exe', 'ms-windows-store:'] };
const norm = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const ALIAS = { 'vs code': 'visual studio code', vscode: 'visual studio code', code: 'visual studio code', teams: 'microsoft teams', edge: 'microsoft edge', ppt: 'powerpoint', powerpoint: 'powerpoint', onenote: 'onenote', outlook: 'outlook', 'whats app': 'whatsapp', insta: 'instagram' };
function findApp(name) {
  const n = ALIAS[norm(name)] || norm(name); const apps = listApps(); const qw = n.split(' ');
  // every word of the request is the start of a word in the name ("vis stu" → "Visual Studio Code"), or the request is its initials ("vsc")
  const words = (x) => { const w = x.split(' '); return qw.every((q) => w.some((y) => y.startsWith(q))) || w.map((y) => y[0]).join('').startsWith(n.replace(/ /g, '')); };
  const score = (a) => { const x = norm(a.name); return x === n ? 100 : x.startsWith(n) ? 80 : x.split(' ').includes(n) ? 70 : x.includes(n) ? 50 : words(x) ? 40 : n.includes(x) && x.length > 3 ? 30 : 0; };
  return apps.map((a) => ({ a, s: score(a) })).filter((x) => x.s).sort((a, b) => b.s - a.s || a.a.name.length - b.a.name.length)[0]?.a || null;
}
export async function apps({ suche = '' } = {}) {
  const l = listApps().filter((a) => !suche || norm(a.name).includes(norm(suche)));
  return { anzahl: l.length, programme: l.slice(0, 120).map((a) => a.name) };
}
export async function app_öffnen({ name } = {}) {
  if (!name) throw new Error('Name des Programms fehlt');
  const a = findApp(name);
  if (a) { const t = WIN ? detached('explorer.exe', [a.p]) : MAC ? detached('open', [a.p]) : detached('gtk-launch', [path.basename(a.p, '.desktop')]); return { geöffnet: a.name, ...(t || {}) }; }
  if (WIN && WIN_BUILTIN[norm(name)]) { const [cmd, ...args] = WIN_BUILTIN[norm(name)]; return { geöffnet: name, ...(detached(cmd, args) || {}) }; }
  const alt = listApps().filter((x) => norm(x.name).split(' ').some((w) => w.length > 2 && norm(name).includes(w))).slice(0, 8).map((x) => x.name);
  throw new Error(`Programm „${name}“ nicht gefunden.${alt.length ? ' Ähnlich: ' + alt.join(', ') : ''} (Liste: aktion apps)`);
}

/* ---------- windows ---------- */
export async function fenster() {
  if (WIN) { const r = psFail(await ps('Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object Id, ProcessName, MainWindowTitle | ConvertTo-Json -Compress', {}, { effect: false }), 'Fensterliste');
    let l = []; try { l = [].concat(JSON.parse(r.out || '[]')); } catch {} return { offen: l.map((p) => ({ programm: p.ProcessName, titel: p.MainWindowTitle })) }; }
  if (MAC) { const r = await run('osascript', ['-e', 'tell application "System Events" to get name of every process whose background only is false'], { effect: false }); return { offen: r.out.split(', ').filter(Boolean).map((n) => ({ programm: n })) }; }
  const r = await run('wmctrl', ['-l'], { effect: false }); return { offen: r.code === 0 ? r.out.split('\n').map((l) => ({ titel: l.split(/\s+/).slice(3).join(' ') })) : [], hinweis: r.code ? 'wmctrl fehlt' : undefined };
}
export async function fenster_schliessen({ name } = {}) {
  if (!name) throw new Error('Welches Programm/Fenster?');
  if (WIN) { const r = psFail(await ps('$n = $env:JV_NAME.ToLower(); $p = @(Get-Process | Where-Object { $_.MainWindowTitle -and ($_.ProcessName.ToLower().Contains($n) -or $_.MainWindowTitle.ToLower().Contains($n)) }); foreach ($x in $p) { [void]$x.CloseMainWindow() }; ($p | Select-Object ProcessName, MainWindowTitle | ConvertTo-Json -Compress)', { JV_NAME: name }), 'Schliessen');
    if (r.test) return { test: r.test }; let l = []; try { l = [].concat(JSON.parse(r.out || '[]')); } catch {}
    if (!l.length) throw new Error(`Kein offenes Fenster mit „${name}“ gefunden`); return { geschlossen: l.map((p) => p.MainWindowTitle || p.ProcessName), hinweis: 'Höflich geschlossen – fragt ein Programm nach Speichern, entscheidest du.' }; }
  if (MAC) { const r = await run('osascript', ['-e', `tell application "${name.replace(/["\\]/g, '')}" to quit`]); return r.test ? { test: r.test } : { geschlossen: [name] }; }
  throw new Error('Fenster schliessen geht hier nur unter Windows/Mac');
}

/* ---------- sound & music (media keys, like the keyboard) ---------- */
const KEY = { lauter: 175, leiser: 174, stumm: 173, play_pause: 179, weiter: 176, zurück: 177 };
async function winKeys(code, times = 1) { return psFail(await ps(`$w = New-Object -ComObject WScript.Shell; 1..${Math.max(1, Math.min(60, times | 0))} | ForEach-Object { $w.SendKeys([string][char]${code}) }`), 'Tasten senden'); }
export async function lautstärke({ aktion = 'setzen', wert } = {}) {
  if (WIN) {
    if (aktion === 'setzen') { const v = Math.max(0, Math.min(100, Math.round(+wert))); if (!isFinite(v)) throw new Error('wert 0–100 fehlt');
      const r = psFail(await ps(`$w = New-Object -ComObject WScript.Shell; 1..50 | ForEach-Object { $w.SendKeys([string][char]174) }; 1..${Math.max(1, Math.round(v / 2))} | ForEach-Object { if (${v} -gt 0) { $w.SendKeys([string][char]175) } }`), 'Lautstärke');
      return { lautstärke: v + ' %', ...(r.test ? { test: r.test } : {}) }; }
    if (!KEY[aktion] || !['lauter', 'leiser', 'stumm'].includes(aktion)) throw new Error('aktion: lauter, leiser, stumm oder setzen');
    const r = await winKeys(KEY[aktion], aktion === 'stumm' ? 1 : Math.round((+wert || 10) / 2)); return { ok: aktion, ...(r.test ? { test: r.test } : {}) };
  }
  if (MAC) { const v = aktion === 'stumm' ? null : aktion === 'setzen' ? +wert : null;
    const script = aktion === 'stumm' ? 'set volume with output muted' : aktion === 'setzen' ? `set volume output volume ${Math.max(0, Math.min(100, v | 0))}` : `set volume output volume ((output volume of (get volume settings)) ${aktion === 'lauter' ? '+' : '-'} ${+wert || 10})`;
    const r = await run('osascript', ['-e', script]); return { ok: aktion, ...(r.test ? { test: r.test } : {}) }; }
  const arg = aktion === 'stumm' ? ['set-sink-mute', '@DEFAULT_SINK@', 'toggle'] : ['set-sink-volume', '@DEFAULT_SINK@', aktion === 'setzen' ? `${+wert}%` : `${aktion === 'lauter' ? '+' : '-'}${+wert || 10}%`];
  const r = await run('pactl', arg); if (r.code && !r.test) throw new Error('Lautstärke: pactl fehlt'); return { ok: aktion, ...(r.test ? { test: r.test } : {}) };
}
export async function medien({ aktion = 'play_pause' } = {}) {
  if (!['play_pause', 'weiter', 'zurück'].includes(aktion)) throw new Error('aktion: play_pause, weiter, zurück');
  if (WIN) { const r = await winKeys(KEY[aktion]); return { ok: aktion, ...(r.test ? { test: r.test } : {}) }; }
  if (MAC) { const r = await run('osascript', ['-e', `tell application "Spotify" to ${aktion === 'play_pause' ? 'playpause' : aktion === 'weiter' ? 'next track' : 'previous track'}`]); return { ok: aktion, ...(r.test ? { test: r.test } : {}) }; }
  const r = await run('playerctl', [aktion === 'play_pause' ? 'play-pause' : aktion === 'weiter' ? 'next' : 'previous']); return { ok: aktion, ...(r.test ? { test: r.test } : {}) };
}

/* ---------- screen (only when the user asks) ---------- */
const SHOT_PS = `Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class JvDpi { [DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); }'
[void][JvDpi]::SetProcessDPIAware()
$b = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Left, $b.Top, 0, 0, $bmp.Size)
$w = [Math]::Min(1600, $b.Width); $h = [int]($b.Height * $w / $b.Width)
$s = New-Object System.Drawing.Bitmap $bmp, $w, $h
$s.Save($env:JV_OUT, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$g.Dispose(); $bmp.Dispose(); $s.Dispose()`;
export async function bildschirm() {
  const out = path.join(os.tmpdir(), `jarvis-bildschirm-${Date.now()}.jpg`);
  let r;
  if (WIN) r = psFail(await ps(SHOT_PS, { JV_OUT: out }), 'Bildschirmfoto');
  else if (MAC) r = await run('screencapture', ['-x', '-t', 'jpg', out]);
  else r = await run('import', ['-window', 'root', '-resize', '1600x', out]);
  if (r.test) return { test: r.test };
  if (!existsSync(out)) throw new Error('Bildschirmfoto ging nicht' + (MAC ? ' (Mac: Systemeinstellungen → Datenschutz → Bildschirmaufnahme für das Terminal erlauben)' : ''));
  const b = await fs.readFile(out); await fs.rm(out, { force: true });   // never kept on disk
  return { bild: 'data:image/jpeg;base64,' + b.toString('base64') };
}

/* ---------- system state ---------- */
function cpuPercent() { return new Promise((res) => { const a = os.cpus(); setTimeout(() => { const b = os.cpus(); let idle = 0, tot = 0;
  b.forEach((c, i) => { const p = a[i].times, q = c.times; const d = (k) => q[k] - p[k]; idle += d('idle'); tot += d('idle') + d('user') + d('nice') + d('sys') + d('irq'); });
  res(tot ? Math.round(100 * (1 - idle / tot)) : null); }, 400); }); }
function drives() {
  const roots = WIN ? 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => l + ':\\').filter((r) => { try { return existsSync(r); } catch { return false; } }) : [HOME];
  return roots.map((r) => { try { const s = statfsSync(r); const tot = s.blocks * s.bsize, free = s.bavail * s.bsize; if (!tot) return null;
    return { laufwerk: WIN ? r.slice(0, 2) : r === HOME ? 'Benutzerordner' : r, frei_gb: +(free / 1e9).toFixed(1), gesamt_gb: +(tot / 1e9).toFixed(1), voll_prozent: Math.round(100 * (1 - free / tot)) }; } catch { return null; } }).filter(Boolean);
}
async function battery() {
  if (WIN) { const r = await ps('Get-CimInstance -ClassName Win32_Battery | Select-Object EstimatedChargeRemaining, BatteryStatus | ConvertTo-Json -Compress', {}, { effect: false });
    try { const j = [].concat(JSON.parse(r.out))[0]; return j ? { prozent: j.EstimatedChargeRemaining, lädt: j.BatteryStatus === 2 || j.BatteryStatus >= 6 } : null; } catch { return null; } }
  if (MAC) { const r = await run('pmset', ['-g', 'batt'], { effect: false }); const m = r.out.match(/(\d+)%;\s*(\w+)/); return m ? { prozent: +m[1], lädt: !/discharging/.test(m[2]) } : null; }
  try { const d = readdirSync('/sys/class/power_supply').find((x) => /^BAT/.test(x)); if (!d) return null; const cap = await fs.readFile(`/sys/class/power_supply/${d}/capacity`, 'utf8'); const st = await fs.readFile(`/sys/class/power_supply/${d}/status`, 'utf8'); return { prozent: +cap, lädt: /charg/i.test(st) && !/dis/i.test(st) }; } catch { return null; }
}
export async function system() {
  const [cpu, akku] = await Promise.all([cpuPercent(), battery()]);
  const tot = os.totalmem(), free = os.freemem(); const lw = drives();
  if (process.env.JARVIS_TEST_VOLL && lw[0]) { lw[0].voll_prozent = +process.env.JARVIS_TEST_VOLL; lw[0].frei_gb = 3.2; }   // tests only
  const warn = [...lw.filter((d) => d.voll_prozent >= 90).map((d) => `Laufwerk ${d.laufwerk} ist zu ${d.voll_prozent} % voll (nur noch ${d.frei_gb} GB frei)`), ...(akku && !akku.lädt && akku.prozent <= 15 ? [`Akku nur noch ${akku.prozent} %`] : [])];
  return { computer: os.hostname(), system: WIN ? 'Windows' : MAC ? 'Mac' : 'Linux', prozessor_last_prozent: cpu, arbeitsspeicher: { belegt_gb: +((tot - free) / 1e9).toFixed(1), gesamt_gb: +(tot / 1e9).toFixed(1), prozent: Math.round(100 * (1 - free / tot)) },
    laufwerke: lw, akku, läuft_seit_stunden: +(os.uptime() / 3600).toFixed(1), warnungen: warn };
}

/* ---------- typing, clipboard, lock, power ---------- */
export async function schreiben({ text, fenster: ziel } = {}) {
  if (!text) throw new Error('text fehlt');
  if (WIN) { const r = psFail(await ps(`Set-Clipboard -Value $env:JV_TEXT; $w = New-Object -ComObject WScript.Shell; if ($env:JV_WIN) { [void]$w.AppActivate($env:JV_WIN) } else { $w.SendKeys('%{TAB}') }; Start-Sleep -Milliseconds 450; $w.SendKeys('^v')`, { JV_TEXT: String(text), JV_WIN: ziel || '' }), 'Schreiben');
    return { geschrieben: String(text).length + ' Zeichen', in: ziel || 'das vorherige Fenster', ...(r.test ? { test: r.test } : {}) }; }
  if (MAC) { const r = await run('osascript', ['-e', `set the clipboard to (system attribute "JV_TEXT")`, '-e', 'tell application "System Events" to keystroke "v" using command down'], { env: { JV_TEXT: String(text) } }); return { geschrieben: String(text).length + ' Zeichen', ...(r.test ? { test: r.test } : {}) }; }
  throw new Error('Schreiben geht hier nur unter Windows/Mac');
}
export async function zwischenablage({ text } = {}) {
  if (WIN) { if (text != null) { const r = psFail(await ps('Set-Clipboard -Value $env:JV_TEXT', { JV_TEXT: String(text) }), 'Zwischenablage'); return { gesetzt: true, ...(r.test ? { test: r.test } : {}) }; }
    const r = psFail(await ps('Get-Clipboard -Raw', {}, { effect: false }), 'Zwischenablage'); return { inhalt: r.out.slice(0, 8000) }; }
  if (MAC) { if (text != null) { const r = await run('osascript', ['-e', 'set the clipboard to (system attribute "JV_TEXT")'], { env: { JV_TEXT: String(text) } }); return { gesetzt: true, ...(r.test ? { test: r.test } : {}) }; } const r = await run('pbpaste', [], { effect: false }); return { inhalt: r.out.slice(0, 8000) }; }
  throw new Error('Zwischenablage geht hier nur unter Windows/Mac');
}
export async function sperren() {
  const r = WIN ? await run('rundll32.exe', ['user32.dll,LockWorkStation']) : MAC ? await run('pmset', ['displaysleepnow']) : await run('loginctl', ['lock-session']);
  return { gesperrt: true, ...(r.test ? { test: r.test } : {}) };
}
export async function herunterfahren({ art = 'aus' } = {}) {   // reaches here only after the human confirmed
  const a = { aus: ['/s', '/t', '60', '/c', 'JARVIS faehrt den Computer in 60 Sekunden herunter (abbrechen: shutdown /a)'], neustart: ['/r', '/t', '60', '/c', 'JARVIS startet den Computer in 60 Sekunden neu'], abbrechen: ['/a'] }[art];
  if (!a) throw new Error('art: aus, neustart oder abbrechen');
  const r = WIN ? await run('shutdown.exe', a) : MAC ? await run('osascript', ['-e', `tell application "System Events" to ${art === 'neustart' ? 'restart' : 'shut down'}`]) : await run('systemctl', [art === 'neustart' ? 'reboot' : 'poweroff']);
  return { ok: art, hinweis: art === 'abbrechen' ? 'abgebrochen' : 'in 60 Sekunden – „abbrechen“ geht bis dahin', ...(r.test ? { test: r.test } : {}) };
}

/* ---------- JARVIS lives on this computer: app window + start with the computer ---------- */
export async function app_fenster({ vollbild = false } = {}) {
  const flags = [`--app=${APP_URL}`, vollbild ? '--start-fullscreen' : '--start-maximized'];
  // cmd's start resolves msedge through Windows' App Paths (Edge is on every Windows PC); verbatim, so the empty title "" stays intact
  const t = WIN ? detached('cmd.exe', ['/c', `start "" msedge ${flags.join(' ')}`], { windowsVerbatimArguments: true }) : MAC ? detached('open', ['-na', 'Microsoft Edge', '--args', ...flags]) : detached('xdg-open', [APP_URL]);
  return { geöffnet: 'JARVIS als eigenes App-Fenster', ...(t || {}) };
}
const startupFile = () => WIN ? path.join(process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'JARVIS.cmd')
  : MAC ? path.join(HOME, 'Library', 'LaunchAgents', 'ch.jarvis.agent.plist') : path.join(HOME, '.config', 'autostart', 'jarvis.desktop');
export async function autostart({ an = true } = {}) {
  const f = startupFile();
  if (!an) { await fs.rm(f, { force: true }); return { autostart: 'aus', entfernt: f }; }
  await fs.mkdir(path.dirname(f), { recursive: true });
  const q = (s) => s.replace(/"/g, '');
  const body = WIN ? `@echo off\r\nrem JARVIS startet mit Windows (angelegt vom PC-Agent – loeschen = aus)\r\ncd /d "${q(AGENT_DIR)}"\r\nstart "JARVIS PC-Agent" /min cmd /c PC-Agent-starten.cmd\r\nping -n 9 127.0.0.1 >nul\r\nstart "" msedge --app=${APP_URL} --start-maximized\r\n`
    : MAC ? `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>ch.jarvis.agent</string><key>ProgramArguments</key><array><string>/bin/bash</string><string>${q(path.join(AGENT_DIR, 'PC-Agent-starten.command'))}</string></array><key>RunAtLoad</key><true/></dict></plist>\n`
    : `[Desktop Entry]\nType=Application\nName=JARVIS PC-Agent\nExec=bash "${q(path.join(AGENT_DIR, 'PC-Agent-starten.command'))}"\nX-GNOME-Autostart-enabled=true\n`;
  await fs.writeFile(f, body);
  return { autostart: 'an', datei: f, hinweis: 'Ab dem nächsten Anmelden startet JARVIS von selbst (PC-Agent minimiert + JARVIS-Fenster). Ausschalten: „autostart aus“.' };
}
export const autostartStatus = () => existsSync(startupFile());

/* ---------- 5.9.6/5.9.7: human confirmation – a real dialog on the user's screen (the AI cannot click it) ---------- */
export function askHuman(message) {
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


export const needsConfirmPc = (name, args) => name === 'herunterfahren' && args?.art !== 'abbrechen';
export const PC_ACTIONS = { apps, app_öffnen, fenster, fenster_schliessen, lautstärke, medien, bildschirm, system, schreiben, zwischenablage, sperren, herunterfahren, app_fenster, autostart, autostart_status: async () => ({ autostart: autostartStatus() ? 'an' : 'aus', system: WIN ? 'Windows' : MAC ? 'Mac' : 'Linux' }) };
