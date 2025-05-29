(function () {
  var previewForm = document.getElementById("previewform");

  // Get the entire query from the URL—even if it contains multiple '?' characters.
  // This avoids issues with the browser splitting off extra query parameters.
  var q = window.location.href.split('?').slice(1).join('?').trim();

  // Make sure we have a URL that ends in .txt (allowing for additional query parameters)
  if (!q.match(/\.txt(\?.*)?$/i)) {
    previewForm.style.display = "block";
    previewForm.innerText = "Error: Only .txt files are supported.";
    return;
  }
  var url = q;
  console.log("Fetching URL:", url);

  // Fetch the .txt file (which contains raw HTML).
  fetch(url)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Network response was not ok: " + response.statusText);
      }
      return response.text();
    })
    .then(function (data) {
      // Insert a <base> tag in the <head> so that relative asset URLs resolve correctly.
      // Also, rewrite inline scripts (if needed) to mimic the original behavior.
      var htmlContent = data.replace(
        /<head([^>]*)>/i,
        '<head$1><base href="' + url + '">'
      ).replace(
        /<script(\s*src=["'][^"']*["'])?(\s*type=["'](text|application)\/javascript["'])?/gi,
        "<script type='text/htmlpreview'$1"
      );
      
      // Render the HTML by writing it into the document.
      setTimeout(function () {
        document.open();
        document.write(htmlContent);
        document.close();
      }, 10);
    })
    .catch(function (error) {
      console.error("Error while fetching the file:", error);
      previewForm.style.display = "block";
      previewForm.innerText = "Error: " + error.message;
    });
})();
