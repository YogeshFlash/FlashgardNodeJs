const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ids = [
    '017e0747-dd6c-45db-8e01-10ba8a9fb169', // Demo - ware House
    '4909ed49-2eef-4ffd-bed1-faf2cb88f457'  // 0001 - Vijaykumar C.V
  ];

  for (const id of ids) {
    console.log(`\n=== Checking User/Org for ID: ${id} ===`);
    const user = await prisma.user.findFirst({
      where: { OR: [ { id }, { email: id } ] },
      include: { organization: true, role: true }
    });
    if (user) {
      console.log(`User: ${user.email} (${user.id})`);
      console.log(`  Role: ${user.role?.name}`);
      console.log(`  OrgName: ${user.organization?.name} (${user.organization?.id}) [legacyId: ${user.organization?.legacyId}]`);
    } else {
      console.log('User not found in DB.');
    }

    const org = await prisma.organization.findFirst({
      where: { OR: [ { id }, { legacyId: id }, { name: { contains: id } } ] }
    });
    if (org) {
      console.log(`Org: ${org.name} (${org.id}) [legacyId: ${org.legacyId}]`);
    } else {
      console.log('Org not found in DB.');
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
