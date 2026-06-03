const { PrismaClient } = require('@prisma/client');
const { decryptLicenseKey } = require('../dist/utils/encryption');
const prisma = new PrismaClient();

async function main() {
  const targetOrgId = '79f93c61-4934-48fe-a131-4673f7630706';
  const org = await prisma.organization.findUnique({
    where: { id: targetOrgId }
  });
  console.log(`Org: ${org ? org.name : 'Not Found'} (${targetOrgId})`);

  const licenses = await prisma.orgLicense.findMany({
    where: {
      ownerId: targetOrgId
    }
  });

  console.log(`Total licenses assigned to this org: ${licenses.length}`);
  for (const lic of licenses) {
    const dec = decryptLicenseKey(lic.key);
    console.log(`ID: ${lic.id}, Key: ${dec}, Status: ${lic.status}, LegacyId: ${lic.legacyId}`);
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
