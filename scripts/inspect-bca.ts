import { chromium } from 'playwright';

async function main() {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        const url = 'https://bcabbq.org/';
        console.log(`Fetching BCA: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(5000);

        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }));
        });
        console.log("LINKS START\n===================\n");
        console.log(JSON.stringify(links, null, 2));
        console.log("\n===================\nLINKS END");

        console.log("TEXT DUMP START\n===================\n");
        const bodyText = await page.locator('body').innerText();
        console.log(bodyText);
        console.log("\n===================\nTEXT DUMP END");

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

main().catch(console.error);
