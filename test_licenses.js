const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const ENCRYPTION_KEY = 'flashgard-secure-plt-data-key-32';
const LICENSE_IV = Buffer.alloc(16, 0);
const PREFIX = 'enc:';

function decryptLicenseKey(val) {
  if (!val) return val;
  if (!val.startsWith(PREFIX)) return val;
  try {
    const encryptedBase64 = val.substring(PREFIX.length);
    const decipher = crypto.createDecipheriv('aes-256-ctr', Buffer.from(ENCRYPTION_KEY), LICENSE_IV);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedBase64, 'base64')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    return val;
  }
}

async function main() {
  try {
    const res = await prisma.orgLicense.findMany({
      where: {},
      include: { 
        batch: true,
        owner: { select: { id: true, name: true, organizationType: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 50,
    });
    console.log('Got', res.length, 'licenses');
    const mapped = res.map(l => ({ ...l, key: decryptLicenseKey(l.key) }));
    console.log('Mapped length:', mapped.length);
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
