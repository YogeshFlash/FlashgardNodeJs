const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(cur);
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur);
    return result;
}

function parseCSV(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i] ? values[i].trim() : null; });
        return obj;
    });
}

function parseOrCreateUuid(val) {
    const crypto = require('crypto');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (val && uuidRegex.test(val)) return val.toLowerCase();
    return crypto.createHash('md5').update(val || crypto.randomUUID()).digest('hex')
      .replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i, '$1-$2-$3-$4-$5');
}

function parseBit(val) {
    if (val === '1' || val === 1 || val === 'true' || val === true || val === 'True') return true;
    return false;
}

async function main() {
  const usersPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
  const rolesPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUserRoles.csv';

  console.log('Loading CSVs...');
  const usersData = parseCSV(usersPath);
  const userRolesData = parseCSV(rolesPath);

  const targets = [
    '2a625437-5191-4578-b355-f33dee14e6fb',
    '4146a6fe-12a6-41e3-aa5e-a7e818182ef0'
  ];

  const userToRolesMap = new Map();
  for (const urRow of userRolesData) {
    const uId = String(urRow.UserId || '').trim();
    const rId = String(urRow.RoleId || '').trim();
    if (uId && rId) {
      if (!userToRolesMap.has(uId)) {
        userToRolesMap.set(uId, []);
      }
      userToRolesMap.get(uId).push(rId);
    }
  }

  const roleMap = new Map();
  const allCurrentRoles = await prisma.role.findMany();
  allCurrentRoles.forEach(r => {
    if (r.legacyId) roleMap.set(r.legacyId, r.id);
    roleMap.set(r.name.toLowerCase(), r.id);
  });

  const getNewRoleIdForLegacyUser = (legacyUserId) => {
    const legacyRoleIds = userToRolesMap.get(legacyUserId) || [];
    for (const lrId of legacyRoleIds) {
      const dbRoleId = roleMap.get(lrId);
      if (dbRoleId) return dbRoleId;
    }
    const fallbackRole = allCurrentRoles.find(r => r.name.toLowerCase().includes('dealer')) || allCurrentRoles[0];
    return fallbackRole?.id;
  };

  const orgTypes = await prisma.organizationType.findMany();
  const parentType = orgTypes.find(o => o.name === 'parent') || orgTypes[0];
  const dealerType = orgTypes.find(o => o.name === 'dealer') || orgTypes.find(o => o.name === 'retailer') || orgTypes[0];
  const distributorType = orgTypes.find(o => o.name === 'distributor') || orgTypes[0];

  let rootOrg = await prisma.organization.findFirst({
    where: { name: { contains: 'Flashgard', mode: 'insensitive' } }
  });

  for (const target of targets) {
    console.log(`\n--- Simulating User Migration for target: ${target} ---`);
    const userRow = usersData.find(u => u.Id === target);
    if (!userRow) {
      console.log('Target user row not found in CSV.');
      continue;
    }

    const legacyIdStr = String(userRow.Id || '').trim();
    const legacyCode = parseInt(userRow.Code) || null;
    const parentUserIdStr = String(userRow.ParentUserID || '').trim();
    const email = String(userRow.Email || '').trim().toLowerCase();
    const userName = String(userRow.UserName || '').trim();
    const legacyFirstName = (String(userRow.FirstName || '').trim() || userName || 'Legacy').slice(0, 100);
    const legacyLastName = (String(userRow.LastName || '').trim() || 'User').slice(0, 100);
    const passwordHash = String(userRow.PasswordHash || '').trim();
    const isActive = parseBit(userRow.IsActive);
    const isDeleted = parseBit(userRow.IsDelete);

    console.log('Parsed details:', {
      legacyIdStr, legacyCode, parentUserIdStr, email, userName,
      legacyFirstName, legacyLastName, isActive, isDeleted
    });

    let orgId = rootOrg?.id;
    const legacyRoleIds = userToRolesMap.get(legacyIdStr) || [];
    const isDealerOrRetailer = legacyRoleIds.some(lrId => {
      const role = allCurrentRoles.find(r => r.legacyId === lrId);
      const name = (role?.name || '').toLowerCase();
      return name.includes('dealer') || name.includes('retailer') || name.includes('distributor') || name.includes('partner');
    }) || userRow.GSTNO || userRow.Address;

    console.log('isDealerOrRetailer:', isDealerOrRetailer);

    if (isDealerOrRetailer) {
      const orgName = (`${legacyFirstName} ${legacyLastName}`.trim() || userName || email).slice(0, 255);
      console.log('Calculated Org Name:', orgName);
      let org = await prisma.organization.findFirst({
        where: { name: orgName }
      });
      console.log('Existing Org:', org ? `${org.name} (${org.id})` : 'None');

      let orgType = dealerType?.id;
      const isDistributor = legacyRoleIds.some(lrId => {
        const role = allCurrentRoles.find(r => r.legacyId === lrId);
        return (role?.name || '').toLowerCase().includes('distributor');
      });
      if (isDistributor) orgType = distributorType?.id;

      if (!org && orgType) {
        console.log('WOULD CREATE ORG with data:', { name: orgName, organizationTypeId: orgType, isActive, legacyId: legacyIdStr });
      } else {
        console.log('WOULD UPDATE ORG with ID:', org.id);
      }
      orgId = org?.id;
    }

    const newUserId = parseOrCreateUuid(legacyIdStr);
    console.log('newUserId:', newUserId);
    let user = await prisma.user.findFirst({
      where: { OR: [ { id: newUserId }, { email } ] }
    });
    console.log('Existing User:', user ? `${user.email} (${user.id})` : 'None');
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
