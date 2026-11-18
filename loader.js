// 5.8 – resumable loader: JARVIS files come pre-compressed in 16 KB parts (p/<hash>.<n>.bin).
// Every part is stored on the device the moment it arrives, so a dropped connection only loses the current part.
// Files are checked with SHA-256 before use. Unchanged files of older versions are reused, never downloaded twice.
const PARTS = 'jarvis-parts', MARK = '__jarvis_core_complete';
export const coreName = v => 'jarvis-core-' + v;
const abs = u => new URL(u, location.href).href;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
export const sha16 = async buf => hex(await crypto.subtle.digest('SHA-256', buf)).slice(0, 16);
// some modes (sandboxed frames, strict privacy) throw on the mere access – never let that break JARVIS
export const swc = () => { try{ return navigator.serviceWorker || null; }catch{ return null; } };
export const controller = () => { try{ return navigator.serviceWorker?.controller || null; }catch{ return null; } };
export const supported = () => { try{ return typeof caches !== 'undefined' && typeof DecompressionStream !== 'undefined' && !!crypto?.subtle && !!swc(); }catch{ return false; } };

// measured speed (KB/s), smoothed; the app uses it to decide e.g. fonts and streaming
let rate = +(globalThis.localStorage?.getItem('jarvis.netKBs') || 0);
function measure(bytes, ms){
  if (ms < 400 || bytes < 1024) return;
  const k = bytes / 1024 / (ms / 1000); rate = rate ? rate * 0.6 + k * 0.4 : k;
  try{ localStorage.setItem('jarvis.netKBs', rate.toFixed(2)); }catch{}
}
export const speed = () => rate;

// pause for the AI: hold(true) stops the current part (only that part is lost) until hold(false)
let holdP = null, holdRes = null, curAC = null;
export function hold(on){
  if (on && !holdP){ holdP = new Promise(r => holdRes = r); curAC?.abort(); }
  else if (!on && holdP){ holdRes(); holdP = holdRes = null; }
}
// fetch with a stall guard: aborts only if NO data arrives for `stall` ms (slow is fine, silent is not)
async function fetchStall(url, {stall = 45000, onBytes, opts = {}} = {}){
  if (holdP) await holdP;
  const ac = new AbortController(); curAC = ac; let t = setTimeout(() => ac.abort(), stall * 1.5), n = 0; const t0 = performance.now();
  try{
    const r = await fetch(url, {...opts, signal:ac.signal});
    if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), {status:r.status});
    const rd = r.body.getReader(), chunks = [];
    for (;;){
      clearTimeout(t); t = setTimeout(() => ac.abort(), stall);
      const {value, done} = await rd.read(); if (done) break;
      chunks.push(value); n += value.length; onBytes?.(value.length);
    }
    measure(n, performance.now() - t0);
    return new Blob(chunks);
  }catch(e){ onBytes?.(-n); throw e; }
  finally{ clearTimeout(t); if (curAC === ac) curAC = null; }
}
async function retrying(fn, {onWait, max = Infinity} = {}){
  for (let i = 1; ; i++){
    try{ return await fn(); }
    catch(e){
      if (holdP){ await holdP; i--; continue; }   // paused for the AI – not a network problem, no waiting
      if (e.status === 404 || i >= max) throw e;
      const s = Math.min(30, 2 + i * 3); onWait?.({versuch:i + 1, sekunden:s, fehler:String(e.message || e)});
      if (navigator.onLine === false) await new Promise(r => { const tt = setTimeout(r, 60000); addEventListener('online', () => { clearTimeout(tt); r(); }, {once:true}); });
      await sleep(s * 1000);
    }
  }
}

export async function getManifest({onWait, fresh = true} = {}){
  const stored = () => { try{ const j = JSON.parse(localStorage.getItem('jarvis.manifest')); return j?.v ? j : null; }catch{ return null; } };
  if (!fresh && stored()) return stored();
  try{
    const b = await retrying(() => fetchStall('precache.json?t=' + Date.now(), {stall:30000, opts:{cache:'no-store'}}), {onWait, max: stored() ? 3 : Infinity});
    const j = JSON.parse(await b.text()); try{ localStorage.setItem('jarvis.manifest', JSON.stringify(j)); }catch{}
    return j;
  }catch(e){ const s = stored(); if (s) return s; throw e; }
}

// newest complete offline store (the service worker uses the same rule)
export async function findCore(){
  if (typeof caches === 'undefined') return null;
  let best = null;
  for (const k of await caches.keys()){
    if (!k.startsWith('jarvis-core-')) continue;
    const m = await (await caches.open(k)).match(abs(MARK)); if (!m) continue;
    const info = await m.json().catch(() => null);
    if (info && (!best || info.t > best.t)) best = {...info, name:k};
  }
  return best;
}
async function findSame(f, skip){
  for (const k of await caches.keys()){
    if (k === skip || k === PARTS) continue;
    const r = await (await caches.open(k)).match(abs(f.u), {ignoreSearch:true}); if (!r) continue;
    const buf = await r.arrayBuffer();
    if (buf.byteLength === f.n && await sha16(buf) === f.h) return buf;
  }
  return null;
}

// make sure all files of the given groups are in the offline store of version man.v
// onProgress({done, total, datei, kbs, wiederverwendet}) – bytes are compressed sizes
export async function ensure(groups, {man, only = null, reuseOnly = false, onProgress = () => {}, onWait} = {}){
  man = man || await getManifest({onWait});
  const core = coreName(man.v), cache = await caches.open(core), parts = await caches.open(PARTS);
  const files = man.files.filter(f => groups.includes(f.g) && (!only || only.includes(f.u)));
  const need = [];
  for (const f of files) if (!(await cache.match(abs(f.u)))) need.push(f);
  const total = need.reduce((s, f) => s + f.z, 0); let done = 0, reused = 0;
  const tick = (datei) => onProgress({done:Math.max(0, done), total, datei, kbs:rate, wiederverwendet:reused});
  tick('');
  // 1) copy everything an older version already has (instant, no network), 2) then download the rest
  const same = new Map();
  for (const f of need){ const raw = await findSame(f, core); if (raw){ same.set(f, raw); reused += f.z; done += f.z; await cache.put(abs(f.u), new Response(raw, {headers:{'Content-Type':f.t, 'X-Jarvis-Hash':f.h}})); } }
  tick('');
  for (const f of need){
    if (same.has(f)) continue;
    let raw = null;
    if (reuseOnly) continue;   // only copy what an older version already has – no download
    else{
      const blobs = [];
      for (let i = 0; i < f.p; i++){
        const pu = abs(`p/${f.h}.${i}.bin`);
        let b = await (await parts.match(pu))?.blob();
        if (b){ done += b.size; tick(f.u); }
        else{
          b = await retrying(() => fetchStall(pu, {onBytes:n => { done += n; tick(f.u); }}), {onWait});
          await parts.put(pu, new Response(b));
        }
        blobs.push(b);
      }
      raw = await new Response(new Blob(blobs).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      if (await sha16(raw) !== f.h){   // damaged part (e.g. an old proxy) → throw the parts away, next try loads them fresh
        for (let i = 0; i < f.p; i++) await parts.delete(abs(`p/${f.h}.${i}.bin`));
        throw new Error('Prüfsumme stimmt nicht: ' + f.u);
      }
    }
    await cache.put(abs(f.u), new Response(raw, {headers:{'Content-Type':f.t, 'X-Jarvis-Hash':f.h}}));
    for (let i = 0; i < f.p; i++) await parts.delete(abs(`p/${f.h}.${i}.bin`));
    tick(f.u);
  }
  return {core, total, reused, man};
}
export async function markComplete(man){
  const c = await caches.open(coreName(man.v));
  await c.put(abs(MARK), new Response(JSON.stringify({v:man.v, ver:man.ver, t:Date.now()}), {headers:{'Content-Type':'application/json'}}));
  controller()?.postMessage({type:'core'});
}
// remove older stores once the current one is complete. legacy=true also removes the 5.7.x store
// (only after its unchanged files were copied over, so nothing is downloaded twice)
export async function cleanup(keep, {legacy = false} = {}){
  for (const k of await caches.keys()){
    if (k === keep || k === PARTS || k === 'jarvis-rt' || k === 'jarvis-big') continue;
    if (/^jarvis-core-/.test(k) || (legacy && /^jarvis-c\d+$/.test(k))) await caches.delete(k);
  }
}
