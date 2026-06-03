const fs = require('fs');

const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. We need to create a helper to find all parent orgs up to root.
const cacheOrgsSnippet = `
    const orgs = await this.prisma.organization.findMany({
      select: { id: true, legacyId: true, parentId: true, organizationTypeId: true }
    });
    const orgMap = new Map<string, any>(); // id -> org object
    const orgLegacyMap = new Map<string, string>(); // legacyId -> DB Org ID
    orgs.forEach(o => {
      orgMap.set(o.id, o);
      if (o.legacyId) {
        orgLegacyMap.set(o.legacyId, o.id);
      }
    });

    const getOrgHierarchy = (orgId: string): string[] => {
      const hierarchy: string[] = [];
      let current = orgMap.get(orgId);
      while (current) {
        hierarchy.push(current.id);
        if (current.parentId && current.parentId !== current.id) {
          current = orgMap.get(current.parentId);
        } else {
          break;
        }
      }
      return hierarchy.reverse(); // Root first, leaf last
    };
`;

code = code.replace(
`    const orgs = await this.prisma.organization.findMany({
      where: { legacyId: { not: null } },
      select: { id: true, legacyId: true }
    });
    const orgLegacyMap = new Map<string, string>(); // legacyId -> DB Org ID
    orgs.forEach(o => {
      orgLegacyMap.set(o.legacyId!, o.id);
    });`,
  cacheOrgsSnippet
);

// 2. We need to replace the single orgId resolution with a chain of transfers IN migrateLicenses
const resolutionLogic = `
        let finalOrgId: string | undefined = undefined;
        let transferPath: string[] = [];
        let batchCreatedDate = this.safeDate(lic.CreatedDate);

        // 1. Collect all dealer assignments
        const assignments = licenseDealerMap.get(licenseId) || [];
        
        // Use the first assignment's created date for the batch if available
        if (assignments.length > 0 && assignments[0].CreatedDate) {
          batchCreatedDate = this.safeDate(assignments[0].CreatedDate) || batchCreatedDate;
        }

        // 2. Resolve the target org
        let targetDealerOrgId: string | undefined = undefined;
        for (let i = assignments.length - 1; i >= 0; i--) {
          const ld = assignments[i];
          const dealerId = String(ld.DealerID || '').trim();
          targetDealerOrgId = resolveOrgId(dealerId);
          if (targetDealerOrgId) {
            break;
          }
        }

        if (!targetDealerOrgId) {
          const assignUserId = String(lic.AssignUserID || lic.AssignUserId || '').trim();
          const ownerId = String(lic.OwnerID || lic.OwnerId || '').trim();
          targetDealerOrgId = resolveOrgId(assignUserId) || resolveOrgId(ownerId);
        }

        if (targetDealerOrgId) {
          finalOrgId = targetDealerOrgId;
          // Build hierarchy from root down to this target org
          transferPath = getOrgHierarchy(targetDealerOrgId);
        } else if (rootOrg) {
          finalOrgId = rootOrg.id;
          transferPath = [rootOrg.id];
        }

        if (!finalOrgId || transferPath.length === 0) {
          skippedRows++;
          failures.push({ row: lic, error: 'Failed to resolve organization ownership hierarchy' });
          continue;
        }

        // The first owner is the root of the path
        const initialOwnerId = transferPath[0];
`;

// Only replace inside `migrateLicenses`.
// `orgId: string | undefined = undefined;` appears in `migrateLicenses`.
// We will replace exactly the block inside `migrateLicenses`.
const startIdx = code.indexOf('let orgId: string | undefined = undefined;');
const endIdx = code.indexOf('failures.push({ row: lic, error: \'Failed to resolve organization ownership\' });\n          continue;\n        }', startIdx) + 'failures.push({ row: lic, error: \'Failed to resolve organization ownership\' });\n          continue;\n        }'.length;

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + resolutionLogic + code.substring(endIdx);
} else {
  console.error("COULD NOT FIND LOGIC BLOCK");
}

// 3. Fix batch tenant logic and date inside `migrateLicenses`
// We need to replace `let batchTenantId = orgId;` with `let batchTenantId = initialOwnerId;`
const btIdx = code.indexOf('let batchTenantId = orgId;');
if (btIdx !== -1) {
  code = code.substring(0, btIdx) + 'let batchTenantId = initialOwnerId;' + code.substring(btIdx + 'let batchTenantId = orgId;'.length);
}

const crtIdx = code.indexOf('createdAt: this.safeDate(lic.CreatedDate)', btIdx); // first instance after batchTenantId
if (crtIdx !== -1) {
  code = code.substring(0, crtIdx) + 'createdAt: batchCreatedDate' + code.substring(crtIdx + 'createdAt: this.safeDate(lic.CreatedDate)'.length);
}

// 4. In `licenseData`, change `ownerId` and `tenantId` inside `migrateLicenses`
const ldIdx = code.indexOf('const licenseData = {');
if (ldIdx !== -1) {
  // Replace ownerId: orgId
  const ownerIdx = code.indexOf('ownerId: orgId,', ldIdx);
  if (ownerIdx !== -1) {
    code = code.substring(0, ownerIdx) + 'ownerId: finalOrgId,' + code.substring(ownerIdx + 'ownerId: orgId,'.length);
  }
  // Replace tenantId: orgId
  const tenantIdx = code.indexOf('tenantId: orgId,', ldIdx);
  if (tenantIdx !== -1) {
    code = code.substring(0, tenantIdx) + 'tenantId: initialOwnerId,' + code.substring(tenantIdx + 'tenantId: orgId,'.length);
  }
}

// 5. Generate LicensingTransfers
const existingIdx = code.indexOf('if (!existingLicense) {', ldIdx);
const existingEndIdx = code.indexOf('} else {', existingIdx);

const transferLogic = `
        if (!existingLicense) {
          existingLicense = await (this.prisma as any).orgLicense.create({
            data: licenseData
          });
          importedLicenses++;
          
          // Generate Transfers!
          if (transferPath.length > 1) {
            for (let i = 0; i < transferPath.length - 1; i++) {
              const fromOrgId = transferPath[i];
              const toOrgId = transferPath[i + 1];
              
              // Skip if from/to are the same (shouldn't happen, but safe)
              if (fromOrgId === toOrgId) continue;
              
              const transfer = await (this.prisma as any).licensingTransfer.create({
                data: {
                  fromOrgId: fromOrgId,
                  toOrgId: toOrgId,
                  status: 'APPROVED',
                  tenantId: initialOwnerId,
                  resolvedAt: batchCreatedDate,
                  createdAt: batchCreatedDate,
                  items: {
                    create: {
                      licenseId: existingLicense.id
                    }
                  }
                }
              });
            }
          }
          
        } else {
`;

if (existingIdx !== -1 && existingEndIdx !== -1) {
  code = code.substring(0, existingIdx) + transferLogic + code.substring(existingEndIdx + '} else {'.length);
}

fs.writeFileSync(path, code);
console.log('License hierarchy patch applied SAFELY');
