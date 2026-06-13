const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const t = await prisma.licensingTransfer.findMany({ where: { status: 'PENDING' }, include: { items: true } });
  for (const transfer of t) {
    if (transfer.items.some(i => i.creditId)) {
      const creditIds = transfer.items.map(i => i.creditId).filter(Boolean);
      await prisma.cutCredit.updateMany({ where: { id: { in: creditIds } }, data: { ownerId: transfer.toOrgId, status: 'AVAILABLE', tenantId: transfer.toOrgId } });
      await prisma.licensingTransfer.update({ where: { id: transfer.id }, data: { status: 'COMPLETED', resolvedAt: new Date() } });
      console.log('Fixed', transfer.id);
    }
  }
  process.exit(0);
}
run();
