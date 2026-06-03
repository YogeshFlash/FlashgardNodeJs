import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
console.log('Database Models:');
const keys = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
keys.forEach(k => console.log(`- ${k}`));
process.exit(0);
