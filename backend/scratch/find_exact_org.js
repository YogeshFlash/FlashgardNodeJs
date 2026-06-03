const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Let's search by name
  const orgNameQuery = 'Sri sai cellpoint demo user';
  const orgs = await prisma.organization.findMany({
    where: {
      OR: [
        { name: { contains: orgNameQuery, mode: 'insensitive' } },
        { name: { contains: 'Sri sai cellpoint', mode: 'insensitive' } },
        { name: { contains: '0000001', mode: 'insensitive' } },
        { legacyId: '0000001' }
      ]
    }
  });

  console.log(`Matching orgs: ${orgs.length}`);
  for (const o of orgs) {
    console.log(`ID: ${o.id}, Name: ${o.name}, LegacyId: ${o.legacyId}`);
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
