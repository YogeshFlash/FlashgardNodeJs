const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get 5 licenses
  const licenses = await prisma.orgLicense.findMany({
    take: 5,
    include: {
      owner: {
        include: {
          users: true,
          userOrganizations: {
            include: {
              user: true,
              role: true
            }
          }
        }
      }
    }
  });

  console.log(`Checking ${licenses.length} licenses:`);
  for (const lic of licenses) {
    console.log(`\nLicense: ${lic.key} | Owner Org: ${lic.owner.name} (ID: ${lic.ownerId})`);
    console.log(`  Users directly under Org (${lic.owner.users.length}):`);
    for (const u of lic.owner.users) {
      console.log(`    - ID: ${u.id} | Email: ${u.email} | Name: ${u.firstName} ${u.lastName} | RoleId: ${u.roleId}`);
    }
    console.log(`  Users via UserOrganization (${lic.owner.userOrganizations.length}):`);
    for (const uo of lic.owner.userOrganizations) {
      console.log(`    - ID: ${uo.user.id} | Email: ${uo.user.email} | Role: ${uo.role.name}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
