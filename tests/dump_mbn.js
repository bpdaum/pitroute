const { chromium } = require('playwright');
const fs = require('fs');

async function dump() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'https://memphisbbqnetwork.com/events/';
    console.log(`Dumping ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        const content = await page.content();
        fs.writeFileSync('mbn_dump.html', content);
        console.log('HTML saved to mbn_dump.html');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

dump();
