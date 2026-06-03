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
        // 1. Check the ACER reference (never modified, known-good)
        console.log('=== ACER REFERENCE (Known-Good, Never Modified) ===\n');
        const acerModel = await prisma.model.findFirst({ where: { name: { contains: 'Liquid S272E4' } } });
        const acerFiles = await prisma.modelCutFile.findMany({ 
            where: { modelId: acerModel.id },
            include: { cutPattern: true }
        });
        for (const cf of acerFiles) {
            const plt = decrypt(cf.encryptedPltData).toString('utf-8');
            const coords = plt.match(/(?:PU|PD)\s*(-?\d+\.?\d*)[,\s](-?\d+\.?\d*)/g) || [];
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            coords.forEach(c => {
                const nums = c.match(/-?\d+\.?\d*/g).map(Number);
                const x = nums.length >= 3 ? nums[1] : nums[0];
                const y = nums.length >= 3 ? nums[2] : nums[1];
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            });
            console.log(`  ${cf.cutPattern.name}: W=${maxX-minX} (${((maxX-minX)/40).toFixed(1)}mm) H=${maxY-minY} (${((maxY-minY)/40).toFixed(1)}mm) | Origin: (${minX},${minY})`);
            console.log(`    First 80 chars: ${plt.substring(0, 80)}`);
        }

        // 2. Check another phone that was NEVER touched by batch_repair
        console.log('\n=== Samsung Galaxy S24 Ultra (Never Modified) ===\n');
        const samsungModel = await prisma.model.findFirst({ where: { name: { contains: 'Galaxy S24 Ultra' } } });
        if (samsungModel) {
            const samsungFiles = await prisma.modelCutFile.findMany({ 
                where: { modelId: samsungModel.id },
                include: { cutPattern: true },
                take: 3
            });
            for (const cf of samsungFiles) {
                const plt = decrypt(cf.encryptedPltData).toString('utf-8');
                const coords = plt.match(/(?:PU|PD)\s*(-?\d+\.?\d*)[,\s](-?\d+\.?\d*)/g) || [];
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                coords.forEach(c => {
                    const nums = c.match(/-?\d+\.?\d*/g).map(Number);
                    const x = nums.length >= 3 ? nums[1] : nums[0];
                    const y = nums.length >= 3 ? nums[2] : nums[1];
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                });
                console.log(`  ${cf.cutPattern.name}: W=${maxX-minX} (${((maxX-minX)/40).toFixed(1)}mm) H=${maxY-minY} (${((maxY-minY)/40).toFixed(1)}mm) | PLT: ${plt.substring(0,60)}`);
            }
        } else {
            // Try any other phone
            const otherModel = await prisma.model.findFirst({ where: { name: { contains: 'iPhone 15 Pro Max' } } });
            if (otherModel) {
                const otherFiles = await prisma.modelCutFile.findMany({ 
                    where: { modelId: otherModel.id },
                    include: { cutPattern: true },
                    take: 3
                });
                console.log(`Using: ${otherModel.name}\n`);
                for (const cf of otherFiles) {
                    const plt = decrypt(cf.encryptedPltData).toString('utf-8');
                    const coords = plt.match(/(?:PU|PD)\s*(-?\d+\.?\d*)[,\s](-?\d+\.?\d*)/g) || [];
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    coords.forEach(c => {
                        const nums = c.match(/-?\d+\.?\d*/g).map(Number);
                        const x = nums.length >= 3 ? nums[1] : nums[0];
                        const y = nums.length >= 3 ? nums[2] : nums[1];
                        if (x < minX) minX = x; if (x > maxX) maxX = x;
                        if (y < minY) minY = y; if (y > maxY) maxY = y;
                    });
                    console.log(`  ${cf.cutPattern.name}: W=${maxX-minX} (${((maxX-minX)/40).toFixed(1)}mm) H=${maxY-minY} (${((maxY-minY)/40).toFixed(1)}mm) | PLT: ${plt.substring(0,60)}`);
                }
            }
        }

        // 3. Current damaged iPhone 16 Pro Max
        console.log('\n=== iPhone 16 Pro Max (DAMAGED by batch_repair) ===\n');
        const iphoneModel = await prisma.model.findFirst({ where: { name: 'iPhone 16 Pro Max' } });
        const iphoneFiles = await prisma.modelCutFile.findMany({ 
            where: { modelId: iphoneModel.id },
            include: { cutPattern: true }
        });
        for (const cf of iphoneFiles) {
            const plt = decrypt(cf.encryptedPltData).toString('utf-8');
            const coords = plt.match(/(?:PU|PD)\s*(-?\d+\.?\d*)[,\s](-?\d+\.?\d*)/g) || [];
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            coords.forEach(c => {
                const nums = c.match(/-?\d+\.?\d*/g).map(Number);
                const x = nums.length >= 3 ? nums[1] : nums[0];
                const y = nums.length >= 3 ? nums[2] : nums[1];
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            });
            console.log(`  ${cf.cutPattern.name}: W=${maxX-minX} (${((maxX-minX)/40).toFixed(1)}mm) H=${maxY-minY} (${((maxY-minY)/40).toFixed(1)}mm)`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
