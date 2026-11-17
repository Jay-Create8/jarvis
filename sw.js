// 5.7.2: offline-first for slow connections.
// App files: served instantly from the phone, refreshed quietly in the background (stale-while-revalidate).
// Big files (hand-control model, wasm, APK, images): downloaded once, then always from the phone.
const CACHE = 'jarvis-c0572';
const BIG = /\/vendor\/mediapipe\/|\.wasm$|\.task$|\.apk$|\/assets\//;
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html']))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  // keep the previous generation one more time: an already open page may still need its files
  e.waitUntil(caches.keys().then((keys) => { const old = keys.filter((k) => k !== CACHE).sort(); const keepPrev = old.filter((k) => /^jarvis-c\d+$/.test(k)).pop();
    return Promise.all(old.filter((k) => k !== keepPrev).map((k) => caches.delete(k))); }).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin || u.pathname.endsWith('/sw.js')) return;
  const net = () => fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; });
  if (BIG.test(u.pathname)) { e.respondWith(caches.match(req).then((hit) => hit || net())); return; }   // once, then from the phone
  e.respondWith(caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((hit) => {
    const update = net().catch(() => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    if (hit) { e.waitUntil(update.catch(() => {})); return hit; }   // instant from the phone, refresh in background
    return update;
  }));
});
// the page reports which files it used on the first visit (that visit wasn't served by this worker yet) → store them once
self.addEventListener('message', (e) => {
  if (e.data?.type !== 'precache' || !Array.isArray(e.data.urls)) return;
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(e.data.urls.filter((u) => u.startsWith(self.location.origin)).slice(0, 80)
    .map((u) => c.match(u, { ignoreSearch: true }).then((hit) => hit || fetch(u).then((r) => r.ok && c.put(u, r)).catch(() => {}))))));
});
self.addEventListener('notificationclick', (e) => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window' }).then((c) => (c.length ? c[0].focus() : self.clients.openWindow('./')))); });
