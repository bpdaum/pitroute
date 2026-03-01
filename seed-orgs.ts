import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding new BBQ Organizations...");

    const newOrgs = [
        { name: 'LSBS', url: 'https://lonestarbarbecue.com' },
        { name: 'Outlaw BBQ', url: 'https://outlawbbq.org' },
        { name: 'CTBA', url: 'https://ctbabbq.com' },
        { name: 'BCA', url: 'https://bcabbq.org' }
    ];

    for (const org of newOrgs) {
        await prisma.organization.upsert({
            where: { name: org.name },
            update: {},
            create: org
        });
        console.log(`Upserted: ${org.name}`);
    }

    console.log("Done seeding organizations.");
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
