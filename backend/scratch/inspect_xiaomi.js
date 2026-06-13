const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.modelCategory.findMany({
    include: {
      parent: true
    }
  });
  console.log(categories.map(c => ({
    id: c.id,
    name: c.name,
    legacyId: c.legacyId,
    parentName: c.parent?.name
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
