const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const ENCRYPTION_KEY = 'flashgard-secure-plt-data-key-32';
const IV_LENGTH = 16;

function encrypt(data) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
}

function decrypt(buffer) {
    const iv = buffer.slice(0, IV_LENGTH);
    const ciphertext = buffer.slice(IV_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function normalizeHpgl(rawHpgl, scale = 1.0) {
    const commands = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const rawCmds = rawHpgl.split(';');

    for (let rawCmd of rawCmds) {
        rawCmd = rawCmd.trim();
        if (rawCmd.length < 2) continue;

        const type = rawCmd.substring(0, 2).toUpperCase();
        if (type !== 'PU' && type !== 'PD') continue;

        const coords = rawCmd.substring(2).split(/[,\s]+/).filter(s => s.length > 0);
        
        for (let i = 0; i < coords.length; i += 2) {
            if (i + 1 >= coords.length) break;
            
            // Apply scaling and parse
            const x = parseFloat(coords[i]) * scale;
            const y = parseFloat(coords[i+1]) * scale;
            
            if (isNaN(x) || isNaN(y)) continue;

            commands.push({ type, x, y });
            
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
    }
    
    if (commands.length === 0) return rawHpgl;

    // Move to 0,0
    const offsetX = -minX;
    const offsetY = -minY;

    let normalized = 'IN;PA;';
    for (const cmd of commands) {
        normalized += `${cmd.type}${Math.round(cmd.x + offsetX)},${Math.round(cmd.y + offsetY)};`;
    }
    normalized += 'PU0,0;!PG;';
    
    return normalized;
}

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

        console.log(`Repairing ${cutFiles.length} files for ${model.name}...`);
        for(const cf of cutFiles) {
            const original = decrypt(cf.encryptedPltData).toString('utf-8');
            const fixed = normalizeHpgl(original, 0.5);
            const encrypted = encrypt(Buffer.from(fixed, 'utf-8'));
            
            await prisma.modelCutFile.update({
                where: { id: cf.id },
                data: { encryptedPltData: encrypted }
            });
            console.log(`Repaired: ${cf.cutPattern.name}`);
        }
        console.log('Batch repair complete.');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
