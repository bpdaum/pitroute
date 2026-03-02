import { chromium } from 'playwright';
import { Scraper, ScrapedEvent } from './types';

export class KCBScraper implements Scraper {
    private url = 'https://mms.kcbs.us/members/evr_search.php?org_id=KCBA';

    async scrape(): Promise<ScrapedEvent[]> {
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        const events: ScrapedEvent[] = [];

        try {
            const now = new Date();
            const datesToScrape = [
                new Date(now.getFullYear(), now.getMonth(), 1),
                new Date(now.getFullYear(), now.getMonth() + 1, 1),
                new Date(now.getFullYear(), now.getMonth() + 2, 1)
            ];

            for (const targetDate of datesToScrape) {
                const mo = targetDate.getMonth() + 1; // 1-12
                const yr = targetDate.getFullYear();

                // KCBS uses `m` and `Y` query params
                const targetUrl = `${this.url}&m=${mo}&Y=${yr}`;
                console.log(`Navigating to KCBS Search Page: ${targetUrl}`);
                await page.goto(targetUrl, { waitUntil: 'networkidle' });

                // Results appear in rows with specific border style as seen in dump
                const eventRows = await page.locator('.row[style*="border: 1px solid #DDD"]').all();
                console.log(`Found ${eventRows.length} KCBS events for ${mo}/${yr}`);

                for (const row of eventRows) {
                    try {
                        const nameElem = row.locator('b').first();
                        const name = await nameElem.innerText().catch(() => '');

                        if (!name || name.toLowerCase().includes('judging') || name.toLowerCase().includes('class')) {
                            continue;
                        }

                        const infoElem = row.locator('i').first();
                        const infoText = await infoElem.innerText().catch(() => '');

                        const dateMatch = infoText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
                        const date = dateMatch ? new Date(dateMatch[1]) : new Date();

                        // Location extraction from col-md-4 text
                        const colElem = row.locator('.col-md-4').first();
                        const colLines = (await colElem.innerText().catch(() => '')).split('\n');
                        const location = colLines.length > 1 ? colLines.slice(1).join(', ').trim() : '';

                        const viewLink = row.locator('a[onclick*="viewEvent"]').first();
                        const onclick = await viewLink.getAttribute('onclick').catch(() => '');
                        const eventIdMatch = onclick?.match(/viewEvent\((\d+)\)/);
                        const eventUrl = eventIdMatch ? `https://mms.kcbs.us/members/evr/reg_event_details.php?org_id=KCBA&evid=${eventIdMatch[1]}` : '';

                        events.push({
                            name: name.trim(),
                            date: date,
                            location: location.replace(/\s+/g, ' ').trim(),
                            url: eventUrl
                        });
                    } catch (e: any) {
                        console.warn('Skipping KCBS row due to error:', e.message);
                    }
                }
            }

        } catch (error: any) {
            console.error('KCBS Scrape Error:', error.message);
        } finally {
            await browser.close();
        }

        return events;
    }
}
