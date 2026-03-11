import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.findFirst({
    where: { name: 'internal_sales' },
    include: {
      permissions: {
        include: { permission: true }
      }
    }
  });

  if (role) {
    console.log(`Permissions for ${role.name}:`);
    console.log(role.permissions.map(rp => rp.permission.action));
  } else {
    console.log('Role not found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
