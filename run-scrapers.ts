import { ScraperRunner } from './lib/scrapers/runner';
import { IBCAScraper } from './lib/scrapers/ibca';
import { KCBScraper } from './lib/scrapers/kcbs';
import { FBAScraper } from './lib/scrapers/fba';
import { SCAScraper } from './lib/scrapers/sca';
import { MBNScraper } from './lib/scrapers/mbn';
import { LSBSScraper } from './lib/scrapers/lsbs';
import { OutlawScraper } from './lib/scrapers/outlaw';
import { CTBAScraper } from './lib/scrapers/ctba';
import { CBAScraper } from './lib/scrapers/cba';
import { BCAScraper } from './lib/scrapers/bca';

async function main() {
    const runner = new ScraperRunner();

    try {
        console.log('--- Starting SCA Scraper ---');
        await runner.runAndPersist('FBA', new FBAScraper());
        await runner.runAndPersist('SCA', new SCAScraper());
        await runner.runAndPersist('MBN', new MBNScraper());
        await runner.runAndPersist('LSBS', new LSBSScraper());
        await runner.runAndPersist('Outlaw BBQ', new OutlawScraper());
        await runner.runAndPersist('CTBA', new CTBAScraper());
        await runner.runAndPersist('BCA', new BCAScraper());

        console.log('--- Starting KCBS Scraper ---');
        await runner.runAndPersist('KCBS', new KCBScraper());


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
