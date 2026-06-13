const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { email: 'scratchbling21@gmail.com' }
  });
  console.log(user);
}

checkUser().catch(console.error).finally(()=>prisma.$disconnect());
