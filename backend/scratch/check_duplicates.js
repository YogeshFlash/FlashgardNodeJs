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

  const userRolesPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUserRoles.csv';
  let userToRoles = new Map();
  if (fs.existsSync(userRolesPath)) {
    const urLines = fs.readFileSync(userRolesPath, 'utf8').split(/\r?\n/);
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

  const dbOrgs = await prisma.organization.findMany();
  const dbOrgLegacyIds = new Set(dbOrgs.map(o => o.legacyId));

  console.log(`Analyzing missing organizations...`);
  const missing = [];
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
        missing.push(row);
      }
    }
  }

  console.log(`Found ${missing.length} missing legacy organization IDs.`);
  for (const row of missing) {
    const legacyFirstName = String(row.FirstName || '').trim();
    const legacyLastName = String(row.LastName || '').trim();
    const userName = String(row.UserName || '').trim();
    const email = String(row.Email || '').trim().toLowerCase();
    const orgName = (`${legacyFirstName} ${legacyLastName}`.trim() || userName || email).slice(0, 255);

    // Let's see if this orgName exists in dbOrgs
    const existingOrgByName = dbOrgs.find(o => o.name.toLowerCase() === orgName.toLowerCase());
    // Also let's check if the corresponding user exists and what organizationId they have
    const userInDb = await prisma.user.findFirst({
      where: { email },
      include: { organization: true }
    });

    console.log(`\nLegacy ID: ${row.Id}`);
    console.log(`  Expected Org Name: "${orgName}"`);
    if (existingOrgByName) {
      console.log(`  Found DB Org with same name: "${existingOrgByName.name}" (ID: ${existingOrgByName.id}, legacyId: ${existingOrgByName.legacyId})`);
    } else {
      console.log(`  No DB Org found by name.`);
    }
    if (userInDb) {
      console.log(`  User exists in DB: ${userInDb.email} (ID: ${userInDb.id})`);
      console.log(`    Mapped to Org: "${userInDb.organization?.name}" (ID: ${userInDb.organizationId}, legacyId: ${userInDb.organization?.legacyId})`);
    } else {
      console.log(`  User does not exist in DB.`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
