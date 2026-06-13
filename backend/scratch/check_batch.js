const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBatch() {
  const batchCode = 'LB-030626-FLA-335122';
  
  const batch = await prisma.orgLicenseBatch.findFirst({
    where: { batchCode }
  });
  
  if (!batch) {
    console.log(`Batch ${batchCode} not found.`);
    return;
  }
  
  const licenses = await prisma.orgLicense.findMany({
    where: { batchId: batch.id },
    include: {
      owner: { select: { name: true } }
    }
  });
  
  console.log(`Batch ${batchCode} has ${licenses.length} licenses.`);
  
  const byOwnerAndStatus = {};
  for (const l of licenses) {
    const key = `${l.owner?.name || 'Unknown'} - ${l.status}`;
    if (!byOwnerAndStatus[key]) byOwnerAndStatus[key] = 0;
    byOwnerAndStatus[key]++;
  }
  
  console.log('Breakdown:');
  for (const [key, count] of Object.entries(byOwnerAndStatus)) {
    console.log(` - ${key}: ${count}`);
  }
}

checkBatch().catch(console.error).finally(()=>prisma.$disconnect());
