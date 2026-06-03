const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const c = await prisma.cutPattern.findMany({ select: { name: true } });
    console.log('Skins in DB:', c.map(s => s.name));
}

test().catch(console.error).finally(() => prisma.$disconnect());
