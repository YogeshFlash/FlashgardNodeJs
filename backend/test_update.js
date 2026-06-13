const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateType() {
  const data = { type: 'retailer' };
  let { organizationTypeId } = data;
  const { type } = data;

  if (type) {
    const orgType = await prisma.organizationType.findFirst({ 
      where: { name: { equals: type, mode: 'insensitive' } } 
    });
    if (orgType) {
      organizationTypeId = orgType.id;
    }
  }
  
  console.log("Resolved organizationTypeId:", organizationTypeId);
  
  const org = await prisma.organization.update({
    where: { id: '88b346f0-035c-4577-a91d-33740d9dc82a' },
    data: { organizationTypeId }
  });
  
  console.log("Updated Org:", org);
}

updateType().finally(() => prisma.$disconnect());
