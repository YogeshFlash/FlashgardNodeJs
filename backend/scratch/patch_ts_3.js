const fs = require('fs');
const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';
let code = fs.readFileSync(path, 'utf8');

// Fix buffer and originalname in migrateLicenses
code = code.replace(/await this\.parseCsvBuffer\(licensesFile\.buffer\);/g, "await this.parseCsvBuffer((licensesFile as Express.Multer.File).buffer);");
code = code.replace(/await this\.parseCsvBuffer\(licenseDealersFile\.buffer\)/g, "await this.parseCsvBuffer((licenseDealersFile as Express.Multer.File).buffer)");
code = code.replace(/licensesFile\.originalname/g, "(licensesFile as Express.Multer.File).originalname");
code = code.replace(/licenseDealersFile\?\.originalname/g, "(licenseDealersFile as Express.Multer.File)?.originalname");

// Fix signatures for dbRun methods
code = code.replace(/async migrateRoles\(file: Express\.Multer\.File\)\s*\{/g, "async migrateRoles(file: Express.Multer.File | any[], sourceName?: string) {");
code = code.replace(/async migrateMobileUsers\(file: Express\.Multer\.File\)\s*\{/g, "async migrateMobileUsers(file: Express.Multer.File | any[], sourceName?: string) {");
code = code.replace(/async migrateUsers\(\s*usersFile\?: Express\.Multer\.File,\s*userRolesFile\?: Express\.Multer\.File\s*\)\s*\{/g, "async migrateUsers(\\n    usersFile?: Express.Multer.File | any[],\\n    userRolesFile?: Express.Multer.File | any[],\\n    sourceName?: string\\n  ) {");

fs.writeFileSync(path, code, 'utf8');
console.log('Fixed TS errors with regex!');
