(function () {
    
    var previewForm = document.getElementById('previewform');

    // Get the query string – for example, a URL from Discord or GitHub.
    var q = location.search.substring(1);
    var url;
    
    // If the URL is from Discord attachments, use it as is.
    // Otherwise, if it’s a GitHub URL, convert to the "raw" link.
    if (q.indexOf('cdn.discordapp.com/attachments/') !== -1) {
        url = q;
    } else if (q.indexOf('github.com') !== -1) {
        url = q.replace(/\/\/github\.com/, '//raw.githubusercontent.com').replace(/\/blob\//, '/');
    } else {
        url = q;
    }

    // Function to replace asset URLs inside the loaded HTML.
    var replaceAssets = function () {
        var frame, a, link, links = [], script, scripts = [], i, href, src;
        
        // If the document has a frameset, skip asset replacement
        if (document.querySelectorAll('frameset').length) return;

        // Process iframes and frames: if their src comes from our supported hosts
        frame = document.querySelectorAll('iframe[src],frame[src]');
        for (i = 0; i < frame.length; ++i) {
            src = frame[i].src;
            if (src.indexOf('//raw.githubusercontent.com') > 0 ||
                src.indexOf('//bitbucket.org') > 0 ||
                src.indexOf('cdn.discordapp.com') > 0) {
                frame[i].src = '//' + location.hostname + location.pathname + '?' + src;
            }
        }
        
        // Process anchor tags: rewriting anchors and links to HTML files as needed.
        a = document.querySelectorAll('a[href]');
        for (i = 0; i < a.length; ++i) {
            href = a[i].href;
            if (href.indexOf('#') > 0) {
                a[i].href = '//' + location.hostname + location.pathname + location.search + '#' + a[i].hash.substring(1);
            } else if ((href.indexOf('//raw.githubusercontent.com') > 0 ||
                       href.indexOf('//bitbucket.org') > 0 ||
                       href.indexOf('cdn.discordapp.com') > 0) &&
                       (href.indexOf('.html') > 0 || href.indexOf('.htm') > 0)) {
                a[i].href = '//' + location.hostname + location.pathname + '?' + href;
            }
        }
        
        // Process linked stylesheets from known hosts.
        link = document.querySelectorAll('link[rel=stylesheet]');
        for (i = 0; i < link.length; ++i) {
            href = link[i].href;
            if (href.indexOf('//raw.githubusercontent.com') > 0 ||
                href.indexOf('//bitbucket.org') > 0 ||
                href.indexOf('cdn.discordapp.com') > 0) {
                links.push(fetchProxy(href, null, 0));
            }
        }
        Promise.all(links).then(function (res) {
            for (i = 0; i < res.length; ++i) {
                loadCSS(res[i]);
            }
        });
        
        // Process scripts marked with a custom type.
        script = document.querySelectorAll('script[type="text/htmlpreview"]');
        for (i = 0; i < script.length; ++i) {
            src = script[i].src;
            if (src && (src.indexOf('//raw.githubusercontent.com') > 0 ||
                        src.indexOf('//bitbucket.org') > 0 ||
                        src.indexOf('cdn.discordapp.com') > 0)) {
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

    // Load fetched HTML, injecting a <base> tag and converting inline script types.
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

    // Inject CSS into the document's head.
    var loadCSS = function (data) {
        if (data) {
            var style = document.createElement('style');
            style.innerHTML = data;
            document.head.appendChild(style);
        }
    };

    // Inject JavaScript into the document's body.
    var loadJS = function (data) {
        if (data) {
            var script = document.createElement('script');
            script.innerHTML = data;
            document.body.appendChild(script);
        }
    };

    // A simple proxy fetch function that optionally falls back to a CORS proxy.
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

    // If the URL is valid and not from our own domain, try to fetch it.
    if (url && url.indexOf(location.hostname) < 0)
        fetchProxy(url, null, 0).then(loadHTML).catch(function (error) {
            console.error(error);
            previewForm.style.display = 'block';
            previewForm.innerText = error;
        });
    else
        previewForm.style.display = 'block';

})();
