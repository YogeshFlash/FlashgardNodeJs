const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const credits = await prisma.cutCredit.findMany({ 
    where: { planType: 'UNLIMITED' },
    take: 10
  });
  
  console.log('Sample UNLIMITED credits:');
  console.dir(credits, { depth: null });

  const nullValidity = await prisma.cutCredit.count({
    where: { planType: 'UNLIMITED', validityDays: null }
  });
  console.log(`\nTotal UNLIMITED credits with validityDays == null: ${nullValidity}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
