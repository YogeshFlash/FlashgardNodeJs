const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { decryptLicenseKey } = require('../dist/utils/encryption');
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

async function main() {
  const masterPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseMaster.csv';
  const dealerPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseAssignDealer.csv';

  console.log('Loading CSVs...');
  const licensesData = parseCSV(masterPath);
  const licenseDealersData = parseCSV(dealerPath);

  // Group dealer assignments by LicenseID, sorted by LicenseAssignID ascending
  const licenseDealerMap = new Map();
  
  // Sort assignments to make sure they are in chronological order
  licenseDealersData.sort((a, b) => {
    const idA = parseInt(a.LicenseAssignID || a.LicenseAssignId || 0);
    const idB = parseInt(b.LicenseAssignID || b.LicenseAssignId || 0);
    return idA - idB;
  });

  for (const ld of licenseDealersData) {
    const licId = String(ld.LicenseID || '').trim();
    const dealerId = String(ld.DealerID || '').trim();
    if (licId && dealerId) {
      if (!licenseDealerMap.has(licId)) {
        licenseDealerMap.set(licId, []);
      }
      licenseDealerMap.get(licId).push(dealerId);
    }
  }

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

  function parseOrCreateUuid(val) {
    const crypto = require('crypto');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (val && uuidRegex.test(val)) return val.toLowerCase();
    return crypto.createHash('md5').update(val || crypto.randomUUID()).digest('hex')
      .replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i, '$1-$2-$3-$4-$5');
  }

  const resolveOrgId = (legacyUserId) => {
    if (!legacyUserId) return undefined;
    const directOrgId = orgLegacyMap.get(legacyUserId);
    if (directOrgId) return directOrgId;
    const dbUserId = parseOrCreateUuid(legacyUserId);
    return userOrgMap.get(dbUserId);
  };

  const dbLicenses = await prisma.orgLicense.findMany({
    include: { owner: true }
  });
  const dbLicMap = new Map();
  dbLicenses.forEach(l => {
    dbLicMap.set(l.legacyId, l);
  });

  console.log(`Loaded ${dbLicenses.length} licenses from DB.`);

  let changesCount = 0;
  for (const lic of licensesData) {
    const licenseId = String(lic.LicenseID || lic.Licenseid || '').trim();
    if (!licenseId) continue;

    const existingDbLic = dbLicMap.get(licenseId);
    if (!existingDbLic) continue;

    // Simulate old resolution (first resolved dealer)
    let oldResolvedOrgId = undefined;
    const dealerIds = licenseDealerMap.get(licenseId) || [];
    for (const dId of dealerIds) {
      const r = resolveOrgId(dId);
      if (r) {
        oldResolvedOrgId = r;
        break;
      }
    }
    if (!oldResolvedOrgId) {
      const assignUserId = String(lic.AssignUserID || lic.AssignUserId || '').trim();
      const ownerId = String(lic.OwnerID || lic.OwnerId || '').trim();
      oldResolvedOrgId = resolveOrgId(assignUserId) || resolveOrgId(ownerId);
    }

    // Simulate new resolution (last resolved dealer)
    let newResolvedOrgId = undefined;
    for (let i = dealerIds.length - 1; i >= 0; i--) {
      const dId = dealerIds[i];
      const r = resolveOrgId(dId);
      if (r) {
        newResolvedOrgId = r;
        break;
      }
    }
    if (!newResolvedOrgId) {
      const assignUserId = String(lic.AssignUserID || lic.AssignUserId || '').trim();
      const ownerId = String(lic.OwnerID || lic.OwnerId || '').trim();
      newResolvedOrgId = resolveOrgId(assignUserId) || resolveOrgId(ownerId);
    }

    if (newResolvedOrgId && newResolvedOrgId !== existingDbLic.ownerId) {
      changesCount++;
      const decryptedKey = decryptLicenseKey(existingDbLic.key);
      const newOrg = orgs.find(o => o.id === newResolvedOrgId);
      if (decryptedKey === 'YSMR94UOVOEZS2CR' || changesCount <= 5) {
        console.log(`License: ${decryptedKey} (LegacyID: ${licenseId})`);
        console.log(`  Current Owner in DB: ${existingDbLic.owner.name}`);
        console.log(`  Simulated Old Resolved Org: ${orgs.find(o => o.id === oldResolvedOrgId)?.name || 'root'}`);
        console.log(`  Simulated New Resolved Org (LATEST): ${newOrg ? newOrg.name : 'root'}`);
      }
    }
  }

  console.log(`Total licenses that would change owner: ${changesCount}`);
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
