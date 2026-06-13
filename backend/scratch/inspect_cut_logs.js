const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.machineCutLog.count();
  console.log('Total machine cut logs:', count);

  const logsWithUser = await prisma.machineCutLog.findMany({
    where: { userId: { not: null } },
    take: 5,
    include: {
      user: true,
      organization: true
    }
  });
  console.log('Sample logs with user:', JSON.stringify(logsWithUser, null, 2));

  const logsWithoutUser = await prisma.machineCutLog.findMany({
    where: { userId: null },
    take: 5
  });
  console.log('Sample logs without user:', JSON.stringify(logsWithoutUser, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
