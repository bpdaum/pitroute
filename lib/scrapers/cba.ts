import { chromium } from 'playwright';
import { Scraper, ScrapedEvent } from './types';

export class CBAScraper implements Scraper {
    private url = 'https://cbabbq.com/events';

    async scrape(): Promise<ScrapedEvent[]> {
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const events: ScrapedEvent[] = [];

        try {
            console.log(`Navigating to CBA: ${this.url}`);
            const page = await browser.newPage();
            await page.goto(this.url, { waitUntil: 'networkidle', timeout: 45000 });
            await page.waitForTimeout(5000);

            const bodyText = await page.evaluate(() => document.body.innerText);
            const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const monthAbbrs = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

            const uniqueEvents = new Map<string, ScrapedEvent>();

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const dateMatch = line.match(/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})(?:\s*-\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2}))?$/i);

                if (dateMatch) {
                    try {
                        const mStr = dateMatch[1].toUpperCase();
                        const day = parseInt(dateMatch[2]);
                        const parsedMonth = monthAbbrs.indexOf(mStr);

                        let targetYear = currentYear;
                        if (parsedMonth < currentMonth - 2) {
                            targetYear++;
                        }

                        const date = new Date(targetYear, parsedMonth, day);
                        const name = lines[i + 1] || '';
                        const location = lines[i + 2] || '';

                        if (name && location) {
                            const key = `${name.trim()}_${date.getTime()}`;
                            if (!uniqueEvents.has(key)) {
                                uniqueEvents.set(key, {
                                    name: name.trim(),
                                    date,
                                    location: location.trim(),
                                    url: this.url
                                });
                            }
                            i += 2; // Skip the next two lines as we've consumed them
                        }
                    } catch (e) {
                        console.warn('Error parsing CBA line:', line, e);
                    }
                }
            }
            events.push(...uniqueEvents.values());
            console.log(`Found ${events.length} total events for CBA`);

        } catch (error: any) {
            console.error('CBA Scrape Error:', error.message);
        } finally {
            await browser.close();
        }

        return events;
    }
}
