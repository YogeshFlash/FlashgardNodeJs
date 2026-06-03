const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      organizationId: { not: null },
      legacyId: { not: null }
    },
    include: {
      organization: true
    },
    take: 20
  });

  for (const u of users) {
    console.log(`User Email: ${u.email}`);
    console.log(`  User legacyId (Code): ${u.legacyId}`);
    console.log(`  Org Name: ${u.organization?.name}`);
    console.log(`  Org legacyId (UUID): ${u.organization?.legacyId}`);
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
