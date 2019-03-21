'use strict';
const url = require('url');
const https = require('https');

// Utility function that converts a URL object into an ordinary
// options object as expected by the http.request and https.request
// APIs.
function urlToOptions(url) {
  var options = {
    protocol: url.protocol,
    hostname: typeof url.hostname === 'string' && url.hostname.startsWith('[') ?
      url.hostname.slice(1, -1) :
      url.hostname,
    hash: url.hash,
    search: url.search,
    pathname: url.pathname,
    path: `${url.pathname || ''}${url.search || ''}`,
    href: url.href
  };
  if (url.port !== '') {
    options.port = Number(url.port);
  }
  if (url.username || url.password) {
    options.auth = `${url.username}:${url.password}`;
  }
  return options;
}

/**
 * This currently needs to be applied to all Node.js versions
 * in order to determine if the `req` is an HTTP or HTTPS request.
 *
 * There is currently no PR attempting to move this property upstream.
 */
https.request = (function(request) {
  return request.__node_agent_base_patched__ ? request :
  function(...args) {
    let options = {};
    let callback;
    for (let arg of args) {
      if (typeof arg === 'string') {
        options = {
          ...options,
          ...urlToOptions(url.parse(arg)),
        }
      } else if (typeof arg === 'function') {
        callback = arg;
      } else if (arg instanceof url.URL) {
        options = {
          ...options,
          ...urlToOptions(arg),
        };
      } else {
        options = {
          ...options,
          ...arg,
        };
      }
    }
    if (options.port == null) {
      options.port = 443;
    }
    options.secureEndpoint = true;
    args = [options];
    if (callback != null) {
      args.push(callback);
    }
    return request.call(https, ...args);
  };
})(https.request);
https.request.__node_agent_base_patched__ = true;

/**
 * This is needed for Node.js >= 9.0.0 to make sure `https.get()` uses the
 * patched `https.request()`.
 *
 * Ref: https://github.com/nodejs/node/commit/5118f31
 */
https.get = function(options, cb) {
  const req = https.request(options, cb);
  req.end();
  return req;
};
