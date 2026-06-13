const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const transfers = await prisma.licensingTransfer.findMany({ where: { status: 'PENDING' }, include: { items: true } });
  console.log('Pending:', transfers.length);
  for (const t of transfers) {
    if (t.items.some(i => i.creditId)) {
      const creditIds = t.items.map(i => i.creditId).filter(Boolean);
      await prisma.cutCredit.updateMany({ where: { id: { in: creditIds } }, data: { ownerId: t.toOrgId, status: 'AVAILABLE', tenantId: t.toOrgId } });
      await prisma.licensingTransfer.update({ where: { id: t.id }, data: { status: 'COMPLETED', resolvedAt: new Date() } });
      console.log('Resolved', t.id);
    }
  }
  process.exit(0);
}
run();
