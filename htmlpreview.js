(function () {
    var previewForm = document.getElementById('previewform');

    // Extract URL from the query string.
    // For GitHub URLs, we perform a transformation to obtain the raw file URL.
    var url = location.search.substring(1)
        .replace(/\/\/github\.com/, '//raw.githubusercontent.com')
        .replace(/\/blob\//, '/');

    // fetchProxy downloads the resource as a Blob and converts it to text before resolving.
    var fetchProxy = function (url, options, i) {
        var proxy = [
            '', // attempt direct fetch first.
            'https://api.codetabs.com/v1/proxy/?quest=' // fallback proxy.
        ];
        return fetch(proxy[i] + url, options).then(function (res) {
            if (!res.ok)
                throw new Error('Cannot load ' + url + ': ' + res.status + ' ' + res.statusText);
            return res.blob();
        }).then(function (blob) {
            // Return the full file content as text.
            return new Promise(function (resolve, reject) {
                var reader = new FileReader();
                reader.onload = function () {
                    resolve(reader.result);
                };
                reader.onerror = function (err) {
                    reject(err);
                };
                reader.readAsText(blob);
            });
        }).catch(function (error) {
            if (i === proxy.length - 1) throw error;
            return fetchProxy(url, options, i + 1);
        });
    };

    var replaceAssets = function () {
        var frame, a, link, links = [], script, scripts = [], i, href, src;

        // If a frameset is present, exit because document.write() would clear it.
        if (document.querySelectorAll('frameset').length)
            return;

        // Process any <iframe> or <frame> tags.
        frame = document.querySelectorAll('iframe[src],frame[src]');
        for (i = 0; i < frame.length; ++i) {
            src = frame[i].src;
            if (src.indexOf('//raw.githubusercontent.com') > 0 ||
                src.indexOf('//bitbucket.org') > 0 ||
                src.indexOf('discordapp.com') > 0) {
                frame[i].src = '//' + location.hostname + location.pathname + '?' + src;
            }
        }

        // Update all <a> links.
        a = document.querySelectorAll('a[href]');
        for (i = 0; i < a.length; ++i) {
            href = a[i].href;
            if (href.indexOf('#') > 0) {
                a[i].href = '//' + location.hostname + location.pathname + location.search +
                    '#' + a[i].hash.substring(1);
            } else if (
                (href.indexOf('//raw.githubusercontent.com') > 0 ||
                 href.indexOf('//bitbucket.org') > 0 ||
                 href.indexOf('discordapp.com') > 0) &&
                (href.indexOf('.html') > 0 || href.indexOf('.htm') > 0)
            ) {
                a[i].href = '//' + location.hostname + location.pathname + '?' + href;
            }
        }

        // Process external CSS files.
        link = document.querySelectorAll('link[rel=stylesheet]');
        for (i = 0; i < link.length; ++i) {
            href = link[i].href;
            if (href.indexOf('//raw.githubusercontent.com') > 0 ||
                href.indexOf('//bitbucket.org') > 0 ||
                href.indexOf('discordapp.com') > 0) {
                links.push(fetchProxy(href, null, 0));
            }
        }
        Promise.all(links).then(function (res) {
            for (i = 0; i < res.length; ++i) {
                loadCSS(res[i]);
            }
        });

        // Process external or inline scripts (temporarily marked with type="text/htmlpreview").
        script = document.querySelectorAll('script[type="text/htmlpreview"]');
        for (i = 0; i < script.length; ++i) {
            src = script[i].src;
            if (src.indexOf('//raw.githubusercontent.com') > 0 ||
                src.indexOf('//bitbucket.org') > 0 ||
                src.indexOf('discordapp.com') > 0) {
                scripts.push(fetchProxy(src, null, 0));
            } else {
                script[i].removeAttribute('type');
                scripts.push(script[i].innerHTML);
            }
        }
        Promise.all(scripts).then(function (res) {
            for (i = 0; i < res.length; ++i) {
                loadJS(res[i]);
            }
            document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
        });
    };

    var loadHTML = function (data) {
        if (data) {
            // Insert a <base> tag so that relative URLs resolve correctly,
            // and temporarily change script types so they don’t execute immediately.
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

    var loadCSS = function (data) {
        if (data) {
            var style = document.createElement('style');
            style.innerHTML = data;
            document.head.appendChild(style);
        }
    };

    var loadJS = function (data) {
        if (data) {
            var script = document.createElement('script');
            script.innerHTML = data;
            document.body.appendChild(script);
        }
    };

    // Entry point: if a valid URL is provided and it’s not on our own domain, fetch it.
    if (url && url.indexOf(location.hostname) < 0) {
        fetchProxy(url, null, 0)
            .then(loadHTML)
            .catch(function (error) {
                console.error(error);
                previewForm.style.display = 'block';
                previewForm.innerText = error;
            });
    } else {
        previewForm.style.display = 'block';
    }
})();
