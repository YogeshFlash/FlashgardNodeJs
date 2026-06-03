
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findUnique({
    where: { id: '7908d2cb-c85a-40ce-8b29-4028daa005fd' },
    include: { organizationType: true }
  });
  console.log(JSON.stringify(org, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
