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

// TODO use Bloom filter logic from Sven

class BaqendServiceWorkerCache {

  constructor() {}

  async handleRequest(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return this.handleCacheHit(request, cachedResponse);
    }

    return this.handleCacheMiss(request);
  }

  /**
   * Check whether the given request should be handled by the service worker. Only get requests for whitelisted urls should be handled.
   * @param request The request to handle.
   * @returns {boolean} true if the url should be handled by the SW, false otherwiese.
   */
  shouldHandle(request) {
    const isGet = request.method == 'GET' || request.method == 'HEAD';
    const isHTTP = request.url.startsWith('http');

    return isGet && isHTTP && !isSW;
  }

  /**
   * Handles the request if it matches an entry from the cache storage.
   * @param request The request.
   * @param cachedResponse The matching response.
   * @returns The final response to the request.
   */
  async handleCacheHit(request, cachedResponse) {
    if (!navigator.onLine) {
      return Promise.resolve(cachedResponse);
    }

    if (this.isFresh(cachedResponse) && !this.isInBloomFilter(request)) {
      return Promise.resolve(cachedResponse);
    }

    return this.fetchResponse(request);
  }

  /**
   * Check whether the given cache entry is still fresh.
   * @param cachedResponse The cached response to check.
   * @returns {boolean} true if the cache entry is still fresh, false otherwise.
   */
  isFresh(cachedResponse) {
    const cacheControl = cachedResponse.headers.get('cache-control');
    const dateHeader = cachedResponse.headers.get('date');

    if (dateHeader && cacheControl) {
      const maxAge = this.getMaxAge(cacheControl);
      const age = cachedResponse.headers.get('age') || 0;

      const date = new Date(dateHeader);
      const expiration = date.getTime() + 1000 * (maxAge - age);
      return Date.now() < expiration;
    }

    return false;
  }

  /**
   * Extracts the max-age value from the cache control header.
   * @param cacheControl The cache control header value.
   * @returns {number} The max-age value.
   */
  getMaxAge(cacheControl) {
    const cacheControlArray = cacheControl.split(', ');
    let maxAge = 0;
    // Parse max-age value from Cache-Control-Header
    for (const item of cacheControlArray) {
      if (item.includes('max-age')) {
        maxAge = parseInt(item.substr(item.indexOf('=') + 1, item.length - item.indexOf('=')), 10);
      }
    }
    return maxAge;
  }

  /**
   * Checks whether the requested resource is in the Bloom filter.
   * @param request The request.
   * @returns {boolean} true if the resource is in the Bloom filter, false otherwise.
   */
  isInBloomFilter(request) {
    if (this.bloomFilter) {
      // TODO is this right?
      return this.bloomFilter.contains(request.url);
    }

    return true;
  }

  /**
   * Handles the request if there is not matching entry in the cache storage.
   * @param request The request.
   * @returns The response to the reqeust.
   */
  handleCacheMiss(request) {
    if (navigator.onLine) {
      return this.fetchResponse(request);
    }
    // TODO what to return?
    throw new Error('Sorry - you are offline and there is no cached content');
  }

  /**
   * Fetches a response for the given request and caches it.
   * @param request The request to fetch the response for.
   * @returns {Promise.<Response>}
   */
  async fetchResponse(request) {
    const revalidation = this.isInBloomFilter(request) ? 'reload' : 'default';
    const getRequest = new Request(request.url, {cache: revalidation});
    const response = await fetch(getRequest);
    // caching the response async and returning a copy
    this.cacheResponse(getRequest, response);
    return response.clone();
  }

  /**
   * Caches the given repsonse.
   * @param request The request.
   * @param response The response to the request.
   * @returns {Promise.<Response>} A promise that resolves to the response once it is cached.
   */
  async cacheResponse(request, response) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);
    return response;
  }
}

class BloomFilter {
  constructor(rawBF) {
    this.bytes = atob(rawBF.b);
    this.bits = rawBF.m;
    this.hashes = rawBF.h;
    this.creation = Date.now();
  }

  contains(element) {
    for (const hash of BloomFilter._getHashes(element, this.bits, this.hashes)) {
      if (!this._isSet(hash)) {
        return false;
      }
    }
    return true;
  }

  _isSet(index) {
    const pos = Math.floor(index / 8);
    const bit = 1 << (index % 8);
    //Extract byte as int or NaN if out of range
    const byte = this.bytes.charCodeAt(pos);
    //Bit-wise AND should be non-zero (NaN always yields false)
    return (byte & bit) != 0;
  }

  static _getHashes(element, bits, hashes) {
    const hashValues = new Array(this.hashes);
    const hash1 = BloomFilter._murmur3(0, element);
    const hash2 = BloomFilter._murmur3(hash1, element);
    for (let i = 0; i < hashes; i++) {
      hashValues[i] = (hash1 + i * hash2) % bits;
    }
    return hashValues;
  }

  static _murmur3(seed, key) {
    const remainder = key.length & 3;
    const bytes = key.length - remainder;
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;
    let h1, h1b, k1, i;
    h1 = seed;
    i = 0;

    while (i < bytes) {
      k1 =
          ((key.charCodeAt(i) & 0xff)) |
          ((key.charCodeAt(++i) & 0xff) << 8) |
          ((key.charCodeAt(++i) & 0xff) << 16) |
          ((key.charCodeAt(++i) & 0xff) << 24);
      ++i;

      k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

      h1 ^= k1;
      h1 = (h1 << 13) | (h1 >>> 19);
      h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
      h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
    }

    k1 = 0;

    switch (remainder) {
      case 3:
        k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
      case 2:
        k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
      case 1:
        k1 ^= (key.charCodeAt(i) & 0xff);

        k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
        h1 ^= k1;
    }

    h1 ^= key.length;

    h1 ^= h1 >>> 16;
    h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
  }

}