(function () {
  var previewForm = document.getElementById("previewform");

  // Retrieve query string (everything after '?')
  var q = location.search.substring(1);
  var url;

  // Determine if the URL is a Discord attachment, GitHub, or other.
  if (q.indexOf("cdn.discordapp.com/attachments/") !== -1) {
    url = q;
  } else if (q.indexOf("github.com") !== -1) {
    // Convert GitHub URL to raw URL
    url = q.replace(/\/\/github\.com/, "//raw.githubusercontent.com").replace(/\/blob\//, "/");
  } else {
    url = q;
  }

  // Helper function to display plain text in a <pre> block.
  var loadText = function (data) {
    // Clear the current document and insert the text inside a styled <pre>.
    document.open();
    document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Text Preview</title>' +
        "<style>body { font: 12px 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 1em; }" +
        "pre { white-space: pre-wrap; word-wrap: break-word; background: #f4f4f4; padding: 1em; }</style>" +
        "</head><body><pre>" +
        data +
        "</pre></body></html>"
    );
    document.close();
  };

  // Function to replace asset URLs (iframes, links, scripts, etc.) inside an HTML document.
  var replaceAssets = function () {
    var frame, a, link, links = [], script, scripts = [], i, href, src;

    // Avoid replacing assets if framesets are present.
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
        a[i].href = "//" + location.hostname + location.pathname + location.search + "#" + a[i].hash.substring(1);
      } else if (
        (href.indexOf("//raw.githubusercontent.com") > 0 ||
          href.indexOf("//bitbucket.org") > 0 ||
          href.indexOf("cdn.discordapp.com") > 0) &&
        (href.indexOf(".html") > 0 || href.indexOf(".htm") > 0)
      ) {
        a[i].href = "//" + location.hostname + location.pathname + "?" + href;
      }
    }

    // Process linked stylesheets.
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

    // Process external or inline scripts.
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

  // Load HTML data into the document.
  var loadHTML = function (data) {
    if (data) {
      data = data
        .replace(/<head([^>]*)>/i, '<head$1><base href="' + url + '">')
        .replace(
          /<script(\s*src=["'][^"']*["'])?(\s*type=["'](text|application)\/javascript["'])?/gi,
          '<script type="text/htmlpreview"$1'
        );
      setTimeout(function () {
        document.open();
        document.write(data);
        document.close();
        replaceAssets();
      }, 10);
    }
  };

  // Inject CSS into the document.
  var loadCSS = function (data) {
    if (data) {
      var style = document.createElement("style");
      style.innerHTML = data;
      document.head.appendChild(style);
    }
  };

  // Inject JavaScript into the document.
  var loadJS = function (data) {
    if (data) {
      var script = document.createElement("script");
      script.innerHTML = data;
      document.body.appendChild(script);
    }
  };

  // A simple fetch proxy with fallback to a CORS proxy if needed.
  var fetchProxy = function (url, options, i) {
    var proxy = [
      "", // try without proxy first
      "https://api.codetabs.com/v1/proxy/?quest=",
    ];
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

  // Main execution flow.
  if (url && url.indexOf(location.hostname) < 0) {
    // If the URL is for Discord attachments and ends with .txt, fetch it as a plain text file.
    if (
      url.indexOf("cdn.discordapp.com/attachments/") !== -1 &&
      url.match(/\.txt(\?.*)?$/)
    ) {
      fetch(url)
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Network response was not ok: " + response.statusText);
          }
          return response.text();
        })
        .then(function (data) {
          console.log("File loaded into memory:", data);
          loadText(data);
        })
        .catch(function (error) {
          console.error("An error occurred:", error);
          previewForm.style.display = "block";
          previewForm.innerText = error;
        });
    } else {
      // Otherwise, use proxy fetching and treat it as HTML.
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
