import { chromium } from 'playwright';

async function main() {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        const url = 'https://ctbabbq.com/events/';
        console.log(`Fetching CTBA: ${url}`);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(5000);

        console.log("TEXT DUMP START\n===================\n");
        const bodyText = await page.locator('body').innerText();
        console.log(bodyText.substring(0, 5000));
        console.log("\n===================\nTEXT DUMP END");

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

main().catch(console.error);
