const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      organizationId: '39e30ac4-d612-4edc-a477-aab3f302f14b'
    }
  });
  console.log(`Found ${users.length} users in that org:`);
  for (const u of users) {
    console.log(u);
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
