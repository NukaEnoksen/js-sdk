const ExternalWorkerCache = require('./ExternalWorkerCache');
const BloomFilterRefresher = require('./BloomFilterRefresher');

const EVENT_REQUEST = new Request('https://45636ysdfgsadr5234t34/');
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

  event.respondWith(handleRequest(request));
});

self.addEventListener('message', (event) => {
  // Initializes the SW metadata with information from the index.html send via the push message event.
  baqendCache = new ExternalWorkerCache(event);
  // TODO actually we need to save this to some storage, because the service worker looses all internal state when deactivated...
  const bloomFilterUrl = `${baqendCache.getAppUrl()}v1/bloomfilter`;
  const refreshInterval = 60000;
  bloomFilterRefresher = new BloomFilterRefresher(baqendCache, bloomFilterUrl, refreshInterval);

  event.waitUntil(caches.open('sw-cache').then(cache => {
    return cache.put(EVENT_REQUEST, new Response(null, {status: 200, statusText: JSON.stringify(event.data)}));
  }));
});

function handleRequest(request) {
  return getBaqendCache().then(cache => {
    if (cache && bloomFilterRefresher && baqendCache.shouldHandle(request)) {
      bloomFilterRefresher.ensureFreshness();
      return baqendCache.handleRequest(request);
    } else {
      return fetch(request)
    }
  });
}

function getBaqendCache() {
  if (baqendCache) {
    return Promise.resolve(baqendCache);
  }

  return caches.match(EVENT_REQUEST).then(eventResponse => {
    if (eventResponse) {
      const data = JSON.parse(eventResponse.statusText);
      baqendCache = new ExternalWorkerCache({data: data});
      const bloomFilterUrl = `${baqendCache.getAppUrl()}v1/bloomfilter`;
      const refreshInterval = 60000;
      bloomFilterRefresher = new BloomFilterRefresher(baqendCache, bloomFilterUrl, refreshInterval);
      return baqendCache;
    }
    return null;
  });
}