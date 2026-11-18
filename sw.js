// 5.8: the start page (index.html) loads JARVIS part by part into a versioned offline store ("jarvis-core-<version>").
// This worker serves the newest COMPLETE store straight from the phone – no background re-downloads that eat a slow line.
// Updates arrive part by part through the app (loader.js); unchanged files are copied, never downloaded again.
const RT = 'jarvis-rt', BIGC = 'jarvis-big', MARK = '__jarvis_core_complete', V = '5.8';
const BIG = /\/vendor\/mediapipe\/|\.wasm$|\.task$|\.apk$|\/assets\//;
let coreP = null;
function core(){
  return coreP ??= (async () => {
    let best = null;
    for (const k of await caches.keys()){
      if (!k.startsWith('jarvis-core-')) continue;
      const m = await (await caches.open(k)).match(new URL(MARK, self.registration.scope).href); if (!m) continue;
      const i = await m.json().catch(() => null);
      if (i && (!best || i.t > best.t)) best = { ...i, name: k };
    }
    return best ? caches.open(best.name) : null;
  })().catch(() => (coreP = null));
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));   // old stores stay until the loader has copied what it can reuse
self.addEventListener('message', (e) => { if (e.data?.type === 'core') coreP = null; });
self.addEventListener('fetch', (e) => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin || u.pathname.endsWith('/sw.js')) return;
  if (/\/p\/[0-9a-f]{16}\.\d+\.bin$/.test(u.pathname) || u.pathname.endsWith('/precache.json')) return;   // network only – the loader stores these itself
  e.respondWith(handle(e, req, u));
});
async function handle(e, req, u){
  const nav = req.mode === 'navigate';
  const key = nav && u.pathname.endsWith('/') ? new URL('index.html', u).href : req.url;
  const c = await core();
  if (c){ const hit = await c.match(key, { ignoreSearch: true }); if (hit) return hit; }   // complete store: instant, offline, no network
  if (BIG.test(u.pathname)){   // big files (hand control, APK, images): once, then from the phone
    const b = await caches.open(BIGC), hit = await b.match(req); if (hit) return hit;
    const r = await fetch(req); if (r.ok) e.waitUntil(b.put(req, r.clone())); return r;
  }
  const rt = await caches.open(RT), hit = await rt.match(req, { ignoreSearch: nav });
  const net = fetch(req).then((r) => { if (r.ok) e.waitUntil(rt.put(req, r.clone())); return r; });
  if (hit){ e.waitUntil(net.catch(() => {})); return hit; }   // rarely used files: from the phone, refreshed quietly
  try { return await net; }
  catch (err){
    if (nav && c){ const f = await c.match(new URL('index.html', self.registration.scope).href); if (f) return f; }
    return Response.error();
  }
}
self.addEventListener('notificationclick', (e) => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window' }).then((c) => (c.length ? c[0].focus() : self.clients.openWindow('./')))); });
