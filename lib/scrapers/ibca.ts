import { chromium } from 'playwright';
import { Scraper, ScrapedEvent } from './types';

export class IBCAScraper implements Scraper {
    private url = 'https://ibcabbq.org/events/';

    async scrape(): Promise<ScrapedEvent[]> {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        const events: ScrapedEvent[] = [];

        try {
            console.log(`Navigating to IBCA: ${this.url}`);
            await page.goto(this.url, { waitUntil: 'networkidle', timeout: 45000 });
            await page.waitForTimeout(5000); // Wait for dynamic divi-ajax filter to load

            // IBCA events are rendered by a Divi AJAX filter
            // Try specific tribe event elements first
            const tribeEvents = await page.locator('.tribe-events-calendar-list__event, article.tribe_events').all();
            console.log(`Found ${tribeEvents.length} tribe event elements`);

            if (tribeEvents.length > 0) {
                for (const evt of tribeEvents) {
                    try {
                        const name = await evt.locator('.tribe-events-calendar-list__event-title, .tribe-event-url, h3').first().innerText().catch(() => '');
                        const dateEl = await evt.locator('time').first().getAttribute('datetime').catch(() => '');
                        const locationEl = await evt.locator('.tribe-venue').first().innerText().catch(() => '');
                        const link = await evt.locator('a').first().getAttribute('href').catch(() => '');

                        if (name) {
                            events.push({
                                name: name.trim(),
                                date: dateEl ? new Date(dateEl) : new Date(),
                                location: locationEl.trim(),
                                url: link || this.url
                            });
                        }
                    } catch (e: any) {
                        console.warn('Skipping IBCA tribe item:', e.message);
                    }
                }
            } else {
                // Fallback: parse visible text
                // Pattern from dump:
                // "Feb 6\nRegion\n2\nVFW Post 10352\nHouston, TX\nResults In"
                const bodyText = await page.locator('body').innerText();
                const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);

                const monthAbbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const currentYear = new Date().getFullYear();

                for (let i = 0; i < lines.length; i++) {
                    // Detect "Mon DD" pattern
                    const dateMatch = lines[i].match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/);
                    if (dateMatch) {
                        try {
                            const monthStr = dateMatch[1];
                            const day = parseInt(dateMatch[2]);
                            const month = monthAbbrs.indexOf(monthStr);
                            const date = new Date(currentYear, month, day);

                            // Skip "Region" and the region number lines
                            let idx = i + 1;
                            if (lines[idx] === 'Region') idx += 2;

                            const name = lines[idx] || '';
                            const city = lines[idx + 1] || '';

                            if (name && !name.match(/^(Results In|State Championship|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Region|\d+)$/)) {
                                events.push({
                                    name: name.trim(),
                                    date,
                                    location: city.trim(),
                                    url: this.url
                                });
                                i = idx + 1;
                            }
                        } catch (e: any) {
                            // Skip invalid dates
                        }
                    }
                }
            }

            console.log(`Found ${events.length} events for IBCA`);

        } catch (error: any) {
            console.error('IBCA Scrape Error:', error.message);
        } finally {
            await browser.close();
        }

        return events;
    }
}
