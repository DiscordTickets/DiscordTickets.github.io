<script>
document.addEventListener("DOMContentLoaded", function() {
  // Get the URL from the query string (everything after the '?')
  var url = window.location.search.substring(1);
  
  if (url) {
    // Use fetch() to retrieve the remote HTML file
    fetch(url)
      .then(function(response) {
        if (!response.ok) {
          throw new Error("Network response was not ok.");
        }
        return response.text();
      })
      .then(function(html) {
        // Option 1: Replace the entire document with the fetched HTML
        document.documentElement.innerHTML = html;

        // Option 2: Alternatively, inject the HTML into a specific container
        // document.getElementById('previewcontainer').innerHTML = html;
      })
      .catch(function(error) {
        console.error("Error while fetching the remote HTML:", error);
        document.body.innerHTML = "<p>Error loading preview.</p>";
      });
  } else {
    // If no URL is provided, show the form
    document.getElementById("previewform").style.display = "block";
  }
});
</script>
