const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: '0b76b1d7-e5e5-421a-997b-8dd877bc9258' },
    include: { organization: true }
  });
  console.log('Parent User:', user);
}

main().catch(console.error).finally(() => prisma.$disconnect());
