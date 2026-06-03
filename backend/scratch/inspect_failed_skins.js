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

function getBounds(plt) {
    const commands = plt.split(';').map(c => c.trim()).filter(c => c.length > 0);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    commands.forEach(cmdStr => {
        const cmd = cmdStr.substring(0, 2).toUpperCase();
        const params = cmdStr.substring(2).trim().split(/[, ]+/).map(p => parseFloat(p)).filter(p => !isNaN(p));
        
        if ((cmd === 'PA' || cmd === 'PU' || cmd === 'PD') && params.length >= 2) {
            for (let i = 0; i < params.length; i += 2) {
                const x = params[i];
                const y = params[i+1];
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    });
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

async function test() {
    const skinNames = [
        'Back Skin Full Without Logo',
        'Back Protector Full',
        'Split Full Wrap Without Logo',
        'Back Skin CF',
        'Back Skin Full'
    ];

    for (const name of skinNames) {
        const file = await prisma.modelCutFile.findFirst({
            where: { 
                model: { name: 'iPhone 16 Pro Max' },
                cutPattern: { name: name }
            }
        });

        if (file) {
            const plt = decrypt(file.encryptedPltData);
            const bounds = getBounds(plt);
            console.log(`--- Skin: ${name} ---`);
            console.log('Bounds:', bounds);
        }
    }
}

test().catch(console.error).finally(() => prisma.$disconnect());
