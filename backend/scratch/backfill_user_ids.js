const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting backfill of userId for existing machine_cut_logs...');

  // 1. Build a map of organizationId -> MobileUser.id
  console.log('Building organization to mobile user cache...');
  const orgToMobileUserMap = new Map();
  
  // Fetch users via UserOrganization with role 'MobileUser'
  const uos = await prisma.userOrganization.findMany({
    where: {
      role: {
        name: { equals: 'MobileUser', mode: 'insensitive' }
      }
    },
    select: {
      userId: true,
      organizationId: true
    }
  });
  uos.forEach(uo => orgToMobileUserMap.set(uo.organizationId, uo.userId));

  // Fetch users directly with role 'MobileUser'
  const users = await prisma.user.findMany({
    where: {
      role: {
        name: { equals: 'MobileUser', mode: 'insensitive' }
      },
      organizationId: { not: null }
    },
    select: {
      id: true,
      organizationId: true
    }
  });
  users.forEach(u => orgToMobileUserMap.set(u.organizationId, u.id));

  console.log(`Cached mobile users for ${orgToMobileUserMap.size} organizations.`);

  // 2. Fetch all machine_cut_logs that don't have a userId but do have organizationId
  const logsToUpdate = await prisma.machineCutLog.findMany({
    where: {
      userId: null,
      organizationId: { not: null }
    },
    select: {
      id: true,
      organizationId: true
    }
  });

  console.log(`Found ${logsToUpdate.length} machine cut logs with null userId.`);

  let updatedCount = 0;
  // Update in chunks to prevent connection pool exhaustion
  for (let i = 0; i < logsToUpdate.length; i += 100) {
    const chunk = logsToUpdate.slice(i, i + 100);
    const updates = chunk.map(log => {
      const mobileUserId = orgToMobileUserMap.get(log.organizationId);
      if (mobileUserId) {
        return prisma.machineCutLog.update({
          where: { id: log.id },
          data: { userId: mobileUserId }
        }).then(() => {
          updatedCount++;
        }).catch(err => {
          console.error(`Failed to update log ${log.id}:`, err.message);
        });
      }
      return Promise.resolve();
    });
    await Promise.all(updates);
    console.log(`Processed ${Math.min(i + 100, logsToUpdate.length)}/${logsToUpdate.length} logs...`);
  }

  console.log(`Backfill complete. Successfully updated ${updatedCount} cut logs with mobile user IDs.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
