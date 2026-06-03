const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const filters = [];
    const search = undefined;
    const includeDeleted = false;
    const parentId = 'null';
    
    if (search) filters.push({ name: { contains: search, mode: 'insensitive' } });
    if (!includeDeleted) filters.push({ isDeleted: false });
    if (parentId !== undefined) {
      filters.push({ parentId: parentId === 'null' ? null : parentId });
    }

    const res = await prisma.modelCategory.findMany({
      where: filters.length > 0 ? { AND: filters } : undefined,
    });
    
    console.log(`Found ${res.length} categories.`);
    res.forEach(r => console.log(r.name, r.parentId));
}

check().catch(console.error).finally(() => prisma.$disconnect());
