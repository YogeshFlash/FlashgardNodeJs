import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDuplicates() {
  const roles = await prisma.role.findMany({
    where: { isSystemRole: true },
    orderBy: { id: 'asc' }
  });

  const seen = new Set<string>();
  const toDelete: string[] = [];

  for (const role of roles) {
    if (seen.has(role.name)) {
      toDelete.push(role.id);
    } else {
      seen.add(role.name);
    }
  }

  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} duplicate roles: `, toDelete);
    await prisma.role.deleteMany({
      where: { id: { in: toDelete } }
    });
    console.log('✅ Clean up successful');
  } else {
    console.log('No duplicates found!');
  }
}

cleanDuplicates().catch(console.error).finally(() => prisma.$disconnect());
