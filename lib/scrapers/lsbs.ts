import { chromium } from 'playwright';
import { Scraper, ScrapedEvent } from './types';

export class LSBSScraper implements Scraper {
    private baseUrl = 'https://lonestarbarbecue.com';

    async scrape(): Promise<ScrapedEvent[]> {
        const browser = await chromium.launch({ headless: true });
        const events: ScrapedEvent[] = [];

        try {
            const page = await browser.newPage();
            // Start at the main events page to find the current year's URL
            console.log(`Navigating to LSBS Events Directory: ${this.baseUrl}/events/`);
            await page.goto(`${this.baseUrl}/events/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(3000);

            let currentYearUrl = '';
            const links = await page.locator('a').all();
            const currentYearStr = new Date().getFullYear().toString();

            for (const l of links) {
                const text = await l.innerText().catch(() => '');
                if (text.includes(currentYearStr)) {
                    const href = await l.getAttribute('href').catch(() => '');
                    if (href) {
                        currentYearUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
                        break;
                    }
                }
            }

            if (!currentYearUrl) {
                console.warn(`LSBS: Could not find link for year ${currentYearStr}.`);
                return events;
            }

            console.log(`Navigating to LSBS ${currentYearStr} schedule: ${currentYearUrl}`);
            await page.goto(currentYearUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(4000);

            const bodyText = await page.locator('body').innerText();
            const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);

            const months = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];

            let currentMonth = -1;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Track current month context
                const monthIdx = months.findIndex(m => line.toLowerCase() === m.toLowerCase());
                if (monthIdx !== -1) {
                    currentMonth = monthIdx;
                    continue;
                }

                // Look for date ranges like "17 - 18 Fredericksburg, TX" or "6 - 7 Baton Rouge, LA"
                const dateLocationMatch = line.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+(.+)$/);

                if (dateLocationMatch && currentMonth !== -1) {
                    const startDay = parseInt(dateLocationMatch[1]);
                    const location = dateLocationMatch[3].trim();

                    // The next line usually contains the name
                    let name = lines[i + 1] || '';
                    if (name.includes('*STATE CHAMPIONSHIP*') || name === 'Flyer') {
                        // Sometimes name is bundled or missing, just use location if name looks like metadata
                        name = `${location} BBQ Cookoff`;
                    }

                    // Clean up name by making sure it doesn't grab metadata lines
                    if (name.startsWith('JC -') || name === 'Flyer' || name === 'Results') {
                        name = `${location} BBQ Cookoff`;
                    }

                    try {
                        const date = new Date(parseInt(currentYearStr), currentMonth, startDay);

                        // Avoid grabbing the empty template blocks at the bottom (e.g., "1 - 2 Flyer Results")
                        if (location.length > 2 && location.toLowerCase() !== 'flyer' && location.toLowerCase() !== 'results') {
                            events.push({
                                name,
                                date,
                                location,
                                url: currentYearUrl,
                            });
                        }
                    } catch (e: any) {
                        console.warn(`Error parsing LSBS event date: ${line}`);
                    }
                }
            }

            console.log(`Found ${events.length} total events for LSBS`);

        } catch (error: any) {
            console.error('LSBS Scrape Error:', error.message);
        } finally {
            await browser.close();
        }

        return events;
    }
}
