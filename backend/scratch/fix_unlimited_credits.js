const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const credits = await prisma.cutCredit.findMany({ 
    where: { planType: 'UNLIMITED' }
  });
  
  console.log(`Found ${credits.length} UNLIMITED credits.`);
  
  let updated = 0;
  for (const c of credits) {
    let validityDays = null;
    
    if (c.startDate && c.endDate) {
      const ms = new Date(c.endDate).getTime() - new Date(c.startDate).getTime();
      validityDays = Math.ceil(ms / (1000 * 3600 * 24));
    } else if (c.credits && c.credits > 0 && c.credits < 10000) {
      // Sometimes validity is stored in the credits field
      validityDays = c.credits;
    }
    
    if (validityDays !== null && validityDays > 0) {
      await prisma.cutCredit.update({
        where: { id: c.id },
        data: { validityDays: validityDays, credits: null } // UNLIMITED shouldn't have usage credits
      });
      updated++;
    }
  }
  
  console.log(`Updated ${updated} credits with calculated validityDays.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
