import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking OrgLicense and OrgLicenseBatch...');
  const batches = await prisma.orgLicenseBatch.findMany({
    include: { _count: { select: { licenses: true } } }
  });
  console.log('Batches:', JSON.stringify(batches, null, 2));

  const licenses = await prisma.orgLicense.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Recent Lics:', JSON.stringify(licenses, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
