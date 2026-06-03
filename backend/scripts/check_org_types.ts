import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const types = await prisma.organizationType.findMany();
  console.log('\n--- Organization Types in Database ---');
  types.forEach(t => console.log(`- ${t.name} (id=${t.id})`));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
