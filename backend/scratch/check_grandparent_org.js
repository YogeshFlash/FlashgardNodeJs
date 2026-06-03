const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findUnique({
    where: { id: '7bcb963f-7888-4098-bea5-9f33772f4ee2' }
  });
  console.log('Grandparent Org:', org);
}

main().catch(console.error).finally(() => prisma.$disconnect());
