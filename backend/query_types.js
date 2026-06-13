const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const types = await prisma.organizationType.findMany();
  console.log(types);
}
main().finally(() => prisma.$disconnect());
