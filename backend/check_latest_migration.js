const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching last 5 migration logs...');
  const logs = await prisma.migrationLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  for (const log of logs) {
    console.log(`\n========================================`);
    console.log(`ID: ${log.id}`);
    console.log(`Module: ${log.module}`);
    console.log(`File: ${log.fileName}`);
    console.log(`Status: ${log.status}`);
    console.log(`Processed: ${log.recordsProcessed} | Created: ${log.recordsCreated} | Updated: ${log.recordsUpdated} | Failed: ${log.recordsFailed}`);
    console.log(`Error Message: ${log.errorMessage}`);
    console.log(`Created At: ${log.createdAt}`);
    
    if (log.logs) {
      const details = typeof log.logs === 'string' ? JSON.parse(log.logs) : log.logs;
      const failures = details.failures || [];
      if (failures.length > 0) {
        console.log(`Failures (showing first 10):`);
        failures.slice(0, 10).forEach((f, idx) => {
          console.log(`  ${idx + 1}. Error: ${f.error}`);
          console.log(`     Row: ${JSON.stringify(f.row)}`);
        });
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
