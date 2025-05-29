(function () {
  var previewForm = document.getElementById("previewform");

  // Determine the URL parameter from the query string.
  var q = location.search.substring(1);
  var url;
  if (q.indexOf("cdn.discordapp.com/attachments/") !== -1) {
    url = q;
  } else if (q.indexOf("github.com") !== -1) {
    url = q.replace(/\/\/github\.com/, "//raw.githubusercontent.com").replace(/\/blob\//, "/");
  } else {
    url = q;
  }

  // Function to inject plain text into the document inside a <pre> block.
  var loadText = function (data) {
    document.open();
    document.write(
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Text Preview</title>" +
        "<style>body { font: 12px 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 1em; }" +
        "pre { white-space: pre-wrap; word-wrap: break-word; background: #f4f4f4; padding: 1em; }</style>" +
        "</head><body><pre>" +
        data +
        "</pre></body></html>"
    );
    document.close();
  };

  // Function to inject HTML into the document. This adds a <base> tag and rewrites inline scripts.
  var loadHTML = function (data) {
    if (data) {
      data = data
        .replace(/<head([^>]*)>/i, '<head$1><base href="' + url + '">')
        .replace(
          /<script(\s*src=["'][^"']*["'])?(\s*type=["'](text|application)\/javascript["'])?/gi,
          "<script type='text/htmlpreview'$1"
        );
      setTimeout(function () {
        document.open();
        document.write(data);
        document.close();
        replaceAssets();
      }, 10);
    }
  };

  // Function to rewrite asset URLs (for iframes, anchor links, CSS, and scripts) so that subsequent
  // resource requests are routed through the same CORS proxy if needed.
  var replaceAssets = function () {
    var frame, a, link, links = [], script, scripts = [], i, href, src;

    if (document.querySelectorAll("frameset").length) return;

    // Process frames/iframes.
    frame = document.querySelectorAll("iframe[src],frame[src]");
    for (i = 0; i < frame.length; ++i) {
      src = frame[i].src;
      if (
        src.indexOf("//raw.githubusercontent.com") > 0 ||
        src.indexOf("//bitbucket.org") > 0 ||
        src.indexOf("cdn.discordapp.com") > 0
      ) {
        frame[i].src = "//" + location.hostname + location.pathname + "?" + src;
      }
    }

    // Process anchor tags.
    a = document.querySelectorAll("a[href]");
    for (i = 0; i < a.length; ++i) {
      href = a[i].href;
      if (href.indexOf("#") > 0) {
        a[i].href =
          "//" + location.hostname + location.pathname + location.search + "#" + a[i].hash.substring(1);
      } else if (
        (href.indexOf("//raw.githubusercontent.com") > 0 ||
          href.indexOf("//bitbucket.org") > 0 ||
          href.indexOf("cdn.discordapp.com") > 0) &&
        (href.indexOf(".html") > 0 || href.indexOf(".htm") > 0)
      ) {
        a[i].href = "//" + location.hostname + location.pathname + "?" + href;
      }
    }

    // Process stylesheets.
    link = document.querySelectorAll("link[rel=stylesheet]");
    for (i = 0; i < link.length; ++i) {
      href = link[i].href;
      if (
        href.indexOf("//raw.githubusercontent.com") > 0 ||
        href.indexOf("//bitbucket.org") > 0 ||
        href.indexOf("cdn.discordapp.com") > 0
      ) {
        links.push(fetchProxy(href, null, 0));
      }
    }
    Promise.all(links).then(function (res) {
      for (i = 0; i < res.length; ++i) {
        loadCSS(res[i]);
      }
    });

    // Process scripts.
    script = document.querySelectorAll('script[type="text/htmlpreview"]');
    for (i = 0; i < script.length; ++i) {
      src = script[i].src;
      if (
        src &&
        (src.indexOf("//raw.githubusercontent.com") > 0 ||
          src.indexOf("//bitbucket.org") > 0 ||
          src.indexOf("cdn.discordapp.com") > 0)
      ) {
        scripts.push(fetchProxy(src, null, 0));
      } else {
        script[i].removeAttribute("type");
        scripts.push(Promise.resolve(script[i].innerHTML));
      }
    }
    Promise.all(scripts).then(function (res) {
      for (i = 0; i < res.length; ++i) {
        loadJS(res[i]);
      }
      document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true, cancelable: true }));
    });
  };

  // Inject CSS dynamically.
  var loadCSS = function (data) {
    if (data) {
      var style = document.createElement("style");
      style.innerHTML = data;
      document.head.appendChild(style);
    }
  };

  // Inject JavaScript dynamically.
  var loadJS = function (data) {
    if (data) {
      var script = document.createElement("script");
      script.innerHTML = data;
      document.body.appendChild(script);
    }
  };

  // Fetch function that attempts a direct fetch and falls back to a CORS proxy if needed.
  var fetchProxy = function (url, options, i) {
    var proxy = ["", "https://api.codetabs.com/v1/proxy/?quest="];
    return fetch(proxy[i] + url, options)
      .then(function (res) {
        if (!res.ok)
          throw new Error("Cannot load " + url + ": " + res.status + " " + res.statusText);
        return res.text();
      })
      .catch(function (error) {
        if (i === proxy.length - 1) throw error;
        return fetchProxy(url, options, i + 1);
      });
  };

  // Main execution: If the URL is from an external source, fetch it.
  if (url && url.indexOf(location.hostname) < 0) {
    // For Discord attachments ending in .txt:
    if (url.indexOf("cdn.discordapp.com/attachments/") !== -1 && url.match(/\.txt(\?.*)?$/)) {
      fetch(url)
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Network response was not ok: " + response.statusText);
          }
          return response.text();
        })
        .then(function (data) {
          var trimmed = data.trim();
          // If the file content appears to be HTML, process it as HTML.
          if (/^<!doctype html>/i.test(trimmed) || /^<html/i.test(trimmed)) {
            loadHTML(data);
          } else {
            // Otherwise, treat it as plain text.
            loadText(data);
          }
        })
        .catch(function (error) {
          console.error("An error occurred:", error);
          previewForm.style.display = "block";
          previewForm.innerText = error;
        });
    } else {
      // For all other URLs, use the CORS proxy and treat the content as HTML.
      fetchProxy(url, null, 0)
        .then(loadHTML)
        .catch(function (error) {
          console.error(error);
          previewForm.style.display = "block";
          previewForm.innerText = error;
        });
    }
  } else {
    previewForm.style.display = "block";
  }
})();
