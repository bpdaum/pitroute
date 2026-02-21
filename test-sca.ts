import { SCAScraper } from './lib/scrapers/sca';

async function run() {
    const scraper = new SCAScraper();
    console.log('Starting SCA Scrape...');
    const events = await scraper.scrape();
    console.log(`Scraped ${events.length} events:`);
    console.log(JSON.stringify(events.slice(0, 5), null, 2));
}

run().catch(console.error);
