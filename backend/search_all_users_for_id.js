const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Searching for User ID "1d392eda-d1ba-4407-ab32-584ebb77601f" ---');
  // Since user ID could be generated from legacy ID, let's look up by exact ID
  const uById = await prisma.user.findUnique({
    where: { id: '1d392eda-d1ba-4407-ab32-584ebb77601f' }
  });
  console.log('Lookup by ID result:', uById ? `${uById.email} (${uById.firstName} ${uById.lastName})` : 'NOT FOUND');

  // Let's search the user table for any record that might contain this string as parentUserId
  const uByParent = await prisma.user.findMany({
    where: { parentUserId: '1d392eda-d1ba-4407-ab32-584ebb77601f' }
  });
  console.log(`Found ${uByParent.length} users having this parentUserId.`);

  // Let's search by legacyId of type string? Wait, in user table legacyId is Int. So it can't be a UUID.
  // What about userOrganization? Let's check if there's any userOrganization for this parent ID.
  // Wait, let's search the entire database's User table for any user whose email is bnew or name contains TG.
  const bnewUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'tg', mode: 'insensitive' } },
        { firstName: { contains: 'tg', mode: 'insensitive' } },
        { lastName: { contains: 'tg', mode: 'insensitive' } }
      ]
    }
  });
  console.log(`Found ${bnewUsers.length} users with "tg" in name/email:`);
  bnewUsers.forEach(u => {
    console.log(`- ID: ${u.id} | Email: ${u.email} | Name: ${u.firstName} ${u.lastName} | legacyId: ${u.legacyId}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
