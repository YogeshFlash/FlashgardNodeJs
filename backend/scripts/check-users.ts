import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: { email: true, isActive: true, isDeleted: true },
      take: 10
    });
    console.log('Users in DB:', JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Error connecting to DB:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
