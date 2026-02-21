const { chromium } = require('playwright');
const fs = require('fs');

async function dump() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Intercept network requests to find the Wild Apricot API calls
    const requests = [];
    page.on('request', req => {
        if (req.url().includes('wildapricot') || req.url().includes('Event')) {
            requests.push({ url: req.url(), method: req.method() });
        }
    });

    const url = 'https://fba39.wildapricot.org/events';
    console.log(`Navigating to ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(5000);

        console.log('Captured API requests:');
        requests.forEach(r => console.log(`${r.method} ${r.url}`));

        const content = await page.content();
        fs.writeFileSync('fba_wa_dump2.html', content);
        console.log('HTML saved to fba_wa_dump2.html');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

dump();
