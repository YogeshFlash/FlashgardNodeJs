const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const fromOrgId = 'f5d9a6b0-0d83-4cac-9ef3-c3bd24ce7382'; // Flashgard Pvt Ltd Hyd
  const toOrgId = '39b33e4e-da81-41ce-b4e8-b5623e58b53b'; // SAN-TS01 Alwal-1

  const path = [];
  let currentOrgId = toOrgId;
  let safetyCounter = 0;

  while (currentOrgId && safetyCounter < 20) {
    path.unshift(currentOrgId);
    if (currentOrgId === fromOrgId) {
      console.log('Found path:', path);
      return;
    }
    
    // Fetch parent
    const org = await prisma.organization.findUnique({
      where: { id: currentOrgId },
      select: { parentId: true, name: true }
    });
    console.log('Visited:', org.name, org.parentId);
    
    currentOrgId = org?.parentId || null;
    safetyCounter++;
  }
  console.log('Fallback path:', [fromOrgId, toOrgId]);
}
check().catch(console.error).finally(()=>prisma.$disconnect());
