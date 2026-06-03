const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const newPassword = 'Password123!';
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  await prisma.user.update({
    where: { email: 'fgadmin@flashsolutions.in' },
    data: { passwordHash: hashedPassword }
  });
  
  console.log(`Password for fgadmin@flashsolutions.in reset to: ${newPassword}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
