import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.role.updateMany({
    where: { name: 'Super Admin' },
    data: { name: 'Platform Admin', description: 'Full unrestricted system access across all organizations' }
  });
  console.log('Renamed Super Admin to Platform Admin');

  await prisma.role.updateMany({
    where: { name: 'System Admin' },
    data: { name: 'Catalog Manager', description: 'Manage internal settings, units, and global catalog' }
  });
  console.log('Renamed System Admin to Catalog Manager');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
