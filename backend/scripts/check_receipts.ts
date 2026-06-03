import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const receipts = await prisma.inwardReceipt.findMany({
    include: { vendor: true, filmBatches: true }
  });
  console.log('Total Receipts:', receipts.length);
  console.log(JSON.stringify(receipts, null, 2));

  const batches = await prisma.filmBatch.findMany({
    where: { inwardReceiptId: null, batchType: { in: ['RAW_MATERIAL', 'BULK_RECEIVED'] } },
    include: { vendor: true }
  });
  console.log('Orphaned Batches (No Receipt ID):', batches.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
