const { chromium } = require('playwright');

const targets = [
    { name: 'KCBS', url: 'https://www.kcbs.us/event_list.php' },
    { name: 'MBN', url: 'https://mbnbbq.com/events/' },
    { name: 'IBCA', url: 'https://ibcabbq.org/organization-events/' },
    { name: 'FBA', url: 'https://fbabbq.com/events/' },
    { name: 'SCA', url: 'https://steakcookoffs.com/events' }
];

async function discover() {
    const browser = await chromium.launch({ headless: true });
    for (const target of targets) {
        console.log(`Checking ${target.name}: ${target.url}...`);
        const page = await browser.newPage();
        try {
            const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            console.log(`  Status: ${response.status()}`);
            console.log(`  Title: ${await page.title()}`);
            const content = await page.content();
            console.log(`  Content Length: ${content.length}`);
            if (content.length < 500) {
                console.log(`  Snippet: ${await page.evaluate(() => document.body.innerText.substring(0, 100))}`);
            }
        } catch (error) {
            console.error(`  Error: ${error.message}`);
        } finally {
            await page.close();
        }
    }
    await browser.close();
}

discover();
