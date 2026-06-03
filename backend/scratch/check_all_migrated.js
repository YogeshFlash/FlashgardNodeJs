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
  const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
  const csvRows = parseUsersRobustly(path);
  console.log(`Parsed ${csvRows.length} rows from CSV.`);

  const dbUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      legacyId: true
    }
  });
  console.log(`Found ${dbUsers.length} users in modern database.`);

  const dbOrgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      legacyId: true
    }
  });
  console.log(`Found ${dbOrgs.length} organizations in modern database.`);

  const dbUserEmails = new Set(dbUsers.map(u => u.email.toLowerCase()));
  const dbUserIds = new Set(dbUsers.map(u => u.id));
  const dbOrgLegacyIds = new Set(dbOrgs.map(o => o.legacyId));

  const missingUsers = [];
  const missingOrgs = [];

  for (const row of csvRows) {
    const email = String(row.Email || '').trim().toLowerCase();
    const id = String(row.Id || '').trim();
    const isDelete = row.IsDelete === '1' || row.IsDelete === 'true';

    if (!email) continue;
    if (isDelete) continue; // ignore deleted

    const hasUser = dbUserEmails.has(email) || dbUserIds.has(id);
    if (!hasUser) {
      missingUsers.push(row);
    }
  }

  console.log(`Total active legacy users missing in DB: ${missingUsers.length}`);
  if (missingUsers.length > 0) {
    console.log('Sample missing users (up to 10):');
    missingUsers.slice(0, 10).forEach(mu => {
      console.log(`- Id: ${mu.Id}, Email: ${mu.Email}, Name: ${mu.FirstName} ${mu.LastName}`);
    });
  }

  // Check if organizations that should be created are missing
  // Criteria: user has a legacy role containing 'dealer', 'retailer', 'distributor', 'partner'
  // Or GSTNO or Address is present.
  // Wait, let's load legacy user roles to check who should be an org.
  const userRolesPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUserRoles.csv';
  let hasUserRoles = false;
  let userToRoles = new Map();
  if (fs.existsSync(userRolesPath)) {
    hasUserRoles = true;
    const urLines = fs.readFileSync(userRolesPath, 'utf8').split(/\r?\n/);
    const urHeaders = urLines[0].split(',').map(h => h.trim());
    for (let i = 1; i < urLines.length; i++) {
      const line = urLines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      if (parts.length >= 2) {
        const uId = parts[0].trim();
        const rId = parts[1].trim();
        if (!userToRoles.has(uId)) {
          userToRoles.set(uId, []);
        }
        userToRoles.get(uId).push(rId);
      }
    }
  }

  const rolePath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetRoles.csv';
  const roleMap = new Map();
  if (fs.existsSync(rolePath)) {
    const roleLines = fs.readFileSync(rolePath, 'utf8').split(/\r?\n/);
    for (let i = 1; i < roleLines.length; i++) {
      const line = roleLines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      if (parts.length >= 2) {
        roleMap.set(parts[0].trim(), parts[1].trim()); // id -> name
      }
    }
  }

  for (const row of csvRows) {
    const id = String(row.Id || '').trim();
    const isDelete = row.IsDelete === '1' || row.IsDelete === 'true';
    if (isDelete) continue;

    const legacyRoleIds = userToRoles.get(id) || [];
    const isDealerOrRetailer = legacyRoleIds.some(lrId => {
      const name = (roleMap.get(lrId) || '').toLowerCase();
      return name.includes('dealer') || name.includes('retailer') || name.includes('distributor') || name.includes('partner');
    }) || row.GSTNO || row.Address;

    if (isDealerOrRetailer) {
      if (!dbOrgLegacyIds.has(id)) {
        missingOrgs.push(row);
      }
    }
  }

  console.log(`Total active legacy orgs missing in DB: ${missingOrgs.length}`);
  if (missingOrgs.length > 0) {
    console.log('Sample missing orgs (up to 10):');
    missingOrgs.slice(0, 10).forEach(mo => {
      console.log(`- Id: ${mo.Id}, Email: ${mo.Email}, Name: ${mo.FirstName} ${mo.LastName}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
