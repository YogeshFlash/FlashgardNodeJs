import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as any;

async function main() {
  console.log('Seeding Product Management master data...');

  // 1. Seed Film Types (Hierarchical)
  const filmTypes = [
    'Canvas 3D',
    'Canvas Alpha',
    'Canvas Shield',
    'Canvas Titan',
    'Clear Film',
    'Dry Films',
    'Flashgard Giveaway - Canvas',
    'Matte Film',
    'Shield Clear',
    'Textured Film'
  ];

  for (const name of filmTypes) {
    await prisma.filmType.upsert({
      where: { name_parentId: { name, parentId: null } },
      update: {},
      create: { name }
    });
  }

  // 2. Seed Model Categories (Hierarchical)
  const categories = [
    'Mobile',
    'Laptop',
    'Smart watches',
    'Accessories',
    'Two wheeler display',
    'Car display'
  ];

  for (const name of categories) {
    await prisma.modelCategory.upsert({
      where: { name_parentId: { name, parentId: null } },
      update: {},
      create: { name }
    });
  }

  // 3. Seed Cut Types
  const cutTypes = [
    'Front Protector CF',
    'Front Protector Full',
    'Back Protector CF',
    'Back Protector Full',
    'Back Skin Full',
    'Back Skin CF',
    'Back Skin CF Without Logo',
    'Back Skin Full Without Logo',
    'Split Full Wrap'
  ];

  for (const name of cutTypes) {
    await prisma.cutType.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
