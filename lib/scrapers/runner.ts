import { prisma } from '../prisma';
import { Scraper } from './types';

export class ScraperRunner {
  async runAndPersist(orgName: string, scraper: Scraper) {
    const org = await prisma.organization.findUnique({
      where: { name: orgName }
    });

    if (!org) {
      throw new Error(`Organization ${orgName} not found. Run seed first.`);
    }

    console.log(`Running scraper for ${orgName}...`);
    const events = await scraper.scrape();
    console.log(`Found ${events.length} events for ${orgName}`);

    let created = 0;
    let skipped = 0;

    for (const event of events) {
      try {
        await prisma.event.upsert({
          where: {
            organizationId_name_date: {
              organizationId: org.id,
              name: event.name,
              date: event.date
            }
          },
          update: {
            locationAddress: event.location,
            detailsUrl: event.url,
            purseAmount: event.purse
          },
          create: {
            organizationId: org.id,
            name: event.name,
            date: event.date,
            locationAddress: event.location,
            detailsUrl: event.url,
            purseAmount: event.purse
          }
        });
        created++;
      } catch (e: any) {
        console.warn(`Could not persist event "${event.name}": ${e.message}`);
        skipped++;
      }
    }

    console.log(`Persisted events for ${orgName}: ${created} upserted, ${skipped} failed`);
  }
}
