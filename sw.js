// Chaos Carver – Service Worker (v1 placeholder)
// Will be expanded later for full offline caching

self.addEventListener('install', (e) => {
  console.log('[SW] Install');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[SW] Activate');
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Silent fallback – just let the network handle it for now
  // We'll add caching strategy later
});
