const { PrismaClient, TransferStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const batchCode = 'LB-030626-FLA-696210';
  const batch = await prisma.orgLicenseBatch.findUnique({where: {batchCode}, include: {licenses: true}});
  if(!batch) {
    console.log('Batch not found');
    return;
  }

  const hqId = '7b9fd999-ae20-4255-a621-d4b093249000'; // Flashgard HQ
  const fplId = 'f5d9a6b0-0d83-4cac-9ef3-c3bd24ce7382'; // Flashgard Pvt Ltd Hyd
  const masterId = '2ac6f9d4-a7f0-4da7-8d47-b079acb9d9b6'; // 00001 Sangeetha
  const subId = 'ac3f28cc-5a82-4c95-bf3a-4268e43bee88'; // 1 Sangeetha
  const targetId = '39b33e4e-da81-41ce-b4e8-b5623e58b53b'; // SAN-TS01

  const path = [hqId, fplId, masterId, subId, targetId];
  const licenseIds = batch.licenses.map(l => l.id);

  await prisma.$transaction(async (tx) => {
    // 1. Delete existing transfers for these licenses
    await tx.licensingTransferItem.deleteMany({
      where: { licenseId: { in: licenseIds } }
    });
    // This will leave the empty Transfer records, but let's delete them too
    await tx.licensingTransfer.deleteMany({
      where: { items: { none: {} } }
    });

    // 2. Create the correct sequential transfers
    for(let i = 0; i < path.length - 1; i++) {
      await tx.licensingTransfer.create({
        data: {
          fromOrgId: path[i],
          toOrgId: path[i+1],
          status: TransferStatus.COMPLETED,
          resolvedAt: new Date(),
          tenantId: targetId,
          items: {
            create: licenseIds.map(id => ({ licenseId: id }))
          }
        }
      });
    }
  });

  console.log('Successfully rewrote ledger for batch', batchCode);
}
fix().catch(console.error).finally(()=>prisma.$disconnect());
