const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.orgLicenseBatch.findFirst().then(b => { 
  console.log(Object.keys(b)); 
  p.$disconnect(); 
});
