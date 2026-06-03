const fs = require('fs');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const filePath = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/mobile/android/app/libs/DatatoMigrate/ModelMaster.csv';

async function diagnose() {
    const skins = await prisma.cutPattern.findMany({ select: { name: true, legacyId: true } });
    const skinSet = new Set(skins.map(s => s.legacyId).filter(id => id !== null));
    
    console.log(`Database: ${skinSet.size} Skins`);

    let count = 0;
    const missingSkins = new Map();

    const stream = fs.createReadStream(filePath)
        .pipe(csv({ headers: false }))
        .on('data', (row) => {
            if (count > 0) { 
                const skinId = parseInt(row[3]);
                const skinName = row[2];
                
                if (!skinSet.has(skinId)) {
                    if (!missingSkins.has(skinId)) missingSkins.set(skinId, new Set());
                    missingSkins.get(skinId).add(skinName);
                }
            }
            count++;
        })
        .on('end', () => {
            console.log('--- Missing Skins ---');
            missingSkins.forEach((names, id) => {
                console.log(`ID ${id}: Names [${Array.from(names).join(', ')}]`);
            });
            process.exit(0);
        });
}

diagnose().catch(console.error);
