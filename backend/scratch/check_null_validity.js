const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const nullValidity = await prisma.cutCredit.findMany({
    where: { planType: 'UNLIMITED', validityDays: null }
  });
  console.dir(nullValidity, { depth: null });
}

run().catch(console.error).finally(() => prisma.$disconnect());
