const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wallets = await prisma.entityWallet.findMany();
  let fixed = 0;
  for (const wallet of wallets) {
    if (wallet.orgId && wallet.tenantId !== wallet.orgId) {
      console.log(`Fixing wallet ${wallet.id}: setting tenantId to ${wallet.orgId}`);
      await prisma.entityWallet.update({
        where: { id: wallet.id },
        data: { tenantId: wallet.orgId }
      });
      fixed++;
    }
  }
  console.log(`Fixed ${fixed} wallets.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
