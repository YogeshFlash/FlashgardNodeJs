const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function check() {
  const email = 'suresh@minte.co.in';
  const u = await prisma.user.findUnique({where: {email}});
  console.log(u ? 'User exists' : 'User not found');
  if (u) {
    const h = await bcrypt.hash('Password123!', 10);
    await prisma.user.update({where: {id: u.id}, data: {passwordHash: h}});
    console.log('Password reset to: Password123!');
  }
}
check().catch(console.error).finally(() => prisma.$disconnect());
