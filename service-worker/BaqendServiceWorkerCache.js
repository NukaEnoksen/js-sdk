const CACHE_NAME = 'baqend';

class BaqendServiceWorkerCache {

  constructor(whitelist, blacklist) {
    this.whitelist = whitelist;
    this.blacklist = blacklist;
  }

  setBloomFilter(bloomFilter) {
    this.bloomFilter = bloomFilter;
  }

  setWhitelist(whitelist) {
    this.whitelist = whitelist;
  }

  setBlacklist(blacklist) {
    this.blacklist = blacklist;
  }

  async handleRequest(request) {
    const newRequest = await this.rewriteRequest(request);
    const cachedResponse = await caches.match(newRequest);
    if (cachedResponse) {
      return this.handleCacheHit(newRequest, cachedResponse);
    }

    return this.handleCacheMiss(newRequest);
  }

  async rewriteRequest(request) {
    return Promise.resolve(request);
  }

  /**
   * Check whether the given request should be handled by the service worker. Only get requests for whitelisted urls should be handled.
   * @param request The request to handle.
   * @returns {boolean} true if the url should be handled by the SW, false otherwiese.
   */
  shouldHandle(request) {
    const isGet = request.method === 'GET' || request.method === 'HEAD';
    const isHTTP = request.url.startsWith('http');

    const hasBlackList = this.blacklist && this.blacklist.length;
    const hasWhiteList = this.whitelist&& this.whitelist.length;

    const onBlackList = hasBlackList && this.blacklist.some(domain => request.url.includes(domain));
    const onWhiteList = hasWhiteList && this.whitelist.some(domain => request.url.includes(domain));

    return isGet && isHTTP && !onBlackList && (!hasWhiteList || onWhiteList);
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

    console.log('Revalidating: ' + request.url);
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
    // TODO only use when Bloom Filter is fresh?
    if (this.bloomFilter) {
      const url = this.getUrlForBloomFilter(request);
      return this.bloomFilter.contains(url);
    }

    return true;
  }

  getUrlForBloomFilter(request) {
    return request.url;
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

module.exports = BaqendServiceWorkerCache;
