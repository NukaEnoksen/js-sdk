const CACHE_NAME = 'baqend';
const REFRESH = 60000; // Bloom filter refresh rate
const BASE_PATH_REQUEST = new Request('https://jngiopdfg893475234hrtwe8rfhq3htn/');
const bqCache = require('./baqend-sw-cache');

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

class MakefastCache extends bqCache.BaqendServiceWorkerCache {

  constructor() {
    this.prefix = 'https://makefast.baqend.com/';
    this.bloomFilterUrl = `${this.prefix}v1/bloomfilter`;
    this.apiPrefix = `${this.prefix}v1/`;
    this.assetPrefix = `${this.apiPrefix}asset/`;
    this.bloomFilterLoaded = false;
    this.refreshBloomfilter();
  }

  async resolveRelativeUrl(request) {
    const url = request.url;

    if (url.startsWith(this.prefix)) {
      let relativeUrl = url.substring(this.prefix.length);
      return this.getBase(relativeUrl).then((base) => {
        if (relativeUrl.startsWith('?url=')) {
          relativeUrl = decodeURIComponent(relativeUrl.substring(relativeUrl.indexOf('?url=') + 5, relativeUrl.length).replace('&', '?'));
        }

        var startwithbase = new RegExp('^(https?\:\/\/)?' + base + '.*', 'i');

        const resolvedUrl = startwithbase.test(relativeUrl) ? relativeUrl : base + '/' + relativeUrl;
        return resolvedUrl;
      });
    }

    return Promise.resolve(url);
  }

  async getBase(url) {
    if (url.startsWith('?url=')) {
      let requestedUrl = decodeURIComponent(url.substring(url.indexOf('?url=') + 5, url.length));
      requestedUrl = requestedUrl.replace(/https?:\/\//, '');

      var baseEndindex = requestedUrl.indexOf('/');
      if (baseEndindex == -1){
        baseEndindex = requestedUrl.length;
      }
      this.base = requestedUrl.substring(0, baseEndindex);
      caches.open(CACHE_NAME).then((cache) => {
        return cache.put(BASE_PATH_REQUEST, new Response(null, {status: 200, statusText: this.base}));
      });
    }

    if (this.base) {
      return Promise.resolve(this.base)
    } else {
      const baseResponse = await caches.match(BASE_PATH_REQUEST);
      if (baseResponse) {
        this.base = baseResponse.statusText;
      }

      return this.base || '';
    }
  }

  /**
   * Rewrites the url to hit the backend app where the resource is cloned and server from caches.
   * @param request The request to rewrite.
   * @returns {Request} The rewritten request.
   */
  rewriteUrl(url) {
    url = url.replace(/https?:\/\//, '');
    const newUrl = `${this.assetPrefix}${url}`;
    return new Request(newUrl);
  }

  async rewriteRequest(request) {
    const url = await this.resolveRelativeUrl(request);
    return rewriteUrl(url);
  }

  /**
   * Extracts the original url after it has been rewritten with 'rewriteUrl'.
   * @param url The rewritten url to extract the original from.
   * @returns {string} The original url.
   */
  extractUrl(url) {
    if (url.startsWith(this.assetPrefix)) {
      return url.substring(this.assetPrefix.length);
    }

    return url;
  }

}