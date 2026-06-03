const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const ENCRYPTION_KEY = 'flashgard-secure-plt-data-key-32';
const IV_LENGTH = 16;

function decrypt(buffer) {
    const iv = buffer.slice(0, IV_LENGTH);
    const ciphertext = buffer.slice(IV_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

async function run() {
    try {
        const model = await prisma.model.findFirst({ where: { name: 'iPhone 16 Pro Max' } });
        const cf = await prisma.modelCutFile.findFirst({ 
            where: { modelId: model.id, cutPattern: { name: 'Back Protector Full' } },
            include: { cutPattern: true }
        });
        const plt = decrypt(cf.encryptedPltData).toString('utf-8');
        const coords = plt.match(/(?:PU|PD)\s*(-?\d+)[,\s](-?\d+)/g) || [];
        let minX = Infinity, maxX = -Infinity;
        coords.forEach(c => {
            const [x, y] = c.match(/-?\d+/g).map(Number);
            if (x < minX) minX = x; if (x > maxX) maxX = x;
        });
        const w = maxX - minX;
        console.log(`iPhone 16 Pro Max Back Protector Full: ${w} units (${(w/40).toFixed(1)}mm)`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
