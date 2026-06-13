const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sampleLegacyId = '311dab91-90a2-4ffa-9699-8f6ac0985f02';
  
  const org = await prisma.organization.findFirst({
    where: { legacyId: { equals: sampleLegacyId, mode: 'insensitive' } }
  });
  console.log('Org with legacyId:', org ? { id: org.id, name: org.name, legacyId: org.legacyId } : 'Not found');

  const user = await prisma.user.findFirst({
    where: { legacyId: { equals: sampleLegacyId, mode: 'insensitive' } }
  });
  console.log('User with legacyId:', user ? { id: user.id, email: user.email, firstName: user.firstName, legacyId: user.legacyId } : 'Not found');
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
