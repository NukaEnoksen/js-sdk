const RewritingWorkerCache = require('./RewritingWorkerCache');

class MakefastWorkerCache extends RewritingWorkerCache {

  constructor() {
    super(null, 'https://makefast.baqend.com/', 'baqendWorker.js');
    this.BASE_PATH_REQUEST = new Request('https://jngiopdfg893475234hrtwe8rfhq3htn/');
    this.CACHE_NAME = 'baqend';
  }

  shouldHandle(request) {
    const superShouldHandle = super.shouldHandle(request);
    const isMain = request.url === this.prefix;
    const isMainImage = request.url === (this.prefix + '+img/flyingq-hd-opt.png');

    return superShouldHandle && !isMain && !isMainImage;
  }

  async rewriteRequest(request) {
    const url = await this.resolveRelativeUrl(request);
    return this.rewriteUrl(url);
  }

  async resolveRelativeUrl(request) {
    const url = request.url;
    const isRelative = url.startsWith(this.prefix);

    if (isRelative) {
      let relativeUrl = url.substring(this.prefix.length);

      const basePath = await this.getBase(relativeUrl);
      if (relativeUrl.startsWith('?url=')) {
        relativeUrl = this.decodeUrl(relativeUrl).replace('&', '?');
      }

      const fullUrlMatcher = new RegExp('^(https?\:\/\/)?' + basePath + '.*', 'i');
      return fullUrlMatcher.test(relativeUrl) ? relativeUrl : basePath + '/' + relativeUrl;
    }

    return Promise.resolve(url);
  }

  async getBase(url) {
    if (url.startsWith('?url=')) {
      const requestedUrl = this.decodeUrl(url).replace(/https?:\/\//, '');

      let baseEndindex = requestedUrl.indexOf('/');
      if (baseEndindex === -1){
        baseEndindex = requestedUrl.length;
      }
      this.base = requestedUrl.substring(0, baseEndindex);
      caches.open(this.CACHE_NAME).then((cache) => {
        return cache.put(this.BASE_PATH_REQUEST, new Response(null, {status: 200, statusText: this.base}));
      });
    }

    if (this.base) {
      return Promise.resolve(this.base)
    } else {
      const baseResponse = await caches.match(this.BASE_PATH_REQUEST);
      if (baseResponse) {
        this.base = baseResponse.statusText;
      }

      return this.base || '';
    }
  }

  decodeUrl(url) {
    return decodeURIComponent(url.substring(url.indexOf('?url=') + 5, url.length));
  }

  rewriteUrl(url) {
    const newUrl = `${this.assetPrefix}${url.replace(/https?:\/\//, '')}`;
    return new Request(newUrl);
  }
}

module.exports = MakefastWorkerCache;