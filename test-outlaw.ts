import { OutlawScraper } from './lib/scrapers/outlaw';

async function testOutlaw() {
    console.log('Testing Outlaw BBQ Scraper...');
    const scraper = new OutlawScraper();
    const events = await scraper.scrape();

    console.log(`\nExtracted ${events.length} events:`);
    console.log(JSON.stringify(events, null, 2));
}

testOutlaw();
