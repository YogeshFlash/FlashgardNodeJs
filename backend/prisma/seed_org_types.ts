import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const types = [
    { name: 'parent', description: 'Parent organization Flashgard' },
    { name: 'distributor', description: 'Product distributor' },
    { name: 'dealer', description: 'Authorized dealer' },
    { name: 'retailer', description: 'Local retailer' },
    { name: 'supplier', description: 'Raw material or component supplier' },
  ];

  console.log('Seeding organization types...');

  for (const type of types) {
    await prisma.organizationType.upsert({
      where: { name: type.name },
      update: {},
      create: type,
    });
  }

  console.log('Organization types seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
