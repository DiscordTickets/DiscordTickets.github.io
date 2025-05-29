const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>DiscordTickets Viewer</title>
        </head>
        <body>
            <div id="content">Loading content...</div>
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                const rawUrl = urlParams.get("url");

                if (rawUrl) {
                    fetch("/fetch?url=" + encodeURIComponent(rawUrl))
                        .then(response => response.text())
                        .then(html => {
                            document.getElementById("content").innerHTML = html;
                        })
                        .catch(error => {
                            console.error("Error fetching content:", error);
                            document.getElementById("content").textContent = "Failed to load content.";
                        });
                } else {
                    document.getElementById("content").textContent = "No URL provided.";
                }
            </script>
        </body>
        </html>
    `);
});

app.get("/fetch", async (req, res) => {
    const rawUrl = req.query.url;

    if (!rawUrl) {
        return res.status(400).send("No URL provided.");
    }

    try {
        const response = await fetch(rawUrl);
        const html = await response.text();
        res.send(html);
    } catch (error) {
        console.error("Error fetching content:", error);
        res.status(500).send("Failed to load content.");
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
