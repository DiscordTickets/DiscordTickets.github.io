document.addEventListener('DOMContentLoaded', function() {
  // Get the query string, which should be the URL to load (without the leading ?)
  const rawURL = location.search.substr(1);

  // If there is no URL provided, show the preview form.
  if (!rawURL) {
    document.getElementById("previewform").style.display = "block";
    return;
  }

  // Validate that the URL starts with http:// or https:// (basic check)
  if (!rawURL.match(/^https?:\/\//)) {
    document.body.innerHTML = "<p>Invalid URL: must start with http:// or https://</p>";
    return;
  }

  // Option 1: Replace the whole document with the fetched HTML.  
  // This approach is straightforward—but note that it completely overwrites the current page.
  fetch(rawURL)
    .then(response => {
      if (!response.ok) {
        throw new Error("Network response was not OK. Status: " + response.status);
      }
      return response.text();
    })
    .then(html => {
      // Replace the document with the fetched HTML. This simulates a full preview.
      document.open();
      document.write(html);
      document.close();
    })
    .catch(err => {
      document.body.innerHTML = `<p>Error loading content: ${err.message}</p>`;
    });

  /* 
  // Option 2: Alternatively, you could insert the fetched HTML into a specific element.
  // Uncomment this block and comment out the document.write() approach if you'd prefer to embed 
  // the loaded content instead of completely replacing the page.
  
  fetch(rawURL)
    .then(response => {
      if (!response.ok) {
        throw new Error("Network response was not OK. Status: " + response.status);
      }
      return response.text();
    })
    .then(html => {
      // Create a container to insert the fetched HTML
      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);
    })
    .catch(err => {
      document.body.innerHTML = `<p>Error loading content: ${err.message}</p>`;
    });
  */
});
