import { prisma } from './lib/prisma';

async function verify() {
    const orgs = await prisma.organization.findMany({
        include: {
            _count: { select: { events: true } }
        }
    });

    console.log('\n=== Event Counts per Organization ===\n');
    for (const org of orgs) {
        console.log(`${org.name}: ${org._count.events} events`);
    }

    const total = orgs.reduce((sum, o) => sum + o._count.events, 0);
    console.log(`\nTotal events in DB: ${total}`);

    const sample = await prisma.event.findMany({
        take: 5,
        orderBy: { date: 'asc' },
        include: { organization: true }
    });

    console.log('\n=== Sample Upcoming Events ===\n');
    for (const e of sample) {
        console.log(`[${e.organization.name}] ${e.name} | ${e.date.toDateString()} | ${e.locationAddress}`);
    }
}

verify().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
