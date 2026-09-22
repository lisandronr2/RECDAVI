// ═══════════════════════════════════════════════════════════
// SERVICE WORKER — RECDAVI PWA v1
// ═══════════════════════════════════════════════════════════
const CACHE = 'recdavi-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Nunca interceptar llamadas a Google (Sheets API / Google Identity Services)
  if (url.includes('google')) return;

  // Navegación / HTML / version.json: Network First — siempre la versión más
  // reciente si hay conexión; caché solo como respaldo offline.
  if (e.request.mode === 'navigate' || url.endsWith('/version.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(resp => {
          if (resp && resp.ok) caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
          return resp;
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // Resto de assets del shell: Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.ok) caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        return resp;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
