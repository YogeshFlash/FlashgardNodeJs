const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const log = await prisma.migrationLog.findFirst({
    where: { module: 'licenses' },
    orderBy: { createdAt: 'desc' }
  });
  if (log) {
    console.log('Log found:', log.id);
    console.log('Keys of log:', Object.keys(log));
    if (log.logs) {
      const details = typeof log.logs === 'string' ? JSON.parse(log.logs) : log.logs;
      console.log('Keys of log.logs:', Object.keys(details));
      console.log('Preview of log.logs:', JSON.stringify(details).slice(0, 1000));
    }
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
