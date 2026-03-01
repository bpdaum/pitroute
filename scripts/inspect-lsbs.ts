import { chromium } from 'playwright';

async function main() {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        const url = 'https://www.lonestarbarbecue.com/copy-2-of-template-events-1';
        console.log(`Fetching LSBS: ${url} `);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(5000); // wait for lazy loading

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

