const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.organization.findFirst({where: {name: 'Flashgard Pvt Ltd Hyd'}}).then(o => {
  console.log(o.id);
  p.$disconnect();
});
