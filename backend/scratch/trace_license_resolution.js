const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const licenseId = '17';
  
  // Cache orgLegacyMap and userOrgMap
  const orgs = await prisma.organization.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true, name: true }
  });
  const orgLegacyMap = new Map();
  orgs.forEach(o => orgLegacyMap.set(o.legacyId, o));

  const dbUsers = await prisma.user.findMany({
    where: { organizationId: { not: null } },
    select: { id: true, organizationId: true, email: true }
  });
  const userOrgMap = new Map();
  dbUsers.forEach(u => userOrgMap.set(u.id, u));

  function parseOrCreateUuid(val) {
    const crypto = require('crypto');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (val && uuidRegex.test(val)) return val.toLowerCase();
    return crypto.createHash('md5').update(val || crypto.randomUUID()).digest('hex')
      .replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i, '$1-$2-$3-$4-$5');
  }

  function resolveOrgId(legacyUserId) {
    console.log(`Resolving legacyUserId: ${legacyUserId}`);
    const directOrg = orgLegacyMap.get(legacyUserId);
    if (directOrg) {
      console.log(`  Found direct org in orgLegacyMap: ${directOrg.name} (${directOrg.id})`);
      return directOrg.id;
    }
    const dbUserId = parseOrCreateUuid(legacyUserId);
    console.log(`  Converted legacyUserId to UUID: ${dbUserId}`);
    const user = userOrgMap.get(dbUserId);
    if (user) {
      console.log(`  Found user for UUID in userOrgMap: ${user.email}, OrgId: ${user.organizationId}`);
      return user.organizationId;
    }
    console.log(`  No match found in maps.`);
    return undefined;
  }

  // 1. Check dealer assignments from LicenseAssignDealer
  const dealerIds = ["0b76b1d7-e5e5-421a-997b-8dd877bc9258"];
  let orgId = undefined;
  for (const dId of dealerIds) {
    const dealerOrgId = resolveOrgId(dId);
    if (dealerOrgId) {
      orgId = dealerOrgId;
      break;
    }
  }

  if (!orgId) {
    const assignUserId = "";
    const ownerId = "0b76b1d7-e5e5-421a-997b-8dd877bc9258";
    orgId = resolveOrgId(assignUserId) || resolveOrgId(ownerId);
  }

  console.log(`Final orgId: ${orgId}`);
  
  const fo = await prisma.organization.findUnique({ where: { id: '79f93c61-4934-48fe-a131-4673f7630706' } });
  console.log(`Flashgard Pvt Ltd Hyd (direct lookup): name=${fo.name}, legacyId=${fo.legacyId}`);
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
