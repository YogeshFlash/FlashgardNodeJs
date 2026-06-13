const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.permission.findFirst().then(c => { 
  console.log(Object.keys(c)); 
  p.$disconnect(); 
});
