const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findUnique({where: {email: 'fgadmin@flashsolutions.in'}}).then(u => {
  console.log(u.organizationId);
  p.$disconnect();
});
