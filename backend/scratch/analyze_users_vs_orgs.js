const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseUsersRobustly(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  const lines = content.split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 33) continue;
    const row = {};
    for (let j = 0; j < 20; j++) {
      row[headers[j]] = parts[j].trim();
    }
    const startLast12 = parts.length - 12;
    for (let j = 0; j < 12; j++) {
      row[headers[21 + j]] = parts[startLast12 + j].trim();
    }
    const addressParts = parts.slice(20, parts.length - 12);
    row['Address'] = addressParts.join(',').trim();
    rows.push(row);
  }
  return rows;
}

async function main() {
  const usersPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
  const csvUsers = parseUsersRobustly(usersPath);

  // Fetch all users in DB
  const dbUsers = await prisma.user.findMany({
    include: { organization: true, role: true }
  });

  const rootOrgs = await prisma.organization.findMany({
    where: { name: { in: ['Flashgard', 'Flashgard Pvt Ltd Hyd', 'Flashgard HQ', 'Flashgard Internal'] } }
  });
  const rootOrgIds = new Set(rootOrgs.map(o => o.id));

  console.log(`Loaded ${csvUsers.length} CSV users and ${dbUsers.length} DB users.`);

  let skippedOrgsCount = 0;
  const skippedOrgs = [];

  for (const dbUser of dbUsers) {
    if (dbUser.organizationId && rootOrgIds.has(dbUser.organizationId)) {
      // User is mapped to a root/default organization. Let's see if their name looks like an organization!
      const csvUser = csvUsers.find(cu => cu.Id === dbUser.id || cu.Email.toLowerCase() === dbUser.email.toLowerCase());
      const name = `${dbUser.firstName} ${dbUser.lastName}`.trim();
      
      // Let's filter for names that look like organizations or have codes
      const looksLikeOrg = /^\d+/.test(name) || name.includes('-') || name.toLowerCase().includes('mobile') || name.toLowerCase().includes('telecom') || name.toLowerCase().includes('communication') || name.toLowerCase().includes('store') || name.toLowerCase().includes('shop') || name.toLowerCase().includes('digital') || name.toLowerCase().includes('enterprise') || name.toLowerCase().includes('solutions') || name.toLowerCase().includes('world') || name.toLowerCase().includes('gallery') || name.toLowerCase().includes('warehouse') || name.toLowerCase().includes('house') || name.toLowerCase().includes('zone');

      if (looksLikeOrg) {
        skippedOrgsCount++;
        skippedOrgs.push({
          id: dbUser.id,
          email: dbUser.email,
          name,
          role: dbUser.role?.name,
          orgName: dbUser.organization?.name
        });
      }
    }
  }

  console.log(`Total users mapped to default root organization whose names look like custom organizations: ${skippedOrgsCount}`);
  console.log('Showing first 30:');
  skippedOrgs.slice(0, 30).forEach(o => {
    console.log(`- User ID: ${o.id} | Email: ${o.email} | Name: ${o.name} | Role: ${o.role} | Org: ${o.orgName}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
