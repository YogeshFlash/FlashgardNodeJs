const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findUnique({
    where: { id: '402eedd3-62c2-4836-808b-e4c968d53d1a' }
  });
  console.log('Parent Org:', org);
}

main().catch(console.error).finally(() => prisma.$disconnect());
