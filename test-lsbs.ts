import { LSBSScraper } from './lib/scrapers/lsbs';

async function testLSBS() {
    console.log('Testing LSBS Scraper...');
    const scraper = new LSBSScraper();
    const events = await scraper.scrape();

    console.log(`\nExtracted ${events.length} events:`);
    console.log(JSON.stringify(events, null, 2));
}

testLSBS();
