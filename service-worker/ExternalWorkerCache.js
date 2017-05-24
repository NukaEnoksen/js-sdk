const RewritingWorkerCache = require('./RewritingWorkerCache');

class ExternalWorkerCache extends RewritingWorkerCache {

  constructor(event) {
    super(event.data.whiteList, `https://${event.data.appName}.app.baqend.com/`, 'external-sw.js');
  }

  async rewriteRequest(request) {
    const url = request.url;
    if (url.startsWith(this.apiPrefix)) {
      return Promise.resolve(request); // don't rewrite api requests
      // TODO currently non-api request to the baqend domain are rewritten, is that what we want? no!
    }
    const withPrefix = `${this.assetPrefix}${url.replace(/https?:\/\//, '')}`;
    return Promise.resolve(new Request(withPrefix));
  }
}

module.exports = ExternalWorkerCache;