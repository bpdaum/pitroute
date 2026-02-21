import { chromium } from 'playwright';
import { Scraper, ScrapedEvent } from './types';

export class MBNScraper implements Scraper {
    private url = 'https://memphisbbqnetwork.com/events/';

    async scrape(): Promise<ScrapedEvent[]> {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        const events: ScrapedEvent[] = [];

        try {
            console.log(`Navigating to MBN: ${this.url}`);
            await page.goto(this.url, { waitUntil: 'networkidle' });

            const eventRows = await page.locator('.tribe-events-calendar-list__event-row').all();
            console.log(`Found ${eventRows.length} event rows`);

            for (const row of eventRows) {
                try {
                    const nameLink = row.locator('.tribe-events-calendar-list__event-title-link').first();
                    const name = await nameLink.innerText().catch(() => '');
                    const href = await nameLink.getAttribute('href').catch(() => '');

                    if (!name || !href) continue;

                    // Datetime attribute is usually "YYYY-MM-DD"
                    const dateElem = row.locator('time.tribe-events-calendar-list__event-date-tag-datetime').first();
                    const dateStr = await dateElem.getAttribute('datetime').catch(() => '');

                    const venueElem = row.locator('.tribe-events-calendar-list__event-venue-title').first();
                    const location = await venueElem.innerText().catch(() => '');

                    events.push({
                        name: name.trim(),
                        date: dateStr ? new Date(dateStr) : new Date(),
                        location: location.trim(),
                        url: href
                    });
                } catch (e: any) {
                    console.warn('Skipping MBN row due to error:', e.message);
                }
            }

        } catch (error) {
            console.error('MBN Scrape Error:', error);
        } finally {
            await browser.close();
        }

        return events;
    }
}
