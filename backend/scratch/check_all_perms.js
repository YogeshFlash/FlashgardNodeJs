const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const perms = await prisma.permission.findMany({select: {action: true}});
  console.log('All permissions in DB:', perms.map(p => p.action));
}

check().catch(console.error).finally(()=>prisma.$disconnect());
