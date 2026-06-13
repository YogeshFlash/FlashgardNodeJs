const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'SAN-TS01' } },
    include: { organizationType: true }
  });
  console.log(org);
}
main().finally(() => prisma.$disconnect());
