const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const s = await prisma.organization.findFirst({where: {name: {contains: 'SAN-TS01'}}});
  console.log('SAN-TS01:', s);
  if(!s) return;
  
  let cur = s.parentId;
  while(cur) {
    const p = await prisma.organization.findUnique({where:{id:cur}});
    console.log('Parent:', p.name, p.id);
    cur = p.parentId;
  }
}

check().catch(console.error).finally(()=>prisma.$disconnect());
