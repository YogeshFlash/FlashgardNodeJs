const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logId = '50c357cf-dbef-4cba-aba9-2e2bc209144b';
  const log = await prisma.migrationLog.findUnique({ where: { id: logId } });
  
  if (!log || !log.logs) {
    console.log('Log not found');
    return;
  }

  const details = typeof log.logs === 'string' ? JSON.parse(log.logs) : log.logs;
  
  console.log('Searching for User ID "1d392eda-d1ba-4407-ab32-584ebb77601f" in failures:');
  const failures = details.failures || [];
  const found = failures.filter(f => {
    return f.row && (f.row.Id === '1d392eda-d1ba-4407-ab32-584ebb77601f' || f.row.ParentUserID === '1d392eda-d1ba-4407-ab32-584ebb77601f');
  });

  console.log(`Found ${found.length} related failures:`);
  found.forEach(f => {
    console.log(`Error: ${f.error}`);
    console.log(`Row: ${JSON.stringify(f.row)}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
