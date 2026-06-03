/**
 * Re-import iPhone 16 Pro Max PLT data from the original ModelMaster.csv
 * This restores the ORIGINAL data that was corrupted by repeated batch_repair runs.
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const csvParser = require('csv-parser');
const { Transform } = require('stream');

const prisma = new PrismaClient();
const ENCRYPTION_KEY = 'flashgard-secure-plt-data-key-32';
const IV_LENGTH = 16;

function encrypt(data) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
}

function convertHexToString(hexContent, encoding) {
    try {
        const cleaned = hexContent.replace(/[\s\r\n]+/g, '');
        const buf = Buffer.from(cleaned, 'hex');
        return buf.toString(encoding);
    } catch (e) {
        return null;
    }
}

function getDecryptedModel(filecontent) {
    const step1 = convertHexToString(filecontent, 'ascii');
    if (!step1) return null;
    const step2 = convertHexToString(step1, 'utf16le');
    return step2;
}

function getStats(plt) {
    const coords = plt.match(/(?:PU|PD)\s*(-?\d+\.?\d*)[,\s](-?\d+\.?\d*)/g) || [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    coords.forEach(c => {
        const nums = c.match(/-?\d+\.?\d*/g).map(Number);
        const x = nums.length >= 3 ? nums[1] : nums[0];
        const y = nums.length >= 3 ? nums[2] : nums[1];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    });
    return { w: maxX - minX, h: maxY - minY };
}

async function run() {
    try {
        // 1. Get the iPhone 16 Pro Max model ID
        const model = await prisma.model.findFirst({ where: { name: 'iPhone 16 Pro Max' } });
        if (!model) { console.log('Model not found!'); return; }
        console.log(`Found model: ${model.name} (ID: ${model.id}, legacyId: ${model.legacyId})`);

        // 2. Get all cut patterns mapped by name (lowercase)
        const cutPatterns = await prisma.cutPattern.findMany();
        const cutPatternCache = new Map();
        for (const cp of cutPatterns) {
            cutPatternCache.set(cp.name.toLowerCase(), cp.id);
            if (cp.legacyId) cutPatternCache.set(String(cp.legacyId), cp.id);
        }

        // 3. Get existing cut files for this model
        const existingFiles = await prisma.modelCutFile.findMany({
            where: { modelId: model.id },
            include: { cutPattern: true }
        });
        console.log(`Existing cut files: ${existingFiles.length}`);

        // 4. Stream through the CSV to find iPhone 16 Pro Max rows
        const csvPath = 'backend/uploads/DatatoMigrate/ModelMaster.csv';
        
        // Handle UTF-16 encoding
        const encodingTransform = new Transform({
            transform(chunk, encoding, callback) {
                let str = chunk.toString();
                // Remove BOM
                str = str.replace(/^\ufeff/, '').replace(/^\xff\xfe/, '');
                // Remove null bytes from UTF-16
                const sanitized = str.replace(/\0/g, '');
                this.push(sanitized);
                callback();
            }
        });

        const readStream = fs.createReadStream(csvPath);
        const csvStream = readStream.pipe(encodingTransform).pipe(csvParser({ 
            headers: false,
            maxRowBytes: 1024 * 1024 * 1024
        }));

        let found = 0;
        let restored = 0;

        for await (const row of csvStream) {
            // row[4] = CatalogID (legacyCatalogID), should match model.legacyId
            const legacyCatalogID = parseInt((row[4] || '').toString().replace(/['"]/g, '').trim());
            
            if (legacyCatalogID !== model.legacyId) continue;

            found++;
            const patternName = (row[2] || '').trim();
            const instructionHex = row[3];
            const legacyModelSkinId = parseInt(row[5]?.trim()) || 0;

            if (!instructionHex) {
                console.log(`  SKIP ${patternName}: No PLT data`);
                continue;
            }

            // Decrypt the legacy hex data
            const decryptedPlt = getDecryptedModel(instructionHex);
            if (!decryptedPlt) {
                console.log(`  SKIP ${patternName}: Decryption failed`);
                continue;
            }

            // Find the cut pattern
            let cutPatternId = legacyModelSkinId > 0 ? cutPatternCache.get(String(legacyModelSkinId)) : null;
            if (!cutPatternId) {
                cutPatternId = cutPatternCache.get(patternName.toLowerCase());
            }
            if (!cutPatternId) {
                console.log(`  SKIP ${patternName}: Cut pattern not found in DB`);
                continue;
            }

            const stats = getStats(decryptedPlt);
            console.log(`  FOUND ${patternName}: ${stats.w} units (${(stats.w/40).toFixed(1)}mm) x ${stats.h} units (${(stats.h/40).toFixed(1)}mm)`);

            // Encrypt with our key
            const encryptedPlt = encrypt(Buffer.from(decryptedPlt, 'utf-8'));

            // Find existing file and overwrite
            const existing = existingFiles.find(f => f.cutPatternId === cutPatternId);
            if (existing) {
                await prisma.modelCutFile.update({
                    where: { id: existing.id },
                    data: { encryptedPltData: encryptedPlt }
                });
                console.log(`    → RESTORED (updated existing record)`);
                restored++;
            } else {
                await prisma.modelCutFile.create({
                    data: {
                        modelId: model.id,
                        cutPatternId: cutPatternId,
                        encryptedPltData: encryptedPlt
                    }
                });
                console.log(`    → CREATED (new record)`);
                restored++;
            }
        }

        console.log(`\n=== RESTORE COMPLETE ===`);
        console.log(`Found ${found} rows, restored ${restored} files.`);
        
        // Verify
        console.log('\n=== VERIFICATION ===');
        const verifyFiles = await prisma.modelCutFile.findMany({
            where: { modelId: model.id },
            include: { cutPattern: true }
        });
        const { decrypt: dec } = require('./diagnose_helpers') || {};
        for (const cf of verifyFiles) {
            const iv = cf.encryptedPltData.slice(0, IV_LENGTH);
            const ciphertext = cf.encryptedPltData.slice(IV_LENGTH);
            const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
            const plt = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8');
            const s = getStats(plt);
            console.log(`  ${cf.cutPattern.name}: W=${s.w} (${(s.w/40).toFixed(1)}mm) H=${s.h} (${(s.h/40).toFixed(1)}mm)`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
