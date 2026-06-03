const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { decryptLicenseKey } = require('../src/utils/encryption');

async function main() {
  const licenseIds = ['32', '50'];
  for (const lid of licenseIds) {
    console.log(`\n=== Checking License ID: ${lid} ===`);
    
    // Find in DB
    const uuid = parseOrCreateUuid(lid);
    const lic = await prisma.orgLicense.findFirst({
      where: { OR: [ { id: uuid }, { legacyId: lid } ] },
      include: { owner: true }
    });
    
    if (lic) {
      const decKey = decryptLicenseKey(lic.key);
      console.log(`License Found: ID=${lic.id}, key=${decKey}, status=${lic.status}`);
      console.log(`Owner: ${lic.owner?.name} (${lic.owner?.id}) [legacyId: ${lic.owner?.legacyId}]`);
    } else {
      console.log('License not found in DB.');
    }
  }
}

function parseOrCreateUuid(val) {
  const crypto = require('crypto');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (val && uuidRegex.test(val)) return val.toLowerCase();
  return crypto.createHash('md5').update(val || crypto.randomUUID()).digest('hex')
    .replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i, '$1-$2-$3-$4-$5');
}

main().catch(console.error).finally(() => prisma.$disconnect());
