const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching latest migration log...');
  const logs = await prisma.migrationLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  });

  if (logs.length === 0) {
    console.log('No migration logs found.');
    return;
  }

  const log = logs[0];
  console.log(`\n========================================`);
  console.log(`ID: ${log.id}`);
  console.log(`Module: ${log.module}`);
  console.log(`File: ${log.fileName}`);
  console.log(`Status: ${log.status}`);
  console.log(`Processed: ${log.recordsProcessed}`);
  console.log(`Created: ${log.recordsCreated}`);
  console.log(`Updated: ${log.recordsUpdated}`);
  console.log(`Failed: ${log.recordsFailed}`);
  console.log(`Error Message: ${log.errorMessage}`);
  console.log(`Created At: ${log.createdAt}`);
  
  if (log.logs) {
    const details = typeof log.logs === 'string' ? JSON.parse(log.logs) : log.logs;
    const failures = details.failures || [];
    console.log(`Total Failures array size: ${failures.length}`);
    
    // Group and count unique errors
    const errorCounts = {};
    for (const f of failures) {
      const err = f.error || 'Unknown error';
      errorCounts[err] = (errorCounts[err] || 0) + 1;
    }
    
    console.log(`\nUnique Error Types and Counts:`);
    for (const [err, count] of Object.entries(errorCounts)) {
      console.log(`- [${count} occurrences] Error: ${err}`);
      // Find one example row
      const sample = failures.find(f => f.error === err);
      console.log(`  Sample Row keys:`, Object.keys(sample?.row || {}));
      console.log(`  Sample Row Preview:`, JSON.stringify(sample?.row).slice(0, 150));
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
