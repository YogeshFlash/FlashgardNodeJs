const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const log = await prisma.migrationLog.findFirst({
    where: { module: 'users' },
    orderBy: { createdAt: 'desc' }
  });
  if (!log) {
    console.log('No logs found');
    return;
  }
  const details = typeof log.logs === 'string' ? JSON.parse(log.logs) : log.logs;
  if (!details || !details.failures) {
    console.log('No failures found in log.logs');
    return;
  }
  console.log(`Total failures: ${details.failures.length}`);
  console.log('First 20 failures:');
  details.failures.slice(0, 20).forEach((f, idx) => {
    console.log(`[${idx}] Error: ${f.error}`);
    console.log(`    Row: ${JSON.stringify(f.row)}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
