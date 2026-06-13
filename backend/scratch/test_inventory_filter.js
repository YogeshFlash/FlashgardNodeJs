const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const orgId = '51af8ff1-fd54-4074-8c9a-ff35cfd82b72'; // Some orgId
  const status = 'AVAILABLE';
  
  const where = {
    OR: [
      { ownerId: orgId },
      {
        transferItems: {
          some: {
            transfer: {
              fromOrgId: orgId
            }
          }
        }
      }
    ]
  };
  
  where.status = status;
  
  console.log("WHERE clause:", JSON.stringify(where, null, 2));
  
  const results = await prisma.orgLicense.findMany({
    where,
    select: { id: true, status: true },
    take: 10
  });
  
  console.log("RESULTS:", results);
}

run().catch(console.error).finally(() => prisma.$disconnect());
