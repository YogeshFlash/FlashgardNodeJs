const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findUnique({
  where: {email: 'fgadmin@flashsolutions.in'}, 
  include: {role: {include: {permissions: true}}}
}).then(u => { 
  if (u && u.role) {
    console.log(u.role.permissions.map(x => x.name)); 
  } else {
    console.log("No role or user found");
  }
  p.$disconnect(); 
});
