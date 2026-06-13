const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const credits = await prisma.cutCredit.findMany({ 
    where: { planType: 'UNLIMITED', validityDays: null }
  });
  
  let updated = 0;
  for (const c of credits) {
    let validityDays = 365; // Default to 365 if we can't calculate
    
    if (c.startDate && c.endDate) {
      const ms = new Date(c.endDate).getTime() - new Date(c.startDate).getTime();
      const days = Math.ceil(ms / (1000 * 3600 * 24));
      if (days > 0) validityDays = days;
    }
    
    await prisma.cutCredit.update({
      where: { id: c.id },
      data: { validityDays: validityDays, credits: null }
    });
    updated++;
  }
  
  console.log(`Updated ${updated} remaining credits.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
