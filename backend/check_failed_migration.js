const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching last 20 migration logs (excluding large logs field)...');
  const logs = await prisma.migrationLog.findMany({
    select: {
      id: true,
      module: true,
      fileName: true,
      status: true,
      recordsProcessed: true,
      recordsCreated: true,
      recordsUpdated: true,
      recordsFailed: true,
      errorMessage: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  for (const log of logs) {
    console.log(`Log ID: ${log.id} | Module: ${log.module} | File: ${log.fileName} | Status: ${log.status} | Processed: ${log.recordsProcessed} | Created: ${log.recordsCreated} | Failed: ${log.recordsFailed} | Date: ${log.createdAt}`);
    if (log.errorMessage) {
      console.log(`  -> Main Error Message: ${log.errorMessage}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
