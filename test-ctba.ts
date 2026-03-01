import { CTBAScraper } from './lib/scrapers/ctba';

async function testCTBA() {
    console.log('Testing CTBA Scraper...');
    const scraper = new CTBAScraper();
    const events = await scraper.scrape();

    console.log(`\nExtracted ${events.length} events:`);
    console.log(JSON.stringify(events, null, 2));
}

testCTBA();
