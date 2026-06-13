const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const orgs = await prisma.organization.findMany({
      where: { name: { contains: 'Flash Solutions', mode: 'insensitive' } }
    });

    for (const org of orgs) {
      console.log(`\n=== Org: ${org.name} (${org.id}) ===`);
      const wallet = await prisma.entityWallet.findUnique({
        where: { orgId: org.id }
      });
      if (wallet) {
        console.log('Wallet Details:');
        console.log(`  Balance (Available): ${wallet.balance}`);
        console.log(`  Used Credits:        ${wallet.usedCredits}`);
        console.log(`  Total Credits:       ${wallet.totalCredits}`);
      } else {
        console.log('  No Wallet Found');
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
