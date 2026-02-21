const { chromium } = require('playwright');
const fs = require('fs');

async function dump() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const urls = [
        'https://fbabbq.com/events/',
        'https://fba.wildapricot.org/events'
    ];
    for (const url of urls) {
        console.log(`Dumping ${url}...`);
        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            const content = await page.content();
            const filename = url.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
            fs.writeFileSync(filename, content);
            console.log(`HTML saved to ${filename}`);
        } catch (error) {
            console.error(`Error dumping ${url}:`, error.message);
        }
    }
    await browser.close();
}

dump();
