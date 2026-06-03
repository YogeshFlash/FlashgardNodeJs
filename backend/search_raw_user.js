const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Searching for Users by Name/Email containing "B New Mobiles" ---');
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'bnew', mode: 'insensitive' } },
        { firstName: { contains: 'B New Mobiles', mode: 'insensitive' } },
        { lastName: { contains: 'B New Mobiles', mode: 'insensitive' } }
      ]
    },
    include: {
      organization: true
    }
  });

  console.log(`Found ${users.length} users:`);
  for (const u of users) {
    if (u.firstName.includes('TG') || u.lastName.includes('TG') || u.email.includes('tg') || u.firstName.includes('Pvt Ltd')) {
      console.log(`MATCHING USER - ID: ${u.id} | Email: ${u.email} | Name: ${u.firstName} ${u.lastName} | legacyId: ${u.legacyId} | parentUserId: ${u.parentUserId} | OrgName: ${u.organization?.name}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
