const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const hq = await prisma.organization.findFirst({where: {name: {contains: 'Flashgard HQ'}}});
  console.log('HQ:', hq.name, hq.id);
  const fpl = await prisma.organization.findFirst({where: {name: {contains: 'Flashgard Pvt Ltd Hyd'}}});
  console.log('FPL:', fpl.name, fpl.id, 'parent:', fpl.parentId);
}
check().catch(console.error).finally(()=>prisma.$disconnect());
