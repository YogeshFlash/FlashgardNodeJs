const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying table schema or checking columns in MachineCutLog...');
  // Let's try to query one row from machineCutLog
  const row = await prisma.machineCutLog.findFirst();
  console.log('First row of machineCutLog:', row);
}

main()
  .catch(e => console.error('Error querying machineCutLog:', e))
  .finally(async () => {
    await prisma.$disconnect();
  });
