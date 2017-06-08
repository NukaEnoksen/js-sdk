// ###############################
// ##                           ##
// ##   Baqend Service Worker   ##
// ##                           ##
// ###############################

// ########## Options ############
const config = {
  appName: 'hannes-test', // The name of your Baqend app
  whiteList: [], // List of domains to intercept (empty to match every domain)
  blackList: [], // List of domains not to intercept
};

// ####### Do NOT Change #########
const bloomFilterLink = `https://${config.appName}.app.baqend.com/v1/bloomfilter`;
let preload = document.createElement("link");
preload.rel = "preload";
preload.href = bloomFilterLink;
//        preload.as = "script"; // TODO can we set a good "as"?
document.head.appendChild(preload);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('external-sw.js')
      .then((registration) => navigator.serviceWorker.ready)
      .then((registration) => {
        registration.active.postMessage(config);
      });

  const isTokenSupported = function(tokenList, token) {
    if (!tokenList || !tokenList.supports) {
      return;
    }
    try {
      return tokenList.supports(token);
    } catch (e) {
      // TODO remove!
      if (e instanceof TypeError) {
        console.log("The DOMTokenList doesn't have a supported tokens list");
      } else {
        console.error("That shouldn't have happened");
      }
    }
  };

  const linkSupportsPreload = isTokenSupported(document.createElement("link").relList, "preload");
  if (!linkSupportsPreload) {
    console.log('preload not supported, defaulting to prefetch!');
    let prefetch = document.createElement("link");
    prefetch.rel = "prefetch";
    prefetch.href = bloomFilterLink;
    document.head.appendChild(prefetch);
  }
}
// ###############################
