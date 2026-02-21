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

            // Scrape current plus 2 future months
            for (let pageNum = 0; pageNum < 3; pageNum++) {
                // Wait for the list to be visible before looking for rows
                await page.waitForTimeout(2000);
                const eventRows = await page.locator('.tribe-events-calendar-list__event-row').all();
                console.log(`Found ${eventRows.length} event rows on page ${pageNum + 1}`);

                for (const row of eventRows) {
                    try {
                        const nameLink = row.locator('.tribe-events-calendar-list__event-title-link').first();
                        const name = await nameLink.innerText().catch(() => '');
                        const href = await nameLink.getAttribute('href').catch(() => '');

                        if (!name || !href) continue;

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

                // Look for Next link
                const nextBtn = page.locator('.tribe-events-c-nav__next, .tribe-events-nav-next a').first();
                const isVisible = await nextBtn.isVisible().catch(() => false);

                if (isVisible) {
                    console.log('Navigating to next MBN page...');
                    await nextBtn.click();
                    // Wait for the new AJAX content to load indicated by the removed skeleton class
                    try {
                        await page.waitForSelector('.tribe-events-calendar-list__event-row', { state: 'visible', timeout: 5000 });
                    } catch (e) { } // If it timeouts, the loop will catch it naturally
                } else {
                    break;
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
