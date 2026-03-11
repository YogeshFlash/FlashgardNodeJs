import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    where: { isSystemRole: true },
    select: { id: true, name: true, organizationId: true }
  });
  console.log(roles);
}

main().catch(console.error).finally(() => prisma.$disconnect());
