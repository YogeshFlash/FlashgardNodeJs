const fs = require('fs');
const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/usersFile\.buffer/g, "(usersFile as Express.Multer.File).buffer");
code = code.replace(/userRolesFile\.buffer/g, "(userRolesFile as Express.Multer.File).buffer");
code = code.replace(/usersFile\.originalname/g, "(usersFile as Express.Multer.File).originalname");
code = code.replace(/userRolesFile\.originalname/g, "(userRolesFile as Express.Multer.File).originalname");
code = code.replace(/licensesFile\.originalname/g, "(licensesFile as Express.Multer.File).originalname");
code = code.replace(/licenseDealersFile\?\.originalname/g, "(licenseDealersFile as Express.Multer.File)?.originalname");

code = code.replace(/return await this\.migrateRoles\(rows, "MSSQL: " \+ tableMap\.file1\);/g, "return await this.migrateRoles(rows, \\\"MSSQL: \\\" + tableMap.file1);"); // Actually signature is right, wait.
// If the signature is right, why does TS complain about `migrateRoles`?
// Let's manually replace the signatures of dbRun calls? No, if the signature was fixed, the error wouldn't occur. Let me force replace the signature.
code = code.replace(/async migrateRoles\(file: Express\.Multer\.File\)\s*\{/g, "async migrateRoles(file: Express.Multer.File | any[], sourceName?: string) {");
code = code.replace(/async migrateMobileUsers\(file: Express\.Multer\.File\)\s*\{/g, "async migrateMobileUsers(file: Express.Multer.File | any[], sourceName?: string) {");

fs.writeFileSync(path, code, 'utf8');
console.log('Final patch complete!');
