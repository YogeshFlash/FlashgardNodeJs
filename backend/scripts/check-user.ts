import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'yogesh@flashgard.in' }
  });
  console.log(user);
}

main().catch(console.error).finally(() => prisma.$disconnect());
