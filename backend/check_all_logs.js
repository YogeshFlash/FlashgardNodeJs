const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all migration logs...');
  const logs = await prisma.migrationLog.findMany({
    orderBy: { createdAt: 'desc' }
  });

  for (const log of logs) {
    console.log(`Log ID: ${log.id} | Module: ${log.module} | File: ${log.fileName} | Status: ${log.status} | Processed: ${log.recordsProcessed} | Created: ${log.recordsCreated} | Failed: ${log.recordsFailed} | Date: ${log.createdAt}`);
    if (log.errorMessage) {
      console.log(`  -> Error: ${log.errorMessage}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
