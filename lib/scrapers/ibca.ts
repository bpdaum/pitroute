import { chromium } from 'playwright';
import { Scraper, ScrapedEvent } from './types';

export class IBCAScraper implements Scraper {
    private url = 'https://ibcabbq.org/events/';

    async scrape(): Promise<ScrapedEvent[]> {
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        const now = new Date();
        const events: ScrapedEvent[] = [];

        try {
            console.log(`Navigating to IBCA: ${this.url}`);
            await page.goto(this.url, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(5000);

            const monthsToScrape = [
                now.getMonth() + 1,
                (now.getMonth() + 1) % 12 + 1,
                (now.getMonth() + 2) % 12 + 1
            ];

            for (const monthStr of monthsToScrape) {
                try {
                    console.log(`Selecting month: ${monthStr}`);
                    await page.selectOption('#event_month_select', { value: monthStr.toString() });
                    await page.waitForTimeout(5000);

                    // Find all event links
                    const eventLinks = await page.evaluate(() => {
                        return Array.from(document.querySelectorAll('a'))
                            .filter(a => a.href.includes('/contest-details/?contestid='))
                            .map(a => a.href);
                    });

                    // De-duplicate links for this month
                    const uniqueLinks = Array.from(new Set(eventLinks));
                    console.log(`Found ${uniqueLinks.length} unique event links for month ${monthStr}`);

                    for (const link of uniqueLinks) {
                        try {
                            const detailPage = await browser.newPage();
                            await detailPage.goto(link, { waitUntil: 'networkidle', timeout: 45000 });

                            const name = await detailPage.locator('h1').first().innerText().catch(() => '');
                            const dateStr = await detailPage.locator('.contest-date').first().innerText().catch(() => '');
                            const address = await detailPage.locator('.contest-address').first().innerText().catch(() => '');

                            if (name) {
                                // Address often contains "Driving Directions" and "Map" text if we use innerText
                                // But my text dump showed they are in <a> tags inside the div.
                                // innerText will include them. Let's clean it up.
                                const cleanAddress = address
                                    .replace(/\[Driving Directions\]/g, '')
                                    .replace(/\[Map\]/g, '')
                                    .trim();

                                events.push({
                                    name: name.trim(),
                                    date: this.parseDate(dateStr),
                                    location: cleanAddress || 'Unknown',
                                    url: link
                                });
                            }
                            await detailPage.close();
                        } catch (e: any) {
                            console.warn(`Error scraping IBCA detail page ${link}:`, e.message);
                        }
                    }
                } catch (e: any) {
                    console.error(`Error querying month ${monthStr} on IBCA:`, e.message);
                }
            }

            console.log(`Found ${events.length} total events for IBCA`);

        } catch (error: any) {
            console.error('IBCA Scrape Error:', error.message);
        } finally {
            await browser.close();
        }

        return events;
    }

    private parseDate(dateStr: string): Date {
        // format: "March 6, 2026 - March 7, 2026"
        try {
            const firstPart = dateStr.split('-')[0].trim();
            return new Date(firstPart);
        } catch (e) {
            return new Date();
        }
    }
}
