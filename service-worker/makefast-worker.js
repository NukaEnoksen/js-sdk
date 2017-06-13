const MakefastWorkerCache = require('./MakefastWorkerCache');
const BloomFilterRefresher = require('./BloomFilterRefresher');

let baqendCache;
let bloomFilterRefresher;

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
    baqendCache = new MakefastWorkerCache();
    const bloomFilterUrl = `${baqendCache.getAppUrl()}v1/bloomfilter`;
    const refreshInterval = 60000;
    bloomFilterRefresher = new BloomFilterRefresher(baqendCache, bloomFilterUrl, refreshInterval);
  }


  if (baqendCache.shouldHandle(request)) {
    bloomFilterRefresher.ensureFreshness();
    event.respondWith(baqendCache.handleRequest(request));
  }
});
