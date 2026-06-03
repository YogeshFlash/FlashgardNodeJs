const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const ms = await prisma.model.findMany({take:5});
    console.log(ms.map(m => m.legacyId));
}

test().catch(console.error).finally(() => prisma.$disconnect());
