const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    where: {
      OR: [
        { name: { contains: 'cellpoint', mode: 'insensitive' } },
        { name: { contains: 'sai', mode: 'insensitive' } },
        { name: { contains: 'demo', mode: 'insensitive' } },
        { legacyId: { contains: '0000001', mode: 'insensitive' } },
        { legacyId: '1' }
      ]
    }
  });
  console.log(`Found ${orgs.length} matching orgs.`);
  for (const org of orgs) {
    console.log(`ID: ${org.id}, Name: ${org.name}, LegacyId: ${org.legacyId}`);
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
