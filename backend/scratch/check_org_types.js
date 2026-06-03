const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.organizationType.findMany();
  console.log('Organization Types:');
  types.forEach(t => console.log(`- ID: ${t.id}, Name: ${t.name}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
