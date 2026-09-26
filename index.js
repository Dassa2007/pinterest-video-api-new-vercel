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
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).json({ error: "Please provide a Pinterest video URL using ?url=" });
    }

    try {
        // Pinterest short links (pin.it) handle කරන්න redirect අල්ලගන්නවා
        const response = await axios.get(videoUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            maxRedirects: 5
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Pinterest වීඩියෝ ලින්ක් එක තියෙන Meta tag එක හොයාගැනීම
        let downloadLink = $('meta[property="og:video"]').attr('content') || 
                           $('meta[property="og:video:secure_url"]').attr('content');

        if (!downloadLink) {
            // වෙනත් JSON data block එකකින් සොයාගැනීම
            const scriptData = $('script[data-relay-response="true"]').html();
            if (scriptData) {
                const json = JSON.parse(scriptData);
                // JSON පතෙන් video url එක ලබාගැනීමේ විකල්පය
                // (සාමාන්‍යයෙන් og:video මගින් 90%ක්ම වැඩ කරයි)
            }
        }

        if (!downloadLink) {
            return res.status(404).json({ error: "Video link not found. Make sure the URL is a valid Pinterest video pin." });
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
