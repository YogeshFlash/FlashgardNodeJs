const fs = require('fs');

const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. We need to create a helper to find all parent orgs up to root.
// Wait, `orgLegacyMap` only has ID to ID. We don't have the parent-child relationships cached!
// Let's cache the whole organization table with parentId.
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

// 2. We need to replace the single orgId resolution with a chain of transfers.
// Search for:
// let orgId: string | undefined = undefined;
// ... down to ...
//         if (!orgId) {
//           skippedRows++;

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

code = code.replace(
  /let orgId: string \| undefined = undefined;[\s\S]*?if \(!orgId\) \{\n\s*skippedRows\+\+;\n\s*failures\.push\(\{ row: lic, error: 'Failed to resolve organization ownership' \}\);\n\s*continue;\n\s*\}/,
  resolutionLogic
);

// 3. Fix batch tenant logic and date
code = code.replace(/let batchTenantId = orgId;/g, 'let batchTenantId = initialOwnerId;');
code = code.replace(/createdAt: this\.safeDate\(lic\.CreatedDate\)/g, 'createdAt: batchCreatedDate');

// 4. In `licenseData`, change `ownerId` and `tenantId`
code = code.replace(/ownerId: orgId,/g, 'ownerId: finalOrgId,');
code = code.replace(/tenantId: orgId,/g, 'tenantId: initialOwnerId,');

// 5. Generate LicensingTransfers
// Look for where `existingLicense` is created or updated
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

code = code.replace(
  /        if \(!existingLicense\) \{\n\s*existingLicense = await \(this\.prisma as any\)\.orgLicense\.create\(\{\n\s*data: licenseData\n\s*\}\);\n\s*importedLicenses\+\+;\n\s*\} else \{/,
  transferLogic
);

fs.writeFileSync(path, code);
console.log('License hierarchy patch applied');
