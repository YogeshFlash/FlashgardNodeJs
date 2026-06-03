const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const ENCRYPTION_KEY = 'flashgard-secure-plt-data-key-32'; 
const IV_LENGTH = 16;

function decrypt(buffer) {
    const iv = buffer.slice(0, IV_LENGTH);
    const ciphertext = buffer.slice(IV_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

async function main() {
    const models = await prisma.model.findMany({
        where: {
            name: { in: ['Liquid S272E4', 'iPhone 16 Pro Max'], mode: 'insensitive' }
        },
        include: { brand: true }
    });

    for (const model of models) {
        console.log(`\n=== Model: ${model.brand.name} ${model.name} ===`);
        const cutFiles = await prisma.modelCutFile.findMany({
            where: { modelId: model.id },
            include: { cutPattern: true }
        });

        for (const file of cutFiles) {
            console.log(`\n--- Pattern: ${file.cutPattern.name} (ID: ${file.id}) ---`);
            const decrypted = decrypt(file.encryptedPltData);
            const plt = decrypted.toString('utf-8');
            
            console.log('Preview (First 150 chars):', plt.substring(0, 150));

            const coordRegex = /(?:PU|PD)\s*(-?\d+)[,\s](-?\d+)/g;
            let match;
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            let count = 0;

            while ((match = coordRegex.exec(plt)) !== null) {
                const x = parseInt(match[1]);
                const y = parseInt(match[2]);
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                count++;
            }

            console.log(`Command count: ${count}`);
            if (count > 0) {
                console.log(`X Range: [${minX}, ${maxX}] (Width: ${maxX - minX})`);
                console.log(`Y Range: [${minY}, ${maxY}] (Height: ${maxY - minY})`);
                if (minX < 0 || minY < 0) {
                    console.log('!!! WARNING: Negative coordinates detected !!!');
                }
            }
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
