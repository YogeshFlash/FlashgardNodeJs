const fs = require('fs');
const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';
let code = fs.readFileSync(path, 'utf8');

function fixCsvParsing(varName) {
  const regex = new RegExp(\`const \${varName}: any\\[\\] = \\[\\];\\s*await new Promise\\(\\(resolve, reject\\) => \\{[\\s\\S]*?\\.pipe\\(csv\\(\\{[\\s\\S]*?\\}\\)\\)[\\s\\S]*?\\.on\\('data', \\(row: any\\) => \${varName}\\.push\\(row\\)\\)[\\s\\S]*?\\.on\\('end', resolve\\)[\\s\\S]*?\\.on\\('error', reject\\);\\s*\\}\\);\`);
  
  const match = code.match(regex);
  if (match) {
    const replacement = \`let \${varName}: any[] = [];
    if (Array.isArray(file)) {
      \${varName} = file;
    } else {
      await new Promise((resolve, reject) => {
        Readable.from((file as Express.Multer.File).buffer)
          .pipe(csv({
              mapHeaders: ({ header }) => header.trim().replace(/^\\ufeff/, ''),
              mapValues: ({ value }) => value?.trim()
          }))
          .on('data', (row: any) => \${varName}.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
    }\`;
    code = code.replace(match[0], replacement);
    console.log(\`Fixed CSV parsing for \${varName}\`);
  } else {
    console.log(\`Could not find CSV parsing block for \${varName}\`);
  }
}

fixCsvParsing('rows'); // Catalog
fixCsvParsing('data'); // Skins
fixCsvParsing('rolesData'); // Roles
fixCsvParsing('mobileUsersData'); // MobileUsers

// Fix method signatures for roles, users, mobileUsers
// Check what they actually are in the file:
const rolesSigRegex = /async migrateRoles\(file: Express\.Multer\.File\)\s*\{/;
if (rolesSigRegex.test(code)) {
    code = code.replace(rolesSigRegex, "async migrateRoles(file: Express.Multer.File | any[], sourceName?: string) {");
    console.log("Fixed migrateRoles signature");
}

const mobileUsersSigRegex = /async migrateMobileUsers\(file: Express\.Multer\.File\)\s*\{/;
if (mobileUsersSigRegex.test(code)) {
    code = code.replace(mobileUsersSigRegex, "async migrateMobileUsers(file: Express.Multer.File | any[], sourceName?: string) {");
    console.log("Fixed migrateMobileUsers signature");
}

const usersSigRegex = /async migrateUsers\(\s*usersFile\?: Express\.Multer\.File,\s*userRolesFile\?: Express\.Multer\.File\s*\)\s*\{/;
if (usersSigRegex.test(code)) {
    code = code.replace(usersSigRegex, "async migrateUsers(\\n    usersFile?: Express.Multer.File | any[],\\n    userRolesFile?: Express.Multer.File | any[],\\n    sourceName?: string\\n  ) {");
    console.log("Fixed migrateUsers signature");
}

const licensesSigRegex = /async migrateLicenses\(\s*licensesFile: Express\.Multer\.File,\s*licenseDealersFile\?: Express\.Multer\.File\s*\)\s*\{/;
if (licensesSigRegex.test(code)) {
    code = code.replace(licensesSigRegex, "async migrateLicenses(\\n    licensesFile: Express.Multer.File | any[],\\n    licenseDealersFile?: Express.Multer.File | any[],\\n    sourceName?: string\\n  ) {");
    console.log("Fixed migrateLicenses signature");
}

fs.writeFileSync(path, code, 'utf8');
console.log('Fixed migration.service.ts types!');
