const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.findFirst({
    where: { OR: [{ id: '670c2b85-0bd3-4e7a-9963-109c26c9d2df' }, { legacyId: '670c2b85-0bd3-4e7a-9963-109c26c9d2df' }] }
  });
  console.log('Role found:', role);

  const allRoles = await prisma.role.findMany();
  console.log('All DB Roles:');
  allRoles.forEach(r => console.log(`- ID: ${r.id}, Name: ${r.name}, legacyId: ${r.legacyId}`));
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
