const { chromium } = require('playwright');
const fs = require('fs');

async function dump() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'https://www.kcbs.us/explore_events.php';
    console.log(`Dumping ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        const content = await page.content();
        fs.writeFileSync('kcbs_explore_dump.html', content);
        console.log('HTML saved to kcbs_explore_dump.html');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

dump();
