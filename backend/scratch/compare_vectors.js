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
        const acerModel = await prisma.model.findFirst({ where: { name: { contains: 'Liquid S272E4' } } });
        const acerFile = await prisma.modelCutFile.findFirst({ where: { modelId: acerModel.id, cutPattern: { name: 'Back Protector Full' } } });

        const iphoneModel = await prisma.model.findFirst({ where: { name: 'iPhone 16 Pro Max' } });
        const iphoneFile = await prisma.modelCutFile.findFirst({ where: { modelId: iphoneModel.id, cutPattern: { name: 'Back Skin CF' } } });

        function analyze(name, plt) {
            const coords = plt.match(/(?:PU|PD)\s*(-?\d+)[,\s](-?\d+)/g) || [];
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            coords.forEach(c => {
                const [x, y] = c.match(/-?\d+/g).map(Number);
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            });
            const w = maxX - minX;
            const h = maxY - minY;
            console.log(`\n=== ${name} ===`);
            console.log(`Commands: ${coords.length}`);
            console.log(`X Range:  [${minX}, ${maxX}] (Width: ${w} units / ${(w/40).toFixed(1)}mm)`);
            console.log(`Y Range:  [${minY}, ${maxY}] (Height: ${h} units / ${(h/40).toFixed(1)}mm)`);
            console.log(`Preview:  ${plt.substring(0, 80)}...`);
        }

        analyze('ACER TEMPLATE (Correct)', decrypt(acerFile.encryptedPltData).toString('utf-8'));
        analyze('IPHONE 16 PRO MAX (Check)', decrypt(iphoneFile.encryptedPltData).toString('utf-8'));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
