const { chromium } = require('playwright');
const fs = require('fs');

async function dump() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'https://fbabbq.com/fba-event-sanctioning/available-contests-dates/';
    console.log(`Dumping ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        const content = await page.content();
        fs.writeFileSync('fba_dates_dump.html', content);
        console.log('HTML saved to fba_dates_dump.html');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

dump();
