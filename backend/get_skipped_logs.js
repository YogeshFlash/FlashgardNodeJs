const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Fetching Users Migration Logs ---');
  const logs = await prisma.migrationLog.findMany({
    where: { module: 'users' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  for (const log of logs) {
    console.log(`Log ID: ${log.id} | Date: ${log.createdAt} | Status: ${log.status} | Processed: ${log.recordsProcessed} | Created: ${log.recordsCreated} | Failed: ${log.recordsFailed}`);
    if (log.logs) {
      const details = typeof log.logs === 'string' ? JSON.parse(log.logs) : log.logs;
      console.log('Details type:', typeof details);
      if (details && typeof details === 'object') {
        console.log('Details keys:', Object.keys(details));
        if (Array.isArray(details.failures)) {
          console.log(`Total failures in details: ${details.failures.length}`);
          if (details.failures.length > 0) {
            console.log('Failure entry keys:', Object.keys(details.failures[0]));
          }
          details.failures.slice(0, 15).forEach((f, idx) => {
            console.log(`[${idx}] Error:`, f.error || f.errorMessage || f.message);
            console.log(`    Row summary:`, JSON.stringify(f.row || f).substring(0, 300));
          });
        } else if (Array.isArray(details.skipped)) {
          console.log(`Total skipped in details: ${details.skipped.length}`);
          details.skipped.slice(0, 15).forEach((s, idx) => {
            console.log(`[${idx}]`, JSON.stringify(s).substring(0, 500));
          });
        } else {
          console.log('Details content:', JSON.stringify(details).substring(0, 1000));
        }
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
