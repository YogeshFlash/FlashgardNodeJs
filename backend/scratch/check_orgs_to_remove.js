const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const orgs = await prisma.organization.findMany({
    where: { OR: [ { name: { contains: 'Bling' } }, { name: { contains: 'Flashgard' } } ] }
  });
  console.log(orgs);
  await prisma.$disconnect();
}
run();
