const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ids = [
    '6902f6d2-e92e-41f6-9c98-32b7a8fcdba9',
    '2a625437-5191-4578-b355-f33dee14e6fb',
    '4146a6fe-12a6-41e3-aa5e-a7e818182ef0'
  ];

  for (const id of ids) {
    const org = await prisma.organization.findFirst({
      where: { OR: [ { id }, { legacyId: id } ] }
    });
    console.log(`ID: ${id}`);
    if (org) {
      console.log(`  Org: ${org.name} (${org.id}) [legacyId: ${org.legacyId}]`);
    } else {
      console.log(`  Org not found.`);
    }

    const user = await prisma.user.findFirst({
      where: { id }
    });
    if (user) {
      console.log(`  User: ${user.email} (${user.id})`);
    } else {
      console.log(`  User not found.`);
    }
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
