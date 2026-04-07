import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Patterns that identify NON-competition events
const NON_COMPETITION_PATTERNS = [
    /certif.*judg/i,          // Certified Barbeque Judging
    /judging class/i,
    /table captain/i,
    /cooking class/i,
    /\bclass\b/i,              // Generic "class"
    /banquet/i,
    /board of directors/i,
    /awards banquet/i,
    /sauce contest/i,
    /\bteam registration\b/i,
    /myron mixon.*cook/i,
    // World Invitational sub-events that aren't standalone competitions
    /world chicken finals/i,
    /world rib finals/i,
    /wells cup/i,
    /cocktail ancillary/i,
    /dessert ancillary/i,
    /master series invitational/i,
    /backyard series invitational/i,
    /kcbs board of directors/i,
    /\bkcbs annual awards\b/i,
    // York County Registration (not a contest)
    /york county bbq festival \(registration\)/i,
];

async function main() {
    const org = await prisma.organization.findFirst({ where: { name: 'KCBS' } });
    if (!org) { console.error('KCBS org not found'); return; }

    const allEvents = await prisma.event.findMany({
        where: { organizationId: org.id },
        orderBy: { date: 'asc' }
    });

    console.log(`Total KCBS events in DB: ${allEvents.length}\n`);

    const toDelete = allEvents.filter(e =>
        NON_COMPETITION_PATTERNS.some(p => p.test(e.name))
    );

    const toKeep = allEvents.filter(e =>
        !NON_COMPETITION_PATTERNS.some(p => p.test(e.name))
    );

    console.log(`=== EVENTS TO DELETE (${toDelete.length}) ===`);
    for (const e of toDelete) {
        console.log(`  [${e.date.toLocaleDateString()}] ${e.name}`);
    }

    console.log(`\n=== EVENTS TO KEEP (${toKeep.length}) ===`);
    for (const e of toKeep) {
        console.log(`  [${e.date.toLocaleDateString()}] ${e.name}`);
    }

    // Dry run - don't delete yet
    console.log('\n--- DRY RUN COMPLETE. Run with --delete to actually remove. ---');

    if (process.argv.includes('--delete')) {
        const ids = toDelete.map(e => e.id);
        await prisma.event.deleteMany({ where: { id: { in: ids } } });
        console.log(`Deleted ${ids.length} non-competition events.`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
