const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lic = await prisma.orgLicense.findUnique({
    where: { id: '70efdf2e-c9b0-8607-9795-c442636b55fb' },
    include: { batch: true }
  });
  console.log('License 17 by ID:', lic);
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
