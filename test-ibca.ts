import { IBCAScraper } from './lib/scrapers/ibca';

async function main() {
    const scraper = new IBCAScraper();
    const events = await scraper.scrape();
    console.log(JSON.stringify(events, null, 2));
    console.log(`Total events: ${events.length}`);
}

main().catch(console.error);
