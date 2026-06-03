const fs = require('fs');
const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';
let code = fs.readFileSync(path, 'utf8');

// Fix buffer and originalname in migrateLicenses
code = code.replace(
  "const licensesData = Array.isArray(licensesFile) ? licensesFile : await this.parseCsvBuffer(licensesFile.buffer);",
  "const licensesData = Array.isArray(licensesFile) ? licensesFile : await this.parseCsvBuffer((licensesFile as Express.Multer.File).buffer);"
);
code = code.replace(
  "const licenseDealersData = Array.isArray(licenseDealersFile) ? licenseDealersFile : (licenseDealersFile ? await this.parseCsvBuffer(licenseDealersFile.buffer) : []);",
  "const licenseDealersData = Array.isArray(licenseDealersFile) ? licenseDealersFile : (licenseDealersFile ? await this.parseCsvBuffer((licenseDealersFile as Express.Multer.File).buffer) : []);"
);
code = code.replace(
  "fileName: [licensesFile.originalname, licenseDealersFile?.originalname].filter(Boolean).join(', '),",
  "fileName: sourceName || [(!Array.isArray(licensesFile) ? (licensesFile as Express.Multer.File).originalname : ''), (licenseDealersFile && !Array.isArray(licenseDealersFile) ? (licenseDealersFile as Express.Multer.File).originalname : '')].filter(Boolean).join(', '),"
);

// Fix signatures for dbRun methods
code = code.replace(
  "async migrateRoles(file: Express.Multer.File) {",
  "async migrateRoles(file: Express.Multer.File | any[], sourceName?: string) {"
);
code = code.replace(
  "async migrateMobileUsers(file: Express.Multer.File) {",
  "async migrateMobileUsers(file: Express.Multer.File | any[], sourceName?: string) {"
);

const usersOld = "async migrateUsers(\n    usersFile?: Express.Multer.File,\n    userRolesFile?: Express.Multer.File\n  ) {";
const usersNew = "async migrateUsers(\n    usersFile?: Express.Multer.File | any[],\n    userRolesFile?: Express.Multer.File | any[],\n    sourceName?: string\n  ) {";
code = code.replace(usersOld, usersNew);

const licOld = "async migrateLicenses(\n    licensesFile: Express.Multer.File,\n    licenseDealersFile?: Express.Multer.File\n  ) {";
const licNew = "async migrateLicenses(\n    licensesFile: Express.Multer.File | any[],\n    licenseDealersFile?: Express.Multer.File | any[],\n    sourceName?: string\n  ) {";
code = code.replace(licOld, licNew);

fs.writeFileSync(path, code, 'utf8');
console.log('Fixed TS errors!');
