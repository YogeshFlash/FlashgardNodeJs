const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.licensingTransfer.findMany({
  where: {items: {some: {license: {batch: {batchCode: 'LB-030626-FLA-335122'}}}}}, 
  include: {fromOrg: {select: {name:true}}, toOrg: {select: {name:true}}, items: {include: {license: {select: {key:true}}}}}
}).then(t => {
  console.log(JSON.stringify(t, null, 2));
  p.$disconnect();
});
