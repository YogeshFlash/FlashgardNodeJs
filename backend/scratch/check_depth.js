const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const mainModel = await prisma.modelCategory.findUnique({ where: { id: 'eed4b576-9c9b-4411-9d69-9b0a77d5d5d1' }});
    const subcats = await prisma.modelCategory.findMany({ where: { parentId: mainModel.id }});
    console.log(`Main Model: ${mainModel.name}`);
    for (const sub of subcats) {
        const subsub = await prisma.modelCategory.count({ where: { parentId: sub.id }});
        console.log(`  - ${sub.name} (${sub.id}) - Subs: ${subsub}`);
    }
}

check().catch(console.error).finally(() => prisma.$disconnect());
