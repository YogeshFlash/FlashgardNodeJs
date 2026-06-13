const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.orgLicense.findMany({where: {batch: {batchCode: 'LB-030626-FLA-335122'}}}).then(l => {
  console.log(l.map(x => x.ownerId));
  p.$disconnect();
});
