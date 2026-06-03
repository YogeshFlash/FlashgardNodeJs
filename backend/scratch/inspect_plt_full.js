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
    const name = 'Back Skin Full';
    const file = await prisma.modelCutFile.findFirst({
        where: { 
            model: { name: 'iPhone 16 Pro Max' },
            cutPattern: { name: name }
        }
    });

    if (file) {
        const plt = decrypt(file.encryptedPltData);
        console.log(`--- PLT End for ${name} ---`);
        console.log(plt.substring(plt.length - 1000));
    }
}

test().catch(console.error).finally(() => prisma.$disconnect());
