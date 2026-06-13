const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const b = await prisma.orgLicenseBatch.findUnique({where: {batchCode: 'LB-030626-FLA-696210'}, include: {licenses: true}});
  const licenseIds = b.licenses.map(l => l.id);
  const transfers = await prisma.licensingTransfer.findMany({
    where: { items: { some: { licenseId: { in: licenseIds } } } },
    include: { items: true, fromOrg: { select: { name: true } }, toOrg: { select: { name: true } } }
  });
  console.log('Transfers found:', transfers.length);
  for (const t of transfers) {
    console.log(`Transfer ${t.id} from ${t.fromOrg.name} to ${t.toOrg.name} - items: ${t.items.length}`);
  }
}
check().catch(console.error).finally(()=>prisma.$disconnect());
