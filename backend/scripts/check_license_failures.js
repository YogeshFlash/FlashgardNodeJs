const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const log = await prisma.migrationLog.findFirst({
    where: { module: 'licenses' },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(JSON.stringify(log, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
