const BaqendServiceWorkerCache = require('./BaqendServiceWorkerCache');

class RewritingWorkerCache extends BaqendServiceWorkerCache {

  constructor(whiteList, blackList, prefix, serviceWorkerFileName) {
    super(whiteList, blackList);
    this.prefix = prefix;
    this.apiPrefix = `${prefix}v1/`;
    this.assetPrefix = `${this.apiPrefix}asset/`;
    // TODO filter service worker url in should handle! Origin does not work in firefox :(
    // this.swUrl = `${origin}/{serviceWorkerFileName}`;
  }

  getAppUrl() {
    return this.prefix;
  }

  // TODO filter service worker url in should handle! Origin does not work in firefox :(
  // shouldHandle(request) {
  //   const superShouldHandle = super.shouldHandle(request);
  //   const isSW = request.url.startsWith(this.swUrl);
  //
  //   return superShouldHandle && !isSW;
  // }

  extractUrl(url) {
    if (url.startsWith(this.assetPrefix)) {
      return url.substring(this.assetPrefix.length);
    }
    return url;
  }

  getUrlForBloomFilter(request) {
    return this.extractUrl(request.url);
  }
}

module.exports = RewritingWorkerCache;