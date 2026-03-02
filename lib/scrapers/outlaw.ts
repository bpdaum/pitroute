import { chromium } from 'playwright';
import { Scraper, ScrapedEvent } from './types';

export class OutlawScraper implements Scraper {
    private url = 'https://outlawbbq.org/events/';

    async scrape(): Promise<ScrapedEvent[]> {
        const events: ScrapedEvent[] = [];
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            console.log(`Fetching Outlaw BBQ: ${this.url}`);

            const page = await browser.newPage();
            await page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(4000);

            const html = await page.content();

            // Extract the main event content block
            const eventBlockMatch = html.match(/class="elementor-widget-container"[\s\S]*?(?:January|February|March|April|May|June|July|August|September|October|November|December)[\s\S]*?(?:January|February|March|April|May|June|July|August|September|October|November|December)/i);

            // Just strip HTML tags to get a clean text representation
            const cleanText = html.replace(/<[^>]+>/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);

            const currentYearStr = new Date().getFullYear().toString();
            const monthAbbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            for (let i = 0; i < cleanText.length - 2; i++) {
                const potentialName = cleanText[i];
                const potentialDate = cleanText[i + 1];
                const potentialLoc = cleanText[i + 2];

                // Match date formats like "January 17-18" or "Jan 17 - 18, 2026"
                const dateMatch = potentialDate.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i);

                if (dateMatch && potentialName.length > 5 && potentialLoc.length > 3) {
                    try {
                        const monthStr = dateMatch[1];
                        const day = parseInt(dateMatch[2]);

                        const yearMatch = potentialDate.match(/20\d{2}/);
                        const year = yearMatch ? parseInt(yearMatch[0]) : parseInt(currentYearStr);

                        const monthIdx = monthAbbrs.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());

                        if (monthIdx !== -1) {
                            const date = new Date(year, monthIdx, day);

                            if (!potentialName.toLowerCase().includes('click here') &&
                                !potentialName.toLowerCase().includes('www.') &&
                                !potentialName.toLowerCase().includes('january') && // ensure we didn't offset by 1
                                potentialLoc.includes(',')) {
                                events.push({
                                    name: potentialName.trim(),
                                    date,
                                    location: potentialLoc.replace(/,?\s*(TX|Texas|LA|Louisiana|NM|New Mexico)/i, ', $1').trim(),
                                    url: this.url
                                });
                                i += 2;
                            }
                        }
                    } catch (e) {
                        // silently skip
                    }
                }
            }

            console.log(`Found ${events.length} total events for Outlaw BBQ`);

        } catch (error: any) {
            console.error('Outlaw BBQ Scrape Error:', error.message);
        } finally {
            await browser.close();
        }

        return events;
    }
}
