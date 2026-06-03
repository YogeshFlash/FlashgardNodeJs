const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const total = await prisma.model.count();
    const withLegacyId = await prisma.model.count({ where: { legacyId: { not: 0, not: null } } });
    console.log({ totalModels: total, modelsWithLegacyId: withLegacyId });
}

test().catch(console.error).finally(() => prisma.$disconnect());
