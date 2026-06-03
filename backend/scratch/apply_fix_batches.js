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

async function main() {
  const masterPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseMaster.csv';
  console.log('Loading CSV...');
  const licensesData = parseCSV(masterPath);

  const rootOrg = await prisma.organization.findFirst({
    where: { name: { contains: 'Flashgard', mode: 'insensitive' } }
  });
  if (!rootOrg) {
    console.log('Root organization not found.');
    return;
  }

  const sysAdmin = await prisma.user.findFirst({
    where: { isSuperAdmin: true }
  });
  if (!sysAdmin) {
    console.log('Superadmin not found.');
    return;
  }

  const dbLicenses = await prisma.orgLicense.findMany();
  const dbLicMap = new Map();
  dbLicenses.forEach(l => {
    dbLicMap.set(l.legacyId, l);
  });

  const batchCache = new Map();
  let updatedCount = 0;

  console.log(`Processing ${licensesData.length} licenses...`);
  for (const lic of licensesData) {
    const licenseId = String(lic.LicenseID || '').trim();
    const existingDbLic = dbLicMap.get(licenseId);
    if (!existingDbLic) continue;

    const licenseName = String(lic.LicenseName || '').trim();
    const idx = licenseName.lastIndexOf('_');
    const batchCode = idx !== -1 && /^\d+$/.test(licenseName.substring(idx + 1)) 
      ? licenseName.substring(0, idx) 
      : (licenseName || 'LEGACY-MIGRATION');

    let batch = batchCache.get(batchCode);
    if (!batch) {
      batch = await prisma.orgLicenseBatch.findUnique({
        where: { batchCode }
      });
      if (!batch) {
        batch = await prisma.orgLicenseBatch.create({
          data: {
            batchCode,
            licenseType: 'PRO',
            totalCount: 0,
            createdBy: sysAdmin.id,
            tenantId: rootOrg.id
          }
        });
        console.log(`Created new batch: ${batchCode}`);
      }
      batchCache.set(batchCode, batch);
    }

    if (existingDbLic.batchId !== batch.id) {
      await prisma.orgLicense.update({
        where: { id: existingDbLic.id },
        data: {
          batchId: batch.id
        }
      });
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} licenses with their correct batch IDs.`);

  // Cleanup legacy batch if empty
  const legacyBatch = await prisma.orgLicenseBatch.findUnique({
    where: { batchCode: 'LEGACY-MIGRATION' }
  });
  if (legacyBatch) {
    const licensesInLegacy = await prisma.orgLicense.count({
      where: { batchId: legacyBatch.id }
    });
    if (licensesInLegacy === 0) {
      await prisma.orgLicenseBatch.delete({
        where: { id: legacyBatch.id }
      });
      console.log('Cleaned up empty LEGACY-MIGRATION batch.');
    }
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
