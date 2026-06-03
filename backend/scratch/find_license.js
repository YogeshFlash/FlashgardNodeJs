const { PrismaClient } = require('@prisma/client');
const { decryptLicenseKey } = require('../dist/utils/encryption');
const prisma = new PrismaClient();

async function main() {
  const licenses = await prisma.orgLicense.findMany({
    include: {
      owner: {
        include: {
          organizationType: true
        }
      }
    }
  });
  console.log(`Loaded ${licenses.length} licenses.`);
  
  for (const lic of licenses) {
    const dec = decryptLicenseKey(lic.key);
    if (dec === 'YSMR94UOVOEZS2CR' || lic.key.includes('YSMR94UOVOEZS2CR')) {
      console.log('FOUND MATCHING LICENSE:');
      console.log('ID:', lic.id);
      console.log('Encrypted Key:', lic.key);
      console.log('Decrypted Key:', dec);
      console.log('Status:', lic.status);
      console.log('OwnerId:', lic.ownerId);
      console.log('Owner Name:', lic.owner?.name);
      console.log('Owner Type:', lic.owner?.organizationType?.name);
      console.log('LegacyId:', lic.legacyId);
    }
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
