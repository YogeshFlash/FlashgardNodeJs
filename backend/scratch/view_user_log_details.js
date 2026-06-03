const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const log = await prisma.migrationLog.findUnique({
    where: { id: '0d15621b-53ba-4482-8fda-312170afbd99' }
  });
  console.log(JSON.stringify(log.logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
