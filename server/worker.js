/* =====================================================================
   JARVIS-SERVER (Cloudflare Worker)
   - Echte Telefonanrufe über Twilio, mit Sprachdialog (Twilio <Gather speech> ↔ Claude)
   - Posteingang: Ergebnisse/Aufgaben aus Anrufen und Wächtern → JARVIS-App setzt sie fort
   - Wächter laufen per Cron alle 15 Minuten – auch wenn die App geschlossen ist
   Secrets (wrangler secret put …): GEMINI_API_KEY (gratis, 5.9) und/oder ANTHROPIC_API_KEY, JARVIS_TOKEN,
   TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, USER_PHONE (+41…), optional NTFY_TOPIC. KV-Binding: JARVIS_KV.
   5.9: Mit GEMINI_API_KEY denkt der Server gratis (Wächter, Telefon-Gespräche, Routinen). Telefon kostet nur mit Twilio –
   und nie mehr als das Telefon-Budget aus der App (policy.budgetTel, inkl. Nummernpreis).
   ===================================================================== */
import Anthropic from '@anthropic-ai/sdk';
import * as G from '../js/gemini.js';

const MODEL_CALL = 'claude-haiku-5-5';    // fast replies on the phone
const MODEL_WATCH = 'claude-opus-5-5';    // careful background checks
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type' } });
const xml = (s) => new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${s}</Response>`, { headers: { 'content-type': 'text/xml' } });
const escX = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const VOICE = 'Google.de-DE-Neural2-B';
const say = (t) => `<Say language="de-DE" voice="${VOICE}">${escX(t)}</Say>`;

const client = (env) => new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, fetch: (...a) => globalThis.fetch(...a) });

/* ---------- 5.9: one AI entry point – Gemini (free) when its key is set, otherwise Claude (paid, tracked) ---------- */
const GEM_DEFAULT = 'gemini-3.5-flash-lite';
const useGemini = (env) => !!env.GEMINI_API_KEY;
let gemCache = null;
export async function gemModel(env) {
  if (env.GEMINI_MODEL) return env.GEMINI_MODEL;
  if (gemCache && Date.now() - gemCache.at < 864e5) return gemCache.lite;
  const c = await kvGet(env, 'gemModels', null);
  if (c && Date.now() - c.at < 7 * 864e5) { gemCache = c; return c.lite; }
  try { const m = await G.gemModels(env.GEMINI_API_KEY); gemCache = { lite: m.lite || GEM_DEFAULT, flash: m.flash, at: Date.now() }; await kvPut(env, 'gemModels', gemCache); return gemCache.lite; }   // one write per week
  catch { return GEM_DEFAULT; }
}
// messages/tools in Claude format; returns {content, stop_reason, parts?}
async function llm(env, { system, messages, tools = [], maxTokens = 600, claudeModel = 'claude-haiku-5-5', raw, ids, tries = 4 }) {
  if (useGemini(env)) {
    const model = await gemModel(env);
    return G.gemStream({ key: env.GEMINI_API_KEY, model, system, history: messages, tools, maxTokens, raw, ids, stream: false, tries }).finalMessage();
  }
  const r = await client(env).messages.create({ model: claudeModel, max_tokens: maxTokens, system, messages, tools, output_config: { effort: 'low' } });
  await addCost(env, claudeModel, r.usage); return r;
}

/* ---------- 5.9: phone money – real Twilio prices for Switzerland (Aug 2026: landline 0.0419, mobile 0.18–0.25 $/min, billed per started minute) ---------- */
const telKey = () => 'telkosten:' + new Date().toISOString().slice(0, 7);
export function telRate(num) { if (/^\+417[5-9]/.test(num)) return 0.26; if (/^\+41/.test(num)) return 0.05; return 0.30; }   // rounded up – never under-estimate
export async function telCheck(env, num, maxMin) {
  const p = await kvGet(env, 'policy', {}); const budget = p.budgetTel ?? p.budget ?? 3.5, fee = p.nummerUsd ?? 1.15;   // budget = older apps
  const spent = await kvGet(env, telKey(), 0), est = fee + spent + maxMin * telRate(num) + 0.01;
  return est > budget ? `Telefon-Budget dieses Monats (${budget.toFixed(2)} $) würde überschritten – bisher ${(fee + spent).toFixed(2)} $ inkl. Nummer, dieser Anruf bis zu ${(maxMin * telRate(num)).toFixed(2)} $` : null;
}

/* ---------- 5.7: own AI cost tracking (USD per month) – Sparmodus caps the server at policy.kiBudgetServer ---------- */
const PRICE = { 'claude-haiku-5-5': [0.10, 0.50, 0.01, 0.125], 'claude-sonnet-5-5': [2, 10, 0.10, 2.5], 'claude-opus-5-5': [4, 20, 0.20, 5] };
const monthKey = () => 'kosten:' + new Date().toISOString().slice(0, 7);
async function addCost(env, model, u) {
  if (!u) return 0; const [i, o, cr, cw] = PRICE[model] || PRICE['claude-opus-5-5'];
  const usd = ((u.input_tokens || 0) * i + (u.output_tokens || 0) * o + (u.cache_read_input_tokens || 0) * cr + (u.cache_creation_input_tokens || 0) * cw) / 1e6 + (u.server_tool_use?.web_search_requests || 0) * 0.01;
  await kvPut(env, monthKey(), (await kvGet(env, monthKey(), 0)) + usd); return usd;
}
async function overBudget(env) { const p = await kvGet(env, 'policy', {}); return p.sparmodus && p.kiBudgetServer != null && (await kvGet(env, monthKey(), 0)) >= p.kiBudgetServer; }

/* ---------- helpers ---------- */
async function kvGet(env, k, d) { const v = await env.JARVIS_KV.get(k); return v ? JSON.parse(v) : d; }
async function kvPut(env, k, v, ttl) { await env.JARVIS_KV.put(k, JSON.stringify(v), ttl ? { expirationTtl: ttl } : undefined); }
async function inboxAdd(env, item) { const box = await kvGet(env, 'inbox', []); box.push({ id: crypto.randomUUID(), ts: Date.now(), ...item }); await kvPut(env, 'inbox', box.slice(-50)); }
function authed(req, env) { return env.JARVIS_TOKEN && req.headers.get('authorization') === 'Bearer ' + env.JARVIS_TOKEN; }

/** Twilio webhook signature check (HMAC-SHA1 over URL + sorted POST params) */
export async function twilioValid(req, env, params) {
  const sig = req.headers.get('x-twilio-signature'); if (!sig || !env.TWILIO_TOKEN) return false;
  const data = req.url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.TWILIO_TOKEN), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
  return btoa(String.fromCharCode(...mac)) === sig;
}

/* ---------- call policy: quiet hours, daily cap, monthly budget (enforced server-side) ---------- */
export async function policyCheck(env, dringlichkeit = 'normal', now = new Date()) {
  const p = await kvGet(env, 'policy', { quietFrom: '22:00', quietTo: '07:00', maxCalls: 3, budget: 10, tz: 'Europe/Zurich' });
  const log = (await kvGet(env, 'calllog', [])).filter((t) => now - t < 30 * 864e5);
  const parts = new Intl.DateTimeFormat('de-CH', { timeZone: p.tz || 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now).split(':').map(Number);
  const hm = parts[0] * 60 + parts[1], toM = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
  const a = toM(p.quietFrom), b = toM(p.quietTo); const quiet = a === b ? false : a < b ? hm >= a && hm < b : hm >= a || hm < b;
  const money = await telCheck(env, env.USER_PHONE || '+41790000000', 3);   // 5.9: the money cap holds even with "no limits"
  if (p.unbegrenzt) return log.filter((t) => now - t < 864e5).length >= 30 ? 'Notbremse: 30 Anrufe in 24 h (Schutz vor Endlosschleifen)' : money;   // 5.6: user chose no limits
  if (quiet && dringlichkeit !== 'notfall') return `Ruhezeit ${p.quietFrom}–${p.quietTo}`;
  const today = log.filter((t) => now - t < 864e5).length; if (today >= (p.maxCalls ?? 3)) return `Tageslimit erreicht (${today}/${p.maxCalls})`;
  return money;
}

/* ---------- outbound phone call (real PSTN call via Twilio) ---------- */
export async function startCall(env, origin, { anlass, nachricht, dringlichkeit = 'normal' }) {
  const blocked = await policyCheck(env, dringlichkeit);
  if (blocked) return { ok: false, art: 'telefonanruf (Twilio)', grund: 'Nicht angerufen: ' + blocked };
  if (!env.TWILIO_SID || !env.TWILIO_TOKEN || !env.TWILIO_FROM || !env.USER_PHONE) return { ok: false, art: 'telefonanruf', grund: 'Twilio ist nicht eingerichtet (keine Kosten).' };
  const id = crypto.randomUUID();
  await kvPut(env, 'call:' + id, { anlass, nachricht, verlauf: [], start: Date.now() }, 3600);
  const body = new URLSearchParams({ To: env.USER_PHONE, From: env.TWILIO_FROM, Url: `${origin}/twiml/start?c=${id}`, StatusCallback: `${origin}/twiml/status?c=${id}`, StatusCallbackEvent: 'answered completed', MachineDetection: 'Enable', TimeLimit: '180' });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_SID}/Calls.json`, { method: 'POST', body, headers: { authorization: 'Basic ' + btoa(env.TWILIO_SID + ':' + env.TWILIO_TOKEN), 'content-type': 'application/x-www-form-urlencoded' } });
  const j = await r.json().catch(() => ({}));
  if (r.ok) { const log = await kvGet(env, 'calllog', []); log.push(Date.now()); await kvPut(env, 'calllog', log.slice(-200)); }
  return r.ok ? { ok: true, art: 'telefonanruf (Twilio)', status: j.status, callSid: j.sid, hinweis: 'Twilio hat den Anruf angenommen. Ob abgehoben wurde, meldet der Server im Posteingang.' } : { ok: false, art: 'telefonanruf (Twilio)', grund: j.message || 'HTTP ' + r.status };
}

/* ---------- 5.2: calls to THIRD parties (e.g. restaurant reservation) ---------- */
// Rules: user approval in the app for every call · must be enabled in the app (policy.dritteErlaubt) · JARVIS always says it is an AI
// · only normal numbers in allowed countries (no emergency, short, premium or satellite numbers) · daytime only · daily caps · max 5 min
const PREMIUM = [/^\+4190/, /^\+41(1[0-9]{2}|14[0-9])$/, /^\+49(900|137|138|118|19)/, /^\+43(9[0-3]0|939)/, /^\+423(90)/, /^\+88/, /^\+87/];
export function normNumber(raw, land = '41') {
  let n = String(raw || '').replace(/[\s\-()./]/g, '');
  if (n.startsWith('00')) n = '+' + n.slice(2); else if (n.startsWith('0')) n = '+' + land + n.slice(1);
  return n;
}
export async function thirdCallCheck(env, nummer, now = new Date()) {
  const p = await kvGet(env, 'policy', {});
  if (!p.dritteErlaubt) return 'Anrufe an Dritte sind in der App nicht eingeschaltet';
  if (!/^\+[1-9]\d{8,14}$/.test(nummer)) return 'Keine gültige Telefonnummer (Notruf- und Kurznummern sind gesperrt): ' + nummer;
  if (PREMIUM.some((r) => r.test(nummer))) return 'Mehrwert-/Sondernummern sind gesperrt';
  const länder = p.länder || ['41', '49', '43', '423'];
  if (!länder.some((c) => nummer.startsWith('+' + c))) return 'Land nicht freigegeben (erlaubt: +' + länder.join(', +') + ')';
  const [h, m] = new Intl.DateTimeFormat('de-CH', { timeZone: p.tz || 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now).split(':').map(Number);
  const hm = h * 60 + m, toM = (t) => { const [a, b] = String(t).split(':').map(Number); return a * 60 + (b || 0); };
  const [von, bis] = p.unbegrenzt ? ['07:00', '22:00'] : [p.dritteVon || '08:00', p.dritteBis || '20:00'];   // other people are never called at night
  if (hm < toM(von) || hm >= toM(bis)) return `Anrufe an Dritte nur ${von}–${bis}`;
  const log = (await kvGet(env, 'thirdlog', [])).filter((x) => now - x.t < 864e5);
  if (p.unbegrenzt) {   // 5.6: no user limits, only brakes against loops/harassment
    if (log.length >= 50) return 'Notbremse: 50 Anrufe an Dritte in 24 h (Schutz vor Endlosschleifen)';
    if (log.filter((x) => x.n === nummer).length >= 6) return 'Notbremse: diese Nummer heute schon 6× angerufen';
    return telCheck(env, nummer, 5);
  }
  if (log.length >= (p.maxDritte ?? 5)) return `Tageslimit für Anrufe an Dritte erreicht (${log.length}/${p.maxDritte ?? 5})`;
  if (log.filter((x) => x.n === nummer).length >= 2) return 'Diese Nummer wurde heute schon zweimal angerufen';
  return telCheck(env, nummer, 5);   // 5.9: real prices, real minutes
}
export async function startThirdCall(env, origin, { nummer, name = '', ziel = '', darf_sagen = '', spielraum = '', frei = '' }) {
  const p = await kvGet(env, 'policy', {});
  const num = normNumber(nummer, p.land || '41');
  const blocked = await thirdCallCheck(env, num);
  if (blocked) return { ok: false, grund: 'Nicht angerufen: ' + blocked };
  if (!String(ziel).trim()) return { ok: false, grund: 'Kein Gesprächsziel angegeben' };
  if (!env.TWILIO_SID || !env.TWILIO_TOKEN || !env.TWILIO_FROM) return { ok: false, grund: 'Twilio ist nicht eingerichtet (keine Kosten).' };
  const id = crypto.randomUUID();
  await kvPut(env, 'call:' + id, { modus: 'dritte', nummer: num, name, ziel, darf_sagen, spielraum: String(spielraum).slice(0, 300), frei: String(frei).slice(0, 300), nutzer: p.persona?.name || 'meinem Nutzer', verlauf: [], start: Date.now() }, 3600);
  const body = new URLSearchParams({ To: num, From: env.TWILIO_FROM, Url: `${origin}/twiml/start?c=${id}`, StatusCallback: `${origin}/twiml/status?c=${id}`, StatusCallbackEvent: 'answered completed', MachineDetection: 'Enable', TimeLimit: '300' });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_SID}/Calls.json`, { method: 'POST', body, headers: { authorization: 'Basic ' + btoa(env.TWILIO_SID + ':' + env.TWILIO_TOKEN), 'content-type': 'application/x-www-form-urlencoded' } });
  const j = await r.json().catch(() => ({}));
  if (r.ok) { const log = await kvGet(env, 'thirdlog', []); log.push({ t: Date.now(), n: num }); await kvPut(env, 'thirdlog', log.slice(-200)); }
  return r.ok ? { ok: true, id, nummer: num, status: j.status, hinweis: 'Twilio wählt. Das Gesprächsergebnis kommt in den Posteingang.' } : { ok: false, grund: j.message || 'HTTP ' + r.status };
}
const THIRD_TOOLS = [{ name: 'gespraech_beenden', description: 'Beendet das Telefonat, wenn das Ziel erreicht ist, klar nicht erreichbar ist oder das Gegenüber auflegen will.', input_schema: { type: 'object', properties: { erfolg: { type: 'boolean' }, abweichung: { type: 'boolean', description: 'true, wenn du eine Alternative statt des ursprünglichen Wunsches vereinbart hast' }, ergebnis: { type: 'string', description: 'Was genau vereinbart/erfahren wurde (Datum, Uhrzeit, Name, Bedingungen) oder warum nicht' }, abschied: { type: 'string' } }, required: ['erfolg', 'abweichung', 'ergebnis', 'abschied'], additionalProperties: false } }];
export async function thirdTurn(env, call, heard) {
  call.verlauf.push({ role: 'user', content: heard || '(nichts verstanden)' });
  const sys = `Du bist J.A.R.V.I.S., ein KI-Telefonassistent, und rufst im Auftrag von ${call.nutzer} bei ${call.name || 'dieser Nummer'} an.
AUFTRAG (vom Nutzer freigegeben): ${call.ziel}
DARFST DU SAGEN: ${call.darf_sagen || 'nur den Namen deines Auftraggebers und das Anliegen'}
REGELN:
- Im ersten Satz: Begrüssung, dass du ein KI-Assistent (keine echte Person) im Auftrag von ${call.nutzer} bist und das Anliegen in einem Satz.
- Fragt jemand, ob du eine Maschine/KI bist: immer ehrlich ja.
- Kurz und höflich, wie am Telefon üblich, 1–2 Sätze pro Antwort, Deutsch.
SPIELRAUM FÜR ALTERNATIVEN: ${call.spielraum || 'keiner – nur genau wie im Auftrag'}
FREIE ZEITEN IM KALENDER VON ${call.nutzer}: ${call.frei || 'unbekannt'}
- Geht der Wunsch nicht: Denk mit. Liegt eine angebotene oder von dir erfragte Alternative im SPIELRAUM (und in den freien Zeiten, falls bekannt), sag sie selbst zu und beende mit erfolg=true, abweichung=true – ${call.nutzer} wird danach informiert und kann es ändern. Frag ruhig aktiv nach der nächstbesten Möglichkeit.
- Ausserhalb des Spielraums oder wenn Kosten, Anzahlung, Kreditkarte oder ein Vertrag nötig wären: NICHT zusagen, sondern sagen, dass du es mit ${call.nutzer} klärst und dich meldest – dann gespraech_beenden mit erfolg=false und den Details.
- Keine Zahlungs-, Ausweis- oder Kontodaten, nichts ausser „DARFST DU SAGEN“. Nichts erfinden.
- Ist alles geklärt oder will das Gegenüber auflegen: gespraech_beenden mit dem genauen Ergebnis (bei Erfolg: was genau vereinbart wurde und auf welchen Namen).`;
  const r = await llm(env, { system: sys, messages: call.verlauf.map((m) => ({ role: m.role, content: m.content })), tools: THIRD_TOOLS, maxTokens: 500, claudeModel: MODEL_CALL, tries: 2 });   // phone: no long waiting
  let text = r.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
  const end = r.content.find((b) => b.type === 'tool_use' && b.name === 'gespraech_beenden');
  if (call.verlauf.length === 1 && !/\bKI\b|künstliche intelligenz|assistent/i.test(text)) text = `Guten Tag, hier spricht JARVIS, ein KI-Assistent, keine echte Person, im Auftrag von ${call.nutzer}. ` + text;   // disclosure is enforced, not left to the model
  call.verlauf.push({ role: 'assistant', content: text || end?.input.abschied || 'Einen Moment.' });
  const forced = !end && call.verlauf.length >= 24;   // ~12 exchanges max
  return { text, end: end ? end.input : forced ? { erfolg: false, ergebnis: 'Gespräch nach 12 Wechseln ohne Ergebnis beendet', abschied: 'Ich melde mich nochmals. Auf Wiederhören.' } : null };
}

/* ---------- voice dialogue: one Claude turn per spoken utterance ---------- */
const CALL_TOOLS = [
  { name: 'aufgabe_merken', description: 'Merkt eine Aufgabe/Entscheidung, die die JARVIS-App nach dem Gespräch ausführen soll.', input_schema: { type: 'object', properties: { aufgabe: { type: 'string' } }, required: ['aufgabe'], additionalProperties: false } },
  { name: 'auflegen', description: 'Beendet das Gespräch, wenn alles geklärt ist oder der Nutzer auflegen möchte.', input_schema: { type: 'object', properties: { abschied: { type: 'string' } }, required: ['abschied'], additionalProperties: false } },
];
export async function callTurn(env, call, heard) {
  call.verlauf.push({ role: 'user', content: heard || '(keine Antwort verstanden)' });
  const per = (await kvGet(env, 'policy', {})).persona || {};
  const sys = `Du bist J.A.R.V.I.S., der persönliche KI-Assistent von ${per.name || 'deinem Nutzer'}: ruhig, souverän, ehrlich, mit trockenem, subtilem Humor (Stufe ${per.humor ?? 2}/3, Sarkasmus ${per.sarkasmus ?? 1}/3) – aber bei Problemen, Notfällen oder Stress ernst und sachlich. Keine Floskeln. ${per.anrede === 'du' ? 'Du duzt ihn.' : 'Du siezt ihn.'} Du telefonierst gerade mit ihm, weil: ${call.anlass}. Information: ${call.nachricht}. Sprich kurz, natürlich und auf Deutsch (1–2 Sätze, keine Aufzählungen, kein Markdown). Beantworte seine Rückfragen. Kläre die Entscheidung oder Anweisung des Nutzers. Wenn er dir etwas aufträgt, rufe aufgabe_merken auf. Wenn alles geklärt ist, verabschiede dich mit auflegen.`;
  const msgs = call.verlauf.map((m) => ({ role: m.role, content: m.content }));
  const r = await llm(env, { system: sys, messages: msgs, tools: CALL_TOOLS, maxTokens: 600, claudeModel: MODEL_CALL, tries: 2 });
  const text = r.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
  const tasks = r.content.filter((b) => b.type === 'tool_use' && b.name === 'aufgabe_merken').map((b) => b.input.aufgabe);
  const hang = r.content.find((b) => b.type === 'tool_use' && b.name === 'auflegen');
  call.verlauf.push({ role: 'assistant', content: text || hang?.input.abschied || 'Verstanden.' });
  call.aufgaben = (call.aufgaben || []).concat(tasks);
  return { text: text || '', tasks, hangup: !!hang, abschied: hang?.input.abschied };
}

/* ---------- background watchers (cron) ---------- */
export async function runWatcher(env, w) {
  if (useGemini(env)) return runWatcherGem(env, w);
  const spar = !!(await kvGet(env, 'policy', {})).sparmodus;
  const model = spar ? 'claude-haiku-5-5' : MODEL_WATCH;   // 5.7 Sparmodus: Haiku (40× cheaper), one web search
  const tools = [spar ? { type: 'web_search_20250305', name: 'web_search', max_uses: 1 } : { type: 'web_search_20260209', name: 'web_search', max_uses: 3 },
    { name: 'bericht', description: 'Abschlussbericht, genau einmal am Ende.', input_schema: { type: 'object', properties: { ausgelöst: { type: 'boolean' }, stand: { type: 'string' }, meldung: { type: 'string' } }, required: ['ausgelöst', 'stand'], additionalProperties: false } }];
  const msgs = [{ role: 'user', content: `Zeit: ${new Date().toISOString()}\nRegel: "${w.regel}"\nLetzter Stand: ${w.last || '—'}\nPrüfe, ob die Regel JETZT ausgelöst ist, und rufe am Ende "bericht" auf.` }];
  for (let i = 0; i < 5; i++) {
    const params = { model, max_tokens: 4000, system: 'Wächter-Modul von J.A.R.V.I.S. Sachlich, nur auslösen wenn wirklich erfüllt.', messages: msgs, tools, output_config: { effort: 'low' } };
    if (!spar) Object.assign(params, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });   // Haiku has no server-side fallback
    const r = await client(env).beta.messages.create(params);
    await addCost(env, model, r.usage);
    msgs.push({ role: 'assistant', content: r.content });
    const rep = r.content.find((b) => b.type === 'tool_use' && b.name === 'bericht');
    if (rep) return rep.input;
    if (r.stop_reason === 'pause_turn') continue;
    if (r.stop_reason !== 'tool_use') break;
    msgs.push({ role: 'user', content: r.content.filter((b) => b.type === 'tool_use').map((b) => ({ type: 'tool_result', tool_use_id: b.id, content: 'Nur bericht ist verfügbar.' })) });
  }
  return { ausgelöst: false, stand: 'keine Auswertung' };
}
// 5.9: watcher with the free Gemini brain – Google search as a tool, report via function call
async function gemSearch(env, query) {
  const s = await G.gemOnce({ key: env.GEMINI_API_KEY, model: await gemModel(env), search: true, maxTokens: 1200, prompt: `Aktuelle Infos (heute ${new Date().toISOString().slice(0, 10)}): ${query}\nAntworte knapp auf Deutsch mit konkreten Fakten, Zahlen und Datum.` });
  return { antwort: s.text, quellen: s.sources.slice(0, 5) };
}
const WATCH_TOOLS = [
  { name: 'websuche', description: 'Google-Suche nach aktuellen Infos (Preise, Wetter, News, Spielstände, Verfügbarkeit).', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'bericht', description: 'Abschlussbericht, genau einmal am Ende.', input_schema: { type: 'object', properties: { ausgelöst: { type: 'boolean' }, stand: { type: 'string' }, meldung: { type: 'string' } }, required: ['ausgelöst', 'stand'] } }];
async function runWatcherGem(env, w) {
  const msgs = [{ role: 'user', content: `Zeit: ${new Date().toISOString()}\nRegel: "${w.regel}"\nLetzter Stand: ${w.last || '—'}\nPrüfe mit websuche, ob die Regel JETZT ausgelöst ist, und rufe am Ende genau einmal "bericht" auf.` }];
  const raw = new WeakMap(), ids = {};
  for (let i = 0; i < 4; i++) {
    const m = await llm(env, { system: 'Wächter-Modul von J.A.R.V.I.S. Sachlich, nur auslösen wenn wirklich erfüllt.', messages: msgs, tools: WATCH_TOOLS, maxTokens: 2048, raw, ids });
    if (!m.content.length) break;
    const a = { role: 'assistant', content: m.content }; msgs.push(a); if (m.parts) raw.set(a, m.parts);
    const rep = m.content.find((b) => b.type === 'tool_use' && b.name === 'bericht'); if (rep) return rep.input;
    if (m.stop_reason !== 'tool_use') break;
    const res = [];
    for (const u of m.content.filter((b) => b.type === 'tool_use')) {
      try { res.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(u.name === 'websuche' ? await gemSearch(env, u.input?.query || w.regel) : { fehler: 'unbekanntes Werkzeug' }) }); }
      catch (e) { res.push({ type: 'tool_result', tool_use_id: u.id, is_error: true, content: e.message }); }
    }
    msgs.push({ role: 'user', content: res });
  }
  return { ausgelöst: false, stand: 'keine Auswertung' };
}

/* ---------- 5.9: routines – fixed times (and weekdays), run by the server even when the phone is off ---------- */
const TAGE = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];
export async function routinenRun(env, origin, now = new Date()) {
  const list = await kvGet(env, 'routinen', []); if (!list.length) return [];
  const pol = await kvGet(env, 'policy', {}); const tz = pol.tz || 'Europe/Zurich';
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(now);
  const wd = TAGE[new Date(day + 'T12:00:00Z').getUTCDay()];
  const [h, m] = new Intl.DateTimeFormat('de-CH', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now).split(':').map(Number);
  const out = [];
  for (const r of list) {
    if (r.aus || r.zuletzt === day || !/^\d{1,2}:\d{2}$/.test(r.zeit || '')) continue;
    if (Array.isArray(r.tage) && r.tage.length && !r.tage.includes(wd)) continue;
    const [rh, rm] = r.zeit.split(':').map(Number); const d = h * 60 + m - (rh * 60 + rm);
    if (d < 0 || d > 45) continue;                     // cron every 15 min → within 45 min, never hours late
    r.zuletzt = day; await kvPut(env, 'routinen', list);   // mark first: never twice
    let text;
    try { text = await routineAI(env, r, day, tz); } catch (e) { text = 'Routine konnte nicht ausgeführt werden (' + e.message + ').'; }
    if (env.NTFY_TOPIC) await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}?title=${encodeURIComponent('Routine: ' + r.name)}&priority=${r.kanal === 'wichtig' ? 4 : 3}&tags=repeat`, { method: 'POST', body: text });
    let anruf = null; if (r.kanal === 'anruf') anruf = await startCall(env, origin, { anlass: 'Routine ' + r.name, nachricht: text.slice(0, 600) });
    await inboxAdd(env, { typ: 'routine', name: r.name, ergebnis: text, tag: day, anruf: anruf && (anruf.ok ? 'angerufen' : anruf.grund) });
    out.push({ routine: r.name });
  }
  return out;
}
async function routineAI(env, r, day, tz) {
  const b = await kvGet(env, 'briefing', {});
  const loc = (x) => new Intl.DateTimeFormat('de-CH', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(x));
  const termine = (b.termine || []).filter((t) => new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(new Date(t.start)) === day).map((t) => `${loc(t.start)} ${t.titel}`);
  const prompt = `Heute ist ${day}. Routine von ${b.anrede || 'deinem Nutzer'} („${r.name}“): ${r.auftrag}\nTermine heute: ${termine.join(', ') || 'keine'}\nErledige das jetzt und antworte als J.A.R.V.I.S. kurz (höchstens 6 Sätze), auf Deutsch, mit konkreten Fakten – ohne Markdown.`;
  if (useGemini(env)) return (await G.gemOnce({ key: env.GEMINI_API_KEY, model: await gemModel(env), search: true, maxTokens: 1200, prompt })).text || '(keine Antwort)';
  if (await overBudget(env)) return 'Server-KI-Budget dieses Monats erreicht – Routine übersprungen.';
  const m = await client(env).messages.create({ model: 'claude-haiku-5-5', max_tokens: 1200, messages: [{ role: 'user', content: prompt }], tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 1 }], output_config: { effort: 'low' } });
  await addCost(env, 'claude-haiku-5-5', m.usage); return m.content.filter((x) => x.type === 'text').map((x) => x.text).join(' ').trim();
}
async function notify(env, origin, w, meldung) {
  const res = {};
  if (env.NTFY_TOPIC) { const r = await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}?title=${encodeURIComponent('Wächter: ' + w.regel.slice(0, 40))}&priority=${w.stufe === 'anruf' ? 5 : 4}&tags=robot`, { method: 'POST', body: meldung }); res.push = r.ok ? 'zugestellt (ntfy)' : 'fehlgeschlagen HTTP ' + r.status; }
  if (w.stufe === 'anruf') res.anruf = await startCall(env, origin, { anlass: 'Wächter ausgelöst: ' + w.regel, nachricht: meldung });
  return res;
}
// 5.2: scheduled briefings as push, also when the app is closed (calendar + location are synced by the app)
async function briefingRun(env, now = new Date()) {
  const b = await kvGet(env, 'briefing', null); if (!b || (!b.morgen && !b.abend)) return null;
  const tz = b.tz || 'Europe/Zurich';
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(now);
  const [h, m] = new Intl.DateTimeFormat('de-CH', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now).split(':').map(Number);
  const mins = h * 60 + m; const sent = b.gesendet || {};
  for (const art of ['morgen', 'abend']) {
    if (!b[art] || sent[art] === day) continue;
    const [bh, bm] = b[art].split(':').map(Number); const d = mins - (bh * 60 + bm);
    if (d < 0 || d > 45) continue;                                  // cron runs every 15 min → send within 45 min, never late at night
    sent[art] = day; b.gesendet = sent; await kvPut(env, 'briefing', b);   // mark first: never twice, even if generation fails
    let wetter = '';
    if (b.ort?.lat != null) {
      try {
        const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${b.ort.lat}&longitude=${b.ort.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&current=temperature_2m&timezone=auto&forecast_days=2`)).json();
        const i = art === 'morgen' ? 0 : 1;
        wetter = `jetzt ${w.current.temperature_2m}°C; ${art === 'morgen' ? 'heute' : 'morgen'} ${w.daily.temperature_2m_min[i]}–${w.daily.temperature_2m_max[i]}°C, Regen ${w.daily.precipitation_probability_max[i]}%`;
      } catch (e) { wetter = 'Wetter nicht abrufbar'; }
    }
    const ziel = art === 'morgen' ? day : new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(new Date(now.getTime() + 86400e3));
    const loc = (d) => ({ tag: new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(new Date(d)), zeit: new Intl.DateTimeFormat('de-CH', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(d)) });   // stored as UTC → local time
    const termine = (b.termine || []).filter((t) => loc(t.start).tag === ziel).sort((x, y) => new Date(x.start) - new Date(y.start)).map((t) => `${loc(t.start).zeit} ${t.titel}`);
    // 5.4: free – composed from the data, no AI call
    const text = `${art === 'morgen' ? 'Guten Morgen' : 'Guten Abend'}${b.anrede ? ', ' + b.anrede : ''}. ${wetter ? 'Wetter ' + wetter + '. ' : ''}${termine.length ? (art === 'morgen' ? 'Heute' : 'Morgen') + ': ' + termine.join(', ') + '.' : (art === 'morgen' ? 'Heute' : 'Morgen') + ' ist dein Kalender frei.'}`;
    if (env.NTFY_TOPIC) await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}?title=${encodeURIComponent(art === 'morgen' ? 'Morgen-Briefing' : 'Abend-Briefing')}&priority=3&tags=${art === 'morgen' ? 'sunrise' : 'crescent_moon'}`, { method: 'POST', body: text });
    await inboxAdd(env, { typ: 'briefing', art, meldung: text, tag: day });
    return { art, text };
  }
  return null;
}
export { briefingRun };
export async function cron(env, origin) {
  const watchers = await kvGet(env, 'watchers', []); const out = []; const pol = await kvGet(env, 'policy', {});
  const minMin = useGemini(env) ? 60 : pol.sparmodus ? 720 : 0;   // Gemini: free but daily quota → at most hourly; Claude-Sparmodus: every 12 h
  try { const br = await briefingRun(env); if (br) out.push({ briefing: br.art }); } catch (e) { out.push({ briefing_fehler: e.message }); }
  try { out.push(...await routinenRun(env, origin)); } catch (e) { out.push({ routinen_fehler: e.message }); }
  for (const w of watchers) {
    if (Date.now() - (w.lastRun || 0) < Math.max(w.intervall_min || 30, minMin) * 60e3 - 30e3) continue;
    if (!useGemini(env) && await overBudget(env)) { w.last = 'Server-KI-Budget dieses Monats erreicht (Sparmodus) – Prüfung pausiert'; out.push({ id: w.id, budget: true }); continue; }
    w.lastRun = Date.now();
    try {
      const r = await runWatcher(env, w); w.last = r.stand;
      if (r.ausgelöst && r.meldung && r.meldung !== w.lastAlert) { w.lastAlert = r.meldung; const k = await notify(env, origin, w, r.meldung); await inboxAdd(env, { typ: 'wächter', regel: w.regel, meldung: r.meldung, kontakt: k }); out.push({ id: w.id, ausgelöst: true, kontakt: k }); }
      else out.push({ id: w.id, ausgelöst: false });
    } catch (e) { w.last = 'Fehler: ' + e.message; out.push({ id: w.id, fehler: e.message }); }
  }
  if (out.length) await kvPut(env, 'watchers', watchers);   // 5.7: write only when something ran (Cloudflare free: 1000 writes/day)
  await kvPut(env, 'heartbeat', { ts: Date.now(), geprüft: out.length });
  return out;
}

/* ---------- HTTP router ---------- */
export default {
  async fetch(req, env) {
    const url = new URL(req.url); const origin = env.PUBLIC_URL || url.origin;
    if (req.method === 'OPTIONS') return json({});
    // --- Twilio webhooks (signature-checked) ---
    if (url.pathname.startsWith('/twiml/')) {
      const params = Object.fromEntries(await req.formData().then((f) => [...f.entries()]).catch(() => []));
      if (!(await twilioValid(req, env, params))) return new Response('forbidden', { status: 403 });
      const cid = url.searchParams.get('c'); const call = await kvGet(env, 'call:' + cid, null);
      if (!call) return xml(say('Dieser Anruf ist abgelaufen.') + '<Hangup/>');
      if (url.pathname === '/twiml/status' && params.CallStatus === 'completed' && params.CallDuration && !call.billed) {   // 5.9: count the real minutes
        call.billed = true; const usd = Math.ceil(+params.CallDuration / 60) * telRate(call.nummer || env.USER_PHONE || '') + 0.01;
        await kvPut(env, telKey(), (await kvGet(env, telKey(), 0)) + usd); await kvPut(env, 'call:' + cid, call, 3600);
      }
      try {
      const gather = (t) => `<Gather input="speech" language="de-CH" speechTimeout="auto" action="${origin}/twiml/turn?c=${cid}" method="POST">${say(t)}</Gather>${say('Ich habe nichts gehört. Ich melde mich in der App. Auf Wiederhören.')}<Hangup/>`;
      if (call.modus === 'dritte' && (url.pathname === '/twiml/start' || url.pathname === '/twiml/turn')) {
        const fin = async (e) => { let rückruf = null; if (e.erfolg && e.abweichung && (await kvGet(env, 'policy', {})).rückruf) { rückruf = await startCall(env, origin, { anlass: 'Rückfrage zu ' + (call.name || call.nummer), nachricht: `Kurze Rückmeldung zu ${call.name || 'deinem Auftrag'}: Dein Wunsch ging nicht, ich habe selbst entschieden. ${e.ergebnis}. Passt das so, oder soll ich es ändern?` }).catch((x) => ({ ok: false, grund: x.message })); if (!rückruf.ok && env.NTFY_TOPIC) await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}?title=${encodeURIComponent('JARVIS hat entschieden')}&priority=4&tags=robot`, { method: 'POST', body: e.ergebnis + ' – passt das? Antworte in der App.' }); }
          await inboxAdd(env, { typ: 'anruf_dritte', abweichung: !!e.abweichung, rückruf: rückruf && (rückruf.ok ? 'angerufen' : rückruf.grund), nummer: call.nummer, name: call.name, ziel: call.ziel, erfolg: !!e.erfolg, ergebnis: e.ergebnis, verlauf: call.verlauf.filter((m) => !String(m.content).startsWith('(')).map((m) => (m.role === 'user' ? 'Gegenüber: ' : 'JARVIS: ') + m.content) }); call.done = true; await kvPut(env, 'call:' + cid, call, 3600); };
        if (url.pathname === '/twiml/start' && params.AnsweredBy && params.AnsweredBy.startsWith('machine')) { await fin({ erfolg: false, ergebnis: 'Anrufbeantworter erreicht – keine Nachricht hinterlassen' }); return xml('<Hangup/>'); }
        const t = await thirdTurn(env, call, url.pathname === '/twiml/start' ? '(Das Gegenüber hat abgenommen. Beginne das Gespräch.)' : params.SpeechResult);
        await kvPut(env, 'call:' + cid, call, 3600);
        if (t.end) { await fin(t.end); return xml(say([t.text, t.end.abschied].filter(Boolean).join(' ') || 'Auf Wiederhören.') + '<Hangup/>'); }
        return xml(`<Gather input="speech" language="de-CH" speechTimeout="auto" action="${origin}/twiml/turn?c=${cid}" method="POST">${say(t.text || 'Entschuldigung, können Sie das wiederholen?')}</Gather>` + say('Ich habe Sie leider nicht verstanden. Ich melde mich später nochmals. Auf Wiederhören.') + '<Hangup/>');
      }
      if (url.pathname === '/twiml/start') {
        if (params.AnsweredBy && params.AnsweredBy.startsWith('machine')) { await inboxAdd(env, { typ: 'anruf', ergebnis: 'Mailbox erreicht', anlass: call.anlass }); return xml(say(`Hier ist JARVIS. ${call.nachricht} Bitte öffne die App.`) + '<Hangup/>'); }
        return xml(gather(`Hallo, hier ist JARVIS. ${call.nachricht} Wie soll ich vorgehen?`));
      }
      if (url.pathname === '/twiml/turn') {
        const t = await callTurn(env, call, params.SpeechResult);
        await kvPut(env, 'call:' + cid, call, 3600);
        if (t.hangup) { await inboxAdd(env, { typ: 'anruf', anlass: call.anlass, aufgaben: call.aufgaben || [], verlauf: call.verlauf }); return xml(say(t.text ? t.text + ' ' + (t.abschied || '') : t.abschied || 'Auf Wiederhören.') + '<Hangup/>'); }
        return xml(gather(t.text || 'Verstanden. Noch etwas?'));
      }
      if (url.pathname === '/twiml/status') { if (call.modus === 'dritte' && !call.done && ['no-answer', 'busy', 'failed', 'canceled', 'completed'].includes(params.CallStatus)) { call.done = true; await kvPut(env, 'call:' + cid, call, 3600); await inboxAdd(env, { typ: 'anruf_dritte', nummer: call.nummer, name: call.name, ziel: call.ziel, erfolg: false, ergebnis: params.CallStatus === 'completed' ? 'Gespräch vorzeitig beendet (aufgelegt)' : 'nicht erreicht: ' + params.CallStatus, verlauf: call.verlauf.map((m) => m.content) }); return new Response('ok'); } if (call.modus === 'dritte') return new Response('ok'); if (params.CallStatus && ['no-answer', 'busy', 'failed', 'canceled'].includes(params.CallStatus)) await inboxAdd(env, { typ: 'anruf', ergebnis: 'nicht erreicht: ' + params.CallStatus, anlass: call.anlass }); return new Response('ok'); }
      } catch (e) {   // 5.9: AI down or quota used up → polite German goodbye instead of Twilio's English error message
        await inboxAdd(env, { typ: call.modus === 'dritte' ? 'anruf_dritte' : 'anruf', erfolg: false, nummer: call.nummer, name: call.name, ziel: call.ziel, anlass: call.anlass, ergebnis: 'Gespräch wegen technischer Störung beendet: ' + String(e.message || e).slice(0, 120), verlauf: (call.verlauf || []).map((m) => m.content) });
        call.done = true; await kvPut(env, 'call:' + cid, call, 3600);
        return xml(say(call.modus === 'dritte' ? 'Entschuldigung, ich habe gerade eine technische Störung. Wir melden uns später nochmals. Auf Wiederhören.' : 'Entschuldige, ich habe gerade eine technische Störung. Ich melde mich in der App. Bis später.') + '<Hangup/>');
      }
    }
    // --- 5.2: PC-agent relay, laptop side (own token: the laptop never holds the app token) ---
    if (url.pathname === '/api/agent/abholen' || (url.pathname === '/api/agent/ergebnis' && req.method === 'POST')) {
      if (!env.AGENT_TOKEN || req.headers.get('authorization') !== 'Bearer ' + env.AGENT_TOKEN) return json({ fehler: 'nicht autorisiert' }, 401);
      if (url.pathname === '/api/agent/abholen') {
        const seen = await kvGet(env, 'agentSeen', 0); if (Date.now() - seen > 5 * 60e3) await kvPut(env, 'agentSeen', Date.now());   // 5.7: free tier – max ~300 writes/day
        const q = await kvGet(env, 'agentq', []); if (!q.length) return json({ aufträge: [] });
        await kvPut(env, 'agentq', []);
        return json({ aufträge: q.filter((j) => Date.now() - j.ts < 120000) });   // stale jobs (>2 min) are dropped, never executed late
      }
      const b = await req.json(); if (!b.id) return json({ fehler: 'id fehlt' }, 400);
      await kvPut(env, 'agentres:' + b.id, { ok: !!b.ok, data: b.data }, 600);
      return json({ ok: true });
    }
    // --- JARVIS app API (bearer token) ---
    if (url.pathname.startsWith('/api/')) {
      if (!authed(req, env)) return json({ fehler: 'nicht autorisiert' }, 401);
      if (url.pathname === '/api/status') { const pol = await kvGet(env, 'policy', {}); return json({ ok: true, ki: useGemini(env) ? 'gemini' : env.ANTHROPIC_API_KEY ? 'claude' : null, twilio: !!(env.TWILIO_SID && env.USER_PHONE), ntfy: !!env.NTFY_TOPIC, heartbeat: await kvGet(env, 'heartbeat', null), wächter: (await kvGet(env, 'watchers', [])).length, routinen: (await kvGet(env, 'routinen', [])).length, pc_agent_zuletzt: await kvGet(env, 'agentSeen', null), ki_kosten_monat_usd: await kvGet(env, monthKey(), 0), telefon_kosten_monat_usd: +((env.TWILIO_SID ? (pol.nummerUsd ?? 1.15) : 0) + await kvGet(env, telKey(), 0)).toFixed(2) }); }
      if (url.pathname === '/api/anruf_dritte' && req.method === 'POST') return json(await startThirdCall(env, origin, await req.json()));
      if (url.pathname === '/api/call' && req.method === 'POST') return json(await startCall(env, origin, await req.json()));
      if (url.pathname === '/api/watchers' && req.method === 'PUT') { const body = await req.json(); const list = body.watchers || []; if (body.policy) await kvPut(env, 'policy', body.policy);
        if (Array.isArray(body.routinen)) { const old = await kvGet(env, 'routinen', []); await kvPut(env, 'routinen', body.routinen.slice(0, 30).map((r) => ({ ...r, zuletzt: old.find((o) => o.id === r.id)?.zuletzt }))); } if (body.briefing) { const ob = await kvGet(env, 'briefing', {}); await kvPut(env, 'briefing', { ...body.briefing, gesendet: ob.gesendet || {} }); } const old = await kvGet(env, 'watchers', []); await kvPut(env, 'watchers', list.map((w) => ({ ...(old.find((o) => o.id === w.id) || {}), ...w }))); return json({ ok: true, anzahl: list.length }); }
      if (url.pathname === '/api/inbox' && req.method === 'GET') { const box = await kvGet(env, 'inbox', []); if (box.length) await kvPut(env, 'inbox', []); return json({ einträge: box }); }   // 5.7: no write when empty
      if (url.pathname === '/api/agent/auftrag' && req.method === 'POST') {
        const b = await req.json(); const id = crypto.randomUUID();
        const q = await kvGet(env, 'agentq', []); q.push({ id, aktion: String(b.aktion || ''), args: b.args || {}, ts: Date.now() }); await kvPut(env, 'agentq', q.slice(-20));
        return json({ id, agent_zuletzt: await kvGet(env, 'agentSeen', null) });
      }
      if (url.pathname === '/api/agent/ergebnis' && req.method === 'GET') {
        const id = url.searchParams.get('id') || ''; const r = await kvGet(env, 'agentres:' + id, null);
        return json(r ? { fertig: true, ...r } : { fertig: false, agent_zuletzt: await kvGet(env, 'agentSeen', null) });
      }
      if (url.pathname === '/api/cron' && req.method === 'POST') return json(await cron(env, origin)); // manual trigger for tests
    }
    return json({ name: 'JARVIS-Server', ok: true });
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(cron(env, env.PUBLIC_URL || '')); },
};
