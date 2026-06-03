const fs = require('fs');
const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Re-apply the batchCode and tenantId fix
code = code.replace(
  /const licenseName = String\(lic\.LicenseName \|\| lic\.Licensename \|\| ''\)\.trim\(\);\s*const batchIdx = licenseName\.lastIndexOf\('_'\);\s*const batchCode = batchIdx !== -1 && \/^\d\+\$\/\.test\(licenseName\.substring\(batchIdx \+ 1\)\)\s*\? licenseName\.substring\(0, batchIdx\)\s*: \(licenseName \|\| 'LEGACY-MIGRATION'\);/,
  "const licenseName = String(lic.LicenseName || lic.Licensename || '').trim();\n        const batchCode = licenseName || 'LEGACY-MIGRATION';"
);

code = code.replace(
  /if \(!batch && rootOrg\) \{\s*const sysAdmin = await this\.prisma\.user\.findFirst\(\{\s*where: \{ isSuperAdmin: true \}\s*\}\);\s*if \(sysAdmin\) \{\s*batch = await \(this\.prisma as any\)\.orgLicenseBatch\.create\(\{\s*data: \{\s*batchCode,\s*licenseType: 'PRO',\s*totalCount: 0,\s*createdBy: sysAdmin\.id,\s*tenantId: orgId,\s*createdAt: this\.safeDate\(lic\.CreatedDate\)\s*\}\s*\}\);\s*\}\s*\}/,
  `if (!batch && rootOrg) {
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
          }`
);

// 2. Add mssql methods
if (!code.includes("import * as sql from 'mssql'")) {
    code = "import * as sql from 'mssql';\n" + code;
}

const dbMethods = `
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
`;

const lastBraceIndex = code.lastIndexOf('}');
code = code.substring(0, lastBraceIndex) + dbMethods + code.substring(lastBraceIndex);

function patchSingle(methodName) {
  code = code.replace(
    new RegExp("async " + methodName + "\\(file: Express\\.Multer\\.File\\) \\{"),
    "async " + methodName + "(file: Express.Multer.File | any[], sourceName?: string) {"
  );
  code = code.replace(
    new RegExp("const (\\w+): any\\[\\] = \\[\\];\\s*await new Promise\\(\\(resolve, reject\\) => \\{[\\s\\S]*?\\.on\\('error', reject\\);\\s*\\}\\);"),
    (match, rowsVar) => {
      return "let " + rowsVar + ": any[] = [];\n" +
             "    if (Array.isArray(file)) {\n" +
             "      " + rowsVar + " = file;\n" +
             "    } else {\n" +
             "      await new Promise((resolve, reject) => {\n" +
             "        Readable.from((file as Express.Multer.File).buffer)\n" +
             "          .pipe(csv({\n" +
             "              mapHeaders: ({ header }) => header.trim().replace(/^\\ufeff/, ''),\n" +
             "              mapValues: ({ value }) => value?.trim()\n" +
             "          }))\n" +
             "          .on('data', (row: any) => " + rowsVar + ".push(row))\n" +
             "          .on('end', resolve)\n" +
             "          .on('error', reject);\n" +
             "      });\n" +
             "    }";
    }
  );
  code = code.replace(new RegExp("fileName: file\\.originalname", 'g'), "fileName: sourceName || (file as Express.Multer.File).originalname");
}

function patchDouble(methodName, file1, file2) {
  code = code.replace(
    new RegExp("async " + methodName + "\\(\\s*" + file1 + ": Express\\.Multer\\.File,\\s*" + file2 + "\\?: Express\\.Multer\\.File\\s*\\) \\{"),
    "async " + methodName + "(" + file1 + ": Express.Multer.File | any[], " + file2 + "?: Express.Multer.File | any[], sourceName?: string) {"
  );
  
  code = code.replace(
    new RegExp("const (\\w+): any\\[\\] = \\[\\];\\s*await new Promise\\(\\(resolve, reject\\) => \\{[\\s\\S]*?\\.on\\('error', reject\\);\\s*\\}\\);"),
    (match, rowsVar) => {
      return "let " + rowsVar + ": any[] = [];\n" +
             "    if (Array.isArray(" + file1 + ")) {\n" +
             "      " + rowsVar + " = " + file1 + ";\n" +
             "    } else {\n" +
             "      await new Promise((resolve, reject) => {\n" +
             "        Readable.from((" + file1 + " as Express.Multer.File).buffer)\n" +
             "          .pipe(csv({\n" +
             "              mapHeaders: ({ header }) => header.trim().replace(/^\\ufeff/, ''),\n" +
             "              mapValues: ({ value }) => value?.trim()\n" +
             "          }))\n" +
             "          .on('data', (row: any) => " + rowsVar + ".push(row))\n" +
             "          .on('end', resolve)\n" +
             "          .on('error', reject);\n" +
             "      });\n" +
             "    }";
    }
  );

  code = code.replace(
    new RegExp("const (\\w+): any\\[\\] = \\[\\];\\s*if \\(" + file2 + "\\) \\{\\s*await new Promise\\(\\(resolve, reject\\) => \\{[\\s\\S]*?\\.on\\('error', reject\\);\\s*\\}\\);\\s*\\}"),
    (match, rowsVar) => {
      return "let " + rowsVar + ": any[] = [];\n" +
             "    if (Array.isArray(" + file2 + ")) {\n" +
             "      " + rowsVar + " = " + file2 + ";\n" +
             "    } else if (" + file2 + ") {\n" +
             "      await new Promise((resolve, reject) => {\n" +
             "        Readable.from((" + file2 + " as Express.Multer.File).buffer)\n" +
             "          .pipe(csv({\n" +
             "              mapHeaders: ({ header }) => header.trim().replace(/^\\ufeff/, ''),\n" +
             "              mapValues: ({ value }) => value?.trim()\n" +
             "          }))\n" +
             "          .on('data', (row: any) => " + rowsVar + ".push(row))\n" +
             "          .on('end', resolve)\n" +
             "          .on('error', reject);\n" +
             "      });\n" +
             "    }";
    }
  );

  code = code.replace(new RegExp("fileName: " + file1 + "\\.originalname", 'g'), "fileName: sourceName || (" + file1 + " as Express.Multer.File).originalname");
}

patchSingle('migrateCatalog');
patchSingle('migrateSkins');
patchSingle('migrateRoles');
patchSingle('migrateMobileUsers');
patchDouble('migrateUsers', 'usersFile', 'userRolesFile');
patchDouble('migrateLicenses', 'licensesFile', 'licenseDealersFile');

fs.writeFileSync(path, code, 'utf8');
console.log('Update complete!');
