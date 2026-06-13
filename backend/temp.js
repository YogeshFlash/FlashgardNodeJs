const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.organizationType.findMany().then(console.log).finally(() => prisma.$disconnect());
