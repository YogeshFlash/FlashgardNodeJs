const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logId = '50c357cf-dbef-4cba-aba9-2e2bc209144b';
  const log = await prisma.migrationLog.findUnique({ where: { id: logId } });
  
  if (!log || !log.logs) {
    console.log('Log or details not found');
    return;
  }

  const details = typeof log.logs === 'string' ? JSON.parse(log.logs) : log.logs;
  if (!details.failures) {
    console.log('No failures list found in log');
    return;
  }

  console.log(`Searching through ${details.failures.length} failures...`);
  const matches = details.failures.filter(f => {
    const rowStr = JSON.stringify(f.row || f);
    return rowStr.includes('1d392eda-d1ba-4407-ab32-584ebb77601f') || rowStr.includes('3386');
  });

  console.log(`Found ${matches.length} matching failures:`);
  matches.forEach((m, idx) => {
    console.log(`[${idx}] Error: ${m.error}`);
    console.log(`    Row: ${JSON.stringify(m.row || m)}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
