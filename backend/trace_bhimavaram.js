const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Tracing bhimavaram2 ---');
  
  // Find user bhimavaram2
  const u = await prisma.user.findFirst({
    where: { email: 'bhimavaram2@bnewmobiles.com' },
    include: {
      organization: {
        include: {
          parent: true
        }
      }
    }
  });

  if (!u) {
    console.log('User bhimavaram2 not found');
    return;
  }

  console.log(`User ID: ${u.id} | Email: ${u.email} | Org Name: ${u.organization?.name} | Parent Org: ${u.organization?.parent?.name} (${u.organization?.parent?.id})`);

  // Let's check: in migration logs, what did we parse for bhimavaram2?
  // Since we cannot read the CSV, let's query the migrationLog table and parse the successful rows or failures
  const log = await prisma.migrationLog.findFirst({
    where: { module: 'users' },
    orderBy: { createdAt: 'desc' }
  });

  if (log && log.logs) {
    const details = typeof log.logs === 'string' ? JSON.parse(log.logs) : log.logs;
    console.log(`Log ID: ${log.id}`);
    
    // Check if bhimavaram2 failed or was processed. It succeeded, so it's not in failures.
    // Let's see if we can find any other information.
  }
  
  // Let's search the User table for any user whose organization is Bling Accessories (019a39ea-865e-4569-a3e0-34efeb9e43c1)
  const blingUsers = await prisma.userOrganization.findMany({
    where: { organizationId: '019a39ea-865e-4569-a3e0-34efeb9e43c1' },
    include: { user: true }
  });
  console.log(`\nUsers associated with Bling Accessories (${blingUsers.length}):`);
  blingUsers.forEach(bu => {
    console.log(`- User: ${bu.user.email} | Name: ${bu.user.firstName} ${bu.user.lastName} | ID: ${bu.user.id} | legacyId: ${bu.user.legacyId} | parentUserId: ${bu.user.parentUserId}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
