const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const categories = await prisma.modelCategory.findMany({
        where: { parentId: null }
    });
    console.log("Root Categories:");
    for (const cat of categories) {
        const sub = await prisma.modelCategory.count({ where: { parentId: cat.id }});
        console.log(`- ${cat.name} (${cat.id}) - Subs: ${sub}`);
    }
}

check().catch(console.error).finally(() => prisma.$disconnect());
