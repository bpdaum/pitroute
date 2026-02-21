import { MBNScraper } from './lib/scrapers/mbn';

async function run() {
    const scraper = new MBNScraper();
    console.log('Starting MBN Scrape...');
    const events = await scraper.scrape();
    console.log(`Scraped ${events.length} events:`);
    console.log(JSON.stringify(events.slice(0, 5), null, 2));
}

run().catch(console.error);
