const RewritingWorkerCache = require('./RewritingWorkerCache');

class MakefastWorkerCache extends RewritingWorkerCache {

  constructor() {
    super([], [], location.origin + '/', 'baqendWorker.js');
    this.BASE_PATH_REQUEST = new Request('https://jngiopdfg893475234hrtwe8rfhq3htn/');
    this.CACHE_NAME = 'baqend';
    this.internalParams = ['url', 'blist', 'wlist'];
    this.debugging = false;
  }

  async handleRequest(request) {
    return super.handleRequest(request);
  }

  shouldHandle(request) {
    const isRelative = request.url.startsWith(this.prefix);
    const isMain = request.url === this.prefix;
    const isMainImage = request.url === (this.prefix + '+img/flyingq-hd-opt.png');

    return (isRelative || super.shouldHandle(request)) && !isMain && !isMainImage;
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
        const params = this.parseParams(relativeUrl);
        relativeUrl = params['url'];
        for (const param of Object.entries(params)) {
          if (!this.internalParams.includes(param[0])) {
            relativeUrl = this.appendParam(relativeUrl, param[0], param[1]);
          }
        }

        if (params['blist']) {
          this.setBlacklist(params['blist'].split(','));
        }
        if (params['wlist']) {
          this.setWhitelist(params['wlist'].split(','));
        }
      }


      const fullUrlMatcher = new RegExp('^(https?\:\/\/)?' + basePath + '.*', 'i');
      return fullUrlMatcher.test(relativeUrl) ? relativeUrl : basePath + '/' + relativeUrl;
    }

    return Promise.resolve(url);
  }

  appendParam(url, key, value) {
    const separator = url.includes('?')? '&' : '?';
    return `${url}${separator}${key}=${encodeURIComponent(value)}`;
  }

  async getBase(url) {
    if (url.startsWith('?url=')) {
      const requestedUrl = this.parseParams(url)['url'].replace(/https?:\/\//, '');

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

  rewriteUrl(url) {
    const newUrl = `${this.assetPrefix}${url.replace(/https?:\/\//, '')}`;
    const headers = new Headers();
    if (this.debugging) {
      headers.append('Fastly-Debug ', '1');
    }
    return new Request(newUrl, {headers: headers});
  }

  parseParams(url) {
    const a = url.substr(url.indexOf('?') + 1).split('&');
    if (a === "") return {};
    const b = {};
    for (let i = 0; i < a.length; ++i) {
      const p = a[i].split('=', 2);
      if (p.length == 1)
        b[p[0]] = "";
      else
        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
  }

  async fetch(request) {
    return this.injectIntoHTML(super.fetch(request), request)
  }

  isHTML(response) {
    if (!response.ok) {
      console.log(`Error (${response.status}) for ${response.url}`);
      return false;
    }
    return response.headers.get('Content-Type').includes('html');
  }

  async injectIntoHTML(responsePromise, request) {
    const response = await responsePromise;
    if (!this.isHTML(response)) {
      return response;
    }

    const base = await this.getBase(request.url);
    let text = await response.text();
    const content = text.replace('</head>',
      `<script type="text/javascript">
        function getEnclosingTag(el, tagName) {
          tagName = tagName.toLowerCase();
        
          if (el.tagName && el.tagName.toLowerCase() === tagName) {
            return el;
          }
        
          while (el && el.parentNode) {
            el = el.parentNode;
            if (el.tagName && el.tagName.toLowerCase() === tagName) {
              return el;
            }
          }
        
          return null;
        }
        function appendParam(url, key, value) {
          const separator = url.includes('?')? '&' : '?';
          return url + separator + key + '=' + encodeURIComponent(value);
        }
        document.addEventListener("DOMContentLoaded", function() {
          document.body.addEventListener('click', function(e) {
            const a = getEnclosingTag(e.target, 'a');
            if (a && a.href) {
              e.preventDefault();
              const href = a.getAttribute('href');
              const fullPath = a.href;
              
              const isRelative = href !== fullPath;
              let newUrl = '${this.getAppUrl()}?url=' + encodeURIComponent((isRelative? '${base}' : '') + href);
              newUrl = ${this.blacklist.length > 0}? appendParam(newUrl, 'blist', '${this.blacklist}') : newUrl;
              newUrl = ${this.whitelist.length > 0}? appendParam(newUrl, 'wlist', '${this.whitelist}') : newUrl;
              
              location.href = newUrl;
            }
          });
        });
      </script></head>`);


    const newHeaders = {};
    for (const pair of response.headers.entries()){
      newHeaders[pair[0]] = pair[1];
    }

    return new Response(content, {
      headers: newHeaders
    });
  }
}

module.exports = MakefastWorkerCache;