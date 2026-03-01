import { chromium } from 'playwright';

async function main() {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        console.log("Navigating to cbabbq.com...");
        await page.goto('https://cbabbq.com/events');
        await page.waitForTimeout(5000); // Give it time to load

        // The CBA site probably has an events list. Let's get the text of the body to see what we're working with.
        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log(bodyText.substring(0, 1500)); // Print the top part to see structure
    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await browser.close();
    }
}

main();
