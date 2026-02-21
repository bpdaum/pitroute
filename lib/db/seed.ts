import { prisma } from '../prisma';

const organizations = [
  { name: 'KCBS', url: 'https://www.kcbs.us' },
  { name: 'MBN', url: 'https://memphisbbqnetwork.com' },
  { name: 'IBCA', url: 'https://ibcabbq.org' },
  { name: 'FBA', url: 'https://flbbq.org' },
  { name: 'SCA', url: 'https://steakcookoffs.com' },
];

async function seed() {
  console.log('Seeding Organizations...');
  for (const org of organizations) {
    await prisma.organization.upsert({
      where: { name: org.name },
      update: { url: org.url },
      create: { name: org.name, url: org.url },
    });
  }
  console.log('Seed complete.');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
