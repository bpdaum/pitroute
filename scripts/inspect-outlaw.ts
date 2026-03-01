import { chromium } from 'playwright';

async function main() {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        const url = 'https://outlawbbq.org/events/';
        console.log(`Fetching Outlaw BBQ: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(5000); // wait for calendar loading

        console.log("TEXT DUMP START\n===================\n");
        const bodyText = await page.locator('body').innerText();
        console.log(bodyText.substring(0, 5000));
        console.log("\n===================\nTEXT DUMP END");

        console.log("LINK DUMP START\n===================\n");
        const links = await page.locator('a').all();
        console.log(`Found ${links.length} total links on page`);
        for (const l of links) {
            const href = await l.getAttribute('href').catch(() => '');
            if (href && href.length > 5) {
                const text = await l.innerText().catch(() => '');
                console.log(`HREF: ${href} | TEXT: ${text}`);
            }
        }
        console.log("\n===================\nLINK DUMP END");

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

main().catch(console.error);
