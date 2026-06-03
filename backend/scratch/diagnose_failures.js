const fs = require('fs');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const filePath = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/mobile/android/app/libs/DatatoMigrate/ModelMaster.csv';

async function diagnose() {
    const models = await prisma.model.findMany({ select: { legacyId: true } });
    const modelSet = new Set(models.map(m => m.legacyId).filter(id => id !== null));
    
    const skins = await prisma.cutPattern.findMany({ select: { legacyId: true } });
    const skinSet = new Set(skins.map(s => s.legacyId).filter(id => id !== null));
    
    console.log(`Database: ${modelSet.size} Models, ${skinSet.size} Skins`);

    let count = 0;
    let modelNotFound = 0;
    let skinNotFound = 0;

    const stream = fs.createReadStream(filePath)
        .pipe(csv({ headers: false }))
        .on('data', (row) => {
            if (count > 0) { // Skip header
                const modelId = parseInt(row[5]);
                const skinId = parseInt(row[3]);
                
                let ok = true;
                if (!modelSet.has(modelId)) {
                    modelNotFound++;
                    ok = false;
                    if (modelNotFound < 5) console.log(`Model ID ${modelId} not found in DB`);
                }
                if (!skinSet.has(skinId)) {
                    skinNotFound++;
                    ok = false;
                    if (skinNotFound < 5) console.log(`Skin ID ${skinId} not found in DB`);
                }
            }
            count++;
            if (count % 1000 === 0) console.log(`Processed ${count} rows...`);
        })
        .on('end', () => {
            console.log('--- Final Report ---');
            console.log('Total Rows:', count);
            console.log('Model ID Not Found:', modelNotFound);
            console.log('Skin ID Not Found:', skinNotFound);
            process.exit(0);
        });
}

diagnose().catch(console.error);
