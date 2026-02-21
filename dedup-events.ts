import { prisma } from './lib/prisma';

async function dedup() {
    console.log('Deduplicating events...');

    // Find all duplicates (same org, name, date)
    const events = await prisma.event.findMany({
        orderBy: { createdAt: 'asc' }
    });

    const seen = new Set<string>();
    const toDelete: string[] = [];

    for (const e of events) {
        const key = `${e.organizationId}::${e.name}::${e.date.toISOString()}`;
        if (seen.has(key)) {
            toDelete.push(e.id);
        } else {
            seen.add(key);
        }
    }

    if (toDelete.length > 0) {
        await prisma.event.deleteMany({ where: { id: { in: toDelete } } });
        console.log(`Deleted ${toDelete.length} duplicate events`);
    } else {
        console.log('No duplicates found');
    }

    const total = await prisma.event.count();
    console.log(`Total events remaining: ${total}`);
}

dedup().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
