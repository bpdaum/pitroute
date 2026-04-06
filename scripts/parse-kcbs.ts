import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    let kcbsOrg = await prisma.organization.findFirst({
        where: { name: 'KCBS' }
    });

    if (!kcbsOrg) {
        kcbsOrg = await prisma.organization.create({
            data: { name: 'KCBS', url: 'https://mms.kcbs.us/members/evr_search.php?org_id=KCBA' }
        });
    }

    const text = fs.readFileSync('scripts/kcbs_2026_dump.txt', 'utf8');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const events = [];
    let currentEvent: any = null;

    for (const line of lines) {
        const match = line.match(/^(.*?)(\d{1,2}\/\d{1,2}\/\d{2,4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2,4})(.*)$/);
        if (match) {
            if (currentEvent) {
                events.push(currentEvent);
            }
            const name = match[1].trim();
            const dateStr = match[2];
            const location = match[4].trim();
            currentEvent = {
                organizationId: kcbsOrg.id,
                name: name,
                date: new Date(dateStr),
                locationAddress: location,
            };
        } else if (currentEvent) {
            const purseMatch = line.match(/Prize Money:\s*\$?([\d,]+(?:\.\d{2})?)/);
            if (purseMatch) {
                currentEvent.purseAmount = parseFloat(purseMatch[1].replace(/,/g, ''));
            }
        }
    }
    if (currentEvent) events.push(currentEvent);

    console.log(`Found ${events.length} events to insert/update.`);

    let inserted = 0;
    for (const ev of events) {
        try {
            await prisma.event.upsert({
                where: {
                    organizationId_name_date: {
                        organizationId: ev.organizationId,
                        name: ev.name,
                        date: ev.date
                    }
                },
                create: ev,
                update: {
                    locationAddress: ev.locationAddress,
                    purseAmount: ev.purseAmount
                }
            });
            inserted++;
        } catch (e: any) {
            console.error(`Error upserting event ${ev.name}: ${e.message}`);
        }
    }
    console.log(`Successfully upserted ${inserted} events.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
