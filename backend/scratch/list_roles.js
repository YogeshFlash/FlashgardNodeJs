const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany();
  console.log('Available Roles:');
  roles.forEach(r => {
    console.log(`- ID: ${r.id} | Name: ${r.name} | isSystemRole: ${r.isSystemRole}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
