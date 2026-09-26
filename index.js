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
        // Pinterest short links (pin.it) expand වෙලා යන redirection එක ලබාගැනීම
        const response = await axios.get(videoUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5"
            },
            maxRedirects: 10
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Pinterest වීඩියෝ ලින්ක් එක තියෙන Meta tag හොයාගැනීම
        let downloadLink = $('meta[property="og:video"]').attr('content') || 
                           $('meta[property="og:video:secure_url"]').attr('content') ||
                           $('meta[name="twitter:player:stream"]').attr('content');

        // සමහර අවස්ථවල JSON data ඇතුළේ ලින්ක් එක තියෙන්න පුළුවන්
        if (!downloadLink) {
            const scriptData = $('script[data-relay-response="true"]').html();
            if (scriptData) {
                try {
                    const json = JSON.parse(scriptData);
                    // JSON එකෙන් URL එක ලබාගැනීමේ ක්‍රමවේදය
                    const pinData = json.response?.data?.v3GetPinQuery?.data;
                    if (pinData && pinData.videos) {
                        downloadLink = pinData.videos.video_list[Object.keys(pinData.videos.video_list)[0]].url;
                    }
                } catch (e) {
                    // JSON parse error ignore කිරීම
                }
            }
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
