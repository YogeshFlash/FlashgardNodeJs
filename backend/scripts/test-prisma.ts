import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function test() {
  console.log('\n=== Testing Organization Create ===');
  try {
    const r = await prisma.organization.create({
      data: { name: 'Test Org CLI', type: 'distributor' as any, isActive: true },
    });
    console.log('✅ Created:', r);
    // Cleanup
    await prisma.organization.delete({ where: { id: r.id } });
    console.log('✅ Deleted test org');
  } catch (e: any) {
    console.error('❌ Create failed:', e.message);
    console.error('Code:', e.code);
    console.error('Meta:', e.meta);
  }

  console.log('\n=== Testing Address Create ===');
  try {
    const r = await prisma.address.create({
      data: {
        type: 'office' as any,
        streetLine1: '123 Main St',
        city: 'Chennai',
        state: 'TN',
        postalCode: '600001',
        country: 'India',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
      },
    });
    console.log('✅ Created:', r);
    await prisma.address.delete({ where: { id: r.id } });
    console.log('✅ Deleted test address');
  } catch (e: any) {
    console.error('❌ Address create failed:', e.message);
    console.error('Code:', e.code);
    console.error('Meta:', e.meta);
  }

  await prisma.$disconnect();
}

test().catch(console.error);
