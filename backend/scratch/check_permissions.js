const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const perms = await prisma.permission.findMany({
    orderBy: { action: 'asc' }
  });
  console.log(`Found ${perms.length} permissions in DB:`);
  for (const p of perms) {
    console.log(`- Action: ${p.action} | Description: ${p.description}`);
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
