const { chromium } = require('playwright');

const homePages = [
    'https://www.kcbs.us',
    'https://memphisbbqnetwork.com',
    'https://ibcabbq.org',
    'https://flbbq.org',
    'https://steakcookoffs.com'
];

async function discoverLinks() {
    const browser = await chromium.launch({ headless: true });
    for (const url of homePages) {
        console.log(`\nCrawling home page: ${url}...`);
        const page = await browser.newPage();
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            const links = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('a'))
                    .map(a => ({ text: a.innerText.trim(), href: a.href }))
                    .filter(a => /event|calendar|contest|schedule|cook/i.test(a.text) || /event|calendar|schedule/i.test(a.href));
            });
            console.log(`  Found ${links.length} potential calendar links:`);
            links.slice(0, 10).forEach(l => console.log(`    - [${l.text}] ${l.href}`));
        } catch (error) {
            console.error(`  Error: ${error.message}`);
        } finally {
            await page.close();
        }
    }
    await browser.close();
}

discoverLinks();
