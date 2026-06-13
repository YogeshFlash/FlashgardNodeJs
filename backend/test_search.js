const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const credits = await prisma.cutCredit.findMany({
    where: {
      owner: { name: { contains: 'Sangeetha', mode: 'insensitive' } }
    },
    include: { owner: true }
  });
  console.log('Credits found:', credits.length);
  const owners = await prisma.organization.findMany({
    where: { name: { contains: 'Sangeetha', mode: 'insensitive' } }
  });
  console.log('Orgs found:', owners.map(o => o.name));
  await prisma.$disconnect();
}
run();
