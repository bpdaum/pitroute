import { IBCAScraper } from './lib/scrapers/ibca';

async function run() {
    const scraper = new IBCAScraper();
    console.log('Starting IBCA Scrape...');
    const events = await scraper.scrape();
    console.log(`Scraped ${events.length} events:`);
    console.log(JSON.stringify(events.slice(0, 5), null, 2));
}

run().catch(console.error);
