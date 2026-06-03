const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const m = await prisma.model.count();
  const b = await prisma.brand.count();
  const c = await prisma.modelCategory.count();
  console.log(`Models: ${m}`);
  console.log(`Brands: ${b}`);
  console.log(`Categories: ${c}`);
}

main().finally(() => prisma.$disconnect());
