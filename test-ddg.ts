import axios from 'axios';
import * as cheerio from 'cheerio';

async function testDDG() {
    try {
        const res = await axios.post('https://lite.duckduckgo.com/lite/', 'q=ABA+Steak+Cookoff', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(res.data);
        const snippets: string[] = [];
        $('.result-snippet').each((i, el) => snippets.push($(el).text().trim()));
        require('fs').writeFileSync('ddg_lite.html', res.data);
        console.log("Wrote ddg_lite.html");
    } catch (e: any) {
        console.error("ERROR:", e.message);
    }
}

testDDG();
