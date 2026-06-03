const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const files = await prisma.modelCutFile.findMany({
        where: { model: { name: 'iPhone 16 Pro Max' } },
        select: { id: true, designFilePath: true }
    });

    for (const file of files) {
        console.log('ID:', file.id, 'Path:', file.designFilePath);
    }
}

test().catch(console.error).finally(() => prisma.$disconnect());
