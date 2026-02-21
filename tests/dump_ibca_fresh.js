const { chromium } = require('playwright');
const fs = require('fs');

async function dump() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const url = 'https://ibcabbq.org/events/';
    console.log(`Dumping IBCA: ${url}...`);
    try {
        // IBCA uses "The Events Calendar" (tribe). Wait for tribe events to load
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(5000);

        const content = await page.content();
        fs.writeFileSync('ibca_refresh_dump.html', content);

        // Extract visible text
        const text = await page.locator('body').innerText().catch(() => '');
        fs.writeFileSync('ibca_refresh_text.txt', text);
        console.log('Saved ibca_refresh_dump.html and ibca_refresh_text.txt');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

dump();
