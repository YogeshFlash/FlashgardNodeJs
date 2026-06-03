import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({
    where: { email: 'cradmin@flashgard.in' },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  });

  if (!user) {
    console.log('User cradmin@flashgard.in not found');
    return;
  }

  console.log('User:', user.email);
  console.log('Is Super Admin:', user.isSuperAdmin);
  console.log('Role:', user.role?.name);
  console.log('Role ID:', user.role?.id);
  console.log('Permissions:', user.role?.permissions.map(p => p.permission.action));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
