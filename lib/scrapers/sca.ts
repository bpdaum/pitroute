import { chromium } from 'playwright';
import { Scraper, ScrapedEvent } from './types';

export class SCAScraper implements Scraper {
    private url = 'https://steakcookoffs.com/cookoffs';

    async scrape(): Promise<ScrapedEvent[]> {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        const events: ScrapedEvent[] = [];

        try {
            console.log(`Navigating to SCA: ${this.url}`);
            await page.goto(this.url, { waitUntil: 'networkidle' });

            const eventLinks = await page.locator('a[data-tags="cookoff"]').all();
            console.log(`Found ${eventLinks.length} event links`);

            for (const link of eventLinks) {
                const titleText = await link.getAttribute('title');
                const href = await link.getAttribute('href');
                const name = await link.innerText();

                if (!titleText || !href || !name) continue;

                // Title format: "Friday, February 20, 2026\n  Hernando, Mississippi"
                const lines = titleText.split('\n');
                const dateStr = lines[0].trim();
                const location = lines[1] ? lines[1].trim() : '';

                events.push({
                    name: name.split('@')[0].trim(),
                    date: new Date(dateStr),
                    location,
                    url: href.startsWith('http') ? href : `https://steakcookoffs.com${href}`
                });
            }

        } catch (error) {
            console.error('SCA Scrape Error:', error);
        } finally {
            await browser.close();
        }

        return events;
    }
}
