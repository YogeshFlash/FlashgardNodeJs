const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Running high-speed raw SQL updates to backfill machine_cut_logs.user_id...');

  // 1. Update via direct User organization relationship
  console.log('Running UPDATE 1 (direct user-org map)...');
  const count1 = await prisma.$executeRawUnsafe(`
    UPDATE machine_cut_logs mcl
    SET user_id = u.id
    FROM users u
    WHERE mcl.user_id IS NULL 
      AND mcl.organization_id = u.organization_id
      AND u.role_id = '124f79af-1c1d-4ec2-a854-2f95ff0a2895'
  `);
  console.log(`UPDATE 1 complete. Updated ${count1} rows.`);

  // 2. Update via UserOrganization relationship
  console.log('Running UPDATE 2 (UserOrganization join map)...');
  const count2 = await prisma.$executeRawUnsafe(`
    UPDATE machine_cut_logs mcl
    SET user_id = uo.user_id
    FROM user_organizations uo
    WHERE mcl.user_id IS NULL 
      AND mcl.organization_id = uo.organization_id
      AND uo.role_id = '124f79af-1c1d-4ec2-a854-2f95ff0a2895'
  `);
  console.log(`UPDATE 2 complete. Updated ${count2} rows.`);

  console.log('All updates completed successfully.');
}

main()
  .catch(e => console.error('SQL Execution failed:', e))
  .finally(async () => {
    await prisma.$disconnect();
  });
