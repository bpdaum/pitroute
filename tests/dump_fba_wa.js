const { chromium } = require('playwright');
const fs = require('fs');

async function dump() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Try the FBA Wild Apricot embedded events calendar
    const url = 'https://fba39.wildapricot.org/events';
    console.log(`Dumping ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000); // extra time for AJAX
        const content = await page.content();
        fs.writeFileSync('fba_wa_dump.html', content);
        console.log('HTML saved to fba_wa_dump.html');
        // Extract all text
        const text = await page.locator('body').innerText();
        fs.writeFileSync('fba_wa_text.txt', text);
        console.log('Text saved to fba_wa_text.txt');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

dump();
