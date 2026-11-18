// 5.8 – Google Gemini as a free brain for JARVIS (Gemini API, free tier of Google AI Studio).
// JARVIS keeps its history in Claude format; this module translates both ways, so all tools work unchanged.
// Field names were checked against the real API (it validates the request shape before the key).
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const ID_OK = /^[a-zA-Z0-9_-]{1,64}$/;
const DUMMY_SIG = 'skip_thought_signature_validator';   // documented placeholder for calls that came from another model

export class GeminiError extends Error {
  constructor(msg, o = {}){ super(msg); Object.assign(this, o); }
}

// ---------- tool schemas: JSON Schema whitelist (Gemini's parametersJsonSchema) ----------
const KEEP = new Set(['type','description','enum','properties','required','items','minItems','maxItems','minimum','maximum','anyOf','oneOf','additionalProperties','format','title','nullable','prefixItems','minLength','maxLength']);
export function cleanSchema(s){
  if (Array.isArray(s)) return s.map(cleanSchema);
  if (!s || typeof s !== 'object') return s;
  const o = {};
  for (const [k, v] of Object.entries(s)){
    if (!KEEP.has(k)) continue;
    if (k === 'properties'){ o.properties = Object.fromEntries(Object.entries(v || {}).map(([p, ps]) => [p, cleanSchema(ps)])); continue; }
    if (k === 'items' || k === 'additionalProperties'){ o[k] = typeof v === 'object' ? cleanSchema(v) : v; continue; }
    if (k === 'anyOf' || k === 'oneOf' || k === 'prefixItems'){ o[k] = v.map(cleanSchema); continue; }
    if (k === 'format' && !['date-time','date','time','enum','int32','int64','float','double'].includes(v)) continue;
    if (k === 'enum' && !v.every(x => typeof x === 'string' || typeof x === 'number')) continue;
    o[k] = v;
  }
  if (o.type === 'object' && !o.properties && o.additionalProperties === undefined) o.additionalProperties = true;
  return o;
}
// Claude tool defs ({name, description, input_schema}) → Gemini functionDeclarations; server tools are skipped
export function toGeminiTools(defs){
  const fd = defs.filter(d => d.input_schema && d.name).map(d => ({name:d.name, description:(d.description || '').slice(0, 4000), parametersJsonSchema:cleanSchema(d.input_schema)}));
  return fd.length ? [{functionDeclarations:fd}] : [];
}

// ---------- history: Claude format → Gemini contents ----------
const toText = c => typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b.type === 'text').map(b => b.text).join('\n') : JSON.stringify(c);
function resultObj(tr){
  let v = tr.content;
  if (Array.isArray(v)) v = toText(v);
  if (typeof v === 'string'){ try{ v = JSON.parse(v); }catch{} }
  if (tr.is_error) return {error: typeof v === 'string' ? v : JSON.stringify(v)};
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {ergebnis: v ?? 'ok'};
}
export function toGeminiContents(history, raw = new WeakMap(), ids = {}){
  const out = [], names = {};
  const push = (role, parts) => { if (!parts.length) return; const last = out[out.length - 1]; if (last && last.role === role) last.parts.push(...parts); else out.push({role, parts}); };
  for (const m of history){
    if (m.role === 'assistant'){
      const blocks = Array.isArray(m.content) ? m.content : [{type:'text', text:String(m.content || '')}];
      for (const b of blocks) if (b.type === 'tool_use') names[b.id] = b.name;
      const r = raw.get(m);
      if (r && r.length){ push('model', r.map(p => ({...p}))); continue; }   // exact parts incl. thought signatures
      const parts = [];
      for (const b of blocks){
        if (b.type === 'text' && b.text) parts.push({text:b.text});
        else if (b.type === 'tool_use'){ const fc = {name:b.name, args:b.input || {}}; if (ids[b.id]) fc.id = ids[b.id]; parts.push({functionCall:fc, thoughtSignature:DUMMY_SIG}); }
        // thinking, server tools and their results only exist on Claude's side → left out
      }
      push('model', parts);
    } else if (m.role === 'system'){
      push('user', [{text:'[System-Notiz] ' + toText(m.content)}]);
    } else {
      const blocks = typeof m.content === 'string' ? [{type:'text', text:m.content}] : (m.content || []);
      const parts = [], extra = [];
      for (const b of blocks){
        if (b.type === 'text' && b.text) parts.push({text:b.text});
        else if (b.type === 'image' && b.source?.type === 'base64') parts.push({inlineData:{mimeType:b.source.media_type || 'image/jpeg', data:b.source.data}});
        else if (b.type === 'tool_result'){
          const fr = {name:names[b.tool_use_id] || 'werkzeug', response:resultObj(b)}; if (ids[b.tool_use_id]) fr.id = ids[b.tool_use_id];
          parts.push({functionResponse:fr});
          if (Array.isArray(b.content)) for (const x of b.content) if (x.type === 'image' && x.source?.data) extra.push({inlineData:{mimeType:x.source.media_type || 'image/jpeg', data:x.source.data}});
        }
      }
      push('user', parts.concat(extra));
    }
  }
  return out;
}

// ---------- transport: gzip body (Google accepts Content-Encoding: gzip – checked), retries on dropouts ----------
async function gz(str){
  if (typeof CompressionStream === 'undefined') return null;
  try{ return await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(); }catch{ return null; }
}
export function parseError(status, j){
  const e = j?.error || {}, det = e.details || [];
  const retry = det.find(d => /RetryInfo/.test(d['@type'] || ''))?.retryDelay;
  const viol = det.flatMap(d => d.violations || []);
  const quota = viol.map(v => v.quotaId || v.quotaMetric || '').join(' ');
  const reason = det.find(d => d.reason)?.reason || e.status || '';
  const perDay = /PerDay|per_day|daily/i.test(quota) || (/RESOURCE_EXHAUSTED/.test(e.status || '') && !retry && !/PerMinute/i.test(quota));
  return new GeminiError(e.message || ('HTTP ' + status), {status, reason, retryAfter: retry ? parseFloat(retry) : 0, perDay: status === 429 && perDay, quota, gemini:true});
}
export async function gemFetch(path, body, {key, signal, onRetry, stream = false, tries = 4} = {}){
  const json = JSON.stringify(body), packed = await gz(json);
  const headers = {'Content-Type':'application/json', 'x-goog-api-key':key};
  if (packed) headers['Content-Encoding'] = 'gzip';
  for (let i = 1; ; i++){
    let r;
    try{ r = await fetch(BASE + path, {method:'POST', headers, body: packed || json, signal}); }
    catch(e){
      if (signal?.aborted || i >= tries) throw new GeminiError('Keine Verbindung zu Google (' + (e.message || e) + ')', {status:0, network:true});
      const wait = Math.min(20, 2 ** i);
      onRetry?.({grund:'verbindung', versuch:i + 1, von:tries, sekunden:wait});
      await waitOnline(wait * 1000, signal); continue;
    }
    if (r.ok) return {res:r, bytesUp:(packed ? packed.byteLength : json.length), bytesRaw:json.length};
    let j = null; try{ j = await r.json(); }catch{}
    const err = parseError(r.status, j);
    if (r.status === 429 && !err.perDay && err.retryAfter <= 65 && i < tries){ const s = Math.ceil(err.retryAfter || 20); onRetry?.({grund:'minutenlimit', versuch:i + 1, von:tries, sekunden:s}); await sleep(s * 1000, signal); continue; }
    if ((r.status === 500 || r.status === 503) && i < Math.min(3, tries)){ onRetry?.({grund:'überlastet', versuch:i + 1, von:3, sekunden:3 * i}); await sleep(3000 * i, signal); continue; }
    throw err;
  }
}
const sleep = (ms, signal) => new Promise((res, rej) => { const t = setTimeout(res, ms); signal?.addEventListener('abort', () => { clearTimeout(t); rej(new Error('abgebrochen')); }, {once:true}); });
async function waitOnline(ms, signal){
  if (typeof navigator !== 'undefined' && navigator.onLine === false) await new Promise(r => { const t = setTimeout(r, 120000); addEventListener('online', () => { clearTimeout(t); r(); }, {once:true}); });
  await sleep(ms, signal);
}

// ---------- read a (streamed or plain) response into Claude-shaped content ----------
const rid = () => 'toolu_g' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
const STOP = {MAX_TOKENS:'max_tokens', SAFETY:'refusal', PROHIBITED_CONTENT:'refusal', BLOCKLIST:'refusal', SPII:'refusal', RECITATION:'refusal', IMAGE_SAFETY:'refusal'};
export class Assembler {
  // feed GenerateContentResponse chunks in order; emits Claude-like stream events; result() gives the final message
  constructor(ids = {}, onEvent = () => {}){ Object.assign(this, {ids, onEvent, parts:[], content:[], idx:-1, cur:null, finish:'', usage:{}, blocked:''}); }
  push(c){
    if (c.usageMetadata) this.usage = c.usageMetadata;
    if (c.promptFeedback?.blockReason) this.blocked = c.promptFeedback.blockReason;
    const cand = c.candidates?.[0]; if (!cand) return;
    if (cand.finishReason) this.finish = cand.finishReason;
    for (const p of cand.content?.parts || []){
      this.parts.push(p);
      if (p.thought) continue;   // thought summaries are not shown
      if (p.functionCall){
        this.cur = null; const fc = p.functionCall; const id = fc.id && ID_OK.test(fc.id) ? fc.id : rid();
        if (fc.id) this.ids[id] = fc.id;
        this.content.push({type:'tool_use', id, name:fc.name, input:fc.args || {}}); this.idx++;
        this.onEvent({type:'content_block_start', index:this.idx, content_block:{type:'tool_use', id, name:fc.name, input:{}}});
        this.onEvent({type:'content_block_stop', index:this.idx});
      } else if (typeof p.text === 'string' && p.text){
        if (!this.cur){ this.cur = {type:'text', text:''}; this.content.push(this.cur); this.idx++; this.onEvent({type:'content_block_start', index:this.idx, content_block:{type:'text', text:''}}); }
        this.cur.text += p.text; this.onEvent({type:'content_block_delta', index:this.idx, delta:{type:'text_delta', text:p.text}});
      }
    }
  }
  result(){
    const u = this.usage, f = this.finish;
    let stop = this.content.some(b => b.type === 'tool_use') ? 'tool_use' : (STOP[f] || (this.blocked ? 'refusal' : 'end_turn'));
    if (f === 'MALFORMED_FUNCTION_CALL' && stop !== 'tool_use') stop = 'malformed';
    return {content:this.content, parts:this.parts, stop_reason:stop, finish:f || this.blocked,
      usage:{input_tokens:u.promptTokenCount || 0, output_tokens:(u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0), cache_read_input_tokens:u.cachedContentTokenCount || 0}};
  }
}
async function* sse(res){
  const rd = res.body.getReader(), dec = new TextDecoder(); let buf = '';
  for (;;){
    const {value, done} = await rd.read(); if (done) break;
    buf += dec.decode(value, {stream:true});
    let i; while ((i = buf.indexOf('\n')) >= 0){ const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (line.startsWith('data:')){ const d = line.slice(5).trim(); if (d && d !== '[DONE]') yield JSON.parse(d); } }
  }
  const rest = buf.trim(); if (rest.startsWith('data:')){ const d = rest.slice(5).trim(); if (d) yield JSON.parse(d); }
}

// ---------- the agent turn: same surface as the Claude SDK stream (on('streamEvent') + finalMessage()) ----------
export function gemStream({key, model, system, history, tools, maxTokens = 8192, raw, ids, stream = true, onRetry, signal}){
  const handlers = [];
  const emit = ev => { for (const h of handlers) try{ h(ev); }catch(e){ console.warn(e); } };
  const body = {contents:toGeminiContents(history, raw, ids), generationConfig:{maxOutputTokens:maxTokens}};
  if (system) body.systemInstruction = {parts:[{text:system}]};
  const t = toGeminiTools(tools || []); if (t.length){ body.tools = t; body.toolConfig = {functionCallingConfig:{mode:'AUTO'}}; }
  const run = (async () => {
    await null;   // let the caller attach handlers first
    const path = `/models/${model}:${stream ? 'streamGenerateContent?alt=sse' : 'generateContent'}`;
    const {res, bytesUp, bytesRaw} = await gemFetch(path, body, {key, signal, onRetry});
    const asm = new Assembler(ids, emit);
    if (stream){ for await (const c of sse(res)) asm.push(c); } else asm.push(await res.json());
    const msg = asm.result();
    return {...msg, model, role:'assistant', bytesUp, bytesRaw};
  })();
  return {on(evt, fn){ if (evt === 'streamEvent') handlers.push(fn); return this; }, finalMessage: () => run};
}

// ---------- one-shot helper (search, page reading, JSON answers, checks) ----------
export async function gemOnce({key, model, system, prompt, parts, search = false, urls = false, schema = null, maxTokens = 2048, signal, onRetry}){
  const body = {contents:[{role:'user', parts: parts || [{text:prompt}]}], generationConfig:{maxOutputTokens:maxTokens}};
  if (system) body.systemInstruction = {parts:[{text:system}]};
  const tl = []; if (search) tl.push({google_search:{}}); if (urls) tl.push({url_context:{}}); if (tl.length) body.tools = tl;
  if (schema){ body.generationConfig.responseMimeType = 'application/json'; body.generationConfig.responseJsonSchema = cleanSchema(schema); }
  const {res} = await gemFetch(`/models/${model}:generateContent`, body, {key, signal, onRetry});
  const j = await res.json(); const cand = j.candidates?.[0];
  const text = (cand?.content?.parts || []).filter(p => !p.thought && p.text).map(p => p.text).join('');
  const gm = cand?.groundingMetadata || {};
  const sources = (gm.groundingChunks || []).map(c => c.web).filter(Boolean).map(w => ({titel:w.title || w.domain || 'Quelle', url:w.uri}));
  let json = null; if (schema){ try{ json = JSON.parse(text); }catch{} }
  return {text, json, sources, queries:gm.webSearchQueries || [], usage:j.usageMetadata || {}, finish:cand?.finishReason || j.promptFeedback?.blockReason || ''};
}

// ---------- pick the models this key can use (newest stable Flash-Lite + Flash) ----------
export async function gemModels(key, signal){
  const r = await fetch(BASE + '/models?pageSize=200', {headers:{'x-goog-api-key':key}, signal});
  let j = null; try{ j = await r.json(); }catch{}
  if (!r.ok) throw parseError(r.status, j);
  const ok = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name.replace(/^models\//, ''));
  const ver = n => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
  const pick = re => ok.filter(n => re.test(n)).sort((a, b) => ver(b) - ver(a))[0];
  const lite = pick(/^gemini-\d+(\.\d+)?-flash-lite$/) || (ok.includes('gemini-flash-lite-latest') && 'gemini-flash-lite-latest') || pick(/^gemini-\d+(\.\d+)?-flash-lite-preview/);
  const flash = pick(/^gemini-\d+(\.\d+)?-flash$/) || (ok.includes('gemini-flash-latest') && 'gemini-flash-latest') || pick(/^gemini-\d+(\.\d+)?-flash-preview/);
  // speech models: Flash before Flash-Lite before Pro, newest first
  const rank = n => /pro/.test(n) ? 2 : /lite/.test(n) ? 1 : 0;
  const tts = ok.filter(n => /^gemini.*tts/.test(n)).sort((a, b) => rank(a) - rank(b) || ver(b) - ver(a));
  return {lite: lite || flash || null, flash: flash || lite || null, tts, alle: ok.filter(n => /^gemini/.test(n)).slice(0, 40)};
}

// ---------- 5.8 voice: Gemini speech generation (same free key). Returns a playable Blob (WAV) ----------
export function pcmToWav(pcm, rate = 24000, ch = 1){
  const h = new ArrayBuffer(44), v = new DataView(h), w = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, pcm.length, true);
  return new Blob([h, pcm], {type:'audio/wav'});
}
const unb64 = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
export async function gemSpeech({key, model, text, voice = 'Charon', style = '', signal}){
  const body = {contents:[{role:'user', parts:[{text: style ? `${style}:\n${text}` : text}]}],
    generationConfig:{responseModalities:['AUDIO'], speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}};
  const {res} = await gemFetch(`/models/${model}:generateContent`, body, {key, signal, tries:1});   // no waiting: speech must be quick, otherwise the next voice takes over
  const j = await res.json(); const p = (j.candidates?.[0]?.content?.parts || []).find(x => x.inlineData?.data);
  if (!p) throw new GeminiError('keine Audiodaten (' + (j.candidates?.[0]?.finishReason || j.promptFeedback?.blockReason || 'leer') + ')', {status:200});
  const mime = p.inlineData.mimeType || '', bytes = unb64(p.inlineData.data);
  if (/wav|mpeg|mp3|ogg|opus/.test(mime)) return new Blob([bytes], {type:mime.split(';')[0]});
  return pcmToWav(bytes, +((mime.match(/rate=(\d+)/) || [])[1] || 24000));   // audio/L16;codec=pcm;rate=24000
}
