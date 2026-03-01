import { chromium } from 'playwright';
import * as fs from 'fs';

async function main() {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        const url = 'https://ibcabbq.org/contest-details/?contestid=11621';
        console.log(`Navigating to IBCA: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(5000);

        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .map(a => ({ text: a.innerText.trim(), href: a.href }));
        });

        fs.writeFileSync('ibca_links.json', JSON.stringify(links, null, 2));
        console.log(`Saved ${links.length} links to ibca_links.json`);

        const contentHtml = await page.evaluate(() => {
            const el = document.querySelector('.et_pb_column'); // Common for Divi
            return el ? el.innerHTML : 'Inner et_pb_column not found';
        });
        console.log("CONTENT HTML START\n===================\n");
        console.log(contentHtml);
        console.log("\n===================\nCONTENT HTML END");

        const bodyHtml = await page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync('ibca_structure.html', bodyHtml);
        console.log('Saved page HTML to ibca_structure.html');

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

main().catch(console.error);
