const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rId = 'df2db336-5731-4567-a89b-4426532cd4d8';
  const r = await prisma.role.findUnique({
    where: { id: rId }
  });
  if (r) {
    console.log(`Role found: Name: ${r.name} | Description: ${r.description}`);
  } else {
    console.log(`Role ${rId} NOT found!`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
