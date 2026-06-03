const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const ENCRYPTION_KEY = 'flashgard-secure-plt-data-key-32';
const IV_LENGTH = 16;

function decrypt(buffer) {
    const iv = buffer.slice(0, IV_LENGTH);
    const encryptedData = buffer.slice(IV_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted.toString('utf8');
}

async function test() {
    const files = await prisma.modelCutFile.findMany({
        where: { model: { name: 'iPhone 16 Pro Max' } },
        include: { cutPattern: true }
    });

    for (const file of files) {
        try {
            const plt = decrypt(file.encryptedPltData);
            console.log(`${file.cutPattern.name}: ${plt.length} chars`);
        } catch (e) {
            console.error(`Decryption failed for ${file.id}:`, e.message);
        }
    }
}

test().catch(console.error).finally(() => prisma.$disconnect());
