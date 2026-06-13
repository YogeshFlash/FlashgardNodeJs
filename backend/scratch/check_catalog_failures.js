const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const logs = await prisma.migrationLog.findMany({ where: { module: 'catalog' }, orderBy: { createdAt: 'desc' }, take: 1 });
  console.log(JSON.stringify(logs[0], null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
