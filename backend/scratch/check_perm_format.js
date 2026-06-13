const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.role.findFirst({include:{permissions:true}}).then(r => { 
  console.log(JSON.stringify(r.permissions[0])); 
  p.$disconnect(); 
});
