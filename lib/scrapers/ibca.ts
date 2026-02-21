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

            // Determine the next 3 months to select
            const now = new Date();
            const monthsToScrape = [
                now.getMonth() + 1, // 1-indexed for the select tag
                (now.getMonth() + 1) % 12 + 1,
                (now.getMonth() + 2) % 12 + 1
            ];

            for (const monthStr of monthsToScrape) {
                try {
                    console.log(`Selecting month: ${monthStr}`);
                    await page.selectOption('#event_month_select', { value: monthStr.toString() });
                    // Provide enough time for the divi-ajax filter to completely destroy and rebuild the DOM
                    await page.waitForTimeout(4000);

                    // Try specific tribe event elements first
                    const tribeEvents = await page.locator('.tribe-events-calendar-list__event, article.tribe_events').all();
                    console.log(`Found ${tribeEvents.length} tribe event elements for month ${monthStr}`);

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
                        const bodyText = await page.locator('body').innerText();
                        const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);

                        const monthAbbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        // If we are selecting a month (like Jan=1) that is less than the current month in Nov/Dec, it's next year
                        let targetYear = now.getFullYear();
                        if (monthStr < now.getMonth() + 1) targetYear++;

                        for (let i = 0; i < lines.length; i++) {
                            const dateMatch = lines[i].match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/);
                            if (dateMatch) {
                                try {
                                    const mStr = dateMatch[1];
                                    const day = parseInt(dateMatch[2]);
                                    const parsedMonth = monthAbbrs.indexOf(mStr);

                                    // Ensure it matches the month we actually selected to avoid picking up random navigation text
                                    if (parsedMonth + 1 !== monthStr) continue;

                                    const date = new Date(targetYear, parsedMonth, day);

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
                                } catch (e: any) { }
                            }
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
}
