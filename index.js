const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ status: "API is running successfully!", author: "Tech With Dasun" });
});

app.get('/download', async (req, res) => {
    let videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).json({ error: "Please provide a Pinterest video URL using ?url=" });
    }

    try {
        // pin.it short link එකක් නම් මුලින්ම ඒක expand කරගැනීම
        if (videoUrl.includes('pin.it')) {
            const shortRes = await axios.get(videoUrl, {
                maxRedirects: 5,
                headers: {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }
            });
            videoUrl = shortRes.request.res.responseUrl || videoUrl;
        }

        // දැන් ඔරිජිනල් Pinterest පේජ් එක ලබාගැනීම
        const response = await axios.get(videoUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });

        const $ = cheerio.load(response.data);

        // Meta tags වලින් වීඩියෝ ලින්ක් එක සෙවීම
        let downloadLink = $('meta[property="og:video"]').attr('content') || 
                           $('meta[property="og:video:secure_url"]').attr('content') ||
                           $('meta[name="twitter:player:stream"]').attr('content');

        // සමහර විට JSON දත්ත ඇතුළේ වීඩියෝ එක තිබිය හැක
        if (!downloadLink) {
            $('script').each((i, el) => {
                const scriptContent = $(el).html();
                if (scriptContent && scriptContent.includes('contentUrl')) {
                    try {
                        const match = scriptContent.match(/"contentUrl"\s*:\s*"(https:\/\/[^"]+)"/);
                        if (match && match[1]) {
                            downloadLink = match[1].replace(/\\u0026/g, '&');
                        }
                    } catch (err) {}
                }
            });
        }

        if (!downloadLink) {
            return res.status(404).json({ error: "Video link not found. Make sure it's a valid video pin." });
        }

        res.json({
            success: true,
            pinterest_url: videoUrl,
            download_url: downloadLink
        });

    } catch (error) {
        res.status(500).json({ error: "Failed to fetch video. Internal Server Error.", details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
