import { chromium } from 'playwright';
import { Scraper, ScrapedEvent } from './types';

export class BCAScraper implements Scraper {
    private url = 'https://bcabbq.org/';

    async scrape(): Promise<ScrapedEvent[]> {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        const events: ScrapedEvent[] = [];

        try {
            console.log(`Navigating to BCA: ${this.url}`);
            await page.goto(this.url, { waitUntil: 'networkidle', timeout: 45000 });
            await page.waitForTimeout(5000);

            // The inspection showed a table-like structure in the text dump. 
            // We'll try to find any table rows on the homepage.
            const rows = await page.evaluate(() => {
                const results: any[] = [];
                const table = document.querySelector('table');
                if (!table) return results;

                const trs = Array.from(table.querySelectorAll('tr')).slice(1); // skip header
                for (const tr of trs) {
                    const tds = tr.querySelectorAll('td');
                    if (tds.length >= 5) {
                        results.push({
                            year: tds[0].innerText.trim(),
                            dates: tds[1].innerText.trim(),
                            city: tds[2].innerText.trim(),
                            state: tds[3].innerText.trim(),
                            name: tds[4].innerText.trim()
                        });
                    }
                }
                return results;
            });

            console.log(`Found ${rows.length} BCA event items in table`);

            for (const row of rows) {
                if (!row.name || !row.dates) continue;

                // Dates format: "03/06-07"
                const dateParts = row.dates.split('/');
                if (dateParts.length === 2) {
                    const month = parseInt(dateParts[0]) - 1;
                    const dayPart = dateParts[1].split('-')[0];
                    const day = parseInt(dayPart);
                    const year = parseInt(row.year);

                    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
                        events.push({
                            name: row.name,
                            date: new Date(year, month, day),
                            location: `${row.city}, ${row.state}`,
                            url: this.url
                        });
                    }
                }
            }

            // Fallback: If no table, try searching the text for patterns (as seen in search results)
            if (events.length === 0) {
                const bodyText = await page.locator('body').innerText();
                const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);

                // Look for "2026 03/06-07 Baton Rouge LA ..."
                for (const line of lines) {
                    const match = line.match(/^(202\d)\s+(\d{2}\/\d{2}-\d{2})\s+([\w\s]+)\s+([A-Z]{2})\s+(.+)$/);
                    if (match) {
                        const [_, year, dates, city, state, name] = match;
                        const dateParts = dates.split('/');
                        const month = parseInt(dateParts[0]) - 1;
                        const day = parseInt(dateParts[1].split('-')[0]);
                        events.push({
                            name: name.trim(),
                            date: new Date(parseInt(year), month, day),
                            location: `${city.trim()}, ${state.trim()}`,
                            url: this.url
                        });
                    }
                }
            }

        } catch (error: any) {
            console.error('BCA Scrape Error:', error.message);
        } finally {
            await browser.close();
        }

        return events;
    }
}
