const BaqendServiceWorkerCache = require('./BaqendSWCache');

class ExternalWorkerCache extends BaqendServiceWorkerCache {

  constructor(event) {
    super(event.data.whiteList);
    const prefix = `https://${event.data.appName}.app.baqend.com/`;
    this.apiPrefix = `${prefix}v1/`;
    this.assetPrefix = `${this.apiPrefix}asset/`;

  }

  getAppUrl() {
    return this.prefix;
  }

  shouldHandle(request) {
    const superShouldHandle = super.shouldHandle(request);
    const isSW = request.url.startsWith(`${this.prefix}external-sw.js`); // TODO exclude service worker?

    return superShouldHandle && !isSW;
  }

  async rewriteRequest(request) {
    if (request.url.startsWith(this.apiPrefix)) {
      return Promise.resolve(request); // don't rewrite api requests
      // TODO currently non-api request to the baqend domain are rewritten, is that what we want? no!
    }
    let url = request.url.replace(/https?:\/\//, '');
    const withPrefix = `${this.assetPrefix}${url}`;
    return Promise.resolve(new Request(withPrefix));
  }

  extractUrl(url) {
    if (url.startsWith(this.assetPrefix)) {
      return url.substring(this.assetPrefix.length);
    }
    return url;
  }

  getUrlForBloomFilter(request) {
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

module.exports = ExternalWorkerCache;