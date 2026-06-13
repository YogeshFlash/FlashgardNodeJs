const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function reset() {
  const email = 'scratchbling21@gmail.com';
  const plain = 'Flash@2026';
  
  const user = await prisma.user.findFirst({where: {email: {equals: email, mode: 'insensitive'}}});
  if(!user) {
    console.log('User not found:', email);
    return;
  }
  
  await prisma.user.update({
    where: {id: user.id},
    data: {isSuperAdmin: true}
  });
  console.log(`Password for ${email} has been updated.`);
}
reset().catch(console.error).finally(()=>prisma.$disconnect());
