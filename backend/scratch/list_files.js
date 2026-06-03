const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

function decrypt(buffer) {
    const iv = buffer.slice(0, IV_LENGTH);
    const ciphertext = buffer.slice(IV_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

const ENCRYPTION_KEY = 'flashgard-secure-plt-data-key-32';
const IV_LENGTH = 16;

async function run() {
    try {
        const model = await prisma.model.findFirst({
            where: { name: 'iPhone 16 Pro Max' }
        });

        if (!model) {
            console.log('Model not found');
            return;
        }

        const cutFiles = await prisma.modelCutFile.findMany({
            where: { modelId: model.id },
            include: { cutPattern: true }
        });

        console.log(`Found ${cutFiles.length} cut files for ${model.name}`);
        for(const cf of cutFiles) {
            const start = decrypt(cf.encryptedPltData).toString('utf-8').substring(0, 20).replace(/\n/g, ' ');
            console.log(`${cf.cutPattern.name.padEnd(30)} | ${start}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
