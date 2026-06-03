const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const emails = ['giriprakash2728@gmail.com', 'karurparadise99@gmail.com', 'msltraders@rediffmail.com'];
  for (const email of emails) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { organization: true }
    });
    console.log(`Email: ${email}`);
    if (user) {
      console.log(`  Found user: ID=${user.id}, OrgName=${user.organization?.name}, OrgId=${user.organizationId}, legacyId=${user.legacyId}`);
    } else {
      console.log(`  User not found.`);
    }
  }

  const legacyIds = ['2a625437-5191-4578-b355-f33dee14e6fb', '4146a6fe-12a6-41e3-aa5e-a7e818182ef0'];
  for (const lid of legacyIds) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ id: lid }, { legacyId: parseInt(lid) || undefined }] },
      include: { organization: true }
    });
    console.log(`LegacyID/ID: ${lid}`);
    if (user) {
      console.log(`  Found user by ID: ID=${user.id}, email=${user.email}, OrgName=${user.organization?.name}, OrgId=${user.organizationId}, legacyId=${user.legacyId}`);
    } else {
      console.log(`  User not found.`);
    }
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
