/* =====================================================================
   JARVIS PC-AGENT – lässt JARVIS echte Websites bedienen (Chrome/Chromium via Playwright)
   Start:  Doppelklick auf PC-Agent-starten.cmd (Windows) bzw. PC-Agent-starten.command (Mac/Linux) – keine Admin-Rechte nötig
           (von Hand: npm install && npm start)
   Sicherheit:
   - lauscht nur auf 127.0.0.1, verlangt ein Token (wird beim Start angezeigt)
   - verbindliche Aktionen (kaufen, bestellen, buchen, bezahlen, absenden …) werden
     BLOCKIERT, bis der Mensch in der JARVIS-App bestätigt (Einmal-Code, den die KI nie sieht)
   - eigenes Browser-Profil (./profil): Logins bleiben gespeichert, dein normaler Browser bleibt unberührt
   ===================================================================== */
import { chromium } from 'playwright';
import { WebSocketServer } from 'ws';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { FILE_ACTIONS, needsConfirm } from './dateien.mjs';
import { PC_ACTIONS, needsConfirmPc } from './computer.mjs';

const PORT = +(process.env.JARVIS_AGENT_PORT || 47321);
// 5.9.4: the token is kept in token.txt → after a restart JARVIS reconnects by itself (no new token to type in)
const TOKEN_FILE = fileURLToPath(new URL('./token.txt', import.meta.url));
const TOKEN = process.env.JARVIS_AGENT_TOKEN || (() => { try { const t = readFileSync(TOKEN_FILE, 'utf8').trim(); if (t.length >= 12) return t; } catch {} const t = crypto.randomBytes(9).toString('base64url'); try { writeFileSync(TOKEN_FILE, t); } catch {} return t; })();
const HEADLESS = process.env.HEADLESS === '1';
const CHECKOUT_PAGE = /(checkout|kasse|payment|zahlung|bezahl|order|bestell|booking|book|buchung|reserv|table|tisch|termin|appointment)/i;
const CONFIRM_WORDS = /(finish|complete|confirm|place|pay|abschlie|bestätig|weiter zur zahlung|jetzt|fertig)/i;
const SENSITIVE = /(kauf|bestell|bezahl|zahlungspflichtig|kostenpflichtig|buchen|buchung abschl|reserv|pay|purchase|place order|confirm order|absenden|abschicken|senden|überweis|vertrag|abonn|kündig|löschen|delete)/i;

// 5.9.3: use the browser that is already on the PC (Windows: Edge is always there) → no 150 MB download, no admin rights.
// Only if none is found, Playwright's own Chromium is downloaded once (into the user folder, also without admin rights).
// fileURLToPath instead of URL.pathname: on Windows pathname gives "/C:/…" and "%20" for spaces in the folder name.
const here = (f) => fileURLToPath(new URL(f, import.meta.url));
const OPTS = { headless: HEADLESS, viewport: { width: 1280, height: 860 }, locale: 'de-CH' };
const WANT = (process.env.JARVIS_BROWSER || '').trim();
const CANDIDATES = WANT ? [/[\\/]/.test(WANT) ? { name: 'eigener Browser', dir: 'profil-eigen', executablePath: WANT } : { name: WANT, dir: WANT === 'chromium' ? 'profil' : 'profil-' + WANT, channel: WANT === 'chromium' ? undefined : WANT }]
  : [...(process.platform === 'win32' ? ['msedge', 'chrome'] : ['chrome', 'msedge']).map((c) => ({ name: c === 'msedge' ? 'Microsoft Edge' : 'Google Chrome', dir: 'profil-' + c, channel: c })), { name: 'Chromium', dir: 'profil' }];
let chosen = null;
const missing = (e) => /executable doesn't exist|is not found|not found at|chromium distribution .* is not found|no such file/i.test(e?.message || '');
function installChromium() {
  const cli = here('./node_modules/playwright/cli.js');
  console.log('⬇️  Kein Chrome/Edge gefunden – lade einmalig den JARVIS-Browser (ca. 150 MB, ohne Admin-Rechte) …');
  if (+process.versions.node.split('.')[0] > 24) console.log('⚠️  Node.js ' + process.version + ' ist neuer als getestet (bei v26 hing das Entpacken). Am besten über den Starter (PC-Agent-starten) öffnen – der nimmt v24.');
  const r = existsSync(cli) ? spawnSync(process.execPath, [cli, 'install', 'chromium'], { stdio: 'inherit', timeout: 20 * 60e3 }) : { status: 1 };
  return r.status === 0;
}
async function launch() {
  if (chosen) return chromium.launchPersistentContext(here('./' + chosen.dir), { ...OPTS, channel: chosen.channel, executablePath: chosen.executablePath });
  let last;
  for (const c of CANDIDATES) {
    try {
      const x = await chromium.launchPersistentContext(here('./' + c.dir), { ...OPTS, channel: c.channel, executablePath: c.executablePath });
      chosen = c; console.log('🌐 Browser: ' + c.name); return x;
    } catch (e) {
      last = e;
      if (!c.channel && !c.executablePath && missing(e) && installChromium()) { const x = await chromium.launchPersistentContext(here('./' + c.dir), OPTS); chosen = c; console.log('🌐 Browser: ' + c.name); return x; }
    }
  }
  console.error('\n❌ Konnte keinen Browser starten: ' + String(last?.message || last).split('\n')[0] + '\n   Tipp: Chrome oder Edge öffnen können? Dann PC-Agent neu starten. Auf Schul-/Firmengeräten sperrt die IT so etwas manchmal.');
  process.exit(1);
}
let ctx = await launch();
let page = ctx.pages()[0] || (await ctx.newPage());
let closed = false; ctx.on('close', () => { closed = true; });
/** recover automatically if the user closed the browser window or it crashed */
async function ensurePage() {
  if (closed) { console.log('↻ Browser wurde geschlossen – starte neu'); ctx = await launch(); closed = false; ctx.on('close', () => { closed = true; }); page = ctx.pages()[0] || (await ctx.newPage()); }
  else if (page.isClosed()) page = ctx.pages().find((p) => !p.isClosed()) || (await ctx.newPage());
}
const pendingConfirm = new Map(); // code -> {action, args, expires}

// Scans one document (main page or an embedded iframe). Runs inside the browser.
const SCAN = (prefix) => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && r.right > 0 && r.left < innerWidth && !el.closest('[aria-hidden="true"],[inert],[hidden]') && +s.opacity > 0.05; };
  // 5.1: cookie banners and widgets often live in (open) shadow DOM → search it too
  const roots = [document]; for (let k = 0; k < roots.length; k++) for (const e of roots[k].querySelectorAll('*')) if (e.shadowRoot) roots.push(e.shadowRoot);
  const all = (sel) => roots.flatMap((r) => [...r.querySelectorAll(sel)]);
  const base = all('a[href],button,input,select,textarea,[role=button],[role=link],[role=tab],[role=menuitem],[onclick]');
  // 5.1: many sites use <a> without href or <div class="btn"> opened via JavaScript → also take outermost elements with a pointer cursor
  const known = new Set(base); const ptr = (e) => e && getComputedStyle(e).cursor === 'pointer';
  const extra = all('*').filter((e) => e.tagName !== 'HTML' && e.tagName !== 'BODY').filter((e) => !known.has(e) && !e.closest('a[href],button') && ptr(e) && !ptr(e.parentElement) && (e.innerText || e.getAttribute('aria-label') || '').trim().length > 0 && (e.innerText || '').length < 80);
  const els = [...base, ...extra].filter(vis).sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)).slice(0, 200);
  let n = 0;
  const items = els.map((el) => {
    const id = prefix + (++n); el.setAttribute('data-jv', id);
    const label = (el.getAttribute('aria-label') || el.innerText || el.value || el.placeholder || el.title || el.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    return { id, tag: el.tagName.toLowerCase(), typ: el.type || el.getAttribute('role') || '', text: label, href: el.href ? el.href.slice(0, 120) : undefined };
  });
  const shadowText = roots.slice(1).filter((r) => [...r.querySelectorAll('*')].some((c) => { const b = c.getBoundingClientRect(); return b.width > 2 && b.height > 2 && getComputedStyle(c).visibility !== 'hidden'; })).map((r) => [...r.children].map((c) => c.innerText || '').join('\n').trim()).filter(Boolean).join('\n').slice(0, 2000);
  return { titel: document.title, url: location.href, text: (shadowText ? '[Überlagerung/Dialog]\n' + shadowText + '\n\n' : '') + (document.body?.innerText || '').replace(/\n{3,}/g, '\n\n'), elemente: items };
};
async function read() {
  // 5.1: a click can trigger a reload (e.g. after cookie consent) while we read → wait and retry instead of reporting a false error
  for (let attempt = 1; ; attempt++) {
    try { return await readOnce(); }
    catch (e) { if (attempt >= 3 || !/context was destroyed|navigat/i.test(e.message)) throw e; await page.waitForLoadState('domcontentloaded').catch(() => {}); await page.waitForTimeout(800); }
  }
}
async function readOnce() {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  const data = await page.mainFrame().evaluate(SCAN, 'e');
  data.text = data.text.slice(0, 7000);
  // 5.1: booking/reservation widgets usually live in iframes (other domain) → read visible iframes too, ids f1e1, f1e2 …
  let i = 0;
  for (const f of page.frames()) {
    if (f === page.mainFrame() || !/^https?:/.test(f.url())) continue;
    try {
      const box = await (await f.frameElement()).boundingBox(); if (!box || box.width < 60 || box.height < 60) continue;
      const d = await f.evaluate(SCAN, 'f' + (++i) + 'e'); if (!d.elemente.length && !d.text.trim()) continue;   // 5.4: also text-only frames (e.g. a booking confirmation)
      const host = new URL(d.url).host;
      data.text += `\n\n[Eingebettet von ${host}]\n` + d.text.slice(0, 2500);
      data.elemente.push(...d.elemente.map((x) => ({ ...x, rahmen: host })));
    } catch {}
  }
  const robot = await robotCheck(data);
  if (robot) { data.mensch_nötig = robot; await page.bringToFront().catch(() => {}); }
  return data;
}
// 5.9.4: robot tests (Google "unusual traffic", reCAPTCHA, hCaptcha, Cloudflare) are for humans – JARVIS never tries to solve them.
// The agent brings the window to the front and JARVIS asks the user to click it himself (warten_auf_mensch).
const CAPTCHA_FRAME = /(recaptcha\/(api2|enterprise)\/(anchor|bframe)|hcaptcha\.com\/captcha|challenges\.cloudflare\.com|captcha-delivery\.com|arkoselabs|funcaptcha)/i;
const CAPTCHA_TEXT = /(unusual traffic from your computer|ungewöhnliche[nr]? datenverkehr|i'?m not a robot|ich bin kein roboter|verify (that )?you are (a )?human|bestätigen sie, dass sie ein mensch sind|confirm you are human|are you a robot|bist du ein roboter|press (&|and) hold|checking your browser|überprüfung ihres browsers)/i;
async function robotCheck(data) {
  try {
    if (/google\.[a-z.]+\/sorry\//i.test(page.url())) return 'Google-Robotertest';
    for (const f of page.frames()) {
      if (f === page.mainFrame() || !CAPTCHA_FRAME.test(f.url()) || /size=invisible/.test(f.url())) continue;
      const box = await (await f.frameElement()).boundingBox().catch(() => null); if (box && box.width > 60 && box.height > 60) return 'Robotertest (' + new URL(f.url()).host + ')';
    }
    if (CAPTCHA_TEXT.test(data.text.slice(0, 3000)) && data.text.length < 4000) return 'Robotertest auf der Seite';
  } catch {}
  return null;
}
const SE_MSG = 'Suchmaschinen (Google, Bing, DuckDuckGo …) zeigen ferngesteuerten Browsern Robotertests – hier nicht suchen. Nimm pc_browser suchen (läuft über die KI) und öffne danach die Website direkt.';
function isSearchEngine(u) { try { const x = new URL(/^https?:/i.test(u) ? u : 'https://' + u); return /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com|ecosia\.org|startpage\.com|search\.brave\.com)$/i.test(x.hostname) && !/^\/maps/.test(x.pathname) && !/^consent\./i.test(x.hostname); } catch { return false; } }
const SEARCH_URL = (q) => 'https://html.duckduckgo.com/html/?kl=ch-de&q=' + encodeURIComponent(q);
async function el(id) {
  for (const f of page.frames()) { const h = f.locator(`[data-jv="${id}"]`).first(); if (await h.count().catch(() => 0)) return h; }
  throw new Error(`Element ${id} nicht gefunden – zuerst "lesen" aufrufen`);
}
async function describe(id) { const h = await el(id); return await h.evaluate((e) => [e.innerText, e.value, e.getAttribute('aria-label'), e.title].filter(Boolean).join(' ')); }

async function guard(action, args) {
  // verbindliche Aktion? → nur mit Einmal-Code aus der App (Mensch hat bestätigt)
  let text = '';
  if (action === 'klicken') text = await describe(args.id);
  if (action === 'tippen' && args.enter) text = (await describe(args.id)) + ' ' + (await page.title());
  const frameUrl = args.id ? await (await el(args.id)).evaluate(() => location.href).catch(() => '') : '';
  const onCheckout = CHECKOUT_PAGE.test(page.url() + ' ' + (await page.title()) + ' ' + frameUrl);
  // 5.1: on booking/checkout pages a form submit is binding no matter how the button is labelled ("Weiter", "OK", Enter in a field)
  const submits = args.id && (action === 'klicken' || (action === 'tippen' && args.enter)) ? await (await el(args.id)).evaluate((e, action) => action === 'tippen' ? !!e.form : (e.type === 'submit' || (e.tagName === 'BUTTON' && !!e.form && e.type !== 'button')), action).catch(() => false) : false;
  if (!SENSITIVE.test(text) && !(onCheckout && (CONFIRM_WORDS.test(text) || submits))) return null;
  if (args.bestätigung && pendingConfirm.has(args.bestätigung)) { const p = pendingConfirm.get(args.bestätigung); pendingConfirm.delete(args.bestätigung); if (p.expires > Date.now() && p.action === action && p.args.id === args.id) return null; }
  const code = crypto.randomBytes(6).toString('hex');
  pendingConfirm.set(code, { action, args, expires: Date.now() + 5 * 60e3 });
  return { bestätigung_nötig: true, aktion: action, element: text.slice(0, 160), seite: page.url(), rahmen: frameUrl && frameUrl !== page.url() ? frameUrl : undefined, code };
}

const handlers = {
  async suchen({ anfrage, text }) {
    const q = String(anfrage || text || '').trim(); if (!q) throw new Error('anfrage fehlt');
    await page.goto(SEARCH_URL(q), { waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForTimeout(500);
    let d = await read();
    if (d.mensch_nötig || /anomaly|unusual|bots use duckduckgo/i.test(d.text.slice(0, 1500))) {   // fallback: Bing
      await page.goto('https://www.bing.com/search?setlang=de&cc=CH&q=' + encodeURIComponent(q), { waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForTimeout(800); d = await read();
    }
    return { suchmaschine: new URL(page.url()).host, ...d };
  },
  async warten_auf_mensch({ sekunden = 120 }) {
    await page.bringToFront().catch(() => {});
    const until = Date.now() + Math.min(300, Math.max(10, +sekunden || 120)) * 1000;
    while (Date.now() < until) { await page.waitForTimeout(2000); const d = await read().catch(() => null); if (d && !d.mensch_nötig) return { gelöst: true, ...d }; }
    return { gelöst: false, hinweis: 'Der Robotertest ist noch da. Nicht selbst lösen – den Nutzer nochmal bitten oder einen anderen Weg nehmen (web_search, andere Seite).' };
  },
  async öffnen({ url }) { if (!/^https?:\/\//.test(url)) url = 'https://' + url;
    // 5.9.4.2: search engines show robot tests to remote-controlled browsers → never open them here (JARVIS searches through the AI)
    if (isSearchEngine(url)) throw new Error(SE_MSG);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForLoadState('load', { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(600); return await read(); },
  async lesen() { return await read(); },
  async klicken({ id }) { const h = await el(id); await h.scrollIntoViewIfNeeded({ timeout: 5000 }); await Promise.all([page.waitForLoadState('domcontentloaded').catch(() => {}), h.click({ timeout: 10000 })]); await page.waitForTimeout(800); return await read(); },
  async tippen({ id, text, enter }) { if (enter && isSearchEngine(page.url())) throw new Error(SE_MSG); const h = await el(id); await h.fill(String(text ?? '')); if (enter) { await h.press('Enter'); await page.waitForLoadState('domcontentloaded').catch(() => {}); await page.waitForTimeout(1200); } return await read(); },
  async auswählen({ id, wert }) { const h = await el(id); await h.selectOption({ label: wert }).catch(() => h.selectOption(wert)); return await read(); },
  async scrollen({ richtung = 'unten' }) { await page.mouse.wheel(0, richtung === 'oben' ? -800 : 800); await page.waitForTimeout(500); return await read(); },
  async zurück() { await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {}); return await read(); },
  async screenshot() { return { bild: 'data:image/jpeg;base64,' + (await page.screenshot({ type: 'jpeg', quality: 60 })).toString('base64'), url: page.url() }; },
  async status() { return { ok: true, url: page.url(), titel: await page.title() }; },
};

const wss = new WebSocketServer({ host: '127.0.0.1', port: PORT });
wss.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `❌ Port ${PORT} ist belegt – läuft der PC-Agent schon? Altes Fenster schliessen oder JARVIS_AGENT_PORT setzen.` : e); process.exit(1); });
// One execution path for local (WebSocket) and remote (server relay) commands; strictly one after another.
let chain = Promise.resolve();
function execute(aktion, args = {}) {
  const run = async () => {
    try {
      if (String(aktion).startsWith('datei:')) return await executeFile(aktion.slice(6), args);
      if (String(aktion).startsWith('pc:')) return await executeFile(aktion.slice(3), args, PC_ACTIONS, needsConfirmPc, 'Computer');
      const h = handlers[aktion]; if (!h) throw new Error('Unbekannte Aktion. Verfügbar: ' + Object.keys(handlers).join(', '));
      await ensurePage();
      const blocked = await guard(aktion, args);
      if (blocked) return { ok: true, data: blocked };
      console.log('→', aktion, JSON.stringify(args).slice(0, 120));
      return { ok: true, data: await h(args) };
    } catch (e) {
      // short, actionable error + the current page, so JARVIS can re-plan immediately
      const msg = String(e.message || e).split('\n')[0].replace(/^locator\.\w+: /, '').slice(0, 200);
      const hint = /not visible|Timeout/i.test(msg) ? ' – Element ist verdeckt oder unsichtbar (Menü/Popup offen?). Seite neu gelesen, bitte anderes Element wählen.' : '';
      let seite = null; if (!String(aktion).startsWith('datei:')) try { seite = await read(); } catch {}
      return { ok: false, data: JSON.stringify({ fehler: msg + hint, seite }) };
    }
  };
  const p = chain.then(run, run); chain = p.catch(() => {}); return p;
}
// 5.9.4: files on the PC. Deleting and starting programs need the human's one-time code (like binding web actions).
async function executeFile(name, args, table = FILE_ACTIONS, confirm = needsConfirm, label = 'Datei') {
  const f = table[name]; if (!f) throw new Error(`Unbekannte ${label}-Aktion. Verfügbar: ` + Object.keys(table).join(', '));
  if (confirm(name, args)) {
    const { bestätigung, ...rest } = args; const key = name + ' ' + JSON.stringify(rest);
    const p = bestätigung && pendingConfirm.get(bestätigung);
    if (!(p && p.expires > Date.now() && p.action === key)) {
      const code = crypto.randomBytes(6).toString('hex'); pendingConfirm.set(code, { action: key, args: rest, expires: Date.now() + 5 * 60e3 });
      const was = name === 'löschen' ? 'In den JARVIS-Papierkorb verschieben: ' + [].concat(rest.pfade || []).join(', ') : name === 'duplikate_entfernen' ? 'Doppelte Dateien in den JARVIS-Papierkorb verschieben (je eine bleibt): ' + (rest.pfad || 'Downloads') : name === 'papierkorb_leeren' ? 'JARVIS-Papierkorb ENDGÜLTIG leeren (nicht rückgängig zu machen)' : name === 'herunterfahren' ? 'Computer ' + (rest.art === 'neustart' ? 'neu starten' : 'herunterfahren') + ' (in 60 Sekunden)' : 'Programm/Skript starten: ' + rest.pfad;
      return { ok: true, data: { bestätigung_nötig: true, aktion: name, element: was.slice(0, 200), seite: label === 'Datei' ? 'Dateien am PC' : 'Computer', code } };
    }
    pendingConfirm.delete(bestätigung); args = rest;
  }
  console.log(`→ ${label}:`, name, JSON.stringify(args).slice(0, 120));
  return { ok: true, data: await f(args) };
}
wss.on('connection', (ws, req) => {
  const u = new URL(req.url, 'http://x');
  if (u.searchParams.get('token') !== TOKEN) { ws.close(4001, 'falsches Token'); return; }
  console.log('✅ JARVIS verbunden von', req.headers.origin || '?');
  ws.on('message', async (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const r = await execute(m.aktion, m.args || {});
    ws.send(JSON.stringify({ rid: m.rid, ok: r.ok, data: r.data }));
  });
});

// 5.2: remote mode – the laptop asks the JARVIS server for jobs, so JARVIS on the PHONE can use this computer.
// Outbound only (no open port on the internet). Same confirmation lock as locally.
const SERVER = (process.env.JARVIS_SERVER || '').replace(/\/$/, ''); const SERVER_TOKEN = process.env.JARVIS_AGENT_SERVER_TOKEN || '';
if (SERVER && SERVER_TOKEN) {
  const H = { authorization: 'Bearer ' + SERVER_TOKEN, 'content-type': 'application/json' };
  let fails = 0;
  const loop = async () => {
    try {
      const r = await fetch(SERVER + '/api/agent/abholen', { headers: H });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const { aufträge = [] } = await r.json(); fails = 0;
      for (const job of aufträge) {
        const res = await execute(job.aktion, job.args || {});
        await fetch(SERVER + '/api/agent/ergebnis', { method: 'POST', headers: H, body: JSON.stringify({ id: job.id, ok: res.ok, data: res.data }) });
      }
    } catch (e) { if (++fails === 1 || fails % 30 === 0) console.log('⚠️  Server nicht erreichbar:', e.message); }
    setTimeout(loop, fails ? Math.min(30000, 2000 * fails) : +(process.env.JARVIS_POLL_MS || 4000));   // 4 s: Cloudflare free tier (100k reads/day)
  };
  loop(); console.log('📡 Fernsteuerung aktiv: frage alle 4 s bei ' + SERVER + ' nach Aufträgen');
}
console.log(`\n🤖 JARVIS PC-Agent läuft auf ws://127.0.0.1:${PORT}\n🔑 Token für die JARVIS-Einstellungen: ${TOKEN}\n   (bleibt bei jedem Start gleich – nur einmal eintragen, JARVIS verbindet sich danach von selbst)\n📁 Dateien: JARVIS darf in deinem Benutzerordner arbeiten (Downloads, Desktop, Dokumente …). Löschen und Programme starten fragen immer.\n`);
export { TOKEN, PORT };

// 5.1: close the browser and exit cleanly (previously the process ignored SIGTERM and kept old code running)
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { try { await ctx?.close(); } catch {} process.exit(0); });
