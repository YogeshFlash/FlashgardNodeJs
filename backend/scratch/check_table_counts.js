const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = [
    'organization', 'user', 'orgLicense', 'orgLicenseBatch', 'licensingTransfer', 'licensingTransferItem'
  ];
  for (const t of tables) {
    try {
      const count = await prisma[t].count();
      console.log(`Table ${t}: ${count}`);
    } catch (e) {
      console.log(`Table ${t}: Error - ${e.message}`);
    }
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
