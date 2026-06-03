const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const tablets = await prisma.modelCategory.findFirst({where: {name: 'Tablets'}});
    if (!tablets) return console.log('Tablets category not found');
    
    const phoneId = '973c52d1-df5a-47e7-8aa6-ecb6ac189533';
    
    const kindles = await prisma.model.findMany({
        where: { categoryId: phoneId, brand: { name: 'Kindle' } }
    });
    
    console.log(`Found ${kindles.length} kindles in Phone. Moving to Tablets...`);
    
    await prisma.model.updateMany({
        where: { categoryId: phoneId, brand: { name: 'Kindle' } },
        data: { categoryId: tablets.id }
    });
    console.log('Moved successfully.');
}

fix().catch(console.error).finally(() => prisma.$disconnect());
