import { KCBScraper } from './lib/scrapers/kcbs';

async function run() {
    const scraper = new KCBScraper();
    console.log('Starting KCBS Scrape...');
    const events = await scraper.scrape();
    console.log(`Scraped ${events.length} events:`);
    console.log(JSON.stringify(events.slice(0, 5), null, 2));
}

run().catch(console.error);
