const fs = require('fs');
const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';
let code = fs.readFileSync(path, 'utf8');

// The errors are strictly related to the parameter types in the function definitions
// and the usage of `.buffer` and `.originalname` on those parameters which are now `Express.Multer.File | any[]`.
// This is exactly because they can be raw rows now.

// 1. usersFile and userRolesFile in migrateUsers
code = code.replace(/this\.parseUsersCsvRobustly\(usersFile\.buffer\)/g, "this.parseUsersCsvRobustly((usersFile as Express.Multer.File).buffer)");
code = code.replace(/this\.parseCsvBuffer\(userRolesFile\.buffer\)/g, "this.parseCsvBuffer((userRolesFile as Express.Multer.File).buffer)");
code = code.replace(/usersFile \? usersFile\.originalname : ''/g, "usersFile ? (usersFile as Express.Multer.File).originalname : ''");
code = code.replace(/userRolesFile \? userRolesFile\.originalname : ''/g, "userRolesFile ? (userRolesFile as Express.Multer.File).originalname : ''");

// 2. licensesFile and licenseDealersFile in migrateLicenses
code = code.replace(/this\.parseCsvBuffer\(licensesFile\.buffer\)/g, "this.parseCsvBuffer((licensesFile as Express.Multer.File).buffer)");
code = code.replace(/this\.parseCsvBuffer\(licenseDealersFile\.buffer\)/g, "this.parseCsvBuffer((licenseDealersFile as Express.Multer.File).buffer)");
code = code.replace(/licensesFile\.originalname/g, "(licensesFile as Express.Multer.File).originalname");
code = code.replace(/licenseDealersFile\?\.originalname/g, "(licenseDealersFile as Express.Multer.File)?.originalname");

// 3. mobileUsersFile in migrateMobileUsers
code = code.replace(/async migrateMobileUsers\(mobileUsersFile: Express\.Multer\.File\)\s*\{/g, "async migrateMobileUsers(mobileUsersFile: Express.Multer.File | any[], sourceName?: string) {");
code = code.replace(/mobileUsersFile\.buffer/g, "(mobileUsersFile as Express.Multer.File).buffer");
code = code.replace(/mobileUsersFile\?\.originalname/g, "(mobileUsersFile as Express.Multer.File)?.originalname");
code = code.replace(/mobileUsersFile\.originalname/g, "(mobileUsersFile as Express.Multer.File).originalname");

// 4. rolesFile in migrateRoles
code = code.replace(/async migrateRoles\(rolesFile: Express\.Multer\.File\)\s*\{/g, "async migrateRoles(rolesFile: Express.Multer.File | any[], sourceName?: string) {");
code = code.replace(/rolesFile\.buffer/g, "(rolesFile as Express.Multer.File).buffer");
code = code.replace(/rolesFile\?\.originalname/g, "(rolesFile as Express.Multer.File)?.originalname");
code = code.replace(/rolesFile\.originalname/g, "(rolesFile as Express.Multer.File).originalname");

// 5. Update signature of migrateUsers
const usersOld = "async migrateUsers(\n    usersFile?: Express.Multer.File,\n    userRolesFile?: Express.Multer.File\n  ) {";
const usersNew = "async migrateUsers(\n    usersFile?: Express.Multer.File | any[],\n    userRolesFile?: Express.Multer.File | any[],\n    sourceName?: string\n  ) {";
code = code.replace(usersOld, usersNew);

// 6. Update signature of migrateLicenses
const licOld = "async migrateLicenses(licensesFile: Express.Multer.File, licenseDealersFile?: Express.Multer.File) {";
const licNew = "async migrateLicenses(licensesFile: Express.Multer.File | any[], licenseDealersFile?: Express.Multer.File | any[], sourceName?: string) {";
code = code.replace(licOld, licNew);

// Actually migrateLicenses was already modified by update2.js to have the new signature correctly!
// Let me verify if migrateLicenses needs replacing: 
// In checkpoint 14 it says `async migrateLicenses(licensesFile: Express.Multer.File | any[], licenseDealersFile?: Express.Multer.File | any[], sourceName?: string)` is ALREADY THERE!
// Yes, update2.js already handled `migrateLicenses` signature, so I don't need to replace it if it's there. 

// 7. dbRun signatures expect 1 arg but got 2:
// `return await this.migrateRoles(rows, "MSSQL: " + tableMap.file1);`
// `return await this.migrateMobileUsers(rows, "MSSQL: " + tableMap.file1);`
// Since I already fixed the definitions above, they will now accept 2 args!

// 8. Fix any `Readable.from(file.buffer)` calls in roles/mobile users
code = code.replace(/Readable\.from\(\(mobileUsersFile as Express\.Multer\.File\)\.buffer\)/g, "Readable.from((mobileUsersFile as Express.Multer.File).buffer)"); // Already handled by mobileUsersFile.buffer
code = code.replace(/Readable\.from\(\(rolesFile as Express\.Multer\.File\)\.buffer\)/g, "Readable.from((rolesFile as Express.Multer.File).buffer)"); // Already handled by rolesFile.buffer

fs.writeFileSync(path, code, 'utf8');
console.log('Final patch complete!');
