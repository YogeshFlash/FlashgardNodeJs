const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const modelCount = await prisma.model.count({ where: { legacyId: { not: null } } });
    const skinCount = await prisma.cutPattern.count({ where: { legacyId: { not: null } } });
    
    console.log('Models with legacyId:', modelCount);
    console.log('Skins with legacyId:', skinCount);
    
    if (modelCount > 0) {
        const sampleModel = await prisma.model.findFirst({ where: { legacyId: { not: null } } });
        console.log('Sample Model:', sampleModel.name, 'LegacyID:', sampleModel.legacyId);
    }
    
    if (skinCount > 0) {
        const sampleSkin = await prisma.cutPattern.findFirst({ where: { legacyId: { not: null } } });
        console.log('Sample Skin:', sampleSkin.name, 'LegacyID:', sampleSkin.legacyId);
    }
}

check().catch(console.error).finally(() => prisma.$disconnect());
