const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const targetId = '311dab91-90a2-4ffa-9699-8f6ac0985f03';
  const org = await prisma.organization.findFirst({
    where: { OR: [ { id: targetId }, { legacyId: targetId } ] }
  });
  console.log('Org:', org);
  
  const user = await prisma.user.findFirst({
    where: { id: targetId }
  });
  console.log('User:', user);
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
