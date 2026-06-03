const fs = require('fs');
const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Batch Code Fix
code = code.replace(
  "const batchIdx = licenseName.lastIndexOf('_');\\n        const batchCode = batchIdx !== -1 && /^\\\\d+$/.test(licenseName.substring(batchIdx + 1)) \\n          ? licenseName.substring(0, batchIdx) \\n          : (licenseName || 'LEGACY-MIGRATION');",
  "const batchCode = licenseName || 'LEGACY-MIGRATION';"
);

// 2. Tenant Fix
const tenantOld = \`if (!batch && rootOrg) {
            const sysAdmin = await this.prisma.user.findFirst({
              where: { isSuperAdmin: true }
            });
            if (sysAdmin) {
              batch = await (this.prisma as any).orgLicenseBatch.create({
                data: {
                  batchCode,
                  licenseType: 'PRO',
                  totalCount: 0,
                  createdBy: sysAdmin.id,
                  tenantId: orgId,
                  createdAt: this.safeDate(lic.CreatedDate)
                }
              });
            }
          }\`;

const tenantNew = \`if (!batch && rootOrg) {
            let batchTenantId = orgId;
            if (assignments.length > 0) {
              const firstAssignment = assignments[0];
              const firstDealerId = String(firstAssignment.DealerID || '').trim();
              const firstDealerOrgId = resolveOrgId(firstDealerId);
              if (firstDealerOrgId) {
                batchTenantId = firstDealerOrgId;
              }
            }
            const sysAdmin = await this.prisma.user.findFirst({
              where: { isSuperAdmin: true }
            });
            if (sysAdmin) {
              batch = await (this.prisma as any).orgLicenseBatch.create({
                data: {
                  batchCode,
                  licenseType: 'PRO',
                  totalCount: 0,
                  createdBy: sysAdmin.id,
                  tenantId: batchTenantId,
                  createdAt: this.safeDate(lic.CreatedDate)
                }
              });
            }
          }\`;
code = code.replace(tenantOld, tenantNew);

// 3. Add DB connect import
if (!code.includes("import * as sql from 'mssql'")) {
    code = "import * as sql from 'mssql';\\n" + code;
}

// 4. Transform single parameter migrations (Catalog, Skins, Roles, MobileUsers)
function patchSingle(methodName, varName) {
  const sigRegex = new RegExp(\`async \${methodName}\\\\(file: Express\\\\.Multer\\\\.File\\\\) \\\\{\\n\\s*const \${varName}: any\\\\[\\\\] = \\\\[\\\\];\\n\\s*await new Promise\\\\(\\\\(resolve, reject\\\\) => \\\\{\\n[\\\\s\\\\S]*?\\\\.on\\\\('error', reject\\\\);\\n\\s*\\\\}\\\\);\`);
  
  const replacement = \`async \${methodName}(file: Express.Multer.File | any[], sourceName?: string) {
    let \${varName}: any[] = [];
    if (Array.isArray(file)) {
      \${varName} = file;
    } else {
      await new Promise((resolve, reject) => {
        Readable.from((file as Express.Multer.File).buffer)
          .pipe(csv({
              mapHeaders: ({ header }) => header.trim().replace(/^\\\\ufeff/, ''),
              mapValues: ({ value }) => value?.trim()
          }))
          .on('data', (row: any) => \${varName}.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
    }\`;
    
  code = code.replace(sigRegex, replacement);
  code = code.replace(new RegExp(\`fileName: file\\\\.originalname\`, 'g'), \`fileName: sourceName || (file as Express.Multer.File).originalname\`);
}

patchSingle('migrateCatalog', 'rows');
patchSingle('migrateSkins', 'data');
patchSingle('migrateRoles', 'rolesData');
patchSingle('migrateMobileUsers', 'mobileUsersData');

// 5. Transform Users
const usersSig = \`async migrateUsers(
    usersFile?: Express.Multer.File,
    userRolesFile?: Express.Multer.File
  ) {\`;
const usersSigNew = \`async migrateUsers(
    usersFile?: Express.Multer.File | any[],
    userRolesFile?: Express.Multer.File | any[],
    sourceName?: string
  ) {\`;
code = code.replace(usersSig, usersSigNew);
code = code.replace(
  "const usersData = usersFile ? this.parseUsersCsvRobustly(usersFile.buffer) : [];",
  "const usersData = Array.isArray(usersFile) ? usersFile : (usersFile ? this.parseUsersCsvRobustly((usersFile as Express.Multer.File).buffer) : []);"
);
code = code.replace(
  "const userRolesData = userRolesFile ? await this.parseCsvBuffer(userRolesFile.buffer) : [];",
  "const userRolesData = Array.isArray(userRolesFile) ? userRolesFile : (userRolesFile ? await this.parseCsvBuffer((userRolesFile as Express.Multer.File).buffer) : []);"
);

const userFileNameOld = \`const fileName = [
      usersFile ? usersFile.originalname : '',
      userRolesFile ? userRolesFile.originalname : ''
    ].filter(Boolean).join(', ');

    await this.logMigration({
      module: 'users',
      fileName: fileName || 'Uploaded User CSV Files',\`;

const userFileNameNew = \`const fileName = sourceName || [
      usersFile && !Array.isArray(usersFile) ? (usersFile as Express.Multer.File).originalname : '',
      userRolesFile && !Array.isArray(userRolesFile) ? (userRolesFile as Express.Multer.File).originalname : ''
    ].filter(Boolean).join(', ');

    await this.logMigration({
      module: 'users',
      fileName: fileName || 'Uploaded User CSV Files',\`;
code = code.replace(userFileNameOld, userFileNameNew);


// 6. Transform Licenses
const licSig = \`async migrateLicenses(
    licensesFile: Express.Multer.File,
    licenseDealersFile?: Express.Multer.File
  ) {\`;
const licSigNew = \`async migrateLicenses(
    licensesFile: Express.Multer.File | any[],
    licenseDealersFile?: Express.Multer.File | any[],
    sourceName?: string
  ) {\`;
code = code.replace(licSig, licSigNew);
code = code.replace(
  "const licensesData = await this.parseCsvBuffer(licensesFile.buffer);",
  "const licensesData = Array.isArray(licensesFile) ? licensesFile : await this.parseCsvBuffer((licensesFile as Express.Multer.File).buffer);"
);
code = code.replace(
  "const licenseDealersData = licenseDealersFile ? await this.parseCsvBuffer(licenseDealersFile.buffer) : [];",
  "const licenseDealersData = Array.isArray(licenseDealersFile) ? licenseDealersFile : (licenseDealersFile ? await this.parseCsvBuffer((licenseDealersFile as Express.Multer.File).buffer) : []);"
);

const licenseFileNameOld = \`await this.logMigration({
      module: 'licenses',
      fileName: [licensesFile.originalname, licenseDealersFile?.originalname].filter(Boolean).join(', '),\`;
const licenseFileNameNew = \`await this.logMigration({
      module: 'licenses',
      fileName: sourceName || [!Array.isArray(licensesFile) ? (licensesFile as Express.Multer.File).originalname : '', licenseDealersFile && !Array.isArray(licenseDealersFile) ? (licenseDealersFile as Express.Multer.File).originalname : ''].filter(Boolean).join(', '),\`;
code = code.replace(licenseFileNameOld, licenseFileNameNew);

// 7. Append DB methods
const dbMethods = \`
  async dbConnect(credentials: any) {
    const config = {
      user: credentials.user,
      password: credentials.password,
      server: credentials.host,
      database: credentials.database,
      port: parseInt(credentials.port || '1433'),
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };
    try {
      const pool = await sql.connect(config);
      const result = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
      await pool.close();
      return result.recordset.map(r => r.TABLE_NAME);
    } catch (err: any) {
      throw new Error('Database connection failed: ' + err.message);
    }
  }

  async dbRun(credentials: any, moduleType: string, tableMap: Record<string, string>) {
    const config = {
      user: credentials.user,
      password: credentials.password,
      server: credentials.host,
      database: credentials.database,
      port: parseInt(credentials.port || '1433'),
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      requestTimeout: 300000 // 5 minutes
    };
    const pool = await sql.connect(config);
    try {
      if (moduleType === 'catalog') {
        const rows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        return await this.migrateCatalog(rows, "MSSQL: " + tableMap.file1);
      } else if (moduleType === 'skins') {
        const rows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        return await this.migrateSkins(rows, "MSSQL: " + tableMap.file1);
      } else if (moduleType === 'roles') {
        const rows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        return await this.migrateRoles(rows, "MSSQL: " + tableMap.file1);
      } else if (moduleType === 'designs') {
        throw new Error('Direct DB migration for designs is not supported. Use Local Scan instead.');
      } else if (moduleType === 'mobile-users') {
        const rows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        return await this.migrateMobileUsers(rows, "MSSQL: " + tableMap.file1);
      } else if (moduleType === 'users') {
        const userRows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        const roleRows = tableMap.file2 ? (await pool.request().query("SELECT * FROM [" + tableMap.file2 + "]")).recordset : [];
        return await this.migrateUsers(userRows, roleRows, "MSSQL: " + tableMap.file1);
      } else if (moduleType === 'licenses') {
        const licenseRows = (await pool.request().query("SELECT * FROM [" + tableMap.file1 + "]")).recordset;
        const assignRows = tableMap.file2 ? (await pool.request().query("SELECT * FROM [" + tableMap.file2 + "]")).recordset : [];
        return await this.migrateLicenses(licenseRows, assignRows, "MSSQL: " + tableMap.file1);
      } else {
        throw new Error('Unsupported module type for DB migration: ' + moduleType);
      }
    } finally {
      await pool.close();
    }
  }
\`;

const lastBraceIndex = code.lastIndexOf('}');
code = code.substring(0, lastBraceIndex) + dbMethods + code.substring(lastBraceIndex);

fs.writeFileSync(path, code, 'utf8');
console.log('Update Final complete');
