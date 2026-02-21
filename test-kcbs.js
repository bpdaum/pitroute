const { KCBSScraper } = require('./lib/scrapers/kcbs');

async function run() {
    const scraper = new KCBSScraper();
    const events = await scraper.scrape();
    console.log(`Scraped ${events.length} events:`);
    console.log(JSON.stringify(events.slice(0, 5), null, 2));
}

run();
