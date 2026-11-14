/* Privacy-first Studenthouse service worker: never cache authenticated pages or API responses. */
const CACHE_NAME = 'studenthouse-install-assets-v1';
const OFFLINE = '/student-house-portal/offline.html';
const PUBLIC_ASSETS = [OFFLINE, '/student-house-portal/icons/icon-192.png', '/student-house-portal/icons/icon-512.png', '/student-house-portal/icons/icon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PUBLIC_ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('studenthouse-install-assets-') && key !== CACHE_NAME).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/student-house-portal/')) return;
  event.respondWith(fetch(event.request).catch(async () => {
    const offline = await caches.match(OFFLINE);
    return offline || Response.error();
  }));
});
