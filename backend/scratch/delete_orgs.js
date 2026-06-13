const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const orgs = await prisma.organization.findMany({
      where: { name: { in: ['Bling Accessories', 'Flashgard HQ'] } }
    });

    for (const org of orgs) {
      console.log('Deleting dependencies for org:', org.name);
      
      const orgId = org.id;

      await prisma.userOrganization.deleteMany({ where: { organizationId: orgId } });
      await prisma.address.deleteMany({ where: { organizationId: orgId } });
      await prisma.contact.deleteMany({ where: { organizationId: orgId } });
      
      // Wallets and credits
      await prisma.creditTransaction.deleteMany({ where: { tenantId: orgId } }).catch(() => {});
      await prisma.cutCredit.deleteMany({ where: { tenantId: orgId } }).catch(() => {});
      await prisma.entityWallet.deleteMany({ where: { tenantId: orgId } }).catch(() => {});
      await prisma.entityWallet.deleteMany({ where: { orgId } }).catch(() => {});
      
      // Licensing
      await prisma.licensingTransferItem.deleteMany({ where: { toOrgId: orgId } }).catch(() => {});
      await prisma.licensingTransferItem.deleteMany({ where: { fromOrgId: orgId } }).catch(() => {});
      await prisma.licensingTransfer.deleteMany({ where: { toOrgId: orgId } }).catch(() => {});
      await prisma.licensingTransfer.deleteMany({ where: { fromOrgId: orgId } }).catch(() => {});
      await prisma.orgLicense.deleteMany({ where: { targetOrgId: orgId } }).catch(() => {});
      await prisma.orgLicenseBatch.deleteMany({ where: { tenantId: orgId } }).catch(() => {});

      // Hierarchy references
      await prisma.organization.updateMany({ where: { parentId: orgId }, data: { parentId: null } }).catch(() => {});

      // Delete the org itself
      await prisma.organization.delete({ where: { id: orgId } });
      console.log('Deleted org:', org.name);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
