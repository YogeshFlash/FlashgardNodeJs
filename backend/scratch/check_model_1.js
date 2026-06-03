const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const m = await prisma.model.findFirst({ where: { legacyId: 1 }});
    console.log("Model 1:", m);
}

test().catch(console.error).finally(() => prisma.$disconnect());
