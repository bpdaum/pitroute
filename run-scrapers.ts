import { ScraperRunner } from './lib/scrapers/runner';
import { SCAScraper } from './lib/scrapers/sca';
import { MBNScraper } from './lib/scrapers/mbn';
import { KCBScraper } from './lib/scrapers/kcbs';
import { FBAScraper } from './lib/scrapers/fba';
import { IBCAScraper } from './lib/scrapers/ibca';
import { CBAScraper } from './lib/scrapers/cba';

async function main() {
    const runner = new ScraperRunner();

    try {
        console.log('--- Starting SCA Scraper ---');
        await runner.runAndPersist('SCA', new SCAScraper());

        console.log('--- Starting MBN Scraper ---');
        await runner.runAndPersist('MBN', new MBNScraper());

        console.log('--- Starting KCBS Scraper ---');
        await runner.runAndPersist('KCBS', new KCBScraper());

        console.log('--- Starting FBA Scraper ---');
        await runner.runAndPersist('FBA', new FBAScraper());

        console.log('--- Starting IBCA Scraper ---');
        await runner.runAndPersist('IBCA', new IBCAScraper());

        console.log('--- Starting CBA Scraper ---');
        await runner.runAndPersist('CBA', new CBAScraper());

        console.log('--- All Scraping Complete ---');
    } catch (error) {
        console.error('Fatal Scrape Error:', error);
    }
}

main().catch(console.error);
