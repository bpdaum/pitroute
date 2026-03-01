import { chromium } from 'playwright';
import { Scraper, ScrapedEvent } from './types';

export class CTBAScraper implements Scraper {
    private url = 'https://ctbabbq.com/events/';

    async scrape(): Promise<ScrapedEvent[]> {
        const events: ScrapedEvent[] = [];
        const browser = await chromium.launch({ headless: true });

        try {
            console.log(`Fetching CTBA: ${this.url}`);

            const page = await browser.newPage();
            await page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(4000);

            const bodyText = await page.locator('body').innerText();
            const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);

            // CTBA has a header usually saying "UPCOMING EVENTS (YYYY)"
            let currentYear = new Date().getFullYear();
            const yearMatch = bodyText.match(/UPCOMING EVENTS\s*\((\d{4})\)/i);
            if (yearMatch) {
                currentYear = parseInt(yearMatch[1]);
            }

            const monthAbbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            for (let i = 0; i < lines.length - 2; i++) {
                const line1 = lines[i];     // e.g "3-4" or "24-26"
                const line2 = lines[i + 1]; // e.g "MAR"

                // Matches "DD-DD" or just "DD"
                if (/^\d{1,2}(?:-\d{1,2})?$/.test(line1) && monthAbbrs.map(m => m.toUpperCase()).includes(line2.toUpperCase())) {

                    const dayStr = line1.split('-')[0];
                    const day = parseInt(dayStr);
                    const monthIdx = monthAbbrs.findIndex(m => m.toLowerCase() === line2.toLowerCase());

                    if (monthIdx !== -1) {
                        try {
                            const date = new Date(currentYear, monthIdx, day);

                            // The location/name is on the lines following the month
                            let j = i + 2;
                            let location = lines[j];
                            let name = `${location} BBQ Cookoff`;

                            // Sometimes there are two lines for name/location, sometimes contact info follows.
                            // We grab the immediate next line as location. Sometimes contact names are there, but CTBA layout is very loose.

                            if (location && !location.includes('-')) {
                                events.push({
                                    name,
                                    date,
                                    location: location.includes(',') ? location : `${location}, TX`, // CTBA is almost exclusively TX
                                    url: this.url
                                });
                            }
                        } catch (e) {
                            console.warn('CTBA parse error skipping block:', line1, line2);
                        }
                    }
                }
            }

            console.log(`Found ${events.length} total events for CTBA`);

        } catch (error: any) {
            console.error('CTBA Scrape Error:', error.message);
        } finally {
            await browser.close();
        }

        return events;
    }
}
