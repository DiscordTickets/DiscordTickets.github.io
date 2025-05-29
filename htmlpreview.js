(function () {
  
  var previewForm = document.getElementById('previewform');

  // Get the raw URL parameters from the query string.
  var url = location.search.substring(1);

  // If the URL is a GitHub URL, convert to the raw URL.
  if (url.indexOf('//github.com') > -1) {
    url = url.replace(/\/\/github\.com/, '//raw.githubusercontent.com').replace(/\/blob\//, '/');
  }

  // ------------------ Helper Functions ------------------

  // Rewrites asset URLs in the loaded HTML.
  var replaceAssets = function () {
    var frame, a, link, links = [], script, scripts = [], i, href, src;
    // If there's any <frameset>, skip asset replacement.
    if (document.querySelectorAll('frameset').length)
      return;
    
    // Rewrite frames/iframes.
    frame = document.querySelectorAll('iframe[src],frame[src]');
    for (i = 0; i < frame.length; ++i) {
      src = frame[i].src;
      if (src.indexOf('//raw.githubusercontent.com') > 0 || src.indexOf('//bitbucket.org') > 0) {
        frame[i].src = '//' + location.hostname + location.pathname + '?' + src;
      }
    }
    
    // Rewrite anchor links.
    a = document.querySelectorAll('a[href]');
    for (i = 0; i < a.length; ++i) {
      href = a[i].href;
      if (href.indexOf('#') > 0) {
        a[i].href = '//' + location.hostname + location.pathname + location.search + '#' + a[i].hash.substring(1);
      } else if ((href.indexOf('//raw.githubusercontent.com') > 0 ||
                  href.indexOf('//bitbucket.org') > 0) && 
                 (href.indexOf('.html') > 0 || href.indexOf('.htm') > 0)) {
        a[i].href = '//' + location.hostname + location.pathname + '?' + href;
      }
    }
    
    // Rewrite linked stylesheets.
    link = document.querySelectorAll('link[rel=stylesheet]');
    for (i = 0; i < link.length; ++i) {
      href = link[i].href;
      if (href.indexOf('//raw.githubusercontent.com') > 0 || href.indexOf('//bitbucket.org') > 0) {
        links.push(fetchProxy(href, null, 0));
      }
    }
    Promise.all(links).then(function (res) {
      for (i = 0; i < res.length; ++i) {
        loadCSS(res[i]);
      }
    });
    
    // Rewrite scripts.
    script = document.querySelectorAll('script[type="text/htmlpreview"]');
    for (i = 0; i < script.length; ++i) {
      src = script[i].src;
      if (src.indexOf('//raw.githubusercontent.com') > 0 || src.indexOf('//bitbucket.org') > 0) {
        scripts.push(fetchProxy(src, null, 0));
      } else {
        script[i].removeAttribute('type');
        scripts.push(Promise.resolve(script[i].innerHTML));
      }
    }
    Promise.all(scripts).then(function (res) {
      for (i = 0; i < res.length; ++i) {
        loadJS(res[i]);
      }
      document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
    });
  };

  // Injects the loaded HTML into the document.
  var loadHTML = function (data) {
    if (data) {
      data = data.replace(/<head([^>]*)>/i, '<head$1><base href="' + url + '">')
                 .replace(/<script(\s*src=["'][^"']*["'])?(\s*type=["'](text|application)\/javascript["'])?/gi,
                          '<script type="text/htmlpreview"$1');
      setTimeout(function () {
        document.open();
        document.write(data);
        document.close();
        replaceAssets();
      }, 10);
    }
  };

  // Injects CSS into the document.
  var loadCSS = function (data) {
    if (data) {
      var style = document.createElement('style');
      style.innerHTML = data;
      document.head.appendChild(style);
    }
  };

  // Injects JavaScript into the document.
  var loadJS = function (data) {
    if (data) {
      var script = document.createElement('script');
      script.innerHTML = data;
      document.body.appendChild(script);
    }
  };

  // A proxy fetch function with a fallback.
  var fetchProxy = function (url, options, i) {
    var proxy = [
      '', // try without proxy first
      'https://api.codetabs.com/v1/proxy/?quest='
    ];
    return fetch(proxy[i] + url, options).then(function (res) {
      if (!res.ok)
        throw new Error('Cannot load ' + url + ': ' + res.status + ' ' + res.statusText);
      return res.text();
    }).catch(function (error) {
      if (i === proxy.length - 1)
        throw error;
      return fetchProxy(url, options, i + 1);
    });
  };

  // ------------------ Main Logic ------------------

  // If the URL is external (not from this domain)...
  if (url && url.indexOf(location.hostname) < 0) {
    // If this is a Discord attachment URL, use a simple fetch.
    if (url.indexOf("cdn.discordapp.com/attachments/") !== -1) {
      fetch(url)
        .then(function (response) {
          if (!response.ok)
            throw new Error('Network response was not ok: ' + response.statusText);
          return response.text();
        })
        .then(function (data) {
          loadHTML(data);
        })
        .catch(function (error) {
          console.error("Error fetching Discord attachment:", error);
          previewForm.style.display = 'block';
          previewForm.innerText = error;
        });
    } else {
      // Otherwise, use the proxy approach (for GitHub, Bitbucket, etc.).
      fetchProxy(url, null, 0)
        .then(loadHTML)
        .catch(function (error) {
          console.error(error);
          previewForm.style.display = 'block';
          previewForm.innerText = error;
        });
    }
  } else {
    previewForm.style.display = 'block';
  }
})();
