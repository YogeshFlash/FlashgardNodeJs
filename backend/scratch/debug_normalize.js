const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');

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
            
            const x = parseInt(coords[i]);
            const y = parseInt(coords[i+1]);
            
            if (isNaN(x) || isNaN(y)) continue;

            commands.push({ type: i === 0 ? type : 'PD', x, y });
            
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
    }
    
    if (commands.length === 0) return rawHpgl;

    const designWidth = maxX - minX;
    const designHeight = maxY - minY;
    const targetWidth = 7200;
    const targetHeight = 11880;
    
    const offsetX = Math.floor((targetWidth - designWidth) / 2) - minX;
    const offsetY = Math.floor((targetHeight - designHeight) / 2) - minY;

    let normalized = 'IN;PA;';
    for (const cmd of commands) {
        normalized += `${cmd.type}${cmd.x + offsetX},${cmd.y + offsetY};`;
    }
    normalized += 'PU0,0;!PG;';
    
    return {
        normalized,
        stats: { minX, minY, maxX, maxY, designWidth, designHeight, offsetX, offsetY, commandCount: commands.length }
    };
}

async function run() {
    const acerModel = await prisma.model.findFirst({ where: { name: { contains: 'Liquid S272E4' } } });
    const acerFile = await prisma.modelCutFile.findFirst({
        where: { modelId: acerModel.id, cutPattern: { name: 'Back Protector Full' } }
    });

    const iphoneModel = await prisma.model.findFirst({ where: { name: 'iPhone 16 Pro Max' } });
    const iphoneFile = await prisma.modelCutFile.findFirst({
        where: { modelId: iphoneModel.id, cutPattern: { name: 'Back Skin Full' } }
    });

    const acerResult = normalizeHpgl(decrypt(acerFile.encryptedPltData).toString('utf-8'));
    console.log('--- ACER TEMPLATE STATS ---');
    console.log('Original Start:', decrypt(acerFile.encryptedPltData).toString('utf-8').substring(0, 100));
    console.log(acerResult.stats);

    const iphoneResult = normalizeHpgl(decrypt(iphoneFile.encryptedPltData).toString('utf-8'));
    console.log('\n--- IPHONE STATS ---');
    console.log('Original Start:', decrypt(iphoneFile.encryptedPltData).toString('utf-8').substring(0, 100));
    console.log(iphoneResult.stats);

    await prisma.$disconnect();
}

run();
