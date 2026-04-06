import { chromium } from 'playwright';
import { Scraper, ScrapedEvent } from './types';

export class OutlawScraper implements Scraper {
    private baseUrl = 'https://outlawbbq.org';

    async scrape(): Promise<ScrapedEvent[]> {
        const events: ScrapedEvent[] = [];
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            const currentYearStr = new Date().getFullYear().toString();
            // Outlaw BBQ uses paths like /april-2026-events/
            const monthsFull = [
                'january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december'
            ];
            const monthAbbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            for (const monthName of monthsFull) {
                const targetUrl = `${this.baseUrl}/${monthName}-${currentYearStr}-events/`;
                console.log(`Fetching Outlaw BBQ: ${targetUrl}`);

                const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
                
                // If the page doesn't exist (404), skip to the next month
                if (!response || !response.ok()) {
                    continue;
                }

                await page.waitForTimeout(3000);
                const html = await page.content();
                const cleanText = html.replace(/<[^>]+>/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);

                for (let i = 0; i < cleanText.length - 2; i++) {
                    const line = cleanText[i];
                    
                    // Match starting date like "April 24 & 25, 2026"
                    const dateMatch = line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i);
                    
                    if (dateMatch) {
                        const monthStr = dateMatch[1];
                        const day = parseInt(dateMatch[2]);
                        const monthIdx = monthAbbrs.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
                        
                        let loc = cleanText[i + 1] || '';
                        let name = cleanText[i + 2] || '';
                        
                        // "STATE CHAMPIONSHIP" is often injected between location and name
                        if (name.toUpperCase().includes('CHAMPIONSHIP')) {
                            name = cleanText[i + 3] || name;
                        }

                        // Avoid matching the sidebar navigation links like "April 2024 Events"
                        if (loc.toLowerCase().includes('events') || name.toLowerCase().includes('events')) {
                            continue;
                        }

                        // Avoid picking up stray metadata lines
                        if (name.includes('admin') || loc.includes('admin')) {
                            continue;
                        }

                        if (monthIdx !== -1 && loc.length > 3) {
                            try {
                                const yearMatch = line.match(/20\d{2}/);
                                const year = yearMatch ? parseInt(yearMatch[0]) : parseInt(currentYearStr);
                                const date = new Date(year, monthIdx, day);

                                events.push({
                                    name: name.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim(),
                                    date,
                                    location: loc.replace(/,?\s*(TX|Texas|LA|Louisiana|NM|New Mexico)/i, ', $1').trim(),
                                    url: targetUrl
                                });
                                // skip ahead to avoid double counting if a day is weirdly formatted
                                i += 2;
                            } catch (e) {
                                // silent skip
                            }
                        }
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
