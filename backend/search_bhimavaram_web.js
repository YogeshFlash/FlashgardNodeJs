const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Searching for bhimavaram Users ---');
  const users = await prisma.user.findMany({
    where: {
      email: { contains: 'bhimavaram', mode: 'insensitive' }
    },
    include: {
      organization: true
    }
  });
  console.log(`Found ${users.length} users:`);
  users.forEach(u => {
    console.log(`ID: ${u.id} | Email: ${u.email} | Name: ${u.firstName} ${u.lastName} | legacyId: ${u.legacyId} | parentUserId: ${u.parentUserId} | OrgName: ${u.organization?.name}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
