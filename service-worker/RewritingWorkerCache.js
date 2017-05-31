const BaqendServiceWorkerCache = require('./BaqendSWCache');

class RewritingWorkerCache extends BaqendServiceWorkerCache {

  constructor(whiteList, prefix, serviceWorkerFileName) {
    super(whiteList);
    this.prefix = prefix
    this.apiPrefix = `${prefix}v1/`;
    this.assetPrefix = `${this.apiPrefix}asset/`;
    this.swUrl = `${this.prefix}{serviceWorkerFileName}`;
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
    // TODO this has changed since the server does hashing!!!
    let url = request.url;
    url = this.extractUrl(url);
    url = btoa(url);
    // Make base64 encoding url safe (same as in server)
    url = url.replace('+', '-');
    url = url.replace('/', '_');
    url = `/file/_bq_assets/${url}`;
    return url;
  }
}

module.exports = RewritingWorkerCache;