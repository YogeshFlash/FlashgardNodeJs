const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const phoneId = '973c52d1-df5a-47e7-8aa6-ecb6ac189533';
    
    const models = await prisma.model.findMany({
        where: { categoryId: phoneId },
        include: { brand: true }
    });
    
    const brands = new Set(models.map(m => m.brand ? m.brand.name : 'NO_BRAND'));
    console.log(`Brands in Phone category:`);
    console.log([...brands].join(', '));
}

check().catch(console.error).finally(() => prisma.$disconnect());
