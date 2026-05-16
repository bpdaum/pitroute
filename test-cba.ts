import { CBAScraper } from './lib/scrapers/cba';

async function main() {
    console.log('Testing CBA Scraper...');
    const scraper = new CBAScraper();
    const events = await scraper.scrape();
    console.log(`\nExtracted ${events.length} events:`);
    console.log(JSON.stringify(events, null, 2));
}

main();
