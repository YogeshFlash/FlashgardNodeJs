const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    // Phone category ID from earlier: 973c52d1-df5a-47e7-8aa6-ecb6ac189533
    const categoryId = '973c52d1-df5a-47e7-8aa6-ecb6ac189533';
    const models = await prisma.model.findMany({
        where: { categoryId: categoryId, brand: { name: 'Kindle' } },
        include: { brand: true, category: true }
    });
    console.log(`Found ${models.length} models for Kindle in Phone category.`);
    models.forEach(m => console.log(`- ${m.name}`));
}

check().catch(console.error).finally(() => prisma.$disconnect());
