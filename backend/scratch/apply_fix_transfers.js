const fs = require('fs');
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

function safeDate(val) {
  if (!val) return new Date();
  const cleanVal = String(val).replace(/['"]/g, '').trim();
  if (!cleanVal || cleanVal.toUpperCase() === 'NULL' || cleanVal.toUpperCase() === 'UNDEFINED') {
    return new Date();
  }
  const d = new Date(cleanVal);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

async function main() {
  const dealerPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseAssignDealer.csv';

  console.log('Loading CSV...');
  const licenseDealersData = parseCSV(dealerPath);

  // Load existing DB data
  const orgs = await prisma.organization.findMany({
    select: { id: true, legacyId: true, name: true }
  });
  const orgLegacyMap = new Map();
  orgs.forEach(o => {
    if (o.legacyId) orgLegacyMap.set(o.legacyId, o.id);
  });

  const dbUsers = await prisma.user.findMany({
    select: { id: true, organizationId: true, email: true }
  });
  const userOrgMap = new Map();
  dbUsers.forEach(u => {
    if (u.organizationId) userOrgMap.set(u.id, u.organizationId);
  });

  const resolveOrgId = (legacyUserId) => {
    if (!legacyUserId) return undefined;
    const directOrgId = orgLegacyMap.get(legacyUserId);
    if (directOrgId) return directOrgId;
    const dbUserId = parseOrCreateUuid(legacyUserId);
    return userOrgMap.get(dbUserId);
  };

  const dbLicenses = await prisma.orgLicense.findMany();
  const dbLicMap = new Map();
  dbLicenses.forEach(l => {
    dbLicMap.set(l.legacyId, l);
  });

  console.log(`Loaded ${dbLicenses.length} licenses from DB.`);

  let createdTransfers = 0;
  
  // Sort assignments chronologically
  licenseDealersData.sort((a, b) => {
    const idA = parseInt(a.LicenseAssignID || a.LicenseAssignId || 0);
    const idB = parseInt(b.LicenseAssignID || b.LicenseAssignId || 0);
    return idA - idB;
  });

  console.log(`Processing ${licenseDealersData.length} assignments...`);
  
  for (let i = 0; i < licenseDealersData.length; i++) {
    const ld = licenseDealersData[i];
    const licenseId = String(ld.LicenseID || '').trim();
    const existingDbLic = dbLicMap.get(licenseId);
    if (!existingDbLic) continue;

    const fromId = String(ld.CreatedBy || '').trim();
    const toId = String(ld.DealerID || '').trim();
    const fromOrgId = resolveOrgId(fromId);
    const toOrgId = resolveOrgId(toId);
    const assignId = String(ld.LicenseAssignID || ld.LicenseAssignId || '').trim();

    if (fromOrgId && toOrgId && fromOrgId !== toOrgId && assignId) {
      const transferUuid = parseOrCreateUuid(`transfer-${assignId}`);
      const transferItemUuid = parseOrCreateUuid(`transfer-item-${assignId}`);
      const createdDate = safeDate(ld.CreatedDate);

      await prisma.licensingTransfer.upsert({
        where: { id: transferUuid },
        update: {
          fromOrgId,
          toOrgId,
          status: 'COMPLETED',
          resolvedAt: createdDate,
          tenantId: toOrgId
        },
        create: {
          id: transferUuid,
          fromOrgId,
          toOrgId,
          status: 'COMPLETED',
          createdAt: createdDate,
          resolvedAt: createdDate,
          tenantId: toOrgId
        }
      });

      await prisma.licensingTransferItem.upsert({
        where: { id: transferItemUuid },
        update: {
          transferId: transferUuid,
          licenseId: existingDbLic.id
        },
        create: {
          id: transferItemUuid,
          transferId: transferUuid,
          licenseId: existingDbLic.id
        }
      });
      createdTransfers++;
      if (createdTransfers % 1000 === 0) {
        console.log(`Created/updated ${createdTransfers} transfers...`);
      }
    }
  }

  console.log(`Successfully completed transfer migration. Total transfers created: ${createdTransfers}`);
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
