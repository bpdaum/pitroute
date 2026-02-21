const { chromium } = require('playwright');

async function testFetch() {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'https://www.kcbs.us/events.php';
    console.log(`Navigating to ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        const title = await page.title();
        console.log(`Page Title: ${title}`);
        const content = await page.content();
        console.log(`Content length: ${content.length}`);
        // Print a bit of the body to see structure
        const bodySnippet = await page.evaluate(() => document.body.innerText.substring(0, 500));
        console.log('Body Snippet:', bodySnippet);
    } catch (error) {
        console.error('Error during fetch:', error);
    } finally {
        await browser.close();
    }
}

testFetch();
