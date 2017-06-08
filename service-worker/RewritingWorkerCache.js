const BaqendServiceWorkerCache = require('./BaqendServiceWorkerCache');

class RewritingWorkerCache extends BaqendServiceWorkerCache {

  constructor(whitelist, blacklist, prefix, serviceWorkerFileName) {
    super(whitelist, blacklist);
    this.prefix = prefix;
    this.apiPrefix = `${prefix}v1/`;
    this.assetPrefix = `${this.apiPrefix}asset/`;
    this.swUrl = `${location.origin}/{serviceWorkerFileName}`;
  }

  getAppUrl() {
    return this.prefix;
  }

  shouldHandle(request) {
    const superShouldHandle = super.shouldHandle(request);
    const isSW = request.url.startsWith(this.swUrl);

    return superShouldHandle && !isSW;
  }

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