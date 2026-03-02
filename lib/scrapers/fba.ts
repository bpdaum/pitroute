import { chromium } from 'playwright';
import { Scraper, ScrapedEvent } from './types';

export class FBAScraper implements Scraper {
    private url = 'https://fba39.wildapricot.org/page-18280';

    async scrape(): Promise<ScrapedEvent[]> {
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        const events: ScrapedEvent[] = [];

        try {
            console.log(`Navigating to FBA BBQ Competitions: ${this.url}`);
            await page.goto(this.url, { waitUntil: 'networkidle', timeout: 45000 });
            await page.waitForTimeout(3000); // Give AJAX time to load events

            // Wild Apricot event items -- each has a title, start date, end date, location
            const eventItems = await page.locator('.eventlist-item, div.WaGadgetEventList .event').all();
            console.log(`Found ${eventItems.length} FBA event items`);

            if (eventItems.length > 0) {
                for (const item of eventItems) {
                    try {
                        const title = await item.locator('.field-EventName, .eventTitle, a').first().innerText().catch(() => '');
                        const startText = await item.locator('.field-StartDate, .eventDate').first().innerText().catch(() => '');
                        const locationText = await item.locator('.field-Location, .eventLocation').first().innerText().catch(() => '');
                        const link = await item.locator('a').first().getAttribute('href').catch(() => '');

                        if (title) {
                            events.push({
                                name: title.trim(),
                                date: startText ? new Date(startText) : new Date(),
                                location: locationText.trim(),
                                url: link ? `https://fba39.wildapricot.org${link}` : this.url
                            });
                        }
                    } catch (e: any) {
                        console.warn('Skipping FBA item:', e.message);
                    }
                }
            } else {
                // Fallback: parse visible text using a more generic body text approach
                const bodyText = await page.locator('body').innerText();
                const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);

                let i = 0;
                while (i < lines.length) {
                    // Pattern: EventName\nStart\nM/D/YYYY\nEnd\nM/D/YYYY\nLocation\nAddress...
                    if (lines[i] === 'Start' && i > 0) {
                        const name = lines[i - 1];
                        const startDateStr = lines[i + 1] || '';
                        const locationIdx = lines.indexOf('Location', i);
                        const location = locationIdx > 0 && locationIdx < i + 10 ? lines[locationIdx + 1] || '' : '';

                        const date = startDateStr.match(/\d{1,2}\/\d{1,2}\/\d{4}/)
                            ? new Date(startDateStr)
                            : new Date();

                        if (name && !name.match(/^(Start|End|Location|Show details)$/) && !name.includes('PAST EVENTS')) {
                            events.push({
                                name: name.replace(/A\u00a0/g, '').trim(),
                                date,
                                location: location.trim(),
                                url: this.url
                            });
                        }
                        i += 6;
                    } else {
                        i++;
                    }
                }
            }

        } catch (error: any) {
            console.error('FBA Scrape Error:', error.message);
        } finally {
            await browser.close();
        }

        return events;
    }
}
