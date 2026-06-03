const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function list() {
    const skins = await prisma.cutPattern.findMany({
        select: { name: true, legacyId: true }
    });
    console.log(JSON.stringify(skins, null, 2));
}

list().catch(console.error).finally(() => prisma.$disconnect());
