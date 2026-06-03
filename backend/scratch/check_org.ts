import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findUnique({
    where: { id: '8db45a38-27b4-4bfe-a37d-40c5044f213e' }
  });
  console.log('Org:', JSON.stringify(org, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
