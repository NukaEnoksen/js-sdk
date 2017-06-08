const BaqendServiceWorkerCache = require('./BaqendServiceWorkerCache');
const BloomFilterRefresher = require('./BloomFilterRefresher');


const CACHE_NAME = 'baqend';

let baqendCache;

self.addEventListener('install', (event) => {
  // Bypass the waiting lifecycle stage,
  // just in case there's an older version of this SW registration.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  // Take control of all pages under this SW's scope immediately,
  // instead of waiting for reload/navigation.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (!baqendCache) {
    baqendCache = new BaqendServiceWorkerCache();
  }

  if (baqendCache.shouldHandle(request)) {
    event.respondWith(baqendCache.handleRequest(request));
  }
});