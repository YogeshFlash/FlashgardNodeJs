const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const result = await prisma.$queryRaw`SELECT id, "planType", credits, "validityDays" FROM "CutCredit" WHERE "planType" = 'UNLIMITED' LIMIT 10`;
  console.log(result);
}

run().catch(console.error).finally(() => prisma.$disconnect());
