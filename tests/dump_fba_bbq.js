const { chromium } = require('playwright');
const fs = require('fs');

async function dump() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const url = 'https://fba39.wildapricot.org/page-18280';
    console.log(`Dumping FBA BBQ Competitions page: ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        const content = await page.content();
        fs.writeFileSync('fba_bbq_comp_dump.html', content);
        const text = await page.locator('body').innerText();
        fs.writeFileSync('fba_bbq_comp_text.txt', text);
        console.log('Saved fba_bbq_comp_dump.html and fba_bbq_comp_text.txt');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

dump();
