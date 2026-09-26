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
        // pin.it short link එකක් නම් ඔරිජිනල් ලින්ක් එකට හරවාගැනීම
        if (videoUrl.includes('pin.it')) {
            const shortRes = await axios.get(videoUrl, {
                maxRedirects: 5,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                }
            });
            videoUrl = shortRes.request.res.responseUrl || videoUrl;
        }

        const response = await axios.get(videoUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });

        const html = response.data;
        let downloadLink = null;

        // HTML කෝඩ් එක ඇතුළෙන් MP4 වීඩියෝ ලින්ක් එක Regex මඟින් සෘජුවම සොයාගැනීම
        const mp4Match = html.match(/"url"\s*:\s*"([^"]+\.mp4[^"]*)"/);
        if (mp4Match && mp4Match[1]) {
            downloadLink = mp4Match[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
        }

        // එසේත් නැතහොත් og:video ටැග් එක පරීක්ෂා කිරීම
        if (!downloadLink) {
            const $ = cheerio.load(html);
            downloadLink = $('meta[property="og:video"]').attr('content') || 
                           $('meta[property="og:video:secure_url"]').attr('content');
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
