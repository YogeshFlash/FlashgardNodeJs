const fs = require('fs');

const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';
let code = fs.readFileSync(path, 'utf8');

// A helper to refactor a simple method (1 file -> 1 rows array)
function refactorSingle(methodName, processName) {
    const regex = new RegExp(`async ${methodName}\\(file: Express\\.Multer\\.File\\) \\{\\s*const (\\w+): any\\[\\] = \\[\\];\\s*await new Promise\\(\\(resolve, reject\\) => \\{[\\s\\S]*?\\.on\\('error', reject\\);\\s*\\}\\);`, 'm');
    const match = code.match(regex);
    if (match) {
        const rowsVar = match[1];
        // Split the code at the end of the Promise
        const promiseEnd = match.index + match[0].length;
        const before = code.substring(0, match.index);
        const insidePromiseAndSignature = match[0];
        
        // Find the end of the method
        let braces = 0;
        let methodEnd = -1;
        for (let i = match.index; i < code.length; i++) {
            if (code[i] === '{') braces++;
            if (code[i] === '}') {
                braces--;
                if (braces === 0) {
                    methodEnd = i + 1;
                    break;
                }
            }
        }
        
        const methodBody = code.substring(promiseEnd, methodEnd - 1);
        const after = code.substring(methodEnd);
        
        const newMethod = `${insidePromiseAndSignature}
    return this.${processName}(${rowsVar}, file.originalname);
  }

  async ${processName}(${rowsVar}: any[], sourceName: string) {${methodBody.replace(/file\.originalname/g, 'sourceName')}}
`;
        code = before + newMethod + after;
    }
}

function refactorDouble(methodName, processName, arg1, arg2, var1, var2) {
    const regex = new RegExp(`async ${methodName}\\(${arg1}: Express\\.Multer\\.File\\s*,\\s*${arg2}\\?: Express\\.Multer\\.File\\s*\\) \\{[\\s\\S]*?const ${var1}Rows: any\\[\\] = \\[\\];[\\s\\S]*?const ${var2}Rows: any\\[\\] = \\[\\];[\\s\\S]*?\\.on\\('error', reject\\);\\s*\\}\\);\\s*\\}`, 'm');
    const match = code.match(regex);
    if (match) {
        const promiseEnd = match.index + match[0].length;
        const before = code.substring(0, match.index);
        const inside = match[0];
        
        let braces = 0;
        let methodEnd = -1;
        for (let i = match.index; i < code.length; i++) {
            if (code[i] === '{') braces++;
            if (code[i] === '}') {
                braces--;
                if (braces === 0) {
                    methodEnd = i + 1;
                    break;
                }
            }
        }
        
        const methodBody = code.substring(promiseEnd, methodEnd - 1);
        const after = code.substring(methodEnd);
        
        const newMethod = `${inside}
    return this.${processName}(${var1}Rows, ${var2}Rows, ${arg1}.originalname);
  }

  async ${processName}(${var1}Rows: any[], ${var2}Rows: any[], sourceName: string) {${methodBody.replace(new RegExp(`${arg1}\\.originalname`, 'g'), 'sourceName')}}
`;
        code = before + newMethod + after;
    }
}

refactorSingle('migrateCatalog', 'processCatalog');
refactorSingle('migrateSkins', 'processSkins');
refactorSingle('migrateRoles', 'processRoles');
refactorSingle('migrateDesigns', 'processDesigns');
refactorSingle('migrateMobileUsers', 'processMobileUsers');
refactorSingle('migrateOrders', 'processOrders');

refactorDouble('migrateUsers', 'processUsers', 'usersFile', 'rolesFile', 'user', 'role');
refactorDouble('migrateLicenses', 'processLicenses', 'licensesFile', 'assignmentsFile', 'license', 'assignment');

// Now we need to add dbConnect and dbRun methods to the class, and import mssql
if (!code.includes("import * as sql from 'mssql'")) {
    code = `import * as sql from 'mssql';\n` + code;
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
        const rows = (await pool.request().query(\`SELECT * FROM [\${tableMap.file1}]\`)).recordset;
        return await this.processCatalog(rows, \`MSSQL: \${tableMap.file1}\`);
      } else if (moduleType === 'skins') {
        const rows = (await pool.request().query(\`SELECT * FROM [\${tableMap.file1}]\`)).recordset;
        return await this.processSkins(rows, \`MSSQL: \${tableMap.file1}\`);
      } else if (moduleType === 'roles') {
        const rows = (await pool.request().query(\`SELECT * FROM [\${tableMap.file1}]\`)).recordset;
        return await this.processRoles(rows, \`MSSQL: \${tableMap.file1}\`);
      } else if (moduleType === 'designs') {
        const rows = (await pool.request().query(\`SELECT * FROM [\${tableMap.file1}]\`)).recordset;
        return await this.processDesigns(rows, \`MSSQL: \${tableMap.file1}\`);
      } else if (moduleType === 'mobile-users') {
        const rows = (await pool.request().query(\`SELECT * FROM [\${tableMap.file1}]\`)).recordset;
        return await this.processMobileUsers(rows, \`MSSQL: \${tableMap.file1}\`);
      } else if (moduleType === 'users') {
        const userRows = (await pool.request().query(\`SELECT * FROM [\${tableMap.file1}]\`)).recordset;
        const roleRows = tableMap.file2 ? (await pool.request().query(\`SELECT * FROM [\${tableMap.file2}]\`)).recordset : [];
        return await this.processUsers(userRows, roleRows, \`MSSQL: \${tableMap.file1}\`);
      } else if (moduleType === 'licenses') {
        const licenseRows = (await pool.request().query(\`SELECT * FROM [\${tableMap.file1}]\`)).recordset;
        const assignRows = tableMap.file2 ? (await pool.request().query(\`SELECT * FROM [\${tableMap.file2}]\`)).recordset : [];
        return await this.processLicenses(licenseRows, assignRows, \`MSSQL: \${tableMap.file1}\`);
      } else {
        throw new Error('Unsupported module type for DB migration: ' + moduleType);
      }
    } finally {
      await pool.close();
    }
  }
`;

// Insert the methods before the last closing brace of the class
const lastBraceIndex = code.lastIndexOf('}');
code = code.substring(0, lastBraceIndex) + dbMethods + code.substring(lastBraceIndex);

fs.writeFileSync(path, code, 'utf8');
console.log('Refactoring complete!');
