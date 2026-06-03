const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    where: {
      name: { contains: 'B New Mobiles', mode: 'insensitive' }
    },
    include: {
      parent: true
    }
  });

  for (const o of orgs) {
    console.log(`\n========================================`);
    console.log(`Org: "${o.name}" (ID: ${o.id})`);
    console.log(`Parent Org ID: ${o.parentId} | Parent Name: ${o.parent?.name || 'NONE'}`);
    
    // Find all users in UserOrganization for this org
    const uos = await prisma.userOrganization.findMany({
      where: { organizationId: o.id },
      include: { user: true, role: true }
    });

    console.log(`Users in this Org (${uos.length}):`);
    for (const uo of uos) {
      console.log(`- User: ${uo.user.email} | Name: ${uo.user.firstName} ${uo.user.lastName} | ID: ${uo.user.id} | legacyId: ${uo.user.legacyId} | parentUserId: ${uo.user.parentUserId} | Role: ${uo.role?.name}`);
    }

    // Let's also check if there are users with organizationId pointing directly to this org
    const directUsers = await prisma.user.findMany({
      where: { organizationId: o.id }
    });
    console.log(`Direct Users with organizationId pointing here (${directUsers.length}):`);
    for (const du of directUsers) {
      console.log(`- Direct User: ${du.email} | ID: ${du.id}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
