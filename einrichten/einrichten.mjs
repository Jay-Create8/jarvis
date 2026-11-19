#!/usr/bin/env node
// JARVIS – Einrichtungs-Assistent (Windows / Mac / Linux, Node.js 20+)
// Richtet in DEINEM Cloudflare-Konto (gratis) ein: JARVIS-Server (Worker + Speicher + Zeitplan) und die JARVIS-App als Website.
// Am Ende zeigt er einen QR-Code: am Handy scannen → App öffnet sich bereits mit Server verbunden.
// Nichts kostet etwas, solange du keine Twilio-Daten einträgst. Anthropic-/Twilio-Keys gehen nur an Cloudflare und werden nicht lokal gespeichert.
// Die zwei JARVIS-Zugangs-Tokens merkt sich der Assistent in .einrichtung.json (nur für dich lesbar), damit ein erneuter Lauf sie kennt.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..');
const STATE = path.join(HERE, '.einrichtung.json');                 // names, ids and the two JARVIS tokens for re-runs (no Anthropic/Twilio keys)
const st = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const save = () => fs.writeFileSync(STATE, JSON.stringify(st, null, 2), { mode: 0o600 });
const WRANGLER = process.env.JARVIS_WRANGLER || '';                 // only for tests (simulated wrangler)
const isWin = process.platform === 'win32';

const c = { b: (s) => `\x1b[1m${s}\x1b[0m`, g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, c: (s) => `\x1b[36m${s}\x1b[0m` };
const step = (n, t) => console.log('\n' + c.c(`[${n}/8] `) + c.b(t));
const ok = (t) => console.log(c.g('  ✓ ') + t), warn = (t) => console.log(c.y('  ! ') + t);
const die = (t) => { console.log(c.r('\n✗ ' + t)); process.exit(1); };

// wrangler and npm are started through Node directly (no shell) – works on Windows with spaces in paths
const WR = WRANGLER || path.join(HERE, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
if (!fs.existsSync(WR)) { console.log('Bitte über „JARVIS-einrichten“ starten (installiert zuerst die Werkzeuge).'); process.exit(1); }
function run(args, { cwd = ROOT, input, show = false } = {}) {
  const r = spawnSync(process.execPath, [WR, ...args], { cwd, input, encoding: 'utf8', stdio: show ? 'inherit' : ['pipe', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
function npm(args, cwd) {
  if (!process.env.npm_execpath) return false;
  const r = spawnSync(process.execPath, [process.env.npm_execpath, ...args], { cwd, stdio: 'inherit' }); return r.status === 0;
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
// own line queue: robust for typing, pasting and piped input (readline.question loses lines that arrive early)
const queue = [], waiters = []; let closed = false, mute = false;
rl.on('line', (l) => { const w = waiters.shift(); w ? w(l) : queue.push(l); });
rl.on('close', () => { closed = true; while (waiters.length) waiters.shift()(''); });
rl._writeToOutput = (s) => { if (!mute) rl.output.write(s); };          // hidden input: typed characters are not echoed
const nextLine = () => new Promise((res) => (queue.length ? res(queue.shift()) : closed ? res('') : waiters.push(res)));
const ask = async (q, def = '') => { process.stdout.write(`  ${q}${def ? c.y(` [${def}]`) : ''}: `); return (await nextLine()).trim() || def; };
async function askHidden(q) {
  process.stdout.write(`  ${q} (EINMAL einfügen mit Strg+V, dann Enter – man sieht nichts, leer = überspringen): `);
  mute = true; let v = (await nextLine()).trim(); mute = false; process.stdout.write('\n');
  // 5.9.7.2: pasted several times? (nothing is visible, so that happens) → keep the first copy
  for (const pre of ['AIza', 'AQ.', 'sk-ant-']) { const i = v.indexOf(pre, 1); if (v.startsWith(pre) && i > 0 && v.slice(0, i).repeat(Math.round(v.length / i)) === v) { v = v.slice(0, i); console.log(c.y('  ! Mehrfach eingefügt – ich nehme ihn einmal.')); } }
  if (v) console.log(c.g('  ✓ ') + `${v.length} Zeichen erhalten (${v.slice(0, 4)}…${'•'.repeat(6)})`);
  return v;
}
const yes = async (q, def = 'j') => /^j|^y/i.test(await ask(q + ' (j/n)', def));
const token = (n = 24) => crypto.randomBytes(n).toString('base64url');

console.log(c.b('\n🤖 JARVIS – Einrichtungs-Assistent\n') + 'Du brauchst: ein Gratis-Konto bei cloudflare.com (wird gleich im Browser geöffnet) und deinen\n' +
  'Gemini-Key (gratis, aistudio.google.com/apikey). Optional: Twilio für echte Anrufe (kostet – JARVIS hält dein Budget aus der App ein).');

// 1 – login
step(1, 'Bei Cloudflare anmelden');
let who = run(['whoami']);
if (!/associated with the email|You are logged in/i.test(who.out)) {
  console.log('  Gleich öffnet sich dein Browser – dort bei Cloudflare anmelden und „Allow“ klicken.');
  if (run(['login'], { show: true }).code !== 0) die('Anmeldung bei Cloudflare fehlgeschlagen.');
  who = run(['whoami']);
}
if (!/associated with the email|You are logged in/i.test(who.out)) die('Nicht bei Cloudflare angemeldet.\n' + who.out.slice(0, 400));
ok('angemeldet');

// 2 – storage
step(2, 'Speicher (KV) für den Server');
const SERVER = path.join(ROOT, 'server');
if (!st.kvId) {
  const r = run(['kv', 'namespace', 'create', 'JARVIS_KV'], { cwd: SERVER });
  let id = (r.out.match(/"?id"?\s*[:=]\s*"([0-9a-f]{32})"/) || [])[1];
  if (!id) {   // already there from an earlier run
    const l = run(['kv', 'namespace', 'list'], { cwd: SERVER }); try { id = JSON.parse(l.out.slice(l.out.indexOf('['))).find((n) => /JARVIS_KV/.test(n.title))?.id; } catch {}
  }
  if (!id) die('Konnte den Speicher nicht anlegen:\n' + r.out.slice(0, 500));
  st.kvId = id; save();
}
ok('Speicher ' + st.kvId.slice(0, 8) + '…');

// 3 – tokens and keys
step(3, 'Zugangsschlüssel');
const secrets = {};
if (!st.tokensSet || await yes('Neue Zugangs-Tokens erzeugen? (alte Verbindungen müssen dann neu eingerichtet werden)', 'n')) {
  st.jarvisToken = null; secrets.JARVIS_TOKEN = token(); secrets.AGENT_TOKEN = token(); secrets.NTFY_TOPIC = 'jarvis-' + token(9).toLowerCase().replace(/[^a-z0-9]/g, '');
  st.ntfy = secrets.NTFY_TOPIC;
}
if (!st.mcpToken || secrets.JARVIS_TOKEN) secrets.MCP_TOKEN = token(30);   // 5.9.7: secret address for the Claude connection
console.log('  Gemini-Key (gratis): aistudio.google.com/apikey → „API-Schlüssel erstellen“. Damit denkt der Server kostenlos (Wächter, Routinen, Telefon).');
const gk = await askHidden('Gemini API-Key'); if (gk) { if (!/^(AIza|AQ)/.test(gk)) warn('Sieht nicht wie ein Gemini-Key aus (beginnt normalerweise mit AIza oder AQ) – trotzdem gespeichert.'); secrets.GEMINI_API_KEY = gk; }
console.log('  Optional: Anthropic-Key (kostet) – nur nötig, wenn du keinen Gemini-Key hast. Sonst einfach leer lassen.');
const ak = await askHidden('Anthropic API-Key'); if (ak) { if (!/^sk-ant-/.test(ak)) warn('Sieht nicht wie ein Anthropic-Key aus (beginnt normalerweise mit sk-ant-) – trotzdem gespeichert.'); secrets.ANTHROPIC_API_KEY = ak; }
console.log('  Echte Anrufe gehen über Twilio (twilio.com):\n' +
  '  • TESTKONTO (gratis, ohne Karte): JARVIS kann DICH anrufen (nur deine bestätigte Nummer, vorher kommt eine kurze englische Ansage).\n' +
  '  • Für Anrufe bei Restaurants, Praxen usw. braucht es ein bezahltes Konto (Zahlungsmittel bei Twilio, Guthaben vorher aufladen).\n' +
  '    Kosten: Nummer ca. 1.15 $/Monat, Festnetz ca. 0.04 $/Min., Handy ca. 0.18–0.25 $/Min. JARVIS stoppt vor deinem Telefon-Budget (App).');
if (await yes('Echte Telefonanrufe über Twilio einrichten?', 'n')) {
  secrets.TWILIO_SID = await ask('Twilio Account SID (AC…)'); secrets.TWILIO_TOKEN = await askHidden('Twilio Auth Token');
  secrets.TWILIO_FROM = await ask('Deine Twilio-Nummer (+1… oder +41…)'); secrets.USER_PHONE = await ask('Deine Handynummer (+41…)');
  const fee = parseFloat(String(await ask('Was kostet diese Nummer pro Monat (in $; Testkonto-Nummer = 0)?', '1.15')).replace(',', '.'));
  if (isFinite(fee) && fee >= 0 && fee <= 50) st.nummerUsd = fee;
  for (const k of ['TWILIO_SID', 'TWILIO_TOKEN', 'TWILIO_FROM', 'USER_PHONE']) if (!secrets[k]) delete secrets[k];
}

// 4 – server deploy
step(4, 'JARVIS-Server hochladen');
if (!fs.existsSync(path.join(SERVER, 'node_modules', '@anthropic-ai'))) { console.log('  installiere Abhängigkeiten …'); if (!WRANGLER && !npm(['install', '--no-audit', '--no-fund', '--omit=dev'], SERVER)) die('npm install im Ordner server fehlgeschlagen'); }
const cfgFile = path.join(SERVER, 'wrangler.einrichtung.toml');
const writeCfg = (publicUrl = '') => fs.writeFileSync(cfgFile, fs.readFileSync(path.join(SERVER, 'wrangler.toml'), 'utf8')
  .replace(/id = "[^"]*"/, `id = "${st.kvId}"`).replace(/PUBLIC_URL = "[^"]*"/, `PUBLIC_URL = "${publicUrl}"`));
writeCfg(st.serverUrl || '');
let d = run(['deploy', '--config', cfgFile], { cwd: SERVER });
const url = (d.out.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i) || [])[0];
if (d.code !== 0 || !url) {
  if (/workers\.dev subdomain|register a workers\.dev/i.test(d.out)) die('Du musst einmal im Cloudflare-Dashboard „Workers & Pages“ öffnen (dabei wird deine workers.dev-Adresse angelegt). Danach den Assistenten nochmal starten.');
  die('Hochladen fehlgeschlagen:\n' + d.out.slice(-800));
}
if (url !== st.serverUrl) { st.serverUrl = url; save(); writeCfg(url); d = run(['deploy', '--config', cfgFile], { cwd: SERVER }); if (d.code !== 0) die('Zweites Hochladen fehlgeschlagen:\n' + d.out.slice(-600)); }
ok('Server läuft: ' + url);

// 5 – secrets
step(5, 'Schlüssel sicher beim Server hinterlegen');
if (Object.keys(secrets).length) {
  const tmp = path.join(HERE, '.secrets-' + token(6) + '.json');
  fs.writeFileSync(tmp, JSON.stringify(secrets), { mode: 0o600 });
  const r = run(['secret', 'bulk', tmp, '--config', cfgFile], { cwd: SERVER });
  fs.rmSync(tmp, { force: true });                                    // never left on disk
  if (r.code !== 0) die('Schlüssel konnten nicht gespeichert werden:\n' + r.out.slice(-500));
  if (secrets.JARVIS_TOKEN) { st.tokensSet = true; st.jarvisToken = secrets.JARVIS_TOKEN; st.agentToken = secrets.AGENT_TOKEN; }
  if (secrets.MCP_TOKEN) st.mcpToken = secrets.MCP_TOKEN;
  save();
  ok('gespeichert: ' + Object.keys(secrets).map((k) => k).join(', '));
} else ok('nichts Neues');
// remember tokens only in memory for the QR code unless user wants the access file
const appTok = secrets.JARVIS_TOKEN || st.jarvisToken, agentTok = secrets.AGENT_TOKEN || st.agentToken;

// 6 – check the live server
step(6, 'Server prüfen');
try {
  const r = await fetch(url + '/api/status', { headers: { authorization: 'Bearer ' + appTok } });
  const j = await r.json(); if (!r.ok) throw new Error(j.fehler || 'HTTP ' + r.status);
  ok(`antwortet · Telefon: ${j.twilio ? 'eingerichtet' : 'nicht eingerichtet'} · Push: ${j.ntfy ? 'ja' : 'nein'}`);
} catch (e) { warn('Server antwortet noch nicht (' + e.message + '). Das kann nach dem ersten Hochladen bis zu einer Minute dauern.'); }

// 7 – app website
// 5.9.4.2: app-url.txt → use the JARVIS app you already have (and the APK) instead of publishing a second copy with its own settings
const APP_URL_FILE = path.join(ROOT, 'app-url.txt');
let appUrl = fs.existsSync(APP_URL_FILE) ? fs.readFileSync(APP_URL_FILE, 'utf8').trim().replace(/\/$/, '') : '';
if (appUrl) { step(7, 'JARVIS-App'); ok('deine bestehende App: ' + appUrl); }
else {
step(7, 'JARVIS-App als Website veröffentlichen');
st.pagesName ||= 'jarvis-' + crypto.randomBytes(3).toString('hex'); save();
const APPDIR = path.join(HERE, '.app-upload'); fs.rmSync(APPDIR, { recursive: true, force: true }); fs.mkdirSync(APPDIR);
for (const f of ['index.html', 'app.html', 'loader.js', 'precache.json', 'p', 'manifest.json', 'sw.js', 'icon.svg', 'icon-192.png', 'icon-512.png', 'anthropic-sdk.mjs', 'js', 'lib', 'assets', 'vendor'])   // 5.8: start page + app + resumable parts
  if (fs.existsSync(path.join(ROOT, f))) fs.cpSync(path.join(ROOT, f), path.join(APPDIR, f), { recursive: true });
run(['pages', 'project', 'create', st.pagesName, '--production-branch', 'main'], { cwd: HERE });   // fails harmlessly if it exists
const p = run(['pages', 'deploy', APPDIR, '--project-name', st.pagesName, '--branch', 'main', '--commit-dirty=true'], { cwd: HERE });
fs.rmSync(APPDIR, { recursive: true, force: true });
if (p.code !== 0) die('App-Veröffentlichung fehlgeschlagen:\n' + p.out.slice(-800));
appUrl = `https://${st.pagesName}.pages.dev`; st.appUrl = appUrl; save();
ok('App: ' + appUrl + c.y('  (die ersten 1–2 Minuten kann die Adresse noch „nicht gefunden“ zeigen)'));
}

// 8 – connect phone + laptop
step(8, 'Handy verbinden');
const mcpUrl = st.mcpToken ? `${url}/mcp/${st.mcpToken}` : '';
const setup = Buffer.from(JSON.stringify({ srv: url, srvTok: appTok, ntfy: st.ntfy, ...(st.nummerUsd != null ? { nummerUsd: st.nummerUsd } : {}), ...(agentTok ? { agentSrvTok: agentTok } : {}), ...(mcpUrl ? { mcpUrl } : {}) })).toString('base64url');   // 5.9.7: + Claude connection
const link = `${appUrl}/#einrichten=${setup}`;
try { const q = (await import('qrcode-terminal')).default; console.log('\n  Am Handy mit der Kamera scannen (öffnet JARVIS bereits verbunden):\n'); q.generate(link, { small: true }); }
catch { console.log('\n  Diesen Link am Handy öffnen (z.B. per Mail an dich selbst schicken):\n  ' + link); }
console.log('\n  Am Laptop: diesen Link im Browser öffnen, in dem du JARVIS benutzt:\n  ' + link);
console.log(`\n  Danach in JARVIS: Einstellungen → KEY EINFÜGEN – gratis: Gemini-Key von aistudio.google.com/apikey (oder Anthropic-Key, kostet). Der Key bleibt nur auf dem Handy.\n  Push: ntfy-App installieren und das Thema ${c.b(st.ntfy || '(bestehendes)')} abonnieren.`);
if (await yes('Zugangsdaten zusätzlich in JARVIS-Zugang.txt auf diesem Rechner speichern (Backup)?', 'n'))
  fs.writeFileSync(path.join(HERE, 'JARVIS-Zugang.txt'), `JARVIS-Zugang (geheim halten!)\nApp: ${appUrl}\nServer: ${url}\nServer-Token (App): ${appTok}\nPush-Thema (ntfy): ${st.ntfy}\nEinrichtungs-Link: ${link}\n`, { mode: 0o600 });
if (mcpUrl) console.log('\n' + c.b('🔗 Mit Claude verbinden (dein Claude Pro, ohne API-Key):') + '\n  In Claude: Einstellungen → Konnektoren → „Benutzerdefinierten Konnektor hinzufügen“\n  Name: JARVIS   Adresse (geheim halten!):\n  ' + c.y(mcpUrl) + '\n  (Die Adresse steht nach dem Öffnen des Links oben auch in JARVIS → Einstellungen → MIT CLAUDE VERBINDEN, mit Kopier-Knopf.)');
console.log(c.g('\n✅ Fertig. ') + 'Nochmal ausführen ist jederzeit möglich (z.B. nach einem Update – dann wird nur neu hochgeladen).\n');
rl.close();
