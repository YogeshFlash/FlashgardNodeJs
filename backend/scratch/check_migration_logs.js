const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.migrationLog.findMany({
    where: { module: 'licenses' },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Found ${logs.length} migration logs for licenses.`);
  for (const log of logs) {
    console.log(`ID: ${log.id}`);
    console.log(`Status: ${log.status}`);
    console.log(`Processed: ${log.recordsProcessed}, Created: ${log.recordsCreated}, Updated: ${log.recordsUpdated}, Failed: ${log.recordsFailed}`);
    console.log(`Created At: ${log.createdAt}`);
    if (log.details) {
      const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
      console.log(`Failures count: ${details.failures ? details.failures.length : 0}`);
      if (details.failures && details.failures.length > 0) {
        console.log(`First failure:`, JSON.stringify(details.failures[0]));
      }
    }
    console.log('------------------------------------');
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
