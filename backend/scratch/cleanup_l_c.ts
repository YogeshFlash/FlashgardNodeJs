import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up licensing and credit data...');
  
  // The order matters due to foreign keys if not using CASCADE
  // But TRUNCATE ... CASCADE is easiest
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "org_license_batches", "org_licenses", "cut_credit_batches", "cut_credits", "licensing_transfers", "licensing_transfer_items", "security_alerts", "entity_wallets", "credit_transactions" CASCADE;`);
  
  console.log('Successfully deleted all license and credit records.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
