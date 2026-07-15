const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cat = await prisma.modelCategory.findFirst({
    where: {
      name: 'logo'
    }
  });

  if (!cat) {
    console.log('Category not found');
    return;
  }

  const models = await prisma.model.findMany({
    where: { categoryId: cat.id },
    select: {
      id: true,
      name: true,
      cutFiles: {
        select: {
          id: true,
          designFilePath: true,
        }
      }
    }
  });

  console.log(`Found ${models.length} models under category "logo":`);
  for (const m of models) {
    console.log(`Model: "${m.name}", Cut Files: ${m.cutFiles.length}`);
  }
}

main().finally(() => prisma.$disconnect());
