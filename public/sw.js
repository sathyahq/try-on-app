// Service worker for Sri Mahalakshmi Silks Virtual Try-On
// Caches the app shell and the @imgly/background-removal WASM/ONNX assets so the
// 30MB ML model isn't re-downloaded on every visit.

const APP_SHELL_CACHE = 'sms-tryon-shell-v1';
const MODEL_CACHE = 'sms-tryon-model-v1';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch(() => {
        // Tolerate missing assets during initial install
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== APP_SHELL_CACHE && k !== MODEL_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

const isModelAsset = (url) => {
  return (
    /\.(onnx|wasm|bin)$/i.test(url.pathname) ||
    url.hostname.includes('imgly') ||
    url.hostname.includes('staticimgly') ||
    url.hostname.includes('jsdelivr') ||
    url.pathname.includes('background-removal')
  );
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (isModelAsset(url)) {
    event.respondWith(
      caches.open(MODEL_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh.ok || fresh.type === 'opaque') {
            cache.put(req, fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch (err) {
          if (cached) return cached;
          throw err;
        }
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(APP_SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
