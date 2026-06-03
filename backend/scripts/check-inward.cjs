const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const films = await prisma.filmType.findMany({ take: 1 });
  const orgs = await prisma.organization.findMany({ where: { parentId: null }, take: 2 });
  console.log('Films:', JSON.stringify(films.map(f => ({ id: f.id, name: f.name }))));
  console.log('Root Orgs:', JSON.stringify(orgs.map(o => ({ id: o.id, name: o.name }))));

  const users = await prisma.user.findMany({ take: 1 });
  console.log('Users:', JSON.stringify(users.map(u => ({ id: u.id, email: u.email }))));

  if (!films[0] || !orgs[0] || !users[0]) {
    console.log('Missing required data!');
    return;
  }

  const testOrg = orgs[0];
  const testFilm = films[0];
  const testUser = users[0];

  console.log('\nTesting filmBatch create...');
  try {
    const batch = await prisma.filmBatch.create({
      data: {
        batchCode: `TEST-${Date.now()}`,
        filmTypeId: testFilm.id,
        vendorId: testOrg.id,
        orgId: testOrg.id,
        quantity: 10,
        packSize: '10pcs',
        batchType: 'RAW_MATERIAL',
        status: 'RAW_MATERIAL',
        arrivalDate: new Date(),
      },
    });
    console.log('Batch created OK:', batch.id);

    console.log('\nTesting workOrder create...');
    const wo = await prisma.workOrder.create({
      data: {
        workOrderType: 'SLITTING',
        sourceBatchId: batch.id,
        orgId: testOrg.id,
        status: 'OPEN',
        inputQuantity: 10,
        createdBy: testUser.id,
        notes: 'test',
      },
    });
    console.log('WorkOrder created OK:', wo.id);

    await prisma.workOrder.delete({ where: { id: wo.id } });
    await prisma.filmBatch.delete({ where: { id: batch.id } });
    console.log('\nAll OK - cleaned up test data.');
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error('Code:', e.code);
    console.error('Meta:', JSON.stringify(e.meta));
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
