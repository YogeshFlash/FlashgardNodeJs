const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.modelCategory.findMany();
  console.log('Categories:', JSON.stringify(categories, null, 2));
  
  const brands = await prisma.brand.findMany({
    include: { _count: { select: { models: true } } }
  });
  console.log('Brands:', JSON.stringify(brands, null, 2));

  const modelCount = await prisma.model.count();
  console.log('Total Models:', modelCount);

  const cutFileCount = await prisma.modelCutFile.count();
  console.log('Total Cut Files:', cutFileCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
