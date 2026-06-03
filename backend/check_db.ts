import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.count();
    const orgs = await prisma.organization.count();
    const categories = await prisma.modelCategory.count();
    const brands = await prisma.brand.count();
    const models = await prisma.model.count();
    const cutFiles = await prisma.modelCutFile.count();

    console.log(JSON.stringify({
      users,
      orgs,
      categories,
      brands,
      models,
      cutFiles
    }, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
