(function () {
  var previewForm = document.getElementById("previewform");

  // Get the query string (everything after the '?') and clean it.
  var q = location.search.substring(1).trim();
  // Remove any trailing & or ? characters that might cause issues.
  q = q.replace(/[&?]+$/, "");

  // Ensure that only .txt files are allowed.
  if (!q.match(/\.txt(\?.*)?$/i)) {
    previewForm.style.display = "block";
    previewForm.innerText = "Error: Only .txt files are supported.";
    return;
  }
  var url = q;

  // Fetch the TXT file (which by definition contains raw HTML)
  fetch(url)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Network response was not ok: " + response.statusText);
      }
      return response.text();
    })
    .then(function (data) {
      // Since every .txt file has raw HTML, inject a <base> tag so relative links resolve correctly.
      var htmlContent = data.replace(/<head([^>]*)>/i, '<head$1><base href="' + url + '">')
                            // Rewrite inline scripts as in the original logic.
                            .replace(
                              /<script(\s*src=["'][^"']*["'])?(\s*type=["'](text|application)\/javascript["'])?/gi,
                              "<script type='text/htmlpreview'$1"
                            );
      // Write the fetched HTML into the document.
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
