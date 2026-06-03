import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Test: try creating a raw inward batch manually like the service does
  const films = await prisma.filmType.findMany({ take: 1 });
  const orgs = await prisma.organization.findMany({ where: { parentId: null }, take: 2 });
  console.log('Films:', films.map(f => ({ id: f.id, name: f.name })));
  console.log('Root Orgs:', orgs.map(o => ({ id: o.id, name: o.name, parentId: o.parentId })));

  if (orgs.length === 0) {
    console.log('NO ROOT ORG! This is why raw inward fails.');
    return;
  }
  // Check if workOrder table has 'createdBy' column (must be a valid user uuid)
  const users = await prisma.user.findMany({ take: 1 });
  console.log('Users:', users.map(u => ({ id: u.id, email: u.email })));

  // Try creating a batch
  const testOrg = orgs[0];
  const testFilm = films[0];
  if (!testFilm) { console.log('No film types found!'); return; }

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

    // Now test workOrder create
    console.log('\nTesting workOrder create...');
    const wo = await prisma.workOrder.create({
      data: {
        workOrderType: 'SLITTING',
        sourceBatchId: batch.id,
        orgId: testOrg.id,
        status: 'OPEN',
        inputQuantity: 10,
        createdBy: users[0].id,
        notes: 'test',
      },
    });
    console.log('WorkOrder created OK:', wo.id);
    
    // Cleanup
    await prisma.workOrder.delete({ where: { id: wo.id } });
    await prisma.filmBatch.delete({ where: { id: batch.id } });
    console.log('\nAll OK - rolled back test data.');
  } catch (e: any) {
    console.error('ERROR:', e.message);
    console.error('Code:', e.code);
    console.error('Meta:', JSON.stringify(e.meta));
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
