const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wallets = await prisma.entityWallet.findMany({
    include: { tenant: { select: { id: true, name: true } } }
  });
  console.log('Wallets:');
  wallets.forEach(w => console.log(`${w.id} - Tenant: ${w.tenant?.name} (${w.tenant?.id}) - Balance: ${w.balance}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
