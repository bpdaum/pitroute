import { FBAScraper } from './lib/scrapers/fba';

async function run() {
    const scraper = new FBAScraper();
    console.log('Starting FBA Scrape...');
    const events = await scraper.scrape();
    console.log(`Scraped ${events.length} events:`);
    console.log(JSON.stringify(events.slice(0, 5), null, 2));
}

run().catch(console.error);
