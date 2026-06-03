const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ids = [
    '017e0747-dd6c-45db-8e01-10ba8a9fb169', // Demo - ware House
    '4909ed49-2eef-4ffd-bed1-faf2cb88f457'  // 0001 - Vijaykumar C.V
  ];

  for (const id of ids) {
    console.log(`\n=== Checking Organization Row for ID: ${id} ===`);
    const org = await prisma.organization.findFirst({
      where: { OR: [ { id }, { legacyId: id } ] }
    });
    console.log(org);

    console.log(`=== Checking User Row for ID: ${id} ===`);
    const user = await prisma.user.findFirst({
      where: { OR: [ { id }, { email: id } ] }
    });
    console.log(user);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
