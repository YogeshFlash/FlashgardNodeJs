import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      organization: true,
      role: true,
    }
  });

  console.log('--- USER LIST ---');
  users.forEach(u => {
    console.log(`Email: ${u.email}`);
    console.log(`Name: ${u.firstName} ${u.lastName}`);
    console.log(`Active: ${u.isActive}`);
    console.log(`Org: ${u.organization?.name}`);
    console.log(`Role: ${u.role?.name}`);
    console.log(`SuperAdmin: ${u.isSuperAdmin}`);
    console.log('-----------------');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
