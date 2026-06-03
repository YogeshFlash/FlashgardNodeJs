const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'film_batches' ORDER BY ordinal_position`)
  .then(r => { console.log('All columns:', r.map(c => c.column_name).join(', ')); process.exit(0); })
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); });
