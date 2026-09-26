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
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            });
            videoUrl = shortRes.request.res.responseUrl || videoUrl;
        }

        const response = await axios.get(videoUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });

        const $ = cheerio.load(response.data);
        let downloadLink = null;

        // 1. Pinterest __NEXT_DATA__ JSON එකෙන් වීඩියෝ ලින්ක් එක සෙවීම
        const nextDataScript = $('#__NEXT_DATA__').html();
        if (nextDataScript) {
            try {
                const jsonData = JSON.parse(nextDataScript);
                const pinData = jsonData.props?.initialReduxState?.pins || jsonData.props?.pageProps?.initialReduxState?.pins;
                if (pinData) {
                    const pinKey = Object.keys(pinData)[0];
                    const videoList = pinData[pinKey]?.videos?.video_list;
                    if (videoList) {
                        const qualities = Object.keys(videoList);
                        // උසස්ම තත්ත්වයේ වීඩියෝ ලින්ක් එක ලබාගැනීම
                        downloadLink = videoList[qualities[qualities.length - 1]]?.url;
                    }
                }
            } catch (err) {}
        }

        // 2. වෙනත් ක්‍රමයකින් හෝ හමුනාවොත් og:video මඟින් උත්සාහ කිරීම
        if (!downloadLink) {
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
