const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Finding Super Admins ---');
  const superAdmins = await prisma.user.findMany({
    where: { isSuperAdmin: true }
  });
  console.log(`Found ${superAdmins.length} super admin users:`);
  superAdmins.forEach(u => {
    console.log(`ID: ${u.id} | Email: ${u.email} | Name: ${u.firstName} ${u.lastName} | OrgID: ${u.organizationId}`);
  });

  console.log('\n--- Finding Users with "admin" in Email ---');
  const adminUsers = await prisma.user.findMany({
    where: { email: { contains: 'admin', mode: 'insensitive' } }
  });
  console.log(`Found ${adminUsers.length} admin users:`);
  adminUsers.forEach(u => {
    console.log(`ID: ${u.id} | Email: ${u.email} | Name: ${u.firstName} ${u.lastName} | isSuperAdmin: ${u.isSuperAdmin} | OrgID: ${u.organizationId}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
