const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const action = 'nav:reports';
  const description = 'View Reports tab';

  const existing = await prisma.permission.findUnique({
    where: { action }
  });

  if (existing) {
    console.log('Permission "nav:reports" already exists in the database.');
  } else {
    const created = await prisma.permission.create({
      data: {
        action,
        description
      }
    });
    console.log('Successfully created "nav:reports" permission in the database:', created);
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
