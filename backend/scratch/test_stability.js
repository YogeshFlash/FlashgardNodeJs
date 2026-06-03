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

function normalizeHpgl(rawHpgl) {
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
            const x = parseFloat(coords[i]);
            const y = parseFloat(coords[i+1]);
            if (isNaN(x) || isNaN(y)) continue;
            commands.push({ type, x, y });
            if (x < minX) minX = x; if (y < minY) minY = y;
            if (x > maxX) maxX = x; if (y > maxY) maxY = y;
        }
    }
    if (commands.length === 0) return rawHpgl;
    const offsetX = -minX;
    const offsetY = -minY;
    let normalized = "IN;PA;";
    for (const cmd of commands) {
        normalized += `${cmd.type}${Math.round(cmd.x + offsetX)},${Math.round(cmd.y + offsetY)};`;
    }
    normalized += "PU0,0;!PG;";
    return normalized;
}

function getWidth(plt) {
    const coords = plt.match(/(?:PU|PD)\s*(-?\d+)[,\s](-?\d+)/g) || [];
    let minX = Infinity, maxX = -Infinity;
    coords.forEach(c => {
        const [x, y] = c.match(/-?\d+/g).map(Number);
        if (x < minX) minX = x; if (x > maxX) maxX = x;
    });
    return maxX - minX;
}

async function run() {
    try {
        const model = await prisma.model.findFirst({ where: { name: 'iPhone 16 Pro Max' } });
        const cf = await prisma.modelCutFile.findFirst({ 
            where: { modelId: model.id, cutPattern: { name: 'Back Skin CF' } },
            include: { cutPattern: true }
        });

        const plt1 = decrypt(cf.encryptedPltData).toString('utf-8');
        const w1 = getWidth(plt1);
        console.log(`Original Width: ${w1}`);

        const plt2 = normalizeHpgl(plt1);
        const w2 = getWidth(plt2);
        console.log(`Width after 1st Normalize: ${w2}`);

        const plt3 = normalizeHpgl(plt2);
        const w3 = getWidth(plt3);
        console.log(`Width after 2nd Normalize: ${w3}`);

        if (w1 === w2 && w2 === w3) console.log('✅ SUCCESS: Dimensions are STABLE.');
        else console.log('❌ FAILURE: Dimensions are CHANGING!');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
